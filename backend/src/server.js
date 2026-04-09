require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const { query } = require('./config/db');

// Routes
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const requestsRoutes = require('./routes/requests');

const app = express();
const server = http.createServer(app);

// ─── SOCKET.IO SETUP ─────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

// Socket auth middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Authentication error'));
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId;
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

// Track online users
const onlineUsers = new Map();

io.on('connection', (socket) => {
  console.log(`🔌 User connected: ${socket.userId}`);
  onlineUsers.set(socket.userId, socket.id);

  // Broadcast online status
  io.emit('user_online', { userId: socket.userId });

  // ── Join personal room
  socket.join(`user_${socket.userId}`);

  // ── Send message
  socket.on('send_message', async (data) => {
    try {
      const { receiver_id, content, file_url, file_name, request_id } = data;

      const result = await query(
        `INSERT INTO messages (sender_id, receiver_id, content, file_url, file_name, request_id)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [socket.userId, receiver_id, content, file_url || null, file_name || null, request_id || null]
      );

      const message = result.rows[0];

      // Get sender info
      const senderResult = await query(
        'SELECT full_name, avatar_url FROM users WHERE id = $1',
        [socket.userId]
      );
      const sender = senderResult.rows[0];

      const messageData = {
        ...message,
        sender_name: sender.full_name,
        sender_avatar: sender.avatar_url
      };

      // Update or create conversation
      await query(
        `INSERT INTO conversations (user1_id, user2_id, last_message, last_message_at, unread_count_user2)
         VALUES (LEAST($1::uuid, $2::uuid), GREATEST($1::uuid, $2::uuid), $3, NOW(), 1)
         ON CONFLICT (user1_id, user2_id) DO UPDATE
         SET last_message = $3, last_message_at = NOW(),
             unread_count_user1 = CASE WHEN conversations.user2_id = $1 THEN conversations.unread_count_user1 + 1 ELSE conversations.unread_count_user1 END,
             unread_count_user2 = CASE WHEN conversations.user1_id = $1 THEN conversations.unread_count_user2 + 1 ELSE conversations.unread_count_user2 END`,
        [socket.userId, receiver_id, content?.substring(0, 100)]
      );

      // Send to receiver
      io.to(`user_${receiver_id}`).emit('new_message', messageData);
      // Echo to sender
      socket.emit('message_sent', messageData);
    } catch (error) {
      console.error('Socket send_message error:', error);
      socket.emit('message_error', { error: 'Failed to send message' });
    }
  });

  // ── Mark messages as read
  socket.on('mark_read', async ({ sender_id }) => {
    await query(
      'UPDATE messages SET is_read = true WHERE sender_id = $1 AND receiver_id = $2 AND is_read = false',
      [sender_id, socket.userId]
    );
  });

  // ── Typing indicator
  socket.on('typing', ({ receiver_id }) => {
    io.to(`user_${receiver_id}`).emit('user_typing', { sender_id: socket.userId });
  });

  socket.on('stop_typing', ({ receiver_id }) => {
    io.to(`user_${receiver_id}`).emit('user_stop_typing', { sender_id: socket.userId });
  });

  socket.on('disconnect', () => {
    onlineUsers.delete(socket.userId);
    io.emit('user_offline', { userId: socket.userId });
    console.log(`❌ User disconnected: ${socket.userId}`);
  });
});

// ─── EXPRESS MIDDLEWARE ───────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 100,
  message: { success: false, message: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// Auth rate limit (stricter)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many auth attempts.' }
});
app.use('/api/auth/', authLimiter);

// ─── ROUTES ──────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/requests', requestsRoutes);

// Chat messages REST endpoint
app.get('/api/messages/:userId', require('./middleware/auth').authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1 } = req.query;
    const offset = (page - 1) * 30;

    const result = await query(
      `SELECT m.*, u.full_name AS sender_name, u.avatar_url AS sender_avatar
       FROM messages m
       JOIN users u ON u.id = m.sender_id
       WHERE (m.sender_id = $1 AND m.receiver_id = $2)
          OR (m.sender_id = $2 AND m.receiver_id = $1)
       ORDER BY m.created_at DESC
       LIMIT 30 OFFSET $3`,
      [req.user.id, userId, offset]
    );

    res.json({ success: true, messages: result.rows.reverse() });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Conversations list
app.get('/api/conversations', require('./middleware/auth').authenticateToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT c.*,
              CASE WHEN c.user1_id = $1 THEN u2.id ELSE u1.id END AS other_user_id,
              CASE WHEN c.user1_id = $1 THEN u2.full_name ELSE u1.full_name END AS other_user_name,
              CASE WHEN c.user1_id = $1 THEN u2.avatar_url ELSE u1.avatar_url END AS other_user_avatar,
              CASE WHEN c.user1_id = $1 THEN c.unread_count_user1 ELSE c.unread_count_user2 END AS unread_count
       FROM conversations c
       JOIN users u1 ON u1.id = c.user1_id
       JOIN users u2 ON u2.id = c.user2_id
       WHERE c.user1_id = $1 OR c.user2_id = $1
       ORDER BY c.last_message_at DESC`,
      [req.user.id]
    );

    res.json({ success: true, conversations: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Notifications
app.get('/api/notifications', require('./middleware/auth').authenticateToken, async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20',
      [req.user.id]
    );
    res.json({ success: true, notifications: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'NexSkill API is running 🚀', timestamp: new Date() });
});

// 404
app.use('*', (req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

// ─── START SERVER ─────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 NexSkill Backend running on port ${PORT}`);
  console.log(`📡 Socket.IO ready`);
  console.log(`🌐 API: http://localhost:${PORT}/api`);
});

module.exports = { app, io };