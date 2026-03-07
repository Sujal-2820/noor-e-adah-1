/**
 * Shared Catalog API Service
 * 
 * This file contains API endpoints for catalog/product related operations.
 * These functions are shared across User and Admin modules after User module removal.
 * 
 * Updated to use public /api/catalog/* endpoints after User module removal.
 * 
 * Base URL should be configured in environment variables:
 * - Development: http://localhost:3000/api
 * - Production: https://api.satpurabio.com/api
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3000/api'

/**
 * API Response Handler
 */
async function handleResponse(response) {
    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'An error occurred' }))
        throw { success: false, error: { message: error.message || `HTTP error! status: ${response.status}` } }
    }
    return response.json()
}

/**
 * API Request Helper (public endpoints, no auth required for catalog)
 */
async function apiRequest(endpoint, options = {}) {
    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
        ...options,
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, config)
    return handleResponse(response)
}

// ============================================================================
// PRODUCT & CATALOG APIs
// Using public /api/catalog/* endpoints after User module removal
// ============================================================================

/**
 * Get Categories
 * GET /categories (public endpoint)
 * 
 * @returns {Promise<Array>} - Array of categories
 */
export async function getCategories() {
    return apiRequest('/categories')
}

/**
 * Get Products
 * GET /catalog/products (public endpoint)
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
 * GET /catalog/products/:productId (public endpoint)
 * 
 * @param {string} productId - Product ID
 * @returns {Promise<Object>} - Product details with stock, delivery timeline, user info
 */
export async function getProductDetails(productId) {
    return apiRequest(`/catalog/products/${productId}`)
}

/**
 * Get Popular Products
 * GET /catalog/products?sort=popular&limit=N
 * 
 * @param {Object} params - { limit }
 * @returns {Promise<Array>} - Array of popular products
 */
export async function getPopularProducts(params = {}) {
    const queryParams = new URLSearchParams({ ...params, sort: 'popular' }).toString()
    return apiRequest(`/catalog/products?${queryParams}`)
}

/**
 * Get Offers/Banners
 * GET /catalog/offers (public endpoint)
 * 
 * @returns {Promise<Object>} - { carousels: Array, specialOffers: Array }
 */
export async function getOffers() {
    return apiRequest('/catalog/offers')
}

/**
 * Search Products
 * GET /catalog/products?search=query
 * 
 * @param {Object} params - { query, category, limit, offset }
 * @returns {Promise<Object>} - { products: Array, total: number }
 */
export async function searchProducts(params = {}) {
    const { query, ...rest } = params
    const queryParams = new URLSearchParams({ ...rest, search: query }).toString()
    return apiRequest(`/catalog/products?${queryParams}`)
}

/**
 * Get Delivery Config (charge, time) for the storefront
 * GET /catalog/delivery-config (public endpoint)
 *
 * @returns {Promise<Object>} - { mode, domestic: { charge, timeLabel, ... }, international: { ... } }
 */
export async function getDeliveryConfig() {
    return apiRequest('/catalog/delivery-config')
}
