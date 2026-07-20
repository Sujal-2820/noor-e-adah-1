const express = require('express');
const router = express.Router();
const newsletterController = require('../controllers/newsletterController');
const { authorizeAdmin } = require('../middleware/auth');

// Public route for users to subscribe
router.post('/subscribe', newsletterController.subscribe);

// Admin route to get all subscribers
router.get('/', authorizeAdmin, newsletterController.getSubscribers);

module.exports = router;
