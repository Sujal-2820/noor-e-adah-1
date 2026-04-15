/**
 * Admin API Service
 * 
 * This file contains all API endpoints for the Admin dashboard.
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
  if (!response.ok) {
    const error = await response.json().catch(() => ({
      success: false,
      message: `HTTP error! status: ${response.status}`
    }))
    const errorObj = {
      success: false,
      error: {
        message: error.message || error.error?.message || `HTTP error! status: ${response.status}`,
        status: response.status,
        ...error
      }
    }
    return errorObj
  }
  return response.json()
}

/**
 * API Request Helper
 */
async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('admin_token')

  const headers = {
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  }

  // Only set application/json if not FormData body
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }

  const config = {
    ...options,
    headers,
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config)
    return handleResponse(response)
  } catch (error) {
    return {
      success: false,
      error: {
        message: error.message || 'An error occurred',
        status: 500,
      }
    }
  }
}

/**
 * Upload Product Video
 * @param {string} productId 
 * @param {File} videoFile 
 */
export async function uploadProductVideo(productId, videoFile) {
  const formData = new FormData()
  formData.append('video', videoFile)

  return apiRequest(`/admin/products/${productId}/video`, {
    method: 'POST',
    body: formData,
  })
}

/**
 * Delete Product Video
 * @param {string} productId 
 */
export async function deleteProductVideo(productId) {
  return apiRequest(`/admin/products/${productId}/video`, {
    method: 'DELETE',
  })
}

// ============================================================================
// DELIVERY SETTINGS APIs
// ============================================================================

/**
 * Get Delivery Settings (charge + time config)
 * GET /admin/settings/delivery
 *
 * @returns {Promise<Object>} - { mode, domestic: { charge, timeLabel, ... }, international: { ... } }
 */
export async function getDeliverySettings() {
  return apiRequest('/admin/settings/delivery')
}

/**
 * Update Delivery Settings
 * PUT /admin/settings/delivery
 *
 * @param {Object} settings - { mode?, domestic?: { charge?, timeLabel?, minFreeDelivery?, isEnabled? }, international?: { ... } }
 * @returns {Promise<Object>} - Updated delivery config
 */
export async function updateDeliverySettings(settings) {
  return apiRequest('/admin/settings/delivery', {
    method: 'PUT',
    body: JSON.stringify(settings),
  })
}

// ============================================================================
// AUTHENTICATION APIs
// ============================================================================


/**
 * Admin Login (Step 1: Phone only)
 * POST /admin/auth/login
 * 
 * @param {Object} credentials - { phone }
 * @returns {Promise<Object>} - { requiresOtp: true, message: 'OTP sent to phone' }
 */
export async function loginAdmin(credentials) {
  return apiRequest('/admin/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  })
}

/**
 * Request OTP for Admin
 * POST /admin/auth/request-otp
 * 
 * @param {Object} data - { phone }
 * @returns {Promise<Object>} - { message: 'OTP sent successfully', expiresIn: 300 }
 */
export async function requestAdminOTP(data) {
  return apiRequest('/admin/auth/request-otp', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * Verify Admin OTP and Complete Login
 * POST /admin/auth/verify-otp
 * 
 * @param {Object} data - { phone, otp }
 * @returns {Promise<Object>} - { token, admin: { id, name, phone, role } }
 */
export async function verifyAdminOTP(data) {
  return apiRequest('/admin/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * Admin Logout
 * POST /admin/auth/logout
 * 
 * @returns {Promise<Object>} - { message: 'Logged out successfully' }
 */
export async function logoutAdmin() {
  return apiRequest('/admin/auth/logout', {
    method: 'POST',
  })
}

/**
 * Get Admin Profile
 * GET /admin/auth/profile
 * 
 * @returns {Promise<Object>} - Admin profile data
 */
export async function getAdminProfile() {
  return apiRequest('/admin/auth/profile')
}

/**
 * Get all admins (limited data for filtering)
 * GET /admin/admins
 * 
 * @param {Object} params - { page, limit, search }
 * @returns {Promise<Object>}
 */
export async function getAdmins(params = {}) {
  const queryParams = new URLSearchParams()
  if (params.page) queryParams.append('page', params.page)
  if (params.limit) queryParams.append('limit', params.limit)
  if (params.search) queryParams.append('search', params.search)

  const queryString = queryParams.toString()
  return apiRequest(`/admin/admins${queryString ? `?${queryString}` : ''}`)
}

// ============================================================================
// DASHBOARD APIs
// ============================================================================

/**
 * Format number with commas
 */
function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

/**
 * Format currency (INR)
 */
function formatCurrency(amount) {
  if (amount >= 10000000) {
    // Crores
    return `₹${(amount / 10000000).toFixed(1)} Cr`
  } else if (amount >= 100000) {
    // Lakhs
    return `₹${(amount / 100000).toFixed(1)} L`
  } else if (amount >= 1000) {
    // Thousands
    return `₹${(amount / 1000).toFixed(1)}K`
  }
  return `₹${formatNumber(Math.round(amount))}`
}

/**
 * Transform backend dashboard data to frontend format
 */
function transformDashboardData(backendData) {
  const { overview, summary } = backendData

  // Calculate trends (simplified - using placeholder for now since backend doesn't provide historical data)
  const headline = [
    {
      id: 'users',
      title: 'Total Users',
      value: formatNumber(overview.users.total),
      subtitle: `${formatNumber(overview.users.active)} active`,
      trend: {
        direction: 'up',
        value: '+0',
        message: 'No historical data available',
      },
    },
    {
      id: 'users',
      title: 'Verified Users',
      value: formatNumber(overview.users.approved),
      subtitle: `${formatNumber(overview.users.pending)} pending approvals`,
      trend: {
        direction: overview.users.pending > 0 ? 'warning' : 'up',
        value: overview.users.pending > 0 ? `${overview.users.pending} pending` : 'All approved',
        message: 'user approval status',
      },
    },
    {
      id: 'orders',
      title: 'Orders (User + User)',
      value: formatNumber(overview.orders.total),
      subtitle: `${formatNumber(overview.orders.pending)} pending`,
      trend: {
        direction: overview.orders.pending > 0 ? 'warning' : 'success',
        value: `${formatNumber(overview.orders.delivered)} delivered`,
        message: 'order status overview',
      },
    },
    {
      id: 'revenue',
      title: 'Gross Revenue',
      value: formatCurrency(overview.finance.revenue),
      subtitle: `Avg order: ${formatCurrency(overview.finance.averageOrderValue || 0)}`,
      trend: {
        direction: 'up',
        value: formatCurrency(overview.finance.revenueLast7Days || 0),
        message: 'last 7 days revenue',
      },
    }
  ]

  return {
    headline,
  }
}

/**
 * Get Dashboard Overview
 * GET /admin/dashboard
 * 
 * @param {Object} params - { period: 'day' | 'week' | 'month', region?: string }
 * @returns {Promise<Object>} - {
 *   headline: Array<{ id, title, value, subtitle, trend }>,
 *   recentActivity: Array
 * }
 */
export async function getDashboardData(params = {}) {
  try {
    const queryParams = new URLSearchParams(params).toString()
    const response = await apiRequest(`/admin/dashboard?${queryParams}`)

    // Transform backend response to frontend format
    if (response.success && response.data) {
      return {
        success: true,
        data: transformDashboardData(response.data),
      }
    }

    return response
  } catch (error) {
    throw error
  }
}

// ============================================================================
// PRODUCT MANAGEMENT APIs
// ============================================================================

/**
 * Transform backend product to frontend format
 */
function transformProduct(backendProduct) {
  // Compute effective price after discount
  const basePrice = backendProduct.publicPrice || backendProduct.priceToUser || 0
  const discount = backendProduct.discountPublic || 0
  const effectivePrice = discount > 0
    ? Math.round(basePrice * (1 - discount / 100))
    : basePrice

  return {
    // Spread raw backend data first so explicit mappings below take priority
    ...backendProduct,
    id: backendProduct._id?.toString() || backendProduct.id,
    name: backendProduct.name,
    description: backendProduct.description,
    category: backendProduct.category,
    stock: backendProduct.stock || 0,
    actualStock: backendProduct.actualStock !== undefined ? backendProduct.actualStock : (backendProduct.stock || 0),
    displayStock: backendProduct.displayStock !== undefined ? backendProduct.displayStock : (backendProduct.stock || 0),
    stockUnit: backendProduct.weight?.unit || backendProduct.stockUnit || 'kg',
    // Effective price shown to users = publicPrice after discountPublic (%) is applied
    userPrice: effectivePrice,
    expiry: backendProduct.expiry ? new Date(backendProduct.expiry).toISOString().split('T')[0] : null,
    visibility: backendProduct.isActive !== false ? 'active' : 'inactive',
    batchNumber: backendProduct.batchNumber || '',
    images: backendProduct.images || [],
    sku: backendProduct.sku,
    brand: backendProduct.brand,
    tags: backendProduct.tags || [],
    specifications: backendProduct.specifications,
  }
}



/**
 * Get All Products
 * GET /admin/products
 * 
 * @param {Object} params - { page, limit, category, isActive, search, sortBy, sortOrder, region, status }
 * @returns {Promise<Object>} - { products: Array, total: number, pagination?: Object }
 */
export async function getProducts(params = {}) {
  try {
    // Convert frontend params to backend query params
    const queryParams = new URLSearchParams()

    if (params.page) queryParams.append('page', params.page)
    if (params.limit) queryParams.append('limit', params.limit)
    if (params.category) queryParams.append('category', params.category)
    if (params.collection) queryParams.append('collection', params.collection)
    if (params.look) queryParams.append('look', params.look)
    if (params.theme) queryParams.append('theme', params.theme)
    if (params.status || params.isActive !== undefined) {
      // Frontend uses 'status' (active/inactive), backend uses 'isActive' (true/false)
      const isActive = params.isActive !== undefined
        ? params.isActive
        : (params.status === 'active' ? true : params.status === 'inactive' ? false : undefined)
      if (isActive !== undefined) queryParams.append('isActive', isActive.toString())
    }
    if (params.search) queryParams.append('search', params.search)
    if (params.sortBy) queryParams.append('sortBy', params.sortBy)
    if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder)
    if (params.offset) {
      // Convert offset to page
      const page = Math.floor((params.offset / (params.limit || 20)) + 1)
      queryParams.append('page', page.toString())
    }

    const queryString = queryParams.toString()
    const response = await apiRequest(`/admin/products${queryString ? `?${queryString}` : ''}`)

    // Transform backend response to frontend format
    if (response.success && response.data) {
      const transformedProducts = response.data.products.map(transformProduct)
      return {
        success: true,
        data: {
          products: transformedProducts,
          total: response.data.pagination?.totalItems || response.data.products.length,
          pagination: response.data.pagination, // Keep pagination object for future use
        },
      }
    }

    return response
  } catch (error) {
    throw error
  }
}

/**
 * Get Product Details
 * GET /admin/products/:productId
 * 
 * @param {string} productId - Product ID
 * @returns {Promise<Object>} - { product: Object, assignments: Array }
 */
export async function getProductDetails(productId) {
  const response = await apiRequest(`/admin/products/${productId}`)

  // Transform backend response to frontend format
  if (response.success && response.data) {
    return {
      success: true,
      data: {
        product: transformProduct(response.data.product),
        assignments: response.data.assignments || [],
      },
    }
  }

  return response
}

/**
 * Transform frontend product data to backend format
 * Maps all ProductForm fields to the correct backend field names.
 */
function transformProductForBackend(frontendData) {
  // ── Pricing ───────────────────────────────────────────────────────────────
  const parsePrice = (v) => (v !== undefined && v !== '' && v !== null ? parseFloat(v) || 0 : undefined)
  const parseStockValue = (v) => {
    if (v === '' || v === null || v === undefined) return 0
    const n = parseFloat(v)
    return isNaN(n) ? 0 : n
  }

  const backendData = {}

  // ── Core text fields ──────────────────────────────────────────────────────
  if (frontendData.name !== undefined) backendData.name = frontendData.name
  if (frontendData.description !== undefined) backendData.description = frontendData.description
  if (frontendData.shortDescription !== undefined) backendData.shortDescription = frontendData.shortDescription
  if (frontendData.longDescription !== undefined) backendData.longDescription = frontendData.longDescription
  else if (frontendData.description !== undefined) backendData.longDescription = frontendData.description
  if (frontendData.additionalInformation !== undefined) backendData.additionalInformation = frontendData.additionalInformation
  if (frontendData.shippingPolicy !== undefined) backendData.shippingPolicy = frontendData.shippingPolicy
  if (frontendData.faqs !== undefined) backendData.faqs = frontendData.faqs

  // ── Taxonomy (ObjectId refs — send as-is, backend resolves) ─────────────
  if (frontendData.category !== undefined) backendData.category = frontendData.category
  if (frontendData.look !== undefined) backendData.look = frontendData.look || null
  if (frontendData.theme !== undefined) backendData.theme = frontendData.theme || null
  if (frontendData.collection !== undefined) backendData.collection = frontendData.collection || null

  // ── Pricing (Noor E Adah schema fields) ──────────────────────────────────
  if (frontendData.publicPrice !== undefined) backendData.publicPrice = parsePrice(frontendData.publicPrice) ?? 0
  if (frontendData.wholesalePrice !== undefined) backendData.wholesalePrice = parsePrice(frontendData.wholesalePrice) ?? 0
  if (frontendData.discountPublic !== undefined) backendData.discountPublic = parsePrice(frontendData.discountPublic) ?? 0

  // ── Visibility / active state ─────────────────────────────────────────────
  if (frontendData.isActive !== undefined) {
    backendData.isActive = frontendData.isActive
  } else if (frontendData.visibility !== undefined) {
    backendData.isActive = frontendData.visibility === 'active' || frontendData.visibility === 'Active'
  }
  if (frontendData.showStock !== undefined) backendData.showStock = frontendData.showStock

  // ── Stock ─────────────────────────────────────────────────────────────────
  if (frontendData.actualStock !== undefined) backendData.actualStock = parseStockValue(frontendData.actualStock)
  if (frontendData.displayStock !== undefined) {
    backendData.displayStock = parseStockValue(frontendData.displayStock)
    backendData.stock = backendData.displayStock
  } else if (frontendData.stock !== undefined) {
    backendData.stock = parseStockValue(frontendData.stock)
    if (backendData.displayStock === undefined) backendData.displayStock = backendData.stock
    if (backendData.actualStock === undefined) backendData.actualStock = backendData.stock
  }

  // ── Size variants (fashion) ───────────────────────────────────────────────
  if (Array.isArray(frontendData.sizes)) backendData.sizes = frontendData.sizes

  // ── Size chart and related products ──────────────────────────────────────
  if (frontendData.sizeChart !== undefined) backendData.sizeChart = frontendData.sizeChart
  if (Array.isArray(frontendData.relatedProducts)) backendData.relatedProducts = frontendData.relatedProducts

  // ── Tags, brand, SKU, misc ────────────────────────────────────────────────
  if (Array.isArray(frontendData.tags)) backendData.tags = frontendData.tags
  if (frontendData.brand !== undefined) backendData.brand = frontendData.brand
  if (frontendData.sku) backendData.sku = frontendData.sku.toUpperCase()
  if (frontendData.batchNumber) backendData.batchNumber = frontendData.batchNumber.trim()
  if (frontendData.expiry) backendData.expiry = frontendData.expiry
  if (frontendData.specifications) backendData.specifications = frontendData.specifications
  if (Array.isArray(frontendData.occasions)) backendData.occasions = frontendData.occasions

  // ── Images ────────────────────────────────────────────────────────────────
  if (Array.isArray(frontendData.images)) backendData.images = frontendData.images

  // ── Legacy attribute stocks ───────────────────────────────────────────────
  if (Array.isArray(frontendData.attributeStocks) && frontendData.attributeStocks.length > 0) {
    backendData.attributeStocks = frontendData.attributeStocks
  }

  // ── Stock unit → weight ───────────────────────────────────────────────────
  if (frontendData.stockUnit) {
    backendData.stockUnit = frontendData.stockUnit
    backendData.weight = { value: backendData.actualStock || 0, unit: frontendData.stockUnit }
  }

  return backendData
}


/**
 * Create Product
 * POST /admin/products
 * 
 * @param {Object} productData - {
 *   name: string,
 *   userPrice: number,
 *   userPrice: number,
 *   stock: number,
 *   stockUnit: string,
 *   expiry: string,
 *   visibility: 'active' | 'inactive'
 * }
 * @returns {Promise<Object>} - { product: Object, message: string }
 */
export async function createProduct(productData) {
  const backendData = transformProductForBackend(productData)
  const response = await apiRequest('/admin/products', {
    method: 'POST',
    body: JSON.stringify(backendData),
  })

  // Transform backend response to frontend format
  if (response.success && response.data?.product) {
    return {
      success: true,
      data: {
        product: transformProduct(response.data.product),
        message: response.data.message || 'Product created successfully',
      },
    }
  }

  return response
}

/**
 * Update Product
 * PUT /admin/products/:productId
 * 
 * @param {string} productId - Product ID
 * @param {Object} productData - Product data to update
 * @returns {Promise<Object>} - { product: Object, message: string }
 */
export async function updateProduct(productId, productData) {
  const backendData = transformProductForBackend(productData)
  const response = await apiRequest(`/admin/products/${productId}`, {
    method: 'PUT',
    body: JSON.stringify(backendData),
  })

  // Transform backend response to frontend format
  if (response.success && response.data?.product) {
    return {
      success: true,
      data: {
        product: transformProduct(response.data.product),
        message: response.data.message || 'Product updated successfully',
      },
    }
  }

  return response
}

/**
 * Delete Product
 * DELETE /admin/products/:productId
 * 
 * @param {string} productId - Product ID
 * @returns {Promise<Object>} - { message: string }
 */
export async function deleteProduct(productId) {
  return apiRequest(`/admin/products/${productId}`, {
    method: 'DELETE',
  })
}

/**
 * Assign Product to User
 * POST /admin/products/:productId/assign
 * 
 * @param {string} productId - Product ID
 * @param {Object} assignmentData - { userId: string, region: string, quantity?: number, notes?: string }
 * @returns {Promise<Object>} - { message: string, assignment: Object }
 */
export async function assignProductToUser(productId, assignmentData) {
  // Backend expects: userId, region, notes (quantity is not used yet in backend)
  const backendData = {
    userId: assignmentData.userId,
    region: assignmentData.region,
    notes: assignmentData.notes || assignmentData.quantity ? `Quantity: ${assignmentData.quantity}` : undefined,
  }

  return apiRequest(`/admin/products/${productId}/assign`, {
    method: 'POST',
    body: JSON.stringify(backendData),
  })
}

/**
 * Toggle Product Visibility
 * PUT /admin/products/:productId/visibility
 * 
 * Note: Backend automatically toggles isActive regardless of request body
 * Frontend sends visibility for reference, but backend will toggle current state
 * 
 * @param {string} productId - Product ID
 * @param {Object} visibilityData - { visibility: 'active' | 'inactive' } (for reference, backend toggles)
 * @returns {Promise<Object>} - { product: Object, message: string }
 */
export async function toggleProductVisibility(productId, visibilityData) {
  // Backend toggles isActive automatically, but we send empty body or visibility for consistency
  const response = await apiRequest(`/admin/products/${productId}/visibility`, {
    method: 'PUT',
    body: JSON.stringify({}), // Backend doesn't use body, but sending empty object for consistency
  })

  // Transform backend response to frontend format
  if (response.success && response.data?.product) {
    return {
      success: true,
      data: {
        product: transformProduct(response.data.product),
        message: response.data.message || 'Product visibility updated successfully',
      },
    }
  }

  return response
}

// ============================================================================
// CATEGORY MANAGEMENT APIs
// ============================================================================

/**
 * Get All Categories for Admin
 * GET /admin/categories
 * 
 * @returns {Promise<Object>} - { success: true, data: Array<Category> }
 */
export async function getAdminCategories() {
  const response = await apiRequest('/admin/categories', {
    method: 'GET',
  })

  if (response.success) {
    return {
      success: true,
      data: response.data?.categories || response.data || [],
      grouped: response.grouped || {},        // { category:[], look:[], theme:[], collection:[] }
      types: response.types || [],
    }
  }

  return response
}


// ============================================================================
// VENDOR MANAGEMENT APIs
// ============================================================================

/**
 * Transform backend user to frontend format
 */
function transformUser(backendUser) {
  return {
    id: backendUser._id?.toString() || backendUser.id,
    name: backendUser.name,
    phone: backendUser.phone,
    email: backendUser.email,
    region: backendUser.location?.state || backendUser.location?.city || 'Unknown',
    location: {
      lat: backendUser.location?.coordinates?.lat,
      lng: backendUser.location?.coordinates?.lng,
      address: backendUser.location?.address,
      city: backendUser.location?.city,
      state: backendUser.location?.state,
      pincode: backendUser.location?.pincode,
    },
    coverageRadius: backendUser.location?.coverageRadius || 20,
    status: backendUser.status || 'pending',
    isActive: backendUser.isActive || false,
    status: backendUser.status || 'pending',
    isActive: backendUser.isActive || false,
    approvedAt: backendUser.approvedAt,
    approvedBy: backendUser.approvedBy,
    // Keep all original fields for reference
    ...backendUser,
  }
}

/**
 * Get All Users
 * GET /admin/users
 * 
 * @param {Object} params - { page, limit, status, isActive, search, sortBy, sortOrder, region, offset }
 * @returns {Promise<Object>} - { users: Array, total: number, pagination?: Object }
 */
export async function getUsers(params = {}) {
  try {
    // Convert frontend params to backend query params
    const queryParams = new URLSearchParams()

    if (params.page) queryParams.append('page', params.page)
    if (params.limit) queryParams.append('limit', params.limit)
    if (params.status) queryParams.append('status', params.status)
    if (params.isActive !== undefined) queryParams.append('isActive', params.isActive.toString())
    if (params.search) queryParams.append('search', params.search)
    if (params.sortBy) queryParams.append('sortBy', params.sortBy)
    if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder)
    if (params.offset) {
      // Convert offset to page
      const page = Math.floor((params.offset / (params.limit || 20)) + 1)
      queryParams.append('page', page.toString())
    }

    const queryString = queryParams.toString()
    const response = await apiRequest(`/admin/users${queryString ? `?${queryString}` : ''}`)

    // Transform backend response to frontend format
    if (response.success && response.data) {
      const transformedUsers = response.data.users.map(transformUser)
      return {
        success: true,
        data: {
          users: transformedUsers,
          total: response.data.pagination?.totalItems || response.data.users.length,
          pagination: response.data.pagination, // Keep pagination object for future use
        },
      }
    }

    return response
  } catch (error) {
    throw error
  }
}

/**
 * Get User Rankings
 * GET /admin/users/rankings
 */
export async function getUserRankings(params) {
  const queryString = new URLSearchParams(params).toString()
  return apiRequest(`/admin/users/rankings?${queryString}`)
}

/**
 * Get User Details
 * GET /admin/users/:userId
 * 
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - { user: Object, purchases: Array, assignments: Array }
 */
export async function getUserDetails(userId) {
  const response = await apiRequest(`/admin/users/${userId}`)

  // Transform backend response to frontend format
  if (response.success && response.data) {
    return {
      success: true,
      data: {
        user: transformUser(response.data.user),
        purchases: response.data.purchases || [],
        assignments: response.data.assignments || [],
      },
    }
  }

  return response
}

/**
 * Approve User Application
 * POST /admin/users/:userId/approve
 * 
 * Note: Backend automatically approves user and performs 20km radius check
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - { user: Object, message: string }
 */
export async function approveUser(userId, approvalData) {
  const response = await apiRequest(`/admin/users/${userId}/approve`, {
    method: 'POST',
    body: JSON.stringify({}), // Backend doesn't use body for approval
  })

  // Transform backend response to frontend format
  if (response.success && response.data?.user) {
    return {
      success: true,
      data: {
        user: transformUser(response.data.user),
        message: response.data.message || 'User approved successfully',
      },
    }
  }

  return response
}

/**
 * Reject User Application
 * POST /admin/users/:userId/reject
 * 
 * @param {string} userId - User ID
 * @param {Object} rejectionData - { reason?: string }
 * @returns {Promise<Object>} - { user: Object, message: string }
 */
export async function rejectUser(userId, rejectionData) {
  const response = await apiRequest(`/admin/users/${userId}/reject`, {
    method: 'POST',
    body: JSON.stringify(rejectionData || {}),
  })

  // Transform backend response to frontend format
  if (response.success && response.data?.user) {
    return {
      success: true,
      data: {
        user: transformUser(response.data.user),
        message: response.data.message || 'User application rejected',
      },
    }
  }

  return response
}


/**
 * Update User Basic Information
 * PUT /admin/users/:userId
 * 
 * This endpoint updates user information in the database.
 * Backend should persist: name, phone, email, and location (address, city, state, pincode, coordinates).
 * 
 * @param {string} userId - User ID
 * @param {Object} userData - { name?: string, phone?: string, email?: string, location?: Object }
 * @param {Object} userData.location - { address: string, city: string, state: string, pincode: string, lat?: number, lng?: number }
 * @returns {Promise<Object>} - { user: Object, message: string }
 * @note This function sends a PUT request that updates the user record in the database
 */
export async function updateUser(userId, userData) {
  // Allow updating name, phone, email, and location
  const backendData = {}
  if (userData.name) backendData.name = userData.name
  if (userData.phone) backendData.phone = userData.phone
  if (userData.email) backendData.email = userData.email

  // Handle location update
  if (userData.location) {
    backendData.location = {
      address: userData.location.address,
      city: userData.location.city,
      state: userData.location.state,
      pincode: userData.location.pincode,
    }

    // Add coordinates if provided
    if (userData.location.lat && userData.location.lng) {
      backendData.location.coordinates = {
        lat: parseFloat(userData.location.lat),
        lng: parseFloat(userData.location.lng),
      }
    }
  }

  const response = await apiRequest(`/admin/users/${userId}`, {
    method: 'PUT',
    body: JSON.stringify(backendData),
  })

  // Transform backend response to frontend format
  if (response.success && response.data?.user) {
    return {
      success: true,
      data: {
        user: transformUser(response.data.user),
        message: response.data.message || 'User updated successfully',
      },
    }
  }

  return response
}

/**
 * Ban User (temporary or permanent)
 * PUT /admin/users/:userId/ban
 * 
 * Note: Requires user to have >3 escalations
 * 
 * @param {string} userId - User ID
 * @param {Object} banData - { banType: 'temporary' | 'permanent', reason?: string, banDurationDays?: number }
 * @returns {Promise<Object>} - { user: Object, message: string, escalationCount: number }
 */
export async function banUser(userId, banData) {
  const response = await apiRequest(`/admin/users/${userId}/ban`, {
    method: 'PUT',
    body: JSON.stringify({
      banType: banData.banType || 'temporary',
      reason: banData.reason,
      banDurationDays: banData.banDurationDays,
    }),
  })

  // Transform backend response to frontend format
  if (response.success && response.data) {
    return {
      success: true,
      data: {
        user: response.data.user ? transformUser(response.data.user) : undefined,
        escalationCount: response.data.escalationCount || 0,
        message: response.data.message || 'User banned successfully',
      },
    }
  }

  return response
}

/**
 * Unban User (revoke temporary ban)
 * PUT /admin/users/:userId/unban
 * 
 * Note: Only works for temporary bans. Permanent bans require delete operation.
 * 
 * @param {string} userId - User ID
 * @param {Object} unbanData - { reason?: string }
 * @returns {Promise<Object>} - { user: Object, message: string }
 */
export async function unbanUser(userId, unbanData = {}) {
  const response = await apiRequest(`/admin/users/${userId}/unban`, {
    method: 'PUT',
    body: JSON.stringify({
      reason: unbanData.reason,
    }),
  })

  // Transform backend response to frontend format
  if (response.success && response.data) {
    return {
      success: true,
      data: {
        user: response.data.user ? transformUser(response.data.user) : undefined,
        message: response.data.message || 'Temporary ban revoked successfully',
      },
    }
  }

  return response
}

/**
 * Delete User (permanent ban with soft delete)
 * DELETE /admin/users/:userId
 * 
 * Note: Requires user to have >3 escalations. Soft delete - activities persist for viewing.
 * 
 * @param {string} userId - User ID
 * @param {Object} deleteData - { reason?: string }
 * @returns {Promise<Object>} - { user: Object, message: string, escalationCount: number }
 */
export async function deleteUser(userId, deleteData = {}) {
  const response = await apiRequest(`/admin/users/${userId}`, {
    method: 'DELETE',
    body: JSON.stringify({
      reason: deleteData.reason,
    }),
  })

  // Transform backend response to frontend format
  if (response.success && response.data) {
    return {
      success: true,
      data: {
        user: response.data.user ? transformUser(response.data.user) : undefined,
        escalationCount: response.data.escalationCount || 0,
        message: response.data.message || 'User permanently deleted. Activities preserved for historical viewing.',
      },
    }
  }

  return response
}

/**
 * Transform backend purchase request to frontend format
 */
function transformPurchaseRequest(backendPurchase) {
  // Handle populated userId (object) or userId (string)
  const userName = typeof backendPurchase.userId === 'object'
    ? backendPurchase.userId?.name
    : backendPurchase.user?.name || backendPurchase.userName || ''

  const userId = typeof backendPurchase.userId === 'object'
    ? backendPurchase.userId?._id?.toString() || backendPurchase.userId?.id
    : backendPurchase.userId?.toString() || backendPurchase.userId

  return {
    id: backendPurchase._id?.toString() || backendPurchase.id,
    requestId: backendPurchase._id?.toString() || backendPurchase.id,
    userId: userId,
    user: userName,
    userName: userName,
    amount: backendPurchase.totalAmount || 0,
    value: backendPurchase.totalAmount || 0,
    date: backendPurchase.createdAt ? new Date(backendPurchase.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    status: backendPurchase.status || 'pending',
    description: backendPurchase.notes || '',
    // Keep all original fields for reference
    ...backendPurchase,
  }
}

/**
 * Approve User Purchase Request
 * POST /admin/users/purchases/:requestId/approve
 * 
 * @param {string} requestId - Purchase request ID
 * @param {string} shortDescription - Short description for approval (optional)
 * @returns {Promise<Object>} - { message: string, purchase: Object, user: Object }
 */
export async function approveUserPurchase(requestId, shortDescription = '') {
  const trimmedDesc = shortDescription ? shortDescription.trim() : ''
  if (!trimmedDesc) {
    return {
      success: false,
      error: {
        message: 'Short description is required',
        status: 400,
      }
    }
  }

  const requestBody = { shortDescription: trimmedDesc }
  const bodyString = JSON.stringify(requestBody)
  console.log('Sending approve request:', {
    requestId,
    shortDescription: trimmedDesc,
    body: requestBody,
    stringified: bodyString,
    bodyLength: bodyString.length
  })

  const response = await apiRequest(`/admin/users/purchases/${requestId}/approve`, {
    method: 'POST',
    body: bodyString,
  })

  console.log('Approve response received:', response)
  console.log('Response success:', response.success)
  console.log('Response error:', response.error)
  console.log('Response message:', response.message)

  // Check for error response
  if (!response.success) {
    return {
      success: false,
      error: {
        message: response.error?.message || response.message || 'Failed to approve purchase request',
        status: response.error?.status || 400,
      }
    }
  }

  // Transform backend response to frontend format
  if (response.success && response.data) {
    return {
      success: true,
      data: {
        purchase: transformPurchaseRequest(response.data.purchase),
        user: response.data.user ? transformUser(response.data.user) : undefined,
        message: response.data.message || 'Purchase request approved successfully',
      },
    }
  }

  return response
}

/**
 * Reject User Purchase Request
 * POST /admin/users/purchases/:requestId/reject
 * 
 * @param {string} requestId - Purchase request ID
 * @param {Object} rejectionData - { reason?: string }
 * @returns {Promise<Object>} - { message: string, purchase: Object }
 */
export async function rejectUserPurchase(requestId, rejectionData) {
  const response = await apiRequest(`/admin/users/purchases/${requestId}/reject`, {
    method: 'POST',
    body: JSON.stringify(rejectionData || {}),
  })

  // Transform backend response to frontend format
  if (response.success && response.data) {
    return {
      success: true,
      data: {
        purchase: response.data.purchase ? transformPurchaseRequest(response.data.purchase) : undefined,
        message: response.data.message || 'Purchase request rejected',
      },
    }
  }

  return response
}

/**
 * Delete User Purchase Invoice
 * DELETE /admin/users/purchases/:requestId
 * 
 * @param {string} requestId - Purchase request ID
 * @returns {Promise<Object>} - { message: string, id: string }
 */
export async function deleteUserPurchase(requestId) {
  return apiRequest(`/admin/users/purchases/${requestId}`, {
    method: 'DELETE',
  })
}


/**
 * Mark User Purchase as Being Processed (Packing)
 * POST /admin/users/purchases/:requestId/process
 * 
 * @param {string} requestId - Purchase request ID
 * @param {Object} deliveryData - { deliveryNotes?: string }
 * @returns {Promise<Object>} - { message: string, purchase: Object }
 */
export async function processUserPurchaseStock(requestId, deliveryData) {
  const response = await apiRequest(`/admin/users/purchases/${requestId}/process`, {
    method: 'POST',
    body: JSON.stringify(deliveryData || {}),
  })

  // Transform backend response to frontend format
  if (response.success && response.data) {
    return {
      success: true,
      data: {
        purchase: response.data.purchase ? transformPurchaseRequest(response.data.purchase) : undefined,
        message: response.data.message || 'Stock marked as processing',
      },
    }
  }

  return response
}

/**
 * Send Stock for User Purchase
 * POST /admin/users/purchases/:requestId/send
 * 
 * @param {string} requestId - Purchase request ID
 * @param {Object} deliveryData - { deliveryNotes?: string }
 * @returns {Promise<Object>} - { message: string, purchase: Object }
 */
export async function sendUserPurchaseStock(requestId, deliveryData) {
  const response = await apiRequest(`/admin/users/purchases/${requestId}/send`, {
    method: 'POST',
    body: JSON.stringify(deliveryData || {}),
  })

  // Transform backend response to frontend format
  if (response.success && response.data) {
    return {
      success: true,
      data: {
        purchase: response.data.purchase ? transformPurchaseRequest(response.data.purchase) : undefined,
        message: response.data.message || 'Stock marked as sent',
      },
    }
  }

  return response
}

/**
 * Confirm Delivery for User Purchase
 * POST /admin/users/purchases/:requestId/confirm-delivery
 * 
 * @param {string} requestId - Purchase request ID
 * @param {Object} deliveryData - { deliveryNotes?: string }
 * @returns {Promise<Object>} - { message: string, purchase: Object }
 */
export async function confirmUserPurchaseDelivery(requestId, deliveryData) {
  const response = await apiRequest(`/admin/users/purchases/${requestId}/confirm-delivery`, {
    method: 'POST',
    body: JSON.stringify(deliveryData || {}),
  })

  // Transform backend response to frontend format
  if (response.success && response.data) {
    return {
      success: true,
      data: {
        purchase: response.data.purchase ? transformPurchaseRequest(response.data.purchase) : undefined,
        message: response.data.message || 'Delivery confirmed and inventory updated',
      },
    }
  }

  return response
}

/**
 * Get User Purchase Requests
 * GET /admin/users/purchases (global) or GET /admin/users/:userId/purchases (user-specific)
 * 
 * @param {Object} params - { 
 *   status?: 'pending' | 'approved' | 'rejected', 
 *   userId?: string, 
 *   page?: number, 
 *   limit?: number,
 *   search?: string,
 *   sortBy?: string,
 *   sortOrder?: 'asc' | 'desc'
 * }
 * @returns {Promise<Object>} - { purchases: Array, total: number, pagination?: Object }
 */
export async function getUserPurchaseRequests(params = {}) {
  try {
    const queryParams = new URLSearchParams()

    if (params.status) queryParams.append('status', params.status)
    if (params.page) queryParams.append('page', params.page)
    if (params.limit) queryParams.append('limit', params.limit)
    if (params.search) queryParams.append('search', params.search)
    if (params.sortBy) queryParams.append('sortBy', params.sortBy)
    if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder)
    if (params.userId) queryParams.append('userId', params.userId)

    const queryString = queryParams.toString()

    // Use global endpoint (supports userId as query param for filtering)
    // Backend endpoint: GET /admin/users/purchases
    const endpoint = `/admin/Users/purchases${queryString ? `?${queryString}` : ''}`

    const response = await apiRequest(endpoint)

    // Transform backend response to frontend format
    if (response.success && response.data) {
      return {
        success: true,
        data: {
          purchases: response.data.purchases.map(transformPurchaseRequest),
          total: response.data.pagination?.totalItems || response.data.purchases.length,
          pagination: response.data.pagination,
        },
      }
    }

    return response
  } catch (error) {
    throw error
  }
}

// ============================================================================
// VENDOR WITHDRAWAL APIs
// ============================================================================

/**
 * Transform backend user withdrawal request to frontend format
 */
function transformUserWithdrawalRequest(backendWithdrawal) {
  return {
    id: backendWithdrawal._id?.toString() || backendWithdrawal.id,
    requestId: backendWithdrawal._id?.toString() || backendWithdrawal.id,
    userId: backendWithdrawal.userId?.toString() || backendWithdrawal.userId,
    user: backendWithdrawal.userId?.name || backendWithdrawal.user?.name || backendWithdrawal.userName || '',
    userName: backendWithdrawal.userId?.name || backendWithdrawal.user?.name || backendWithdrawal.userName || '',
    amount: backendWithdrawal.amount || 0,
    date: backendWithdrawal.createdAt ? new Date(backendWithdrawal.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    status: backendWithdrawal.status || 'pending',
    reason: backendWithdrawal.rejectionReason || backendWithdrawal.reason || '',
    bankDetails: backendWithdrawal.paymentDetails || backendWithdrawal.bankAccountId || {},
    userType: 'user',
    ...backendWithdrawal,
  }
}

/**
 * Get User Withdrawal Requests
 * GET /admin/users/withdrawals
 * 
 * @param {Object} params - { 
 *   status?: 'pending' | 'approved' | 'rejected' | 'completed', 
 *   userId?: string, 
 *   page?: number, 
 *   limit?: number,
 *   search?: string,
 *   sortBy?: string,
 *   sortOrder?: 'asc' | 'desc'
 * }
 * @returns {Promise<Object>} - { withdrawals: Array, total: number, pagination?: Object }
 */
export async function getUserWithdrawalRequests(params = {}) {
  try {
    const queryParams = new URLSearchParams()

    if (params.status) queryParams.append('status', params.status)
    if (params.page) queryParams.append('page', params.page)
    if (params.limit) queryParams.append('limit', params.limit)
    if (params.search) queryParams.append('search', params.search)
    if (params.sortBy) queryParams.append('sortBy', params.sortBy)
    if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder)
    if (params.userId) queryParams.append('userId', params.userId)

    const queryString = queryParams.toString()
    const endpoint = `/admin/users/withdrawals${queryString ? `?${queryString}` : ''}`
    const response = await apiRequest(endpoint)

    if (response.success && response.data) {
      return {
        success: true,
        data: {
          withdrawals: response.data.withdrawals?.map(transformUserWithdrawalRequest) || [],
          total: response.data.pagination?.totalItems || response.data.withdrawals?.length || 0,
          pagination: response.data.pagination,
        },
      }
    }

    return response
  } catch (error) {
    throw error
  }
}

/**
 * Approve User Withdrawal
 * POST /admin/users/withdrawals/:requestId/approve
 * 
 * @param {string} requestId - Withdrawal request ID
 * @param {Object} data - Optional approval data (notes, etc.)
 * @returns {Promise<Object>} - { message: string, withdrawal: Object, user: Object }
 */
export async function approveUserWithdrawal(requestId, data = {}) {
  const response = await apiRequest(`/admin/users/withdrawals/${requestId}/approve`, {
    method: 'POST',
    body: JSON.stringify(data),
  })

  if (response.success && response.data) {
    return {
      success: true,
      data: {
        withdrawal: response.data.withdrawal ? transformUserWithdrawalRequest(response.data.withdrawal) : undefined,
        user: response.data.user,
        message: response.data.message || 'Withdrawal approved successfully',
      },
    }
  }

  return response
}

/**
 * Create Payment Intent for User Withdrawal
 * POST /admin/users/withdrawals/:requestId/payment-intent
 * 
 * @param {string} requestId - Withdrawal request ID
 * @param {Object} data - { amount: number }
 * @returns {Promise<Object>} - { paymentIntent: Object }
 */
export async function createUserWithdrawalPaymentIntent(requestId, data = {}) {
  const response = await apiRequest(`/admin/users/withdrawals/${requestId}/payment-intent`, {
    method: 'POST',
    body: JSON.stringify(data),
  })

  if (response.success && response.data) {
    return {
      success: true,
      data: {
        paymentIntent: response.data.paymentIntent,
      },
    }
  }

  return response
}

/**
 * Reject User Withdrawal
 * POST /admin/users/withdrawals/:requestId/reject
 * 
 * @param {string} requestId - Withdrawal request ID
 * @param {Object} rejectionData - { reason: string, notes?: string }
 * @returns {Promise<Object>} - { message: string, withdrawal: Object }
 */
export async function rejectUserWithdrawal(requestId, rejectionData) {
  const response = await apiRequest(`/admin/users/withdrawals/${requestId}/reject`, {
    method: 'POST',
    body: JSON.stringify(rejectionData),
  })

  if (response.success && response.data) {
    return {
      success: true,
      data: {
        withdrawal: response.data.withdrawal ? transformUserWithdrawalRequest(response.data.withdrawal) : undefined,
        message: response.data.message || 'Withdrawal request rejected',
      },
    }
  }

  return response
}

/**
 * Complete User Withdrawal
 * PUT /admin/users/withdrawals/:requestId/complete
 * 
 * @param {string} requestId - Withdrawal request ID
 * @param {Object} completionData - { paymentReference: string, paymentDate: Date, notes?: string }
 * @returns {Promise<Object>} - { message: string, withdrawal: Object }
 */
export async function completeUserWithdrawal(requestId, completionData) {
  const response = await apiRequest(`/admin/users/withdrawals/${requestId}/complete`, {
    method: 'PUT',
    body: JSON.stringify(completionData),
  })

  if (response.success && response.data) {
    return {
      success: true,
      data: {
        withdrawal: response.data.withdrawal ? transformUserWithdrawalRequest(response.data.withdrawal) : undefined,
        message: response.data.message || 'Withdrawal marked as completed',
      },
    }
  }

  return response
}

// ============================================================================
// PAYMENT HISTORY APIs
// ============================================================================

/**
 * Get Payment History
 * GET /admin/payment-history
 * 
 * @param {Object} params - {
 *   activityType?: string,
 *   userId?: string,
 *   userId?: string,
 *   adminId?: string,
 *   orderId?: string,
 *   startDate?: string,
 *   endDate?: string,
 *   status?: string,
 *   page?: number,
 *   limit?: number,
 *   search?: string
 * }
 * @returns {Promise<Object>} - { history: Array, pagination: Object, summary: Array }
 */
export async function getPaymentHistory(params = {}) {
  try {
    const queryParams = new URLSearchParams()

    if (params.activityType) queryParams.append('activityType', params.activityType)
    if (params.userId) queryParams.append('userId', params.userId)
    if (params.userId) queryParams.append('userId', params.userId)
    if (params.adminId) queryParams.append('adminId', params.adminId)
    if (params.orderId) queryParams.append('orderId', params.orderId)
    if (params.startDate) queryParams.append('startDate', params.startDate)
    if (params.endDate) queryParams.append('endDate', params.endDate)
    if (params.status) queryParams.append('status', params.status)
    if (params.page) queryParams.append('page', params.page)
    if (params.limit) queryParams.append('limit', params.limit)
    if (params.search) queryParams.append('search', params.search)

    const queryString = queryParams.toString()
    const response = await apiRequest(`/admin/payment-history${queryString ? `?${queryString}` : ''}`)

    return response
  } catch (error) {
    throw error
  }
}

/**
 * Get Payment History Statistics
 * GET /admin/payment-history/stats
 * 
 * @param {Object} params - { startDate?: string, endDate?: string }
 * @returns {Promise<Object>} - {
 *   totalUserPayments: number,
 *   totalUserEarnings: number,
 *   totalAdminCommissions: number,
 *   totalUserWithdrawals: number,
 *   totalAdminWithdrawals: number,
 *   totalActivities: number
 * }
 */
export async function getPaymentHistoryStats(params = {}) {
  try {
    const queryParams = new URLSearchParams()

    if (params.startDate) queryParams.append('startDate', params.startDate)
    if (params.endDate) queryParams.append('endDate', params.endDate)

    const queryString = queryParams.toString()
    const response = await apiRequest(`/admin/payment-history/stats${queryString ? `?${queryString}` : ''}`)

    return response
  } catch (error) {
    throw error
  }
}

// ============================================================================
// ORDER MANAGEMENT APIs
// ============================================================================

/**
 * Transform backend order to frontend format
 */
function transformOrder(backendOrder) {
  const isEscalated = backendOrder.assignedTo === 'admin'
  const region = backendOrder.userId?.location?.state ||
    backendOrder.userId?.location?.city ||
    backendOrder.userId?.location?.state ||
    'Unknown'

  // User location details
  const userLocation = backendOrder.userId?.location || {}
  const userLocationDisplay = userLocation.city && userLocation.state
    ? `${userLocation.city}, ${userLocation.state}`
    : userLocation.city || userLocation.state || 'Not provided'

  return {
    id: backendOrder._id?.toString() || backendOrder.id,
    orderNumber: backendOrder.orderNumber || backendOrder.id,
    type: backendOrder.assignedTo || 'user',
    userId: backendOrder.userId?._id?.toString() || backendOrder.userId?.toString() || null,
    user: backendOrder.userId?.name || 'Admin',
    userLocation: userLocationDisplay,
    userPhone: backendOrder.userId?.phone || 'N/A',
    region,
    value: backendOrder.totalAmount || 0,
    advance: backendOrder.upfrontAmount || 0,
    advanceStatus: backendOrder.paymentStatus === 'fully_paid' ? 'paid' :
      backendOrder.paymentStatus === 'partial_paid' ? 'partial' : 'pending',
    pending: backendOrder.remainingAmount || (backendOrder.totalAmount - (backendOrder.upfrontAmount || 0)),
    status: backendOrder.status || 'pending',
    paymentStatus: backendOrder.paymentStatus || 'pending',
    userId: backendOrder.userId?._id?.toString() || backendOrder.userId?.toString(),
    userName: backendOrder.userId?.name || 'Unknown',
    userPhone: backendOrder.userId?.phone || 'N/A',
    userLocation: userLocationDisplay,
    userLocationDetails: userLocation,
    assignedTo: backendOrder.assignedTo || 'user',
    escalated: isEscalated,
    createdAt: backendOrder.createdAt,
    // Keep all original fields for reference
    ...backendOrder,
  }
}

/**
 * Get All Orders
 * GET /admin/orders
 * 
 * @param {Object} params - { page, limit, status, paymentStatus, userId, userId, assignedTo, dateFrom, dateTo, search, sortBy, sortOrder, offset }
 * @returns {Promise<Object>} - { orders: Array, total: number, pagination?: Object }
 */
export async function getOrders(params = {}) {
  try {
    // Convert frontend params to backend query params
    const queryParams = new URLSearchParams()

    if (params.page) queryParams.append('page', params.page)
    if (params.limit) queryParams.append('limit', params.limit)
    if (params.status) queryParams.append('status', params.status)
    if (params.paymentStatus) queryParams.append('paymentStatus', params.paymentStatus)
    if (params.userId) queryParams.append('userId', params.userId)
    if (params.userId) queryParams.append('userId', params.userId)
    if (params.assignedTo) queryParams.append('assignedTo', params.assignedTo)
    if (params.dateFrom) queryParams.append('dateFrom', params.dateFrom)
    if (params.dateTo) queryParams.append('dateTo', params.dateTo)
    if (params.search) queryParams.append('search', params.search)
    if (params.sortBy) queryParams.append('sortBy', params.sortBy)
    if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder)
    if (params.offset) {
      // Convert offset to page
      const page = Math.floor((params.offset / (params.limit || 20)) + 1)
      queryParams.append('page', page.toString())
    }

    // Map frontend type to backend assignedTo
    if (params.type) {
      if (params.type === 'user') queryParams.append('assignedTo', 'user')
      else if (params.type === 'admin') queryParams.append('assignedTo', 'admin')
    }

    const queryString = queryParams.toString()
    const response = await apiRequest(`/admin/orders${queryString ? `?${queryString}` : ''}`)

    // Transform backend response to frontend format
    if (response.success && response.data) {
      const transformedOrders = response.data.orders.map(transformOrder)
      return {
        success: true,
        data: {
          orders: transformedOrders,
          total: response.data.pagination?.totalItems || response.data.orders.length,
          pagination: response.data.pagination,
        },
      }
    }

    return response
  } catch (error) {
    throw error
  }
}

/**
 * Get Order Details
 * GET /admin/orders/:orderId
 * 
 * @param {string} orderId - Order ID
 * @returns {Promise<Object>} - { order: Object, payments: Array, paymentSummary: Object }
 */
export async function getOrderDetails(orderId) {
  const response = await apiRequest(`/admin/orders/${orderId}`)

  // Transform backend response to frontend format
  if (response.success && response.data) {
    const order = response.data.order
    const isEscalated = order.assignedTo === 'admin'
    const region = order.userId?.location?.state ||
      order.userId?.location?.city ||
      order.userId?.location?.state ||
      'Unknown'

    return {
      success: true,
      data: {
        id: order._id?.toString() || order.id,
        orderNumber: order.orderNumber,
        type: order.assignedTo === 'admin' ? 'Admin' : 'User',
        userId: order.userId?._id?.toString() || order.userId?.toString() || null,
        user: order.userId?.name || 'Admin',
        region,
        date: order.createdAt ? new Date(order.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        value: order.totalAmount || 0,
        advance: order.upfrontAmount || 0,
        advanceStatus: order.paymentStatus === 'fully_paid' ? 'paid' :
          order.paymentStatus === 'partial_paid' ? 'partial' : 'pending',
        pending: response.data.paymentSummary?.remaining || order.remainingAmount || 0,
        status: order.status || 'pending',
        items: order.items?.map(item => ({
          id: item._id?.toString() || item.id,
          name: item.productId?.name || item.productName,
          quantity: item.quantity,
          unit: 'bags', // TODO: Get from product weight unit
          price: item.unitPrice * item.quantity,
        })) || [],
        paymentHistory: response.data.payments?.map(payment => ({
          id: payment._id?.toString() || payment.id,
          paymentId: payment.paymentId,
          type: payment.paymentType === 'advance' ? 'Advance Payment' :
            payment.paymentType === 'remaining' ? 'Remaining Payment' : 'Full Payment',
          amount: payment.amount,
          date: payment.createdAt ? new Date(payment.createdAt).toISOString().split('T')[0] : null,
          status: payment.status === 'fully_paid' ? 'completed' : payment.status,
        })) || [],
        paymentSummary: response.data.paymentSummary || {},
        escalated: isEscalated,
        escalationReason: isEscalated ? (order.notes || 'Order escalated to admin') : null,
        userId: order.userId?._id?.toString() || order.userId?.toString(),
        userName: order.userId?.name,
        // Keep all original fields for reference
        ...order,
      },
    }
  }

  return response
}

/**
 * Reassign Order
 * PUT /admin/orders/:orderId/reassign
 * 
 * @param {string} orderId - Order ID
 * @param {Object} reassignData - { userId: string, reason?: string }
 * @returns {Promise<Object>} - { message: string, order: Object, oldUserId: string, newUser: Object }
 */
export async function reassignOrder(orderId, reassignData) {
  const response = await apiRequest(`/admin/orders/${orderId}/reassign`, {
    method: 'PUT',
    body: JSON.stringify({
      userId: reassignData.userId,
      reason: reassignData.reason,
    }),
  })

  // Transform backend response to frontend format
  if (response.success && response.data) {
    return {
      success: true,
      data: {
        order: response.data.order ? transformOrder(response.data.order) : undefined,
        oldUserId: response.data.oldUserId,
        newUser: response.data.newUser,
        message: response.data.message || 'Order reassigned successfully',
      },
    }
  }

  return response
}

/**
 * Generate Invoice
 * POST /admin/orders/:orderId/invoice
 * 
 * @param {string} orderId - Order ID
 * @returns {Promise<Object>} - { invoiceUrl: string, invoiceId: string }
 */
/**
 * Generate Invoice for Order
 * GET /admin/orders/:orderId/invoice
 * 
 * @param {string} orderId - Order ID
 * @returns {Promise<Object>} - Downloads invoice as HTML (can be printed to PDF)
 */
export async function generateInvoice(orderId) {
  try {
    // Use the same token key as other API calls
    const token = localStorage.getItem('admin_token')
    if (!token) {
      return {
        success: false,
        error: { message: 'Authentication required. Please log in again.' },
      }
    }

    // Use the same API base URL as other API calls
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'
    const response = await fetch(`${API_BASE_URL}/admin/orders/${orderId}/invoice`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      // Try to parse as JSON first (for API errors), otherwise use status text
      let errorData
      const contentType = response.headers.get('content-type')
      if (contentType && contentType.includes('application/json')) {
        errorData = await response.json().catch(() => null)
      }

      if (!errorData) {
        // If not JSON, create error object from status
        if (response.status === 401) {
          errorData = { message: 'Authentication required. Please log in again.' }
        } else if (response.status === 404) {
          errorData = { message: 'Order not found.' }
        } else {
          errorData = { message: `Failed to generate invoice: ${response.statusText || 'Unknown error'}` }
        }
      }

      return {
        success: false,
        error: errorData,
      }
    }

    // Get the HTML content
    const htmlContent = await response.text()

    // Create a blob from the HTML content
    const blob = new Blob([htmlContent], { type: 'text/html' })
    const url = window.URL.createObjectURL(blob)

    // Open in new tab for viewing and printing to PDF
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      // If pop-up blocked, trigger download instead
      const link = document.createElement('a')
      link.href = url
      link.download = `invoice-${orderId}.html`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      return {
        success: true,
        data: {
          invoiceUrl: url,
          invoiceId: `INV-${orderId}`,
          message: 'Invoice downloaded! Please open it and use Print (Ctrl+P) to save as PDF.',
        },
      }
    }

    // Write HTML content to new window
    printWindow.document.write(htmlContent)
    printWindow.document.close()

    // Wait for content to load, then trigger print dialog (with slight delay to ensure content is rendered)
    setTimeout(() => {
      try {
        printWindow.focus()
        printWindow.print()
      } catch (err) {
        // Print dialog blocked or failed - user can still print manually
        console.log('Print dialog could not be opened automatically. Please use Ctrl+P to print.')
      }
    }, 500)

    return {
      success: true,
      data: {
        invoiceUrl: url,
        invoiceId: `INV-${orderId}`,
        message: 'Invoice opened in new tab. Use browser print (Ctrl+P) to save as PDF.',
      },
    }
  } catch (error) {
    return {
      success: false,
      error: {
        message: error.message || 'Failed to generate invoice',
      },
    }
  }
}

// OPERATIONAL CONTROLS APIs

/**
 * Get Logistics Settings
 * GET /admin/operations/logistics-settings
 * 
 * @returns {Promise<Object>} - { defaultDeliveryTime, availableDeliveryOptions, ... }
 */
/**
 * Get Logistics Settings
 * GET /admin/operations/logistics-settings
 * 
 * @returns {Promise<Object>} - { settings: Object }
 */
export async function getLogisticsSettings() {
  const response = await apiRequest('/admin/operations/logistics-settings')

  // Transform backend response to frontend format
  if (response.success && response.data) {
    return {
      success: true,
      data: response.data,
    }
  }

  return response
}

/**
 * Update Logistics Settings
 * PUT /admin/operations/logistics-settings
 * 
 * @param {Object} settings - Logistics settings object
 * @returns {Promise<Object>} - { settings: Object, message: string }
 */
export async function updateLogisticsSettings(settings) {
  const response = await apiRequest('/admin/operations/logistics-settings', {
    method: 'PUT',
    body: JSON.stringify(settings),
  })

  // Transform backend response to frontend format
  if (response.success && response.data) {
    return {
      success: true,
      data: {
        ...response.data,
        message: response.message || 'Logistics settings updated successfully',
      },
    }
  }

  return response
}

/**
 * Get Escalated Orders
 * GET /admin/orders/escalated
 * 
 * @param {Object} params - { page?, limit?, status?, dateFrom?, dateTo?, search?, sortBy?, sortOrder? }
 * @returns {Promise<Object>} - { orders: Array, pagination?: Object }
 */
export async function getEscalatedOrders(params = {}) {
  try {
    const queryParams = new URLSearchParams()
    if (params.page) queryParams.append('page', params.page)
    if (params.limit) queryParams.append('limit', params.limit)
    if (params.status) queryParams.append('status', params.status)
    if (params.dateFrom) queryParams.append('dateFrom', params.dateFrom)
    if (params.dateTo) queryParams.append('dateTo', params.dateTo)
    if (params.search) queryParams.append('search', params.search)
    if (params.sortBy) queryParams.append('sortBy', params.sortBy)
    if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder)

    const queryString = queryParams.toString()
    const response = await apiRequest(`/admin/orders/escalated${queryString ? `?${queryString}` : ''}`)

    // Transform backend response to frontend format
    if (response.success && response.data) {
      return {
        success: true,
        data: {
          orders: response.data.orders.map(order => ({
            id: order.id,
            orderNumber: order.orderNumber,
            user: order.user || 'N/A',
            userId: order.userId,
            value: order.value || order.orderValue || 0,
            orderValue: order.orderValue || order.value || 0,
            escalatedAt: order.escalatedAt ? new Date(order.escalatedAt).toISOString() : new Date().toISOString(),
            status: order.status || 'escalated',
            items: order.items || [],
            userId: order.userId,
            userName: order.userName,
            deliveryAddress: order.deliveryAddress,
            notes: order.notes,
          })),
          total: response.data.pagination?.totalItems || response.data.orders.length,
          pagination: response.data.pagination,
        },
      }
    }

    return response
  } catch (error) {
    throw error
  }
}

/**
 * Fulfill Order from Warehouse
 * POST /admin/orders/:orderId/fulfill
 * 
 * @param {string} orderId - Order ID
 * @param {Object} fulfillmentData - { note?: string, deliveryDate?: string (ISO), trackingNumber?: string }
 * @returns {Promise<Object>} - { message: string, order: Object }
 */
export async function fulfillOrderFromWarehouse(orderId, fulfillmentData = {}) {
  try {
    const response = await apiRequest(`/admin/orders/${orderId}/fulfill`, {
      method: 'POST',
      body: JSON.stringify({
        note: fulfillmentData.note,
        deliveryDate: fulfillmentData.deliveryDate,
        trackingNumber: fulfillmentData.trackingNumber,
      }),
    })

    // Transform backend response to frontend format
    if (response.success && response.data) {
      return {
        success: true,
        data: {
          order: response.data.order ? transformOrder(response.data.order) : undefined,
          message: response.data.message || 'Order fulfilled from warehouse successfully',
        },
      }
    }

    return response
  } catch (error) {
    throw error
  }
}

/**
 * Revert Escalation
 * POST /admin/orders/:orderId/revert-escalation
 * 
 * @param {string} orderId - Order ID
 * @param {Object} revertData - { reason: string }
 * @returns {Promise<Object>} - { order: Object, message: string }
 */
export async function revertEscalation(orderId, revertData = {}) {
  try {
    const response = await apiRequest(`/admin/orders/${orderId}/revert-escalation`, {
      method: 'POST',
      body: JSON.stringify({
        reason: revertData.reason,
      }),
    })

    // Transform backend response to frontend format
    if (response.success && response.data) {
      return {
        success: true,
        data: {
          order: response.data.order ? transformOrder(response.data.order) : undefined,
          message: response.data.message || 'Escalation reverted successfully',
        },
      }
    }

    return response
  } catch (error) {
    throw error
  }
}

/**
 * Update Order Status (for admin-fulfilled orders)
 * PUT /admin/orders/:orderId/status
 * 
 * @param {string} orderId - Order ID
 * @param {Object} statusData - { status: string, notes?: string }
 * @returns {Promise<Object>} - { order: Object, message: string }
 */
export async function updateOrderStatus(orderId, statusData = {}) {
  try {
    const requestBody = {}
    if (statusData.status) requestBody.status = statusData.status
    if (statusData.paymentStatus) requestBody.paymentStatus = statusData.paymentStatus
    if (statusData.notes) requestBody.notes = statusData.notes
    if (statusData.isRevert !== undefined) requestBody.isRevert = statusData.isRevert

    const response = await apiRequest(`/admin/orders/${orderId}/status`, {
      method: 'PUT',
      body: JSON.stringify(requestBody),
    })

    // Transform backend response to frontend format
    if (response.success && response.data) {
      return {
        success: true,
        data: {
          order: response.data.order ? transformOrder(response.data.order) : undefined,
          message: response.data.message || 'Order status updated successfully',
        },
      }
    }

    return response
  } catch (error) {
    throw error
  }
}

/**
 * Get Notifications
 * GET /admin/operations/notifications
 * 
 * @returns {Promise<Object>} - { notifications: Array }
 */
export async function getNotifications() {
  const response = await apiRequest('/admin/operations/notifications')

  // Transform backend response to frontend format
  if (response.success && response.data) {
    return {
      success: true,
      data: {
        notifications: response.data.notifications.map(notif => ({
          id: notif._id || notif.id,
          title: notif.title,
          message: notif.message,
          targetAudience: notif.targetAudience,
          priority: notif.priority,
          isActive: notif.isActive,
          createdAt: notif.createdAt ? new Date(notif.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          actionUrl: notif.actionUrl,
          actionText: notif.actionText,
        })),
        pagination: response.data.pagination,
      },
    }
  }

  return response
}

/**
 * Create Notification
 * POST /admin/operations/notifications
 * 
 * @param {Object} notificationData - Notification object
 * @returns {Promise<Object>} - { notification: Object, message: string }
 */
export async function createNotification(notificationData) {
  const response = await apiRequest('/admin/operations/notifications', {
    method: 'POST',
    body: JSON.stringify(notificationData),
  })

  // Transform backend response to frontend format
  if (response.success && response.data) {
    const notif = response.data.notification
    return {
      success: true,
      data: {
        notification: {
          id: notif._id || notif.id,
          title: notif.title,
          message: notif.message,
          targetAudience: notif.targetAudience,
          priority: notif.priority,
          isActive: notif.isActive,
          createdAt: notif.createdAt ? new Date(notif.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        },
        message: response.message || 'Notification created successfully',
      },
    }
  }

  return response
}

/**
 * Update Notification
 * PUT /admin/operations/notifications/:notificationId
 * 
 * @param {string} notificationId - Notification ID
 * @param {Object} notificationData - Updated notification object
 * @returns {Promise<Object>} - { notification: Object, message: string }
 */
export async function updateNotification(notificationId, notificationData) {
  const response = await apiRequest(`/admin/operations/notifications/${notificationId}`, {
    method: 'PUT',
    body: JSON.stringify(notificationData),
  })

  // Transform backend response to frontend format
  if (response.success && response.data) {
    const notif = response.data.notification
    return {
      success: true,
      data: {
        notification: {
          id: notif._id || notif.id,
          title: notif.title,
          message: notif.message,
          targetAudience: notif.targetAudience,
          priority: notif.priority,
          isActive: notif.isActive,
          createdAt: notif.createdAt ? new Date(notif.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        },
        message: response.message || 'Notification updated successfully',
      },
    }
  }

  return response
}

/**
 * Delete Notification
 * DELETE /admin/operations/notifications/:notificationId
 * 
 * @param {string} notificationId - Notification ID
 * @returns {Promise<Object>} - { message: string }
 */
export async function deleteNotification(notificationId) {
  const response = await apiRequest(`/admin/operations/notifications/${notificationId}`, {
    method: 'DELETE',
  })

  // Transform backend response to frontend format
  if (response.success) {
    return {
      success: true,
      data: {
        message: response.message || 'Notification deleted successfully',
      },
    }
  }

  return response
}


// ============================================================================
// ANALYTICS & REPORTS APIs
// ============================================================================

/**
 * Get Analytics Data
 * GET /admin/analytics
 * 
 * @param {Object} params - { period?: number (days, default 30), region?: string }
 * @returns {Promise<Object>} - {
 *   highlights: Array,
 *   timeline: Array,
 *   regionWise: Array,
 *   topUsers: Array,
 *   topAdmins: Array,
 *   revenueTrends: Array,
 *   orderTrends: Array
 * }
 */
export async function getAnalyticsData(params = {}) {
  try {
    const queryParams = new URLSearchParams()
    if (params.period) {
      // Convert period string to days if needed
      const periodDays = typeof params.period === 'number'
        ? params.period
        : params.period === 'day' ? 1
          : params.period === 'week' ? 7
            : params.period === 'month' ? 30
              : params.period === 'year' ? 365
                : 30
      queryParams.append('period', periodDays.toString())
    } else {
      queryParams.append('period', '30') // Default 30 days
    }

    const queryString = queryParams.toString()
    const response = await apiRequest(`/admin/analytics${queryString ? `?${queryString}` : ''}`)

    // Transform backend response to frontend format
    if (response.success && response.data?.analytics) {
      const analytics = response.data.analytics

      // Calculate highlights from analytics data
      const totalOrders = analytics.orderTrends?.reduce((sum, day) => sum + (day.count || 0), 0) || 0
      const totalRevenue = analytics.revenueTrends?.reduce((sum, day) => sum + (day.revenue || 0), 0) || 0
      const topUser = analytics.topUsers?.[0]
      const topAdmin = analytics.topAdmins?.[0]

      // Calculate region-wise data (simplified - would need region aggregation in backend)
      // For now, using mock data structure but placeholder for future enhancement
      const regionWise = [] // TODO: Backend needs to provide region-wise aggregation

      // Build highlights
      const highlights = [
        {
          label: 'Total Orders',
          value: totalOrders.toLocaleString('en-IN'),
          change: '+12%', // TODO: Calculate change from previous period
        },
        {
          label: 'Total Revenue',
          value: `₹${(totalRevenue / 10000000).toFixed(1)} Cr`,
          change: '+9.6%', // TODO: Calculate change from previous period
        },
        {
          label: 'Top Region',
          value: 'N/A', // TODO: Calculate from region-wise data
          change: 'N/A',
        },
        {
          label: 'Top User',
          value: topUser?.userName || 'N/A',
          change: `₹${((topUser?.revenue || 0) / 10000000).toFixed(1)} Cr`,
        },
      ]

      // Build timeline (simplified - would need actual event tracking)
      const timeline = [
        // TODO: Add actual timeline events when backend provides them
        {
          id: 'event-1',
          title: 'Analytics updated',
          timestamp: 'Just now',
          description: 'Analytics data refreshed for the selected period.',
          status: 'completed',
        },
      ]

      // Transform top users
      const topUsers = analytics.topUsers?.map(user => ({
        name: user.userName || user.name,
        revenue: user.revenue || 0,
        change: '+0%', // TODO: Calculate change from previous period
        orderCount: user.orderCount || 0,
      })) || []

      // Transform top admins
      const topAdmins = analytics.topAdmins?.map(admin => ({
        name: admin.adminId || 'Unknown Admin',
        sales: admin.revenue || 0,
        referrals: admin.referralCount || 0,
        orderCount: admin.orderCount || 0,
      })) || []

      return {
        success: true,
        data: {
          highlights,
          timeline,
          regionWise,
          topUsers,
          topAdmins,
          revenueTrends: analytics.revenueTrends || [],
          orderTrends: analytics.orderTrends || [],
          topProducts: analytics.topProducts || [],
          period: response.data.period || 30,
        },
      }
    }

    return response
  } catch (error) {
    throw error
  }
}

/**
 * Export Reports
 * GET /admin/reports
 * 
 * Note: Backend endpoint is GET (not POST) and returns JSON format for now
 * CSV/PDF export returns 501 (not yet implemented)
 * 
 * @param {Object} exportData - {
 *   format?: 'json' | 'csv' | 'pdf' (default: 'json'),
 *   period?: 'daily' | 'weekly' | 'monthly' | 'yearly' (default: 'monthly'),
 *   type?: 'summary' | 'full' (default: 'summary')
 * }
 * @returns {Promise<Object>} - { report: Object, generatedAt: Date, format: string }
 */
export async function exportReports(exportData = {}) {
  try {
    const queryParams = new URLSearchParams()

    queryParams.append('format', exportData.format || 'json')
    queryParams.append('period', exportData.period || 'monthly')
    queryParams.append('type', exportData.type || 'summary')

    const queryString = queryParams.toString()
    const response = await apiRequest(`/admin/reports${queryString ? `?${queryString}` : ''}`)

    // Transform backend response to frontend format
    if (response.success && response.data) {
      // If CSV/PDF, backend returns 501 - handle gracefully
      if (response.status === 501 || !response.success) {
        return {
          success: false,
          message: response.message || 'CSV/PDF export functionality will be implemented later',
          data: {
            downloadUrl: null,
            reportId: null,
          },
        }
      }

      // For JSON format, return report data
      // For CSV/PDF (when implemented), return download URL
      return {
        success: true,
        data: {
          report: response.data.report || {},
          generatedAt: response.data.generatedAt || new Date(),
          format: response.data.format || 'json',
          downloadUrl: response.data.format !== 'json' ? response.data.downloadUrl : null,
          reportId: `RPT-${Date.now()}`,
        },
      }
    }

    return response
  } catch (error) {
    throw error
  }
}

// ============================================================================
// REAL-TIME NOTIFICATIONS
// ============================================================================

/**
 * Initialize Real-time Connection
 * Sets up WebSocket or polling connection for real-time updates
 * 
 * @param {Function} onNotification - Callback function for notifications
 * @returns {Function} - Cleanup function
 */
export function initializeRealtimeConnection(onNotification) {
  // Simulate real-time connection
  const interval = setInterval(() => {
    // Simulate various notification types
    const notifications = [
      {
        type: 'user_application',
        title: 'New User Application',
        message: 'New user application received from Green Valley Hub',
        timestamp: new Date().toISOString(),
        data: { userId: 'VND-500', userName: 'Green Valley Hub' },
      },
      {
        type: 'user_purchase_request',
        title: 'User Purchase Request',
        message: 'HarvestLink Pvt Ltd requested credit purchase of ₹50,000',
        timestamp: new Date().toISOString(),
        data: { requestId: 'CR-123', userId: 'VND-131', amount: 50000 },
      },
      {
        type: 'admin_withdrawal_request',
        title: 'Admin Withdrawal Request',
        message: 'Priya Nair requested withdrawal of ₹25,000',
        timestamp: new Date().toISOString(),
        data: { requestId: 'WD-456', adminId: 'SLR-883', amount: 25000 },
      },
      {
        type: 'order_escalated',
        title: 'Order Escalated',
        message: 'Order #ORD-78289 escalated to Admin for fulfillment',
        timestamp: new Date().toISOString(),
        data: { orderId: 'ORD-78289', reason: 'User unavailable' },
      },
      {
        type: 'payment_delayed',
        title: 'Payment Delayed',
        message: '14 users have delayed payments requiring attention',
        timestamp: new Date().toISOString(),
        data: { count: 14 },
      },
      {
        type: 'low_stock_alert',
        title: 'Low Stock Alert',
        message: 'Micro Nutrient Mix stock is running low (2,900 kg)',
        timestamp: new Date().toISOString(),
        data: { productId: 'MICRO-12', productName: 'Micro Nutrient Mix', stock: 2900 },
      },
    ]

    // Randomly send notifications (simulate real-time behavior)
    if (Math.random() < 0.1) {
      const notification = notifications[Math.floor(Math.random() * notifications.length)]
      onNotification(notification)
    }
  }, 10000) // Check every 10 seconds

  return () => clearInterval(interval)
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
    case 'user_application':
      dispatch({ type: 'ADD_NOTIFICATION', payload: notification })
      dispatch({ type: 'SET_VENDORS_UPDATED', payload: true })
      showToast(notification.message, 'info')
      break

    case 'user_purchase_request':
      dispatch({ type: 'ADD_NOTIFICATION', payload: notification })
      dispatch({ type: 'SET_FINANCE_UPDATED', payload: true })
      showToast(notification.message, 'info')
      break

    case 'admin_withdrawal_request':
      dispatch({ type: 'ADD_NOTIFICATION', payload: notification })
      dispatch({ type: 'SET_SELLERS_UPDATED', payload: true })
      showToast(notification.message, 'info')
      break

    case 'order_escalated':
      dispatch({ type: 'ADD_NOTIFICATION', payload: notification })
      dispatch({ type: 'SET_ORDERS_UPDATED', payload: true })
      showToast(notification.message, 'warning')
      break

    case 'payment_delayed':
      dispatch({ type: 'ADD_NOTIFICATION', payload: notification })
      dispatch({ type: 'SET_FINANCE_UPDATED', payload: true })
      showToast(notification.message, 'warning')
      break

    case 'low_stock_alert':
      dispatch({ type: 'ADD_NOTIFICATION', payload: notification })
      dispatch({ type: 'SET_PRODUCTS_UPDATED', payload: true })
      showToast(notification.message, 'warning')
      break

    default:
      dispatch({ type: 'ADD_NOTIFICATION', payload: notification })
      break
  }
}

// ============================================================================
// OFFERS MANAGEMENT APIs
// ============================================================================

/**
 * Get All Offers
 * GET /admin/offers
 * 
 * @param {Object} params - { type, isActive }
 * @returns {Promise<Object>} - { offers: Array, carouselCount: number, maxCarousels: number }
 */
export async function getOffers(params = {}) {
  const queryParams = new URLSearchParams(params).toString()
  return apiRequest(`/admin/offers?${queryParams}`)
}

/**
 * Get Single Offer
 * GET /admin/offers/:id
 * 
 * @param {string} id - Offer ID
 * @returns {Promise<Object>} - { offer: Object }
 */
export async function getOffer(id) {
  return apiRequest(`/admin/offers/${id}`)
}

/**
 * Create Offer
 * POST /admin/offers
 * 
 * @param {Object} data - Offer data (type, title, description, etc.)
 * @returns {Promise<Object>} - { offer: Object }
 */
export async function createOffer(data) {
  return apiRequest('/admin/offers', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * Update Offer
 * PUT /admin/offers/:id
 * 
 * @param {string} id - Offer ID
 * @param {Object} data - Updated offer data
 * @returns {Promise<Object>} - { offer: Object }
 */
export async function updateOffer(id, data) {
  return apiRequest(`/admin/offers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

/**
 * Delete Offer
 * DELETE /admin/offers/:id
 * 
 * @param {string} id - Offer ID
 * @returns {Promise<Object>} - { message: string }
 */
export async function deleteOffer(id) {
  return apiRequest(`/admin/offers/${id}`, {
    method: 'DELETE',
  })
}

// ============================================================================
// REVIEW MANAGEMENT APIs
// ============================================================================

/**
 * Get All Reviews
 * GET /admin/reviews
 * 
 * @param {Object} params - { productId, userId, rating, hasResponse, isApproved, isVisible, page, limit, sort }
 * @returns {Promise<Object>} - { reviews: Array, pagination: Object }
 */
export async function getReviews(params = {}) {
  const queryParams = new URLSearchParams(params).toString()
  return apiRequest(`/admin/reviews?${queryParams}`)
}

/**
 * Get Review Details
 * GET /admin/reviews/:reviewId
 * 
 * @param {string} reviewId - Review ID
 * @returns {Promise<Object>} - { review: Object }
 */
export async function getReviewDetails(reviewId) {
  return apiRequest(`/admin/reviews/${reviewId}`)
}

/**
 * Respond to Review
 * POST /admin/reviews/:reviewId/respond
 * 
 * @param {string} reviewId - Review ID
 * @param {Object} data - { response: string }
 * @returns {Promise<Object>} - { review: Object, message: string }
 */
export async function respondToReview(reviewId, data) {
  return apiRequest(`/admin/reviews/${reviewId}/respond`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * Update Review Response
 * PUT /admin/reviews/:reviewId/respond
 * 
 * @param {string} reviewId - Review ID
 * @param {Object} data - { response: string }
 * @returns {Promise<Object>} - { review: Object, message: string }
 */
export async function updateReviewResponse(reviewId, data) {
  return apiRequest(`/admin/reviews/${reviewId}/respond`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

/**
 * Delete Review Response
 * DELETE /admin/reviews/:reviewId/respond
 * 
 * @param {string} reviewId - Review ID
 * @returns {Promise<Object>} - { review: Object, message: string }
 */
export async function deleteReviewResponse(reviewId) {
  return apiRequest(`/admin/reviews/${reviewId}/respond`, {
    method: 'DELETE',
  })
}

/**
 * Moderate Review
 * PUT /admin/reviews/:reviewId/moderate
 * 
 * @param {string} reviewId - Review ID
 * @param {Object} data - { isApproved: boolean, isVisible: boolean }
 * @returns {Promise<Object>} - { review: Object, message: string }
 */
export async function moderateReview(reviewId, data) {
  return apiRequest(`/admin/reviews/${reviewId}/moderate`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

/**
 * Delete Review
 * DELETE /admin/reviews/:reviewId
 * 
 * @param {string} reviewId - Review ID
 * @returns {Promise<Object>} - { message: string }
 */
export async function deleteReview(reviewId) {
  return apiRequest(`/admin/reviews/${reviewId}`, {
    method: 'DELETE',
  })
}

// ============================================================================
// TASK (TODO) MANAGEMENT APIs
// ============================================================================

/**
 * Get All Admin Tasks
 * GET /admin/tasks
 * 
 * @param {Object} params - { status, category, priority, limit }
 * @returns {Promise<Object>} - { tasks: Array, totalPending: number }
 */
export async function getAdminTasks(params = {}) {
  const queryParams = new URLSearchParams(params).toString()
  return apiRequest(`/admin/tasks?${queryParams}`)
}

/**
 * Mark Task as Viewed
 * PUT /admin/tasks/:taskId/view
 * 
 * @param {string} taskId - Task ID
 * @returns {Promise<Object>} - { success: true, data: Object }
 */
export async function markTaskAsViewed(taskId) {
  return apiRequest(`/admin/tasks/${taskId}/view`, {
    method: 'PUT',
  })
}

/**
 * Mark Task as Completed
 * PUT /admin/tasks/:taskId/complete
 * 
 * @param {string} taskId - Task ID
 * @returns {Promise<Object>} - { success: true, data: Object }
 */
export async function markTaskAsCompleted(taskId) {
  return apiRequest(`/admin/tasks/${taskId}/complete`, {
    method: 'PUT',
  })
}
/**
 * Get All Categories (Public)
 */
export async function getCategories() {
  return apiRequest('/categories')
}

/**
 * Create Category
 * @param {Object} data - { name, description, image: { url, publicId }, order, isActive }
 */
export async function createCategory(data) {
  return apiRequest('/admin/categories', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * Update Category
 * @param {string} id - Category ID
 * @param {Object} data - Category data to update
 */
export async function updateCategory(id, data) {
  return apiRequest(`/admin/categories/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

/**
 * Delete Category
 * @param {string} id - Category ID
 */
export async function deleteCategory(id) {
  return apiRequest(`/admin/categories/${id}`, {
    method: 'DELETE',
  })
}

/**
 * Reorder Categories (bulk update order)
 * @param {Array} categories - Array of { id, order }
 */
export async function reorderCategories(categories) {
  return apiRequest('/admin/categories/reorder', {
    method: 'PUT',
    body: JSON.stringify({ categories }),
  })
}


// ============================================================================
// GENERIC HTTP METHODS (for new modules)
// ============================================================================

/**
 * Generic GET Request
 * @param {string} endpoint - API endpoint (e.g., '/config/regions')
 * @returns {Promise<Object>} - API response
 */
export async function apiGet(endpoint) {
  return apiRequest(`/admin${endpoint}`)
}

/**
 * Generic POST Request
 * @param {string} endpoint - API endpoint
 * @param {Object} data - Request body data
 * @returns {Promise<Object>} - API response
 */
export async function apiPost(endpoint, data) {
  return apiRequest(`/admin${endpoint}`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * Generic PUT Request
 * @param {string} endpoint - API endpoint
 * @param {Object} data - Request body data
 * @returns {Promise<Object>} - API response
 */
export async function apiPut(endpoint, data) {
  return apiRequest(`/admin${endpoint}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

/**
 * Generic DELETE Request
 * @param {string} endpoint - API endpoint
 * @returns {Promise<Object>} - API response
 */
export async function apiDelete(endpoint) {
  return apiRequest(`/admin${endpoint}`, {
    method: 'DELETE',
  })
}
