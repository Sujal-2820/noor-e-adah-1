const mongoose = require('mongoose');

/**
 * Seller Change Request Schema
 * 
 * Handles requests from sellers to change their name or phone number
 * Requires admin approval before changes are applied
 */
const sellerChangeRequestSchema = new mongoose.Schema({
  requestId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    // Format: SCR-1001
  },
   {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Seller',
    required: [true, 'Seller ID is required'],
  },
  sellerIdCode: {
    type: String,
    required: true,
    // Seller's sellerId code (e.g., SLR-101)
  },
  changeType: {
    type: String,
    enum: ['name', 'phone'],
    required: [true, 'Change type is required'],
  },
  currentValue: {
    type: String,
    required: [true, 'Current value is required'],
  },
  requestedValue: {
    type: String,
    required: [true, 'Requested value is required'],
  },
  description: {
    type: String,
    trim: true,
    // Optional description/reason for the change
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
  },
  reviewedAt: Date,
  rejectionReason: {
    type: String,
    trim: true,
  },
}, {
  timestamps: true,
});

// Index for efficient queries
sellerChangeRequestSchema.index({  1, status: 1 });
sellerChangeRequestSchema.index({ status: 1, createdAt: -1 });

const SellerChangeRequest = mongoose.model('SellerChangeRequest', sellerChangeRequestSchema);

module.exports = SellerChangeRequest;

