// routes/auth.js
const express = require('express');
const router = express.Router();
const { register, verifyOTP, login, refreshToken, logout, resendOTP } = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

router.post('/register', register);
router.post('/verify-otp', verifyOTP);
router.post('/login', login);
router.post('/refresh-token', refreshToken);
router.post('/resend-otp', resendOTP);
router.post('/logout', authenticateToken, logout);

module.exports = router;