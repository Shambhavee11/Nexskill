const express = require('express');
const router = express.Router();

const { authenticateToken } = require('../middleware/auth');
const {
    createOrGetConversation,
    getConversations,
    getMessages,
    sendMessage
} = require('../controllers/chatController');


router.use(authenticateToken);

router.post('/conversations', createOrGetConversation);
router.get('/conversations', getConversations);
router.get('/conversations/:conversationId/messages', getMessages);
router.post('/conversations/:conversationId/messages', sendMessage);

module.exports = router;
