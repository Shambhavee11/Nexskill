const { query } = require('../config/db');

// ─── GET MY PROFILE ──────────────────────────────────────────
const getMe = async (req, res) => {
  try {
    const result = await query(
      `SELECT u.id, u.full_name, u.email, u.bio, u.avatar_url, u.credit_balance,
              u.rating, u.total_reviews, u.completed_projects, u.trust_score,
              u.is_premium, u.is_verified, u.created_at,
              COALESCE(json_agg(DISTINCT jsonb_build_object(
                'id', us.id, 'skill_name', us.skill_name,
                'skill_type', us.skill_type, 'category', us.category, 'proficiency', us.proficiency
              )) FILTER (WHERE us.id IS NOT NULL), '[]') AS skills
       FROM users u
       LEFT JOIN user_skills us ON us.user_id = u.id
       WHERE u.id = $1
       GROUP BY u.id`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, user: result.rows[0] });
  } catch (error) {
    console.error('getMyProfile error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── GET USER PROFILE BY ID ──────────────────────────────────
const getUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await query(
      `SELECT u.id, u.full_name, u.bio, u.avatar_url, u.credit_balance,
              u.rating, u.total_reviews, u.completed_projects, u.trust_score,
              u.is_premium, u.created_at,
              COALESCE(json_agg(DISTINCT jsonb_build_object(
                'id', us.id, 'skill_name', us.skill_name,
                'skill_type', us.skill_type, 'category', us.category, 'proficiency', us.proficiency
              )) FILTER (WHERE us.id IS NOT NULL), '[]') AS skills,
              COALESCE(json_agg(DISTINCT jsonb_build_object(
                'id', p.id, 'title', p.title, 'description', p.description,
'image_url', p.image_url, 'project_url', p.project_url, 'tags', p.tags
              )) FILTER (WHERE p.id IS NOT NULL), '[]') AS portfolio
       FROM users u
       LEFT JOIN user_skills us ON us.user_id = u.id
       LEFT JOIN portfolio_items p ON p.user_id = u.id
       WHERE u.id = $1
       GROUP BY u.id`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Get recent reviews
    const reviews = await query(
      `SELECT r.id, r.rating, r.comment, r.professionalism, r.timeliness, r.quality,
              r.created_at, u.full_name AS reviewer_name, u.avatar_url AS reviewer_avatar
       FROM reviews r
       JOIN users u ON u.id = r.reviewer_id
       WHERE r.reviewee_id = $1
       ORDER BY r.created_at DESC LIMIT 5`,
      [userId]
    );

    res.json({
      success: true,
      user: result.rows[0],
      reviews: reviews.rows
    });
  } catch (error) {
    console.error('getUserProfile error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── UPDATE PROFILE ──────────────────────────────────────────
const updateProfile = async (req, res) => {
  try {
    const { full_name, bio, avatar_url } = req.body;

    const result = await query(
      `UPDATE users SET full_name = COALESCE($1, full_name),
              bio = COALESCE($2, bio),
              avatar_url = COALESCE($3, avatar_url)
       WHERE id = $4
       RETURNING id, full_name, bio, avatar_url, email`,
      [full_name, bio, avatar_url, req.user.id]
    );

    res.json({ success: true, user: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── ADD SKILL ───────────────────────────────────────────────
const addSkill = async (req, res) => {
  try {
    const { skill_name, skill_type, category, proficiency } = req.body;

    if (!skill_name || !skill_type) {
      return res.status(400).json({ success: false, message: 'Skill name and type required' });
    }

    const result = await query(
      `INSERT INTO user_skills (user_id, skill_name, skill_type, category, proficiency)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.user.id, skill_name, skill_type, category, proficiency]
    );

    res.status(201).json({ success: true, skill: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── DELETE SKILL ─────────────────────────────────────────────
const deleteSkill = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      'DELETE FROM user_skills WHERE id = $1 AND user_id = $2 RETURNING id',
      [skillId, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Skill not found or not yours' });
    }

    res.json({ success: true, message: 'Skill removed' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── EXPLORE CREATORS ─────────────────────────────────────────
const exploreCreators = async (req, res) => {
  try {
    const { skill, category, min_rating, page = 1, limit = 12 } = req.query;
    const offset = (page - 1) * limit;

    let conditions = ['u.id != $1', 'u.is_verified = true'];
    let params = [req.user.id];
    let paramIdx = 2;

    if (skill) {
      conditions.push(`EXISTS (
        SELECT 1 FROM user_skills us
        WHERE us.user_id = u.id AND us.skill_type = 'offered'
        AND LOWER(us.skill_name) LIKE LOWER($${paramIdx})
      )`);
      params.push(`%${skill}%`);
      paramIdx++;
    }

    if (category) {
      conditions.push(`EXISTS (
        SELECT 1 FROM user_skills us
        WHERE us.user_id = u.id AND LOWER(us.category) = LOWER($${paramIdx})
      )`);
      params.push(category);
      paramIdx++;
    }

    if (min_rating) {
      conditions.push(`u.rating >= $${paramIdx}`);
      params.push(parseFloat(min_rating));
      paramIdx++;
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    params.push(parseInt(limit));
    params.push(offset);

    const result = await query(
      `SELECT u.id, u.full_name, u.bio, u.avatar_url, u.rating, u.completed_projects,
              u.trust_score, u.is_premium,
              COALESCE(json_agg(DISTINCT jsonb_build_object(
                'skill_name', us.skill_name, 'skill_type', us.skill_type, 'category', us.category
              )) FILTER (WHERE us.id IS NOT NULL), '[]') AS skills
       FROM users u
       LEFT JOIN user_skills us ON us.user_id = u.id
       ${whereClause}
       GROUP BY u.id
       ORDER BY u.rating DESC, u.completed_projects DESC
       LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      params
    );

    res.json({ success: true, creators: result.rows, page: parseInt(page) });
  } catch (error) {
    console.error('exploreCreators error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const addPortfolioItem = async (req, res) => {
  try {
    const { title, description, image_url, project_url, tags } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, message: 'Title is required' });
    }

    const result = await query(
      `INSERT INTO portfolio_items (user_id, title, description, image_url, project_url, tags)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        req.user.id,
        title,
        description || null,
        image_url || null,
        project_url || null,
        tags || [],
      ]
    );

    res.status(201).json({ success: true, item: result.rows[0] });
  } catch (error) {
    console.error('addPortfolioItem error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const deletePortfolioItem = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `DELETE FROM portfolio_items
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Portfolio item not found or not yours',
      });
    }

    res.json({ success: true, message: 'Portfolio item deleted successfully' });
  } catch (error) {
    console.error('deletePortfolioItem error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};



// ─── GET CREDIT TRANSACTIONS ──────────────────────────────────
const getCreditHistory = async (req, res) => {
  try {
    const result = await query(
      `SELECT ct.id, ct.transaction_type, ct.amount, ct.balance_after,
              ct.description, ct.created_at,
              u.full_name AS related_user_name
       FROM credit_transactions ct
       LEFT JOIN users u ON u.id = ct.related_user_id
       WHERE ct.user_id = $1
       ORDER BY ct.created_at DESC
       LIMIT 50`,
      [req.user.id]
    );

    // Summary
    const summary = await query(
      `SELECT
         SUM(CASE WHEN transaction_type IN ('earned','bonus','signup_bonus','refund') THEN amount ELSE 0 END) AS total_earned,
         SUM(CASE WHEN transaction_type = 'spent' THEN amount ELSE 0 END) AS total_spent
       FROM credit_transactions WHERE user_id = $1`,
      [req.user.id]
    );

    const balanceResult = await query('SELECT credit_balance FROM users WHERE id = $1', [req.user.id]);

    res.json({
      success: true,
      transactions: result.rows,
      summary: {
        current_balance: balanceResult.rows[0]?.credit_balance || 0,
        total_earned: parseInt(summary.rows[0]?.total_earned || 0),
        total_spent: parseInt(summary.rows[0]?.total_spent || 0)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getMe,
updateProfile,
getUser,
addSkill,
deleteSkill,
addPortfolioItem,
deletePortfolioItem,
getCreditHistory,
exploreCreators
};