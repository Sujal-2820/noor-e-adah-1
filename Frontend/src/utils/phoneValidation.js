/**
 * Phone Number Validation and Normalization Utility
 * Handles Indian phone numbers with +91 or 91 prefix
 * 
 * Rules:
 * 1. Accept phone with or without +91/91 prefix
 * 2. Handle spaces after prefix
 * 3. Validate exactly 10 digits for the actual phone number
 * 4. Normalize to +91XXXXXXXXXX format for storage
 */

/**
 * Normalize phone number to +91XXXXXXXXXX format
 * @param {string} phone - Raw phone number input
 * @returns {string} - Normalized phone number with +91 prefix
 */
export function normalizePhoneNumber(phone) {
    if (!phone) return '';

    // Remove all spaces, hyphens, and other non-digit characters except +
    let cleaned = phone.replace(/[\s\-()]/g, '');

    // Remove + if it exists, we'll add it back later
    cleaned = cleaned.replace(/^\+/, '');

    // Remove 91 prefix if it exists
    if (cleaned.startsWith('91') && cleaned.length > 10) {
        cleaned = cleaned.substring(2);
    }

    // Now cleaned should be just the 10-digit number
    // Add +91 prefix
    return `+91${cleaned}`;
}

/**
 * Extract just the 10-digit phone number without prefix
 * @param {string} phone - Phone number (with or without prefix)
 * @returns {string} - 10-digit phone number
 */
export function extractPhoneDigits(phone) {
    if (!phone) return '';

    // Remove all non-digit characters
    let digits = phone.replace(/\D/g, '');

    // Remove 91 prefix if it exists
    if (digits.startsWith('91') && digits.length > 10) {
        digits = digits.substring(2);
    }

    return digits;
}

/**
 * Validate phone number
 * @param {string} phone - Phone number to validate
 * @returns {{ isValid: boolean, error: string, normalized: string }}
 */
export function validatePhoneNumber(phone) {
    if (!phone || typeof phone !== 'string') {
        return {
            isValid: false,
            error: 'Phone number is required',
            normalized: ''
        };
    }

    // Extract just the digits
    const digits = extractPhoneDigits(phone);

    // Check if we have exactly 10 digits
    if (digits.length < 10) {
        return {
            isValid: false,
            error: `Phone number must be 10 digits (currently ${digits.length} digits)`,
            normalized: ''
        };
    }

    if (digits.length > 10) {
        return {
            isValid: false,
            error: `Phone number must be 10 digits (currently ${digits.length} digits)`,
            normalized: ''
        };
    }

    // Check if first digit is valid (Indian mobile numbers start with 6-9)
    const firstDigit = parseInt(digits[0]);
    if (firstDigit < 6) {
        return {
            isValid: false,
            error: 'Invalid phone number (must start with 6, 7, 8, or 9)',
            normalized: ''
        };
    }

    // All validations passed
    return {
        isValid: true,
        error: '',
        normalized: normalizePhoneNumber(phone)
    };
}

/**
 * Format phone number for display
 * @param {string} phone - Phone number
 * @param {boolean} showPrefix - Whether to show +91 prefix
 * @returns {string} - Formatted phone number
 */
export function formatPhoneNumber(phone, showPrefix = true) {
    if (!phone) return '';

    const digits = extractPhoneDigits(phone);

    if (digits.length !== 10) return phone; // Return as-is if invalid

    // Format as: +91 XXXXX XXXXX or XXXXX XXXXX
    const formatted = `${digits.slice(0, 5)} ${digits.slice(5)}`;

    return showPrefix ? `+91 ${formatted}` : formatted;
}

/**
 * Real-time phone input formatter
 * Use this in onChange handlers to format as user types
 * @param {string} value - Current input value
 * @returns {string} - Formatted value
 */
export function formatPhoneInput(value) {
    if (!value) return '';

    // Remove all non-digit characters except +
    let cleaned = value.replace(/[^\d+]/g, '');

    // If starts with +91, keep it
    if (cleaned.startsWith('+91')) {
        cleaned = '+91' + cleaned.substring(3).replace(/\D/g, '');
    } else if (cleaned.startsWith('91')) {
        cleaned = '91' + cleaned.substring(2).replace(/\D/g, '');
    } else if (cleaned.startsWith('+')) {
        cleaned = cleaned.substring(1).replace(/\D/g, '');
    }

    // Limit to +91 + 10 digits = 13 characters
    if (cleaned.startsWith('+91')) {
        return cleaned.substring(0, 13);
    } else if (cleaned.startsWith('91')) {
        return cleaned.substring(0, 12);
    } else {
        return cleaned.substring(0, 10);
    }
}

/**
 * Check if two phone numbers are the same
 * @param {string} phone1 
 * @param {string} phone2 
 * @returns {boolean}
 */
export function isSamePhoneNumber(phone1, phone2) {
    if (!phone1 || !phone2) return false;

    const digits1 = extractPhoneDigits(phone1);
    const digits2 = extractPhoneDigits(phone2);

    return digits1 === digits2 && digits1.length === 10;
}
