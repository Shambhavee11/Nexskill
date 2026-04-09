/**
 * NexSkill Recommendation Service Client
 * ----------------------------------------
 * Calls the Python recommendation microservice from Node.js.
 * Drop this file in: backend/src/services/recommendationService.js
 */

const axios = require('axios');

const REC_BASE = process.env.REC_API_URL || 'http://localhost:8000';
const REC_KEY  = process.env.REC_API_KEY  || '';

const recClient = axios.create({
  baseURL: REC_BASE,
  timeout: 5000,
  headers: { 'X-API-Key': REC_KEY },
});

/**
 * Get personalised creator recommendations for a user.
 *
 * @param {string} userId       - UUID of the requesting user
 * @param {number} topN         - number of recommendations (default 8)
 * @param {string|null} skill   - optional skill filter (e.g. "React")
 * @param {string[]} excludeIds - user IDs to exclude
 * @returns {Promise<Array>}    - array of recommended creator objects
 */
const getRecommendations = async (userId, topN = 8, skill = null, excludeIds = []) => {
  try {
    const params = { top_n: topN };
    if (skill) params.skill = skill;
    if (excludeIds.length) params.exclude = excludeIds.join(',');

    const res = await recClient.get(`/recommend/${userId}`, { params });
    return res.data.recommendations || [];
  } catch (err) {
    console.error('Recommendation service error:', err.message);
    return []; // Graceful fallback: return empty, not crash
  }
};

/**
 * Get users with similar skill profiles.
 *
 * @param {string} userId
 * @param {number} topN
 * @returns {Promise<Array>}
 */
const getSimilarUsers = async (userId, topN = 5) => {
  try {
    const res = await recClient.get(`/similar/${userId}`, { params: { top_n: topN } });
    return res.data.similar_users || [];
  } catch (err) {
    console.error('Similar users service error:', err.message);
    return [];
  }
};

/**
 * Trigger model retraining (call after bulk data changes).
 */
const triggerRetrain = async () => {
  try {
    const res = await recClient.post('/retrain');
    return res.data;
  } catch (err) {
    console.error('Retrain error:', err.message);
    return { success: false };
  }
};

module.exports = { getRecommendations, getSimilarUsers, triggerRetrain };


/* ─── HOW TO USE IN YOUR ROUTES ──────────────────────────────────────
   In backend/src/routes/users.js, add:

   const { getRecommendations } = require('../services/recommendationService');

   // Replace the basic explore endpoint with ML recommendations:
   router.get('/recommendations', authenticateToken, async (req, res) => {
     try {
       const { top_n = 8, skill } = req.query;
       const recs = await getRecommendations(req.user.id, parseInt(top_n), skill);

       if (recs.length > 0) {
         return res.json({ success: true, creators: recs, source: 'ml' });
       }

       // Fallback to DB query if ML returns nothing
       const fallback = await query(
         `SELECT id, full_name, bio, avatar_url, rating, completed_projects, trust_score
          FROM users WHERE id != $1 AND is_verified = true
          ORDER BY rating DESC LIMIT $2`,
         [req.user.id, parseInt(top_n)]
       );
       res.json({ success: true, creators: fallback.rows, source: 'fallback' });
     } catch (error) {
       res.status(500).json({ success: false, message: 'Server error' });
     }
   });
─────────────────────────────────────────────────────────────────── */