const mongoose = require('mongoose');

/**
 * Payment History Schema
 * 
 * Tracks all payment-related activities for admin audit and history:
 * - User payments (advance, remaining)
 * - User earnings (from orders)
 * - Seller commissions (from orders)
 * - Withdrawal requests (User and seller)
 * - Bank account operations
 */
const paymentHistorySchema = new mongoose.Schema({
  historyId: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    uppercase: true,
    // Format: PH-101, PH-102, etc.
  },
  // Activity type
  activityType: {
    type: String,
    required: [true, 'Activity type is required'],
    enum: [
      'user_payment_advance',      // User paid advance payment
      'user_payment_remaining',     // User paid remaining payment
      'user_earning_credited',   // User earning credited from order
      'user_withdrawal_requested',  // User requested withdrawal
      'user_withdrawal_approved', // User withdrawal approved
      'user_withdrawal_rejected', // User withdrawal rejected
      'user_withdrawal_completed', // User withdrawal completed
      'user_credit_repayment',    // User credit repayment to admin
      'bank_account_added',         // Bank account added
      'bank_account_updated',       // Bank account updated
      'bank_account_deleted',       // Bank account deleted
    ],
  },

  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    // Optional - only for order-related activities
  },
  paymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment',
    // Optional - only for payment-related activities
  },
  withdrawalRequestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WithdrawalRequest',
    // Optional - only for withdrawal-related activities
  },
  bankAccountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BankAccount',
    // Optional - only for bank account operations
  },
  userEarningId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserEarning',
    // Optional - only for User earnings
  },

  // Amount information
  amount: {
    type: Number,
    required: true,
    min: [0, 'Amount cannot be negative'],
  },
  currency: {
    type: String,
    default: 'INR',
  },

  // Status
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled', 'rejected', 'credited', 'requested', 'approved'],
    default: 'completed',
  },

  // Payment method (for user payments)
  paymentMethod: {
    type: String,
    enum: ['razorpay', 'cash', 'bank_transfer', 'upi', 'other'],
    // Optional
  },

  // Bank account details (for withdrawals)
  bankDetails: {
    accountHolderName: String,
    accountNumber: String,
    ifscCode: String,
    bankName: String,
  },

  // Additional metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    // Store additional context like order number, User name, etc.
  },

  // Description/notes
  description: {
    type: String,
    trim: true,
  },

  // Admin who processed (for withdrawals)
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    // Optional - only for admin-processed activities
  },

  // Timestamps
  processedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Indexes for efficient querying
paymentHistorySchema.index({ activityType: 1, createdAt: -1 });
paymentHistorySchema.index({ userId: 1, createdAt: -1 });
paymentHistorySchema.index({ orderId: 1 });
paymentHistorySchema.index({ withdrawalRequestId: 1 });
paymentHistorySchema.index({ createdAt: -1 }); // For admin history view
// Note: historyId already has an index from unique: true

// Virtual for formatted activity description
paymentHistorySchema.virtual('formattedDescription').get(function () {
  if (this.description) return this.description;

  const typeMap = {
    'user_payment_advance': `User paid advance payment of ₹${this.amount}`,
    'user_payment_remaining': `User paid remaining payment of ₹${this.amount}`,
    'user_earning_credited': `User earning of ₹${this.amount} credited`,
    'user_withdrawal_requested': `User requested withdrawal of ₹${this.amount}`,
    'user_withdrawal_approved': `User withdrawal of ₹${this.amount} approved`,
    'user_withdrawal_rejected': `User withdrawal of ₹${this.amount} rejected`,
    'user_withdrawal_completed': `User withdrawal of ₹${this.amount} completed`,
    'bank_account_added': 'Bank account added',
    'bank_account_updated': 'Bank account updated',
    'bank_account_deleted': 'Bank account deleted',
  };

  return typeMap[this.activityType] || 'Payment activity';
});

const PaymentHistory = mongoose.model('PaymentHistory', paymentHistorySchema);

module.exports = PaymentHistory;

