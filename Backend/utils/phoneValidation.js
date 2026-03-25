/**
 * Phone Validation Utilities for Backend
 * Handles cross-role phone number validation and special bypass numbers
 */

/**
 * Normalize phone number to +91XXXXXXXXXX format
 * @param {string} phone - Raw phone number
 * @returns {string} - Normalized phone number
 */
function normalizePhoneNumber(phone) {
    if (!phone) return undefined;

    // Remove all spaces, hyphens, and other non-digit characters except +
    let cleaned = phone.replace(/[\s\-()]/g, '');

    // Remove + if it exists, we'll add it back later
    cleaned = cleaned.replace(/^\+/, '');

    // If it starts with 91 and has more than 10 digits, it's already got the country code
    if (cleaned.startsWith('91') && cleaned.length > 10) {
        cleaned = cleaned.substring(2);
    }

    if (!cleaned) return undefined;
    // Return in standardized format
    return `+91${cleaned.slice(-10)}`;
}

const User = require('../models/User');


// Admin phone number — the real admin (9981331303)
const SPECIAL_BYPASS_NUMBER = process.env.ADMIN_PHONE || '+919981331303';
// Admin secret key — used instead of SMS OTP (from .env)
const SPECIAL_BYPASS_OTP = process.env.ADMIN_SECRET_KEY || '123456';

/**
 * Check if a phone number is a special bypass number
 * @param {string} phone - Phone number to check
 * @returns {boolean}
 */
function isSpecialBypassNumber(phone) {
    if (!phone) return false;

    // Normalize phone number for comparison
    const normalized = phone.replace(/\s/g, '');
    return normalized === SPECIAL_BYPASS_NUMBER ||
        normalized === '9999999999' ||
        normalized === '919999999999' ||
        normalized === '+919981331303' ||
        normalized === '9981331303' ||
        normalized === '919981331303';
}

/**
 * Check if a phone number exists in any role
 * @param {string} phone - Phone number to check
 * @param {string} excludeRole - Role to exclude from check ('user', 'User', 'seller')
 * @returns {Promise<{exists: boolean, role: string|null, message: string}>}
 */
async function checkPhoneExists(phone, excludeRole = null) {
    try {
        const normalizedPhone = normalizePhoneNumber(phone);

        // Check in User collection
        if (excludeRole !== 'user') {
            const user = await User.findOne({ phone: normalizedPhone });
            if (user) {
                return {
                    exists: true,
                    role: 'user',
                    message: 'This phone number is already registered as a user. Please use a different number or login as a user.',
                };
            }
        }

        // Check in User collection
        if (excludeRole !== 'User') {
            const User = await User.findOne({ phone: normalizedPhone });
            if (User) {
                return {
                    exists: true,
                    role: 'User',
                    message: 'This phone number is already registered as a User. Please use a different number or login as a User.',
                };
            }
        }

        // Check in Seller collection
        if (excludeRole !== 'seller') {
            const seller = await Seller.findOne({ phone: normalizedPhone });
            if (seller) {
                return {
                    exists: true,
                    role: 'seller',
                    message: 'This phone number is already registered as a seller. Please use a different number or login as a seller.',
                };
            }
        }

        return {
            exists: false,
            role: null,
            message: '',
        };
    } catch (error) {
        console.error('Error checking phone existence:', error);
        throw error;
    }
}

/**
 * Check if a phone number exists in a specific role
 * @param {string} phone - Phone number to check
 * @param {string} role - Role to check ('user', 'User', 'seller')
 * @returns {Promise<{exists: boolean, data: any}>}
 */
async function checkPhoneInRole(phone, role) {
    try {
        const normalizedPhone = normalizePhoneNumber(phone);
        let data = null;

        switch (role) {
            case 'user':
                data = await User.findOne({ phone: normalizedPhone });
                break;
            case 'User':
                data = await User.findOne({ phone: normalizedPhone });
                break;
            case 'seller':
                data = await Seller.findOne({ phone: normalizedPhone });
                break;
            default:
                throw new Error(`Invalid role: ${role}`);
        }

        return {
            exists: !!data,
            data: data,
        };
    } catch (error) {
        console.error('Error checking phone in role:', error);
        throw error;
    }
}

module.exports = {
    normalizePhoneNumber,
    checkPhoneExists,
    checkPhoneInRole,
    isSpecialBypassNumber,
    SPECIAL_BYPASS_OTP,
    SPECIAL_BYPASS_NUMBER,
};
