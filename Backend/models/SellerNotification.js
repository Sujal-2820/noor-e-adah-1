const mongoose = require('mongoose');

/**
 * Seller Notification Schema
 * 
 * Seller-specific notifications for commissions, tier upgrades, withdrawals, etc.
 * Auto-deletes after 24 hours
 */
const sellerNotificationSchema = new mongoose.Schema({
    notificationId: {
        type: String,
        unique: true,
        sparse: true,
        trim: true,
        uppercase: true,
        // Format: SNOT-101, SNOT-102, etc.
    },
     {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Seller',
        required: [true, 'Seller ID is required'],
    },
    type: {
        type: String,
        enum: [
            'commission_earned',
            'tier_upgraded',
            'tier_downgraded',
            'withdrawal_approved',
            'withdrawal_rejected',
            'withdrawal_paid',
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
    // Reference to related entity
    relatedEntityType: {
        type: String,
        enum: ['commission', 'withdrawal', 'seller', 'none'],
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
    // Additional data
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
sellerNotificationSchema.index({  1, read: 1, createdAt: -1 });
sellerNotificationSchema.index({  1, createdAt: -1 });
sellerNotificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
sellerNotificationSchema.index({ type: 1, createdAt: -1 });

// Pre-save hook: Set expiresAt if not set
sellerNotificationSchema.pre('save', function (next) {
    if (!this.expiresAt) {
        this.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    }
    next();
});

// Static method: Clean up expired notifications
sellerNotificationSchema.statics.cleanupExpired = async function () {
    const now = new Date();
    const result = await this.deleteMany({ expiresAt: { $lt: now } });
    return result;
};

// Static method: Create notification for seller
sellerNotificationSchema.statics.createNotification = async function (data) {
    const {
        sellerId,
        type,
        title,
        message,
        relatedEntityType = 'none',
        relatedEntityId = null,
        priority = 'normal',
        metadata = {},
    } = data;

    const notification = await this.create({
        sellerId,
        type,
        title,
        message,
        relatedEntityType,
        relatedEntityId,
        priority,
        metadata,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    // Trigger Push Notification (Async - Non-blocking)
    try {
        const { sendToUser } = require('../services/pushNotificationService');
        sendToUser(sellerId, 'seller', {
            title,
            body: message,
            data: {
                type,
                relatedEntityType,
                relatedEntityId: relatedEntityId ? relatedEntityId.toString() : null
            }
        }).catch(err => console.error('Push Notification Error (Seller):', err.message));
    } catch (err) {
        console.warn('Push Notification Service not available:', err.message);
    }

    return notification;
};

// Instance method: Mark as read
sellerNotificationSchema.methods.markAsRead = async function () {
    this.read = true;
    this.readAt = new Date();
    return this.save();
};

const SellerNotification = mongoose.model('SellerNotification', sellerNotificationSchema);

module.exports = SellerNotification;
