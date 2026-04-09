const { query } = require('../config/db');

const createOrGetConversation = async (req, res) => {
  try {
    const { participantId } = req.body;
    const currentUserId = req.user.id;

    if (!participantId) {
      return res.status(400).json({ success: false, message: 'participantId is required' });
    }

    if (participantId === currentUserId) {
      return res.status(400).json({ success: false, message: 'Cannot chat with yourself' });
    }

    const existing = await query(
      `SELECT c.id, c.created_at, c.last_message_at
       FROM conversations c
       JOIN conversation_participants cp1 ON cp1.conversation_id = c.id
       JOIN conversation_participants cp2 ON cp2.conversation_id = c.id
       WHERE cp1.user_id = $1
         AND cp2.user_id = $2
       LIMIT 1`,
      [currentUserId, participantId]
    );

    let conversation;

    if (existing.rows.length > 0) {
      conversation = existing.rows[0];
    } else {
      const convResult = await query(
        `INSERT INTO conversations DEFAULT VALUES
         RETURNING id, created_at, last_message_at`
      );

      conversation = convResult.rows[0];

      await query(
        `INSERT INTO conversation_participants (conversation_id, user_id)
         VALUES ($1, $2), ($1, $3)`,
        [conversation.id, currentUserId, participantId]
      );
    }

    const detailed = await query(
      `SELECT
         c.id,
         c.created_at,
         c.last_message_at,
         u.id AS other_user_id,
         u.full_name AS other_user_name,
         u.avatar_url AS other_user_avatar,
         '' AS last_message,
         0 AS unread_count
       FROM conversations c
       JOIN conversation_participants cp_self
         ON cp_self.conversation_id = c.id
       JOIN conversation_participants cp_other
         ON cp_other.conversation_id = c.id
        AND cp_other.user_id != cp_self.user_id
       JOIN users u
         ON u.id = cp_other.user_id
       WHERE c.id = $1
         AND cp_self.user_id = $2
       LIMIT 1`,
      [conversation.id, currentUserId]
    );

    return res.status(existing.rows.length > 0 ? 200 : 201).json({
      success: true,
      conversation: detailed.rows[0]
    });
  } catch (error) {
    console.error('createOrGetConversation error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};
const getConversations = async (req, res) => {
  try {
    const result = await query(
      `SELECT
         c.id,
         c.created_at,
         c.last_message_at,
         u.id AS other_user_id,
         u.full_name AS other_user_name,
         u.avatar_url AS other_user_avatar,
         '' AS last_message,
         0 AS unread_count
       FROM conversations c
       JOIN conversation_participants cp_self
         ON cp_self.conversation_id = c.id
       JOIN conversation_participants cp_other
         ON cp_other.conversation_id = c.id
        AND cp_other.user_id != cp_self.user_id
       JOIN users u
         ON u.id = cp_other.user_id
       WHERE cp_self.user_id = $1
       ORDER BY c.last_message_at DESC NULLS LAST, c.created_at DESC`,
      [req.user.id]
    );

    return res.json({ success: true, conversations: result.rows });
  } catch (error) {
    console.error('getConversations error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;

    const result = await query(
      `SELECT
         m.*,
         u.full_name AS sender_name
       FROM messages m
       JOIN users u ON u.id = m.sender_id
       WHERE m.conversation_id = $1
       ORDER BY m.created_at ASC`,
      [conversationId]
    );

    return res.json({ success: true, messages: result.rows });
  } catch (error) {
    console.error('getMessages error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const sendMessage = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ success: false, message: 'Content is required' });
    }

    const result = await query(
      `INSERT INTO messages (conversation_id, sender_id, content)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [conversationId, req.user.id, content]
    );

    await query(
      `UPDATE conversations
       SET last_message_at = NOW()
       WHERE id = $1`,
      [conversationId]
    );

    const messageWithSender = await query(
      `SELECT
         m.*,
         u.full_name AS sender_name
       FROM messages m
       JOIN users u ON u.id = m.sender_id
       WHERE m.id = $1`,
      [result.rows[0].id]
    );

    return res.status(201).json({
      success: true,
      message: messageWithSender.rows[0]
    });
  } catch (error) {
    console.error('sendMessage error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  createOrGetConversation,
  getConversations,
  getMessages,
  sendMessage
};