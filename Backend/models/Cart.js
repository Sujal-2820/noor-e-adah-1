const mongoose = require('mongoose');

/**
 * Cart Schema
 * 
 * Shopping bag for Users/Customers
 * Stores items temporarily before order creation
 */
const cartSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true,
    unique: true, // One cart per user
  },
  items: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1'],
      default: 1,
    },
    variantAttributes: {
      type: Map,
      of: String,
      default: {},
    },
    addedAt: {
      type: Date,
      default: Date.now,
    }
  }],
}, {
  timestamps: true,
});

// Middleware to prevent empty cart object if no items (optional, but good for clean DB)
// For this implementation, we'll keep the cart object even if it has 0 items

const Cart = mongoose.model('Cart', cartSchema);

module.exports = Cart;
