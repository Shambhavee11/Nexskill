const { query, getClient } = require('../config/db');
const { getRecommendations}= require('../services/recommendationService');
 
// ─── CREATE REQUEST ──────────────────────────────────────────
const createRequest = async (req, res) => {
  try {
    const { provider_id, skill_required, title, description, credit_amount, deadline } = req.body;

    if (!skill_required || !title || !description || !credit_amount) {
      return res.status(400).json({ success: false, message: 'All required fields must be filled' });
    }

    if (credit_amount <= 0) {
      return res.status(400).json({ success: false, message: 'Credit amount must be positive' });
    }

    const userResult = await query(
      'SELECT credit_balance FROM users WHERE id = $1',
      [req.user.id]
    );

    if (userResult.rows[0].credit_balance < credit_amount) {
      return res.status(400).json({ success: false, message: 'Insufficient credits' });
    }

    const result = await query(
      `INSERT INTO service_requests
       (requester_id, provider_id, skill_required, title, description, credit_amount, deadline)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        req.user.id,
        provider_id || null,
        skill_required,
        title,
        description,
        credit_amount,
        deadline || null
      ]
    );

    if (provider_id) {
      await query(
        `INSERT INTO notifications
         (user_id, type, title, message, reference_id, reference_type)
         VALUES ($1, 'new_request', 'New Service Request', $2, $3, 'request')`,
        [provider_id, `Someone requested your "${skill_required}" service`, result.rows[0].id]
      );
    }

    const recommendations = await getRecommendations(
      req.user.id,
      6,
      skill_required,
      provider_id ? [provider_id, req.user.id] : [req.user.id]
    );

    return res.status(201).json({
      success: true,
      request: result.rows[0],
      recommendations
    });

  } catch (error) {
    console.error('createRequest error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};
   

// ─── GET MY REQUESTS ─────────────────────────────────────────
const getMyRequests = async (req, res) => {
  try {
    const { type = 'all', status } = req.query;

    let conditions = [];
    let params = [req.user.id];

    if (type === 'sent') {
      conditions.push('sr.requester_id = $1');
    } else if (type === 'received') {
      conditions.push('sr.provider_id = $1');
    } else {
      conditions.push('(sr.requester_id = $1 OR sr.provider_id = $1)');
    }

    if (status) {
      conditions.push(`sr.status = $2`);
      params.push(status);
    }

    const result = await query(
      `SELECT sr.*,
              req_user.full_name AS requester_name, req_user.avatar_url AS requester_avatar,
              prov_user.full_name AS provider_name, prov_user.avatar_url AS provider_avatar
       FROM service_requests sr
       JOIN users req_user ON req_user.id = sr.requester_id
       LEFT JOIN users prov_user ON prov_user.id = sr.provider_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY sr.created_at DESC`,
      params
    );

    res.json({ success: true, requests: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── ACCEPT REQUEST ──────────────────────────────────────────
const acceptRequest = async (req, res) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const { requestId } = req.params;
    const result = await client.query(
      'SELECT * FROM service_requests WHERE id = $1',
      [requestId]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    const request = result.rows[0];

    if (request.status !== 'pending') {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Request is not pending' });
    }

    if (request.requester_id === req.user.id) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Cannot accept your own request' });
    }

    // Update request
    await client.query(
      `UPDATE service_requests SET status = 'accepted', provider_id = $1, updated_at = NOW()
       WHERE id = $2`,
      [req.user.id, requestId]
    );

    // Deduct credits from requester (hold in escrow concept)
    await client.query(
      'UPDATE users SET credit_balance = credit_balance - $1 WHERE id = $2',
      [request.credit_amount, request.requester_id]
    );

    await client.query(
      `INSERT INTO credit_transactions (user_id, related_user_id, request_id, transaction_type, amount, balance_after, description)
       SELECT $1, $2, $3, 'spent', $4, credit_balance, 'Credits held for service request'
       FROM users WHERE id = $1`,
      [request.requester_id, req.user.id, requestId, request.credit_amount]
    );

    // Notify requester
    await client.query(
      `INSERT INTO notifications (user_id, type, title, message, reference_id, reference_type)
       VALUES ($1, 'request_accepted', 'Request Accepted', $2, $3, 'request')`,
      [request.requester_id, `Your request "${request.title}" was accepted!`, requestId]
    );

    await client.query('COMMIT');
    res.json({ success: true, message: 'Request accepted successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('acceptRequest error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  } finally {
    client.release();
  }
};

// ─── COMPLETE REQUEST ─────────────────────────────────────────
const completeRequest = async (req, res) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const { requestId } = req.params;
    const result = await client.query('SELECT * FROM service_requests WHERE id = $1', [requestId]);

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    const request = result.rows[0];

    if (request.requester_id !== req.user.id) {
      await client.query('ROLLBACK');
      return res.status(403).json({ success: false, message: 'Only the requester can mark as complete' });
    }

    if (request.status !== 'accepted' && request.status !== 'in_progress') {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Request cannot be completed in current state' });
    }

    // Mark complete
    await client.query(
      "UPDATE service_requests SET status = 'completed', updated_at = NOW() WHERE id = $1",
      [requestId]
    );

    // Transfer credits to provider
    await client.query(
      'UPDATE users SET credit_balance = credit_balance + $1, completed_projects = completed_projects + 1 WHERE id = $2',
      [request.credit_amount, request.provider_id]
    );

    // Record transaction
    await client.query(
      `INSERT INTO credit_transactions (user_id, related_user_id, request_id, transaction_type, amount, balance_after, description)
       SELECT $1, $2, $3, 'earned', $4, credit_balance, 'Credits earned for completed service'
       FROM users WHERE id = $1`,
      [request.provider_id, request.requester_id, requestId, request.credit_amount]
    );

    // Update requester's completed projects
    await client.query(
      'UPDATE users SET completed_projects = completed_projects + 1 WHERE id = $1',
      [request.requester_id]
    );

    await client.query(
      `INSERT INTO notifications (user_id, type, title, message, reference_id, reference_type)
       VALUES ($1, 'request_completed', 'Service Completed', $2, $3, 'request')`,
      [request.provider_id, `You earned ${request.credit_amount} credits for completing "${request.title}"!`, requestId]
    );

    await client.query('COMMIT');
    res.json({ success: true, message: 'Request marked as completed. Credits transferred!' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('completeRequest error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  } finally {
    client.release();
  }
};

// ─── SUBMIT REVIEW ────────────────────────────────────────────
const submitReview = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { rating, comment, professionalism, timeliness, quality } = req.body;

    const reqResult = await query('SELECT * FROM service_requests WHERE id = $1', [requestId]);
    if (reqResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    const request = reqResult.rows[0];
    if (request.status !== 'completed') {
      return res.status(400).json({ success: false, message: 'Can only review completed requests' });
    }

    let revieweeId;
    if (request.requester_id === req.user.id) {
      revieweeId = request.provider_id;
    } else if (request.provider_id === req.user.id) {
      revieweeId = request.requester_id;
    } else {
      return res.status(403).json({ success: false, message: 'Not part of this request' });
    }

    const result = await query(
      `INSERT INTO reviews (reviewer_id, reviewee_id, request_id, rating, comment, professionalism, timeliness, quality)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [req.user.id, revieweeId, requestId, rating, comment, professionalism, timeliness, quality]
    );

    res.status(201).json({ success: true, review: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ success: false, message: 'Already reviewed this request' });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { createRequest, getMyRequests, acceptRequest, completeRequest, submitReview };