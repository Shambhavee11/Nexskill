const express = require('express');
const router = express.Router();
const {
  getMyProfile, getUserProfile, updateProfile,
  addSkill, deleteSkill, exploreCreators, getCreditHistory
} = require('../controllers/usersController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken); // All routes require auth

router.get('/me', getMyProfile);
router.put('/me', updateProfile);
router.get('/me/credits', getCreditHistory);
router.get('/explore', exploreCreators);
router.get('/:userId', getUserProfile);
router.post('/me/skills', addSkill);
router.delete('/me/skills/:skillId', deleteSkill);

module.exports = router;