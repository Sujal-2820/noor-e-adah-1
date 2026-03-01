const mongoose = require('mongoose');

/**
 * User Earning Schema
 * 
 * Tracks user earnings from price differences (Public Price - User Purchase Price)
 * Earnings accumulate per order item
 */
const userEarningSchema = new mongoose.Schema({
  earningId: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    uppercase: true,
    // Format: USE-101, USE-102, etc. (Previously VNE)
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: [true, 'Order ID is required'],
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Product ID is required'],
  },
  productName: {
    type: String,
    required: true,
    // Store product name for historical records
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity must be at least 1'],
  },
  publicPrice: {
    type: Number,
    required: true,
    min: [0, 'Public price cannot be negative'],
    // Price paid by customer (per unit)
  },
  userPurchasePrice: {
    type: Number,
    required: true,
    min: [0, 'User purchase price cannot be negative'],
    // Price user paid to admin (per unit)
  },
  earnings: {
    type: Number,
    required: true,
    min: [0, 'Earnings cannot be negative'],
    // (publicPrice - userPurchasePrice) * quantity
  },
  status: {
    type: String,
    enum: ['pending', 'processed', 'withdrawn'],
    default: 'processed',
    // Usually processed immediately when order is completed
  },
  processedAt: {
    type: Date,
    default: Date.now,
  },
  withdrawnAt: {
    type: Date,
    // When this earning was withdrawn
  },
  withdrawalRequestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WithdrawalRequest',
    // Reference to withdrawal request that used this earning
  },
  notes: {
    type: String,
    trim: true,
  },
}, {
  timestamps: true,
});

// Indexes
userEarningSchema.index({ userId: 1, createdAt: -1 }); // User's earnings history
userEarningSchema.index({ orderId: 1 }); // Order's earnings
userEarningSchema.index({ userId: 1, status: 1 }); // User's earnings by status
userEarningSchema.index({ userId: 1, processedAt: -1 }); // User's earnings by processing date

const UserEarning = mongoose.model('UserEarning', userEarningSchema);

module.exports = UserEarning;
