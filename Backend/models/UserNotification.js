const mongoose = require('mongoose');

/**
 * User Notification Schema
 * 
 * User-specific notifications for orders, stock, repayments, etc.
 * Auto-deletes after 24 hours
 */
const userNotificationSchema = new mongoose.Schema({
    notificationId: {
        type: String,
        unique: true,
        sparse: true,
        trim: true,
        uppercase: true,
        // Format: UNOT-101, UNOT-102, etc. (Previously VNOT)
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
        // Polymorphic reference
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
    },
    // Auto-delete after 24 hours
    expiresAt: {
        type: Date,
        required: true,
        default: function () {
            return new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        },
    },
}, {
    timestamps: true,
});

// Indexes for efficient queries
userNotificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
userNotificationSchema.index({ userId: 1, createdAt: -1 });
userNotificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
userNotificationSchema.index({ type: 1, createdAt: -1 });

// Pre-save hook: Set expiresAt
userNotificationSchema.pre('save', function (next) {
    if (!this.expiresAt) {
        this.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    }
    next();
});

// Static method: Clean up expired
userNotificationSchema.statics.cleanupExpired = async function () {
    const now = new Date();
    return await this.deleteMany({ expiresAt: { $lt: now } });
};

// Static method: Create notification
userNotificationSchema.statics.createNotification = async function (data) {
    const {
        userId,
        type,
        title,
        message,
        relatedEntityType = 'none',
        relatedEntityId = null,
        priority = 'normal',
        metadata = {},
    } = data;

    const notification = await this.create({
        userId,
        type,
        title,
        message,
        relatedEntityType,
        relatedEntityId,
        priority,
        metadata,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    // Trigger Push Notification
    try {
        const { sendToUser } = require('../services/pushNotificationService');
        sendToUser(userId, 'user', {
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

// Static method: Create order status notification
userNotificationSchema.statics.createOrderStatusNotification = async function (userId, order, status) {
    const title = `Order Status: ${status.toUpperCase()}`;
    const message = `Your order ${order.orderNumber} is now ${status}.`;

    return this.createNotification({
        userId,
        type: 'order_status_changed',
        title,
        message,
        relatedEntityType: 'order',
        relatedEntityId: order._id,
        priority: 'normal',
        metadata: {
            orderNumber: order.orderNumber,
            status: status
        }
    });
};

// Instance method: Mark as read
userNotificationSchema.methods.markAsRead = async function () {
    this.read = true;
    this.readAt = new Date();
    return this.save();
};

const UserNotification = mongoose.model('UserNotification', userNotificationSchema);

module.exports = UserNotification;
