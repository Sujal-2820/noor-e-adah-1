const mongoose = require('mongoose');

/**
 * User Schema
 * 
 * End consumers (Farmers/Retail Buyers) purchasing fertilizers
 * OTP-based authentication
 * Can link IRA Partner ID for commission tracking
 */
const userSchema = new mongoose.Schema({
  userId: {
    type: String,
    unique: true,
    trim: true,
    uppercase: true,
    // Format: USR-101, USR-102, etc.
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    unique: true,
    trim: true,
    match: [/^\+?[1-9]\d{9,14}$/, 'Please provide a valid phone number'],
  },
  email: {
    type: String,
    lowercase: true,
    trim: true,
    sparse: true, // Allow null/undefined but ensure uniqueness when present
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
  },
   {
    type: String,
    trim: true,
    // Links to IRA Partner ID for commission tracking
    // Optional - can be added/updated later
  },
   {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Seller',
    // Reference to Seller (IRA Partner) for commission tracking
  },
  location: {
    address: String,
    city: String,
    state: String,
    pincode: String,
    coordinates: {
      lat: Number,
      lng: Number,
    },
  },
  assignedUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    // User assigned based on location (20km radius)
  },
  language: {
    type: String,
    enum: ['en', 'hi', 'mr'], // English, Hindi, Marathi
    default: 'en',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  isBlocked: {
    type: Boolean,
    default: false,
  },
  otp: {
    code: String,
    expiresAt: Date,
  },
  // Temporary fields for phone update process
  tempPhoneUpdateVerified: {
    type: Boolean,
    default: false,
  },
  tempNewPhone: {
    type: String,
    trim: true,
  },
  fcmTokenWeb: {
    type: String,
    trim: true,
  },
  fcmTokenApp: {
    type: String,
    trim: true,
  },
}, {
  timestamps: true,
});

// Index for sellerId-based queries
userSchema.index({  1 });
// Note: phone and userId already have indexes from unique: true

// Generate and store OTP
userSchema.methods.generateOTP = function () {
  // Clear any existing OTP first
  this.clearOTP();

  // Generate a 6-digit OTP using crypto for better randomness
  let code = Math.floor(100000 + Math.random() * 900000).toString(); // Fallback
  try {
    const crypto = require('crypto');
    code = crypto.randomInt(100000, 999999).toString();
  } catch (e) {
    console.warn('Crypto not available, falling back to Math.random for OTP generation.');
  }

  this.otp = {
    code,
    expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
  };
  return code;
};

// Verify OTP
userSchema.methods.verifyOTP = function (code) {
  if (!this.otp || !this.otp.code) return false;
  if (Date.now() > this.otp.expiresAt) return false;
  return this.otp.code === code;
};

// Clear OTP after use
userSchema.methods.clearOTP = function () {
  this.otp = undefined;
};

const User = mongoose.model('User', userSchema);

module.exports = User;

