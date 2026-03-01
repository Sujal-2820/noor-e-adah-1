const smsIndiaHubService = require('../services/smsIndiaHubService');

/**
 * Send OTP via SMS using SMSIndia Hub
 * @param {string} phone - Phone number to send SMS to
 * @param {string} otp - OTP code to send
 * @param {string} purpose - Purpose of OTP (registration, login, etc.)
 * @returns {Promise<Object>} - Response object
 */
const sendOTP = async (phone, otp, purpose = 'registration') => {
  try {
    const result = await smsIndiaHubService.sendOTP(phone, otp, purpose);
    
    return result;
    
  } catch (error) {
    // Re-throw the error to be handled by the calling function
    throw new Error(`SMS sending failed: ${error.message}`);
  }
};

module.exports = {
  sendOTP,
};

