/**
 * Phone Number Normalization Utility
 * 
 * Normalizes Indian phone numbers to +91 format for consistency
 */

/**
 * Normalizes phone number to +91 format
 * @param {string} phone - Phone number (with or without +91, or just 10 digits)
 * @returns {string} - Normalized phone number with +91 prefix
 */
const normalizePhone = (phone) => {
  if (!phone) return phone;
  
  // Remove all non-digit characters except +
  let cleaned = phone.replace(/[^\d+]/g, '');
  
  // Remove +91 or 91 prefix if present
  cleaned = cleaned.replace(/^\+91/, '').replace(/^91/, '');
  
  // Ensure it's a 10-digit number
  if (cleaned.length !== 10) {
    return phone; // Return original if not valid
  }
  
  // Add +91 prefix
  return `+91${cleaned}`;
};

/**
 * Find phone number in database (handles both +91 and non-prefix formats)
 * @param {mongoose.Model} Model - Mongoose model
 * @param {string} phone - Phone number to search
 * @returns {Promise<Object|null>} - Found document or null
 */
const findPhoneInModel = async (Model, phone) => {
  if (!phone) return null;
  
  // Normalize the search phone
  const normalizedPhone = normalizePhone(phone);
  
  // Try to find with normalized phone
  let found = await Model.findOne({ phone: normalizedPhone });
  if (found) return found;
  
  // Try to find with phone as-is
  found = await Model.findOne({ phone });
  if (found) return found;
  
  // Try to find by stripping +91
  const withoutPrefix = phone.replace(/^\+91/, '').replace(/^91/, '');
  if (withoutPrefix !== phone) {
    found = await Model.findOne({ phone: withoutPrefix });
    if (found) return found;
    
    // Also try with +91 added
    if (withoutPrefix.length === 10) {
      found = await Model.findOne({ phone: `+91${withoutPrefix}` });
      if (found) return found;
    }
  }
  
  return null;
};

module.exports = {
  normalizePhone,
  findPhoneInModel,
};


