const mongoose = require('mongoose');

/**
 * AdminTask Schema
 * 
 * Represents TODO tasks and actions required by the Admin.
 * These are generated automatically by the system or manually.
 */
const adminTaskSchema = new mongoose.Schema({
    taskId: {
        type: String,
        unique: true,
        required: true,
        trim: true,
    },
    title: {
        type: String,
        required: [true, 'Task title is required'],
        trim: true,
    },
    description: {
        type: String,
        trim: true,
    },
    category: {
        type: String,
        enum: ['User', 'seller', 'user', 'order', 'finance', 'other'],
        required: true,
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium',
    },
    status: {
        type: String,
        enum: ['pending', 'viewed', 'completed'],
        default: 'pending',
    },
    link: {
        type: String,
        required: true,
        trim: true,
        // Router link to the specific screen
    },
    relatedId: {
        type: mongoose.Schema.Types.ObjectId,
        // Flexible reference - could be UserID, SellerID, OrderID, etc.
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        // Any extra data related to the task
    },
    viewedAt: {
        type: Date,
    },
    completedAt: {
        type: Date,
    }
}, {
    timestamps: true,
});

// Indexes
adminTaskSchema.index({ status: 1, priority: 1, createdAt: -1 });
adminTaskSchema.index({ category: 1, status: 1 });

const AdminTask = mongoose.model('AdminTask', adminTaskSchema);

module.exports = AdminTask;
