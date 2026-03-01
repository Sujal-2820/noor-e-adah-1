const mongoose = require('mongoose');

/**
 * Product Assignment Schema
 * 
 * Links Products to Users
 * When Admin assigns a product to a User, it creates an inventory entry for that User
 */
const productAssignmentSchema = new mongoose.Schema({
  assignmentId: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    uppercase: true,
    // Format: PAS-101, PAS-102, etc.
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Product ID is required'],
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
  },
  // Regional assignment (optional)
  region: {
    type: String,
    trim: true,
    // Region/area where this product-User assignment is valid
  },
  // Assignment status
  isActive: {
    type: Boolean,
    default: true,
  },
  // Assignment metadata
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true,
  },
  assignedAt: {
    type: Date,
    default: Date.now,
  },
  // Notes about the assignment
  notes: {
    type: String,
    trim: true,
  },
  // User stock for this product
  stock: {
    type: Number,
    default: 0,
    min: [0, 'Stock cannot be negative'],
  },
  // Track when User manually updated stock (not when admin creates/updates assignment)
  lastManualStockUpdate: {
    type: Date,
    default: null,
  },
  // Variant-specific stock tracking
  attributeStocks: [{
    _id: false, // Don't need separate ID for this subdoc in assignment
    attributes: {
      type: Map,
      of: String,
    },
    stock: {
      type: Number,
      default: 0,
      min: [0, 'Attribute stock cannot be negative'],
    },
    // Optional: track if this variant is active for this User
    isActive: {
      type: Boolean,
      default: true,
    }
  }],
}, {
  timestamps: true,
});

// Compound index: One product can be assigned to one User once
productAssignmentSchema.index({ productId: 1, userId: 1 }, { unique: true });

// Indexes for queries
productAssignmentSchema.index({ userId: 1, isActive: 1 }); // User's active assignments
productAssignmentSchema.index({ productId: 1, isActive: 1 }); // Product's active assignments
// Note: assignmentId already has an index from unique: true

const ProductAssignment = mongoose.model('ProductAssignment', productAssignmentSchema);

module.exports = ProductAssignment;

