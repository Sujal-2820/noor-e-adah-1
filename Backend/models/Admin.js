const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * Admin Schema
 * 
 * Super Admin accounts are created by system administrators only (no public registration)
 * Two-step authentication: Phone/Password + OTP
 */
const adminSchema = new mongoose.Schema({
  adminId: {
    type: String,
    unique: true,
    trim: true,
    uppercase: true,
    // Format: ADM-101, ADM-102, etc.
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    unique: true,
    trim: true,
    match: [/^\+?[1-9]\d{1,14}$/, 'Please provide a valid phone number'],
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false, // Don't return password by default
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
  },
  role: {
    type: String,
    enum: ['super_admin', 'admin', 'manager'],
    default: 'admin',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  lastLogin: {
    type: Date,
  },
  otp: {
    code: String,
    expiresAt: Date,
  },
  fcmTokenWeb: {
    type: String,
    default: null,
  },
  fcmTokenApp: {
    type: String,
    default: null,
  },
}, {
  timestamps: true,
});

// Hash password before saving
adminSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
adminSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Generate and store OTP (always generates a new unique OTP)
adminSchema.methods.generateOTP = function () {
  // Use crypto for better randomness (fallback to Math.random if not available)
  let code;
  try {
    const crypto = require('crypto');
    // Generate truly random 6-digit code
    const randomBytes = crypto.randomBytes(3);
    const randomNumber = randomBytes.readUIntBE(0, 3);
    code = (100000 + (randomNumber % 900000)).toString().padStart(6, '0');
  } catch (error) {
    // Fallback to Math.random if crypto is not available
    code = Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Always generate a new OTP (overwrite existing)
  this.otp = {
    code,
    expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
  };
  return code;
};

// Verify OTP
adminSchema.methods.verifyOTP = function (code) {
  if (!this.otp || !this.otp.code) return false;
  if (Date.now() > this.otp.expiresAt) return false;
  return this.otp.code === code;
};

// Clear OTP after use
adminSchema.methods.clearOTP = function () {
  this.otp = undefined;
};

const Admin = mongoose.model('Admin', adminSchema);

module.exports = Admin;

