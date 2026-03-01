const axios = require('axios');

/**
 * SMSIndia Hub SMS Service for Canx International
 * Handles OTP sending via SMSIndia Hub API
 */
class SMSIndiaHubService {
  constructor() {
    this.apiKey = process.env.SMSINDIAHUB_API_KEY;
    this.senderId = process.env.SMSINDIAHUB_SENDER_ID || 'SMSHUB';
    this.baseUrl = 'https://cloud.smsindiahub.in/Usersms/pushsms.aspx';

    // Test phone numbers that should bypass SMS and use default OTP 123456
    this.testPhoneNumbers = ['9685974247', '9981331303', '9755620716', '+919685974247', '+919981331303', '+919755620716', '919685974247', '919981331303', '919755620716'];
    this.defaultTestOTP = '123456';

    if (!this.apiKey) {
      console.warn('⚠️ SMSINDIAHUB_API_KEY is not configured');
    }
  }

  /**
   * Check if phone number is in test bypass list
   * @param {string} phone - Phone number to check
   * @returns {boolean}
   */
  isTestPhoneNumber(phone) {
    if (!phone) return false;
    // Normalize phone number for comparison
    const digits = phone.replace(/[^0-9]/g, '');
    const last10Digits = digits.slice(-10); // Get last 10 digits
    return this.testPhoneNumbers.some(testNum => {
      const testDigits = testNum.replace(/[^0-9]/g, '');
      const testLast10 = testDigits.slice(-10);
      return testLast10 === last10Digits;
    });
  }

  /**
   * Check if SMSIndia Hub is properly configured
   * @returns {boolean}
   */
  isConfigured() {
    const apiKey = this.apiKey || process.env.SMSINDIAHUB_API_KEY;
    return !!apiKey;
  }

  /**
   * Normalize phone number to Indian format with country code
   * @param {string} phone - Phone number to normalize
   * @returns {string} - Normalized phone number with country code (91XXXXXXXXXX)
   */
  normalizePhoneNumber(phone) {
    // Remove all non-digit characters
    const digits = phone.replace(/[^0-9]/g, '');

    // If it already has country code 91 and is 12 digits, return as is
    if (digits.startsWith('91') && digits.length === 12) {
      return digits;
    }

    // If it's 10 digits, add country code 91
    if (digits.length === 10) {
      return '91' + digits;
    }

    // If it's 11 digits and starts with 0, remove the 0 and add country code
    if (digits.length === 11 && digits.startsWith('0')) {
      return '91' + digits.substring(1);
    }

    // Return with country code as fallback
    return '91' + digits.slice(-10);
  }

  /**
   * Send OTP via SMS using SMSIndia Hub
   * @param {string} phone - Phone number to send SMS to
   * @param {string} otp - OTP code to send
   * @param {string} purpose - Purpose of OTP (registration, login, etc.)
   * @returns {Promise<Object>} - Response object
   */
  async sendOTP(phone, otp, purpose = 'registration') {
    try {
      // Check if this is a test phone number - bypass SMS sending
      if (this.isTestPhoneNumber(phone)) {
        console.log(`📱 Test phone number detected: ${phone}. Skipping SMS, using default OTP: ${this.defaultTestOTP}`);
        return {
          success: true,
          messageId: `test_${Date.now()}`,
          status: 'bypassed',
          to: phone,
          body: `Test OTP: ${this.defaultTestOTP}`,
          provider: 'Test Mode',
          isTestNumber: true,
          defaultOTP: this.defaultTestOTP
        };
      }

      const apiKey = this.apiKey || process.env.SMSINDIAHUB_API_KEY;
      const senderId = this.senderId || process.env.SMSINDIAHUB_SENDER_ID || 'SMSHUB';

      if (!apiKey) {
        throw new Error('SMSIndia Hub not configured. Please check your environment variables.');
      }

      const normalizedPhone = this.normalizePhoneNumber(phone);

      // Validate phone number (should be 12 digits with country code)
      if (normalizedPhone.length !== 12 || !normalizedPhone.startsWith('91')) {
        throw new Error(`Invalid phone number format: ${phone}. Expected 10-digit Indian mobile number.`);
      }

      // CRITICAL: This template must match what is approved in your SMSIndia Hub / DLT portal.
      // If you change the name to 'Canx International' here, ensure the template is updated and approved there too.
      const message = `Welcome to Noor E Adah powered by SMSINDIAHUB. Your OTP for registration is ${otp}`;

      // Build the API URL with query parameters
      const params = new URLSearchParams({
        APIKey: apiKey,
        msisdn: normalizedPhone,
        sid: senderId,
        msg: message,
        fl: '0', // Flash message flag (0 = normal SMS)
        dc: '0', // Delivery confirmation (0 = no confirmation)
        gwid: '2' // Gateway ID (2 = transactional)
      });

      const apiUrl = `${this.baseUrl}?${params.toString()}`;

      // Make GET request to SMSIndia Hub API
      const response = await axios.get(apiUrl, {
        headers: {
          'User-Agent': 'NOOR_E_ADAH/1.0',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        },
        timeout: 15000 // 15 second timeout
      });

      // SMSIndia Hub returns JSON response
      const responseData = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;

      // Check for success indicators in the response
      if (responseData.ErrorCode === '000' && responseData.ErrorMessage === 'Done') {
        const messageId = responseData.MessageData && responseData.MessageData[0]
          ? responseData.MessageData[0].MessageId
          : `sms_${Date.now()}`;

        return {
          success: true,
          messageId: messageId,
          jobId: responseData.JobId,
          status: 'sent',
          to: normalizedPhone,
          body: message,
          provider: 'SMSIndia Hub',
          response: responseData
        };
      } else if (responseData.ErrorCode && responseData.ErrorCode !== '000') {
        throw new Error(`SMSIndia Hub API error: ${responseData.ErrorMessage} (Code: ${responseData.ErrorCode})`);
      } else {
        // Fallback for unexpected response format
        return {
          success: true,
          messageId: `sms_${Date.now()}`,
          status: 'sent',
          to: normalizedPhone,
          body: message,
          provider: 'SMSIndia Hub',
          response: responseData
        };
      }

    } catch (error) {
      // Handle specific error cases
      if (error.response) {
        const errorData = error.response.data;

        if (error.response.status === 401) {
          throw new Error('SMSIndia Hub authentication failed. Please check your API key.');
        } else if (error.response.status === 400) {
          throw new Error(`SMSIndia Hub request error: Invalid request parameters`);
        } else if (error.response.status === 429) {
          throw new Error('SMSIndia Hub rate limit exceeded. Please try again later.');
        } else if (error.response.status === 500) {
          throw new Error('SMSIndia Hub server error. Please try again later.');
        } else {
          throw new Error(`SMSIndia Hub API error (${error.response.status}): ${errorData}`);
        }
      } else if (error.code === 'ECONNABORTED') {
        throw new Error('SMSIndia Hub request timeout. Please try again.');
      } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        throw new Error('Unable to connect to SMSIndia Hub service. Please check your internet connection.');
      } else if (error.code === 'ECONNRESET') {
        throw new Error('SMSIndia Hub connection was reset. Please try again.');
      }

      throw error;
    }
  }

  /**
   * Send custom SMS message
   * @param {string} phone - Phone number to send SMS to
   * @param {string} message - Custom message to send
   * @returns {Promise<Object>} - Response object
   */
  async sendCustomSMS(phone, message) {
    try {
      const apiKey = this.apiKey || process.env.SMSINDIAHUB_API_KEY;
      const senderId = this.senderId || process.env.SMSINDIAHUB_SENDER_ID || 'SMSHUB';

      if (!apiKey) {
        throw new Error('SMSIndia Hub not configured. Please check your environment variables.');
      }

      const normalizedPhone = this.normalizePhoneNumber(phone);

      // Validate phone number
      if (normalizedPhone.length !== 12 || !normalizedPhone.startsWith('91')) {
        throw new Error(`Invalid phone number format: ${phone}. Expected 10-digit Indian mobile number.`);
      }

      // Build the API URL with query parameters
      const params = new URLSearchParams({
        APIKey: apiKey,
        msisdn: normalizedPhone,
        sid: senderId,
        msg: message,
        fl: '0',
        dc: '0',
        gwid: '2'
      });

      const apiUrl = `${this.baseUrl}?${params.toString()}`;

      // Make GET request to SMSIndia Hub API
      const response = await axios.get(apiUrl, {
        headers: {
          'User-Agent': 'NOOR_E_ADAH/1.0',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        },
        timeout: 15000
      });

      const responseData = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;

      if (responseData.ErrorCode === '000' && responseData.ErrorMessage === 'Done') {
        return {
          success: true,
          messageId: responseData.MessageData?.[0]?.MessageId || `sms_${Date.now()}`,
          status: 'sent',
          to: normalizedPhone,
          body: message,
          provider: 'SMSIndia Hub'
        };
      } else {
        throw new Error(`SMSIndia Hub API error: ${responseData.ErrorMessage || 'Unknown error'}`);
      }

    } catch (error) {
      throw error;
    }
  }
}

// Create singleton instance
const smsIndiaHubService = new SMSIndiaHubService();

/**
 * Helper function to check if phone is a test number and get default OTP
 * @param {string} phone - Phone number to check
 * @returns {Object} - { isTest: boolean, defaultOTP: string }
 */
const getTestOTPInfo = (phone) => {
  return {
    isTest: smsIndiaHubService.isTestPhoneNumber(phone),
    defaultOTP: smsIndiaHubService.defaultTestOTP
  };
};

module.exports = smsIndiaHubService;
module.exports.getTestOTPInfo = getTestOTPInfo;

