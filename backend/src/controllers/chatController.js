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

    // Check existing conversation
    const existing = await query(
      `SELECT c.*
       FROM conversations c
       JOIN conversation_participants cp1 ON cp1.conversation_id = c.id
       JOIN conversation_participants cp2 ON cp2.conversation_id = c.id
       WHERE cp1.user_id = $1 AND cp2.user_id = $2
       LIMIT 1`,
      [currentUserId, participantId]
    );

    if (existing.rows.length > 0) {
      return res.json({ success: true, conversation: existing.rows[0] });
    }

    // Create new conversation
    const convResult = await query(
      `INSERT INTO conversations DEFAULT VALUES RETURNING *`
    );

    const conversation = convResult.rows[0];

    await query(
      `INSERT INTO conversation_participants (conversation_id, user_id)
       VALUES ($1, $2), ($1, $3)`,
      [conversation.id, currentUserId, participantId]
    );

    res.status(201).json({ success: true, conversation });
  } catch (error) {
    console.error('createOrGetConversation error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getConversations = async (req, res) => {
    try {
        const result= await query(
            `SELECT c.*
                FROM conversations c
                JOIN conversation_participants cp ON cp.conversation_id = c.id
                WHERE cp.user_id = $1
                ORDER BY c.last_message_at DESC`,
            [req.user.id]
        );

        res.json({ success: true, conversations: result.rows });
    } catch (error) {
        console.error('getConversations error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }};

const getMessages = async (req, res) => {
    try {
        const { conversationId } = req.params;

        const result = await query(
            `SELECT *
                FROM messages
                WHERE conversation_id = $1
                ORDER BY created_at ASC`,
            [conversationId]
        );

        res.json({ success: true, messages: result.rows });
    } catch (error) {
        console.error('getMessages error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }};

const sendMessage = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { content } = req.body;
        if (!content) {
            return res.status(400).json({ success: false, message: 'Content is required' });
        }

        const result = await query(
            `INSERT INTO messages (conversation_id, sender_id, content)
                VALUES ($1, $2, $3) RETURNING *`,
            [conversationId, req.user.id, content]
        );

        // Update conversation's last_message_at
        res.status(201).json({ success: true, message: result.rows[0] });
    } catch (error) {
        console.error('sendMessage error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }};

    module.exports = {
        createOrGetConversation
        , getConversations
        , getMessages
        , sendMessage
    };