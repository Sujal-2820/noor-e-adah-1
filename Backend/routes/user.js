const express = require('express');
const router = express.Router();

// Import controllers and middleware
const userController = require('../controllers/userController');
const userAdminMessageController = require('../controllers/userAdminMessageController');
const { authorizeUser } = require('../middleware/auth');

// ============================================================================
// AUTHENTICATION ROUTES
// ============================================================================

/**
 * @route   POST /api/users/auth/firebase-sync
 * @desc    Sync Firebase user with backend
 * @access  Public
 */
router.post('/auth/firebase-sync', userController.firebaseSync);

/**
 * @route   POST /api/users/auth/register
 * @desc    User registration
 * @access  Public
 */
router.post('/auth/register', userController.register);

/**
 * @route   POST /api/users/auth/request-otp
 * @desc    Request OTP for user login/registration
 * @access  Public
 */
router.post('/auth/request-otp', userController.requestOTP);

/**
 * @route   POST /api/users/auth/verify-otp
 * @desc    Verify OTP and complete login/registration
 * @access  Public
 */
router.post('/auth/verify-otp', userController.verifyOTP);

/**
 * @route   POST /api/users/auth/logout
 * @desc    User logout
 * @access  Private (User)
 */
router.post('/auth/logout', authorizeUser, userController.logout);

/**
 * @route   GET /api/users/auth/profile
 * @desc    Get user profile
 * @access  Private (User)
 */
router.get('/auth/profile', authorizeUser, userController.getProfile);
router.put('/auth/profile', authorizeUser, userController.updateProfile);

// ============================================================================
// ADDRESS MANAGEMENT ROUTES
// ============================================================================

/**
 * @route   GET /api/users/addresses
 * @desc    Get user addresses
 * @access  Private (User)
 */
router.get('/addresses', authorizeUser, userController.getAddresses);

/**
 * @route   POST /api/users/addresses
 * @desc    Add new address
 * @access  Private (User)
 */
router.post('/addresses', authorizeUser, userController.addAddress);

/**
 * @route   PUT /api/users/addresses/:addressId
 * @desc    Update address
 * @access  Private (User)
 */
router.put('/addresses/:addressId', authorizeUser, userController.updateAddress);

/**
 * @route   DELETE /api/users/addresses/:addressId
 * @desc    Delete address
 * @access  Private (User)
 */
router.delete('/addresses/:addressId', authorizeUser, userController.deleteAddress);

/**
 * @route   PUT /api/users/addresses/:addressId/default
 * @desc    Set default address
 * @access  Private (User)
 */
router.put('/addresses/:addressId/default', authorizeUser, userController.setDefaultAddress);

// ============================================================================
// DASHBOARD ROUTES
// ============================================================================

/**
 * @route   GET /api/users/dashboard
 * @desc    Get dashboard overview data
 * @access  Private (User)
 */
router.get('/dashboard', authorizeUser, userController.getDashboard);

// ============================================================================
// ORDER MANAGEMENT ROUTES
// ============================================================================

/**
 * IMPORTANT: Specific routes with sub-paths must come BEFORE generic :orderId routes
 */

/**
 * @route   GET /api/users/orders/stats
 * @desc    Get order statistics
 * @access  Private (User)
 */
router.get('/orders/stats', authorizeUser, userController.getOrderStats);

/**
 * @route   POST /api/users/orders/:orderId/accept
 * @desc    Accept order (starts 1-hour grace period)
 * @access  Private (User)
 */
router.post('/orders/:orderId/accept', authorizeUser, userController.acceptOrder);

/**
 * @route   POST /api/users/orders/:orderId/confirm-acceptance
 * @desc    Confirm order acceptance (finalizes after grace period)
 * @access  Private (User)
 */
router.post('/orders/:orderId/confirm-acceptance', authorizeUser, userController.confirmOrderAcceptance);

/**
 * @route   POST /api/users/orders/:orderId/cancel-acceptance
 * @desc    Cancel order acceptance during grace period (allows escalation)
 * @access  Private (User)
 */
router.post('/orders/:orderId/cancel-acceptance', authorizeUser, userController.cancelOrderAcceptance);

/**
 * @route   POST /api/users/orders/:orderId/reject
 * @desc    Reject order (no availability - escalates to Admin)
 * @access  Private (User)
 */
router.post('/orders/:orderId/reject', authorizeUser, userController.rejectOrder);

/**
 * @route   POST /api/users/orders/:orderId/accept-partial
 * @desc    Partially accept order (some items available, some not)
 * @access  Private (User)
 */
router.post('/orders/:orderId/accept-partial', authorizeUser, userController.acceptOrderPartially);

/**
 * @route   POST /api/users/orders/:orderId/escalate-partial
 * @desc    Escalate order with partial quantities (Scenario 3)
 * @access  Private (User)
 */
router.post('/orders/:orderId/escalate-partial', authorizeUser, userController.escalateOrderPartial);

/**
 * @route   PUT /api/users/orders/:orderId/status
 * @desc    Update order status (Awaiting → Dispatched → Delivered)
 * @access  Private (User)
 */
router.put('/orders/:orderId/status', authorizeUser, userController.updateOrderStatus);

/**
 * @route   GET /api/users/orders
 * @desc    Get all orders with filtering
 * @access  Private (User)
 */
router.get('/orders', authorizeUser, userController.getOrders);
router.post('/orders', authorizeUser, userController.createOrder);

/**
 * @route   POST /api/users/payments/create-intent
 * @desc    Create payment intent for an order
 * @access  Private (User)
 */
router.post('/payments/create-intent', authorizeUser, userController.createPaymentIntent);

/**
 * @route   POST /api/users/payments/confirm
 * @desc    Confirm payment for an order
 * @access  Private (User)
 */
router.post('/payments/confirm', authorizeUser, userController.confirmPayment);

/**
 * @route   GET /api/users/orders/:orderId
 * @desc    Get order details
 * @access  Private (User)
 */
router.get('/orders/:orderId', authorizeUser, userController.getOrderDetails);

// ============================================================================
// SHOPPING BAG / CART ROUTES
// ============================================================================

/**
 * @route   GET /api/users/cart
 * @desc    Get user's shopping bag
 * @access  Private (User/Customer)
 */
router.get('/cart', authorizeUser, userController.getCart);

/**
 * @route   POST /api/users/cart
 * @desc    Add product to shopping bag
 * @access  Private (User/Customer)
 */
router.post('/cart', authorizeUser, userController.addToCart);

/**
 * @route   PUT /api/users/cart/:itemId
 * @desc    Update cart item quantity
 * @access  Private (User/Customer)
 */
router.put('/cart/:itemId', authorizeUser, userController.updateCartItem);

/**
 * @route   DELETE /api/users/cart/:itemId
 * @desc    Remove item from shopping bag
 * @access  Private (User/Customer)
 */
router.delete('/cart/:itemId', authorizeUser, userController.removeFromCart);

/**
 * @route   DELETE /api/users/cart
 * @desc    Clear shopping bag
 * @access  Private (User/Customer)
 */
router.delete('/cart', authorizeUser, userController.clearCart);

// ============================================================================
// PRODUCT MANAGEMENT ROUTES (For users to view and order products)
// ============================================================================

/**
 * @route   GET /api/users/products
 * @desc    Get all products available for ordering
 * @access  Private (User)
 */
router.get('/products', authorizeUser, userController.getProducts);

/**
 * @route   GET /api/users/products/:productId
 * @desc    Get product details for user
 * @access  Private (User)
 */
router.get('/products/:productId', authorizeUser, userController.getProductDetails);

// ============================================================================
// ORDER INVOICE ROUTES
// ============================================================================

/**
 * @route   GET /api/users/orders/:id/invoice
 * @desc    Generate invoice for user's order
 * @access  Private (User)
 */
router.get('/orders/:id/invoice', authorizeUser, userController.generateInvoice);

// ============================================================================
// INVENTORY MANAGEMENT ROUTES
// ============================================================================

/**
 * IMPORTANT: Specific routes with sub-paths must come BEFORE generic :itemId routes
 */

/**
 * @route   GET /api/users/inventory/stats
 * @desc    Get inventory statistics
 * @access  Private (User)
 */
router.get('/inventory/stats', authorizeUser, userController.getInventoryStats);

/**
 * @route   PUT /api/users/inventory/:itemId/stock
 * @desc    Update stock quantity manually
 * @access  Private (User)
 */
router.put('/inventory/:itemId/stock', authorizeUser, userController.updateInventoryStock);

/**
 * @route   GET /api/users/inventory
 * @desc    Get all inventory items with filtering
 * @access  Private (User)
 */
router.get('/inventory', authorizeUser, userController.getInventory);

/**
 * @route   GET /api/users/inventory/:itemId
 * @desc    Get inventory item details
 * @access  Private (User)
 */
router.get('/inventory/:itemId', authorizeUser, userController.getInventoryItemDetails);

// ============================================================================
// REPORTS & ANALYTICS ROUTES
// ============================================================================

/**
 * IMPORTANT: Specific routes with sub-paths must come BEFORE generic routes
 */

/**
 * @route   GET /api/users/reports/analytics
 * @desc    Get performance analytics
 * @access  Private (User)
 */
router.get('/reports/analytics', authorizeUser, userController.getPerformanceAnalytics);

/**
 * @route   GET /api/users/reports
 * @desc    Get reports data (revenue, orders, metrics)
 * @access  Private (User)
 */
router.get('/reports', authorizeUser, userController.getReports);

// ============================================================================
// EARNINGS ROUTES
// ============================================================================

/**
 * @route   GET /api/users/earnings
 * @desc    Get user earnings summary
 * @access  Private (User)
 */
router.get('/earnings', authorizeUser, userController.getEarningsSummary);

/**
 * @route   GET /api/users/earnings/history
 * @desc    Get user earnings history
 * @access  Private (User)
 */
router.get('/earnings/history', authorizeUser, userController.getEarningsHistory);

/**
 * @route   GET /api/users/earnings/orders
 * @desc    Get user earnings by orders
 * @access  Private (User)
 */
router.get('/earnings/orders', authorizeUser, userController.getEarningsByOrders);

/**
 * @route   GET /api/users/balance
 * @desc    Get user available balance
 * @access  Private (User)
 */
router.get('/balance', authorizeUser, userController.getBalance);

// ============================================================================
// WITHDRAWAL REQUEST ROUTES
// ============================================================================

/**
 * @route   POST /api/users/withdrawals/request
 * @desc    Request withdrawal from earnings
 * @access  Private (User)
 */
router.post('/withdrawals/request', authorizeUser, userController.requestWithdrawal);

/**
 * @route   GET /api/users/withdrawals
 * @desc    Get user withdrawal requests
 * @access  Private (User)
 */
router.get('/withdrawals', authorizeUser, userController.getWithdrawals);

// ============================================================================
// STOCK PURCHASE ROUTES
// ============================================================================

/**
 * @route   POST /api/users/stock-purchases/request
 * @desc    Request stock purchase
 * @access  Private (User)
 */
router.post('/stock-purchases/request', authorizeUser, userController.requestStockPurchase);

/**
 * @route   GET /api/users/stock-purchases
 * @desc    Get all user stock purchases
 * @access  Private (User)
 */
router.get('/stock-purchases', authorizeUser, userController.getStockPurchases);

/**
 * @route   GET /api/users/stock-purchases/:purchaseId
 * @desc    Get stock purchase details
 * @access  Private (User)
 */
router.get('/stock-purchases/:purchaseId', authorizeUser, userController.getStockPurchaseDetails);


// ============================================================================
// BANK ACCOUNT ROUTES
// ============================================================================

/**
 * @route   POST /api/users/bank-accounts
 * @desc    Add bank account
 * @access  Private (User)
 */
router.post('/bank-accounts', authorizeUser, userController.addBankAccount);

/**
 * @route   GET /api/users/bank-accounts
 * @desc    Get user bank accounts
 * @access  Private (User)
 */
router.get('/bank-accounts', authorizeUser, userController.getBankAccounts);

/**
 * @route   PUT /api/users/bank-accounts/:accountId
 * @desc    Update bank account
 * @access  Private (User)
 */
router.put('/bank-accounts/:accountId', authorizeUser, userController.updateBankAccount);

/**
 * @route   DELETE /api/users/bank-accounts/:accountId
 * @desc    Delete bank account
 * @access  Private (User)
 */
router.delete('/bank-accounts/:accountId', authorizeUser, userController.deleteBankAccount);

// ============================================================================
// MESSAGES ROUTES
// ============================================================================

/**
 * @route   POST /api/users/messages
 * @desc    Create message from user to admin
 * @access  Private (User)
 */
router.post('/messages', authorizeUser, userAdminMessageController.createMessage);

/**
 * @route   GET /api/users/messages
 * @desc    Get user's messages (sent and received)
 * @access  Private (User)
 */
router.get('/messages', authorizeUser, userAdminMessageController.getUserMessages);

/**
 * @route   GET /api/users/messages/:messageId
 * @desc    Get user message details
 * @access  Private (User)
 */
router.get('/messages/:messageId', authorizeUser, userAdminMessageController.getUserMessageDetails);

// ============================================================================
// NOTIFICATION ROUTES
// ============================================================================

/**
 * @route   GET /api/users/notifications
 * @desc    Get user notifications
 * @access  Private (User)
 */
router.get('/notifications', authorizeUser, userController.getNotifications);

/**
 * @route   PATCH /api/users/notifications/:notificationId/read
 * @desc    Mark notification as read
 * @access  Private (User)
 */
router.patch('/notifications/:notificationId/read', authorizeUser, userController.markNotificationAsRead);

/**
 * @route   PATCH /api/users/notifications/read-all
 * @desc    Mark all notifications as read
 * @access  Private (User)
 */
router.patch('/notifications/read-all', authorizeUser, userController.markAllNotificationsAsRead);

/**
 * @route   DELETE /api/users/notifications/:notificationId
 * @desc    Delete notification
 * @access  Private (User)
 */
router.delete('/notifications/:notificationId', authorizeUser, userController.deleteNotification);

module.exports = router;

