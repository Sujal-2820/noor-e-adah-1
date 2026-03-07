const express = require('express');
const router = express.Router();

// Import controllers
const adminController = require('../controllers/adminController');
const adminTaskController = require('../controllers/adminTaskController');
const UserAdminMessageController = require('../controllers/UserAdminMessageController');

// Import middleware
const { authorizeAdmin } = require('../middleware/auth');
const { uploadVideo } = require('../config/cloudinary');
// const { validateRequest } = require('../middleware/validation');

// ============================================================================
// AUTHENTICATION ROUTES
// ============================================================================

/**
 * @route   POST /api/admin/auth/login
 * @desc    Admin login (Step 1: Phone only)
 * @access  Public
 */
router.post('/auth/login', adminController.login);

/**
 * @route   POST /api/admin/auth/request-otp
 * @desc    Request OTP for admin login (Step 2)
 * @access  Public
 */
router.post('/auth/request-otp', adminController.requestOTP);

/**
 * @route   POST /api/admin/auth/verify-otp
 * @desc    Verify OTP and complete login
 * @access  Public
 */
router.post('/auth/verify-otp', adminController.verifyOTP);

/**
 * @route   POST /api/admin/auth/logout
 * @desc    Admin logout
 * @access  Private (Admin)
 */
router.post('/auth/logout', authorizeAdmin, adminController.logout);

/**
 * @route   GET /api/admin/auth/profile
 * @desc    Get admin profile
 * @access  Private (Admin)
 */
router.get('/auth/profile', authorizeAdmin, adminController.getProfile);

// ============================================================================
// DASHBOARD ROUTES
// ============================================================================

/**
 * @route   GET /api/admin/dashboard
 * @desc    Get dashboard overview data
 * @access  Private (Admin)
 */
router.get('/dashboard', authorizeAdmin, adminController.getDashboard);

// ============================================================================
// TASK (TODO) MANAGEMENT ROUTES
// ============================================================================

/**
 * @route   GET /api/admin/tasks
 * @desc    Get all admin todo tasks
 * @access  Private (Admin)
 */
router.get('/tasks', authorizeAdmin, adminTaskController.getTasks);

/**
 * @route   PUT /api/admin/tasks/:id/view
 * @desc    Mark task as viewed
 * @access  Private (Admin)
 */
router.put('/tasks/:id/view', authorizeAdmin, adminTaskController.markAsViewed);

/**
 * @route   PUT /api/admin/tasks/:id/complete
 * @desc    Mark task as completed
 * @access  Private (Admin)
 */
router.put('/tasks/:id/complete', authorizeAdmin, adminTaskController.markAsCompleted);

// ============================================================================
// PRODUCT MANAGEMENT ROUTES
// ============================================================================

/**
 * @route   GET /api/admin/products
 * @desc    Get all products with filtering
 * @access  Private (Admin)
 */
router.get('/products', authorizeAdmin, adminController.getProducts);

/**
 * @route   GET /api/admin/products/:productId
 * @desc    Get product details
 * @access  Private (Admin)
 */
router.get('/products/:productId', authorizeAdmin, adminController.getProductDetails);

/**
 * @route   POST /api/admin/products
 * @desc    Create new product
 * @access  Private (Admin)
 */
router.post('/products', authorizeAdmin, adminController.createProduct);

/**
 * IMPORTANT: Specific routes with sub-paths must come BEFORE generic :productId routes
 * Otherwise Express will match the generic route first
 */

/**
 * @route   POST /api/admin/products/:productId/assign
 * @desc    Assign product to User region-wise
 * @access  Private (Admin)
 */
router.post('/products/:productId/assign', authorizeAdmin, adminController.assignProductToUser);

/**
 * @route   PUT /api/admin/products/:productId/visibility
 * @desc    Toggle product visibility (active/inactive)
 * @access  Private (Admin)
 */
router.put('/products/:productId/visibility', authorizeAdmin, adminController.toggleProductVisibility);

/**
 * @route   POST /api/admin/products/:productId/video
 * @desc    Upload and associate vertical video with product
 * @access  Private (Admin)
 */
router.post('/products/:productId/video', authorizeAdmin, uploadVideo.single('video'), adminController.uploadProductVideo);

/**
 * @route   DELETE /api/admin/products/:productId/video
 * @desc    Delete associated product video
 * @access  Private (Admin)
 */
router.delete('/products/:productId/video', authorizeAdmin, adminController.deleteProductVideo);

/**
 * @route   PUT /api/admin/products/:productId
 * @desc    Update product
 * @access  Private (Admin)
 */
router.put('/products/:productId', authorizeAdmin, adminController.updateProduct);

/**
 * @route   DELETE /api/admin/products/:productId
 * @desc    Delete product
 * @access  Private (Admin)
 */
router.delete('/products/:productId', authorizeAdmin, adminController.deleteProduct);

// ============================================================================
// User MANAGEMENT ROUTES
// ============================================================================

/**
 * @route   GET /api/admin/Users
 * @desc    Get all Users with filtering
 * @access  Private (Admin)
 */
router.get('/Users', authorizeAdmin, adminController.getUsers);

/**
 * IMPORTANT: Specific routes with sub-paths must come BEFORE generic :UserId routes
 */

/**
 * @route   GET /api/admin/Users/withdrawals
 * @desc    Get all User withdrawal requests (global, with optional filters)
 * @access  Private (Admin)
 */
router.get('/Users/rankings', authorizeAdmin, adminController.getUserRankings);
router.get('/Users/withdrawals', authorizeAdmin, adminController.getAllUserWithdrawals);

/**
 * @route   POST /api/admin/Users/withdrawals/:requestId/payment-intent
 * @desc    Create payment intent for User withdrawal
 * @access  Private (Admin)
 */
router.post('/Users/withdrawals/:requestId/payment-intent', authorizeAdmin, adminController.createUserWithdrawalPaymentIntent);

/**
 * @route   POST /api/admin/Users/withdrawals/:requestId/approve
 * @desc    Approve User withdrawal request
 * @access  Private (Admin)
 */
router.post('/Users/withdrawals/:requestId/approve', authorizeAdmin, adminController.approveUserWithdrawal);

/**
 * @route   POST /api/admin/Users/withdrawals/:requestId/reject
 * @desc    Reject User withdrawal request
 * @access  Private (Admin)
 */
router.post('/Users/withdrawals/:requestId/reject', authorizeAdmin, adminController.rejectUserWithdrawal);

/**
 * @route   PUT /api/admin/Users/withdrawals/:requestId/complete
 * @desc    Mark User withdrawal as completed (after payment processed)
 * @access  Private (Admin)
 */
router.put('/Users/withdrawals/:requestId/complete', authorizeAdmin, adminController.completeUserWithdrawal);

/**
 * @route   POST /api/admin/Users/:UserId/approve
 * @desc    Approve User application
 * @access  Private (Admin)
 */
router.post('/Users/:UserId/approve', authorizeAdmin, adminController.approveUser);

/**
 * @route   POST /api/admin/Users/:UserId/reject
 * @desc    Reject User application
 * @access  Private (Admin)
 */
router.post('/Users/:UserId/reject', authorizeAdmin, adminController.rejectUser);

/**
 * @route   PUT /api/admin/Users/:UserId/ban
 * @desc    Ban User (temporary or permanent) - requires >3 escalations
 * @access  Private (Admin)
 */
router.put('/Users/:UserId/ban', authorizeAdmin, adminController.banUser);

/**
 * @route   PUT /api/admin/Users/:UserId/unban
 * @desc    Revoke temporary ban
 * @access  Private (Admin)
 */
router.put('/Users/:UserId/unban', authorizeAdmin, adminController.unbanUser);

/**
 * @route   GET /api/admin/Users/:UserId
 * @desc    Get User details
 * @access  Private (Admin)
 */
router.get('/Users/:UserId', authorizeAdmin, adminController.getUserDetails);

/**
 * @route   DELETE /api/admin/Users/:UserId
 * @desc    Permanently delete User (soft delete - activities persist) - requires >3 escalations
 * @access  Private (Admin)
 */
router.delete('/Users/:UserId', authorizeAdmin, adminController.deleteUser);

// UNIFIED WITHDRAWAL MANAGEMENT ROUTES
// ============================================================================

/**
 * @route   GET /api/admin/withdrawals
 * @desc    Get all withdrawals (Users + sellers) for admin dashboard
 * @access  Private (Admin)
 */
router.get('/withdrawals', authorizeAdmin, adminController.getAllWithdrawals);

/**
 * @route   GET /api/admin/payment-history
 * @desc    Get payment history for admin
 * @access  Private (Admin)
 */
router.get('/payment-history', authorizeAdmin, adminController.getPaymentHistory);

/**
 * @route   GET /api/admin/payment-history/stats
 * @desc    Get payment history statistics
 * @access  Private (Admin)
 */
router.get('/payment-history/stats', authorizeAdmin, adminController.getPaymentHistoryStats);

// ============================================================================
// ORDER & PAYMENT MANAGEMENT ROUTES
// ============================================================================

/**
 * @route   GET /api/admin/orders
 * @desc    Get all orders with filtering
 * @access  Private (Admin)
 */
router.get('/orders', authorizeAdmin, adminController.getOrders);

/**
 * @route   GET /api/admin/orders/escalated
 * @desc    Get escalated orders (assigned to admin)
 * @access  Private (Admin)
 */
router.get('/orders/escalated', authorizeAdmin, adminController.getEscalatedOrders);

/**
 * IMPORTANT: Specific routes with sub-paths must come BEFORE generic :orderId routes
 */

/**
 * @route   POST /api/admin/orders/:orderId/revert-escalation
 * @desc    Revert escalation back to User
 * @access  Private (Admin)
 */
router.post('/orders/:orderId/revert-escalation', authorizeAdmin, adminController.revertEscalation);

/**
 * @route   PUT /api/admin/orders/:orderId/reassign
 * @desc    Reassign order to different User
 * @access  Private (Admin)
 */
router.put('/orders/:orderId/reassign', authorizeAdmin, adminController.reassignOrder);

/**
 * @route   POST /api/admin/orders/:orderId/fulfill
 * @desc    Fulfill escalated order from warehouse
 * @access  Private (Admin)
 */
router.post('/orders/:orderId/fulfill', authorizeAdmin, adminController.fulfillOrderFromWarehouse);

/**
 * @route   PUT /api/admin/orders/:orderId/status
 * @desc    Update order status (for admin-fulfilled orders)
 * @access  Private (Admin)
 */
router.put('/orders/:orderId/status', authorizeAdmin, adminController.updateOrderStatus);

/**
 * @route   GET /api/admin/orders/:orderId
 * @desc    Get order details
 * @access  Private (Admin)
 */
router.get('/orders/:orderId', authorizeAdmin, adminController.getOrderDetails);

/**
 * @route   GET /api/admin/orders/:orderId/invoice
 * @desc    Generate and download invoice PDF for order
 * @access  Private (Admin)
 */
router.get('/orders/:orderId/invoice', authorizeAdmin, adminController.generateInvoice);


/**
 * @route   GET /api/admin/payments
 * @desc    Get all payments with filtering
 * @access  Private (Admin)
 */
router.get('/payments', authorizeAdmin, adminController.getPayments);

// ============================================================================
// OPERATIONS & LOGISTICS ROUTES
// ============================================================================

/**
 * @route   GET /api/admin/operations/logistics-settings
 * @desc    Get logistics settings
 * @access  Private (Admin)
 */
router.get('/operations/logistics-settings', authorizeAdmin, adminController.getLogisticsSettings);

/**
 * @route   PUT /api/admin/operations/logistics-settings
 * @desc    Update logistics settings
 * @access  Private (Admin)
 */
router.put('/operations/logistics-settings', authorizeAdmin, adminController.updateLogisticsSettings);

/**
 * @route   GET /api/admin/operations/notifications
 * @desc    Get all platform notifications
 * @access  Private (Admin)
 */
router.get('/operations/notifications', authorizeAdmin, adminController.getNotifications);

/**
 * @route   POST /api/admin/operations/notifications
 * @desc    Create new platform notification
 * @access  Private (Admin)
 */
router.post('/operations/notifications', authorizeAdmin, adminController.createNotification);

/**
 * @route   PUT /api/admin/operations/notifications/:notificationId
 * @desc    Update platform notification
 * @access  Private (Admin)
 */
router.put('/operations/notifications/:notificationId', authorizeAdmin, adminController.updateNotification);

/**
 * @route   DELETE /api/admin/operations/notifications/:notificationId
 * @desc    Delete platform notification
 * @access  Private (Admin)
 */
router.delete('/operations/notifications/:notificationId', authorizeAdmin, adminController.deleteNotification);

// ============================================================================
// ANALYTICS & REPORTING ROUTES
// ============================================================================

/**
 * @route   GET /api/admin/analytics
 * @desc    Get analytics data
 * @access  Private (Admin)
 */
router.get('/analytics', authorizeAdmin, adminController.getAnalytics);

/**
 * @route   GET /api/admin/reports
 * @desc    Generate reports (daily/weekly/monthly)
 * @access  Private (Admin)
 */
router.get('/reports', authorizeAdmin, adminController.generateReports);

// ============================================================================
// User-ADMIN MESSAGING ROUTES
// ============================================================================

/**
 * @route   GET /api/admin/User-messages
 * @desc    Get admin messages (from all Users)
 * @access  Private (Admin)
 */
router.get('/User-messages', authorizeAdmin, UserAdminMessageController.getAdminMessages);

/**
 * @route   GET /api/admin/User-messages/stats
 * @desc    Get message statistics for admin dashboard
 * @access  Private (Admin)
 */
router.get('/User-messages/stats', authorizeAdmin, UserAdminMessageController.getMessageStats);

/**
 * @route   GET /api/admin/User-messages/:messageId
 * @desc    Get admin message details
 * @access  Private (Admin)
 */
router.get('/User-messages/:messageId', authorizeAdmin, UserAdminMessageController.getAdminMessageDetails);

/**
 * @route   POST /api/admin/User-messages
 * @desc    Admin sends reply/message to User
 * @access  Private (Admin)
 */
router.post('/User-messages', authorizeAdmin, UserAdminMessageController.adminCreateMessage);

/**
 * @route   PUT /api/admin/User-messages/:messageId/status
 * @desc    Admin updates message status (resolve, close, etc.)
 * @access  Private (Admin)
 */
router.put('/User-messages/:messageId/status', authorizeAdmin, UserAdminMessageController.updateMessageStatus);

/**
 * @route   PUT /api/admin/User-messages/:messageId/read
 * @desc    Mark message as read (Admin)
 * @access  Private (Admin)
 */
router.put('/User-messages/:messageId/read', authorizeAdmin, UserAdminMessageController.markMessageAsRead);

// ============================================================================
// OFFERS MANAGEMENT ROUTES
// ============================================================================

/**
 * @route   GET /api/admin/offers
 * @desc    Get all offers
 * @access  Private (Admin)
 */
router.get('/offers', authorizeAdmin, adminController.getOffers);

/**
 * @route   GET /api/admin/offers/:id
 * @desc    Get single offer
 * @access  Private (Admin)
 */
router.get('/offers/:id', authorizeAdmin, adminController.getOffer);

/**
 * @route   POST /api/admin/offers
 * @desc    Create offer
 * @access  Private (Admin)
 */
router.post('/offers', authorizeAdmin, adminController.createOffer);

/**
 * @route   PUT /api/admin/offers/:id
 * @desc    Update offer
 * @access  Private (Admin)
 */
router.put('/offers/:id', authorizeAdmin, adminController.updateOffer);

/**
 * @route   DELETE /api/admin/offers/:id
 * @desc    Delete offer
 * @access  Private (Admin)
 */
router.delete('/offers/:id', authorizeAdmin, adminController.deleteOffer);

// ============================================================================
// REVIEW MANAGEMENT ROUTES
// ============================================================================

/**
 * @route   GET /api/admin/reviews
 * @desc    Get all product reviews with filtering
 * @access  Private (Admin)
 */
router.get('/reviews', authorizeAdmin, adminController.getReviews);

/**
 * IMPORTANT: Specific routes with sub-paths must come BEFORE generic :reviewId routes
 */

/**
 * @route   POST /api/admin/reviews/:reviewId/respond
 * @desc    Respond to a review
 * @access  Private (Admin)
 */
router.post('/reviews/:reviewId/respond', authorizeAdmin, adminController.respondToReview);

/**
 * @route   PUT /api/admin/reviews/:reviewId/respond
 * @desc    Update admin response to a review
 * @access  Private (Admin)
 */
router.put('/reviews/:reviewId/respond', authorizeAdmin, adminController.updateReviewResponse);

/**
 * @route   DELETE /api/admin/reviews/:reviewId/respond
 * @desc    Delete admin response
 * @access  Private (Admin)
 */
router.delete('/reviews/:reviewId/respond', authorizeAdmin, adminController.deleteReviewResponse);

/**
 * @route   PUT /api/admin/reviews/:reviewId/moderate
 * @desc    Moderate review (approve/reject, hide/show)
 * @access  Private (Admin)
 */
router.put('/reviews/:reviewId/moderate', authorizeAdmin, adminController.moderateReview);

/**
 * @route   GET /api/admin/reviews/:reviewId
 * @desc    Get review details
 * @access  Private (Admin)
 */
router.get('/reviews/:reviewId', authorizeAdmin, adminController.getReviewDetails);

/**
 * @route   DELETE /api/admin/reviews/:reviewId
 * @desc    Delete review
 * @access  Private (Admin)
 */
router.delete('/reviews/:reviewId', authorizeAdmin, adminController.deleteReview);

// ============================================================================
// DELIVERY SETTINGS ROUTES
// ============================================================================

/**
 * @route   GET /api/admin/settings/delivery
 * @desc    Get delivery charge and time configuration
 * @access  Private (Admin)
 */
router.get('/settings/delivery', authorizeAdmin, adminController.getDeliverySettings);

/**
 * @route   PUT /api/admin/settings/delivery
 * @desc    Update delivery charge and time configuration
 * @access  Private (Admin)
 */
router.put('/settings/delivery', authorizeAdmin, adminController.updateDeliverySettings);

module.exports = router;


