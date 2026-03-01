const mongoose = require('mongoose');

/**
 * Bank Account Schema
 * 
 * Stores bank account details for Users and Sellers
 * Used for withdrawal requests
 */
const bankAccountSchema = new mongoose.Schema({
  bankAccountId: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    uppercase: true,
    // Format: BANK-101, BANK-102, etc.
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'User ID is required'],
    // Can be User or Seller ID
  },
  userType: {
    type: String,
    enum: ['User', 'seller'],
    required: [true, 'User type is required'],
  },
  accountHolderName: {
    type: String,
    required: [true, 'Account holder name is required'],
    trim: true,
  },
  accountNumber: {
    type: String,
    required: [true, 'Account number is required'],
    trim: true,
  },
  ifscCode: {
    type: String,
    required: [true, 'IFSC code is required'],
    trim: true,
    uppercase: true,
    match: [/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Please provide a valid IFSC code'],
  },
  bankName: {
    type: String,
    required: [true, 'Bank name is required'],
    trim: true,
  },
  branchName: {
    type: String,
    trim: true,
  },
  isPrimary: {
    type: Boolean,
    default: false,
    // Only one primary account per user
  },
  isVerified: {
    type: Boolean,
    default: false,
    // Admin can verify bank accounts
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
  },
  verifiedAt: Date,
}, {
  timestamps: true,
});

// Indexes
bankAccountSchema.index({ userId: 1, userType: 1 }); // User's bank accounts
bankAccountSchema.index({ userId: 1, userType: 1, isPrimary: 1 }); // Primary account lookup
// Note: bankAccountId already has an index from unique: true

// Ensure only one primary account per user
bankAccountSchema.pre('save', async function (next) {
  if (this.isPrimary && this.isModified('isPrimary')) {
    // Unset other primary accounts for this user
    await mongoose.model('BankAccount').updateMany(
      {
        userId: this.userId,
        userType: this.userType,
        _id: { $ne: this._id },
        isPrimary: true,
      },
      { isPrimary: false }
    );
  }
  next();
});

const BankAccount = mongoose.model('BankAccount', bankAccountSchema);

module.exports = BankAccount;

