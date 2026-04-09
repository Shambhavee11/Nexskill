const express = require('express');
const router = express.Router();
const {
  createRequest, getMyRequests, acceptRequest, completeRequest, submitReview
} = require('../controllers/requestsController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.post('/', createRequest);
router.get('/', getMyRequests);
router.put('/:requestId/accept', acceptRequest);
router.put('/:requestId/complete', completeRequest);
router.post('/:requestId/review', submitReview);

module.exports = router;