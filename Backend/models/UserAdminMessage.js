const mongoose = require('mongoose');

/**
 * User Admin Message Schema
 * 
 * Text-based communication between Users and Admin
 * Used for requests, queries, and other non-standard workflow communications
 */
const userAdminMessageSchema = new mongoose.Schema({
  messageId: {
    type: String,
    unique: true,
    required: true,
    uppercase: true,
    // Format: MSG-YYYYMMDD-XXXX (e.g., MSG-20240115-0001)
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
  },
  // Message direction
  direction: {
    type: String,
    enum: ['user_to_admin', 'admin_to_user'],
    required: true,
  },
  // Message subject/title
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    trim: true,
    maxlength: [200, 'Subject cannot exceed 200 characters'],
  },
  // Message content
  message: {
    type: String,
    required: [true, 'Message content is required'],
    trim: true,
    maxlength: [5000, 'Message cannot exceed 5000 characters'],
  },
  // Message category/type
  category: {
    type: String,
    enum: ['general', 'inventory', 'credit', 'order', 'payment', 'other'],
    default: 'general',
  },
  // Priority level
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal',
  },
  // Message status
  status: {
    type: String,
    enum: ['open', 'in_progress', 'resolved', 'closed'],
    default: 'open',
  },
  // Read status
  isRead: {
    type: Boolean,
    default: false,
  },
  readAt: {
    type: Date,
  },
  readBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
  },
  // Response/reply information
  repliedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserAdminMessage',
  },
  replyCount: {
    type: Number,
    default: 0,
  },
  // Admin information (if admin sent the message)
  sentBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
  },
  // Resolution information
  resolvedAt: Date,
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
  },
  resolutionNote: {
    type: String,
    trim: true,
  },
  // Related references (optional)
  relatedOrderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
  },
  relatedCreditPurchaseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CreditPurchase',
  },
  // Attachments
  attachments: [{
    url: String,
    fileName: String,
    fileType: String,
    fileSize: Number, // in bytes
  }],
  // Tags
  tags: [{
    type: String,
    trim: true,
  }],
  // Notes
  notes: {
    type: String,
    trim: true,
  },
}, {
  timestamps: true,
});

// Indexes
userAdminMessageSchema.index({ userId: 1, createdAt: -1 });
userAdminMessageSchema.index({ direction: 1, status: 1, createdAt: -1 });
userAdminMessageSchema.index({ status: 1, isRead: 1, createdAt: -1 });
userAdminMessageSchema.index({ category: 1, createdAt: -1 });
userAdminMessageSchema.index({ priority: 1, status: 1 });

// Pre-save hook: Generate message ID
userAdminMessageSchema.pre('save', async function (next) {
  if (!this.messageId && this.isNew) {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');

    const MessageModel = mongoose.models.UserAdminMessage || mongoose.model('UserAdminMessage', userAdminMessageSchema);
    const todayCount = await MessageModel.countDocuments({
      createdAt: { $gte: new Date(date.setHours(0, 0, 0, 0)), $lte: new Date(date.setHours(23, 59, 59, 999)) },
    });

    const sequence = String(todayCount + 1).padStart(4, '0');
    this.messageId = `MSG-${dateStr}-${sequence}`;
  }
  next();
});

// Instance methods
userAdminMessageSchema.methods.isOpen = function () {
  return this.status === 'open' || this.status === 'in_progress';
};

userAdminMessageSchema.methods.isResolved = function () {
  return this.status === 'resolved' || this.status === 'closed';
};

userAdminMessageSchema.methods.markAsRead = function (readBy = null) {
  this.isRead = true;
  this.readAt = new Date();
  if (readBy) {
    this.readBy = readBy;
  }
};

userAdminMessageSchema.methods.markAsResolved = function (resolvedBy, resolutionNote = '') {
  this.status = 'resolved';
  this.resolvedAt = new Date();
  this.resolvedBy = resolvedBy;
  if (resolutionNote) {
    this.resolutionNote = resolutionNote;
  }
};

const UserAdminMessage = mongoose.model('UserAdminMessage', userAdminMessageSchema);

module.exports = UserAdminMessage;
