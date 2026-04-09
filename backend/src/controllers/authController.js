const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/db');
const { sendOTPEmail } = require('../config/email');

// Generate tokens
const generateTokens = (userId) => {
  const accessToken = jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );
  const refreshToken = jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );
  return { accessToken, refreshToken };
};

// Generate OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// ─── REGISTER ────────────────────────────────────────────────
const register = async (req, res) => {
  try {
    const { full_name, email, password } = req.body;

    if (!full_name || !email || !password) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    // Check existing user
    const existingUser = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    const signupBonus = parseInt(process.env.SIGNUP_BONUS_CREDITS) || 100;

    // Create user
    const result = await query(
      `INSERT INTO users (full_name, email, password_hash, credit_balance, otp_secret, otp_expires_at)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, full_name, email, credit_balance`,
      [full_name, email.toLowerCase(), passwordHash, signupBonus, otp, otpExpires]
    );

    const newUser = result.rows[0];

    // Record signup bonus transaction
    await query(
      `INSERT INTO credit_transactions (user_id, transaction_type, amount, balance_after, description)
       VALUES ($1, 'signup_bonus', $2, $2, 'Welcome bonus credits')`,
      [newUser.id, signupBonus]
    );

    // Send OTP email
    try {
      await sendOTPEmail(email, full_name, otp);
    } catch (emailErr) {
      console.error('Email send error:', emailErr.message);
    }

    res.status(201).json({
      success: true,
      message: 'Account created! Please verify your email with the OTP sent.',
      userId: newUser.id,
      requiresVerification: true
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, message: 'Server error during registration' });
  }
};

// ─── VERIFY OTP ──────────────────────────────────────────────
const verifyOTP = async (req, res) => {
  try {
    const { userId, otp } = req.body;

    const result = await query(
      'SELECT id, otp_secret, otp_expires_at, full_name, email, credit_balance FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const user = result.rows[0];

    if (user.otp_secret !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }
    if (new Date() > new Date(user.otp_expires_at)) {
      return res.status(400).json({ success: false, message: 'OTP has expired. Request a new one.' });
    }

    // Mark verified, clear OTP
    await query(
      'UPDATE users SET is_verified = true, otp_secret = NULL, otp_expires_at = NULL WHERE id = $1',
      [user.id]
    );

    const { accessToken, refreshToken } = generateTokens(user.id);

    // Store refresh token
    await query('UPDATE users SET refresh_token = $1 WHERE id = $2', [refreshToken, user.id]);

    res.json({
      success: true,
      message: 'Email verified successfully!',
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        credit_balance: user.credit_balance
      }
    });
  } catch (error) {
    console.error('OTP verify error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── LOGIN ───────────────────────────────────────────────────
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const result = await query(
      'SELECT id, full_name, email, password_hash, credit_balance, rating, is_verified, avatar_url FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const user = result.rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    if (!user.is_verified) {
      // Resend OTP
      const otp = generateOTP();
      const otpExpires = new Date(Date.now() + 10 * 60 * 1000);
      await query('UPDATE users SET otp_secret = $1, otp_expires_at = $2 WHERE id = $3', [otp, otpExpires, user.id]);
      try { await sendOTPEmail(user.email, user.full_name, otp); } catch (e) {}

      return res.status(403).json({
        success: false,
        message: 'Email not verified. OTP resent.',
        userId: user.id,
        requiresVerification: true
      });
    }

    const { accessToken, refreshToken } = generateTokens(user.id);
    await query('UPDATE users SET refresh_token = $1 WHERE id = $2', [refreshToken, user.id]);

    res.json({
      success: true,
      message: 'Login successful',
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        credit_balance: user.credit_balance,
        rating: user.rating,
        avatar_url: user.avatar_url
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── REFRESH TOKEN ───────────────────────────────────────────
const refreshToken = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;
    if (!token) return res.status(401).json({ success: false, message: 'Refresh token required' });

    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);

    const result = await query(
      'SELECT id, refresh_token FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0 || result.rows[0].refresh_token !== token) {
      return res.status(403).json({ success: false, message: 'Invalid refresh token' });
    }

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(decoded.userId);
    await query('UPDATE users SET refresh_token = $1 WHERE id = $2', [newRefreshToken, decoded.userId]);

    res.json({ success: true, accessToken, refreshToken: newRefreshToken });
  } catch (error) {
    res.status(403).json({ success: false, message: 'Invalid or expired refresh token' });
  }
};

// ─── LOGOUT ──────────────────────────────────────────────────
const logout = async (req, res) => {
  try {
    await query('UPDATE users SET refresh_token = NULL WHERE id = $1', [req.user.id]);
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── RESEND OTP ──────────────────────────────────────────────
const resendOTP = async (req, res) => {
  try {
    const { userId } = req.body;
    const result = await query('SELECT id, email, full_name FROM users WHERE id = $1', [userId]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'User not found' });

    const user = result.rows[0];
    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    await query('UPDATE users SET otp_secret = $1, otp_expires_at = $2 WHERE id = $3', [otp, otpExpires, user.id]);
    await sendOTPEmail(user.email, user.full_name, otp);

    res.json({ success: true, message: 'OTP resent successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { register, verifyOTP, login, refreshToken, logout, resendOTP };