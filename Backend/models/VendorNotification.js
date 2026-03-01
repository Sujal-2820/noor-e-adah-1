const mongoose = require('mongoose');

/**
 * User Notification Schema
 * 
 * User-specific notifications for orders, stock, repayments, etc.
 * Auto-deletes after 24 hours
 */
const UserNotificationSchema = new mongoose.Schema({
  notificationId: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    uppercase: true,
    // Format: VNOT-101, VNOT-102, etc.
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
  },
  type: {
    type: String,
    enum: [
      'order_assigned',
      'order_status_changed',
      'stock_arrival',
      'stock_low_alert',
      'credit_purchase_approved',
      'credit_purchase_processing',
      'credit_purchase_dispatched',
      'credit_purchase_delivered',
      'credit_purchase_rejected',
      'repayment_due_reminder',
      'repayment_overdue_alert',
      'repayment_success',
      'repayment_partial',
      'withdrawal_approved',
      'withdrawal_rejected',
      'incentive_earned',
      'incentive_approved',
      'incentive_rejected',
      'admin_announcement',
      'system_alert',
    ],
    required: [true, 'Notification type is required'],
  },
  title: {
    type: String,
    required: [true, 'Notification title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters'],
  },
  message: {
    type: String,
    required: [true, 'Notification message is required'],
    trim: true,
    maxlength: [1000, 'Message cannot exceed 1000 characters'],
  },
  // Reference to related entity (order, purchase, repayment, etc.)
  relatedEntityType: {
    type: String,
    enum: ['order', 'credit_purchase', 'repayment', 'withdrawal', 'stock', 'none'],
  },
  relatedEntityId: {
    type: mongoose.Schema.Types.ObjectId,
    // Polymorphic reference - can reference Order, CreditPurchase, etc.
  },
  // Read status
  read: {
    type: Boolean,
    default: false,
  },
  readAt: {
    type: Date,
  },
  // Priority level
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal',
  },
  // Additional data/metadata
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    // Store additional data like customer name, amount, etc.
  },
  // Auto-delete after 24 hours
  expiresAt: {
    type: Date,
    required: true,
    // Default to 24 hours from creation
    default: function () {
      return new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    },
  },
}, {
  timestamps: true,
});

// Indexes for efficient queries
UserNotificationSchema.index({ userId: 1, read: 1, createdAt: -1 }); // Get unread notifications
UserNotificationSchema.index({ userId: 1, createdAt: -1 }); // Get all notifications by User
UserNotificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // Auto-delete expired notifications
UserNotificationSchema.index({ type: 1, createdAt: -1 }); // Get notifications by type
// Note: notificationId already has an index from unique: true

// Pre-save hook: Set expiresAt to 24 hours from now if not set
UserNotificationSchema.pre('save', function (next) {
  if (!this.expiresAt) {
    this.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  }
  next();
});

// Static method: Clean up expired notifications (older than 24 hours)
UserNotificationSchema.statics.cleanupExpired = async function () {
  const now = new Date();
  const result = await this.deleteMany({ expiresAt: { $lt: now } });
  return result;
};

// Static method: Create notification for User
UserNotificationSchema.statics.createNotification = async function (data) {
  const {
    UserId,
    type,
    title,
    message,
    relatedEntityType = 'none',
    relatedEntityId = null,
    priority = 'normal',
    metadata = {},
  } = data;

  const notification = await this.create({
    UserId,
    type,
    title,
    message,
    relatedEntityType,
    relatedEntityId,
    priority,
    metadata,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
  });

  // Trigger Push Notification (Async - Non-blocking)
  try {
    const { sendToUser } = require('../services/pushNotificationService');
    sendToUser(UserId, 'User', {
      title,
      body: message,
      data: {
        type: String(type),
        relatedEntityType: String(relatedEntityType),
        relatedEntityId: relatedEntityId ? String(relatedEntityId) : ''
      }
    }).catch(err => console.error('Push Notification Error (User):', err.message));
  } catch (err) {
    console.warn('Push Notification Service not available:', err.message);
  }

  return notification;
};

// Instance method: Mark as read
UserNotificationSchema.methods.markAsRead = async function () {
  this.read = true;
  this.readAt = new Date();
  return this.save();
};

const UserNotification = mongoose.model('UserNotification', UserNotificationSchema);

module.exports = UserNotification;



