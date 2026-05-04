const express = require('express');
const router = express.Router();
const influencerController = require('../controllers/influencerController');

/**
 * @route   GET /api/influencers
 * @desc    Get all active influencers
 * @access  Public
 */
router.get('/', influencerController.getInfluencers);

module.exports = router;
