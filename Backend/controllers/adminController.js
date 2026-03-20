/**
 * Admin Controller
 * 
 * Handles all admin-related operations
 */

const mongoose = require('mongoose');
const Admin = require('../models/Admin');
// const User = require('../models/User');
const User = require('../models/User');
const Product = require('../models/Product');
const ProductAssignment = require('../models/ProductAssignment');
const WithdrawalRequest = require('../models/WithdrawalRequest');
const UserEarning = require('../models/UserEarning');
const BankAccount = require('../models/BankAccount');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const PaymentHistory = require('../models/PaymentHistory');
const Settings = require('../models/Settings');
const Notification = require('../models/Notification');
const UserNotification = require('../models/UserNotification');
const Offer = require('../models/Offer');
const Review = require('../models/Review');
const Category = require('../models/Category');

const razorpayService = require('../services/razorpayService');
const { deleteFile, getVideoThumbnail } = require('../config/cloudinary');
const { USER_COVERAGE_RADIUS_KM, MIN_USER_PURCHASE, DELIVERY_TIMELINE_HOURS, ORDER_STATUS, PAYMENT_STATUS } = require('../utils/constants');

const { sendOTP } = require('../utils/otp');
const { getTestOTPInfo } = require('../services/smsIndiaHubService');
const { findPhoneInModel } = require('../utils/phoneNormalize');
const { OTP_EXPIRY_MINUTES } = require('../utils/constants');
const { generateToken } = require('../middleware/auth');
const { isSpecialBypassNumber, SPECIAL_BYPASS_OTP } = require('../utils/phoneValidation');
const { generateUniqueId } = require('../utils/generateUniqueId');
const { createPaymentHistory, createProductAssignment, createNotification, createOffer } = require('../utils/createWithId');
const { safeUserCount, safeSellerCount } = require('../utils/faultTolerantQuery');

// Auto-finalize expired status update grace periods (runs in background)
async function processExpiredStatusUpdates() {
  try {
    const now = new Date();
    const expiredStatusUpdates = await Order.find({
      'statusUpdateGracePeriod.isActive': true,
      'statusUpdateGracePeriod.expiresAt': { $lte: now },
    });

    if (expiredStatusUpdates.length === 0) {
      return;
    }

    for (const order of expiredStatusUpdates) {
      order.statusUpdateGracePeriod.isActive = false;
      order.statusUpdateGracePeriod.finalizedAt = now;
      order.statusUpdateGracePeriod.previousPaymentStatus = undefined;
      order.statusUpdateGracePeriod.previousRemainingAmount = undefined;

      order.statusTimeline.push({
        status: order.status,
        timestamp: now,
        updatedBy: 'system',
        note: `Status update finalized after 1-hour grace period expired. Status is now locked at ${order.status}.`,
      });

      await order.save();
      console.log(`✅ Order ${order.orderNumber} status update finalized after grace period expired`);
    }
  } catch (error) {
    console.error('Failed to process expired status updates:', error);
  }
}

/**
 * @desc    Admin login (Step 1: Phone only)
 * @route   POST /api/admin/auth/login
 * @access  Public
 */
exports.login = async (req, res, next) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required',
      });
    }

    // Special bypass number - skip all checks and proceed to OTP
    if (isSpecialBypassNumber(phone)) {
      return res.status(200).json({
        success: true,
        data: {
          requiresOtp: true,
          message: 'OTP sent to phone',
          phone: phone,
          expiresIn: OTP_EXPIRY_MINUTES * 60, // seconds
        },
      });
    }

    // Find admin by phone - handle both +91 and non-prefix formats
    let admin = await findPhoneInModel(Admin, phone);

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found',
      });
    }

    // Check if admin is active
    if (!admin.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Admin account is deactivated',
      });
    }

    // Clear any existing OTP before generating new one
    admin.clearOTP();

    // Generate new unique OTP
    const otpCode = admin.generateOTP();
    await admin.save();

    // Send OTP to phone via SMS
    try {
      await sendOTP(admin.phone, otpCode, 'login');
      console.log(`✅ OTP sent to admin phone: ${admin.phone}`);
    } catch (error) {
      console.error('Failed to send OTP:', error);
      // Continue even if SMS fails - OTP is stored in database and can be retrieved for testing
    }

    res.status(200).json({
      success: true,
      data: {
        requiresOtp: true,
        message: 'OTP sent to phone',
        phone: admin.phone,
        expiresIn: OTP_EXPIRY_MINUTES * 60, // seconds
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Request OTP for admin
 * @route   POST /api/admin/auth/request-otp
 * @access  Public
 */
exports.requestOTP = async (req, res, next) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required',
      });
    }

    // Special bypass number - skip all checks and proceed to OTP
    if (isSpecialBypassNumber(phone)) {
      return res.status(200).json({
        success: true,
        data: {
          message: 'OTP sent successfully',
          expiresIn: OTP_EXPIRY_MINUTES * 60, // seconds
        },
      });
    }

    // Find admin - handle both +91 and non-prefix formats
    let admin = await findPhoneInModel(Admin, phone);

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found',
      });
    }

    // Clear any existing OTP before generating new one
    admin.clearOTP();

    // Check if this is a test phone number - use default OTP 123456
    const testOTPInfo = getTestOTPInfo(admin.phone);
    let otpCode;
    if (testOTPInfo.isTest) {
      // For test numbers, set OTP directly to 123456
      otpCode = testOTPInfo.defaultOTP;
      admin.otp = {
        code: otpCode,
        expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
      };
    } else {
      // Generate new unique OTP for regular numbers
      otpCode = admin.generateOTP();
    }
    await admin.save();

    // Send OTP to phone via SMS
    try {
      await sendOTP(admin.phone, otpCode, 'login');
      console.log(`✅ OTP sent to admin phone: ${admin.phone}`);
    } catch (error) {
      console.error('Failed to send OTP:', error);
      // Continue even if SMS fails - OTP is stored in database and can be retrieved for testing
    }

    res.status(200).json({
      success: true,
      data: {
        message: 'OTP sent successfully',
        expiresIn: OTP_EXPIRY_MINUTES * 60, // seconds
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Verify OTP and complete login
 * @route   POST /api/admin/auth/verify-otp
 * @access  Public
 */
exports.verifyOTP = async (req, res, next) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Phone number and OTP are required',
      });
    }

    // Special bypass number - accept OTP 123456 and create/find admin
    if (isSpecialBypassNumber(phone)) {
      if (otp !== SPECIAL_BYPASS_OTP) {
        return res.status(401).json({
          success: false,
          message: 'Invalid or expired OTP',
        });
      }

      // Find or create admin for special bypass number
      let admin = await findPhoneInModel(Admin, phone);

      if (!admin) {
        // Generate unique admin ID
        const adminId = await generateUniqueId(Admin, 'ADM', 'adminId', 101);
        // Create admin if doesn't exist
        admin = new Admin({
          adminId,
          phone: phone,
          name: 'Special Bypass Admin',
          role: 'admin',
          isActive: true,
        });
        await admin.save();
        console.log(`✅ Special bypass admin created: ${phone} with ID: ${adminId}`);
      }

      admin.lastLogin = new Date();
      await admin.save();

      // Generate JWT token
      const token = generateToken({
        adminId: admin._id,
        phone: admin.phone,
        role: admin.role,
        type: 'admin',
      });

      return res.status(200).json({
        success: true,
        data: {
          token,
          admin: {
            id: admin._id,
            phone: admin.phone,
            name: admin.name,
            role: admin.role,
          },
        },
      });
    }

    // Find admin - handle both +91 and non-prefix formats
    let admin = await findPhoneInModel(Admin, phone);

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found',
      });
    }

    // Verify OTP
    const isOtpValid = admin.verifyOTP(otp);

    if (!isOtpValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired OTP',
      });
    }

    // Clear OTP after successful verification
    admin.clearOTP();
    admin.lastLogin = new Date();
    await admin.save();

    // Log successful login
    console.log(`\n✅ Admin logged in: ${admin.phone} (Role: ${admin.role}) at ${new Date().toISOString()}\n`);

    // Generate JWT token
    const token = generateToken({
      adminId: admin._id,
      phone: admin.phone,
      role: admin.role,
      type: 'admin',
    });

    res.status(200).json({
      success: true,
      data: {
        token,
        admin: {
          id: admin._id,
          phone: admin.phone,
          name: admin.name,
          role: admin.role,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Admin logout
 * @route   POST /api/admin/auth/logout
 * @access  Private (Admin)
 */
exports.logout = async (req, res, next) => {
  try {
    // TODO: Implement token blacklisting or refresh token invalidation
    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get admin profile
 * @route   GET /api/admin/auth/profile
 * @access  Private (Admin)
 */
exports.getProfile = async (req, res, next) => {
  try {
    // Admin is attached by authorizeAdmin middleware
    const admin = req.admin;

    res.status(200).json({
      success: true,
      data: {
        admin: {
          id: admin._id,
          phone: admin.phone,
          name: admin.name,
          role: admin.role,
          lastLogin: admin.lastLogin,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get dashboard overview
 * @route   GET /api/admin/dashboard
 * @access  Private (Admin)
 */
exports.getDashboard = async (req, res, next) => {
  try {
    // Generate counts for Admin Dashboard
    const [
      totalUsers,
      activeUsers,
      blockedUsers,
      approvedUsers,
      pendingUsers,
      totalProducts,
      activeProducts,
      totalOrders,
      pendingOrders,
      processingOrders,
      deliveredOrders,
      cancelledOrders,
      totalPayments,
      pendingPayments,
      completedPayments,
    ] = await Promise.all([
      // User counts (formerly Vendors)
      User.countDocuments(),
      User.countDocuments({ isActive: true, isBlocked: false }),
      User.countDocuments({ isBlocked: true }),
      User.countDocuments({ status: 'approved' }),
      User.countDocuments({ status: 'pending' }),

      // Products
      Product.countDocuments(),
      Product.countDocuments({ isActive: true }),

      // Orders
      Order.countDocuments(),
      Order.countDocuments({ status: 'pending' }),
      Order.countDocuments({ status: { $in: ['awaiting', 'processing', 'dispatched'] } }),
      Order.countDocuments({ status: { $in: [ORDER_STATUS.DELIVERED, ORDER_STATUS.FULLY_PAID] } }),
      Order.countDocuments({ status: 'cancelled' }),

      // Payments
      Payment.countDocuments(),
      Payment.countDocuments({ status: 'pending' }),
      Payment.countDocuments({ status: 'fully_paid' }),
    ]);

    // Calculate revenue (from completed orders)
    const revenueStats = await Order.aggregate([
      {
        $match: {
          status: { $in: [ORDER_STATUS.DELIVERED, ORDER_STATUS.FULLY_PAID] },
          paymentStatus: PAYMENT_STATUS.FULLY_PAID,
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' },
          totalOrders: { $sum: 1 },
          averageOrderValue: { $avg: '$totalAmount' },
        },
      },
    ]);

    // Calculate revenue by time period (last 30 days, last 7 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [revenueLast30Days, revenueLast7Days] = await Promise.all([
      Order.aggregate([
        {
          $match: {
            status: { $in: [ORDER_STATUS.DELIVERED, ORDER_STATUS.FULLY_PAID] },
            paymentStatus: PAYMENT_STATUS.FULLY_PAID,
            createdAt: { $gte: thirtyDaysAgo },
          },
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$totalAmount' },
            orderCount: { $sum: 1 },
          },
        },
      ]),
      Order.aggregate([
        {
          $match: {
            status: { $in: [ORDER_STATUS.DELIVERED, ORDER_STATUS.FULLY_PAID] },
            paymentStatus: PAYMENT_STATUS.FULLY_PAID,
            createdAt: { $gte: sevenDaysAgo },
          },
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$totalAmount' },
            orderCount: { $sum: 1 },
          },
        },
      ]),
    ]);

    // Calculate pending payments amount
    const pendingPaymentStats = await Payment.aggregate([
      {
        $match: {
          status: 'pending',
        },
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    // Calculate pending withdrawals amount
    const pendingWithdrawalStats = await WithdrawalRequest.aggregate([
      {
        $match: {
          status: 'pending',
        },
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    // Extract aggregated data
    const totalRevenue = revenueStats[0]?.totalRevenue || 0;
    const averageOrderValue = revenueStats[0]?.averageOrderValue || 0;
    const revenueLast30DaysAmount = revenueLast30Days[0]?.totalRevenue || 0;
    const revenueLast7DaysAmount = revenueLast7Days[0]?.totalRevenue || 0;
    const pendingPaymentsAmount = pendingPaymentStats[0]?.totalAmount || 0;
    const pendingWithdrawalsAmount = pendingWithdrawalStats[0]?.totalAmount || 0;

    res.status(200).json({
      success: true,
      data: {
        overview: {
          users: {
            total: totalUsers,
            active: activeUsers,
            blocked: blockedUsers,
          },
          products: {
            total: totalProducts,
            active: activeProducts,
          },
          orders: {
            total: totalOrders,
            pending: pendingOrders,
            processing: processingOrders,
            delivered: deliveredOrders,
            cancelled: cancelledOrders,
          },
          finance: {
            revenue: totalRevenue,
            averageOrderValue: Math.round(averageOrderValue * 100) / 100,
            revenueLast30Days: revenueLast30DaysAmount,
            revenueLast7Days: revenueLast7DaysAmount,
          },
        },
        summary: {
          totalOrders: totalOrders,
          totalRevenue: totalRevenue,
          pendingActions: pendingOrders,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// PRODUCT MANAGEMENT CONTROLLERS
// ============================================================================

/**
 * @desc    Get all products with filtering and pagination
 * @route   GET /api/admin/products
 * @access  Private (Admin)
 */
exports.getProducts = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      category,
      isActive,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    // Build query
    const query = {};

    if (category) {
      query.category = category.toLowerCase();
    }

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    if (search) {
      // Search by product ID, name, or text search
      query.$or = [
        { productId: { $regex: search, $options: 'i' } }, // Search by unique product ID
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
      ];
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Sort
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query
    const products = await Product.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .select('-__v');

    const total = await Product.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        products,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          totalItems: total,
          itemsPerPage: limitNum,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single product details
 * @route   GET /api/admin/products/:productId
 * @access  Private (Admin)
 */
exports.getProductDetails = async (req, res, next) => {
  try {
    const { productId } = req.params;

    const product = await Product.findById(productId).select('-__v');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Get User assignments for this product
    const assignments = await ProductAssignment.find({ productId, isActive: true })
      .populate('userId', 'name phone location')
      .select('-__v');

    res.status(200).json({
      success: true,
      data: {
        product,
        assignments,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create new product
 * @route   POST /api/admin/products
 * @access  Private (Admin)
 */
exports.createProduct = async (req, res, next) => {
  try {
    const {
      name,
      category,        // fashion category (required)
      look,            // fashion look (optional)
      theme,           // fashion theme (optional)
      collection,      // fashion collection (optional)
      description,
      shortDescription,
      wholesalePrice,
      publicPrice,
      discountWholesale,
      discountPublic,
      actualStock,
      displayStock,
      stock,           // Legacy field support
      stockUnit,
      sizes,           // Fashion size variants [{ label, actualStock, displayStock, price? }]
      images,          // Array of image objects {url, publicId, isPrimary, order}
      expiry,
      brand,
      weight,
      tags,
      specifications,
      sku,
      batchNumber,
      attributeStocks, // Legacy: Array of stock entries per attribute combination
      longDescription, // Detailed formatted description
      occasions,       // Festival occasions
      sizeChart,       // Dynamic size chart
      relatedProducts, // Explicit related products
    } = req.body;

    // Validate required fields
    if (!name || !description || !category) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: name, description, category',
      });
    }

    // Validate shortDescription - use fallback if not provided
    const shortDescriptionValue = shortDescription?.trim() || description?.substring(0, 150) || name.substring(0, 150);
    if (!shortDescriptionValue || shortDescriptionValue.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Short description is required',
      });
    }

    // Validate stock fields
    const actualStockValue = parseInt(actualStock) || 0;
    const displayStockValue = parseInt(displayStock) || parseInt(stock) || 0;

    if (actualStockValue < 0 || displayStockValue < 0) {
      return res.status(400).json({
        success: false,
        message: 'Stock quantities cannot be negative',
      });
    }

    // Prices are optional — fashion products may use per-size pricing via sizes[]
    // Only reject explicitly negative values
    if (wholesalePrice !== undefined && parseFloat(wholesalePrice) < 0) {
      return res.status(400).json({ success: false, message: 'Wholesale price cannot be negative' });
    }
    if (publicPrice !== undefined && parseFloat(publicPrice) < 0) {
      return res.status(400).json({ success: false, message: 'Customer price cannot be negative' });
    }

    // Category validation: Standardized for Noor E Adah
    const categoryLower = category.toString().toLowerCase();

    // Look up category — handle ID, slug, or name
    let dbCategory = null;
    if (mongoose.Types.ObjectId.isValid(category)) {
      dbCategory = await Category.findById(category);
    }

    if (!dbCategory) {
      dbCategory = await Category.findOne({
        $or: [
          { slug: categoryLower },
          { name: new RegExp('^' + categoryLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') }
        ]
      });
    }

    // Helper to find other taxonomy IDs
    const findTaxonomyId = async (input) => {
      if (!input) return null;
      if (mongoose.Types.ObjectId.isValid(input)) return input;
      const found = await Category.findOne({
        $or: [
          { slug: input.toLowerCase() },
          { name: new RegExp('^' + input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') }
        ]
      });
      return found ? found._id : null;
    };

    const lookId = await findTaxonomyId(look);
    const themeId = await findTaxonomyId(theme);
    const collectionId = await findTaxonomyId(collection);

    // Create product
    // Handle prices - if using attributeStocks and main prices are undefined, calculate from attributeStocks or use defaults
    let finalWholesalePrice = wholesalePrice;
    let finalPublicPrice = publicPrice;

    if ((finalWholesalePrice === undefined || finalPublicPrice === undefined) && attributeStocks && Array.isArray(attributeStocks) && attributeStocks.length > 0) {
      // Calculate weighted average prices from attributeStocks
      let totalStock = 0;
      let weightedWholesalePrice = 0;
      let weightedPublicPrice = 0;

      attributeStocks.forEach(astock => {
        const stockQty = parseFloat(astock.displayStock) || parseFloat(astock.actualStock) || 0;
        if (stockQty > 0 && astock.wholesalePrice !== undefined && astock.publicPrice !== undefined) {
          totalStock += stockQty;
          weightedWholesalePrice += (parseFloat(astock.wholesalePrice) || 0) * stockQty;
          weightedPublicPrice += (parseFloat(astock.publicPrice) || 0) * stockQty;
        }
      });

      if (totalStock > 0) {
        finalWholesalePrice = Math.round(weightedWholesalePrice / totalStock);
        finalPublicPrice = Math.round(weightedPublicPrice / totalStock);
      } else {
        // Fallback to first entry's prices
        const firstEntry = attributeStocks[0];
        finalWholesalePrice = parseFloat(firstEntry.wholesalePrice) || 0;
        finalPublicPrice = parseFloat(firstEntry.publicPrice) || 0;
      }
    }

    // Ensure prices are always defined (required by schema)
    finalWholesalePrice = Math.max(0, finalWholesalePrice || 0);
    finalPublicPrice = Math.max(0, finalPublicPrice || 0);

    // Handle enhanced details - Provide professional defaults for Noor E Adah
    const defaultShippingPolicy = `<h2>DOMESTIC SHIPPING POLICY</h2><p>Thankyou for visiting and shopping at Noor E Adah. Following are the terms and condition that constitute our shipping policy.</p><h3>Shipment processing time</h3><p>All orders are processed within 1-2 business Days.orders not shipping or delivered on weekends or holidays.</p><h3>Shipping rates & delivery estimates</h3><table><thead><tr><th>Shipment method</th><th>Estimated delivery time</th><th>Shipment cost</th></tr></thead><tbody><tr><td>Standard Shipping</td><td>5-12 business days</td><td>300/-</td></tr><tr><td>Express Shipping</td><td>2-6 business days</td><td>800/-</td></tr></tbody></table>`;

    const defaultFaqs = [
      { question: "HOW DO I PLACE AN ORDER?", answer: "You can log on to our website: www.nooreadah.com to place a direct order. In case of any assistance required, please contact us on +91 8851800094." },
      { question: "DO I NEED TO SET UP AN ACCOUNT TO PLACE AN ORDER?", answer: "No, you can guest checkout, but an account helps track orders." },
      { question: "HOW DO I MAKE THE PAYMENT?", answer: "We accept all major credit/debit cards, UPI, and net banking." },
      { question: "HOW DO I TRACK MY ORDER?", answer: "You will receive a tracking link via SMS/Email once it ships." },
      { question: "CAN I ORDER FOR COD (CASH ON DELIVERY)?", answer: "Yes, COD is available for select pin codes." },
      { question: "HOW DO I KNOW MY SIZE?", answer: "Refer to our size chart on the product page." }
    ];

    const productData = {
      name,
      description,
      shortDescription: shortDescriptionValue.trim(),
      category: dbCategory ? dbCategory._id : category,
      look: lookId,
      theme: themeId,
      collection: collectionId,
      wholesalePrice: finalWholesalePrice,
      publicPrice: finalPublicPrice,
      discountPublic: parseFloat(discountPublic) || 0,
      discountWholesale: parseFloat(discountWholesale) || 0,
      actualStock: actualStockValue,
      displayStock: displayStockValue,
      stock: displayStockValue,
      longDescription: longDescription || description,
      occasions: Array.isArray(occasions) ? occasions : [],
      additionalInformation: req.body.additionalInformation || "",
      shippingPolicy: req.body.shippingPolicy || defaultShippingPolicy,
      faqs: (Array.isArray(req.body.faqs) && req.body.faqs.length > 0) ? req.body.faqs : defaultFaqs,
      sizeChart: sizeChart || null,
      relatedProducts: Array.isArray(relatedProducts) ? relatedProducts : [],
      ...(Array.isArray(sizes) && sizes.length > 0 && { sizes }),
    };


    if (images && Array.isArray(images)) {
      // Validate and normalize image objects
      const validImages = images
        .filter(img => img && img.url) // Must have URL
        .map((img, index) => ({
          url: img.url,
          publicId: img.publicId || '',
          isPrimary: index === 0, // First image is primary
          order: index,
        }))
        .slice(0, 20); // Increased limit to 20 to support multi-page PDF extraction and richer product galleries

      if (validImages.length > 0) {
        productData.images = validImages;
      }
    }

    if (expiry) productData.expiry = expiry;
    if (brand) productData.brand = brand;
    if (weight) productData.weight = weight;
    if (stockUnit) {
      // Store unit in weight.unit for consistency
      productData.weight = { ...(productData.weight || {}), unit: stockUnit };
    }
    // Handle tags - normalize: trim, lowercase, remove empty strings
    if (tags && Array.isArray(tags)) {
      productData.tags = tags
        .map(tag => String(tag).trim().toLowerCase())
        .filter(tag => tag.length > 0);
    }
    // Handle specifications (attributes) - Mongoose will convert plain object to Map
    if (specifications && typeof specifications === 'object' && !Array.isArray(specifications)) {
      // Filter out empty values and convert to strings
      const cleanSpecs = {};
      Object.keys(specifications).forEach(key => {
        const value = specifications[key];
        if (value !== null && value !== undefined && value !== '') {
          cleanSpecs[key] = String(value);
        }
      });
      if (Object.keys(cleanSpecs).length > 0) {
        productData.specifications = cleanSpecs;
      }
    }
    if (sku) productData.sku = sku.toUpperCase();
    if (batchNumber) productData.batchNumber = batchNumber.trim();

    // Handle attributeStocks array
    if (attributeStocks && Array.isArray(attributeStocks) && attributeStocks.length > 0) {
      // Validate and normalize attributeStocks
      const validAttributeStocks = attributeStocks
        .filter(stock => stock && stock.attributes && Object.keys(stock.attributes).length > 0)
        .map(stock => {
          // Convert attributes object to Map-compatible format
          const attributesMap = {};
          Object.keys(stock.attributes).forEach(key => {
            const value = stock.attributes[key];
            if (value !== null && value !== undefined && value !== '') {
              attributesMap[key] = String(value);
            }
          });

          // Validate prices
          const UserPriceValue = parseFloat(stock.UserPrice);
          const userPriceValue = parseFloat(stock.userPrice);

          if (isNaN(UserPriceValue) || UserPriceValue < 0) {
            throw new Error(`Invalid User price for attribute stock entry`);
          }
          if (isNaN(userPriceValue) || userPriceValue < 0) {
            throw new Error(`Invalid user price for attribute stock entry`);
          }
          if (userPriceValue <= UserPriceValue) {
            throw new Error(`User price must be greater than User price for attribute stock entry`);
          }

          return {
            attributes: attributesMap,
            actualStock: parseFloat(stock.actualStock) || 0,
            displayStock: parseFloat(stock.displayStock) || 0,
            stockUnit: stock.stockUnit || stockUnit || 'kg',
            UserPrice: Math.round(UserPriceValue),
            userPrice: Math.round(userPriceValue),
            ...(stock.batchNumber && { batchNumber: String(stock.batchNumber).trim() }),
            ...(stock.expiry && { expiry: stock.expiry }),
          };
        })
        .filter(stock => Object.keys(stock.attributes).length > 0); // Only include entries with at least one attribute

      if (validAttributeStocks.length > 0) {
        productData.attributeStocks = validAttributeStocks;
      }
    }

    // Generate unique product ID
    const productId = await generateUniqueId(Product, 'PRD', 'productId', 101);
    productData.productId = productId;

    const product = await Product.create(productData);

    res.status(201).json({
      success: true,
      data: {
        product,
        message: 'Product created successfully',
      },
    });
  } catch (error) {
    // Handle duplicate SKU
    if (error.code === 11000 && error.keyPattern?.sku) {
      return res.status(400).json({
        success: false,
        message: 'SKU already exists',
      });
    }
    next(error);
  }
};

/**
 * @desc    Update product
 * @route   PUT /api/admin/products/:productId
 * @access  Private (Admin)
 */
exports.updateProduct = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const updateData = req.body;

    // Find product
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Normalize and validate category if provided
    if (updateData.category !== undefined) {
      if (mongoose.Types.ObjectId.isValid(updateData.category)) {
        product.category = updateData.category;
      } else {
        const categoryLower = String(updateData.category).toLowerCase();
        const dbCategory = await Category.findOne({
          $or: [
            { slug: categoryLower },
            { name: new RegExp('^' + categoryLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') }
          ]
        });
        if (dbCategory) {
          product.category = dbCategory._id;
        } else {
          // If category not found by name/slug, keep the existing one or set to null if intended
          // For now, we'll just not update it if the provided string doesn't match a category
          // Or, if it's a required field, throw an error.
        }
      }
    }

    // Resolve look if provided (all taxonomy types use Category model)
    if (updateData.look !== undefined) {
      if (updateData.look === null || updateData.look === '') {
        product.look = null;
      } else if (mongoose.Types.ObjectId.isValid(updateData.look)) {
        product.look = updateData.look;
      } else {
        const lookLower = String(updateData.look).toLowerCase();
        const dbLook = await Category.findOne({
          $or: [
            { slug: lookLower },
            { name: new RegExp('^' + lookLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') }
          ]
        });
        if (dbLook) product.look = dbLook._id;
      }
    }

    // Resolve theme if provided (all taxonomy types use Category model)
    if (updateData.theme !== undefined) {
      if (updateData.theme === null || updateData.theme === '') {
        product.theme = null;
      } else if (mongoose.Types.ObjectId.isValid(updateData.theme)) {
        product.theme = updateData.theme;
      } else {
        const themeLower = String(updateData.theme).toLowerCase();
        const dbTheme = await Category.findOne({
          $or: [
            { slug: themeLower },
            { name: new RegExp('^' + themeLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') }
          ]
        });
        if (dbTheme) product.theme = dbTheme._id;
      }
    }

    // Resolve collection if provided (all taxonomy types use Category model)
    if (updateData.collection !== undefined) {
      if (updateData.collection === null || updateData.collection === '') {
        product.collection = null;
      } else if (mongoose.Types.ObjectId.isValid(updateData.collection)) {
        product.collection = updateData.collection;
      } else {
        const collectionLower = String(updateData.collection).toLowerCase();
        const dbCollection = await Category.findOne({
          $or: [
            { slug: collectionLower },
            { name: new RegExp('^' + collectionLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') }
          ]
        });
        if (dbCollection) product.collection = dbCollection._id;
      }
    }

    // Normalize SKU if provided
    if (updateData.sku) {
      product.sku = updateData.sku.toUpperCase();
    }

    // Handle stock fields
    if (updateData.actualStock !== undefined) {
      product.actualStock = updateData.actualStock;
    }
    if (updateData.displayStock !== undefined) {
      product.displayStock = updateData.displayStock;
      product.stock = updateData.displayStock; // Sync legacy field
    }
    // Legacy stock field support
    if (updateData.stock !== undefined && updateData.displayStock === undefined) {
      product.displayStock = updateData.stock;
      product.actualStock = updateData.actualStock !== undefined ? updateData.actualStock : updateData.stock;
      product.stock = updateData.stock;
    }

    // Handle stockUnit
    if (updateData.stockUnit !== undefined) {
      product.weight = product.weight || {};
      product.weight.unit = updateData.stockUnit;
    }

    // Handle batchNumber
    if (updateData.batchNumber !== undefined) {
      product.batchNumber = updateData.batchNumber.trim();
    }

    // Handle isActive separately
    if (updateData.isActive !== undefined) {
      product.isActive = updateData.isActive;
    }

    // Handle occasions
    if (updateData.occasions !== undefined) {
      if (Array.isArray(updateData.occasions)) {
        product.occasions = updateData.occasions
          .map(occ => String(occ).trim().toLowerCase())
          .filter(occ => occ.length > 0);
      } else {
        product.occasions = [];
      }
    }

    // Handle tags
    if (updateData.tags !== undefined) {
      if (Array.isArray(updateData.tags)) {
        product.tags = updateData.tags
          .map(tag => String(tag).trim().toLowerCase())
          .filter(tag => tag.length > 0);
      } else {
        product.tags = [];
      }
    }

    // Handle specifications
    if (updateData.specifications !== undefined) {
      if (updateData.specifications && typeof updateData.specifications === 'object' && !Array.isArray(updateData.specifications)) {
        const cleanSpecs = {};
        Object.keys(updateData.specifications).forEach(key => {
          const value = updateData.specifications[key];
          if (value !== null && value !== undefined && value !== '') {
            cleanSpecs[key] = String(value);
          }
        });
        product.specifications = cleanSpecs;
      } else {
        product.specifications = {};
      }
    }

    // Handle images
    if (updateData.images !== undefined) {
      if (Array.isArray(updateData.images)) {
        const validImages = updateData.images
          .filter(img => img && img.url)
          .map((img, index) => ({
            url: img.url,
            publicId: img.publicId || '',
            isPrimary: index === 0,
            order: index,
          }))
          .slice(0, 20); // increased limit to 20 for consistency with createProduct

        product.images = validImages;
      } else {
        product.images = [];
      }
    }

    // Handle enhanced details
    if (updateData.additionalInformation !== undefined) {
      product.additionalInformation = updateData.additionalInformation;
    }
    if (updateData.shippingPolicy !== undefined) {
      product.shippingPolicy = updateData.shippingPolicy;
    }
    if (updateData.faqs !== undefined) {
      if (Array.isArray(updateData.faqs)) {
        product.faqs = updateData.faqs.filter(f => f.question && f.answer);
      }
    }

    // Handle sizes (fashion variants)
    if (updateData.sizes !== undefined) {
      if (Array.isArray(updateData.sizes)) {
        product.sizes = updateData.sizes;
      } else {
        product.sizes = [];
      }
    }

    // Handle sizeChart
    if (updateData.sizeChart !== undefined) {
      product.sizeChart = updateData.sizeChart;
    }

    // Handle relatedProducts
    if (updateData.relatedProducts !== undefined) {
      product.relatedProducts = Array.isArray(updateData.relatedProducts) ? updateData.relatedProducts : [];
    }

    // Handle showStock
    if (updateData.showStock !== undefined) {
      product.showStock = updateData.showStock;
    }

    // Handle prices
    if (updateData.publicPrice !== undefined) {
      product.publicPrice = parseFloat(updateData.publicPrice) || 0;
    }
    if (updateData.wholesalePrice !== undefined) {
      product.wholesalePrice = parseFloat(updateData.wholesalePrice) || 0;
    }
    if (updateData.discountPublic !== undefined) {
      product.discountPublic = parseFloat(updateData.discountPublic) || 0;
    }

    // Update other fields via generic loop (excluding all fields handled above)
    const excludedFields = [
      'actualStock', 'displayStock', 'stock', 'stockUnit', 'batchNumber', 'isActive',
      'tags', 'specifications', 'images', 'attributeStocks',
      'additionalInformation', 'shippingPolicy', 'faqs',
      'sizes', 'sizeChart', 'relatedProducts', 'showStock',
      'publicPrice', 'wholesalePrice', 'discountPublic',
      'category', 'look', 'theme', 'collection', 'sku', 'occasions', 'video',
    ];
    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined && !excludedFields.includes(key)) {
        product[key] = updateData[key];
      }
    });

    await product.save();

    res.status(200).json({
      success: true,
      data: {
        product,
        message: 'Product updated successfully',
      },
    });
  } catch (error) {
    // Handle duplicate SKU
    if (error.code === 11000 && error.keyPattern?.sku) {
      return res.status(400).json({
        success: false,
        message: 'SKU already exists',
      });
    }
    next(error);
  }
};

/**
 * @desc    Delete product
 * @route   DELETE /api/admin/products/:productId
 * @access  Private (Admin)
 */
exports.deleteProduct = async (req, res, next) => {
  try {
    const { productId } = req.params;

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Check if product has active assignments
    const activeAssignments = await ProductAssignment.countDocuments({
      productId,
      isActive: true,
    });

    if (activeAssignments > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete product. It has ${activeAssignments} active User assignment(s). Please remove assignments first or deactivate the product.`,
      });
    }

    // Delete product
    await Product.findByIdAndDelete(productId);

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Assign product to User
 * @route   POST /api/admin/products/:productId/assign
 * @access  Private (Admin)
 */
exports.assignProductToUser = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { UserId, region, notes } = req.body;

    if (!UserId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required',
      });
    }

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Check if User exists and is approved
    const user = await User.findById(UserId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (User.status !== 'approved' || !User.isActive) {
      return res.status(400).json({
        success: false,
        message: 'User must be approved and active to receive product assignments',
      });
    }

    // Check if assignment already exists
    const existingAssignment = await ProductAssignment.findOne({
      productId,
      UserId,
    });

    if (existingAssignment) {
      // Update existing assignment
      existingAssignment.isActive = true;
      if (region) existingAssignment.region = region;
      if (notes) existingAssignment.notes = notes;
      existingAssignment.assignedBy = req.admin._id;
      existingAssignment.assignedAt = new Date();
      await existingAssignment.save();

      return res.status(200).json({
        success: true,
        data: {
          assignment: existingAssignment,
          message: 'Product assignment updated successfully',
        },
      });
    }

    // Create new assignment
    const assignment = await createProductAssignment({
      productId,
      UserId,
      region,
      notes,
      assignedBy: req.admin._id,
    });

    // TODO: Create Inventory entry for User when Inventory model is created

    res.status(201).json({
      success: true,
      data: {
        assignment,
        message: 'Product assigned to User successfully',
      },
    });
  } catch (error) {
    // Handle duplicate assignment
    if (error.code === 11000 && error.keyPattern?.productId && error.keyPattern?.userId) {
      return res.status(400).json({
        success: false,
        message: 'Product is already assigned to this User',
      });
    }
    next(error);
  }
};

/**
 * @desc    Upload product video
 * @route   POST /api/admin/products/:productId/video
 * @access  Private (Admin)
 */
exports.uploadProductVideo = async (req, res, next) => {
  try {
    const { productId } = req.params;
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload a video' });
    }

    const product = await Product.findById(productId);
    if (!product) {
      // If product not found but file uploaded, cleanup cloudinary
      if (req.file.filename) {
        await deleteFile(req.file.filename, 'video');
      }
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Association with Cloudinary: req.file.path is the URL, req.file.filename is the public_id
    // Cleanup old video if exists
    if (product.video && product.video.publicId) {
      await deleteFile(product.video.publicId, 'video');
    }

    product.video = {
      url: req.file.path,
      publicId: req.file.filename,
      thumbnail: getVideoThumbnail(req.file.filename)
    };

    await product.save();

    res.status(200).json({
      success: true,
      data: product.video,
      message: 'Video associated with product successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete associated product video
 * @route   DELETE /api/admin/products/:productId/video
 * @access  Private (Admin)
 */
exports.deleteProductVideo = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    if (product.video && product.video.publicId) {
      await deleteFile(product.video.publicId, 'video');
      product.video = undefined;
      await product.save();
    }

    res.status(200).json({
      success: true,
      message: 'Product video deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Toggle product visibility (active/inactive)
 * @route   PUT /api/admin/products/:productId/visibility
 * @access  Private (Admin)
 */
exports.toggleProductVisibility = async (req, res, next) => {
  try {
    const { productId } = req.params;

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Toggle visibility
    product.isActive = !product.isActive;
    await product.save();

    res.status(200).json({
      success: true,
      data: {
        product,
        message: `Product ${product.isActive ? 'activated' : 'deactivated'} successfully`,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// User MANAGEMENT CONTROLLERS
// ============================================================================

/**
 * @desc    Get all Users with filtering and pagination
 * @route   GET /api/admin/Users
 * @access  Private (Admin)
 */
exports.getUsers = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      isActive,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      includeDeleted = 'false',
    } = req.query;

    // Build query
    const query = {};

    // By default, exclude deleted Users unless explicitly requested
    if (includeDeleted !== 'true') {
      query.isDeleted = { $ne: true };
    }

    if (status) {
      query.status = status;
    }

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    if (search) {
      query.$or = [
        { userId: { $regex: search, $options: 'i' } }, // Search by unique User ID
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { 'location.address': { $regex: search, $options: 'i' } },
      ];
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Sort
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query
    const Users = await User.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .select('-__v -otp')
      .populate('approvedBy', 'name email')
      .populate('deletedBy', 'name email')
      .lean();

    // Manually populate nested banInfo fields if they exist
    const mongoose = require('mongoose');
    const adminIdsToPopulate = new Set();

    Users.forEach(User => {
      if (User.banInfo?.bannedBy && mongoose.Types.ObjectId.isValid(User.banInfo.bannedBy)) {
        adminIdsToPopulate.add(User.banInfo.bannedBy);
      }
      if (User.banInfo?.revokedBy && mongoose.Types.ObjectId.isValid(User.banInfo.revokedBy)) {
        adminIdsToPopulate.add(User.banInfo.revokedBy);
      }
    });

    // Fetch all admins at once for efficiency
    const adminsMap = new Map();
    if (adminIdsToPopulate.size > 0) {
      const adminIdsArray = Array.from(adminIdsToPopulate).map(id => new mongoose.Types.ObjectId(id));
      const admins = await Admin.find({ _id: { $in: adminIdsArray } })
        .select('name phone')
        .lean();
      admins.forEach(admin => {
        adminsMap.set(admin._id.toString(), { name: admin.name, phone: admin.phone });
      });
    }

    // Populate the banInfo fields
    Users.forEach(User => {
      if (User.banInfo?.bannedBy) {
        const adminId = User.banInfo.bannedBy.toString();
        User.banInfo.bannedBy = adminsMap.get(adminId) || null;
      }
      if (User.banInfo?.revokedBy) {
        const adminId = User.banInfo.revokedBy.toString();
        User.banInfo.revokedBy = adminsMap.get(adminId) || null;
      }
    });

    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        Users,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          totalItems: total,
          itemsPerPage: limitNum,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single User details
 * @route   GET /api/admin/Users/:UserId
 * @access  Private (Admin)
 */
exports.getUserDetails = async (req, res, next) => {
  try {
    const { UserId } = req.params;

    const user = await User.findById(UserId)
      .select('-__v -otp')
      .populate('approvedBy', 'name email');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Get User's product assignments
    const assignments = await ProductAssignment.find({ userId: UserId, isActive: true })
      .populate('productId', 'name sku category')
      .select('-__v');

    res.status(200).json({
      success: true,
      data: {
        user,
        banInfo: user.banInfo || {},
        assignments,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Approve User registration
 * @route   POST /api/admin/Users/:UserId/approve
 * @access  Private (Admin)
 */
exports.approveUser = async (req, res, next) => {
  try {
    const { UserId } = req.params;

    const user = await User.findById(UserId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Approve User
    user.isActive = true;
    user.approvedAt = new Date();
    user.approvedBy = req.admin._id;

    await user.save();

    console.log(`✅ User approved: ${user.name} (${user.phone})`);

    res.status(200).json({
      success: true,
      data: {
        user,
        message: 'User approved successfully',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reject User registration
 * @route   POST /api/admin/Users/:UserId/reject
 * @access  Private (Admin)
 */
exports.rejectUser = async (req, res, next) => {
  try {
    const { UserId } = req.params;
    const { reason } = req.body;

    const user = await User.findById(UserId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (User.status === 'rejected') {
      return res.status(400).json({
        success: false,
        message: 'User is already rejected',
      });
    }

    // Reject User
    User.status = 'rejected';
    User.isActive = false;
    await User.save();

    // TODO: Send rejection notification to User with reason
    console.log(`❌ User rejected: ${user.name} (${user.phone})${reason ? ` - Reason: ${reason}` : ''}`);

    res.status(200).json({
      success: true,
      data: {
        User,
        message: 'User rejected successfully',
      },
    });
  } catch (error) {
    next(error);
  }
};

// End of User management controllers


/**
 * @desc    Ban User (temporary or permanent) - requires >3 escalations
 * @route   PUT /api/admin/Users/:UserId/ban
 * @access  Private (Admin)
 */
exports.banUser = async (req, res, next) => {
  try {
    const { UserId } = req.params;
    const { banType = 'temporary', banReason, banExpiry } = req.body; // banType: 'temporary' or 'permanent'

    if (!['temporary', 'permanent'].includes(banType)) {
      return res.status(400).json({
        success: false,
        message: "banType must be 'temporary' or 'permanent'",
      });
    }

    const user = await User.findById(UserId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check if User is already banned
    if (User.banInfo.isBanned) {
      return res.status(400).json({
        success: false,
        message: `User is already banned (${User.banInfo.banType}). Please unban first if you want to change the ban type.`,
      });
    }

    // Set ban information
    User.banInfo.isBanned = true;
    User.banInfo.banType = banType;
    User.banInfo.bannedAt = new Date();
    User.banInfo.bannedBy = req.admin._id;
    User.banInfo.banReason = banReason || 'Banned due to multiple order escalations';

    // Set ban expiry for temporary bans
    if (banType === 'temporary') {
      if (banExpiry) {
        User.banInfo.banExpiry = new Date(banExpiry);
      } else {
        // Default: 30 days from now
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 30);
        User.banInfo.banExpiry = expiryDate;
      }
    } else {
      // Permanent ban - no expiry
      User.banInfo.banExpiry = undefined;
    }

    // Update User status
    User.status = banType === 'temporary' ? 'temporarily_banned' : 'permanently_banned';
    User.isActive = false;

    await User.save();

    // TODO: Send notification to User
    console.log(`🚫 User banned: ${user.name} (${user.phone}) - Type: ${banType}${banReason ? ` - Reason: ${banReason}` : ''}`);

    res.status(200).json({
      success: true,
      data: {
        User: {
          id: user._id,
          name: user.name,
          phone: user.phone,
          status: User.status,
          banInfo: User.banInfo,
        },
        message: `User ${banType === 'temporary' ? 'temporarily' : 'permanently'} banned successfully`,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Revoke temporary ban
 * @route   PUT /api/admin/Users/:UserId/unban
 * @access  Private (Admin)
 */
exports.unbanUser = async (req, res, next) => {
  try {
    const { UserId } = req.params;
    const { revocationReason } = req.body;

    const user = await User.findById(UserId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check if User is banned
    if (!User.banInfo.isBanned) {
      return res.status(400).json({
        success: false,
        message: 'User is not currently banned',
      });
    }

    // Can only unban temporary bans (permanent bans require deletion)
    if (User.banInfo.banType === 'permanent') {
      return res.status(400).json({
        success: false,
        message: 'Cannot unban a permanently banned User. Use delete User instead if needed.',
      });
    }

    // Revoke ban
    User.banInfo.isBanned = false;
    User.banInfo.banType = 'none';
    User.banInfo.revokedAt = new Date();
    User.banInfo.revokedBy = req.admin._id;
    User.banInfo.revocationReason = revocationReason || 'Ban revoked by admin';

    // Update User status
    User.status = 'approved';
    User.isActive = true;

    await User.save();

    // TODO: Send notification to User
    console.log(`✅ User ban revoked: ${user.name} (${user.phone})${revocationReason ? ` - Reason: ${revocationReason}` : ''}`);

    res.status(200).json({
      success: true,
      data: {
        User: {
          id: user._id,
          name: user.name,
          phone: user.phone,
          status: User.status,
          banInfo: User.banInfo,
        },
        message: 'User ban revoked successfully',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Permanently delete User (soft delete - activities persist) - requires >3 escalations
 * @route   DELETE /api/admin/Users/:UserId
 * @access  Private (Admin)
 */
exports.deleteUser = async (req, res, next) => {
  try {
    const { UserId } = req.params;
    const { deletionReason } = req.body;

    const user = await User.findById(UserId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check if User is already deleted
    if (User.isDeleted) {
      return res.status(400).json({
        success: false,
        message: 'User is already deleted',
      });
    }

    // Check escalation count (requires >3 escalations)
    if ((User.escalationCount || 0) <= 3) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete User. Requires more than 3 escalations. Current escalation count: ' + (User.escalationCount || 0),
      });
    }

    // Soft delete User (activities persist)
    User.isDeleted = true;
    User.deletedAt = new Date();
    User.deletedBy = req.admin._id;
    User.deletionReason = deletionReason || 'Deleted due to multiple order escalations';
    User.status = 'permanently_banned';
    User.isActive = false;

    // Also update ban info if not already set
    if (!User.banInfo.isBanned) {
      User.banInfo.isBanned = true;
      User.banInfo.banType = 'permanent';
      User.banInfo.bannedAt = new Date();
      User.banInfo.bannedBy = req.admin._id;
      User.banInfo.banReason = 'Permanently banned and deleted';
    }

    await User.save();

    // TODO: Send notification
    console.log(`🗑️ User deleted: ${user.name} (${user.phone})${deletionReason ? ` - Reason: ${deletionReason}` : ''}`);

    res.status(200).json({
      success: true,
      data: {
        User: {
          id: user._id,
          name: user.name,
          phone: user.phone,
          isDeleted: User.isDeleted,
          deletedAt: User.deletedAt,
        },
        message: 'User deleted successfully (soft delete - activities persist)',
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// User WITHDRAWAL MANAGEMENT CONTROLLERS
// ============================================================================

/**
 * @desc    Get all User withdrawal requests (global)
 * @route   GET /api/admin/Users/withdrawals
 * @access  Private (Admin)
 */

/**
 * @desc    Get User rankings based on performance metrics
 * @route   GET /api/admin/Users/rankings
 * @access  Private (Admin)
 */
exports.getUserRankings = async (req, res, next) => {
  try {
    const { sortBy = 'creditScore', order = 'desc', limit = 100 } = req.query;

    const sortOrder = order === 'asc' ? 1 : -1;
    let sortStage = {};

    // Map frontend sort keys to backend fields
    switch (sortBy) {
      case 'orderFrequency':
        sortStage = { orderCount: sortOrder };
        break;
      case 'repaymentFrequency':
        sortStage = { 'creditHistory.totalRepaymentCount': sortOrder };
        break;
      case 'repaymentAmount':
        sortStage = { 'creditHistory.totalRepaid': sortOrder };
        break;
      case 'creditScore':
      default:
        sortStage = { 'creditHistory.creditScore': sortOrder };
        break;
    }

    const Users = await User.aggregate([
      {
        $match: {
          isActive: true,
          isDeleted: { $ne: true }
        }
      },
      // Simplified rankings without credit-related data
      {
        $project: {
          name: 1,
          userId: 1,
          email: 1,
          phone: 1,
          shopName: 1,
          'location.city': 1,
          'location.state': 1,
          performanceTier: 1,
          orderCount: { $literal: 0 }, // Placeholder for now
        }
      },
      { $limit: parseInt(limit) }
    ]);

    res.status(200).json({
      success: true,
      data: {
        rankings: Users
      }
    });

  } catch (error) {
    next(error);
  }
};

exports.getAllUserWithdrawals = async (req, res, next) => {
  try {
    const { status, UserId, page = 1, limit = 20, search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    // Build query
    const query = {
      userType: 'User',
    };

    if (status) {
      query.status = status;
    }

    if (UserId) {
      query.userId = UserId;
    }

    // Search functionality (by User name or amount)
    if (search) {
      const searchNum = parseFloat(search);
      if (!isNaN(searchNum)) {
        // Search by amount
        query.amount = { $gte: searchNum * 0.9, $lte: searchNum * 1.1 }; // Allow 10% tolerance
      }
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Sort
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query with User population
    const withdrawals = await WithdrawalRequest.find(query)
      .populate('UserId', 'name phone email')
      .populate('bankAccountId')
      .populate('reviewedBy', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .select('-__v');

    // If search was provided and it's a string, filter by User name
    let filteredWithdrawals = withdrawals;
    if (search && isNaN(parseFloat(search))) {
      filteredWithdrawals = withdrawals.filter(withdrawal => {
        const UserName = withdrawal.userId?.name || '';
        return UserName.toLowerCase().includes(search.toLowerCase());
      });
    }

    // Get total count (after search filter if applicable)
    let total = await WithdrawalRequest.countDocuments(query);
    if (search && isNaN(parseFloat(search))) {
      total = filteredWithdrawals.length;
    }

    res.status(200).json({
      success: true,
      data: {
        withdrawals: filteredWithdrawals,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          totalItems: total,
          itemsPerPage: limitNum,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create payment intent for User withdrawal
 * @route   POST /api/admin/Users/withdrawals/:requestId/payment-intent
 * @access  Private (Admin)
 */
exports.createUserWithdrawalPaymentIntent = async (req, res, next) => {
  try {
    console.log('🔍 [createUserWithdrawalPaymentIntent] Starting...');
    console.log('🔍 [createUserWithdrawalPaymentIntent] Request params:', req.params);
    console.log('🔍 [createUserWithdrawalPaymentIntent] Request body:', req.body);

    const { requestId } = req.params;
    const { amount } = req.body;

    console.log('🔍 [createUserWithdrawalPaymentIntent] Looking for withdrawal:', requestId);

    const withdrawal = await WithdrawalRequest.findById(requestId)
      .populate('UserId');

    console.log('🔍 [createUserWithdrawalPaymentIntent] Withdrawal found:', withdrawal ? 'Yes' : 'No');
    if (withdrawal) {
      console.log('🔍 [createUserWithdrawalPaymentIntent] Withdrawal status:', withdrawal.status);
      console.log('🔍 [createUserWithdrawalPaymentIntent] Withdrawal userType:', withdrawal.userType);
      console.log('🔍 [createUserWithdrawalPaymentIntent] Withdrawal amount:', withdrawal.amount);
      console.log('🔍 [createUserWithdrawalPaymentIntent] User populated:', withdrawal.userId ? 'Yes' : 'No');
      if (withdrawal.userId) {
        console.log('🔍 [createUserWithdrawalPaymentIntent] User ID:', withdrawal.userId._id);
        console.log('🔍 [createUserWithdrawalPaymentIntent] User name:', withdrawal.userId.name);
      }
    }

    if (!withdrawal) {
      console.error('❌ [createUserWithdrawalPaymentIntent] Withdrawal not found');
      return res.status(404).json({
        success: false,
        message: 'Withdrawal request not found',
      });
    }

    if (withdrawal.userType !== 'User') {
      console.error('❌ [createUserWithdrawalPaymentIntent] Invalid userType:', withdrawal.userType);
      return res.status(400).json({
        success: false,
        message: 'This is not a User withdrawal request',
      });
    }

    if (withdrawal.status !== 'pending') {
      console.error('❌ [createUserWithdrawalPaymentIntent] Invalid status:', withdrawal.status);
      return res.status(400).json({
        success: false,
        message: `Withdrawal request is already ${withdrawal.status}`,
      });
    }

    // Use withdrawal amount if not provided
    const paymentAmount = amount || withdrawal.amount;
    console.log('🔍 [createUserWithdrawalPaymentIntent] Payment amount:', paymentAmount);

    // Ensure User is populated
    if (!withdrawal.userId || !withdrawal.userId._id) {
      console.error('❌ [createUserWithdrawalPaymentIntent] User information not found');
      console.error('❌ [createUserWithdrawalPaymentIntent] withdrawal.userId:', withdrawal.userId);
      return res.status(400).json({
        success: false,
        message: 'User information not found',
      });
    }

    console.log('🔍 [createUserWithdrawalPaymentIntent] Creating Razorpay order...');
    console.log('🔍 [createUserWithdrawalPaymentIntent] razorpayService available:', typeof razorpayService !== 'undefined' ? 'Yes' : 'No');
    console.log('🔍 [createUserWithdrawalPaymentIntent] razorpayService.createOrder:', typeof razorpayService?.createOrder === 'function' ? 'Yes' : 'No');

    // Create Razorpay order
    // Receipt must be max 40 characters (Razorpay requirement)
    const receiptPrefix = `wd_${withdrawal._id.toString().slice(-8)}_`;
    const timestamp = Date.now().toString().slice(-8);
    const receipt = (receiptPrefix + timestamp).slice(0, 40); // Ensure max 40 chars

    console.log('🔍 [createUserWithdrawalPaymentIntent] Receipt generated:', receipt, 'Length:', receipt.length);

    const razorpayOrder = await razorpayService.createOrder({
      amount: paymentAmount,
      currency: 'INR',
      receipt: receipt,
      notes: {
        withdrawalRequestId: withdrawal._id.toString(),
        userId: withdrawal.userId._id.toString(),
        UserName: withdrawal.userId.name || 'Unknown User',
        type: 'User_withdrawal',
      },
    });

    console.log('✅ [createUserWithdrawalPaymentIntent] Razorpay order created:', razorpayOrder?.id);

    // Get Razorpay Key ID
    const keyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_key';
    console.log('🔍 [createUserWithdrawalPaymentIntent] Razorpay Key ID:', keyId ? 'Present' : 'Missing');

    const response = {
      success: true,
      data: {
        paymentIntent: {
          id: razorpayOrder.id,
          amount: paymentAmount,
          currency: 'INR',
          status: razorpayOrder.status,
          razorpayOrderId: razorpayOrder.id,
          keyId: keyId,
          receipt: razorpayOrder.receipt,
          createdAt: new Date(),
          isTestMode: !process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET,
        },
        message: process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
          ? 'Payment intent created successfully'
          : 'Payment intent created (Test Mode)',
      },
    };

    console.log('✅ [createUserWithdrawalPaymentIntent] Sending success response');
    res.status(200).json(response);
  } catch (error) {
    console.error('❌ [createUserWithdrawalPaymentIntent] Error occurred:');
    console.error('❌ [createUserWithdrawalPaymentIntent] Error message:', error.message);
    console.error('❌ [createUserWithdrawalPaymentIntent] Error stack:', error.stack);
    console.error('❌ [createUserWithdrawalPaymentIntent] Full error:', error);
    next(error);
  }
};

/**
 * @desc    Approve User withdrawal request
 * @route   POST /api/admin/Users/withdrawals/:requestId/approve
 * @access  Private (Admin)
 */
exports.approveUserWithdrawal = async (req, res, next) => {
  try {
    const { requestId } = req.params;
    const { paymentReference, paymentMethod, paymentDate, adminRemarks } = req.body;

    const withdrawal = await WithdrawalRequest.findById(requestId)
      .populate('userId')
      .populate('bankAccountId');

    if (!withdrawal) {
      return res.status(404).json({
        success: false,
        message: 'Withdrawal request not found',
      });
    }

    if (withdrawal.userType !== 'User') {
      return res.status(400).json({
        success: false,
        message: 'This is not a User withdrawal request',
      });
    }

    if (withdrawal.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Withdrawal request is already ${withdrawal.status}`,
      });
    }

    const user = await User.findById(withdrawal.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Calculate available balance
    const totalEarningsResult = await UserEarning.aggregate([
      {
        $match: {
          userId: user._id,
          status: 'processed',
        },
      },
      {
        $group: {
          _id: null,
          totalEarnings: { $sum: '$earnings' },
        },
      },
    ]);

    const totalEarnings = totalEarningsResult[0]?.totalEarnings || 0;

    const pendingWithdrawals = await WithdrawalRequest.aggregate([
      {
        $match: {
          userId: user._id,
          status: 'pending',
          _id: { $ne: withdrawal._id },
        },
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
        },
      },
    ]);

    const pendingWithdrawalAmount = pendingWithdrawals[0]?.totalAmount || 0;
    const availableBalance = totalEarnings - pendingWithdrawalAmount;

    if (withdrawal.amount > availableBalance) {
      return res.status(400).json({
        success: false,
        message: `Insufficient balance. Available: ₹${Math.round(availableBalance * 100) / 100}, Requested: ₹${withdrawal.amount}`,
      });
    }

    // Approve withdrawal
    withdrawal.status = 'approved';
    withdrawal.reviewedBy = req.admin._id;
    withdrawal.reviewedAt = new Date();
    if (paymentReference) withdrawal.paymentReference = paymentReference;
    if (paymentMethod) withdrawal.paymentMethod = paymentMethod;
    if (paymentDate) withdrawal.paymentDate = new Date(paymentDate);
    if (adminRemarks) withdrawal.adminRemarks = adminRemarks;

    // Store payment gateway details if provided
    if (req.body.gatewayPaymentId) withdrawal.gatewayPaymentId = req.body.gatewayPaymentId;
    if (req.body.gatewayOrderId) withdrawal.gatewayOrderId = req.body.gatewayOrderId;
    if (req.body.gatewaySignature) withdrawal.gatewaySignature = req.body.gatewaySignature;

    await withdrawal.save();

    // SEND User NOTIFICATION: Withdrawal Approved
    try {
      await UserNotification.createNotification({
        userId: user._id,
        type: 'withdrawal_approved',
        title: 'Withdrawal Approved',
        message: `Your withdrawal request for ₹${withdrawal.amount} has been approved and processed.`,
        relatedEntityType: 'withdrawal',
        relatedEntityId: withdrawal._id,
        priority: 'normal',
        metadata: { amount: withdrawal.amount, paymentMethod: paymentMethod || 'manual' }
      });
    } catch (notifError) {
      console.error('Failed to send User withdrawal notification:', notifError);
    }

    // Mark User earnings as withdrawn (oldest first until withdrawal amount is covered)
    let remainingAmount = withdrawal.amount;
    const earningsToMark = await UserEarning.find({
      userId: user._id,
      status: 'processed',
    }).sort({ processedAt: 1 }); // Oldest first

    for (const earning of earningsToMark) {
      if (remainingAmount <= 0) break;

      if (earning.earnings <= remainingAmount) {
        // Mark entire earning as withdrawn
        earning.status = 'withdrawn';
        earning.withdrawnAt = new Date();
        earning.withdrawalRequestId = withdrawal._id;
        remainingAmount -= earning.earnings;
        await earning.save();
      } else {
        // Partial withdrawal - create a new earning record for remaining amount
        const remainingEarning = new UserEarning({
          userId: earning.userId,
          orderId: earning.orderId,
          productId: earning.productId,
          productName: earning.productName,
          quantity: earning.quantity,
          userPrice: earning.userPrice,
          UserPrice: earning.UserPrice,
          earnings: earning.earnings - remainingAmount,
          status: 'processed',
          processedAt: earning.processedAt,
          notes: `Remaining amount after withdrawal ${withdrawal._id}`,
        });
        await remainingEarning.save();

        // Mark original earning as withdrawn
        earning.earnings = remainingAmount;
        earning.status = 'withdrawn';
        earning.withdrawnAt = new Date();
        earning.withdrawalRequestId = withdrawal._id;
        await earning.save();
        remainingAmount = 0;
      }
    }

    // Log to payment history
    try {
      const bankAccount = withdrawal.bankAccountId;
      await createPaymentHistory({
        activityType: 'User_withdrawal_approved',
        userId: user._id,
        withdrawalRequestId: withdrawal._id,
        bankAccountId: bankAccount?._id,
        amount: withdrawal.amount,
        status: 'completed',
        paymentMethod: paymentMethod || 'razorpay',
        bankDetails: bankAccount ? {
          accountHolderName: bankAccount.accountHolderName,
          accountNumber: bankAccount.accountNumber,
          ifscCode: bankAccount.ifscCode,
          bankName: bankAccount.bankName,
        } : undefined,
        processedBy: req.admin._id,
        description: `User withdrawal of ₹${withdrawal.amount} approved and paid for ${user.name}`,
        metadata: {
          UserName: user.name,
          UserPhone: user.phone,
          paymentReference,
          gatewayPaymentId: req.body.gatewayPaymentId,
          gatewayOrderId: req.body.gatewayOrderId,
          adminRemarks,
        },
      });
    } catch (historyError) {
      console.error('Error logging withdrawal history:', historyError);
      // Don't fail approval if history logging fails
    }

    console.log(`✅ User withdrawal approved: ₹${withdrawal.amount} for User ${user.name} (${user.phone})`);

    res.status(200).json({
      success: true,
      data: {
        withdrawal,
        User: {
          id: user._id,
          name: user.name,
          phone: user.phone,
        },
        message: 'Withdrawal approved successfully',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reject User withdrawal request
 * @route   POST /api/admin/Users/withdrawals/:requestId/reject
 * @access  Private (Admin)
 */
exports.rejectUserWithdrawal = async (req, res, next) => {
  try {
    const { requestId } = req.params;
    const { reason, adminRemarks } = req.body;

    const withdrawal = await WithdrawalRequest.findById(requestId)
      .populate('UserId');

    if (!withdrawal) {
      return res.status(404).json({
        success: false,
        message: 'Withdrawal request not found',
      });
    }

    if (withdrawal.userType !== 'User') {
      return res.status(400).json({
        success: false,
        message: 'This is not a User withdrawal request',
      });
    }

    if (withdrawal.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Withdrawal request is already ${withdrawal.status}`,
      });
    }

    const user = await User.findById(withdrawal.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Reject withdrawal
    withdrawal.status = 'rejected';
    withdrawal.reviewedBy = req.admin._id;
    withdrawal.reviewedAt = new Date();
    if (reason) {
      withdrawal.rejectionReason = reason;
    }
    if (adminRemarks) {
      withdrawal.adminRemarks = adminRemarks;
    }
    await withdrawal.save();

    // Log to payment history
    try {
      await createPaymentHistory({
        activityType: 'User_withdrawal_rejected',
        userId: user._id,
        withdrawalRequestId: withdrawal._id,
        amount: withdrawal.amount,
        status: 'rejected',
        processedBy: req.admin._id,
        description: `User withdrawal of ₹${withdrawal.amount} rejected${reason ? ` - Reason: ${reason}` : ''}`,
        metadata: {
          UserName: user.name,
          UserPhone: user.phone,
          reason,
          adminRemarks,
        },
      });
    } catch (historyError) {
      console.error('Error logging withdrawal history:', historyError);
      // Don't fail rejection if history logging fails
    }

    console.log(`❌ User withdrawal rejected: ₹${withdrawal.amount}${reason ? ` - Reason: ${reason}` : ''}`);

    res.status(200).json({
      success: true,
      data: {
        withdrawal,
        User: {
          id: user._id,
          name: user.name,
          phone: user.phone,
        },
        message: 'Withdrawal rejected successfully',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Mark User withdrawal as completed (after payment processed)
 * @route   PUT /api/admin/Users/withdrawals/:requestId/complete
 * @access  Private (Admin)
 */
exports.completeUserWithdrawal = async (req, res, next) => {
  try {
    const { requestId } = req.params;
    const { paymentReference, paymentMethod, paymentDate } = req.body;

    const withdrawal = await WithdrawalRequest.findById(requestId)
      .populate('UserId');

    if (!withdrawal) {
      return res.status(404).json({
        success: false,
        message: 'Withdrawal request not found',
      });
    }

    if (withdrawal.userType !== 'User') {
      return res.status(400).json({
        success: false,
        message: 'This is not a User withdrawal request',
      });
    }

    if (withdrawal.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: `Withdrawal request must be approved before marking as completed. Current status: ${withdrawal.status}`,
      });
    }

    // Mark as completed
    withdrawal.status = 'completed';
    withdrawal.processedAt = new Date();
    if (paymentReference) withdrawal.paymentReference = paymentReference;
    if (paymentMethod) withdrawal.paymentMethod = paymentMethod;
    if (paymentDate) withdrawal.paymentDate = new Date(paymentDate);
    await withdrawal.save();

    // Log to payment history
    try {
      const user = await User.findById(withdrawal.userId);
      const bankAccount = await BankAccount.findById(withdrawal.bankAccountId);
      await createPaymentHistory({
        activityType: 'User_withdrawal_completed',
        userId: withdrawal.userId,
        withdrawalRequestId: withdrawal._id,
        bankAccountId: withdrawal.bankAccountId,
        amount: withdrawal.amount,
        status: 'completed',
        paymentMethod: paymentMethod || 'bank_transfer',
        bankDetails: bankAccount ? {
          accountHolderName: bankAccount.accountHolderName,
          accountNumber: bankAccount.accountNumber,
          ifscCode: bankAccount.ifscCode,
          bankName: bankAccount.bankName,
        } : undefined,
        processedBy: req.admin._id,
        description: `User withdrawal of ₹${withdrawal.amount} completed${paymentReference ? ` - Reference: ${paymentReference}` : ''}`,
        metadata: {
          UserName: User?.name,
          paymentReference,
          paymentDate,
        },
      });
    } catch (historyError) {
      console.error('Error logging withdrawal history:', historyError);
      // Don't fail completion if history logging fails
    }

    console.log(`✅ User withdrawal completed: ₹${withdrawal.amount} for User ${withdrawal.userId?.name}`);

    res.status(200).json({
      success: true,
      data: {
        withdrawal,
        message: 'Withdrawal marked as completed successfully',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get payment history for admin
 * @route   GET /api/admin/payment-history
 * @access  Private (Admin)
 */
exports.getPaymentHistory = async (req, res, next) => {
  try {
    const {
      activityType,
      userId,
      UserId,
      sellerId,
      orderId,
      startDate,
      endDate,
      status,
      page = 1,
      limit = 50,
      search,
    } = req.query;

    console.log('🔍 [PaymentHistory] Request params:', {
      activityType,
      userId,
      UserId,
      sellerId,
      orderId,
      startDate,
      endDate,
      status,
      page,
      limit,
      search,
    });

    const query = {};

    // Filter by activity type
    if (activityType) {
      query.activityType = activityType;
    }

    // Filter by user
    if (userId) {
      query.userId = userId;
    }

    // Filter by User
    if (UserId) {
      query.userId = UserId;
    }


    // Filter by order
    if (orderId) {
      query.orderId = orderId;
    }

    // Filter by status
    if (status) {
      query.status = status;
    }

    // Filter by date range
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build aggregation pipeline for search
    let pipeline = [{ $match: query }];

    // If search is provided, search in description and metadata
    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { description: { $regex: search, $options: 'i' } },
            { 'metadata.UserName': { $regex: search, $options: 'i' } },
            { 'metadata.sellerName': { $regex: search, $options: 'i' } },
            { 'metadata.orderNumber': { $regex: search, $options: 'i' } },
          ],
        },
      });
    }

    // Add population and sorting
    pipeline.push(
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limitNum },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user',
        },
      },

      {
        $lookup: {
          from: 'orders',
          localField: 'orderId',
          foreignField: '_id',
          as: 'order',
        },
      },
      {
        $project: {
          activityType: 1,
          amount: 1,
          currency: 1,
          status: 1,
          paymentMethod: 1,
          bankDetails: 1,
          description: 1,
          metadata: 1,
          processedBy: 1,
          processedAt: 1,
          createdAt: 1,
          updatedAt: 1,
          userId: 1,
          orderId: 1,
          withdrawalRequestId: 1,
          bankAccountId: 1,
          user: { $arrayElemAt: ['$user', 0] },
          order: { $arrayElemAt: ['$order', 0] },
        },
      }
    );

    // Get PaymentHistory records
    console.log('📊 [PaymentHistory] Query:', JSON.stringify(query, null, 2));
    const [history, totalResult] = await Promise.all([
      PaymentHistory.aggregate(pipeline),
      PaymentHistory.countDocuments(query),
    ]);

    console.log(`📊 [PaymentHistory] Found ${history.length} PaymentHistory records, total: ${totalResult}`);

    // Also include Payment records that might not be in PaymentHistory
    // This ensures we show all payments even if PaymentHistory logging failed
    const shouldIncludePayments = !activityType || activityType === 'all' ||
      activityType === 'user_payment_advance' || activityType === 'user_payment_remaining';

    let combinedHistory = history;
    let totalCount = totalResult;

    if (shouldIncludePayments) {
      const paymentQuery = {};

      // Apply date filter to payments
      if (startDate || endDate) {
        paymentQuery.createdAt = {};
        if (startDate) paymentQuery.createdAt.$gte = new Date(startDate);
        if (endDate) paymentQuery.createdAt.$lte = new Date(endDate);
      }

      // Apply status filter - map PaymentHistory status to Payment status
      if (status && status !== 'all') {
        if (status === 'completed') {
          paymentQuery.status = PAYMENT_STATUS.FULLY_PAID;
        } else if (status === 'pending') {
          paymentQuery.status = PAYMENT_STATUS.PARTIAL_PAID;
        } else {
          paymentQuery.status = status;
        }
      }

      // Apply user filter
      if (userId) {
        paymentQuery.userId = userId;
      }

      // Apply order filter
      if (orderId) {
        paymentQuery.orderId = orderId;
      }

      // Filter by payment type if specific activity type is requested
      if (activityType === 'user_payment_advance') {
        paymentQuery.paymentType = { $in: ['advance', 'full'] };
      } else if (activityType === 'user_payment_remaining') {
        paymentQuery.paymentType = 'remaining';
      }

      // Get all payments (we'll merge and paginate after)
      console.log('💳 [PaymentHistory] Payment query:', JSON.stringify(paymentQuery, null, 2));
      const allPayments = await Payment.find(paymentQuery)
        .sort({ createdAt: -1 })
        .populate('userId', 'name phone userId')
        .populate('orderId', 'orderNumber totalAmount')
        .select('-__v');

      console.log(`💳 [PaymentHistory] Found ${allPayments.length} Payment records`);

      // Convert Payment records to PaymentHistory format for consistency
      const paymentHistoryEntries = allPayments.map(payment => {
        // Determine activity type based on payment type
        let activityTypeFromPayment = 'user_payment_advance';
        if (payment.paymentType === 'remaining') {
          activityTypeFromPayment = 'user_payment_remaining';
        } else if (payment.paymentType === 'full') {
          activityTypeFromPayment = 'user_payment_advance';
        }

        return {
          _id: payment._id,
          historyId: payment.paymentId,
          activityType: activityTypeFromPayment,
          userId: payment.userId?._id,
          orderId: payment.orderId?._id,
          paymentId: payment._id,
          amount: payment.amount,
          currency: 'INR',
          status: payment.status === PAYMENT_STATUS.FULLY_PAID ? 'completed' :
            payment.status === PAYMENT_STATUS.PARTIAL_PAID ? 'pending' :
              payment.status,
          paymentMethod: payment.paymentMethod,
          description: `User ${payment.paymentType} payment of ₹${payment.amount}${payment.orderId?.orderNumber ? ` for order ${payment.orderId.orderNumber}` : ''}`,
          metadata: {
            orderNumber: payment.orderId?.orderNumber,
            paymentId: payment.paymentId,
            paymentType: payment.paymentType,
          },
          createdAt: payment.createdAt,
          updatedAt: payment.updatedAt,
          processedAt: payment.paidAt || payment.createdAt,
          user: payment.userId ? {
            _id: payment.userId._id,
            name: payment.userId.name,
            phone: payment.userId.phone,
            userId: payment.userId.userId,
          } : null,
          order: payment.orderId ? {
            _id: payment.orderId._id,
            orderNumber: payment.orderId.orderNumber,
            totalAmount: payment.orderId.totalAmount,
          } : null,
        };
      });

      // Merge PaymentHistory and Payment records, removing duplicates
      // A payment is a duplicate if it has the same paymentId in metadata
      const existingPaymentIds = new Set(
        history
          .filter(h => h.metadata?.paymentId)
          .map(h => h.metadata.paymentId)
      );

      const uniquePaymentEntries = paymentHistoryEntries.filter(
        entry => !existingPaymentIds.has(entry.metadata?.paymentId)
      );

      console.log(`💳 [PaymentHistory] Unique Payment entries after deduplication: ${uniquePaymentEntries.length}`);

      // Combine and sort by date
      combinedHistory = [...history, ...uniquePaymentEntries]
        .sort((a, b) => {
          const dateA = new Date(a.createdAt || a.processedAt || 0);
          const dateB = new Date(b.createdAt || b.processedAt || 0);
          return dateB - dateA;
        });

      // Apply pagination after merging
      const skip = (pageNum - 1) * limitNum;
      combinedHistory = combinedHistory.slice(skip, skip + limitNum);

      // Update total count
      totalCount = history.length + uniquePaymentEntries.length;
    }

    // Calculate summary statistics
    const summaryPipeline = [
      { $match: query },
      {
        $group: {
          _id: '$activityType',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
        },
      },
    ];

    const summary = await PaymentHistory.aggregate(summaryPipeline);

    console.log(`✅ [PaymentHistory] Returning ${combinedHistory.length} records, total: ${totalCount}, page: ${pageNum}/${Math.ceil(totalCount / limitNum)}`);

    res.status(200).json({
      success: true,
      data: {
        history: combinedHistory,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limitNum),
        },
        summary,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get payment history statistics
 * @route   GET /api/admin/payment-history/stats
 * @access  Private (Admin)
 */
exports.getPaymentHistoryStats = async (req, res, next) => {
  try {
    const { startDate, endDate, status } = req.query;

    console.log('📊 [PaymentHistoryStats] Calculating stats with params:', { startDate, endDate, status });

    const query = {};
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Determine status filter
    let statusFilter = { $in: ['completed', 'credited', 'approved'] };
    if (status && status !== 'all') {
      if (status === 'completed') {
        statusFilter = { $in: ['completed', 'credited', 'approved'] };
      } else if (status === 'pending') {
        statusFilter = { $in: ['pending', 'requested'] };
      } else if (status === 'rejected') {
        statusFilter = 'rejected';
      } else {
        statusFilter = status;
      }
    }

    // Get stats from PaymentHistory
    const historyStatsCompleted = await PaymentHistory.aggregate([
      {
        $match: {
          ...query,
          status: statusFilter
        }
      },
      {
        $group: {
          _id: null,
          totalUserPayments: {
            $sum: {
              $cond: [
                { $in: ['$activityType', ['user_payment_advance', 'user_payment_remaining']] },
                '$amount',
                0,
              ],
            },
          },
        },
      },
    ]);

    // Get total activities count
    const totalActivitiesResult = await PaymentHistory.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalActivities: { $sum: 1 },
        },
      },
    ]);

    // Get Payment records stats
    const paymentQuery = {};
    if (startDate || endDate) {
      paymentQuery.createdAt = {};
      if (startDate) paymentQuery.createdAt.$gte = new Date(startDate);
      if (endDate) paymentQuery.createdAt.$lte = new Date(endDate);
    }

    if (status && status !== 'all') {
      if (status === 'completed') {
        paymentQuery.status = PAYMENT_STATUS.FULLY_PAID;
      } else if (status === 'pending') {
        paymentQuery.status = PAYMENT_STATUS.PARTIAL_PAID;
      }
    } else {
      paymentQuery.status = PAYMENT_STATUS.FULLY_PAID;
    }

    // Filter out payments already in PaymentHistory
    const existingPaymentIds = await PaymentHistory.distinct('metadata.paymentId', {
      ...query,
      'metadata.paymentId': { $exists: true, $ne: null }
    });

    const paymentQueryUnique = { ...paymentQuery };
    if (existingPaymentIds.length > 0) {
      paymentQueryUnique.paymentId = { $nin: existingPaymentIds };
    }

    const paymentStats = await Payment.aggregate([
      { $match: paymentQueryUnique },
      {
        $group: {
          _id: null,
          totalUserPayments: { $sum: '$amount' },
          totalPaymentsCount: { $sum: 1 },
        },
      },
    ]);

    const historyResult = historyStatsCompleted[0] || {
      totalUserPayments: 0,
      totalUserEarnings: 0,
      totalUserWithdrawals: 0,
      totalSellerWithdrawals: 0,
      totalSellerCommissions: 0,
    };

    const paymentResult = paymentStats[0] || {
      totalUserPayments: 0,
      totalPaymentsCount: 0,
    };

    const totalActivities = (totalActivitiesResult[0]?.totalActivities || 0) + paymentResult.totalPaymentsCount;

    const data = {
      totalPayments: (historyResult.totalUserPayments || 0) + (paymentResult.totalUserPayments || 0),
      totalEarnings: historyResult.totalUserEarnings || 0,
      totalWithdrawals: (historyResult.totalUserWithdrawals || 0) + (historyResult.totalSellerWithdrawals || 0),
      totalCommissions: historyResult.totalSellerCommissions || 0,
      totalActivities,
      stats: {
        history: historyResult,
        payments: paymentResult,
      },
    };

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('❌ [PaymentHistoryStats] Error:', error);
    next(error);
  }
};

/**
 * @desc    Get all withdrawals (Users + sellers) for admin dashboard
 * @route   GET /api/admin/withdrawals
 * @access  Private (Admin)
 */
exports.getAllWithdrawals = async (req, res, next) => {
  try {
    const { userType, status, page = 1, limit = 20, search } = req.query;

    const query = {};

    if (userType) {
      query.userType = userType;
    }

    if (status) {
      query.status = status;
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build population based on userType
    let withdrawals = await WithdrawalRequest.find(query)
      .populate('UserId', 'name phone email')
      .populate('sellerId', 'sellerId name phone email wallet')
      .populate('bankAccountId')
      .populate('reviewedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .select('-__v');

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      withdrawals = withdrawals.filter(withdrawal => {
        if (withdrawal.userType === 'User') {
          return withdrawal.userId?.name?.toLowerCase().includes(searchLower) ||
            withdrawal.userId?.phone?.includes(search);
        } else {
          return withdrawal.sellerId?.name?.toLowerCase().includes(searchLower) ||
            withdrawal.sellerId?.sellerId?.toLowerCase().includes(searchLower) ||
            withdrawal.sellerId?.phone?.includes(search);
        }
      });
    }

    const total = await WithdrawalRequest.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        withdrawals,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          totalItems: total,
          itemsPerPage: limitNum,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// USER MANAGEMENT CONTROLLERS
// ============================================================================

/**
 * @desc    Get all users with filtering and pagination
 * @route   GET /api/admin/users
 * @access  Private (Admin)
 */
exports.getUsers = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      isActive,
      isBlocked,
      sellerId,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    // Build query
    const query = {};

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    if (isBlocked !== undefined) {
      query.isBlocked = isBlocked === 'true';
    }

    if (sellerId) {
      query.sellerId = sellerId;
    }

    if (search) {
      query.$or = [
        { userId: { $regex: search, $options: 'i' } }, // Search by unique user ID
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { 'location.address': { $regex: search, $options: 'i' } },
        { 'location.city': { $regex: search, $options: 'i' } },
      ];
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Sort
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query
    const users = await User.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .select('-__v -otp');

    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        users,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          totalItems: total,
          itemsPerPage: limitNum,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single user details
 * @route   GET /api/admin/users/:userId
 * @access  Private (Admin)
 */
exports.getUserDetails = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId)
      .select('-__v -otp');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Get user's orders count and stats

    const ordersCount = await Order.countDocuments({ userId: user._id });
    const totalSpentResult = await Order.aggregate([
      { $match: { userId: user._id, status: { $in: [ORDER_STATUS.DELIVERED, ORDER_STATUS.FULLY_PAID] }, paymentStatus: PAYMENT_STATUS.FULLY_PAID } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    const totalSpent = totalSpentResult[0]?.total || 0;

    // Get user's recent orders
    const recentOrders = await Order.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('orderNumber totalAmount status createdAt paymentStatus')
      .lean();

    // Get user's payments
    const payments = await Payment.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('orderId', 'orderNumber totalAmount')
      .select('-__v');

    res.status(200).json({
      success: true,
      data: {
        user,
        stats: {
          ordersCount,
          totalSpent,
          recentOrders: recentOrders.length,
        },
        recentOrders: recentOrders.map(order => ({
          id: order._id,
          orderNumber: order.orderNumber,
          value: order.totalAmount,
          date: order.createdAt,
          status: order.status,
          paymentStatus: order.paymentStatus,
        })),
        payments: payments.map(payment => ({
          id: payment._id,
          paymentId: payment.paymentId,
          amount: payment.amount,
          date: payment.createdAt,
          description: `Payment for Order ${payment.orderId?.orderNumber || 'N/A'}`,
          status: payment.status === 'fully_paid' ? 'completed' : payment.status,
          orderNumber: payment.orderId?.orderNumber,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Block/Unblock user
 * @route   PUT /api/admin/users/:userId/block
 * @access  Private (Admin)
 */
exports.blockUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { block = true, reason } = req.body; // block: true to block, false to unblock

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Block/Unblock user
    user.isBlocked = block === true || block === 'true';
    user.isActive = !user.isBlocked; // If blocked, set inactive

    await user.save();

    const action = user.isBlocked ? 'blocked' : 'unblocked';
    console.log(`✅ User ${action}: ${user.name} (${user.phone})${reason ? ` - Reason: ${reason}` : ''}`);

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          phone: user.phone,
          isBlocked: user.isBlocked,
          isActive: user.isActive,
        },
        message: `User ${action} successfully`,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// ORDER & PAYMENT MANAGEMENT CONTROLLERS
// ============================================================================

/**
 * @desc    Get all orders with filtering and pagination
 * @route   GET /api/admin/orders
 * @access  Private (Admin)
 */
exports.getOrders = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      paymentStatus,
      userId,
      dateFrom,
      dateTo,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const query = {};

    if (status) query.status = status;
    if (paymentStatus) query.paymentStatus = paymentStatus;
    if (userId) query.userId = userId;

    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        query.createdAt.$lte = toDate;
      }
    }

    if (search) {
      const matchingUsers = await User.find({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
        ],
      }).select('_id').lean();

      const userIds = matchingUsers.map(u => u._id);

      query.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        ...(userIds.length > 0 ? [{ userId: { $in: userIds } }] : []),
      ];
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const orders = await Order.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .populate('userId', 'name phone email location')
      .select('-__v')
      .lean();

    const total = await Order.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        orders,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          totalItems: total,
          itemsPerPage: limitNum,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single order details
 * @route   GET /api/admin/orders/:orderId
 * @access  Private (Admin)
 */
exports.getOrderDetails = async (req, res, next) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId)
      .populate('userId', 'name phone email location')
      .populate('items.productId', 'name sku category wholesalePrice publicPrice')
      .select('-__v');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    const payments = await Payment.find({ orderId })
      .sort({ createdAt: -1 })
      .select('-__v');

    const totalPaid = payments
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + p.amount, 0);

    const totalPending = payments
      .filter(p => p.status === 'pending')
      .reduce((sum, p) => sum + p.amount, 0);

    res.status(200).json({
      success: true,
      data: {
        order,
        payments,
        paymentSummary: {
          totalPaid,
          totalPending,
          totalAmount: order.totalAmount,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Generate invoice PDF for order
 * @route   GET /api/admin/orders/:orderId/invoice
 * @access  Private (Admin)
 */
exports.generateInvoice = async (req, res, next) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId)
      .populate('userId', 'name phone email location')
      .populate('items.productId', 'name sku category wholesalePrice publicPrice')
      .select('-__v');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Get order payments
    const payments = await Payment.find({ orderId })
      .sort({ createdAt: -1 })
      .select('-__v');

    // Calculate total paid (Sum of completed payments or order total if marked completed)
    const successPaymentsTotal = payments
      .filter(p => p.status === 'completed')
      .reduce((acc, p) => acc + (p.amount || 0), 0);
    
    // Fallback: if order is marked completed but no payment records, show total as paid
    const totalPaid = successPaymentsTotal > 0 ? successPaymentsTotal : (order.paymentStatus === 'completed' ? order.totalAmount : 0);

    // Format date
    const formatDate = (date) => {
      if (!date) return 'N/A';
      return new Date(date).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    };

    // Format currency
    const formatCurrency = (amount) => {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
      }).format(amount || 0);
    };

    // Generate HTML invoice
    const invoiceHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice - ${order.orderNumber}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      padding: 40px;
      background: #f5f5f5;
    }
    .invoice-container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      padding: 40px;
      box-shadow: 0 0 20px rgba(0,0,0,0.1);
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 3px solid #10b981;
    }
    .logo {
      font-size: 24px;
      font-weight: bold;
      color: #10b981;
    }
    .invoice-title {
      text-align: right;
    }
    .invoice-title h1 {
      font-size: 32px;
      color: #1f2937;
      margin-bottom: 5px;
    }
    .invoice-title p {
      color: #6b7280;
      font-size: 14px;
    }
    .details {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      margin-bottom: 40px;
    }
    .detail-section h3 {
      color: #374151;
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 10px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .detail-section p {
      color: #6b7280;
      font-size: 14px;
      margin: 5px 0;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    .items-table thead {
      background: #f3f4f6;
    }
    .items-table th {
      padding: 12px;
      text-align: left;
      font-weight: 600;
      color: #374151;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .items-table td {
      padding: 12px;
      border-bottom: 1px solid #e5e7eb;
      color: #1f2937;
    }
    .items-table tbody tr:hover {
      background: #f9fafb;
    }
    .text-right {
      text-align: right;
    }
    .totals {
      margin-top: 20px;
      margin-left: auto;
      width: 300px;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .total-row:last-child {
      border-bottom: none;
    }
    .total-label {
      font-weight: 600;
      color: #374151;
    }
    .total-amount {
      font-weight: bold;
      color: #1f2937;
    }
    .grand-total {
      background: #10b981;
      color: white;
      padding: 15px;
      border-radius: 5px;
      margin-top: 10px;
    }
    .grand-total .total-label {
      color: white;
      font-size: 18px;
    }
    .grand-total .total-amount {
      color: white;
      font-size: 20px;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      color: #6b7280;
      font-size: 12px;
    }
    .payment-info {
      background: #fef3c7;
      padding: 15px;
      border-radius: 5px;
      margin-top: 20px;
    }
    .payment-info h4 {
      color: #92400e;
      margin-bottom: 8px;
    }
    .payment-info p {
      color: #78350f;
      font-size: 13px;
      margin: 3px 0;
    }
    @media print {
      body {
        background: white;
        padding: 0;
      }
      .invoice-container {
        box-shadow: none;
        padding: 20px;
      }
    }
  </style>
</head>
<body>
  <div class="invoice-container">
    <div class="header">
      <div class="logo">NOOR E ADAH</div>
      <div class="invoice-title">
        <h1>INVOICE</h1>
        <p>Order #${order.orderNumber}</p>
      </div>
    </div>

    <div class="details">
      <div class="detail-section">
        <h3>Bill To</h3>
        <p><strong>${order.userId?.name || 'N/A'}</strong></p>
        <p>${order.deliveryAddress?.phone || order.userId?.phone || 'N/A'}</p>
        <p>${order.deliveryAddress?.address || order.userId?.location || 'N/A'}</p>
        <p>${order.deliveryAddress?.city || ''} ${order.deliveryAddress?.state || ''} - ${order.deliveryAddress?.pincode || ''}</p>
      </div>
      <div class="detail-section">
        <h3>Invoice Details</h3>
        <p><strong>Invoice Date:</strong> ${formatDate(new Date())}</p>
        <p><strong>Order Date:</strong> ${formatDate(order.createdAt)}</p>
        <p><strong>Order Number:</strong> ${order.orderNumber}</p>
        <p><strong>Payment Status:</strong> <span style="text-transform: capitalize;">${order.paymentStatus === 'completed' ? 'Paid' : (order.paymentStatus?.replace('_', ' ') || 'Pending')}</span></p>
        ${order.userId ? `<p><strong>User:</strong> ${order.userId.name || 'N/A'}</p>` : ''}
      </div>
    </div>

    <table class="items-table">
      <thead>
        <tr>
          <th>Item</th>
          <th>Quantity</th>
          <th class="text-right">Unit Price</th>
          <th class="text-right">Total</th>
        </tr>
      </thead>
      <tbody>
        ${order.items.map((item) => `
          <tr>
            <td>
              <strong>${item.productName || item.productId?.name || 'Product'}</strong>
              ${item.productId?.sku ? `<br><small style="color: #6b7280;">SKU: ${item.productId.sku}</small>` : ''}
            </td>
            <td>${item.quantity}</td>
            <td class="text-right">${formatCurrency(item.unitPrice)}</td>
            <td class="text-right"><strong>${formatCurrency(item.totalPrice)}</strong></td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="totals">
      <div class="total-row">
        <span class="total-label">Subtotal</span>
        <span class="total-amount">${formatCurrency(order.subtotal)}</span>
      </div>
      ${order.deliveryCharge > 0 ? `
      <div class="total-row">
        <span class="total-label">Delivery Charge</span>
        <span class="total-amount">${formatCurrency(order.deliveryCharge)}</span>
      </div>
      ` : ''}
      <div class="total-row grand-total">
        <span class="total-label">Grand Total</span>
        <span class="total-amount">${formatCurrency(order.totalAmount)}</span>
      </div>
    </div>

    <div class="payment-info">
      <h4>Payment Information</h4>
      <p><strong>Payment Type:</strong> ${order.paymentPreference === 'partial' ? 'Partial (Legacy)' : 'Full Payment'}</p>
      <p><strong>Total Paid:</strong> ${formatCurrency(totalPaid)}</p>
      <p><strong>Balance Due:</strong> ${formatCurrency(order.totalAmount - totalPaid)}</p>
    </div>

    <div class="footer">
      <p>Thank you for your business!</p>
      <p>For any queries, please contact our support team.</p>
      <p style="margin-top: 10px;">Invoice generated on ${formatDate(new Date())}</p>
    </div>
  </div>
</body>
</html>
    `;

    // Set headers for HTML response
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `inline; filename="invoice-${order.orderNumber}.html"`);
    res.send(invoiceHTML);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get escalated orders (assigned to admin)
 * @route   GET /api/admin/orders/escalated
 * @access  Private (Admin)
 */
// Legacy Order Management Functions (Removed for simplification)
// getEscalatedOrders, fulfillOrderFromWarehouse, revertEscalation, reassignOrder removed.

/**
 * @desc    Update order status
 * @route   PUT /api/admin/orders/:orderId/status
 * @access  Private (Admin)
 */
exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { status, notes } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required',
      });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Direct update logic
    order.status = status;
    order.statusTimeline.push({
      status,
      note: notes || `Status updated to ${status} by admin`,
      updatedBy: 'admin',
      timestamp: new Date()
    });

    if (status === ORDER_STATUS.DELIVERED) {
      order.deliveredAt = new Date();
    }

    await order.save();

    res.status(200).json({
      success: true,
      data: {
        order: {
          id: order._id,
          orderNumber: order.orderNumber,
          status: order.status,
          paymentStatus: order.paymentStatus,
        },
        message: `Order status updated to ${status} successfully.`,
      },
    });
  } catch (error) {
    next(error);
  }
};


/**
 * @desc    Get all payments with filtering and pagination
 * @route   GET /api/admin/payments
 * @access  Private (Admin)
 */
exports.getPayments = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      paymentMethod,
      paymentType,
      userId,
      orderId,
      dateFrom,
      dateTo,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    // Build query
    const query = {};

    if (status) {
      query.status = status;
    }

    if (paymentMethod) {
      query.paymentMethod = paymentMethod;
    }

    if (paymentType) {
      query.paymentType = paymentType;
    }

    if (userId) {
      query.userId = userId;
    }

    if (orderId) {
      query.orderId = orderId;
    }

    // Date range filter
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) {
        query.createdAt.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        query.createdAt.$lte = toDate;
      }
    }

    // Search by payment ID or gateway payment ID
    if (search) {
      query.$or = [
        { paymentId: { $regex: search, $options: 'i' } },
        { gatewayPaymentId: { $regex: search, $options: 'i' } },
      ];
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Sort
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query
    const payments = await Payment.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .populate('orderId', 'orderNumber totalAmount status')
      .populate('userId', 'name phone email')
      .select('-__v -gatewayResponse')
      .lean();

    const total = await Payment.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        payments,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          totalItems: total,
          itemsPerPage: limitNum,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// FINANCE & CREDIT MANAGEMENT CONTROLLERS
// ============================================================================

/**
 * @desc    Get all User credits summary
 * @route   GET /api/admin/finance/credits
 * @access  Private (Admin)
 */
exports.getCredits = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    // Build query for Users - show ALL Users, not just those with credit used
    const query = {
      status: 'approved',
      isActive: true,
    };

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get Users with credit details
    const Users = await User.find(query)
      .sort({ creditUsed: -1 })
      .skip(skip)
      .limit(limitNum)
      .select('name phone creditLimit creditUsed creditPolicy location')
      .lean();

    // Calculate credit information for each User
    const creditDetails = Users.map(User => {
      // Use creditLimit from User model, not creditPolicy.limit
      const creditLimit = User.creditLimit || 0;
      const creditUsed = User.creditUsed || 0;
      const remaining = creditLimit - creditUsed;
      const utilization = creditLimit > 0
        ? (creditUsed / creditLimit) * 100
        : 0;

      // Check if overdue
      const now = new Date();
      const dueDate = User.creditPolicy?.dueDate;
      const isOverdue = dueDate && now > dueDate;
      const daysOverdue = isOverdue && dueDate
        ? Math.floor((now - dueDate) / (1000 * 60 * 60 * 24))
        : 0;

      // Calculate penalty if overdue
      let penalty = 0;
      if (isOverdue && User.creditPolicy?.penaltyRate > 0) {
        const dailyPenaltyRate = User.creditPolicy.penaltyRate / 100;
        penalty = creditUsed * dailyPenaltyRate * daysOverdue;
      }

      // Determine status
      let creditStatus = 'active';
      if (isOverdue) {
        creditStatus = daysOverdue <= 7 ? 'dueSoon' : 'overdue';
      } else if (dueDate) {
        const daysUntilDue = Math.floor((dueDate - now) / (1000 * 60 * 60 * 24));
        if (daysUntilDue <= 7) {
          creditStatus = 'dueSoon';
        }
      }

      return {
        userId: user._id,
        UserName: user.name,
        UserPhone: user.phone,
        location: User.location,
        creditLimit: creditLimit,
        creditUsed: creditUsed,
        creditRemaining: remaining,
        creditUtilization: Math.round(utilization * 100) / 100,
        dueDate: User.creditPolicy?.dueDate,
        isOverdue,
        daysOverdue,
        penalty,
        penaltyRate: User.creditPolicy?.penaltyRate || 0,
        status: creditStatus,
      };
    });

    // Aggregate totals
    const totalOutstanding = Users.reduce((sum, v) => sum + (v.creditUsed || 0), 0);
    const totalLimit = Users.reduce((sum, v) => sum + (v.creditLimit || 0), 0);
    const overdueCount = creditDetails.filter(c => c.isOverdue).length;
    const dueSoonCount = creditDetails.filter(c => c.status === 'dueSoon' && !c.isOverdue).length;
    const totalPenalty = creditDetails.reduce((sum, c) => sum + c.penalty, 0);

    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        credits: creditDetails,
        summary: {
          totalUsers: total,
          totalOutstanding,
          totalLimit,
          totalRemaining: totalLimit - totalOutstanding,
          totalUtilization: totalLimit > 0
            ? Math.round((totalOutstanding / totalLimit) * 100 * 100) / 100
            : 0,
          overdueCount,
          dueSoonCount,
          totalPenalty: Math.round(totalPenalty * 100) / 100,
        },
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          totalItems: total,
          itemsPerPage: limitNum,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// End of Financial history

/**
 * @desc    Get financial parameters
 * @route   GET /api/admin/finance/parameters
 * @access  Private (Admin)
 */
exports.getFinancialParameters = async (req, res, next) => {
  try {
    const { ADVANCE_PAYMENT_PERCENTAGE, MIN_ORDER_VALUE, MIN_USER_PURCHASE } = require('../utils/constants');

    // Try to get from database, fallback to constants
    const financialParams = await Settings.getSetting('FINANCIAL_PARAMETERS', {
      userAdvancePaymentPercent: ADVANCE_PAYMENT_PERCENTAGE,
      minimumUserOrder: MIN_ORDER_VALUE,
      minimumUserPurchase: MIN_USER_PURCHASE,
    });

    res.status(200).json({
      success: true,
      data: {
        userAdvancePaymentPercent: financialParams.userAdvancePaymentPercent || ADVANCE_PAYMENT_PERCENTAGE,
        minimumUserOrder: financialParams.minimumUserOrder || MIN_ORDER_VALUE,
        minimumUserPurchase: financialParams.minimumUserPurchase || MIN_USER_PURCHASE,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update financial parameters
 * @route   PUT /api/admin/finance/parameters
 * @access  Private (Admin)
 */
exports.updateFinancialParameters = async (req, res, next) => {
  try {
    const { userAdvancePaymentPercent, minimumUserOrder, minimumUserPurchase } = req.body;
    const adminId = req.admin?.id || req.user?.id; // Get admin ID from auth middleware

    // Validation
    if (userAdvancePaymentPercent !== undefined) {
      if (typeof userAdvancePaymentPercent !== 'number' || userAdvancePaymentPercent < 0 || userAdvancePaymentPercent > 100) {
        return res.status(400).json({
          success: false,
          message: 'Advance payment percentage must be a number between 0 and 100.',
        });
      }
    }

    if (minimumUserOrder !== undefined) {
      if (typeof minimumUserOrder !== 'number' || minimumUserOrder < 0) {
        return res.status(400).json({
          success: false,
          message: 'Minimum order value must be a positive number.',
        });
      }
    }

    if (minimumUserPurchase !== undefined) {
      if (typeof minimumUserPurchase !== 'number' || minimumUserPurchase < 0) {
        return res.status(400).json({
          success: false,
          message: 'Minimum User purchase must be a positive number.',
        });
      }
    }

    // Get current values from database or constants
    const currentParams = await Settings.getSetting('FINANCIAL_PARAMETERS', {
      userAdvancePaymentPercent: ADVANCE_PAYMENT_PERCENTAGE,
      minimumUserOrder: MIN_ORDER_VALUE,
      minimumUserPurchase: MIN_USER_PURCHASE,
    });

    // Update only provided values
    const updatedParams = {
      userAdvancePaymentPercent: userAdvancePaymentPercent !== undefined ? userAdvancePaymentPercent : currentParams.userAdvancePaymentPercent,
      minimumUserOrder: minimumUserOrder !== undefined ? minimumUserOrder : currentParams.minimumUserOrder,
      minimumUserPurchase: minimumUserPurchase !== undefined ? minimumUserPurchase : currentParams.minimumUserPurchase,
    };

    // Save to database
    await Settings.setSetting(
      'FINANCIAL_PARAMETERS',
      updatedParams,
      'Financial parameters: Advance payment %, Minimum order value, Minimum User purchase',
      adminId
    );

    res.status(200).json({
      success: true,
      message: 'Financial parameters updated successfully.',
      data: updatedParams,
    });
  } catch (error) {
    next(error);
  }
};


/**
 * @desc    Get Logistics settings

// ============================================================================
// ANALYTICS & REPORTING CONTROLLERS
// ============================================================================

/**
 * @desc    Get analytics data
 * @route   GET /api/admin/analytics
 * @access  Private (Admin)
 */
exports.getAnalytics = async (req, res, next) => {
  try {
    const { period = '30' } = req.query; // days

    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(period));

    // Revenue trends
    const revenueTrends = await Order.aggregate([
      {
        $match: {
          status: { $in: [ORDER_STATUS.DELIVERED, ORDER_STATUS.FULLY_PAID] },
          paymentStatus: PAYMENT_STATUS.FULLY_PAID,
          createdAt: { $gte: daysAgo },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          revenue: { $sum: '$totalAmount' },
          orderCount: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    // Order trends
    const orderTrends = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: daysAgo },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          count: { $sum: 1 },
          delivered: {
            $sum: {
              $cond: [{ $in: ['$status', [ORDER_STATUS.DELIVERED, ORDER_STATUS.FULLY_PAID]] }, 1, 0]
            },
          },
          cancelled: {
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] },
          },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    // Top Users by revenue
    const topUsers = await Order.aggregate([
      {
        $match: {
          status: { $in: [ORDER_STATUS.DELIVERED, ORDER_STATUS.FULLY_PAID] },
          paymentStatus: PAYMENT_STATUS.FULLY_PAID,
          createdAt: { $gte: daysAgo },
          userId: { $ne: null },
        },
      },
      {
        $group: {
          _id: '$userId',
          revenue: { $sum: '$totalAmount' },
          orderCount: { $sum: 1 },
        },
      },
      {
        $sort: { revenue: -1 },
      },
      {
        $limit: 10,
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      {
        $unwind: '$user',
      },
      {
        $project: {
          userId: '$_id',
          userName: '$user.name',
          userPhone: '$user.phone',
          revenue: 1,
          orderCount: 1,
        },
      },
    ]);

    // Product performance
    const topProducts = await Order.aggregate([
      {
        $match: {
          status: { $in: [ORDER_STATUS.DELIVERED, ORDER_STATUS.FULLY_PAID] },
          paymentStatus: PAYMENT_STATUS.FULLY_PAID,
          createdAt: { $gte: daysAgo },
        },
      },
      {
        $unwind: '$items',
      },
      {
        $group: {
          _id: '$items.productId',
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.totalPrice' },
          orderCount: { $sum: 1 },
        },
      },
      {
        $sort: { totalRevenue: -1 },
      },
      {
        $limit: 10,
      },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product',
        },
      },
      {
        $unwind: '$product',
      },
      {
        $project: {
          productId: '$product._id',
          productName: '$product.name',
          productSku: '$product.sku',
          category: '$product.category',
          totalQuantity: 1,
          totalRevenue: 1,
          orderCount: 1,
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        period: parseInt(period),
        analytics: {
          revenueTrends,
          orderTrends,
          topUsers,
          topAdmins: [],
          topProducts,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Generate reports
 * @route   GET /api/admin/reports
 * @access  Private (Admin)
 */
exports.generateReports = async (req, res, next) => {
  try {
    const { type = 'summary', period = 'monthly', format = 'json' } = req.query;

    // Calculate date range based on period
    const now = new Date();
    let startDate = new Date();
    let periodLabel = '';

    switch (period) {
      case 'daily':
        startDate.setDate(now.getDate() - 1);
        periodLabel = 'Last 24 Hours';
        break;
      case 'weekly':
        startDate.setDate(now.getDate() - 7);
        periodLabel = 'Last 7 Days';
        break;
      case 'monthly':
        startDate.setMonth(now.getMonth() - 1);
        periodLabel = 'Last 30 Days';
        break;
      case 'yearly':
        startDate.setFullYear(now.getFullYear() - 1);
        periodLabel = 'Last Year';
        break;
      default:
        startDate.setMonth(now.getMonth() - 1);
        periodLabel = 'Last 30 Days';
    }

    // Generate report data based on type
    let reportData = {};

    if (type === 'summary' || type === 'full') {
      // Order summary
      const orderSummary = await Order.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalAmount: { $sum: '$totalAmount' },
          },
        },
      ]);

      // Revenue summary
      const revenueSummary = await Order.aggregate([
        {
          $match: {
            status: { $in: [ORDER_STATUS.DELIVERED, ORDER_STATUS.FULLY_PAID] },
            paymentStatus: PAYMENT_STATUS.FULLY_PAID,
            createdAt: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$totalAmount' },
            orderCount: { $sum: 1 },
            averageOrderValue: { $avg: '$totalAmount' },
          },
        },
      ]);

      // User registration summary
      const userSummary = await User.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
            },
            count: { $sum: 1 },
          },
        },
        {
          $sort: { _id: 1 },
        },
      ]);

      reportData = {
        period: periodLabel,
        startDate,
        endDate: now,
        orderSummary,
        revenueSummary: revenueSummary[0] || {},
        userSummary,
      };
    }

    // For now, return JSON format
    // TODO: Add CSV/PDF export functionality when needed
    if (format === 'csv' || format === 'pdf') {
      return res.status(501).json({
        success: false,
        message: 'CSV/PDF export functionality will be implemented later',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        report: reportData,
        generatedAt: new Date(),
        format,
        type,
        period,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// OPERATIONS & LOGISTICS CONTROLLERS
// ============================================================================

/**
 * @desc    Get logistics settings
 * @route   GET /api/admin/operations/logistics-settings
 * @access  Private (Admin)
 */
exports.getLogisticsSettings = async (req, res, next) => {
  try {
    const { DELIVERY_TIMELINE_HOURS } = require('../utils/constants');

    // Try to get from database, fallback to constants
    const logisticsSettings = await Settings.getSetting('LOGISTICS_SETTINGS', {
      defaultDeliveryTime: DELIVERY_TIMELINE_HOURS === 3 ? '3h' : DELIVERY_TIMELINE_HOURS === 4 ? '4h' : '1d',
      availableDeliveryOptions: ['3h', '4h', '1d'],
      enableExpressDelivery: true,
      enableStandardDelivery: true,
      enableNextDayDelivery: true,
      deliveryTimelineHours: DELIVERY_TIMELINE_HOURS,
    });

    res.status(200).json({
      success: true,
      data: logisticsSettings,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update logistics settings
 * @route   PUT /api/admin/operations/logistics-settings
 * @access  Private (Admin)
 */
exports.updateLogisticsSettings = async (req, res, next) => {
  try {
    const { defaultDeliveryTime, availableDeliveryOptions, enableExpressDelivery, enableStandardDelivery, enableNextDayDelivery } = req.body;
    const adminId = req.admin?.id || req.user?.id;

    // Validation
    if (defaultDeliveryTime && !['3h', '4h', '1d'].includes(defaultDeliveryTime)) {
      return res.status(400).json({
        success: false,
        message: 'Default delivery time must be one of: 3h, 4h, 1d',
      });
    }

    // Get current settings
    const currentSettings = await Settings.getSetting('LOGISTICS_SETTINGS', {
      defaultDeliveryTime: DELIVERY_TIMELINE_HOURS === 3 ? '3h' : DELIVERY_TIMELINE_HOURS === 4 ? '4h' : '1d',
      availableDeliveryOptions: ['3h', '4h', '1d'],
      enableExpressDelivery: true,
      enableStandardDelivery: true,
      enableNextDayDelivery: true,
    });

    // Update only provided values
    const updatedSettings = {
      defaultDeliveryTime: defaultDeliveryTime !== undefined ? defaultDeliveryTime : currentSettings.defaultDeliveryTime,
      availableDeliveryOptions: availableDeliveryOptions !== undefined ? availableDeliveryOptions : currentSettings.availableDeliveryOptions,
      enableExpressDelivery: enableExpressDelivery !== undefined ? enableExpressDelivery : currentSettings.enableExpressDelivery,
      enableStandardDelivery: enableStandardDelivery !== undefined ? enableStandardDelivery : currentSettings.enableStandardDelivery,
      enableNextDayDelivery: enableNextDayDelivery !== undefined ? enableNextDayDelivery : currentSettings.enableNextDayDelivery,
    };

    // Save to database
    await Settings.setSetting(
      'LOGISTICS_SETTINGS',
      updatedSettings,
      'Logistics settings: Delivery times and options',
      adminId
    );

    res.status(200).json({
      success: true,
      message: 'Logistics settings updated successfully',
      data: updatedSettings,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all platform notifications
 * @route   GET /api/admin/operations/notifications
 * @access  Private (Admin)
 */
exports.getNotifications = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, targetAudience, isActive, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    // Build query
    const query = {};
    if (targetAudience) query.targetAudience = targetAudience;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Sort
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Get notifications
    const notifications = await Notification.find(query)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .select('-__v');

    const total = await Notification.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        notifications,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          totalItems: total,
          itemsPerPage: limitNum,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create platform notification
 * @route   POST /api/admin/operations/notifications
 * @access  Private (Admin)
 * 
 * Supports:
 * - targetMode: 'all' (broadcast to all in targetAudience) or 'specific' (specific recipients)
 * - targetRecipients: Array of User/seller/user IDs when targetMode is 'specific'
 */
exports.createNotification = async (req, res, next) => {
  try {
    const {
      title,
      message,
      targetAudience,
      targetMode = 'all',
      targetRecipients = [],
      priority,
      isActive,
      actionUrl,
      actionText,
      startDate,
      endDate
    } = req.body;
    const adminId = req.admin?.id || req.user?.id;

    // Validation
    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Notification title is required',
      });
    }
    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Notification message is required',
      });
    }

    // For specific targeting, validate recipients
    if (targetMode === 'specific' && (!targetRecipients || targetRecipients.length === 0)) {
      return res.status(400).json({
        success: false,
        message: 'At least one recipient is required when targeting specific users',
      });
    }

    // Create platform notification record
    const notification = await createNotification({
      title: title.trim(),
      message: message.trim(),
      targetAudience: targetAudience || 'all',
      targetMode: targetMode || 'all',
      targetRecipients: targetMode === 'specific' ? targetRecipients : [],
      priority: priority || 'normal',
      isActive: isActive !== undefined ? isActive : true,
      actionUrl,
      actionText,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      createdBy: adminId,
    });

    await notification.save();

    // Create individual notifications for recipients
    let recipientCount = 0;

    if (isActive !== false) {
      const notificationData = {
        title: title.trim(),
        message: message.trim(),
        type: 'admin_announcement',
        priority: priority || 'normal',
        relatedEntityType: 'none',
      };

      if (targetMode === 'specific' && targetRecipients.length > 0) {
        // Target specific recipients
        if (targetAudience === 'Users') {
          for (const UserId of targetRecipients) {
            try {
              await UserNotification.createNotification({
                UserId,
                ...notificationData,
              });
              recipientCount++;
            } catch (err) {
              console.error(`Failed to create User notification for ${UserId}:`, err);
            }
          }
        } else if (targetAudience === 'sellers') {
          for (const sellerId of targetRecipients) {
            try {
              await SellerNotification.createNotification({
                sellerId,
                ...notificationData,
              });
              recipientCount++;
            } catch (err) {
              console.error(`Failed to create seller notification for ${sellerId}:`, err);
            }
          }
        } else if (targetAudience === 'users') {
          for (const userId of targetRecipients) {
            try {
              await UserNotification.createNotification({
                userId,
                ...notificationData,
              });
              recipientCount++;
            } catch (err) {
              console.error(`Failed to create user notification for ${userId}:`, err);
            }
          }
        }
      } else if (targetMode === 'all') {
        // Broadcast to all recipients in the target audience
        if (targetAudience === 'Users' || targetAudience === 'all') {
          const Users = await User.find({ isActive: true, verification: { $ne: 'rejected' } }).select('_id');
          for (const User of Users) {
            try {
              await UserNotification.createNotification({
                userId: user._id,
                ...notificationData,
              });
              recipientCount++;
            } catch (err) {
              console.error(`Failed to create User notification:`, err);
            }
          }
        }

        if (targetAudience === 'users' || targetAudience === 'all') {
          const users = await User.find({ isBlocked: { $ne: true } }).select('_id');
          for (const user of users) {
            try {
              await UserNotification.createNotification({
                userId: user._id,
                ...notificationData,
              });
              recipientCount++;
            } catch (err) {
              console.error(`Failed to create user notification:`, err);
            }
          }
        }
      }

      // Update recipient count
      notification.recipientCount = recipientCount;
      await notification.save();
    }

    // Populate createdBy
    await notification.populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      message: `Notification created successfully. Sent to ${recipientCount} recipient(s).`,
      data: {
        notification,
        recipientCount,
      },
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: Object.values(error.errors).map(e => e.message).join(', '),
      });
    }
    next(error);
  }
};


/**
 * @desc    Update platform notification
 * @route   PUT /api/admin/operations/notifications/:notificationId
 * @access  Private (Admin)
 */
exports.updateNotification = async (req, res, next) => {
  try {
    const { notificationId } = req.params;
    const { title, message, targetAudience, priority, isActive, actionUrl, actionText, startDate, endDate } = req.body;
    const adminId = req.admin?.id || req.user?.id;

    const notification = await Notification.findById(notificationId);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    // Update fields
    if (title !== undefined) notification.title = title.trim();
    if (message !== undefined) notification.message = message.trim();
    if (targetAudience !== undefined) notification.targetAudience = targetAudience;
    if (priority !== undefined) notification.priority = priority;
    if (isActive !== undefined) notification.isActive = isActive;
    if (actionUrl !== undefined) notification.actionUrl = actionUrl;
    if (actionText !== undefined) notification.actionText = actionText;
    if (startDate !== undefined) notification.startDate = startDate ? new Date(startDate) : null;
    if (endDate !== undefined) notification.endDate = endDate ? new Date(endDate) : null;
    notification.updatedBy = adminId;

    await notification.save();

    // Populate fields
    await notification.populate('createdBy', 'name email');
    await notification.populate('updatedBy', 'name email');

    res.status(200).json({
      success: true,
      message: 'Notification updated successfully',
      data: {
        notification,
      },
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: Object.values(error.errors).map(e => e.message).join(', '),
      });
    }
    next(error);
  }
};

/**
 * @desc    Delete platform notification
 * @route   DELETE /api/admin/operations/notifications/:notificationId
 * @access  Private (Admin)
 */
exports.deleteNotification = async (req, res, next) => {
  try {
    const { notificationId } = req.params;

    const notification = await Notification.findById(notificationId);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    await Notification.findByIdAndDelete(notificationId);

    res.status(200).json({
      success: true,
      message: 'Notification deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// OFFERS MANAGEMENT
// ============================================================================

/**
 * @desc    Get all offers (for admin)
 * @route   GET /api/admin/offers
 * @access  Private (Admin)
 */
exports.getOffers = async (req, res, next) => {
  try {
    const { type, isActive } = req.query;

    const query = {};
    if (type) {
      query.type = type;
    }
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const offers = await Offer.find(query)
      .populate('productIds', 'name wholesalePrice publicPrice images primaryImage')
      .populate('linkedProductIds', 'name wholesalePrice publicPrice images primaryImage')
      .sort({ order: 1, createdAt: -1 });

    const isSmartphone = type === 'smartphone_carousel';
    const mainType = type || 'carousel';

    res.status(200).json({
      success: true,
      data: {
        offers,
        carouselCount: await Offer.getCarouselCount(mainType),
        maxCarousels: 6,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single offer
 * @route   GET /api/admin/offers/:id
 * @access  Private (Admin)
 */
exports.getOffer = async (req, res, next) => {
  try {
    const { id } = req.params;

    const offer = await Offer.findById(id)
      .populate('productIds', 'name wholesalePrice publicPrice images primaryImage')
      .populate('linkedProductIds', 'name wholesalePrice publicPrice images primaryImage');

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'Offer not found',
      });
    }

    res.status(200).json({
      success: true,
      data: { offer },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create offer
 * @route   POST /api/admin/offers
 * @access  Private (Admin)
 */
exports.createOffer = async (req, res, next) => {
  try {
    const adminId = req.admin.id;
    const { type, title, description, image, productIds, specialTag, specialValue, linkedProductIds, order, buttonText, buttonLink, textPosition } = req.body;

    // Validate required fields based on type
    if (!type || !['carousel', 'special_offer', 'smartphone_carousel'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid offer type. Must be "carousel", "special_offer", or "smartphone_carousel"',
      });
    }

    const { mediaType = 'image', video, orientation = 'horizontal' } = req.body;

    if (type === 'carousel' || type === 'smartphone_carousel') {
      if (mediaType === 'image' && !image) {
        return res.status(400).json({
          success: false,
          message: 'Image is required for image-based carousels',
        });
      }
      if (mediaType === 'video' && !video) {
        return res.status(400).json({
          success: false,
          message: 'Video URL is required for video-based carousels',
        });
      }

      // Check carousel limit (max 6 active) for the specific type
      const carouselCount = await Offer.getCarouselCount(type);
      if (carouselCount >= 6) {
        return res.status(400).json({
          success: false,
          message: `Maximum 6 active ${type.replace('_', ' ')}s allowed. Please delete or deactivate an existing one first.`,
        });
      }
    }

    if (type === 'special_offer') {
      if (!specialTag || !specialValue) {
        return res.status(400).json({
          success: false,
          message: 'Special tag and special value are required for special offers',
        });
      }
    }

    // Validate product IDs if provided
    if (productIds && productIds.length > 0) {
      const validProducts = await Product.countDocuments({ _id: { $in: productIds } });
      if (validProducts !== productIds.length) {
        return res.status(400).json({
          success: false,
          message: 'One or more product IDs are invalid',
        });
      }
    }

    if (linkedProductIds && linkedProductIds.length > 0) {
      const validLinkedProducts = await Product.countDocuments({ _id: { $in: linkedProductIds } });
      if (validLinkedProducts !== linkedProductIds.length) {
        return res.status(400).json({
          success: false,
          message: 'One or more linked product IDs are invalid',
        });
      }
    }

    // Determine order for carousels
    let offerOrder = order;
    if ((type === 'carousel' || type === 'smartphone_carousel') && offerOrder === undefined) {
      const maxOrder = await Offer.findOne({ type })
        .sort({ order: -1 })
        .select('order');
      offerOrder = maxOrder ? maxOrder.order + 1 : 0;
    }

    const offer = await createOffer({
      type,
      title,
      description,
      mediaType,
      image: (type === 'carousel' || type === 'smartphone_carousel') && mediaType === 'image' ? image : undefined,
      video: (type === 'carousel' || type === 'smartphone_carousel') && mediaType === 'video' ? video : undefined,
      orientation: type === 'smartphone_carousel' ? orientation : 'horizontal',
      productIds: (type === 'carousel' || type === 'smartphone_carousel') ? productIds : undefined,
      specialTag: type === 'special_offer' ? specialTag : undefined,
      specialValue: type === 'special_offer' ? specialValue : undefined,
      linkedProductIds: type === 'special_offer' ? (linkedProductIds || []) : undefined,
      order: (type === 'carousel' || type === 'smartphone_carousel') ? offerOrder : undefined,
      buttonText: (type === 'carousel' || type === 'smartphone_carousel') ? buttonText : undefined,
      buttonLink: (type === 'carousel' || type === 'smartphone_carousel') ? buttonLink : undefined,
      textPosition: (type === 'carousel' || type === 'smartphone_carousel') ? textPosition : undefined,
      createdBy: adminId,
      updatedBy: adminId,
    });

    const populatedOffer = await Offer.findById(offer._id)
      .populate('productIds', 'name wholesalePrice publicPrice images primaryImage')
      .populate('linkedProductIds', 'name wholesalePrice publicPrice images primaryImage');

    res.status(201).json({
      success: true,
      data: { offer: populatedOffer },
      message: 'Offer created successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update offer
 * @route   PUT /api/admin/offers/:id
 * @access  Private (Admin)
 */
exports.updateOffer = async (req, res, next) => {
  try {
    const adminId = req.admin.id;
    const { id } = req.params;
    const { title, description, image, productIds, specialTag, specialValue, linkedProductIds, isActive, order, buttonText, buttonLink, textPosition, mediaType, video, orientation } = req.body;

    const offer = await Offer.findById(id);
    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'Offer not found',
      });
    }

    // Validate product IDs if provided
    if (productIds && Array.isArray(productIds) && productIds.length > 0) {
      const validProducts = await Product.countDocuments({ _id: { $in: productIds } });
      if (validProducts !== productIds.length) {
        return res.status(400).json({
          success: false,
          message: 'One or more product IDs are invalid',
        });
      }
    }

    if (linkedProductIds && Array.isArray(linkedProductIds) && linkedProductIds.length > 0) {
      const validLinkedProducts = await Product.countDocuments({ _id: { $in: linkedProductIds } });
      if (validLinkedProducts !== linkedProductIds.length) {
        return res.status(400).json({
          success: false,
          message: 'One or more linked product IDs are invalid',
        });
      }
    }

    // Check carousel limit if activating a carousel
    if ((offer.type === 'carousel' || offer.type === 'smartphone_carousel') && isActive === true && !offer.isActive) {
      const carouselCount = await Offer.getCarouselCount(offer.type);
      if (carouselCount >= 6) {
        return res.status(400).json({
          success: false,
          message: `Maximum 6 active ${offer.type.replace('_', ' ')}s allowed. Please delete or deactivate an existing one first.`,
        });
      }
    }

    // Update fields
    if (title !== undefined) offer.title = title;
    if (description !== undefined) offer.description = description;
    
    // Media fields
    if (mediaType !== undefined) offer.mediaType = mediaType;
    if (image !== undefined) offer.image = image;
    if (video !== undefined) offer.video = video;
    if (orientation !== undefined) offer.orientation = orientation;

    if ((offer.type === 'carousel' || offer.type === 'smartphone_carousel') && productIds !== undefined) offer.productIds = productIds;
    if ((offer.type === 'carousel' || offer.type === 'smartphone_carousel') && order !== undefined) offer.order = order;
    
    if (offer.type === 'special_offer' && specialTag !== undefined) offer.specialTag = specialTag;
    if (offer.type === 'special_offer' && specialValue !== undefined) offer.specialValue = specialValue;
    if (offer.type === 'special_offer' && linkedProductIds !== undefined) offer.linkedProductIds = linkedProductIds;
    
    if ((offer.type === 'carousel' || offer.type === 'smartphone_carousel') && buttonText !== undefined) offer.buttonText = buttonText;
    if ((offer.type === 'carousel' || offer.type === 'smartphone_carousel') && buttonLink !== undefined) offer.buttonLink = buttonLink;
    if ((offer.type === 'carousel' || offer.type === 'smartphone_carousel') && textPosition !== undefined) offer.textPosition = textPosition;
    
    if (isActive !== undefined) offer.isActive = isActive;
    offer.updatedBy = adminId;

    await offer.save();

    const populatedOffer = await Offer.findById(offer._id)
      .populate('productIds', 'name wholesalePrice publicPrice images primaryImage')
      .populate('linkedProductIds', 'name wholesalePrice publicPrice images primaryImage');

    res.status(200).json({
      success: true,
      data: { offer: populatedOffer },
      message: 'Offer updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete offer
 * @route   DELETE /api/admin/offers/:id
 * @access  Private (Admin)
 */
exports.deleteOffer = async (req, res, next) => {
  try {
    const { id } = req.params;

    const offer = await Offer.findById(id);
    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'Offer not found',
      });
    }

    await Offer.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Offer deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// End of Financial controllers

// ============================================================================
// REVIEW MANAGEMENT ROUTES
// ============================================================================

/**
 * @desc    Get all product reviews with filtering
 * @route   GET /api/admin/reviews
 * @access  Private (Admin)
 */
exports.getReviews = async (req, res, next) => {
  try {
    const {
      productId,
      userId,
      rating,
      hasResponse,
      isApproved,
      isVisible,
      page = 1,
      limit = 20,
      sort = '-createdAt',
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build query
    const query = {};
    if (productId) {
      // Mongoose will automatically convert string IDs to ObjectId
      query.productId = productId;
    }
    if (userId) {
      // Mongoose will automatically convert string IDs to ObjectId
      query.userId = userId;
    }
    if (rating) query.rating = parseInt(rating);
    if (hasResponse === 'true') query['adminResponse.response'] = { $exists: true, $ne: '' };
    if (hasResponse === 'false') query.$or = [{ 'adminResponse.response': { $exists: false } }, { 'adminResponse.response': '' }];
    // Only add isApproved filter if explicitly set (don't filter by default)
    if (isApproved !== undefined && isApproved !== '') {
      query.isApproved = isApproved === 'true';
    }
    // Only add isVisible filter if explicitly set (don't filter by default)
    if (isVisible !== undefined && isVisible !== '') {
      query.isVisible = isVisible === 'true';
    }

    // Build sort object
    let sortObj = {};
    if (sort === 'rating-desc') sortObj = { rating: -1, createdAt: -1 };
    else if (sort === 'rating-asc') sortObj = { rating: 1, createdAt: -1 };
    else if (sort === 'date-asc') sortObj = { createdAt: 1 };
    else sortObj = { createdAt: -1 }; // Default: newest first

    // Get reviews
    const [reviews, total] = await Promise.all([
      Review.find(query)
        .populate('productId', 'name')
        .populate('userId', 'name phone')
        .populate('adminResponse.respondedBy', 'name')
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Review.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: {
        reviews,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get review details
 * @route   GET /api/admin/reviews/:reviewId
 * @access  Private (Admin)
 */
exports.getReviewDetails = async (req, res, next) => {
  try {
    const { reviewId } = req.params;

    const review = await Review.findById(reviewId)
      .populate('productId', 'name')
      .populate('userId', 'name phone')
      .populate('adminResponse.respondedBy', 'name');

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        review,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Respond to a review
 * @route   POST /api/admin/reviews/:reviewId/respond
 * @access  Private (Admin)
 */
exports.respondToReview = async (req, res, next) => {
  try {
    const { reviewId } = req.params;
    const { response } = req.body;
    const adminId = req.admin._id;

    if (!response || response.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Response text is required',
      });
    }

    const review = await Review.findById(reviewId);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found',
      });
    }

    // Update admin response
    review.adminResponse = {
      response: response.trim(),
      respondedBy: adminId,
      respondedAt: new Date(),
    };

    await review.save();

    await review.populate('productId', 'name');
    await review.populate('userId', 'name phone');
    await review.populate('adminResponse.respondedBy', 'name');

    res.status(200).json({
      success: true,
      data: {
        review,
        message: 'Response added successfully',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update admin response to a review
 * @route   PUT /api/admin/reviews/:reviewId/respond
 * @access  Private (Admin)
 */
exports.updateReviewResponse = async (req, res, next) => {
  try {
    const { reviewId } = req.params;
    const { response } = req.body;
    const adminId = req.admin._id;

    if (!response || response.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Response text is required',
      });
    }

    const review = await Review.findById(reviewId);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found',
      });
    }

    // Update admin response
    review.adminResponse = {
      response: response.trim(),
      respondedBy: adminId,
      respondedAt: new Date(),
    };

    await review.save();

    await review.populate('productId', 'name');
    await review.populate('userId', 'name phone');
    await review.populate('adminResponse.respondedBy', 'name');

    res.status(200).json({
      success: true,
      data: {
        review,
        message: 'Response updated successfully',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete admin response
 * @route   DELETE /api/admin/reviews/:reviewId/respond
 * @access  Private (Admin)
 */
exports.deleteReviewResponse = async (req, res, next) => {
  try {
    const { reviewId } = req.params;

    const review = await Review.findById(reviewId);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found',
      });
    }

    // Remove admin response
    review.adminResponse = undefined;
    await review.save();

    await review.populate('productId', 'name');
    await review.populate('userId', 'name phone');

    res.status(200).json({
      success: true,
      data: {
        review,
        message: 'Response deleted successfully',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Moderate review (approve/reject, hide/show)
 * @route   PUT /api/admin/reviews/:reviewId/moderate
 * @access  Private (Admin)
 */
exports.moderateReview = async (req, res, next) => {
  try {
    const { reviewId } = req.params;
    const { isApproved, isVisible } = req.body;

    const review = await Review.findById(reviewId);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found',
      });
    }

    if (isApproved !== undefined) {
      review.isApproved = isApproved;
    }

    if (isVisible !== undefined) {
      review.isVisible = isVisible;
    }

    await review.save();

    await review.populate('productId', 'name');
    await review.populate('userId', 'name phone');
    await review.populate('adminResponse.respondedBy', 'name');

    res.status(200).json({
      success: true,
      data: {
        review,
        message: 'Review moderated successfully',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete review
 * @route   DELETE /api/admin/reviews/:reviewId
 * @access  Private (Admin)
 */
exports.deleteReview = async (req, res, next) => {
  try {
    const { reviewId } = req.params;

    const review = await Review.findById(reviewId);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found',
      });
    }

    await Review.deleteOne({ _id: reviewId });

    res.status(200).json({
      success: true,
      data: {
        message: 'Review deleted successfully',
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// DELIVERY SETTINGS CONTROLLERS
// ============================================================================

/**
 * @desc    Get delivery charge and delivery time configuration
 * @route   GET /api/admin/settings/delivery
 * @access  Private (Admin)
 */
exports.getDeliverySettings = async (req, res, next) => {
  try {
    const { loadDeliveryConfig } = require('../utils/deliveryUtils');
    const config = await loadDeliveryConfig();

    res.status(200).json({
      success: true,
      data: config,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update delivery charge and delivery time configuration
 * @route   PUT /api/admin/settings/delivery
 * @access  Private (Admin)
 *
 * Body:
 * {
 *   mode: 'flat_rate' | 'free',      // optional
 *   domestic: {                        // optional
 *     charge: 150,
 *     minFreeDelivery: null | number,
 *     timeLabel: '7-8 days',
 *     isEnabled: true
 *   },
 *   international: {                   // optional
 *     charge: null | number,
 *     timeLabel: 'Coming Soon',
 *     isEnabled: false
 *   }
 * }
 */
exports.updateDeliverySettings = async (req, res, next) => {
  try {
    const { loadDeliveryConfig, DEFAULT_DELIVERY_CONFIG } = require('../utils/deliveryUtils');
    const adminId = req.admin?.id || req.user?.id;

    const { mode, domestic, international } = req.body;

    // Validate mode
    const VALID_MODES = ['flat_rate', 'free'];
    if (mode !== undefined && !VALID_MODES.includes(mode)) {
      return res.status(400).json({
        success: false,
        message: `Invalid mode. Must be one of: ${VALID_MODES.join(', ')}`,
      });
    }

    // Validate domestic charge
    if (domestic?.charge !== undefined && domestic.charge !== null) {
      if (typeof domestic.charge !== 'number' || domestic.charge < 0) {
        return res.status(400).json({
          success: false,
          message: 'Domestic charge must be a non-negative number.',
        });
      }
    }

    // Validate international charge
    if (international?.charge !== undefined && international.charge !== null) {
      if (typeof international.charge !== 'number' || international.charge < 0) {
        return res.status(400).json({
          success: false,
          message: 'International charge must be a non-negative number.',
        });
      }
    }

    // Load current config
    const currentConfig = await loadDeliveryConfig();

    // Deep merge — only override what is provided
    const updatedConfig = {
      ...currentConfig,
      ...(mode !== undefined && { mode }),
      domestic: {
        ...currentConfig.domestic,
        ...(domestic || {}),
      },
      international: {
        ...currentConfig.international,
        ...(international || {}),
      },
    };

    // Persist to Settings
    await Settings.setSetting(
      'DELIVERY_CONFIG',
      updatedConfig,
      'Delivery charge and delivery time configuration (Domestic + International)',
      adminId,
    );

    console.log(`✅ Delivery settings updated by admin ${adminId || 'unknown'}:`, updatedConfig);

    res.status(200).json({
      success: true,
      message: 'Delivery settings updated successfully.',
      data: updatedConfig,
    });
  } catch (error) {
    next(error);
  }
};


