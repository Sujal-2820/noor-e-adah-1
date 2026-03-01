/**
 * User API Service
 * 
 * This file contains all API endpoints for the User dashboard.
 * All endpoints are backend-ready and will work once the backend is implemented.
 * 
 * Base URL should be configured in environment variables:
 * - Development: http://localhost:3000/api
 * - Production: https://api.nooreadah.com/api
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'

/**
 * API Response Handler
 */
async function handleResponse(response) {
  const data = await response.json().catch(() => ({
    success: false,
    error: { message: 'An error occurred' }
  }))

  if (!response.ok) {
    // Return error in same format as success response for consistent error handling
    const errorResponse = {
      success: false,
      error: {
        message: data.message || data.error?.message || `HTTP error! status: ${response.status}`,
        status: response.status,
      },
    }

    // If 401, also clear token
    if (response.status === 401) {
      localStorage.removeItem('user_token')
    }

    return errorResponse
  }

  return data
}

/**
 * API Request Helper
 */
async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('user_token') // User authentication token

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
// AUTHENTICATION APIs
// ============================================================================

/**
 * Request OTP for User
 * POST /users/auth/request-otp
 * 
 * @param {Object} data - { phone }
 * @returns {Promise<Object>} - { message: 'OTP sent successfully', expiresIn: 300 }
 */
export async function requestUserOTP(data) {
  return apiRequest('/users/auth/request-otp', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * Register User with OTP
 * POST /users/auth/register
 * 
 * @param {Object} data - Enhanced registration data
 * @returns {Promise<Object>} - { message, userId, requiresApproval, expiresIn }
 */
export async function registerUser(data) {
  return apiRequest('/users/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      // Personal Info
      firstName: data.firstName,
      lastName: data.lastName,
      name: `${data.firstName} ${data.lastName}`, // For backward compatibility
      email: data.email,
      phone: data.phone,
      agentName: data.agentName,

      // Business Info
      shopName: data.shopName,
      shopAddress: data.shopAddress,

      // KYC Numbers
      gstNumber: data.gstNumber,
      aadhaarNumber: data.aadhaarNumber,
      panNumber: data.panNumber,

      // Location
      location: data.location || {
        address: data.shopAddress || '', // Fallback to shop address
        city: data.location?.city || '',
        state: data.location?.state || '',
        pincode: data.location?.pincode || '',
        coordinates: data.location?.coordinates || data.coordinates || { lat: data.lat, lng: data.lng },
      },

      // Verification Documents
      aadhaarFront: data.aadhaarFront,
      aadhaarBack: data.aadhaarBack,
      businessLicense: data.businessLicense,
      identityVerification: data.identityVerification,
      partnerAgreement: data.partnerAgreement,

      // (Legacy support for documents)
      aadhaarCard: data.aadhaarFront || data.aadhaarCard,
      panCard: data.panCard,

      // Terms
      termsAccepted: data.termsAccepted,
      termsAcceptedAt: data.termsAccepted ? new Date().toISOString() : undefined,
    }),
  })
}

/**
 * Login User with OTP
 * POST /users/auth/verify-otp
 * 
 * @param {Object} data - { phone, otp }
 * @returns {Promise<Object>} - { token, user: { id, name, phone, location, coverageRadius } }
 */
export async function loginUserWithOtp(data) {
  return apiRequest('/users/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * User Login (Legacy - email/password)
 * POST /users/login
 * 
 * @param {Object} credentials - { email, password }
 * @returns {Promise<Object>} - { token, user: { id, name, email, phone, location, coverageRadius } }
 */
export async function loginUser(credentials) {
  // Simulate API call - replace with actual API call when backend is ready
  return new Promise((resolve) => {
    setTimeout(() => {
      if (credentials.email === 'user@example.com' && credentials.password === 'password') {
        resolve({
          success: true,
          data: {
            token: 'fake-user-token',
            user: {
              id: 'user-001',
              name: 'Suresh Patel',
              email: credentials.email,
              phone: '+91 9876543210',
              location: { lat: 19.2183, lng: 73.0822, address: 'Kolhapur, Maharashtra' },
              coverageRadius: 20,
            },
          },
        })
      } else {
        resolve({ success: false, error: { message: 'Invalid credentials' } })
      }
    }, 1000)
  })
}

/**
 * User Logout
 * POST /users/auth/logout
 * 
 * @returns {Promise<Object>} - { message: 'Logged out successfully' }
 */
export async function logoutUser() {
  return apiRequest('/users/auth/logout', {
    method: 'POST',
  })
}

export async function getUserProfile() {
  return apiRequest('/users/auth/profile')
}

export async function updateUserProfile(data) {
  return apiRequest('/users/auth/profile', {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

/**
 * Get public financial settings
 * GET /users/settings/financial
 */
export async function getFinancialSettings() {
  return apiRequest('/users/settings/financial')
}

// ============================================================================
// DASHBOARD & OVERVIEW APIs
// ============================================================================

/**
 * Get User Dashboard Overview
 * GET /users/dashboard
 * 
 * @returns {Promise<Object>} - {
 *   ordersToday: number,
 *   urgentStock: number,
 *   creditBalance: number,
 *   creditDue: string,
 *   recentActivity: Array,
 *   highlights: Array
 * }
 */
export async function fetchDashboardData() {
  return apiRequest('/users/dashboard')
}

// ============================================================================
// ORDERS APIs
// ============================================================================

/**
 * Get All Orders
 * GET /users/orders
 * 
 * @param {Object} params - { status, limit, offset, startDate, endDate }
 * @returns {Promise<Object>} - { orders: Array, total: number, stats: Object }
 */
export async function getOrders(params = {}) {
  const queryParams = new URLSearchParams(params).toString()
  return apiRequest(`/users/orders?${queryParams}`)
}

/**
 * Get Order Details
 * GET /users/orders/:orderId
 * 
 * IMPORTANT: The response should include item-level stock availability:
 * - Each order item should have: { itemId, productId, name, quantity, availableStock, status: 'in_stock' | 'out_of_stock' | 'insufficient' }
 * - This allows user to see which items they can fulfill and which need to be escalated
 * 
 * @param {string} orderId - Order ID
 * @returns {Promise<Object>} - { 
 *   order: {
 *     id: string,
 *     items: Array<{ itemId, productId, name, quantity, availableStock, status }>,
 *     farmer: string,
 *     value: string,
 *     payment: string,
 *     status: string
 *   }
 * }
 */
export async function getOrderDetails(orderId) {
  return apiRequest(`/users/orders/${orderId}`)
}

/**
 * Accept Order (Mark as Available)
 * POST /users/orders/:orderId/accept
 * 
 * @param {string} orderId - Order ID
 * @returns {Promise<Object>} - { message: 'Order accepted', order: Object }
 */
export async function acceptOrder(orderId, notes) {
  return apiRequest(`/users/orders/${orderId}/accept`, {
    method: 'POST',
    body: JSON.stringify({ notes }),
  })
}

/**
 * Confirm Order Acceptance (finalize after grace period)
 * POST /users/orders/:orderId/confirm-acceptance
 * 
 * @param {string} orderId - Order ID
 * @param {Object} data - { notes?: string }
 * @returns {Promise<Object>} - { message: 'Order acceptance confirmed', order: Object }
 */
export async function confirmOrderAcceptance(orderId, data = {}) {
  return apiRequest(`/users/orders/${orderId}/confirm-acceptance`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * Cancel Order Acceptance (during grace period)
 * POST /users/orders/:orderId/cancel-acceptance
 * 
 * @param {string} orderId - Order ID
 * @param {Object} data - { reason?: string }
 * @returns {Promise<Object>} - { message: 'Order acceptance cancelled', order: Object }
 */
export async function cancelOrderAcceptance(orderId, data = {}) {
  return apiRequest(`/users/orders/${orderId}/cancel-acceptance`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * Accept Order Partially (Accept some items, reject others)
 * POST /users/orders/:orderId/accept-partial
 * 
 * IMPORTANT: This API handles partial order fulfillment where:
 * - Items that user has in stock → User fulfills those items
 * - Items that user doesn't have (or insufficient quantity) → Escalated to Admin
 * 
 * @param {string} orderId - Order ID
 * @param {Object} partialData - {
 *   acceptedItems: Array<{ itemId: string, quantity: number }>, // Items user can fulfill
 *   rejectedItems: Array<{ itemId: string, quantity: number, reason?: string }>, // Items to escalate to Admin
 *   notes?: string
 * }
 * @returns {Promise<Object>} - { 
 *   message: 'Order partially accepted',
 *   userOrder: Object, // Order for user to fulfill
 *   adminOrder: Object, // Order escalated to admin
 *   order: Object // Original order with split status
 * }
 */
export async function acceptOrderPartially(orderId, partialData) {
  return apiRequest(`/users/orders/${orderId}/accept-partial`, {
    method: 'POST',
    body: JSON.stringify(partialData),
  })
}

/**
 * Reject Order (Mark as Not Available)
 * POST /users/orders/:orderId/reject
 * 
 * @param {string} orderId - Order ID
 * @param {Object} reasonData - { reason: string, notes?: string }
 * @returns {Promise<Object>} - { message: 'Order rejected', order: Object }
 */
export async function rejectOrder(orderId, reasonData) {
  return apiRequest(`/users/orders/${orderId}/reject`, {
    method: 'POST',
    body: JSON.stringify(reasonData),
  })
}

/**
 * Escalate Order with Partial Quantities (Scenario 3)
 * POST /users/orders/:orderId/escalate-partial
 * 
 * IMPORTANT: This API handles partial quantity escalation where:
 * - User has some quantity of an item but not enough
 * - User can accept partial quantity and escalate the rest
 * 
 * @param {string} orderId - Order ID
 * @param {Object} escalationData - {
 *   escalatedItems: Array<{ itemId: string, escalatedQuantity: number, reason?: string }>,
 *   reason: string,
 *   notes?: string
 * }
 * @returns {Promise<Object>} - { 
 *   message: 'Order partially escalated',
 *   userOrder: Object, // Order for user to fulfill
 *   escalatedOrder: Object, // Order escalated to admin
 * }
 */
export async function escalateOrderPartial(orderId, escalationData) {
  return apiRequest(`/users/orders/${orderId}/escalate-partial`, {
    method: 'POST',
    body: JSON.stringify(escalationData),
  })
}

/**
 * Update Order Status
 * PUT /users/orders/:orderId/status
 * 
 * IMPORTANT: This status update must be persisted and immediately reflected in the User Dashboard.
 * 
 * @param {string} orderId - Order ID
 * @param {Object} statusData - { status: 'awaiting' | 'dispatched' | 'delivered', notes?: string }
 * @returns {Promise<Object>} - { message: 'Status updated', order: Object with statusTimeline }
 */
export async function updateOrderStatus(orderId, statusData) {
  return apiRequest(`/users/orders/${orderId}/status`, {
    method: 'PUT',
    body: JSON.stringify(statusData),
  })
}

/**
 * Get Order Statistics
 * GET /users/orders/stats
 * 
 * @param {Object} params - { period: 'day' | 'week' | 'month' }
 * @returns {Promise<Object>} - { total, awaiting, processing, delivered, revenue }
 */
export async function getOrderStats(params = {}) {
  const queryParams = new URLSearchParams(params).toString()
  return apiRequest(`/users/orders/stats?${queryParams}`)
}

// ============================================================================
// PRODUCT APIs (For users to view and order products)

/**
 * Get All Products Available for Ordering
 * GET /users/products
 * 
 * @param {Object} params - Query parameters { page, limit, category, search, sortBy, sortOrder }
 * @returns {Promise<Object>} - { products: Array, pagination: Object }
 */
export async function getProducts(params = {}) {
  const queryParams = new URLSearchParams(params).toString()
  return apiRequest(`/users/products?${queryParams}`)
}

/**
 * Get Product Details
 * GET /users/products/:productId
 * 
 * @param {string} productId - Product ID
 * @returns {Promise<Object>} - Detailed product information
 */
export async function getProductDetails(productId) {
  return apiRequest(`/users/products/${productId}`)
}

// INVENTORY APIs
// ============================================================================

/**
 * Get All Inventory Items
 * GET /users/inventory
 * 
 * @param {Object} params - { status, search, limit, offset }
 * @returns {Promise<Object>} - { items: Array, total: number, stats: Object }
 */
export async function getInventory(params = {}) {
  const queryParams = new URLSearchParams(params).toString()
  return apiRequest(`/users/inventory?${queryParams}`)
}

/**
 * Get Inventory Item Details
 * GET /users/inventory/:itemId
 * 
 * @param {string} itemId - Inventory item ID
 * @returns {Promise<Object>} - Detailed inventory item information
 */
export async function getInventoryItemDetails(itemId) {
  return apiRequest(`/users/inventory/${itemId}`)
}

/**
 * Update Inventory Stock
 * PUT /users/inventory/:itemId/stock
 * 
 * @param {string} itemId - Inventory item ID
 * @param {Object} stockData - { quantity: number, notes?: string }
 * @returns {Promise<Object>} - { message: 'Stock updated', item: Object }
 */
export async function updateInventoryStock(itemId, stockData) {
  return apiRequest(`/users/inventory/${itemId}/stock`, {
    method: 'PUT',
    body: JSON.stringify(stockData),
  })
}

/**
 * Get Inventory Statistics
 * GET /users/inventory/stats
 * 
 * @returns {Promise<Object>} - { totalItems, lowStock, criticalStock, healthyStock, totalValue }
 */
export async function getInventoryStats() {
  return apiRequest('/users/inventory/stats')
}

// ============================================================================
// REPORTS & ANALYTICS APIs
// ============================================================================

// ============================================================================
// REPORTS & ANALYTICS APIs
// ============================================================================

/**
 * Get Reports Data
 * GET /users/reports
 * 
 * @param {Object} params - { period: 'day' | 'week' | 'month' | 'year', type: 'revenue' | 'performance' | 'trends' }
 * @returns {Promise<Object>} - Reports data based on type
 */
export async function getReports(params = {}) {
  const queryParams = new URLSearchParams(params).toString()
  return apiRequest(`/users/reports?${queryParams}`)
}

/**
 * Get Performance Analytics
 * GET /users/reports/analytics
 * 
 * @param {Object} params - { period: 'week' | 'month' | 'year' }
 * @returns {Promise<Object>} - Performance metrics and charts data
 */
export async function getPerformanceAnalytics(params = {}) {
  const queryParams = new URLSearchParams(params).toString()
  return apiRequest(`/users/reports/analytics?${queryParams}`)
}

/**
 * Get Region Analytics (20km coverage)
 * Note: This endpoint may not exist in backend. Check getPerformanceAnalytics or getReports instead.
 * GET /users/reports/region
 * 
 * @returns {Promise<Object>} - Region-wise order and revenue analytics
 */
export async function getRegionAnalytics() {
  // Try reports endpoint which might include region data
  return apiRequest('/users/reports?type=region').catch(() => {
    // Fallback to performance analytics if region endpoint doesn't exist
    return apiRequest('/users/reports/analytics?period=month')
  })
}

// ============================================================================
// EARNINGS APIs
// ============================================================================

/**
 * Get User Earnings Summary
 * GET /users/earnings
 * 
 * @returns {Promise<Object>} - { totalEarnings, availableBalance, pendingWithdrawal, thisMonthEarnings, lastWithdrawalDate }
 */
export async function getEarningsSummary() {
  return apiRequest('/users/earnings')
}

/**
 * Get User Earnings History
 * GET /users/earnings/history
 * 
 * @param {Object} params - { page, limit, startDate, endDate, status }
 * @returns {Promise<Object>} - { earnings: Array, pagination: Object }
 */
export async function getEarningsHistory(params = {}) {
  const queryParams = new URLSearchParams(params).toString()
  return apiRequest(`/users/earnings/history?${queryParams}`)
}

/**
 * Get User Earnings by Orders
 * GET /users/earnings/orders
 * 
 * @param {Object} params - { page, limit }
 * @returns {Promise<Object>} - { earningsByOrder: Array, pagination: Object }
 */
export async function getEarningsByOrders(params = {}) {
  const queryParams = new URLSearchParams(params).toString()
  return apiRequest(`/users/earnings/orders?${queryParams}`)
}

/**
 * Get User Available Balance
 * GET /users/balance
 * 
 * @returns {Promise<Object>} - { totalEarnings, availableBalance, pendingWithdrawal }
 */
export async function getBalance() {
  return apiRequest('/users/balance')
}

// ============================================================================
// WITHDRAWAL REQUEST APIs
// ============================================================================

/**
 * Request Withdrawal from Earnings
 * POST /users/withdrawals/request
 * 
 * @param {Object} data - { amount, bankAccountId }
 * @returns {Promise<Object>} - { withdrawal: Object, message: string }
 */
export async function requestWithdrawal(data) {
  return apiRequest('/users/withdrawals/request', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * Request Stock Purchase
 * POST /users/stock-purchases/request
 */
export async function requestStockPurchase(data) {
  return apiRequest('/users/stock-purchases/request', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * Get User Stock Purchases
 * GET /users/stock-purchases
 */
export async function getStockPurchases(params = {}) {
  const queryParams = new URLSearchParams(params).toString()
  return apiRequest(`/users/stock-purchases?${queryParams}`)
}

/**
 * Get Stock Purchase Details
 * GET /users/stock-purchases/:purchaseId
 */
export async function getStockPurchaseDetails(purchaseId) {
  return apiRequest(`/users/stock-purchases/${purchaseId}`)
}

/**
 * Get User Withdrawal Requests
 * GET /users/withdrawals
 * 
 * @param {Object} params - { page, limit, status }
 * @returns {Promise<Object>} - { withdrawals: Array, pagination: Object }
 */
export async function getWithdrawals(params = {}) {
  const queryParams = new URLSearchParams(params).toString()
  return apiRequest(`/users/withdrawals?${queryParams}`)
}

// ============================================================================
// BANK ACCOUNT APIs
// ============================================================================

/**
 * Add Bank Account
 * POST /users/bank-accounts
 * 
 * @param {Object} data - { accountHolderName, accountNumber, ifscCode, bankName, branchName, isPrimary }
 * @returns {Promise<Object>} - { bankAccount: Object, message: string }
 */
export async function addBankAccount(data) {
  return apiRequest('/users/bank-accounts', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * Get User Bank Accounts
 * GET /users/bank-accounts
 * 
 * @returns {Promise<Object>} - { bankAccounts: Array }
 */
export async function getBankAccounts() {
  return apiRequest('/users/bank-accounts')
}

/**
 * Update Bank Account
 * PUT /users/bank-accounts/:accountId
 * 
 * @param {string} accountId - Bank account ID
 * @param {Object} data - { accountHolderName, accountNumber, ifscCode, bankName, branchName, isPrimary }
 * @returns {Promise<Object>} - { bankAccount: Object, message: string }
 */
export async function updateBankAccount(accountId, data) {
  return apiRequest(`/users/bank-accounts/${accountId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

/**
 * Delete Bank Account
 * DELETE /users/bank-accounts/:accountId
 * 
 * @param {string} accountId - Bank account ID
 * @returns {Promise<Object>} - { message: string }
 */
export async function deleteBankAccount(accountId) {
  return apiRequest(`/users/bank-accounts/${accountId}`, {
    method: 'DELETE',
  })
}

// ============================================================================
// NOTIFICATIONS
// ============================================================================

/**
 * Get User Notifications
 * GET /users/notifications
 * 
 * @param {Object} params - { page, limit, read, type }
 * @returns {Promise<Object>} - { notifications: Array, pagination: Object, unreadCount: number }
 */
export async function getNotifications(params = {}) {
  const queryParams = new URLSearchParams()
  if (params.page) queryParams.append('page', params.page)
  if (params.limit) queryParams.append('limit', params.limit)
  if (params.read !== undefined) queryParams.append('read', params.read)
  if (params.type) queryParams.append('type', params.type)
  if (params.priority) queryParams.append('priority', params.priority)

  const query = queryParams.toString() ? `?${queryParams.toString()}` : ''
  return apiRequest(`/users/notifications${query}`)
}

/**
 * Mark Notification as Read
 * PATCH /users/notifications/:notificationId/read
 * 
 * @param {string} notificationId - Notification ID
 * @returns {Promise<Object>} - { notification: Object }
 */
export async function markNotificationAsRead(notificationId) {
  return apiRequest(`/users/notifications/${notificationId}/read`, {
    method: 'PATCH',
  })
}

/**
 * Mark All Notifications as Read
 * PATCH /users/notifications/read-all
 * 
 * @returns {Promise<Object>} - { updatedCount: number }
 */
export async function markAllNotificationsAsRead() {
  return apiRequest('/users/notifications/read-all', {
    method: 'PATCH',
  })
}

/**
 * Delete Notification
 * DELETE /users/notifications/:notificationId
 * 
 * @param {string} notificationId - Notification ID
 * @returns {Promise<Object>} - { message: string }
 */
export async function deleteNotification(notificationId) {
  return apiRequest(`/users/notifications/${notificationId}`, {
    method: 'DELETE',
  })
}

/**
 * Handle Real-time Notification
 * Processes incoming notifications and dispatches appropriate actions
 * 
 * @param {Object} notification - Notification object
 * @param {Function} dispatch - Context dispatch function
 * @param {Function} showToast - Toast notification function
 */
export function handleRealtimeNotification(notification, dispatch, showToast) {
  switch (notification.type) {
    case 'order_assigned':
      dispatch({ type: 'ADD_NOTIFICATION', payload: notification })
      dispatch({ type: 'SET_ORDERS_UPDATED', payload: true })
      showToast(notification.message, 'info')
      break

    case 'order_status_changed':
      dispatch({ type: 'UPDATE_ORDER_STATUS', payload: notification.data })
      dispatch({ type: 'ADD_NOTIFICATION', payload: notification })
      showToast(notification.message, 'info')
      break

    case 'stock_purchase_approved':
      dispatch({ type: 'ADD_NOTIFICATION', payload: notification })
      showToast(notification.message, 'success')
      break

    case 'stock_purchase_rejected':
      dispatch({ type: 'ADD_NOTIFICATION', payload: notification })
      showToast(notification.message, 'error')
      break

    case 'inventory_low_alert':
      dispatch({ type: 'ADD_NOTIFICATION', payload: notification })
      dispatch({ type: 'SET_INVENTORY_UPDATED', payload: true })
      showToast(notification.message, 'warning')
      break

    case 'admin_announcement':
      dispatch({ type: 'ADD_NOTIFICATION', payload: notification })
      showToast(notification.message, 'info')
      break

    default:
      dispatch({ type: 'ADD_NOTIFICATION', payload: notification })
      break
  }
}


// ============================================================================
// NEW REPAYMENT SYSTEM APIs (Phase 3)
// ============================================================================


