/**
 * User Admin Message Controller
 * 
 * Handles communication/messaging between Users and Admin
 * Used for text-based requests and other non-standard workflow communications
 */

const UserAdminMessage = require('../models/UserAdminMessage');
const User = require('../models/User');
const Admin = require('../models/Admin');

/**
 * @desc    Create message from User to admin
 * @route   POST /api/Users/messages
 * @access  Private (User)
 */
exports.createMessage = async (req, res, next) => {
  try {
    const UserId = req.user.userId;
    const {
      subject,
      message,
      category = 'general',
      priority = 'normal',
      relatedOrderId,
      relatedCreditPurchaseId,
      tags = [],
    } = req.body;

    if (!subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'Subject and message are required',
      });
    }

    // Validate User exists
    const User = await User.findById(UserId);
    if (!User || !User.isActive) {
      return res.status(403).json({
        success: false,
        message: 'User not found or inactive',
      });
    }

    // Create message
    const UserMessage = new UserAdminMessage({
      UserId,
      direction: 'User_to_admin',
      subject,
      message,
      category,
      priority,
      relatedOrderId,
      relatedCreditPurchaseId,
      tags,
      status: 'open',
      isRead: false,
    });

    await UserMessage.save();

    res.status(201).json({
      success: true,
      data: {
        message: {
          id: UserMessage._id,
          messageId: UserMessage.messageId,
          subject: UserMessage.subject,
          message: UserMessage.message,
          category: UserMessage.category,
          priority: UserMessage.priority,
          status: UserMessage.status,
          createdAt: UserMessage.createdAt,
        },
        message: 'Message sent to admin successfully',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get User's messages (sent and received)
 * @route   GET /api/Users/messages
 * @access  Private (User)
 */
exports.getUserMessages = async (req, res, next) => {
  try {
    const UserId = req.user.userId;
    const {
      direction,
      status,
      category,
      priority,
      isRead,
      limit = 20,
      offset = 0,
    } = req.query;

    // Build query
    const query = { UserId };
    
    if (direction) query.direction = direction;
    if (status) query.status = status;
    if (category) query.category = category;
    if (priority) query.priority = priority;
    if (isRead !== undefined) query.isRead = isRead === 'true';

    // Get messages
    const messages = await UserAdminMessage.find(query)
      .populate('sentBy', 'email name')
      .populate('resolvedBy', 'email name')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    const total = await UserAdminMessage.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        messages: messages.map(msg => ({
          id: msg._id,
          messageId: msg.messageId,
          direction: msg.direction,
          subject: msg.subject,
          message: msg.message,
          category: msg.category,
          priority: msg.priority,
          status: msg.status,
          isRead: msg.isRead,
          readAt: msg.readAt,
          sentBy: msg.sentBy ? {
            id: msg.sentBy._id,
            name: msg.sentBy.name || msg.sentBy.email,
          } : null,
          resolvedAt: msg.resolvedAt,
          resolvedBy: msg.resolvedBy ? {
            id: msg.resolvedBy._id,
            name: msg.resolvedBy.name || msg.resolvedBy.email,
          } : null,
          resolutionNote: msg.resolutionNote,
          replyCount: msg.replyCount,
          createdAt: msg.createdAt,
          updatedAt: msg.updatedAt,
        })),
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get User message details
 * @route   GET /api/Users/messages/:messageId
 * @access  Private (User)
 */
exports.getUserMessageDetails = async (req, res, next) => {
  try {
    const UserId = req.user.userId;
    const { messageId } = req.params;

    const message = await UserAdminMessage.findOne({
      _id: messageId,
      UserId,
    })
      .populate('sentBy', 'email name')
      .populate('resolvedBy', 'email name')
      .populate('relatedOrderId', 'orderNumber status')
      .populate('relatedCreditPurchaseId', 'totalAmount status');

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found',
      });
    }

    // Mark as read if User is viewing and message is from admin
    if (message.direction === 'admin_to_User' && !message.isRead) {
      message.markAsRead();
      await message.save();
    }

    res.status(200).json({
      success: true,
      data: {
        message: {
          id: message._id,
          messageId: message.messageId,
          direction: message.direction,
          subject: message.subject,
          message: message.message,
          category: message.category,
          priority: message.priority,
          status: message.status,
          isRead: message.isRead,
          readAt: message.readAt,
          sentBy: message.sentBy ? {
            id: message.sentBy._id,
            name: message.sentBy.name || message.sentBy.email,
          } : null,
          resolvedAt: message.resolvedAt,
          resolvedBy: message.resolvedBy ? {
            id: message.resolvedBy._id,
            name: message.resolvedBy.name || message.resolvedBy.email,
          } : null,
          resolutionNote: message.resolutionNote,
          relatedOrder: message.relatedOrderId ? {
            id: message.relatedOrderId._id,
            orderNumber: message.relatedOrderId.orderNumber,
            status: message.relatedOrderId.status,
          } : null,
          relatedCreditPurchase: message.relatedCreditPurchaseId ? {
            id: message.relatedCreditPurchaseId._id,
            totalAmount: message.relatedCreditPurchaseId.totalAmount,
            status: message.relatedCreditPurchaseId.status,
          } : null,
          replyCount: message.replyCount,
          tags: message.tags,
          attachments: message.attachments,
          createdAt: message.createdAt,
          updatedAt: message.updatedAt,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get admin messages (from all Users)
 * @route   GET /api/admin/User-messages
 * @access  Private (Admin)
 */
exports.getAdminMessages = async (req, res, next) => {
  try {
    const {
      UserId,
      direction,
      status,
      category,
      priority,
      isRead,
      limit = 50,
      offset = 0,
    } = req.query;

    // Build query
    const query = {};
    
    if (UserId) query.userId = UserId;
    if (direction) query.direction = direction;
    if (status) query.status = status;
    if (category) query.category = category;
    if (priority) query.priority = priority;
    if (isRead !== undefined) query.isRead = isRead === 'true';

    // Get messages
    const messages = await UserAdminMessage.find(query)
      .populate('UserId', 'name phone location')
      .populate('sentBy', 'email name')
      .populate('resolvedBy', 'email name')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    const total = await UserAdminMessage.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        messages: messages.map(msg => ({
          id: msg._id,
          messageId: msg.messageId,
          User: {
            id: msg.userId._id,
            name: msg.userId.name,
            phone: msg.userId.phone,
          },
          direction: msg.direction,
          subject: msg.subject,
          message: msg.message,
          category: msg.category,
          priority: msg.priority,
          status: msg.status,
          isRead: msg.isRead,
          readAt: msg.readAt,
          readBy: msg.readBy,
          sentBy: msg.sentBy ? {
            id: msg.sentBy._id,
            name: msg.sentBy.name || msg.sentBy.email,
          } : null,
          resolvedAt: msg.resolvedAt,
          resolvedBy: msg.resolvedBy ? {
            id: msg.resolvedBy._id,
            name: msg.resolvedBy.name || msg.resolvedBy.email,
          } : null,
          resolutionNote: msg.resolutionNote,
          replyCount: msg.replyCount,
          createdAt: msg.createdAt,
          updatedAt: msg.updatedAt,
        })),
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get admin message details
 * @route   GET /api/admin/User-messages/:messageId
 * @access  Private (Admin)
 */
exports.getAdminMessageDetails = async (req, res, next) => {
  try {
    const { messageId } = req.params;

    const message = await UserAdminMessage.findById(messageId)
      .populate('UserId', 'name phone location status')
      .populate('sentBy', 'email name')
      .populate('resolvedBy', 'email name')
      .populate('readBy', 'email name')
      .populate('relatedOrderId', 'orderNumber status totalAmount')
      .populate('relatedCreditPurchaseId', 'totalAmount status');

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found',
      });
    }

    // Mark as read if admin is viewing and message is from User
    if (message.direction === 'User_to_admin' && !message.isRead) {
      message.markAsRead(req.user.userId);
      await message.save();
    }

    res.status(200).json({
      success: true,
      data: {
        message: {
          id: message._id,
          messageId: message.messageId,
          User: {
            id: message.userId._id,
            name: message.userId.name,
            phone: message.userId.phone,
            location: message.userId.location,
            status: message.userId.status,
          },
          direction: message.direction,
          subject: message.subject,
          message: message.message,
          category: message.category,
          priority: message.priority,
          status: message.status,
          isRead: message.isRead,
          readAt: message.readAt,
          readBy: message.readBy ? {
            id: message.readBy._id,
            name: message.readBy.name || message.readBy.email,
          } : null,
          resolvedAt: message.resolvedAt,
          resolvedBy: message.resolvedBy ? {
            id: message.resolvedBy._id,
            name: message.resolvedBy.name || message.resolvedBy.email,
          } : null,
          resolutionNote: message.resolutionNote,
          relatedOrder: message.relatedOrderId ? {
            id: message.relatedOrderId._id,
            orderNumber: message.relatedOrderId.orderNumber,
            status: message.relatedOrderId.status,
            totalAmount: message.relatedOrderId.totalAmount,
          } : null,
          relatedCreditPurchase: message.relatedCreditPurchaseId ? {
            id: message.relatedCreditPurchaseId._id,
            totalAmount: message.relatedCreditPurchaseId.totalAmount,
            status: message.relatedCreditPurchaseId.status,
          } : null,
          replyCount: message.replyCount,
          tags: message.tags,
          attachments: message.attachments,
          createdAt: message.createdAt,
          updatedAt: message.updatedAt,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Admin sends reply/message to User
 * @route   POST /api/admin/User-messages
 * @access  Private (Admin)
 */
exports.adminCreateMessage = async (req, res, next) => {
  try {
    const adminId = req.user.userId;
    const {
      UserId,
      subject,
      message,
      category = 'general',
      priority = 'normal',
      repliedTo, // Message ID this is replying to
      relatedOrderId,
      relatedCreditPurchaseId,
      tags = [],
    } = req.body;

    if (!UserId || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'User ID, subject, and message are required',
      });
    }

    // Validate User exists
    const User = await User.findById(UserId);
    if (!User || !User.isActive) {
      return res.status(404).json({
        success: false,
        message: 'User not found or inactive',
      });
    }

    // If replying to a message, validate it exists and increment reply count
    let parentMessage = null;
    if (repliedTo) {
      parentMessage = await UserAdminMessage.findOne({
        _id: repliedTo,
        UserId,
      });
      
      if (parentMessage) {
        parentMessage.replyCount = (parentMessage.replyCount || 0) + 1;
        await parentMessage.save();
      }
    }

    // Create message from admin to User
    const adminMessage = new UserAdminMessage({
      UserId,
      direction: 'admin_to_User',
      subject,
      message,
      category,
      priority,
      repliedTo,
      relatedOrderId,
      relatedCreditPurchaseId,
      tags,
      sentBy: adminId,
      status: 'open',
      isRead: false,
    });

    await adminMessage.save();

    res.status(201).json({
      success: true,
      data: {
        message: {
          id: adminMessage._id,
          messageId: adminMessage.messageId,
          User: {
            id: user._id,
            name: user.name,
          },
          subject: adminMessage.subject,
          message: adminMessage.message,
          category: adminMessage.category,
          priority: adminMessage.priority,
          status: adminMessage.status,
          repliedTo: parentMessage ? {
            id: parentMessage._id,
            messageId: parentMessage.messageId,
            subject: parentMessage.subject,
          } : null,
          createdAt: adminMessage.createdAt,
        },
        message: 'Message sent to User successfully',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Admin updates message status (resolve, close, etc.)
 * @route   PUT /api/admin/User-messages/:messageId/status
 * @access  Private (Admin)
 */
exports.updateMessageStatus = async (req, res, next) => {
  try {
    const adminId = req.user.userId;
    const { messageId } = req.params;
    const { status, resolutionNote } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required',
      });
    }

    const validStatuses = ['open', 'in_progress', 'resolved', 'closed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const message = await UserAdminMessage.findById(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found',
      });
    }

    // Update status
    message.status = status;

    // If resolving, set resolved information
    if (status === 'resolved' || status === 'closed') {
      message.markAsResolved(adminId, resolutionNote || '');
    }

    await message.save();

    res.status(200).json({
      success: true,
      data: {
        message: {
          id: message._id,
          messageId: message.messageId,
          status: message.status,
          resolvedAt: message.resolvedAt,
          resolvedBy: message.resolvedBy,
          resolutionNote: message.resolutionNote,
        },
        message: 'Message status updated successfully',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Mark message as read (Admin)
 * @route   PUT /api/admin/User-messages/:messageId/read
 * @access  Private (Admin)
 */
exports.markMessageAsRead = async (req, res, next) => {
  try {
    const adminId = req.user.userId;
    const { messageId } = req.params;

    const message = await UserAdminMessage.findById(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found',
      });
    }

    if (!message.isRead) {
      message.markAsRead(adminId);
      await message.save();
    }

    res.status(200).json({
      success: true,
      data: {
        message: {
          id: message._id,
          messageId: message.messageId,
          isRead: message.isRead,
          readAt: message.readAt,
        },
        message: 'Message marked as read',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get message statistics for admin dashboard
 * @route   GET /api/admin/User-messages/stats
 * @access  Private (Admin)
 */
exports.getMessageStats = async (req, res, next) => {
  try {
    const stats = {
      total: await UserAdminMessage.countDocuments({}),
      unread: await UserAdminMessage.countDocuments({
        direction: 'User_to_admin',
        isRead: false,
      }),
      open: await UserAdminMessage.countDocuments({
        status: { $in: ['open', 'in_progress'] },
      }),
      resolved: await UserAdminMessage.countDocuments({
        status: 'resolved',
      }),
      byCategory: await UserAdminMessage.aggregate([
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
          },
        },
      ]),
      byPriority: await UserAdminMessage.aggregate([
        {
          $group: {
            _id: '$priority',
            count: { $sum: 1 },
          },
        },
      ]),
    };

    res.status(200).json({
      success: true,
      data: {
        stats,
      },
    });
  } catch (error) {
    next(error);
  }
};

