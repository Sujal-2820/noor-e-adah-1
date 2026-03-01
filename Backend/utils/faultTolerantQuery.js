/**
 * Fault-Tolerant Query Helpers
 * 
 * Provides graceful fallbacks for User/Seller related queries during migration.
 * These helpers return default values when User/Seller models are unavailable or queries fail.
 * 
 * Following antigravity-permission.md principles:
 * - Safe-Change Mode: Graceful degradation instead of hard errors
 * - Scope Isolation: Dashboard functions continue working even if modules are disabled
 * - Preserve Existing Behavior: API response structure remains unchanged
 * 
 * @module utils/faultTolerantQuery
 */

/**
 * Safe count for User model
 * Returns 0 if User collection is unavailable or query fails
 * @param {Object} query - MongoDB query filter
 * @returns {Promise<number>} Count or 0
 */
async function safeUserCount(query = {}) {
    try {
        const User = require('../models/User');
        return await User.countDocuments(query);
    } catch (error) {
        console.warn('[FaultTolerant] User count failed, returning 0:', error.message);
        return 0;
    }
}

/**
 * Safe count for Seller model
 * Returns 0 if Seller collection is unavailable or query fails
 * @param {Object} query - MongoDB query filter
 * @returns {Promise<number>} Count or 0
 */
async function safeSellerCount(query = {}) {
    try {
        
        return await Seller.countDocuments(query);
    } catch (error) {
        console.warn('[FaultTolerant] Seller count failed, returning 0:', error.message);
        return 0;
    }
}

/**
 * Safe aggregation for User model
 * Returns empty array if User collection is unavailable or aggregation fails
 * @param {Array} pipeline - MongoDB aggregation pipeline
 * @returns {Promise<Array>} Aggregation result or empty array
 */
async function safeUserAggregate(pipeline) {
    try {
        return await User.aggregate(pipeline);
    } catch (error) {
        console.warn('[FaultTolerant] User aggregate failed, returning []:', error.message);
        return [];
    }
}

/**
 * Safe aggregation for Seller model
 * Returns empty array if Seller collection is unavailable or aggregation fails
 * @param {Array} pipeline - MongoDB aggregation pipeline
 * @returns {Promise<Array>} Aggregation result or empty array
 */
async function safeSellerAggregate(pipeline) {
    try {
        
        return await Seller.aggregate(pipeline);
    } catch (error) {
        console.warn('[FaultTolerant] Seller aggregate failed, returning []:', error.message);
        return [];
    }
}

/**
 * Safe find for User model
 * Returns empty array if query fails
 * @param {Object} query - MongoDB query filter
 * @param {Object} options - Query options (select, limit, skip, sort)
 * @returns {Promise<Array>} Found documents or empty array
 */
async function safeUserFind(query = {}, options = {}) {
    try {
        let cursor = User.find(query);
        if (options.select) cursor = cursor.select(options.select);
        if (options.limit) cursor = cursor.limit(options.limit);
        if (options.skip) cursor = cursor.skip(options.skip);
        if (options.sort) cursor = cursor.sort(options.sort);
        return await cursor.lean();
    } catch (error) {
        console.warn('[FaultTolerant] User find failed, returning []:', error.message);
        return [];
    }
}

/**
 * Safe find for Seller model
 * Returns empty array if query fails
 * @param {Object} query - MongoDB query filter
 * @param {Object} options - Query options (select, limit, skip, sort)
 * @returns {Promise<Array>} Found documents or empty array
 */
async function safeSellerFind(query = {}, options = {}) {
    try {
        
        let cursor = Seller.find(query);
        if (options.select) cursor = cursor.select(options.select);
        if (options.limit) cursor = cursor.limit(options.limit);
        if (options.skip) cursor = cursor.skip(options.skip);
        if (options.sort) cursor = cursor.sort(options.sort);
        return await cursor.lean();
    } catch (error) {
        console.warn('[FaultTolerant] Seller find failed, returning []:', error.message);
        return [];
    }
}

/**
 * Safe findById for User model
 * Returns null if query fails
 * @param {string} id - User ID
 * @returns {Promise<Object|null>} Found document or null
 */
async function safeUserFindById(id) {
    try {
        return await User.findById(id);
    } catch (error) {
        console.warn('[FaultTolerant] User findById failed, returning null:', error.message);
        return null;
    }
}

/**
 * Safe findById for Seller model
 * Returns null if query fails
 * @param {string} id - Seller ID
 * @returns {Promise<Object|null>} Found document or null
 */
async function safeSellerFindById(id) {
    try {
        
        return await Seller.findById(id);
    } catch (error) {
        console.warn('[FaultTolerant] Seller findById failed, returning null:', error.message);
        return null;
    }
}

module.exports = {
    safeUserCount,
    safeSellerCount,
    safeUserAggregate,
    safeSellerAggregate,
    safeUserFind,
    safeSellerFind,
    safeUserFindById,
    safeSellerFindById,
};
