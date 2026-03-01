/**
 * Website API Service
 * 
 * This file contains all API endpoints for the Website application.
 * All endpoints are backend-ready and will work once the backend is implemented.
 * 
 * This is completely separate from the User module - uses same 'user_token' (same backend, same user)
 * 
 * Base URL should be configured in environment variables:
 * - Development: http://localhost:3000/api
 * - Production: https://api.satpurabio.com/api
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'

/**
 * API Response Handler
 */
async function handleResponse(response) {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'An error occurred' }))
    // Ensure error response always has a 'success: false' and 'error' object
    throw { success: false, error: { message: error.message || `HTTP error! status: ${response.status}` } }
  }
  return response.json()
}

/**
 * API Request Helper
 */
async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('user_token') // Same token as User module (same backend, same user)

  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config)
  return handleResponse(response)
}

// ============================================================================
// AUTHENTICATION & ONBOARDING APIs
// ============================================================================

/**
 * Request OTP
 * POST /users/auth/request-otp
 * 
 * @param {Object} data - { phone, language }
 * @returns {Promise<Object>} - { message: 'OTP sent successfully', expiresIn: 300 }
 */
export async function requestOTP(data) {
  return apiRequest('/users/auth/request-otp', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * Sync Firebase User with Backend
 * @param {Object} data - { idToken }
 */
export async function syncFirebaseUser(data) {
  return apiRequest('/users/auth/firebase-sync', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * Register User with OTP
 * POST /users/auth/register
 * 
 * @param {Object} data - { fullName, phone, otp, adminId? }
 * @returns {Promise<Object>} - { token, user: { id, name, phone, adminId } }
 */
export async function register(data) {
  return apiRequest('/users/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * Login with OTP
 * POST /users/auth/login
 * 
 * @param {Object} data - { phone, otp }
 * @returns {Promise<Object>} - { token, user: { id, name, phone, adminId, location } }
 */
export async function loginWithOtp(data) {
  return apiRequest('/users/auth/login', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * Verify OTP and Login (Legacy - use loginWithOtp)
 * POST /users/auth/verify-otp
 * 
 * @param {Object} data - { phone, otp, adminId? }
 * @returns {Promise<Object>} - { token, user: { id, name, phone, email, adminId, location } }
 */
export async function verifyOTP(data) {
  return apiRequest('/users/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * Get Admin ID (Read-only - Admin ID is locked for lifetime after first registration)
 * GET /users/profile/admin-id
 * 
 * @returns {Promise<Object>} - Admin ID information
 * @note Admin ID can only be set during first-time registration and cannot be changed afterwards
 */
export async function getAdminID() {
  return apiRequest('/users/profile/admin-id')
}

/**
 * Get User Profile
 * GET /users/profile
 * 
 * @returns {Promise<Object>} - User profile data
 */
export async function getUserProfile() {
  return apiRequest('/users/profile')
}

/**
 * Update User Profile
 * PUT /users/profile
 * 
 * @param {Object} profileData - { name, email, phone, location }
 * @returns {Promise<Object>} - Updated user profile
 */
export async function updateUserProfile(profileData) {
  return apiRequest('/users/profile', {
    method: 'PUT',
    body: JSON.stringify(profileData),
  })
}

/**
 * Request OTP for current phone (for phone update)
 * POST /users/profile/phone/request-otp-current
 * 
 * @returns {Promise<Object>} - { message, expiresIn, testOTP? }
 */
export async function requestOTPForCurrentPhone() {
  return apiRequest('/users/profile/phone/request-otp-current', {
    method: 'POST',
  })
}

/**
 * Verify OTP for current phone (for phone update)
 * POST /users/profile/phone/verify-otp-current
 * 
 * @param {Object} data - { otp }
 * @returns {Promise<Object>} - { message, verified }
 */
export async function verifyOTPForCurrentPhone(data) {
  return apiRequest('/users/profile/phone/verify-otp-current', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * Request OTP for new phone (for phone update)
 * POST /users/profile/phone/request-otp-new
 * 
 * @param {Object} data - { newPhone }
 * @returns {Promise<Object>} - { message, expiresIn, testOTP? }
 */
export async function requestOTPForNewPhone(data) {
  return apiRequest('/users/profile/phone/request-otp-new', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * Verify OTP for new phone and update phone number
 * POST /users/profile/phone/verify-otp-new
 * 
 * @param {Object} data - { otp }
 * @returns {Promise<Object>} - Updated user profile
 */
export async function verifyOTPForNewPhone(data) {
  return apiRequest('/users/profile/phone/verify-otp-new', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * Logout
 * POST /users/auth/logout
 * 
 * @returns {Promise<Object>} - { message: 'Logged out successfully' }
 */
export async function websiteLogout() {
  return apiRequest('/users/auth/logout', {
    method: 'POST',
  })
}

// ============================================================================
// PRODUCT & CATALOG APIs
// ============================================================================

/**
 * Get Categories
 * GET /users/products/categories
 * 
 * @returns {Promise<Array>} - Array of categories
 */
export async function getCategories() {
  return apiRequest('/catalog/categories')
}

/**
 * Get Products
 * GET /users/products
 * 
 * @param {Object} params - { category, search, minPrice, maxPrice, sort, limit, offset }
 * @returns {Promise<Object>} - { products: Array, total: number }
 */
export async function getProducts(params = {}) {
  const queryParams = new URLSearchParams(params).toString()
  return apiRequest(`/catalog/products?${queryParams}`)
}

/**
 * Get Product Details
 * GET /users/products/:productId
 * 
 * @param {string} productId - Product ID
 * @returns {Promise<Object>} - Product details with stock, delivery timeline, user info
 */
export async function getProductDetails(productId) {
  return apiRequest(`/catalog/products/${productId}`)
}

/**
 * Get Popular Products
 * GET /users/products/popular
 * 
 * @param {Object} params - { limit }
 * @returns {Promise<Array>} - Array of popular products
 */
export async function getPopularProducts(params = {}) {
  const queryParams = new URLSearchParams(params).toString()
  return apiRequest(`/catalog/products?sort=popular&${queryParams}`)
}

/**
 * Get Offers/Banners
 * GET /users/offers
 * 
 * @returns {Promise<Object>} - { carousels: Array, specialOffers: Array }
 */
export async function getOffers() {
  return apiRequest('/catalog/offers')
}

/**
 * Search Products
 * GET /users/products/search
 * 
 * @param {Object} params - { query, category, limit, offset }
 * @returns {Promise<Object>} - { products: Array, total: number }
 */
export async function searchProducts(params = {}) {
  const queryParams = new URLSearchParams(params).toString()
  return apiRequest(`/catalog/products?${queryParams}`)
}

// ============================================================================
// CART APIs
// ============================================================================

/**
 * Get Cart
 * GET /users/cart
 * 
 * @returns {Promise<Object>} - { items: Array, total: number }
 */
export async function getCart() {
  return apiRequest('/users/cart')
}

/**
 * Add to Cart
 * POST /users/cart
 * 
 * @param {Object} data - { productId, quantity, attributes? }
 * @returns {Promise<Object>} - Updated cart
 */
export async function addToCart(data) {
  return apiRequest('/users/cart', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * Update Cart Item
 * PUT /users/cart/:itemId
 * 
 * @param {string} itemId - Cart item ID
 * @param {Object} data - { quantity }
 * @returns {Promise<Object>} - Updated cart
 */
export async function updateCartItem(itemId, data) {
  return apiRequest(`/users/cart/${itemId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

/**
 * Remove from Cart
 * DELETE /users/cart/:itemId
 * 
 * @param {string} itemId - Cart item ID
 * @returns {Promise<Object>} - Updated cart
 */
export async function removeFromCart(itemId) {
  return apiRequest(`/users/cart/${itemId}`, {
    method: 'DELETE',
  })
}

/**
 * Clear Cart
 * DELETE /users/cart
 * 
 * @returns {Promise<Object>} - { message: 'Cart cleared' }
 */
export async function clearCart() {
  return apiRequest('/users/cart', {
    method: 'DELETE',
  })
}

/**
 * Validate Cart (Check minimum order value)
 * POST /users/cart/validate
 * 
 * @returns {Promise<Object>} - { valid: boolean, total: number, meetsMinimum: boolean, shortfall: number }
 */
export async function validateCart() {
  return apiRequest('/users/cart/validate', {
    method: 'POST',
  })
}

// ============================================================================
// VENDOR ASSIGNMENT APIs
// ============================================================================

/**
 * Get Assigned User
 * POST /users/users/assign
 * 
 * @param {Object} data - { location: { lat, lng, address, city, state, pincode } }
 * @returns {Promise<Object>} - { user: Object, distance: number, hasStock: boolean }
 */
export async function getAssignedUser(data) {
  return apiRequest('/users/users/assign', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * Check User Stock
 * POST /users/users/check-stock
 * 
 * @param {Object} data - { userId, productIds: Array }
 * @returns {Promise<Object>} - { available: Array, unavailable: Array }
 */
export async function checkUserStock(data) {
  return apiRequest('/users/users/check-stock', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

// ============================================================================
// CHECKOUT & ORDER APIs
// ============================================================================

/**
 * Create Order
 * POST /users/orders
 * 
 * IMPORTANT: The backend should handle partial fulfillment scenarios:
 * - When user has some items but not all, the order should be split:
 *   - Items in stock → User fulfills
 *   - Items out of stock/insufficient → Escalated to Admin
 * - The response should indicate if order is split and provide details
 * 
 * @param {Object} orderData - {
 *   items: Array<{ productId: string, quantity: number, attributes?: Object }>,
 *   addressId: string,
 *   shippingMethod: string,
 *   userId: string,
 *   paymentMethod: string,
 *   paymentPreference: 'partial' | 'full',
 *   payInFull: boolean,
 *   upfrontAmount: number,
 *   deliveryChargeWaived?: boolean
 * }
 * @returns {Promise<Object>} - { 
 *   order: Object,
 *   paymentIntent: Object,
 *   splitOrder?: { userOrder: Object, adminOrder: Object } // If partial fulfillment
 * }
 */
export async function createOrder(orderData) {
  return apiRequest('/users/orders', {
    method: 'POST',
    body: JSON.stringify(orderData),
  })
}

/**
 * Get Orders
 * GET /users/orders
 * 
 * IMPORTANT: Orders returned should include the latest status updates from users.
 * Each order should have:
 * - status: 'awaiting' | 'dispatched' | 'delivered'
 * - statusTimeline: Array of { status: string, timestamp: ISO string }
 * 
 * @param {Object} params - { status, limit, offset }
 * @returns {Promise<Object>} - { orders: Array with status and statusTimeline, total: number }
 */
export async function getOrders(params = {}) {
  const queryParams = new URLSearchParams(params).toString()
  return apiRequest(`/users/orders?${queryParams}`)
}

/**
 * Get Order Details
 * GET /users/orders/:orderId
 * 
 * @param {string} orderId - Order ID
 * @returns {Promise<Object>} - Order details with items, payment, delivery status
 */
export async function getOrderDetails(orderId) {
  return apiRequest(`/users/orders/${orderId}`)
}

/**
 * Track Order
 * GET /users/orders/:orderId/track
 * 
 * @param {string} orderId - Order ID
 * @returns {Promise<Object>} - Order tracking information
 */
export async function trackOrder(orderId) {
  return apiRequest(`/users/orders/${orderId}/track`)
}

/**
 * Cancel Order
 * PUT /users/orders/:orderId/cancel
 * 
 * @param {string} orderId - Order ID
 * @param {Object} data - { reason }
 * @returns {Promise<Object>} - Updated order
 */
export async function cancelOrder(orderId, data = {}) {
  return apiRequest(`/users/orders/${orderId}/cancel`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

// ============================================================================
// PAYMENT APIs
// ============================================================================

/**
 * Create Payment Intent (Advance Payment)
 * POST /users/payments/create-intent
 * 
 * @param {Object} data - { orderId, amount, paymentMethod }
 * @returns {Promise<Object>} - { paymentIntentId, clientSecret, paymentGateway: 'razorpay'|'paytm'|'stripe' }
 */
export async function createPaymentIntent(data) {
  return apiRequest('/users/payments/create-intent', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * Confirm Payment (Advance Payment)
 * POST /users/payments/confirm
 * 
 * @param {Object} data - { 
 *   orderId: string (required),
 *   paymentIntentId?: string,
 *   gatewayPaymentId: string (required - dummy for now),
 *   gatewayOrderId?: string (dummy for now),
 *   gatewaySignature?: string (dummy for now),
 *   paymentMethod: string
 * }
 * @returns {Promise<Object>} - { success: boolean, transactionId, orderId }
 */
export async function confirmPayment(data) {
  return apiRequest('/users/payments/confirm', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * Create Remaining Payment Intent
 * POST /users/payments/create-remaining
 * 
 * @param {Object} data - { orderId, paymentMethod }
 * @returns {Promise<Object>} - { paymentIntentId, clientSecret, amount }
 */
export async function createRemainingPaymentIntent(data) {
  return apiRequest('/users/payments/create-remaining', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * Confirm Remaining Payment
 * POST /users/payments/confirm-remaining
 * 
 * @param {Object} data - { orderId, paymentIntentId, paymentMethod, paymentDetails }
 * @returns {Promise<Object>} - { success: boolean, transactionId }
 */
export async function confirmRemainingPayment(data) {
  return apiRequest('/users/payments/confirm-remaining', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * Get Payment Status
 * GET /users/payments/:paymentId
 * 
 * @param {string} paymentId - Payment ID
 * @returns {Promise<Object>} - Payment status and details
 */
export async function getPaymentStatus(paymentId) {
  return apiRequest(`/users/payments/${paymentId}`)
}

/**
 * Get Order Payments
 * GET /users/orders/:orderId/payments
 * 
 * @param {string} orderId - Order ID
 * @returns {Promise<Object>} - { advance: Object, remaining: Object }
 */
export async function getOrderPayments(orderId) {
  return apiRequest(`/users/orders/${orderId}/payments`)
}

// ============================================================================
// ADDRESS APIs
// ============================================================================

/**
 * Get Addresses
 * GET /users/addresses
 * 
 * @returns {Promise<Array>} - Array of addresses
 */
export async function getAddresses() {
  return apiRequest('/users/addresses')
}

/**
 * Add Address
 * POST /users/addresses
 * 
 * @param {Object} addressData - { name, address, city, state, pincode, phone, isDefault, coordinates? }
 * @returns {Promise<Object>} - Created address
 */
export async function addAddress(addressData) {
  return apiRequest('/users/addresses', {
    method: 'POST',
    body: JSON.stringify(addressData),
  })
}

/**
 * Update Address
 * PUT /users/addresses/:addressId
 * 
 * @param {string} addressId - Address ID
 * @param {Object} addressData - Address fields to update
 * @returns {Promise<Object>} - Updated address
 */
export async function updateAddress(addressId, addressData) {
  return apiRequest(`/users/addresses/${addressId}`, {
    method: 'PUT',
    body: JSON.stringify(addressData),
  })
}

/**
 * Delete Address
 * DELETE /users/addresses/:addressId
 * 
 * @param {string} addressId - Address ID
 * @returns {Promise<Object>} - { message: 'Address deleted' }
 */
export async function deleteAddress(addressId) {
  return apiRequest(`/users/addresses/${addressId}`, {
    method: 'DELETE',
  })
}

/**
 * Set Default Address
 * PUT /users/addresses/:addressId/default
 * 
 * @param {string} addressId - Address ID
 * @returns {Promise<Object>} - Updated address
 */
export async function setDefaultAddress(addressId) {
  return apiRequest(`/users/addresses/${addressId}/default`, {
    method: 'PUT',
  })
}

// ============================================================================
// FAVOURITES/WISHLIST APIs
// ============================================================================

/**
 * Get Favourites
 * GET /users/favourites
 * 
 * @returns {Promise<Array>} - Array of favourite product IDs
 */
export async function getFavourites() {
  return apiRequest('/users/favourites')
}

/**
 * Add to Favourites
 * POST /users/favourites
 * 
 * @param {Object} data - { productId }
 * @returns {Promise<Object>} - { message: 'Added to favourites' }
 */
export async function addToFavourites(data) {
  return apiRequest('/users/favourites', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * Remove from Favourites
 * DELETE /users/favourites/:productId
 * 
 * @param {string} productId - Product ID
 * @returns {Promise<Object>} - { message: 'Removed from favourites' }
 */
export async function removeFromFavourites(productId) {
  return apiRequest(`/users/favourites/${productId}`, {
    method: 'DELETE',
  })
}

// ============================================================================
// NOTIFICATIONS APIs
// ============================================================================

/**
 * Get Notifications
 * GET /users/notifications
 * 
 * @param {Object} params - { read, type, limit, offset }
 * @returns {Promise<Object>} - { notifications: Array, unreadCount: number }
 */
export async function getNotifications(params = {}) {
  const queryParams = new URLSearchParams(params).toString()
  return apiRequest(`/users/notifications?${queryParams}`)
}

/**
 * Mark Notification as Read
 * PUT /users/notifications/:notificationId/read
 * 
 * @param {string} notificationId - Notification ID
 * @returns {Promise<Object>} - { message: 'Marked as read' }
 */
export async function markNotificationRead(notificationId) {
  return apiRequest(`/users/notifications/${notificationId}/read`, {
    method: 'PUT',
  })
}

/**
 * Mark All Notifications as Read
 * PUT /users/notifications/read-all
 * 
 * @returns {Promise<Object>} - { message: 'All notifications marked as read' }
 */
export async function markAllNotificationsRead() {
  return apiRequest('/users/notifications/read-all', {
    method: 'PUT',
  })
}

// ============================================================================
// SUPPORT APIs
// ============================================================================

/**
 * Create Support Ticket
 * POST /users/support/tickets
 * 
 * @param {Object} data - { subject, description, category, orderId? }
 * @returns {Promise<Object>} - { ticketId, message: 'Ticket created successfully' }
 */
export async function createSupportTicket(data) {
  return apiRequest('/users/support/tickets', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * Get Support Tickets
 * GET /users/support/tickets
 * 
 * @param {Object} params - { status, limit, offset }
 * @returns {Promise<Object>} - { tickets: Array, total: number }
 */
export async function getSupportTickets(params = {}) {
  const queryParams = new URLSearchParams(params).toString()
  return apiRequest(`/users/support/tickets?${queryParams}`)
}

/**
 * Get Support Ticket Details
 * GET /users/support/tickets/:ticketId
 * 
 * @param {string} ticketId - Support ticket ID
 * @returns {Promise<Object>} - Ticket details with messages
 */
export async function getSupportTicketDetails(ticketId) {
  return apiRequest(`/users/support/tickets/${ticketId}`)
}

/**
 * Send Support Message
 * POST /users/support/tickets/:ticketId/messages
 * 
 * @param {string} ticketId - Support ticket ID
 * @param {Object} data - { message }
 * @returns {Promise<Object>} - { messageId, message: 'Message sent' }
 */
export async function sendSupportMessage(ticketId, data) {
  return apiRequest(`/users/support/tickets/${ticketId}/messages`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * Initiate Support Call
 * POST /users/support/call
 * 
 * @param {Object} data - { orderId?, issue }
 * @returns {Promise<Object>} - { callId, phoneNumber, message: 'Call initiated' }
 */
export async function initiateSupportCall(data) {
  return apiRequest('/users/support/call', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

// ============================================================================
// REAL-TIME UPDATES (WebSocket/SSE)
// ============================================================================

/**
 * Initialize Real-time Connection
 * This would typically use WebSocket or Server-Sent Events
 * For now, this is a placeholder for the implementation
 * 
 * @param {Function} onMessage - Callback for receiving messages
 * @returns {Function} - Cleanup function to close connection
 */
export function initializeRealtimeConnection(onMessage) {
  // This would be implemented with WebSocket or SSE
  // Example:
  // const ws = new WebSocket(`${WS_BASE_URL}/users/realtime`)
  // ws.onmessage = (event) => {
  //   const data = JSON.parse(event.data)
  //   onMessage(data)
  // }
  // return () => ws.close()

  // For now, return a no-op cleanup function
  return () => { }
}

/**
 * Handle Real-time Notification
 * Processes incoming real-time notifications (payment reminders, delivery updates, etc.)
 * 
 * @param {Object} notification - Notification data from real-time connection
 */
export function handleRealtimeNotification(notification) {
  // This would process different types of notifications:
  // - 'payment_reminder': When remaining payment is due
  // - 'delivery_update': When order status changes
  // - 'order_assigned': When order is assigned to user
  // - 'order_delivered': When order is delivered
  // - 'offer': When new offers are available
  // - 'announcement': When admin posts announcements

  return notification
}

