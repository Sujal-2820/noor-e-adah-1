const mongoose = require('mongoose');
const { PAYMENT_STATUS, PAYMENT_METHODS } = require('../utils/constants');

/**
 * Payment Schema
 * 
 * Tracks all payment transactions
 * Supports advance payments (30%) and remaining payments (70%)
 * Payment gateway integration ready (Razorpay/Paytm/Stripe)
 */
const paymentSchema = new mongoose.Schema({
  paymentId: {
    type: String,
    unique: true,
    required: true,
    uppercase: true,
    // Format: PAY-YYYYMMDD-XXXX or gateway transaction ID
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: [true, 'Order ID is required'],
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
  },
  // Payment type
  paymentType: {
    type: String,
    enum: ['advance', 'remaining', 'full', 'refund'],
    required: true,
  },
  // Amount
  amount: {
    type: Number,
    required: [true, 'Payment amount is required'],
    min: [0, 'Amount cannot be negative'],
  },
  // Payment method
  paymentMethod: {
    type: String,
    enum: Object.values(PAYMENT_METHODS),
    required: true,
  },
  // Payment status
  status: {
    type: String,
    enum: Object.values(PAYMENT_STATUS),
    default: PAYMENT_STATUS.PENDING,
  },
  // Payment gateway information
  gatewayPaymentId: {
    type: String,
    // Gateway transaction ID (Razorpay/Paytm/Stripe)
  },
  gatewayOrderId: {
    type: String,
    // Gateway order ID
  },
  gatewaySignature: {
    type: String,
    // Gateway signature for verification
  },
  // Payment details from gateway
  gatewayResponse: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    // Store full gateway response for reference
  },
  // Refund information
  isRefunded: {
    type: Boolean,
    default: false,
  },
  refundAmount: {
    type: Number,
    default: 0,
  },
  refundId: {
    type: String,
    // Gateway refund ID
  },
  refundedAt: Date,
  refundReason: String,
  // Payment metadata
  paidAt: Date,
  failedAt: Date,
  failureReason: String,
  // Notes
  notes: {
    type: String,
    trim: true,
  },
}, {
  timestamps: true,
});

// Indexes
paymentSchema.index({ orderId: 1, createdAt: -1 }); // Order's payments
paymentSchema.index({ userId: 1, createdAt: -1 }); // User's payments
paymentSchema.index({ status: 1, createdAt: -1 }); // Payments by status
// Note: paymentId already has an index from unique: true
paymentSchema.index({ gatewayPaymentId: 1 }); // Gateway payment lookup

// Pre-save hook: Generate payment ID
paymentSchema.pre('save', async function (next) {
  if (!this.paymentId && this.isNew) {
    try {
      const date = new Date();
      const dateStr = date.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
      
      // Find count of payments created today
      const todayStart = new Date(date);
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(date);
      todayEnd.setHours(23, 59, 59, 999);
      
      // Use this.constructor to get the Payment model
      const PaymentModel = this.constructor;
      const todayCount = await PaymentModel.countDocuments({
        createdAt: { $gte: todayStart, $lte: todayEnd },
      });
      
      const sequence = String(todayCount + 1).padStart(4, '0');
      this.paymentId = `PAY-${dateStr}-${sequence}`;
    } catch (error) {
      // Fallback: generate payment ID without counting
      const date = new Date();
      const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
      const timestamp = Date.now().toString().slice(-6);
      this.paymentId = `PAY-${dateStr}-${timestamp}`;
    }
  }

  // Update timestamps based on status
  if (this.isModified('status')) {
    if (this.status === PAYMENT_STATUS.FULLY_PAID || this.status === PAYMENT_STATUS.PARTIAL_PAID) {
      this.paidAt = new Date();
    } else if (this.status === PAYMENT_STATUS.FAILED) {
      this.failedAt = new Date();
    }
  }

  next();
});

// Instance method: Check if payment is successful
paymentSchema.methods.isSuccessful = function () {
  return this.status === PAYMENT_STATUS.FULLY_PAID || this.status === PAYMENT_STATUS.PARTIAL_PAID;
};

// Instance method: Check if payment is failed
paymentSchema.methods.isFailed = function () {
  return this.status === PAYMENT_STATUS.FAILED;
};

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment;

