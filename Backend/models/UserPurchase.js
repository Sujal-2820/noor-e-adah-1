const mongoose = require('mongoose');

/**
 * User Purchase Schema (Stock Orders)
 * 
 * Users purchase products from the admin/platform to stock their local inventory
 */
const userPurchaseSchema = new mongoose.Schema({
  orderId: {
    type: String,
    unique: true,
    uppercase: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
  },
  items: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    productName: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1'],
    },
    unitPrice: {
      type: Number,
      required: true,
    },
    totalPrice: {
      type: Number,
      required: true,
    },
    variantAttributes: {
      type: Map,
      of: String,
    },
  }],
  subtotal: {
    type: Number,
    required: true,
  },
  deliveryCharge: {
    type: Number,
    default: 0,
  },
  totalAmount: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'processing', 'dispatched', 'delivered', 'cancelled'],
    default: 'pending',
  },
  deliveryStatus: {
    type: String,
    enum: ['pending', 'processing', 'shipped', 'delivered'],
    default: 'pending',
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed'],
    default: 'pending',
  },
  paymentMethod: {
    type: String,
    default: 'offline',
  },
  deliveryNotes: {
    type: String,
    trim: true,
  },
  adminRemarks: {
    type: String,
    trim: true,
  },
  expectedDeliveryDate: Date,
  deliveredAt: Date,
  trackingNumber: String,
}, {
  timestamps: true,
});

// Auto-generate orderId
userPurchaseSchema.pre('save', async function (next) {
  if (this.isNew && !this.orderId) {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const count = await this.constructor.countDocuments({
      createdAt: {
        $gte: new Date(date.setHours(0, 0, 0, 0)),
        $lte: new Date(date.setHours(23, 59, 59, 999))
      }
    });
    const sequence = String(count + 1).padStart(3, '0');
    this.orderId = `UP-${dateStr}-${sequence}`;
  }
  next();
});

const UserPurchase = mongoose.model('UserPurchase', userPurchaseSchema);
module.exports = UserPurchase;
