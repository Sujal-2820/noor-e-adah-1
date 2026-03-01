const mongoose = require('mongoose');

const pushNotificationLogSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    message: {
        type: String,
        required: true,
        trim: true
    },
    targetAudience: {
        type: String,
        required: true
    },
    selecteduserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    priority: {
        type: String,
        default: 'normal'
    },
    imageUrl: String,
    status: {
        type: String,
        enum: ['pending', 'delivered', 'failed'],
        default: 'pending'
    },
    sentAt: {
        type: Date,
        default: Date.now
    },
    deliveredCount: {
        type: Number,
        default: 0
    },
    failedCount: {
        type: Number,
        default: 0
    },
    openedCount: {
        type: Number,
        default: 0
    },
    sentBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        required: true
    },
    // Raw response from Firebase for debugging
    firebaseResponse: mongoose.Schema.Types.Mixed
}, {
    timestamps: true
});

module.exports = mongoose.model('PushNotificationLog', pushNotificationLogSchema);
