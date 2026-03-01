const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authorizeUser } = require('../middleware/auth');

// Auth routes
router.post('/auth/request-otp', userController.requestOTP);
router.post('/auth/login', userController.login);
router.post('/auth/register', userController.register);

// Profile routes
router.get('/profile', authorizeUser, userController.getProfile);

// Order routes
router.post('/orders', authorizeUser, userController.createOrder);
router.get('/orders', authorizeUser, userController.getOrders);
router.get('/orders/:orderId', authorizeUser, userController.getOrderDetails);

module.exports = router;
