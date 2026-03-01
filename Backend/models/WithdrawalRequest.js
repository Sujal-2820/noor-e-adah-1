const mongoose = require('mongoose');

/**
 * Withdrawal Request Schema
 * 
 * Users and Sellers can request withdrawals from their earnings/wallet balance
 * Admin approves/rejects these requests
 * When approved, User/seller balance is decreased
 */
const withdrawalRequestSchema = new mongoose.Schema({
  withdrawalId: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    uppercase: true,
    // Format: WDR-101, WDR-102, etc.
  },
  // User ID (formerly Vendor ID)
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  amount: {
    type: Number,
    required: [true, 'Withdrawal amount is required'],
    min: [100, 'Minimum withdrawal amount is ₹100'],
  },
  availableBalance: {
    type: Number,
    required: true,
    min: [0, 'Available balance cannot be negative'],
    // Balance at time of request
  },
  bankAccountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BankAccount',
    // Reference to bank account used for withdrawal
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'completed'],
    default: 'pending',
  },
  // Admin actions
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
  },
  reviewedAt: Date,
  adminRemarks: {
    type: String,
    trim: true,
  },
  rejectionReason: {
    type: String,
    trim: true,
  },
  // Payment processing details
  paymentReference: {
    type: String,
    trim: true,
    // Payment reference number after processing
  },
  paymentMethod: {
    type: String,
    enum: ['bank_transfer', 'upi', 'cash', 'razorpay', 'other'],
    default: 'bank_transfer',
  },
  paymentDate: Date,
  processedAt: Date,
  // Razorpay payment gateway details
  gatewayPaymentId: {
    type: String,
    trim: true,
  },
  gatewayOrderId: {
    type: String,
    trim: true,
  },
  gatewaySignature: {
    type: String,
    trim: true,
  },
  // Notes
  notes: {
    type: String,
    trim: true,
  },
}, {
  timestamps: true,
});

// Basic validation - ensuring userId is present
withdrawalRequestSchema.pre('validate', function (next) {
  if (!this.userId) {
    return next(new Error('User ID is required'));
  }
  next();
});

// Indexes
withdrawalRequestSchema.index({ userId: 1, status: 1 }); // User's withdrawals by status
withdrawalRequestSchema.index({ status: 1, createdAt: -1 }); // Pending withdrawals for admin
// Note: withdrawalId already has an index from unique: true

const WithdrawalRequest = mongoose.model('WithdrawalRequest', withdrawalRequestSchema);

module.exports = WithdrawalRequest;

