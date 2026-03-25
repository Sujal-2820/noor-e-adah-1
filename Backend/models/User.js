const mongoose = require('mongoose');

/**
 * User Schema
 * 
 * Registration requires location verification via Google Maps API
 */
const userSchema = new mongoose.Schema({
  userId: {
    type: String,
    unique: true,
    trim: true,
    uppercase: true,
    // Format: USR-101, USR-102, etc. (Previously USR-101)
  },
  userType: {
    type: String,
    enum: ['partner', 'customer'],
    default: 'customer',
  },
  role: {
    type: String,
    enum: ['user', 'customer'],
    default: 'customer',
  },
  name: {
    type: String,
    trim: true,
  },
  phone: {
    type: String,
    unique: true,
    trim: true,
    sparse: true, // Allow multiple nulls for uniqueness
  },
  email: {
    type: String,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
  },
  firebaseUid: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
  },

  // ============================================================================
  // ENHANCED REGISTRATION FIELDS
  // ============================================================================

  firstName: {
    type: String,
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters'],
  },
  lastName: {
    type: String,
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters'],
  },

  location: {
    address: {
      type: String,
      required: false,
    },
    city: String,
    state: String,
    pincode: String,
    coordinates: {
      lat: { type: Number, required: false },
      lng: { type: Number, required: false },
    },
  },
  // Ban management
  banInfo: {
    isBanned: {
      type: Boolean,
      default: false,
    },
    banType: {
      type: String,
      enum: ['none', 'temporary', 'permanent'],
      default: 'none',
    },
    bannedAt: Date,
    bannedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
    },
    banReason: String,
    banExpiry: Date,
    revokedAt: Date,
    revokedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
    },
    revocationReason: String,
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
  deletedAt: Date,
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
  },
  deletionReason: String,
  otp: {
    code: String,
    expiresAt: Date,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  // Terms and conditions acceptance
  termsAccepted: {
    type: Boolean,
    default: false,
  },
  termsAcceptedAt: {
    type: Date,
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

// Index for location-based queries
userSchema.index({ 'location.coordinates': '2dsphere' });

// Generate and store OTP
userSchema.methods.generateOTP = function () {
  let code;
  try {
    const crypto = require('crypto');
    const randomBytes = crypto.randomBytes(3);
    const randomNumber = randomBytes.readUIntBE(0, 3);
    code = (100000 + (randomNumber % 900000)).toString().padStart(6, '0');
  } catch (error) {
    code = Math.floor(100000 + Math.random() * 900000).toString();
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

