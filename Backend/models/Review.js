const mongoose = require('mongoose');

/**
 * Review Schema
 * 
 * Product reviews and ratings by users
 * Admin can respond to reviews
 */
const reviewSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Product ID is required'],
    index: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true,
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    // Optional: Link review to specific order
  },
  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating must be at most 5'],
  },
  comment: {
    type: String,
    trim: true,
    maxlength: [1000, 'Comment cannot exceed 1000 characters'],
  },
  // Admin response to the review
  adminResponse: {
    response: {
      type: String,
      trim: true,
      maxlength: [1000, 'Admin response cannot exceed 1000 characters'],
    },
    respondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
    },
    respondedAt: {
      type: Date,
    },
  },
  // Review status
  isApproved: {
    type: Boolean,
    default: true,
    // Reviews are approved by default, admin can moderate if needed
  },
  isVisible: {
    type: Boolean,
    default: true,
    // Admin can hide inappropriate reviews
  },
  // Helpful votes (future feature)
  helpfulCount: {
    type: Number,
    default: 0,
    min: 0,
  },
}, {
  timestamps: true,
});

// Compound index to ensure one review per user per product
reviewSchema.index({ productId: 1, userId: 1 }, { unique: true });

// Index for product reviews query
reviewSchema.index({ productId: 1, isVisible: 1, isApproved: 1, createdAt: -1 });

// Index for user reviews query
reviewSchema.index({ userId: 1, createdAt: -1 });

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;

