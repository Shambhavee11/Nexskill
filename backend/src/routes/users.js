const express = require('express');
const router = express.Router();
const {
  getMe,
  getUser,
  updateProfile,
  addSkill,
  deleteSkill,
  exploreCreators,
  getCreditHistory,
  addPortfolioItem,
  deletePortfolioItem
} = require('../controllers/usersController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// Profile
router.get('/me', getMe);
router.put('/me', updateProfile);
router.get('/me/credits', getCreditHistory);
router.get('/explore', exploreCreators);
router.get('/:userId', getUser);

// Skills
router.post('/me/skills', addSkill);
router.delete('/me/skills/:id', deleteSkill);

// Portfolio
router.post('/me/portfolio', addPortfolioItem);
router.delete('/me/portfolio/:id', deletePortfolioItem);

module.exports = router;