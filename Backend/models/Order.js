const mongoose = require('mongoose');
const { ORDER_STATUS, PAYMENT_STATUS, DELIVERY_CHARGE, DELIVERY_TIMELINE_HOURS } = require('../utils/constants');

/**
 * Order Schema
 * 
 * User orders with partial fulfillment support
 * Supports order splitting when User partially accepts
 * Tracks status, payments, and delivery information
 */
const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true,
    required: true,
    uppercase: true,
    // Format: ORD-YYYYMMDD-XXXX (e.g., ORD-20240115-0001)
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    // The customer
  },
  assignedUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    // The fulfiller (formerly Vendor)
  },
  assignedTo: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
    // Determines who fulfills the order (user or admin)
  },
  // Order items
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
      min: [0, 'Price cannot be negative'],
    },
    totalPrice: {
      type: Number,
      required: true,
      min: [0, 'Total price cannot be negative'],
    },
    variantAttributes: {
      type: Map,
      of: String,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending',
    },
  }],
  subtotal: {
    type: Number,
    required: true,
    min: [0, 'Subtotal cannot be negative'],
  },
  deliveryCharge: {
    type: Number,
    default: 0,
    min: [0, 'Delivery charge cannot be negative'],
  },
  deliveryChargeWaived: {
    type: Boolean,
    default: false,
  },
  totalAmount: {
    type: Number,
    required: true,
    min: [0, 'Total amount cannot be negative'],
  },
  paymentStatus: {
    type: String,
    enum: Object.values(PAYMENT_STATUS),
    default: PAYMENT_STATUS.PENDING,
  },
  paymentMethod: {
    type: String,
    enum: ['razorpay', 'cod'],
    default: 'razorpay',
  },
  paymentDetails: {
    razorpayOrderId: String,
    razorpayPaymentId: String,
    razorpaySignature: String,
  },
  deliveryAddress: {
    name: String,
    address: String,
    city: String,
    state: String,
    pincode: String,
    phone: String,
    coordinates: {
      lat: Number,
      lng: Number,
    },
  },
  status: {
    type: String,
    enum: Object.values(ORDER_STATUS),
    default: ORDER_STATUS.AWAITING,
  },
  statusTimeline: [{
    status: {
      type: String,
      enum: Object.values(ORDER_STATUS),
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    note: String,
    updatedBy: {
      type: String,
      enum: ['system', 'user', 'admin'],
      default: 'system',
    },
  }],
  isPartialFulfillment: {
    type: Boolean,
    default: false,
  },
  expectedDeliveryDate: {
    type: Date,
  },
  deliveredAt: Date,
  trackingNumber: {
    type: String,
    trim: true,
  },
  cancelledAt: Date,
  cancellationReason: String,
  cancelledBy: {
    type: String,
    enum: ['user', 'admin'],
  },
  notes: {
    type: String,
    trim: true,
  },
  stockDeducted: {
    type: Boolean,
    default: false,
  },
  orderSource: {
    type: String,
    enum: ['cart', 'direct'],
    default: 'cart',
  },
  acceptanceGracePeriod: {
    isActive: { type: Boolean, default: false },
    acceptedAt: Date,
    expiresAt: Date,
    confirmedAt: Date,
    cancelledAt: Date,
    previousStatus: String,
  },
  escalation: {
    isEscalated: { type: Boolean, default: false },
    escalatedAt: Date,
    escalatedBy: String,
    escalationReason: String,
    escalationType: { type: String, enum: ['full', 'partial'] },
    originalassignedUserId: mongoose.Schema.Types.ObjectId,
  }
}, {
  timestamps: true,
});

// Indexes
orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ assignedUserId: 1, status: 1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ assignedTo: 1, status: 1 });

orderSchema.pre('save', async function (next) {
  if (!this.orderNumber && this.isNew) {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const OrderModel = this.constructor;
    const todayCount = await OrderModel.countDocuments({
      createdAt: { $gte: new Date(date.setHours(0, 0, 0, 0)), $lte: new Date(date.setHours(23, 59, 59, 999)) },
    });
    const sequence = String(todayCount + 1).padStart(4, '0');
    this.orderNumber = `ORD-${dateStr}-${sequence}`;
  }

  if (!this.expectedDeliveryDate && this.isNew) {
    this.expectedDeliveryDate = new Date(Date.now() + DELIVERY_TIMELINE_HOURS * 60 * 60 * 1000);
  }

  if (this.items && this.items.length > 0) {
    this.subtotal = this.items.reduce((sum, item) => sum + item.totalPrice, 0);
  }
  this.totalAmount = this.subtotal + (this.deliveryCharge || 0);

  if (this.isModified('status') && this.status) {
    this.statusTimeline.push({
      status: this.status,
      timestamp: new Date(),
      updatedBy: 'system',
    });
  }
  next();
});

orderSchema.methods.canBeCancelled = function () {
  return [ORDER_STATUS.PENDING, ORDER_STATUS.AWAITING].includes(this.status);
};

orderSchema.methods.isDelivered = function () {
  return this.status === ORDER_STATUS.DELIVERED;
};

orderSchema.methods.isPaymentComplete = function () {
  return this.paymentStatus === PAYMENT_STATUS.FULLY_PAID;
};

const Order = mongoose.model('Order', orderSchema);
module.exports = Order;
