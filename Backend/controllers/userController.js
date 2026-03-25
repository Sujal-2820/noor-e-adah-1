/**
 * User Controller
 * 
 * Handles all User-related operations
 */

const mongoose = require('mongoose');
const User = require('../models/User');
const Order = require('../models/Order');
const Product = require('../models/Product');
const ProductAssignment = require('../models/ProductAssignment');
const UserEarning = require('../models/UserEarning');
const WithdrawalRequest = require('../models/WithdrawalRequest');
const BankAccount = require('../models/BankAccount');
const PaymentHistory = require('../models/PaymentHistory');
const UserNotification = require('../models/UserNotification');
const Payment = require('../models/Payment');
const Settings = require('../models/Settings');
const Cart = require('../models/Cart');
const Address = require('../models/Address');
const razorpayService = require('../services/razorpayService');
const { admin } = require('../services/firebaseAdmin');
const { OTP_EXPIRY_MINUTES, MIN_USER_PURCHASE, MAX_USER_PURCHASE, USER_COVERAGE_RADIUS_KM, DELIVERY_TIMELINE_HOURS, ORDER_STATUS, PAYMENT_STATUS } = require('../utils/constants');
const { checkPhoneExists, checkPhoneInRole, isSpecialBypassNumber, SPECIAL_BYPASS_OTP, normalizePhoneNumber } = require('../utils/phoneValidation');
const { generateUniqueId } = require('../utils/generateUniqueId');
const { createPaymentHistory, createBankAccount } = require('../utils/createWithId');
const adminTaskController = require('./adminTaskController');
const { loadDeliveryConfig, computeDelivery } = require('../utils/deliveryUtils');
const { generateToken } = require('../middleware/auth');

const DELIVERY_WINDOW_HOURS = DELIVERY_TIMELINE_HOURS || 24;
const DELIVERY_WINDOW_MS = DELIVERY_WINDOW_HOURS * 60 * 60 * 1000;

/**
 * Helper: Deduct stock from User inventory for an order
 * @param {Object} order - The order document
 * @param {String} UserId - User ID
 */
async function deductStockFromInventory(order, UserId) {
  try {
    if (order.stockDeducted) {
      console.log(`ℹ️ Stock already deducted for order ${order.orderNumber}`);
      return true;
    }


    for (const item of order.items) {
      const assignment = await ProductAssignment.findOne({
        UserId,
        productId: item.productId,
      });

      if (assignment) {
        // Deduct Global Stock
        assignment.stock = Math.max(0, (assignment.stock || 0) - item.quantity);

        // Deduct Attribute Stock if variant
        let itemAttrs = null;
        if (item.variantAttributes) {
          itemAttrs = item.variantAttributes instanceof Map
            ? Object.fromEntries(item.variantAttributes)
            : item.variantAttributes;
        }

        if (itemAttrs && Object.keys(itemAttrs).length > 0 && assignment.attributeStocks) {
          const matchingVariant = assignment.attributeStocks.find(variant => {
            if (!variant.attributes) return false;
            const variantAttrs = variant.attributes instanceof Map
              ? Object.fromEntries(variant.attributes)
              : variant.attributes;
            const keys = Object.keys(itemAttrs);
            return keys.every(key => String(variantAttrs[key]) === String(itemAttrs[key]));
          });

          if (matchingVariant) {
            matchingVariant.stock = Math.max(0, (matchingVariant.stock || 0) - item.quantity);
            console.log(`📦 User Variant Stock reduced for ${item.productName}: ${item.quantity}`);
          }
        }

        await assignment.save();
        console.log(`📦 User Global Stock reduced for ${item.productName}: ${item.quantity}`);
      } else {
        console.warn(`⚠️ No product assignment found for product ${item.productName} and User ${UserId}. Cannot deduct stock.`);
      }
    }

    order.stockDeducted = true;
    await order.save();
    return true;
  } catch (error) {
    console.error(`❌ Failed to deduct stock for order ${order.orderNumber}:`, error);
    return false;
  }
}

/**
 * @desc    User registration
 * @route   POST /api/Users/auth/register
 * @access  Public
 */
exports.register = async (req, res, next) => {
  try {
    const {
      // Personal & Business Details
      firstName,
      lastName,
      email,
      phone,
      agentName,
      shopName,
      shopAddress,

      // KYC Numbers
      gstNumber,
      panNumber,
      aadhaarNumber,

      // Location
      location,

      // Documents (KYC)
      aadhaarFront,
      aadhaarBack,
      businessLicense,
      identityVerification,
      partnerAgreement,

      // Terms
      termsAccepted,
      
      // User Type (Partner/Customer)
      userType = 'partner'
    } = req.body;

    const normalizedPhone = normalizePhoneNumber(phone);

    // Backward compatibility for legacy requests
    const name = req.body.name || (firstName && lastName ? `${firstName} ${lastName}` : undefined);

    if (!firstName || !lastName || !phone || !location) {
      return res.status(400).json({
        success: false,
        message: 'First name, last name, phone, and location are required',
      });
    }

    // Special bypass number - skip all validation and checks, proceed to OTP
    if (isSpecialBypassNumber(normalizedPhone)) {
      // Create User with minimal data, set OTP to 123456
      let existingUserBypass = await User.findOne({ phone: normalizedPhone });

      if (!existingUserBypass) {
        const userIdCode = await generateUniqueId(User, 'USR', 'userId', 101);
        existingUserBypass = new User({
          userId: userIdCode,
          firstName,
          lastName,
          name: name || `${firstName} ${lastName}`,
          phone: normalizedPhone,
          email: email || undefined,
          userType: 'customer',
          role: 'customer',
          agentName,
          location: location || {
            address: '',
            city: '',
            state: '',
            pincode: '',
          },
          status: 'approved',
          isActive: true,
          termsAccepted: termsAccepted || false,
        });
      }

      // Set OTP to 123456
      existingUserBypass.otp = {
        code: SPECIAL_BYPASS_OTP,
        expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
      };
      await existingUserBypass.save();

      return res.status(201).json({
        success: true,
        data: {
          message: 'Registration successful. OTP sent to phone.',
          requiresApproval: false,
          expiresIn: OTP_EXPIRY_MINUTES * 60, // seconds
        },
      });
    }


    if (!termsAccepted) {
      return res.status(400).json({
        success: false,
        message: 'You must accept the terms and conditions to register.',
      });
    }

    // Check if phone exists in other roles (user, seller)
    const phoneCheck = await checkPhoneExists(normalizedPhone, 'user');
    if (phoneCheck.exists) {
      return res.status(400).json({
        success: false,
        message: phoneCheck.message,
      });
    }

    // Check if User already exists
    const existingUser = await User.findOne({ phone: normalizedPhone });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this phone number already exists',
      });
    }

    // Exclusivity rules (Region and 20km radius) have been removed per user request.
    // Multiple Users can now register in the same area.

    // Generate unique User ID
    const userIdCode = await generateUniqueId(User, 'USR', 'userId', 101);

    // Create User
    const newUser = new User({
      userId: userIdCode,
      firstName,
      lastName,
      name: name || `${firstName} ${lastName}`,
      email: email || undefined,
      phone: normalizedPhone,
      userType: 'customer',
      role: 'customer',
      agentName,
      location: {
        address: location.address,
        city: location.city,
        state: location.state,
        pincode: location.pincode,
        coordinates: {
          lat: location.coordinates?.lat || 0,
          lng: location.coordinates?.lng || 0,
        },
        coverageRadius: 0,
      },
      termsAccepted: true,
      termsAcceptedAt: new Date(),
      status: 'approved',
      isActive: true,
    });

    // Clear any existing OTP before generating new one
    newUser.clearOTP();

    // Check if this is a test phone number - use default OTP 123456
    const testOTPInfo = getTestOTPInfo(phone);
    let otpCode;
    if (testOTPInfo.isTest) {
      // For test numbers, set OTP directly to 123456
      otpCode = testOTPInfo.defaultOTP;
      newUser.otp = {
        code: otpCode,
        expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
      };
    } else {
      // Generate new unique OTP for regular numbers
      otpCode = newUser.generateOTP();
    }
    await newUser.save();

    // Send OTP via SMS
    try {
      await sendOTP(phone, otpCode, 'registration');
    } catch (error) {
      console.error('Failed to send OTP:', error);
    }
    res.status(201).json({
      success: true,
      data: {
        message: 'Registration successful. OTP sent to phone.',
        userId: newUser._id,
        UserIdCode: newUser.userId,
        requiresApproval: false,
        expiresIn: OTP_EXPIRY_MINUTES * 60, // seconds
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Sync Firebase User with Backend
 * @route   POST /api/users/auth/firebase-sync
 * @access  Public
 */
exports.firebaseSync = async (req, res, next) => {
  try {
    const { idToken, name: providedName } = req.body;
    if (!idToken) {
      return res.status(400).json({ success: false, message: 'ID Token is required' });
    }

    // Verify Firebase ID Token
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { email, phone_number, name: firebaseName, uid, picture } = decodedToken;

    const finalName = providedName || firebaseName;

    // Find or create user
    // We prioritize finding by firebaseUid, then by email
    let user = await User.findOne({
      $or: [
        { firebaseUid: uid },
        { email: email }
      ]
    });

    if (!user) {
      // Create new user
      const userId = await generateUniqueId(User, 'USR', 'userId', 101);
      user = new User({
        userId,
        name: finalName || (email ? email.split('@')[0] : 'User'),
        email,
        phone: phone_number || undefined,
        firebaseUid: uid,
        isActive: true,
        userType: 'customer',
        role: 'customer'
      });
      await user.save();
    } else {
      // Update existing user with firebase UID if missing
      let updateMade = false;
      if (!user.firebaseUid) {
        user.firebaseUid = uid;
        updateMade = true;
      }
      if (!user.email && email) {
        user.email = email;
        updateMade = true;
      }
      // Update name if we just got a better one
      if (finalName && (!user.name || user.name.includes('@'))) {
        user.name = finalName;
        updateMade = true;
      }
      if (updateMade) await user.save();
    }

    // Generate JWT
    const token = generateToken({
      userId: user._id,
      phone: user.phone,
      role: user.role || 'customer',
      type: user.userType || 'customer',
    });

    res.status(200).json({
      success: true,
      data: {
        token,
        user: {
          id: user._id,
          userId: user.userId,
          name: user.name,
          email: user.email,
          phone: user.phone
        }
      }
    });

  } catch (error) {
    console.error('Firebase Sync Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Request OTP for User
 * @route   POST /api/Users/auth/request-otp
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

    const normalizedPhone = normalizePhoneNumber(phone);

    // Special bypass number - skip all checks and proceed to OTP
    if (isSpecialBypassNumber(normalizedPhone)) {
      // Find or create User
      let existingUserBypass = await User.findOne({ phone: normalizedPhone });

      if (!existingUserBypass) {
        const userIdCode = await generateUniqueId(User, 'VND', 'userId', 101);
        existingUserBypass = new User({
          userId: userIdCode,
          phone: normalizedPhone,
          name: 'Special Bypass User',
          status: 'pending',
          location: {
            address: '',
            city: '',
            state: '',
            pincode: '',
          },
        });
      }

      // Set OTP to 123456
      existingUserBypass.otp = {
        code: SPECIAL_BYPASS_OTP,
        expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
      };
      await existingUserBypass.save();

      return res.status(200).json({
        success: true,
        data: {
          message: 'OTP sent successfully',
          expiresIn: OTP_EXPIRY_MINUTES * 60, // seconds
        },
      });
    }

    // Check if phone exists in other roles (user, seller)
    const phoneCheck = await checkPhoneExists(normalizedPhone, 'user');
    if (phoneCheck.exists) {
      return res.status(400).json({
        success: false,
        message: phoneCheck.message,
      });
    }

    // Check if User exists - requestOTP is only for existing Users
    const userCheck = await checkPhoneInRole(normalizedPhone, 'user');
    const user = userCheck.data;

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found. Please register first.',
        requiresRegistration: true,
      });
    }

    // Check User status before sending OTP
    if (user.status === 'rejected') {
      return res.status(403).json({
        success: false,
        status: 'rejected',
        message: 'Your User profile was rejected by the admin. You cannot access the dashboard.',
      });
    }

    // Allow OTP for pending and approved Users (status check will happen in verifyOTP)
    // Clear any existing OTP before generating new one
    user.clearOTP();

    // Check if this is a test phone number - use default OTP 123456
    const testOTPInfo = getTestOTPInfo(phone);
    let otpCode;
    if (testOTPInfo.isTest) {
      // For test numbers, set OTP directly to 123456
      otpCode = testOTPInfo.defaultOTP;
      user.otp = {
        code: otpCode,
        expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
      };
    } else {
      // Generate new unique OTP for regular numbers
      otpCode = user.generateOTP();
    }
    await user.save();

    // Send OTP via SMS
    try {
      await sendOTP(phone, otpCode, 'login');
    } catch (error) {
      console.error('Failed to send OTP:', error);
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
 * @desc    Verify OTP and complete login/registration
 * @route   POST /api/Users/auth/verify-otp
 * @access  Public
 */
exports.verifyOTP = async (req, res, next) => {
  try {
    const { phone, otp } = req.body;
    const normalizedPhone = normalizePhoneNumber(phone);

    if (!normalizedPhone || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Phone number and OTP are required',
      });
    }

    // Special bypass number - accept OTP 123456 and create/find User
    if (isSpecialBypassNumber(normalizedPhone)) {
      if (otp !== SPECIAL_BYPASS_OTP) {
        return res.status(401).json({
          success: false,
          message: 'Invalid or expired OTP',
        });
      }

      // Find or create User
      let user = await User.findOne({ phone: normalizedPhone });

      if (!user) {
        const userIdCode = await generateUniqueId(User, 'VND', 'userId', 101);
        user = new User({
          userId: userIdCode,
          phone: normalizedPhone,
          name: 'Special Bypass User',
          status: 'pending',
          location: {
            address: '',
            city: '',
            state: '',
            pincode: '',
          },
        });
        await user.save();
        console.log(`✅ Special bypass User created: ${normalizedPhone} with ID: ${userIdCode}`);
      }

      user.lastLogin = new Date();
      await user.save();

      // Generate JWT token
      const token = generateToken({
        userId: user._id,
        phone: user.phone,
        role: user.role || 'customer',
        type: user.userType || 'customer',
      });

      return res.status(200).json({
        success: true,
        data: {
          token,
          status: user.status,
          User: {
            id: user._id,
            userId: user.userId,
            name: user.name,
            firstName: user.firstName,
            lastName: user.lastName,
            phone: user.phone,
            email: user.email,
            shopName: user.shopName,
            shopAddress: user.shopAddress,
            gstNumber: user.gstNumber,
            panNumber: user.panNumber,
            aadhaarNumber: user.aadhaarNumber,
            agentName: user.agentName,
            status: user.status,
            isActive: user.isActive,
            location: user.location,
            userType: user.userType || 'partner'
          },
        },
      });
    }

    // Check if phone exists in other roles first
    const phoneCheck = await checkPhoneExists(phone, 'user');
    if (phoneCheck.exists) {
      return res.status(400).json({
        success: false,
        message: phoneCheck.message,
      });
    }

    // Check if phone exists in User role
    const userCheck = await checkPhoneInRole(phone, 'user');
    const user = userCheck.data;

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found. Please register first.',
        requiresRegistration: true, // Flag for frontend to redirect
      });
    }

    // Verify OTP
    const isOtpValid = user.verifyOTP(otp);

    if (!isOtpValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired OTP',
      });
    }

    // Check if User is banned
    if (user.banInfo?.isBanned) {
      const banType = user.banInfo.banType || 'temporary'
      const banReason = user.banInfo.banReason || 'Account banned by admin'
      return res.status(403).json({
        success: false,
        message: `User account is ${banType === 'permanent' ? 'permanently' : 'temporarily'} banned. ${banReason}. Please contact admin.`,
        banInfo: user.banInfo,
      });
    }

    // Check User status - Handle pending, rejected, and approved statuses
    if (user.status === 'pending') {
      // Clear OTP after successful verification
      user.clearOTP();
      await user.save();

      return res.status(200).json({
        success: true,
        data: {
          status: 'pending',
          message: 'Registration successful. Waiting for admin approval.',
          User: {
            id: user._id,
            userId: user.userId,
            name: user.name,
            firstName: user.firstName,
            lastName: user.lastName,
            phone: user.phone,
            email: user.email,
            shopName: user.shopName,
            shopAddress: user.shopAddress,
            gstNumber: user.gstNumber,
            panNumber: user.panNumber,
            aadhaarNumber: user.aadhaarNumber,
            agentName: user.agentName,
            status: user.status,
            isActive: user.isActive,
            location: user.location,
            userType: user.userType || 'partner'
          },
        },
      });
    }

    if (user.status === 'rejected') {
      // Clear OTP after verification
      user.clearOTP();
      await user.save();

      return res.status(403).json({
        success: false,
        status: 'rejected',
        message: 'Your User profile was rejected by the admin. You cannot access the dashboard.',
        User: {
          id: user._id,
          userId: user.userId,
          name: user.name,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          status: user.status,
          shopName: user.shopName,
          gstNumber: user.gstNumber,
          userType: user.userType || 'partner'
        },
      });
    }

    // Check if User is approved and active
    if (user.status !== 'approved') {
      return res.status(403).json({
        success: false,
        message: `User account status is ${user.status}. Please contact admin.`,
        status: user.status,
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'User account is inactive. Please contact admin.',
      });
    }

    // User is approved and active - proceed with login
    // Clear OTP after successful verification
    user.clearOTP();
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT token
    const token = generateToken({
      userId: user._id,
      phone: user.phone,
      role: 'user',
      type: 'user',
    });

    // Enhanced console logging
    const timestamp = new Date().toISOString();
    console.log('\n' + '='.repeat(60));
    console.log('🔐 User OTP VERIFIED');
    console.log('='.repeat(60));
    console.log(`📱 Phone: ${user.phone}`);
    console.log(`👤 Name: ${user.name}`);
    console.log(`✅ Status: ${user.status}`);
    console.log(`🏠 Type: ${user.userType || 'partner'}`);
    console.log(`⏰ Logged In At: ${timestamp}`);
    console.log('='.repeat(60) + '\n');

    res.status(200).json({
      success: true,
      data: {
        token,
        status: 'approved',
        user: {
          id: user._id,
          userId: user.userId,
          name: user.name,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          email: user.email,
          shopName: user.shopName,
          shopAddress: user.shopAddress,
          gstNumber: user.gstNumber,
          panNumber: user.panNumber,
          aadhaarNumber: user.aadhaarNumber,
          agentName: user.agentName,
          status: user.status,
          isActive: user.isActive,
          location: user.location,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    User logout
 * @route   POST /api/Users/auth/logout
 * @access  Private (User)
 */
exports.logout = async (req, res, next) => {
  try {
    // TODO: Implement token blacklisting
    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get User profile
 * @route   GET /api/Users/auth/profile
 * @access  Private (User)
 */
exports.getProfile = async (req, res, next) => {
  try {
    // User is attached by authorizeUser middleware
    const user = req.user;

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          userId: user.userId,
          name: user.name,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          email: user.email,
          shopName: user.shopName,
          shopAddress: user.shopAddress,
          gstNumber: user.gstNumber,
          panNumber: user.panNumber,
          aadhaarNumber: user.aadhaarNumber,
          agentName: user.agentName,
          location: user.location,
          status: user.status,
          isActive: user.isActive,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update User phone number (Simplified - no OTP)
 * @route   PUT /api/users/profile/phone
 * @access  Private (User)
 */
exports.updatePhone = async (req, res, next) => {
  try {
    const { phone } = req.body;
    const user = await User.findById(req.user._id);

    if (!phone || phone.replace(/\D/g, '').length !== 10) {
      return res.status(400).json({
        success: false,
        message: 'A valid 10-digit phone number is required',
      });
    }

    const { normalizePhoneNumber } = require('../utils/phoneValidation');
    const normalizedPhone = normalizePhoneNumber(phone);

    if (!normalizedPhone) {
        return res.status(400).json({
            success: false,
            message: 'Invalid phone number format',
        });
    }

    // Check if phone already exists for another user
    const existingUser = await User.findOne({ phone: normalizedPhone, _id: { $ne: user._id } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'This phone number is already registered to another account',
      });
    }

    user.phone = normalizedPhone;
    await user.save();

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          phone: user.phone,
        },
      },
      message: 'Phone number updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update User profile
 * @route   PUT /api/Users/auth/profile
 * @access  Private (User)
 */
exports.updateProfile = async (req, res, next) => {
  try {
    const user = req.user;
    const { name, firstName, lastName, email } = req.body;

    if (name) user.name = name;
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (email) user.email = email;

    // Update name if firstName and lastName are provided
    if (firstName && lastName && !name) {
      user.name = `${firstName} ${lastName}`;
    }

    await user.save();

    res.status(200).json({
      success: true,
      data: {
        User: {
          id: user._id,
          userId: user.userId,
          name: user.name,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          email: user.email,
          shopName: user.shopName,
          shopAddress: user.shopAddress,
          gstNumber: user.gstNumber,
          panNumber: user.panNumber,
          aadhaarNumber: user.aadhaarNumber,
          agentName: user.agentName,
          location: user.location,
          status: user.status,
          isActive: user.isActive,
        },
      },
      message: 'Profile updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get dashboard overview
 * @route   GET /api/Users/dashboard
 * @access  Private (User)
 */

/**
 * @desc    Create new order (Customer)
 * @route   POST /api/users/orders
 * @access  Private (User/Customer)
 */
exports.createOrder = async (req, res, next) => {
  try {
    const { items, deliveryAddress, shippingAddress, notes, orderNote, orderSource = 'cart' } = req.body;
    const finalDeliveryAddress = shippingAddress || deliveryAddress;
    const finalNotes = orderNote || notes;
    const user = req.user;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Order items are required' });
    }

    if (!finalDeliveryAddress) {
      return res.status(400).json({ success: false, message: 'Delivery address is required' });
    }

    // Prepare items and calculate subtotal
    let subtotal = 0;
    const processedItems = [];

    // Construct customer name for delivery address if missing
    if (finalDeliveryAddress && !finalDeliveryAddress.name && (finalDeliveryAddress.firstName || finalDeliveryAddress.lastName)) {
      finalDeliveryAddress.name = `${finalDeliveryAddress.firstName || ''} ${finalDeliveryAddress.lastName || ''}`.trim();
    }

    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(404).json({ success: false, message: `Product ${item.productId} not found` });
      }

      const unitPrice = product.priceToUser || product.price;
      const totalPrice = unitPrice * item.quantity;
      subtotal += totalPrice;

      processedItems.push({
        productId: product._id,
        productName: product.name,
        quantity: item.quantity,
        unitPrice,
        totalPrice,
        variantAttributes: item.variantAttributes || {}
      });
    }

    // Use dynamic delivery config
    const { shippingMethod = 'standard' } = req.body;
    let zone = 'domestic';
    if (finalDeliveryAddress && finalDeliveryAddress.country && finalDeliveryAddress.country.toLowerCase() !== 'india') {
      zone = 'international';
    }

    const deliveryConfig = await loadDeliveryConfig();
    const deliveryInfo = computeDelivery(deliveryConfig, subtotal, zone, shippingMethod);
    const deliveryCharge = deliveryInfo.charge;

    const order = new Order({
      userId: user._id,
      items: processedItems,
      subtotal,
      deliveryCharge,
      totalAmount: subtotal + deliveryCharge,
      deliveryAddress: finalDeliveryAddress,
      notes: finalNotes,
      orderSource,
      status: ORDER_STATUS.PENDING,
      paymentStatus: PAYMENT_STATUS.PENDING,
      assignedTo: 'admin'
    });

    console.log(`[DEBUG] createOrder: Saving new order for user ${user._id}`);
    await order.save();
    console.log(`[DEBUG] createOrder: Order SAVED: ${order.orderNumber} (ID: ${order._id})`);

    res.status(201).json({
      success: true,
      data: {
        order
      },
      message: 'Order created successfully'
    });

  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create Razorpay Order for payment
 * @route   POST /api/users/orders/:id/payment-intent
 * @access  Private (User/Customer)
 */
exports.createPaymentIntent = async (req, res, next) => {
  try {
    const orderId = req.body.orderId || req.params.id;
    const { payFull = false } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Payment is always 100% in Noor E Adah
    const paymentAmount = order.totalAmount;
    const paymentType = 'full';

    // Create Razorpay Order
    const rzpOrder = await razorpayService.createOrder({
      amount: paymentAmount,
      currency: 'INR',
      receipt: order.orderNumber,
      notes: {
        orderId: order._id.toString(),
        paymentType,
        customerName: req.user.name
      }
    });

    order.paymentDetails = {
      ...order.paymentDetails,
      razorpayOrderId: rzpOrder.id
    };
    await order.save();

    res.status(200).json({
      success: true,
      data: {
        paymentIntent: {
          id: rzpOrder.id, // Using Razorpay Order ID as the intent ID
          razorpayOrderId: rzpOrder.id,
          amount: paymentAmount,
          currency: 'INR',
          keyId: process.env.RAZORPAY_KEY_ID,
          paymentType
        }
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Confirm Razorpay Payment
 * @route   POST /api/users/orders/:id/confirm-payment
 * @access  Private (User/Customer)
 */
exports.confirmPayment = async (req, res, next) => {
  try {
    const orderId = req.body.orderId || req.params.id;
    const { 
      razorpayPaymentId, 
      gatewayPaymentId,
      razorpaySignature, 
      gatewaySignature,
      paymentType 
    } = req.body;

    const finalPaymentId = razorpayPaymentId || gatewayPaymentId;
    const finalSignature = razorpaySignature || gatewaySignature;

    console.log(`[DEBUG] confirmPayment: Finding order: ${orderId}`);
    const order = await Order.findById(orderId);
    if (!order) {
      console.log(`[DEBUG] confirmPayment: Order NOT found: ${orderId}`);
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    console.log(`[DEBUG] confirmPayment: Order found: ${order.orderNumber}. Verifying signature...`);
    // Verify signature
    const rzpOrderId = order.paymentDetails?.razorpayOrderId;
    const isValid = razorpayService.verifyPaymentSignature(
      rzpOrderId,
      finalPaymentId,
      finalSignature
    );

    if (!isValid) {
      console.log(`[DEBUG] confirmPayment: Invalid signature for ${order.orderNumber}`);
      return res.status(400).json({ success: false, message: 'Invalid payment signature' });
    }

    console.log(`[DEBUG] confirmPayment: Signature valid for ${order.orderNumber}. Updating status...`);
    // Update order status - Always 100% payment
    order.paymentStatus = PAYMENT_STATUS.COMPLETED;
    order.status = ORDER_STATUS.PAID;

    order.paymentDetails.razorpayPaymentId = finalPaymentId;
    order.paymentDetails.razorpaySignature = finalSignature;
    if (req.body.gatewayOrderId) {
      order.paymentDetails.razorpayOrderId = req.body.gatewayOrderId;
    }
    
    console.log(`[DEBUG] confirmPayment: Saving order: ${order.orderNumber}`);
    await order.save();
    console.log(`[DEBUG] confirmPayment: Order saved: ${order.orderNumber}`);
    
    // Log to payment history
    try {
      await createPaymentHistory({
        activityType: 'user_storefront_order_paid',
        userId: order.userId,
        orderId: order._id,
        amount: order.totalAmount,
        paymentMethod: order.paymentMethod || 'razorpay',
        status: 'completed',
        description: `User paid ₹${order.totalAmount} for storefront order ${order.orderNumber}`,
        metadata: {
          orderNumber: order.orderNumber,
          userName: req.user.name,
          userPhone: req.user.phone,
        },
      });
    } catch (historyError) {
      console.error('Error logging payment history:', historyError);
    }

    
    // Clear cart if the order source was cart
    if (order.orderSource === 'cart') {
      await Cart.findOneAndDelete({ userId: order.userId });
    }

    // Create Notification using the static method we just added
    await UserNotification.createOrderStatusNotification(
      order.userId,
      order,
      order.status
    );

    res.status(200).json({
      success: true,
      message: 'Payment confirmed successfully',
      data: order
    });

  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Generate invoice PDF for user's order
 * @route   GET /api/users/orders/:id/invoice
 * @access  Private (User/Customer)
 */
exports.generateInvoice = async (req, res, next) => {
  try {
    const orderId = req.params.id;
    const user = req.user;

    const order = await Order.findById(orderId)
      .populate('items.productId', 'name sku category')
      .select('-__v');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Ensure user owns this order
    if (order.userId.toString() !== user._id.toString()) {
      return res.status(403).json({ success: false, message: 'You do not have permission to view this invoice' });
    }

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
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; background: #f5f5f5; }
    .invoice-container { max-width: 800px; margin: 0 auto; background: white; padding: 40px; box-shadow: 0 0 20px rgba(0,0,0,0.1); }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 3px solid #CFAE5C; }
    .logo { font-size: 24px; font-weight: bold; color: #CFAE5C; }
    .invoice-title { text-align: right; }
    .invoice-title h1 { font-size: 32px; color: #1f2937; margin-bottom: 5px; }
    .invoice-title p { color: #6b7280; font-size: 14px; }
    .details { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px; }
    .detail-section h3 { color: #374151; font-size: 14px; font-weight: 600; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 1px; }
    .detail-section p { color: #6b7280; font-size: 14px; margin: 5px 0; }
    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    .items-table thead { background: #f3f4f6; }
    .items-table th { padding: 12px; text-align: left; font-weight: 600; color: #374151; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
    .items-table td { padding: 12px; border-bottom: 1px solid #e5e7eb; color: #1f2937; }
    .text-right { text-align: right; }
    .totals { margin-top: 20px; margin-left: auto; width: 300px; }
    .total-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
    .total-row:last-child { border-bottom: none; }
    .total-label { font-weight: 600; color: #374151; }
    .total-amount { font-weight: bold; color: #1f2937; }
    .grand-total { background: #CFAE5C; color: white; padding: 15px; border-radius: 5px; margin-top: 10px; }
    .grand-total .total-label { color: white; font-size: 18px; }
    .grand-total .total-amount { color: white; font-size: 20px; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px; }
    .payment-info { background: #fdf6e7; padding: 15px; border-radius: 5px; margin-top: 20px; }
    .payment-info h4 { color: #855d04; margin-bottom: 8px; }
    .payment-info p { color: #855d04; font-size: 13px; margin: 3px 0; }
    @media print { body { background: white; padding: 0; } .invoice-container { box-shadow: none; padding: 20px; } }
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
        <p><strong>${order.deliveryAddress?.name || user.name || 'N/A'}</strong></p>
        <p>${order.deliveryAddress?.phone || user.phone || 'N/A'}</p>
        <p>${order.deliveryAddress?.address || 'N/A'}</p>
        <p>${order.deliveryAddress?.city || ''} ${order.deliveryAddress?.state || ''} - ${order.deliveryAddress?.pincode || ''}</p>
      </div>
      <div class="detail-section">
        <h3>Invoice Details</h3>
        <p><strong>Invoice Date:</strong> ${formatDate(new Date())}</p>
        <p><strong>Order Date:</strong> ${formatDate(order.createdAt)}</p>
        <p><strong>Order Number:</strong> ${order.orderNumber}</p>
        <p><strong>Payment Status:</strong> <span style="text-transform: capitalize;">${order.paymentStatus === 'completed' ? 'Paid' : (order.paymentStatus?.replace('_', ' ') || 'Pending')}</span></p>
      </div>
    </div>

    <table class="items-table">
      <thead>
        <tr>
          <th>Item</th>
          <th>Qty</th>
          <th class="text-right">Price</th>
          <th class="text-right">Total</th>
        </tr>
      </thead>
      <tbody>
        ${order.items.map((item) => `
          <tr>
            <td>
              <strong>${item.productName || 'Product'}</strong>
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
      <p><strong>Status:</strong> ${order.paymentStatus === 'completed' ? 'Paid in Full' : (order.paymentStatus === 'pending' ? 'Pending' : order.paymentStatus)}</p>
      <p><strong>Total Paid:</strong> ${formatCurrency(order.totalAmount)}</p>
    </div>

    <div class="footer">
      <p>Thank you for choosing Noor E Adah!</p>
      <p style="margin-top: 10px;">Generated on ${formatDate(new Date())}</p>
    </div>
  </div>
</body>
</html>
    `;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${order.orderNumber}.html"`);
    res.send(invoiceHTML);

  } catch (error) {
    next(error);
  }
};

// ============================================================================
// CART / SHOPPING BAG CONTROLLERS
// ============================================================================

/**
 * @desc    Get user's shopping bag
 * @route   GET /api/users/cart
 * @access  Private (User/Customer)
 */
exports.getCart = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Find cart and populate product details
    let cart = await Cart.findOne({ userId }).populate({
      path: 'items.productId',
      select: 'name publicPrice discountPublic images sizes primaryImage isActive'
    });

    // If no cart exists, return empty cart
    if (!cart) {
      return res.status(200).json({
        success: true,
        data: {
          cart: {
            items: [],
            totalAmount: 0,
            itemCount: 0
          }
        }
      });
    }

    // Filter out inactive products that may still be in cart
    const validItems = cart.items.filter(item => item.productId && item.productId.isActive !== false);

    // If items were removed, save cart
    if (validItems.length !== cart.items.length) {
      cart.items = validItems;
      await cart.save();
    }

    // Map items for standardized frontend response
    const frontendItems = cart.items.map(item => {
      const product = item.productId;
      const unitPrice = product.priceToUser || product.publicPrice; 
      
      return {
        id: item._id, // cart item ID
        productId: product._id,
        productName: product.name,
        quantity: item.quantity,
        unitPrice,
        totalPrice: unitPrice * item.quantity,
        image: (product.images && product.images.length > 0) ? (product.images.find(img => img.isPrimary)?.url || product.images[0].url) : '',
        variantAttributes: item.variantAttributes ? Object.fromEntries(item.variantAttributes) : {},
        product: {
           id: product._id,
           name: product.name,
           priceToUser: unitPrice,
           primaryImage: (product.images && product.images.length > 0) ? (product.images.find(img => img.isPrimary)?.url || product.images[0].url) : ''
        }
      };
    });

    const totalAmount = frontendItems.reduce((sum, item) => sum + item.totalPrice, 0);

    res.status(200).json({
      success: true,
      data: {
        cart: {
          id: cart._id,
          items: frontendItems,
          totalAmount,
          itemCount: frontendItems.reduce((sum, item) => sum + item.quantity, 0)
        }
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Add product to shopping bag
 * @route   POST /api/users/cart
 * @access  Private (User/Customer)
 */
exports.addToCart = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { productId, quantity = 1, variantAttributes = {} } = req.body;

    if (!productId) {
      return res.status(400).json({ success: false, message: 'Product ID is required' });
    }

    // Verify product exists and is active
    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      return res.status(404).json({ success: false, message: 'Product not found or inactive' });
    }

    // Find or create cart
    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = new Cart({ userId, items: [] });
    }

    // Check if same product with same attributes already exists
    const existingItemIndex = cart.items.findIndex(item => {
      const idMatch = item.productId.toString() === productId.toString();
      if (!idMatch) return false;

      // Check variant matching if any
      const itemAttrs = item.variantAttributes ? Object.fromEntries(item.variantAttributes) : {};
      const newAttrs = variantAttributes || {};
      
      const itemKeys = Object.keys(itemAttrs);
      const newKeys = Object.keys(newAttrs);
      
      if (itemKeys.length !== newKeys.length) return false;
      
      return itemKeys.every(key => String(itemAttrs[key]) === String(newAttrs[key]));
    });

    if (existingItemIndex > -1) {
      // Update quantity
      cart.items[existingItemIndex].quantity += Number(quantity);
    } else {
      // Add new item
      cart.items.push({
        productId,
        quantity: Number(quantity),
        variantAttributes
      });
    }

    await cart.save();

    // Just call getCart to return the full updated structure
    return exports.getCart(req, res, next);

  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update cart item quantity
 * @route   PUT /api/users/cart/:itemId
 * @access  Private (User/Customer)
 */
exports.updateCartItem = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { itemId } = req.params;
    const { quantity } = req.body;

    if (quantity === undefined || quantity < 1) {
      return res.status(400).json({ success: false, message: 'Valid quantity is required (minimum 1)' });
    }

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart not found' });
    }

    const itemIndex = cart.items.findIndex(item => item._id.toString() === itemId);
    if (itemIndex === -1) {
      return res.status(404).json({ success: false, message: 'Item not found in cart' });
    }

    cart.items[itemIndex].quantity = Number(quantity);
    await cart.save();

    return exports.getCart(req, res, next);

  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Remove item from cart
 * @route   DELETE /api/users/cart/:itemId
 * @access  Private (User/Customer)
 */
exports.removeFromCart = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { itemId } = req.params;

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart not found' });
    }

    cart.items = cart.items.filter(item => item._id.toString() !== itemId);
    await cart.save();

    return exports.getCart(req, res, next);

  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Clear shopping bag
 * @route   DELETE /api/users/cart
 * @access  Private (User/Customer)
 */
exports.clearCart = async (req, res, next) => {
  try {
    const userId = req.user._id;

    await Cart.findOneAndDelete({ userId });

    res.status(200).json({
      success: true,
      message: 'Cart cleared successfully',
      data: {
        cart: {
          items: [],
          totalAmount: 0,
          itemCount: 0
        }
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get dashboard overview
 * @route   GET /api/Users/dashboard
 * @access  Private (User)
 */
exports.getDashboard = async (req, res, next) => {
  try {
    const user = req.user;

    // Get pending orders count
    const pendingOrders = await Order.countDocuments({
      assignedUserId: user._id,
      status: 'pending',
    });

    // Get orders awaiting confirmation
    const awaitingOrders = await Order.countDocuments({
      assignedUserId: user._id,
      status: 'awaiting',
    });

    // Get processing orders
    const processingOrders = await Order.countDocuments({
      assignedUserId: user._id,
      status: 'processing',
    });

    // Get assigned products (inventory)
    const assignedProducts = await ProductAssignment.find({
      userId: user._id,
      isActive: true,
    }).populate('productId', 'name sku category priceToUser imageUrl');

    // Get recent orders
    const recentOrders = await Order.find({
      assignedUserId: user._id,
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('userId', 'name phone')
      .select('orderNumber status totalAmount paymentStatus createdAt')
      .lean();

    res.status(200).json({
      success: true,
      data: {
        overview: {
          orders: {
            pending: pendingOrders,
            awaiting: awaitingOrders,
            processing: processingOrders,
            total: pendingOrders + awaitingOrders + processingOrders,
          },
          inventory: {
            totalProducts: assignedProducts.length,
            lowStockCount: 0,
            lowStockItems: [],
          },
          recentOrders,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// ORDER MANAGEMENT CONTROLLERS
// ============================================================================

// Auto-confirm expired acceptances (runs in background)
async function processExpiredAcceptances(UserId) {
  try {
    const now = new Date();
    const expiredOrders = await Order.find({
      UserId,
      'acceptanceGracePeriod.isActive': true,
      'acceptanceGracePeriod.expiresAt': { $lte: now },
    });

    if (expiredOrders.length === 0) {
      return;
    }

    for (const order of expiredOrders) {
      const previousStatus = order.acceptanceGracePeriod?.previousStatus || ORDER_STATUS.AWAITING;

      order.acceptanceGracePeriod.isActive = false;
      order.acceptanceGracePeriod.confirmedAt = now;
      order.status = ORDER_STATUS.ACCEPTED;
      order.assignedTo = 'user';

      order.statusTimeline.push({
        status: ORDER_STATUS.ACCEPTED,
        timestamp: now,
        updatedBy: 'system',
        note: `Order acceptance auto-confirmed after 1-hour grace period expired (previous status: ${previousStatus}).`,
      });

      await order.save();

      // Deduct stock from inventory
      await deductStockFromInventory(order, UserId);

      console.log(`✅ Order ${order.orderNumber} auto-confirmed after grace period expired`);
    }
  } catch (error) {
    console.error(`Failed to process expired acceptances for User ${UserId}:`, error);
  }
}

// Auto-finalize expired status update grace periods (runs in background)
async function processExpiredStatusUpdates(UserId) {
  try {
    const now = new Date();
    const expiredStatusUpdates = await Order.find({
      assigneduserId: UserId,
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
    console.error(`Failed to process expired status updates for User ${UserId}:`, error);
  }
}

/**
 * @desc    Get all orders with filtering
 * @route   GET /api/Users/orders
 * @access  Private (User)
 */
exports.getOrders = async (req, res, next) => {
  try {
    const user = req.user;
    const { page = 1, limit = 20, status } = req.query;
    const query = { userId: user._id };
    if (status) query.status = status;

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('items.productId', 'name images')
      .lean();

    const total = await Order.countDocuments(query);

    res.status(200).json({
      success: true,
      count: orders.length,
      total,
      data: orders
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get order details
 * @route   GET /api/Users/orders/:orderId
 * @access  Private (User)
 */
exports.getOrderDetails = async (req, res, next) => {
  try {
    const user = req.user;
    const { orderId } = req.params;

    const order = await Order.findOne({
      _id: orderId,
      userId: user._id,
    })
      .populate('items.productId', 'name sku category priceToUser images')
      .select('-__v');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Get order payments
    const Payment = require('../models/Payment');
    const payments = await Payment.find({ orderId })
      .sort({ createdAt: -1 })
      .select('-__v')
      .lean();

    res.status(200).json({
      success: true,
      data: {
        order,
        payments
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Accept order (full availability)
 * @route   POST /api/Users/orders/:orderId/accept
 * @access  Private (User)
 */
exports.acceptOrder = async (req, res, next) => {
  try {
    const user = req.user;
    const { orderId } = req.params;
    const { notes } = req.body;

    const order = await Order.findOne({
      _id: orderId,
      assigneduserId: user._id,
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found or not assigned to you',
      });
    }

    const currentStatus = order.status || ORDER_STATUS.AWAITING;
    const canAcceptStatuses = [ORDER_STATUS.AWAITING, ORDER_STATUS.PENDING];

    if (!canAcceptStatuses.includes(currentStatus)) {
      return res.status(400).json({
        success: false,
        message: `Order cannot be accepted. Current status: ${order.status}`,
      });
    }

    // Check if order is already in grace period
    if (order.acceptanceGracePeriod?.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Order acceptance is already in progress. Please confirm or cancel the acceptance.',
      });
    }

    // Start grace period - don't immediately accept
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now

    const normalizedPreviousStatus = currentStatus === ORDER_STATUS.PENDING ? ORDER_STATUS.AWAITING : currentStatus;

    order.acceptanceGracePeriod = {
      isActive: true,
      acceptedAt: now,
      expiresAt: expiresAt,
      previousStatus: normalizedPreviousStatus,
    };
    order.status = ORDER_STATUS.ACCEPTED;
    order.assignedTo = 'user';

    // Add note if provided
    if (notes) {
      order.notes = `${order.notes || ''}\n[User Initial Acceptance] ${notes}`.trim();
    }

    // Update status timeline
    order.statusTimeline.push({
      status: ORDER_STATUS.ACCEPTED,
      timestamp: now,
      updatedBy: 'user',
      note: 'Order acceptance initiated. User has 1 hour to confirm or revert to awaiting.',
    });

    await order.save();

    console.log(`⏳ Order ${order.orderNumber} acceptance grace period started by User ${user.name}. Expires at: ${expiresAt}`);

    res.status(200).json({
      success: true,
      data: {
        order: {
          id: order._id,
          orderNumber: order.orderNumber,
          status: order.status,
          acceptanceGracePeriod: order.acceptanceGracePeriod,
        },
        message: 'Order acceptance initiated. You have 1 hour to confirm or escalate. Order will auto-confirm after 1 hour if no action is taken.',
        gracePeriodExpiresAt: expiresAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Confirm order acceptance (finalize after grace period)
 * @route   POST /api/Users/orders/:orderId/confirm-acceptance
 * @access  Private (User)
 */
exports.confirmOrderAcceptance = async (req, res, next) => {
  try {
    const user = req.user;
    const { orderId } = req.params;
    const { notes } = req.body;

    const order = await Order.findOne({
      _id: orderId,
      assigneduserId: user._id,
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found or not assigned to you',
      });
    }

    // Check if order is in grace period
    if (!order.acceptanceGracePeriod?.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Order is not in acceptance grace period. Cannot confirm.',
      });
    }

    // Check if grace period has expired
    const now = new Date();
    if (order.acceptanceGracePeriod.expiresAt < now) {
      return res.status(400).json({
        success: false,
        message: 'Grace period has expired. Order should be auto-confirmed.',
      });
    }

    // Finalize acceptance
    const confirmedAt = new Date();
    order.acceptanceGracePeriod.isActive = false;
    order.acceptanceGracePeriod.confirmedAt = confirmedAt;
    order.status = ORDER_STATUS.ACCEPTED;
    order.assignedTo = 'user';

    // Add note if provided
    if (notes) {
      order.notes = `${order.notes || ''}\n[User Confirmed Acceptance] ${notes}`.trim();
    }

    // Update status timeline
    order.statusTimeline.push({
      status: ORDER_STATUS.ACCEPTED,
      timestamp: confirmedAt,
      updatedBy: 'user',
      note: 'Order acceptance confirmed by User. Ready for dispatch workflow.',
    });

    await order.save();

    // Deduct stock from inventory
    await deductStockFromInventory(order, user._id);

    console.log(`✅ Order ${order.orderNumber} acceptance confirmed by User ${user.name}`);

    res.status(200).json({
      success: true,
      data: {
        order: {
          id: order._id,
          orderNumber: order.orderNumber,
          status: order.status,
          stockDeducted: order.stockDeducted
        },
        message: 'Order acceptance confirmed successfully',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Cancel order acceptance during grace period (allows escalation)
 * @route   POST /api/Users/orders/:orderId/cancel-acceptance
 * @access  Private (User)
 */
exports.cancelOrderAcceptance = async (req, res, next) => {
  try {
    const user = req.user;
    const { orderId } = req.params;
    const { reason } = req.body;

    const order = await Order.findOne({
      _id: orderId,
      assigneduserId: user._id,
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found or not assigned to you',
      });
    }

    // Check if order is in grace period
    if (!order.acceptanceGracePeriod?.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Order is not in acceptance grace period. Cannot cancel.',
      });
    }

    // Cancel acceptance - reset to pending
    const cancelledAt = new Date();
    order.acceptanceGracePeriod.isActive = false;
    order.acceptanceGracePeriod.cancelledAt = cancelledAt;
    const previousStatus = order.acceptanceGracePeriod?.previousStatus || ORDER_STATUS.AWAITING;
    order.status = previousStatus;
    // Keep assignedTo as 'user' so User can still escalate

    // Add note
    const cancelReason = reason || 'User cancelled acceptance during grace period';
    order.notes = `${order.notes || ''}\n[User Cancelled Acceptance] ${cancelReason}`.trim();

    // Update status timeline
    order.statusTimeline.push({
      status: previousStatus,
      timestamp: cancelledAt,
      updatedBy: 'user',
      note: `Order acceptance cancelled by User. Reason: ${cancelReason}`,
    });

    await order.save();

    console.log(`⚠️ Order ${order.orderNumber} acceptance cancelled by User ${user.name}. Reason: ${cancelReason}`);

    res.status(200).json({
      success: true,
      data: {
        order: {
          id: order._id,
          orderNumber: order.orderNumber,
          status: order.status,
        },
        message: 'Order acceptance cancelled. You can now escalate the order if needed.',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Auto-confirm orders after grace period expires
 * @desc    This should be called periodically (e.g., every 5 minutes via cron job)
 * @access  Internal
 */
exports.autoConfirmExpiredAcceptances = async () => {
  try {
    const now = new Date();
    const expiredOrders = await Order.find({
      'acceptanceGracePeriod.isActive': true,
      'acceptanceGracePeriod.expiresAt': { $lte: now },
    });

    if (expiredOrders.length === 0) {
      return { confirmed: 0 };
    }

    let confirmedCount = 0;
    for (const order of expiredOrders) {
      const previousStatus = order.acceptanceGracePeriod?.previousStatus || ORDER_STATUS.AWAITING;
      order.acceptanceGracePeriod.isActive = false;
      order.acceptanceGracePeriod.confirmedAt = now;
      order.status = ORDER_STATUS.ACCEPTED;
      order.assignedTo = 'user';

      order.statusTimeline.push({
        status: ORDER_STATUS.ACCEPTED,
        timestamp: now,
        updatedBy: 'system',
        note: `Order acceptance auto-confirmed after 1-hour grace period expired (previous status: ${previousStatus}).`,
      });

      await order.save();

      // Deduct stock from inventory
      if (order.userId) {
        await deductStockFromInventory(order, order.userId);
      }

      confirmedCount++;
      console.log(`✅ Order ${order.orderNumber} auto-confirmed after grace period expired`);
    }

    return { confirmed: confirmedCount };
  } catch (error) {
    console.error('Error auto-confirming expired acceptances:', error);
    throw error;
  }
};

/**
 * @desc    Reject order (escalate to Admin)
 * @route   POST /api/Users/orders/:orderId/reject
 * @access  Private (User)
 */
exports.rejectOrder = async (req, res, next) => {
  try {
    const user = req.user;
    const { orderId } = req.params;
    const { reason, notes } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required',
      });
    }

    const order = await Order.findOne({
      _id: orderId,
      assigneduserId: user._id,
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found or not assigned to you',
      });
    }

    // Allow rejection if order is pending/awaiting OR in grace period
    const isInGracePeriod = order.acceptanceGracePeriod?.isActive;
    const canRejectStatuses = ['pending', 'awaiting'];
    if (!canRejectStatuses.includes(order.status) && !isInGracePeriod) {
      return res.status(400).json({
        success: false,
        message: `Order cannot be rejected. Current status: ${order.status}`,
      });
    }

    // If in grace period, cancel the acceptance first
    if (isInGracePeriod) {
      order.acceptanceGracePeriod.isActive = false;
      order.acceptanceGracePeriod.cancelledAt = new Date();
    }

    // Reject order - escalate to admin
    order.assignedTo = 'admin'; // Escalate to admin
    order.status = 'rejected'; // Mark as rejected by User

    // Track escalation details
    order.escalation = {
      isEscalated: true,
      escalatedAt: new Date(),
      escalatedBy: 'user',
      escalationReason: reason,
      escalationType: 'full',
      escalatedItems: order.items.map(item => {
        // Convert variantAttributes Map to object
        const variantAttrs = item.variantAttributes instanceof Map
          ? Object.fromEntries(item.variantAttributes)
          : item.variantAttributes || {}

        return {
          itemId: item._id,
          productId: item.productId,
          productName: item.productName,
          requestedQuantity: item.quantity,
          availableQuantity: 0, // Will be calculated if needed
          escalatedQuantity: item.quantity,
          reason: reason,
          // Preserve variant attributes
          variantAttributes: Object.keys(variantAttrs).length > 0 ? variantAttrs : undefined,
        }
      }),
      originaluserId: order.userId, // Keep reference to original User
    };

    // Keep UserId for reference but mark as escalated
    // Don't remove UserId so we can track which User escalated

    // Add rejection details
    order.notes = `${order.notes || ''}\n[User Escalation] Reason: ${reason}${notes ? ` | Notes: ${notes}` : ''}`.trim();

    // Update status timeline
    order.statusTimeline.push({
      status: 'rejected',
      timestamp: new Date(),
      updatedBy: 'user',
      note: `Order escalated to admin by User. Reason: ${reason}`,
    });

    // RESTORE STOCK (Since User is strictly rejecting it, we give it back to them digitally,
    // and let Admin take the hit when Admin fulfills it later)
    for (const item of order.items) {
      if (order.userId) {
        const assignment = await ProductAssignment.findOne({
          userId: order.userId,
          productId: item.productId,
          isActive: true
        });

        if (assignment) {
          // Restore Global Stock
          assignment.stock = (assignment.stock || 0) + item.quantity;

          // Restore Attribute Stock
          let itemAttrs = null;
          if (item.variantAttributes) {
            itemAttrs = item.variantAttributes instanceof Map
              ? Object.fromEntries(item.variantAttributes)
              : item.variantAttributes;
          }

          if (itemAttrs && Object.keys(itemAttrs).length > 0 && assignment.attributeStocks) {
            const matchingVariant = assignment.attributeStocks.find(variant => {
              if (!variant.attributes) return false;
              const variantAttrs = variant.attributes instanceof Map
                ? Object.fromEntries(variant.attributes)
                : variant.attributes;
              const keys = Object.keys(itemAttrs);
              return keys.every(key => String(variantAttrs[key]) === String(itemAttrs[key]));
            });

            if (matchingVariant) {
              matchingVariant.stock = (matchingVariant.stock || 0) + item.quantity;
              console.log(`📦 User Stock RESTORED (Variant) for ${item.productName}: ${item.quantity}`);
            }
          }
          await assignment.save();
          console.log(`📦 User Stock RESTORED (Global) for ${item.productName}: ${item.quantity}`);
        }
      }
    }

    await order.save();

    // TODO: Send notification to admin and user

    console.log(`⚠️ Order ${order.orderNumber} rejected by User ${user.name}. Reason: ${reason}`);

    res.status(200).json({
      success: true,
      data: {
        order,
        message: 'Order rejected and escalated to admin',
      },
    });

    // Create Admin TODO Task
    try {
      await adminTaskController.createTaskInternal({
        title: 'Order Escalated: Rejection',
        description: `Order #${order.orderNumber} was rejected by User "${user.name}". Reason: ${reason}. Admin needs to fulfill from warehouse or reassign.`,
        category: 'order',
        priority: 'high',
        link: `/orders/${order._id}`,
        relatedId: order._id,
        metadata: {
          orderNumber: order.orderNumber,
          UserName: user.name,
          reason: reason
        }
      });
    } catch (taskError) {
      console.error('Failed to create admin task:', taskError);
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Partially accept order (splits order)
 * @route   POST /api/Users/orders/:orderId/accept-partial
 * @access  Private (User)
 */
exports.acceptOrderPartially = async (req, res, next) => {
  try {
    const user = req.user;
    const { orderId } = req.params;
    const { acceptedItems, rejectedItems, notes } = req.body;

    if (!acceptedItems || !Array.isArray(acceptedItems) || acceptedItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one accepted item is required',
      });
    }

    if (!rejectedItems || !Array.isArray(rejectedItems) || rejectedItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one rejected item is required for partial acceptance',
      });
    }

    const order = await Order.findOne({
      _id: orderId,
      assigneduserId: user._id,
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found or not assigned to you',
      });
    }

    // Allow partial acceptance if order is pending or awaiting
    const canPartiallyAcceptStatuses = ['pending', 'awaiting'];
    if (!canPartiallyAcceptStatuses.includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: `Order cannot be partially accepted. Current status: ${order.status}`,
      });
    }

    // Get original order items for calculations
    const originalItems = order.items.map(item => item.toObject ? item.toObject() : item);

    // Calculate accepted order total
    const acceptedTotal = originalItems
      .filter(item => acceptedItems.some(ai => ai.itemId && ai.itemId.toString() === item._id.toString()))
      .reduce((sum, item) => {
        const acceptedItem = acceptedItems.find(ai => ai.itemId && ai.itemId.toString() === item._id.toString());
        const quantity = acceptedItem.quantity || item.quantity;
        return sum + (item.unitPrice * quantity);
      }, 0);

    // Calculate rejected order total
    const rejectedTotal = originalItems
      .filter(item => rejectedItems.some(ri => ri.itemId && ri.itemId.toString() === item._id.toString()))
      .reduce((sum, item) => {
        const rejectedItem = rejectedItems.find(ri => ri.itemId && ri.itemId.toString() === item._id.toString());
        const quantity = rejectedItem.quantity || item.quantity;
        return sum + (item.unitPrice * quantity);
      }, 0);

    // Create User order (accepted items)
    const UserOrderItems = originalItems
      .filter(item => acceptedItems.some(ai => ai.itemId && ai.itemId.toString() === item._id.toString()))
      .map(item => {
        const acceptedItem = acceptedItems.find(ai => ai.itemId && ai.itemId.toString() === item._id.toString());
        const itemPayload = {
          productId: item.productId,
          productName: item.productName,
          quantity: acceptedItem.quantity || item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.unitPrice * (acceptedItem.quantity || item.quantity),
        };
        // Preserve variant attributes if present
        if (item.variantAttributes) {
          itemPayload.variantAttributes = item.variantAttributes
        } else if (item.attributeCombination || item.attributes) {
          // Fallback for legacy data
          itemPayload.attributeCombination = item.attributeCombination || item.attributes;
        }
        return itemPayload;
      });

    order.items = UserOrderItems;
    order.totalAmount = acceptedTotal;
    order.status = 'partially_accepted';
    order.assignedTo = 'user';

    if (notes) {
      order.notes = `${order.notes || ''}\n[User Partial Acceptance] ${notes}`.trim();
    }

    // Update status timeline
    order.statusTimeline.push({
      status: 'partially_accepted',
      timestamp: new Date(),
      updatedBy: 'user',
      note: 'Order partially accepted. Some items escalated to admin.',
    });

    await order.save();

    // Deduct stock from inventory for the accepted portion
    await deductStockFromInventory(order, user._id);

    // Save User order first to get original items
    const originalOrder = await Order.findById(orderId).lean();

    // Create admin order (rejected items) - escalated order
    const adminOrderItems = originalOrder.items
      .filter(item => rejectedItems.some(ri => ri.itemId && ri.itemId.toString() === item._id.toString()))
      .map(item => {
        const rejectedItem = rejectedItems.find(ri => ri.itemId && ri.itemId.toString() === item._id.toString());
        const itemPayload = {
          productId: item.productId,
          productName: item.productName,
          quantity: rejectedItem.quantity || item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.unitPrice * (rejectedItem.quantity || item.quantity),
        };
        // Preserve variant attributes if present
        if (item.variantAttributes) {
          itemPayload.variantAttributes = item.variantAttributes
        } else if (item.attributeCombination || item.attributes) {
          // Fallback for legacy data
          itemPayload.attributeCombination = item.attributeCombination || item.attributes;
        }
        return itemPayload;
      });

    // Get escalation details
    const escalatedItemsDetails = originalOrder.items
      .filter(item => rejectedItems.some(ri => ri.itemId && ri.itemId.toString() === item._id.toString()))
      .map(item => {
        const rejectedItem = rejectedItems.find(ri => ri.itemId && ri.itemId.toString() === item._id.toString());
        const escalationItem = {
          itemId: item._id,
          productId: item.productId,
          productName: item.productName,
          requestedQuantity: item.quantity,
          availableQuantity: 0,
          escalatedQuantity: rejectedItem.quantity || item.quantity,
          reason: rejectedItem.reason || notes || 'Item not available',
        };
        // Preserve variant attributes if present
        if (item.variantAttributes) {
          const variantAttrs = item.variantAttributes instanceof Map
            ? Object.fromEntries(item.variantAttributes)
            : item.variantAttributes
          if (Object.keys(variantAttrs).length > 0) {
            const variantAttributesMap = new Map()
            Object.keys(variantAttrs).forEach(key => {
              variantAttributesMap.set(key, String(variantAttrs[key]))
            })
            escalationItem.variantAttributes = variantAttributesMap
          }
        } else if (item.attributeCombination || item.attributes) {
          // Fallback for legacy data
          escalationItem.attributeCombination = item.attributeCombination || item.attributes;
        }
        return escalationItem;
      });

    // Generate new order number for admin order
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const todayStart = new Date(date);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(date);
    todayEnd.setHours(23, 59, 59, 999);
    const todayCount = await Order.countDocuments({
      createdAt: { $gte: todayStart, $lte: todayEnd },
    });
    const sequence = String(todayCount + 1).padStart(4, '0');
    const orderNumber = `ORD-${dateStr}-${sequence}`;

    const adminOrder = await Order.create({
      orderNumber,
      userId: order.userId,
      assignedUserId: null, // Not assigned to any User
      assignedTo: 'admin',
      items: adminOrderItems,
      subtotal: rejectedTotal,
      deliveryCharge: 0,
      totalAmount: rejectedTotal,
      paymentPreference: order.paymentPreference,
      upfrontAmount: order.paymentPreference === 'full' ? rejectedTotal : Math.round(rejectedTotal * 0.3),
      remainingAmount: order.paymentPreference === 'full' ? 0 : rejectedTotal - Math.round(rejectedTotal * 0.3),
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      parentOrderId: order._id, // Link to original order
      deliveryAddress: order.deliveryAddress,
      status: 'rejected', // Escalated to admin
      escalation: {
        isEscalated: true,
        escalatedAt: new Date(),
        escalatedBy: 'user',
        escalationReason: notes || 'Items not available',
        escalationType: 'partial',
        escalatedItems: escalatedItemsDetails,
        originaluserId: user._id,
      },
      notes: `[Escalated from Order ${order.orderNumber}] Items rejected by User.${notes ? ` ${notes}` : ''}`,
      statusTimeline: [{
        status: 'rejected',
        timestamp: new Date(),
        updatedBy: 'user',
        note: 'Order escalated to admin due to partial rejection by User',
      }],
    });

    // Link original order to admin order
    order.childOrderIds = order.childOrderIds || [];
    order.childOrderIds.push(adminOrder._id);
    await order.save();

    // TODO: Send notifications to admin and user

    console.log(`⚠️ Order ${order.orderNumber} partially accepted by User ${user.name}. Admin order created: ${adminOrder.orderNumber}`);

    res.status(200).json({
      success: true,
      data: {
        UserOrder: order,
        adminOrder,
        message: 'Order partially accepted. Rejected items escalated to admin.',
      },
    });

    // Create Admin TODO Task
    try {
      await adminTaskController.createTaskInternal({
        title: 'Order Escalated: Partial Items Rejected',
        description: `Order #${order.orderNumber} was partially accepted by User "${user.name}". Some items were rejected and escalated to Admin order #${adminOrder.orderNumber}.`,
        category: 'order',
        priority: 'high',
        link: `/orders/${adminOrder._id}`,
        relatedId: adminOrder._id,
        metadata: {
          originalOrderNumber: order.orderNumber,
          adminOrderNumber: adminOrder.orderNumber,
          UserName: user.name
        }
      });
    } catch (taskError) {
      console.error('Failed to create admin task:', taskError);
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Escalate order with partial quantities (Scenario 3)
 * @route   POST /api/Users/orders/:orderId/escalate-partial
 * @access  Private (User)
 */
exports.escalateOrderPartial = async (req, res, next) => {
  try {
    const user = req.user;
    const { orderId } = req.params;
    const { escalatedItems, reason, notes } = req.body;

    if (!escalatedItems || !Array.isArray(escalatedItems) || escalatedItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Escalated items are required',
      });
    }

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Escalation reason is required',
      });
    }

    const order = await Order.findOne({
      _id: orderId,
      assigneduserId: user._id,
    }).populate('items.productId');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found or not assigned to you',
      });
    }

    // Allow escalation if order is pending or awaiting
    const canEscalateStatuses = ['pending', 'awaiting'];
    if (!canEscalateStatuses.includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: `Order cannot be escalated. Current status: ${order.status}`,
      });
    }

    const escalatedItemsDetails = [];
    const acceptedItems = [];
    let escalatedTotal = 0;
    let acceptedTotal = 0;

    // Process each item in the order
    for (const orderItem of order.items) {
      const escalatedItem = escalatedItems.find(
        ei => ei.itemId && ei.itemId.toString() === orderItem._id.toString()
      );

      if (escalatedItem) {
        // This item (or part of it) is being escalated
        const assignment = await ProductAssignment.findOne({
          productId: orderItem.productId,
          userId: user._id,
        });
        const availableStock = assignment?.stock || 0;
        const requestedQty = orderItem.quantity;
        const escalatedQty = escalatedItem.escalatedQuantity || requestedQty;
        const acceptedQty = requestedQty - escalatedQty;

        if (escalatedQty > 0) {
          const escalationItem = {
            itemId: orderItem._id,
            productId: orderItem.productId,
            productName: orderItem.productName,
            requestedQuantity: requestedQty,
            availableQuantity: availableStock,
            escalatedQuantity: escalatedQty,
            reason: escalatedItem.reason || reason,
          };
          // Preserve variant attributes if present
          if (orderItem.variantAttributes) {
            const variantAttrs = orderItem.variantAttributes instanceof Map
              ? Object.fromEntries(orderItem.variantAttributes)
              : orderItem.variantAttributes
            if (Object.keys(variantAttrs).length > 0) {
              const variantAttributesMap = new Map()
              Object.keys(variantAttrs).forEach(key => {
                variantAttributesMap.set(key, String(variantAttrs[key]))
              })
              escalationItem.variantAttributes = variantAttributesMap
            }
          } else if (orderItem.attributeCombination || orderItem.attributes) {
            // Fallback for legacy data
            escalationItem.attributeCombination = orderItem.attributeCombination || orderItem.attributes;
          }
          escalatedItemsDetails.push(escalationItem);
          escalatedTotal += orderItem.unitPrice * escalatedQty;
        }

        if (acceptedQty > 0) {
          const acceptedItem = {
            ...orderItem.toObject(),
            quantity: acceptedQty,
            totalPrice: orderItem.unitPrice * acceptedQty,
          };
          // Preserve variant attributes if present
          if (orderItem.variantAttributes) {
            acceptedItem.variantAttributes = orderItem.variantAttributes
          } else if (orderItem.attributeCombination || orderItem.attributes) {
            // Fallback for legacy data
            acceptedItem.attributeCombination = orderItem.attributeCombination || orderItem.attributes;
          }
          acceptedItems.push(acceptedItem);
          acceptedTotal += orderItem.unitPrice * acceptedQty;
        }
      } else {
        // Item is fully accepted
        const fullAcceptedItem = orderItem.toObject();
        // Preserve variant attributes if present
        if (orderItem.variantAttributes) {
          fullAcceptedItem.variantAttributes = orderItem.variantAttributes
        } else if (orderItem.attributeCombination || orderItem.attributes) {
          // Fallback for legacy data
          fullAcceptedItem.attributeCombination = orderItem.attributeCombination || orderItem.attributes;
        }
        acceptedItems.push(fullAcceptedItem);
        acceptedTotal += orderItem.totalPrice;
      }
    }

    // Update order with accepted items
    order.items = acceptedItems;
    order.subtotal = acceptedTotal;
    order.totalAmount = acceptedTotal + (order.deliveryCharge || 0);
    order.status = 'partially_accepted';
    order.assignedTo = 'user';

    // Create escalated order for admin
    const escalatedOrderItems = escalatedItemsDetails.map(ei => {
      const originalItem = order.items.find(item => item.productId.toString() === ei.productId.toString());
      const itemPayload = {
        productId: ei.productId,
        productName: ei.productName,
        quantity: ei.escalatedQuantity,
        unitPrice: originalItem?.unitPrice || 0,
        totalPrice: (originalItem?.unitPrice || 0) * ei.escalatedQuantity,
        status: 'pending',
      };
      // Preserve variant attributes if present
      if (ei.variantAttributes) {
        const variantAttrs = ei.variantAttributes instanceof Map
          ? Object.fromEntries(ei.variantAttributes)
          : ei.variantAttributes
        if (Object.keys(variantAttrs).length > 0) {
          const variantAttributesMap = new Map()
          Object.keys(variantAttrs).forEach(key => {
            variantAttributesMap.set(key, String(variantAttrs[key]))
          })
          itemPayload.variantAttributes = variantAttributesMap
        }
      } else if (originalItem && originalItem.variantAttributes) {
        itemPayload.variantAttributes = originalItem.variantAttributes
      } else if (ei.attributeCombination || (originalItem && (originalItem.attributeCombination || originalItem.attributes))) {
        // Fallback for legacy data
        itemPayload.attributeCombination = ei.attributeCombination || originalItem.attributeCombination || originalItem.attributes;
      }
      return itemPayload;
    });

    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const todayStart = new Date(date);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(date);
    todayEnd.setHours(23, 59, 59, 999);
    const todayCount = await Order.countDocuments({
      createdAt: { $gte: todayStart, $lte: todayEnd },
    });
    const sequence = String(todayCount + 1).padStart(4, '0');
    const escalatedOrderNumber = `ORD-${dateStr}-${sequence}`;

    const escalatedOrder = await Order.create({
      orderNumber: escalatedOrderNumber,
      userId: order.userId,
      assignedUserId: null,
      assignedTo: 'admin',
      items: escalatedOrderItems,
      subtotal: escalatedTotal,
      deliveryCharge: 0, // Admin handles delivery
      totalAmount: escalatedTotal,
      paymentPreference: order.paymentPreference,
      upfrontAmount: order.paymentPreference === 'full' ? escalatedTotal : Math.round(escalatedTotal * 0.3),
      remainingAmount: order.paymentPreference === 'full' ? 0 : escalatedTotal - Math.round(escalatedTotal * 0.3),
      paymentStatus: order.paymentStatus,
      deliveryAddress: order.deliveryAddress,
      status: 'rejected',
      parentOrderId: order._id,
      escalation: {
        isEscalated: true,
        escalatedAt: new Date(),
        escalatedBy: 'user',
        escalationReason: reason,
        escalationType: 'quantity',
        escalatedItems: escalatedItemsDetails,
        originaluserId: user._id,
      },
      notes: `[Escalated from Order ${order.orderNumber}] Partial quantity escalated by User. Reason: ${reason}${notes ? ` | Notes: ${notes}` : ''}`,
      statusTimeline: [{
        status: 'rejected',
        timestamp: new Date(),
        updatedBy: 'user',
        note: `Partial quantity escalated to admin. Reason: ${reason}`,
      }],
    });

    // Link orders
    order.childOrderIds = order.childOrderIds || [];
    order.childOrderIds.push(escalatedOrder._id);
    order.notes = `${order.notes || ''}\n[Partial Escalation] Some quantities escalated to admin. Reason: ${reason}`.trim();
    order.statusTimeline.push({
      status: 'partially_accepted',
      timestamp: new Date(),
      updatedBy: 'user',
      note: `Order partially accepted. Some quantities escalated to admin.`,
    });

    await order.save();

    // Deduct stock from inventory for the accepted portion
    await deductStockFromInventory(order, user._id);

    console.log(`⚠️ Order ${order.orderNumber} partially escalated by User ${user.name}. Escalated order: ${escalatedOrder.orderNumber}`);

    res.status(200).json({
      success: true,
      data: {
        UserOrder: order,
        escalatedOrder,
        message: 'Order partially accepted. Escalated quantities sent to admin.',
      },
    });

    // Create Admin TODO Task
    try {
      await adminTaskController.createTaskInternal({
        title: 'Order Escalated: Partial Quantity Rejected',
        description: `Order #${order.orderNumber} was partially accepted by User "${user.name}". Some quantities were rejected and escalated to Admin order #${escalatedOrder.orderNumber}.`,
        category: 'order',
        priority: 'high',
        link: `/orders/${escalatedOrder._id}`,
        relatedId: escalatedOrder._id,
        metadata: {
          originalOrderNumber: order.orderNumber,
          adminOrderNumber: escalatedOrder.orderNumber,
          UserName: user.name,
          reason: reason
        }
      });
    } catch (taskError) {
      console.error('Failed to create admin task:', taskError);
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update order status
 * @route   PUT /api/Users/orders/:orderId/status
 * @access  Private (User)
 */
exports.updateOrderStatus = async (req, res, next) => {
  try {
    const user = req.user;
    const { orderId } = req.params;
    const { status, notes, finalizeGracePeriod } = req.body;

    // If finalizing grace period, status is not required
    if (!finalizeGracePeriod && !status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required',
      });
    }

    // Valid status transitions for User (only validate if status is provided)
    if (status) {
      const validStatuses = ['awaiting', 'accepted', 'processing', 'dispatched', 'delivered', 'fully_paid'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status. Allowed: ${validStatuses.join(', ')}`,
        });
      }
    }

    const order = await Order.findOne({
      _id: orderId,
      assigneduserId: user._id,
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found or not assigned to you',
      });
    }

    const normalizeStatusValue = (value) => {
      if (!value) {
        return ORDER_STATUS.AWAITING;
      }
      const normalized = value.toString().toLowerCase();
      if (normalized === ORDER_STATUS.PENDING) {
        return ORDER_STATUS.AWAITING;
      }
      if (normalized === ORDER_STATUS.PROCESSING) {
        return ORDER_STATUS.ACCEPTED;
      }
      return normalized;
    };

    const paymentPreference = order.paymentPreference || 'partial';
    const normalizedCurrentStatus = normalizeStatusValue(order.status);
    const normalizedNewStatus = status === ORDER_STATUS.FULLY_PAID
      ? ORDER_STATUS.FULLY_PAID
      : normalizeStatusValue(status);

    const statusFlow = paymentPreference === 'partial'
      ? [ORDER_STATUS.AWAITING, ORDER_STATUS.ACCEPTED, ORDER_STATUS.DISPATCHED, ORDER_STATUS.DELIVERED, ORDER_STATUS.FULLY_PAID]
      : [ORDER_STATUS.AWAITING, ORDER_STATUS.ACCEPTED, ORDER_STATUS.DISPATCHED, ORDER_STATUS.DELIVERED];

    const finalStageStatus = paymentPreference === 'partial'
      ? ORDER_STATUS.FULLY_PAID
      : ORDER_STATUS.DELIVERED;

    // Check if there's an active status update grace period that hasn't expired
    const now = new Date();
    const hasActiveGracePeriod = order.statusUpdateGracePeriod?.isActive &&
      order.statusUpdateGracePeriod.expiresAt > now;

    // Allow finalizing grace period without status change
    if (finalizeGracePeriod === true && hasActiveGracePeriod) {
      order.statusUpdateGracePeriod.isActive = false;
      order.statusUpdateGracePeriod.finalizedAt = now;
      await order.save();
      return res.status(200).json({
        success: true,
        data: {
          order: {
            ...order.toObject(),
            statusUpdateGracePeriod: order.statusUpdateGracePeriod,
          },
          message: 'Status update grace period finalized successfully.',
        },
      });
    }

    if (hasActiveGracePeriod) {
      // During grace period, only allow reverting to previous status
      const isReverting = order.statusUpdateGracePeriod.previousStatus === status;

      if (!isReverting) {
        return res.status(400).json({
          success: false,
          message: `Cannot update status. Previous status update is still in grace period. Please wait for it to finalize (expires in ${Math.ceil((order.statusUpdateGracePeriod.expiresAt - now) / 1000 / 60)} minutes) or revert to previous status.`,
        });
      }
    } else if (order.statusUpdateGracePeriod?.isActive && order.statusUpdateGracePeriod.expiresAt <= now) {
      // Grace period expired, finalize it
      order.statusUpdateGracePeriod.isActive = false;
      order.statusUpdateGracePeriod.finalizedAt = now;
    }

    // Prevent updates once the workflow is complete (after grace period)
    if (!hasActiveGracePeriod && normalizedCurrentStatus === finalStageStatus) {
      return res.status(400).json({
        success: false,
        message: 'Order has already completed its workflow. Further updates are not allowed.',
      });
    }

    // Allow fully_paid only after delivered and for partial payment preference
    if (normalizedNewStatus === ORDER_STATUS.FULLY_PAID) {
      if (paymentPreference !== 'partial') {
        return res.status(400).json({
          success: false,
          message: 'Fully paid status is only applicable for partial payment orders.',
        });
      }
      if (normalizedCurrentStatus !== ORDER_STATUS.DELIVERED) {
        return res.status(400).json({
          success: false,
          message: 'Order must be delivered before marking as fully paid.',
        });
      }
    }

    // Validate status transition order
    const currentIndex = statusFlow.indexOf(normalizedCurrentStatus);
    const newIndex = statusFlow.indexOf(normalizedNewStatus);

    if (newIndex === -1 && normalizedNewStatus !== ORDER_STATUS.FULLY_PAID) {
      return res.status(400).json({
        success: false,
        message: `Cannot change status. ${status} is not part of the workflow for this payment preference.`,
      });
    }

    // If reverting to previous status during grace period, allow it
    const isReverting = hasActiveGracePeriod &&
      order.statusUpdateGracePeriod.previousStatus === normalizedNewStatus;

    if (!isReverting && normalizedNewStatus !== ORDER_STATUS.FULLY_PAID && newIndex !== -1 && newIndex <= currentIndex) {
      return res.status(400).json({
        success: false,
        message: `Cannot change status from ${order.status} to ${status}. Invalid transition.`,
      });
    }

    // Store previous status for grace period (only if not reverting)
    const previousStatus = normalizeStatusValue(order.status);
    const isStatusChange = normalizedNewStatus !== previousStatus;

    const startGracePeriod = (extra = {}) => {
      const expiresAt = new Date(now.getTime() + 60 * 60 * 1000);
      order.statusUpdateGracePeriod = {
        isActive: true,
        previousStatus,
        updatedAt: now,
        expiresAt,
        updatedBy: 'user',
        previousPaymentStatus: undefined,
        previousRemainingAmount: undefined,
        ...extra,
      };
    };

    const finalizeStatusUpdateGracePeriod = () => {
      order.statusUpdateGracePeriod.isActive = false;
      order.statusUpdateGracePeriod.finalizedAt = now;
    };

    // If status is fully_paid, update order + payment status together
    if (normalizedNewStatus === ORDER_STATUS.FULLY_PAID) {
      const previousPaymentStatus = order.paymentStatus;
      const previousRemainingAmount = order.remainingAmount;

      order.status = ORDER_STATUS.FULLY_PAID;
      order.paymentStatus = PAYMENT_STATUS.FULLY_PAID;
      order.remainingAmount = 0;

      // For fully_paid status, no grace period - finalize immediately
      if (!isReverting && isStatusChange) {
        // Finalize any existing grace period if present
        if (order.statusUpdateGracePeriod?.isActive) {
          finalizeStatusUpdateGracePeriod();
        }
        // Don't start a new grace period for fully_paid
        // Status is immediately finalized
      } else if (isReverting && order.statusUpdateGracePeriod?.isActive) {
        order.paymentStatus = order.statusUpdateGracePeriod.previousPaymentStatus || previousPaymentStatus;
        if (typeof order.statusUpdateGracePeriod.previousRemainingAmount === 'number') {
          order.remainingAmount = order.statusUpdateGracePeriod.previousRemainingAmount;
        }
        finalizeStatusUpdateGracePeriod();
      } else if (order.statusUpdateGracePeriod?.isActive) {
        // If there's an active grace period, finalize it
        finalizeStatusUpdateGracePeriod();
      }
    } else {
      // Update order status for all other statuses
      order.status = normalizedNewStatus;

      // Start grace period for status changes (not for reverts)
      if (isStatusChange && !isReverting) {
        startGracePeriod();
      } else if (isReverting && order.statusUpdateGracePeriod?.isActive) {
        // Reverting to previous status - end grace period and restore payment state if needed
        if (order.statusUpdateGracePeriod.previousPaymentStatus) {
          order.paymentStatus = order.statusUpdateGracePeriod.previousPaymentStatus;
        }
        if (typeof order.statusUpdateGracePeriod.previousRemainingAmount === 'number') {
          order.remainingAmount = order.statusUpdateGracePeriod.previousRemainingAmount;
        }
        finalizeStatusUpdateGracePeriod();
      }
    }

    // Update delivery date if delivered
    if (normalizedNewStatus === ORDER_STATUS.DELIVERED && !order.deliveredAt) {
      order.deliveredAt = new Date();
    }

    // Add note if provided
    if (notes) {
      order.notes = `${order.notes || ''}\n[Status Update] ${notes}`.trim();
    }

    // Update status timeline
    const timelineStatus = order.status;
    const timelineNote = isReverting
      ? (notes || `Status reverted to ${timelineStatus} from ${previousStatus}`)
      : (notes || `Order status updated to ${timelineStatus}`);

    order.statusTimeline.push({
      status: timelineStatus,
      timestamp: now,
      updatedBy: 'user',
      note: timelineNote,
    });

    await order.save();

    // Send notification to user about order status change
    try {
      if (order.userId && isStatusChange && !isReverting) {
        await UserNotification.createOrderStatusNotification(
          order.userId,
          order,
          normalizedNewStatus
        );
        console.log(`📱 User notification sent for order ${order.orderNumber} status: ${normalizedNewStatus}`);
      }
    } catch (notifError) {
      // Don't fail the request if notification fails
      console.error('Failed to send user notification:', notifError);
    }

    // For fully_paid status, no grace period message
    const hasGracePeriod = isStatusChange && normalizedNewStatus !== ORDER_STATUS.FULLY_PAID && order.statusUpdateGracePeriod?.isActive;

    const message = isReverting
      ? `Order status reverted to ${timelineStatus}`
      : normalizedNewStatus === ORDER_STATUS.FULLY_PAID
        ? `Order status updated to ${timelineStatus}. Payment completed.`
        : isStatusChange
          ? `Order status updated to ${timelineStatus}. You have 1 hour to revert this change.`
          : `Order status updated to ${timelineStatus}`;

    console.log(`✅ Order ${order.orderNumber} status updated to ${status} by User ${user.name}${hasGracePeriod ? ' (grace period active)' : normalizedNewStatus === ORDER_STATUS.FULLY_PAID ? ' (no grace period - immediately finalized)' : ''}`);

    res.status(200).json({
      success: true,
      data: {
        order: {
          ...order.toObject(),
          statusUpdateGracePeriod: order.statusUpdateGracePeriod,
        },
        message,
        gracePeriod: hasGracePeriod ? {
          isActive: true,
          expiresAt: order.statusUpdateGracePeriod.expiresAt,
          previousStatus: order.statusUpdateGracePeriod.previousStatus,
        } : null,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get order statistics
 * @route   GET /api/Users/orders/stats
 * @access  Private (User)
 */
exports.getOrderStats = async (req, res, next) => {
  try {
    const user = req.user;
    const { period = '30' } = req.query; // days

    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(period));

    // Order status breakdown
    const statusBreakdown = await Order.aggregate([
      {
        $match: {
          userId: user._id,
          createdAt: { $gte: daysAgo },
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

    // Total sales (delivered orders)
    const salesData = await Order.aggregate([
      {
        $match: {
          userId: user._id,
          status: { $in: [ORDER_STATUS.DELIVERED, ORDER_STATUS.FULLY_PAID] },
          paymentStatus: PAYMENT_STATUS.FULLY_PAID,
          createdAt: { $gte: daysAgo },
        },
      },
      {
        $group: {
          _id: null,
          totalSales: { $sum: '$totalAmount' },
          orderCount: { $sum: 1 },
          averageOrderValue: { $avg: '$totalAmount' },
        },
      },
    ]);

    // Daily trends
    const dailyTrends = await Order.aggregate([
      {
        $match: {
          userId: user._id,
          createdAt: { $gte: daysAgo },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          count: { $sum: 1 },
          sales: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ['$status', 'delivered'] }, { $eq: ['$paymentStatus', 'fully_paid'] }] },
                '$totalAmount',
                0,
              ],
            },
          },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        period: parseInt(period),
        statusBreakdown,
        sales: salesData[0] || {
          totalSales: 0,
          orderCount: 0,
          averageOrderValue: 0,
        },
        dailyTrends,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// INVENTORY MANAGEMENT CONTROLLERS
// ============================================================================

/**
 * @desc    Get all products available for ordering (not just assigned)
 * @route   GET /api/Users/products
 * @access  Private (User)
 */
exports.getProducts = async (req, res, next) => {
  try {
    const user = req.user;
    await processPendingDeliveries(user._id);
    const {
      page = 1,
      limit = 20,
      category,
      search,
      ids,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    // Build query - only show active products
    const query = { isActive: true };

    if (ids) {
      const idList = ids.split(',').filter(Boolean);
      if (idList.length > 0) {
        query._id = { $in: idList };
      }
    }

    if (category) {
      query.category = category.toLowerCase();
    }

    if (search) {
      query.$text = { $search: search };
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Sort
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Get all active products (Users can see all products to order)
    const products = await Product.find(query)
      .select('name description category priceToUser displayStock actualStock images sku weight expiry attributeStocks')
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Check which products are assigned to this User
    const productIds = products.map(p => p._id);
    let ordersCountMap = {};

    if (productIds.length > 0) {
      const ordersCounts = await Order.aggregate([
        {
          $match: {
            userId: user._id,
            'items.productId': { $in: productIds },
          },
        },
        { $unwind: '$items' },
        {
          $match: {
            'items.productId': { $in: productIds },
          },
        },
        {
          $group: {
            _id: '$items.productId',
            ordersCount: { $sum: 1 },
          },
        },
      ]);

      ordersCountMap = ordersCounts.reduce((acc, item) => {
        acc[item._id.toString()] = item.ordersCount;
        return acc;
      }, {});
    }
    const assignments = await ProductAssignment.find({
      userId: user._id,
      productId: { $in: productIds },
      isActive: true,
    }).lean();

    const assignedProductIds = new Set(assignments.map(a => a.productId.toString()));

    // Check for incoming deliveries (approved purchases within 24 hours)
    // Only show if delivery hasn't been completed yet
    const now = new Date();
    const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const incomingPurchases = await CreditPurchase.find({
      userId: user._id,
      status: 'approved',
      deliveryStatus: { $in: ['scheduled', 'in_transit'] },
      expectedDeliveryAt: {
        $gte: now, // Only future deliveries
        $lte: twentyFourHoursFromNow, // Within 24 hours
      },
    })
      .select('items expectedDeliveryAt deliveryStatus')
      .lean();

    // Create a map of productId -> incoming delivery info
    const incomingDeliveryMap = {};
    incomingPurchases.forEach((purchase) => {
      purchase.items.forEach((item) => {
        const productIdStr = item.productId?.toString();
        if (productIdStr) {
          if (!incomingDeliveryMap[productIdStr]) {
            incomingDeliveryMap[productIdStr] = {
              isArrivingWithin24Hours: true,
              expectedDeliveryAt: purchase.expectedDeliveryAt,
              deliveryStatus: purchase.deliveryStatus,
            };
          }
        }
      });
    });

    // Enrich products with assignment status and User-specific info
    const enrichedProducts = products.map(product => {
      const isAssigned = assignedProductIds.has(product._id.toString());
      const assignment = assignments.find(a => a.productId.toString() === product._id.toString());
      const adminStock = product.displayStock ?? product.stock ?? 0;
      const UserStock = assignment?.stock ?? 0;
      const incomingDelivery = incomingDeliveryMap[product._id.toString()];

      return {
        ...product,
        id: product._id,
        isAssigned,
        assignmentId: assignment?._id || null,
        adminStock,
        UserStock,
        UserOrdersCount: ordersCountMap[product._id.toString()] || 0,
        // Stock available for ordering is admin managed stock
        stock: adminStock,
        stockStatus: adminStock > 0 ? 'in_stock' : 'out_of_stock',
        pricePerUnit: product.priceToUser,
        unit: product.weight?.unit || 'kg',
        primaryImage: product.images?.find(img => img.isPrimary)?.url || product.images?.[0]?.url || null,
        // Incoming delivery info
        isArrivingWithin24Hours: incomingDelivery?.isArrivingWithin24Hours || false,
        expectedDeliveryAt: incomingDelivery?.expectedDeliveryAt || null,
      };
    });

    const total = await Product.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        products: enrichedProducts,
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
 * @desc    Get single product details for User
 * @route   GET /api/Users/products/:productId
 * @access  Private (User)
 */
exports.getProductDetails = async (req, res, next) => {
  try {
    const user = req.user;
    const { productId } = req.params;

    const product = await Product.findById(productId)
      .select('name description category priceToUser displayStock actualStock images sku weight expiry brand specifications tags attributeStocks')
      .lean();

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Check if product is assigned to this User
    const assignment = await ProductAssignment.findOne({
      userId: user._id,
      productId: product._id,
      isActive: true,
    }).lean();

    const UserOrdersCount = await Order.countDocuments({
      assignedassigneduserId: user._id,
      'items.productId': product._id,
    });

    // Calculate how many orders the User has fulfilled for this product
    const ordersAggregation = await Order.aggregate([
      {
        $match: {
          userId: user._id,
          items: { $elemMatch: { productId: product._id } },
        },
      },
      { $unwind: '$items' },
      {
        $match: {
          'items.productId': product._id,
        },
      },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalQuantity: { $sum: '$items.quantity' },
        },
      },
    ]);

    const ordersInfo = ordersAggregation[0] || { totalOrders: 0, totalQuantity: 0 };

    res.status(200).json({
      success: true,
      data: {
        product: {
          id: product._id,
          name: product.name,
          description: product.description,
          category: product.category,
          priceToUser: product.priceToUser,
          pricePerUnit: product.priceToUser,
          adminStock: product.displayStock ?? product.stock ?? 0,
          UserStock: assignment?.stock ?? 0,
          UserOrdersCount,
          stockStatus: (product.displayStock ?? product.stock ?? 0) > 0 ? 'in_stock' : 'out_of_stock',
          images: product.images,
          primaryImage: product.images?.find(img => img.isPrimary)?.url || product.images?.[0]?.url || null,
          sku: product.sku,
          weight: product.weight,
          unit: product.weight?.unit || 'kg',
          expiry: product.expiry,
          brand: product.brand,
          specifications: product.specifications,
          tags: product.tags,
          attributeStocks: product.attributeStocks || [], // Include attributeStocks for variants
          isAssigned: !!assignment,
          assignmentId: assignment?._id || null,
          ordersFulfilled: ordersInfo.totalOrders,
          quantitySupplied: ordersInfo.totalQuantity,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get inventory items (assigned products)
 * @route   GET /api/Users/inventory
 * @access  Private (User)
 */
exports.getInventory = async (req, res, next) => {
  try {
    const user = req.user;
    await processPendingDeliveries(user._id);
    const {
      page = 1,
      limit = 20,
      category,
      search,
      isActive,
      sortBy = 'assignedAt',
      sortOrder = 'desc',
    } = req.query;

    // Build query
    const query = { userId: user._id };

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get product assignments
    let assignments = await ProductAssignment.find(query)
      .populate('productId', 'name sku category priceToUser imageUrl description')
      .populate('assignedBy', 'name email')
      .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
      .skip(skip)
      .limit(limitNum)
      .select('-__v')
      .lean();

    // Filter by category or search if needed
    if (category) {
      assignments = assignments.filter(a => a.productId && a.productId.category === category);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      assignments = assignments.filter(a =>
        a.productId && (
          a.productId.name.toLowerCase().includes(searchLower) ||
          a.productId.sku.toLowerCase().includes(searchLower)
        )
      );
    }

    const total = await ProductAssignment.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        inventory: assignments,
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
 * @desc    Get inventory item details
 * @route   GET /api/Users/inventory/:itemId
 * @access  Private (User)
 */
exports.getInventoryItemDetails = async (req, res, next) => {
  try {
    const user = req.user;
    const { itemId } = req.params;

    const assignment = await ProductAssignment.findOne({
      _id: itemId,
      userId: user._id,
    })
      .populate('productId')
      .populate('assignedBy', 'name email')
      .select('-__v');

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found or not assigned to you',
      });
    }

    // Get order count for this product from this User
    const orderCount = await Order.countDocuments({
      assignedassigneduserId: user._id,
      'items.productId': assignment.productId._id,
      status: { $in: [ORDER_STATUS.DELIVERED, ORDER_STATUS.FULLY_PAID] },
    });

    res.status(200).json({
      success: true,
      data: {
        assignment,
        statistics: {
          orderCount,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update inventory stock (placeholder - stock tracking to be added to ProductAssignment model)
 * @route   PUT /api/Users/inventory/:itemId/stock
 * @access  Private (User)
 */
exports.updateInventoryStock = async (req, res, next) => {
  try {
    const user = req.user;
    const { itemId } = req.params;
    const { stock, notes } = req.body;

    if (stock === undefined || stock < 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid stock quantity is required (≥ 0)',
      });
    }

    const assignment = await ProductAssignment.findOne({
      _id: itemId,
      userId: user._id,
    });

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found or not assigned to you',
      });
    }

    // Support for both global stock and attribute-specific stock if provided
    const { attributeStocks: updatedAttributeStocks } = req.body;

    if (stock !== undefined) {
      assignment.stock = stock;
      assignment.lastManualStockUpdate = new Date();
    }

    if (updatedAttributeStocks && Array.isArray(updatedAttributeStocks)) {
      assignment.attributeStocks = updatedAttributeStocks;
      assignment.lastManualStockUpdate = new Date();
    }

    if (notes) {
      assignment.notes = `${assignment.notes || ''}\n[${new Date().toISOString()}] ${notes}`.trim();
    }

    await assignment.save();

    res.status(200).json({
      success: true,
      data: {
        message: 'Stock updated successfully',
        assignment,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get inventory statistics
 * @route   GET /api/Users/inventory/stats
 * @access  Private (User)
 */
exports.getInventoryStats = async (req, res, next) => {
  try {
    const user = req.user;

    // Get all assigned products
    const totalProducts = await ProductAssignment.countDocuments({
      userId: user._id,
      isActive: true,
    });

    // Get products by category
    const assignments = await ProductAssignment.find({
      userId: user._id,
      isActive: true,
    }).populate('productId', 'category');

    const categoryBreakdown = {};
    assignments.forEach(assignment => {
      if (assignment.productId && assignment.productId.category) {
        const category = assignment.productId.category;
        categoryBreakdown[category] = (categoryBreakdown[category] || 0) + 1;
      }
    });

    // Get top ordered products
    const topProducts = await Order.aggregate([
      {
        $match: {
          userId: user._id,
          status: { $in: [ORDER_STATUS.DELIVERED, ORDER_STATUS.FULLY_PAID] },
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
        $sort: { totalQuantity: -1 },
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
        totalProducts,
        categoryBreakdown,
        topProducts,
      },
    });
  } catch (error) {
    next(error);
  }
};


// ============================================================================
// CREDIT MANAGEMENT CONTROLLERS
// ============================================================================


/**
 * @desc    Request credit purchase
 * @route   POST /api/Users/credit/purchase
 * @access  Private (User)
 */
exports.requestCreditPurchase = async (req, res, next) => {
  try {
    const user = req.user;
    const {
      items,
      notes,
      reason,
      bankDetails = {},
      confirmationText,
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one product must be included in the request.',
      });
    }

    if (!reason || reason.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Provide a brief reason (minimum 10 characters) for the stock request.',
      });
    }

    if (!confirmationText || confirmationText.trim().toLowerCase() !== 'confirm') {
      return res.status(400).json({
        success: false,
        message: 'Type "confirm" to acknowledge the credit policy and submit the request.',
      });
    }

    const paymentMode = req.body.paymentMode || 'credit';

    if (paymentMode === 'cash') {
      const requiredBankFields = ['accountName', 'accountNumber', 'bankName', 'ifsc'];
      const missingField = requiredBankFields.find((field) => !bankDetails[field] || !bankDetails[field].trim());
      if (missingField) {
        return res.status(400).json({
          success: false,
          message: 'Complete bank details are required (account holder, number, bank name, IFSC) for cash payments.',
        });
      }
    }

    let sanitizedBankDetails = {
      accountName: '',
      accountNumber: '',
      bankName: '',
      ifsc: '',
      branch: '',
    };

    if (paymentMode === 'cash') {
      sanitizedBankDetails = {
        accountName: (bankDetails.accountName || '').trim(),
        accountNumber: (bankDetails.accountNumber || '').toString().trim(),
        bankName: (bankDetails.bankName || '').trim(),
        ifsc: (bankDetails.ifsc || '').trim().toUpperCase(),
        branch: bankDetails.bankBranch?.trim() || bankDetails.branch?.trim() || '',
      };

      if (sanitizedBankDetails.accountNumber.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Account number looks incomplete.',
        });
      }

      if (sanitizedBankDetails.ifsc.length < 4) {
        return res.status(400).json({
          success: false,
          message: 'Please enter a valid IFSC code.',
        });
      }
    }

    const productIds = [...new Set(items.map((item) => item.productId))];
    const products = await Product.find({
      _id: { $in: productIds },
      isActive: true,
    })
      .select('name priceToUser displayStock stock weight attributeStocks')
      .lean();

    const productMap = products.reduce((acc, product) => {
      acc[product._id.toString()] = product;
      return acc;
    }, {});

    let totalAmount = 0;
    const purchaseItems = items.map((item) => {
      const productId = item.productId?.toString();
      const product = productMap[productId];
      if (!product) {
        throw new Error('One of the selected products is no longer available.');
      }

      // Check if product has attributes and if attributeCombination is provided
      const hasAttributes = product.attributeStocks &&
        Array.isArray(product.attributeStocks) &&
        product.attributeStocks.length > 0;
      const attributeCombination = item.attributeCombination || {};

      if (hasAttributes && Object.keys(attributeCombination).length === 0) {
        throw new Error(`Product ${product.name} requires attribute selection.`);
      }

      // Find matching attributeStock if attributes are provided
      let matchingAttributeStock = null;
      if (hasAttributes && Object.keys(attributeCombination).length > 0) {
        matchingAttributeStock = product.attributeStocks.find(stock => {
          if (!stock.attributes || typeof stock.attributes !== 'object') return false
          // Handle both Map and plain object
          const stockAttrs = stock.attributes instanceof Map
            ? Object.fromEntries(stock.attributes)
            : stock.attributes
          return Object.keys(attributeCombination).every(key => {
            return stockAttrs[key] === attributeCombination[key]
          })
        })

        if (!matchingAttributeStock) {
          throw new Error(`Selected variant for ${product.name} is not available.`);
        }
      }

      const quantity = Number(item.quantity) || 0;
      if (quantity <= 0) {
        throw new Error('Each item must include a valid quantity.');
      }

      // Use attribute-specific stock/price if available, otherwise use main product values
      const adminStock = matchingAttributeStock
        ? (matchingAttributeStock.displayStock || 0)
        : (product.displayStock ?? product.stock ?? 0)

      if (quantity > adminStock) {
        throw new Error(`Requested quantity for ${product.name} exceeds admin stock (${adminStock}).`);
      }

      const unitPrice = matchingAttributeStock
        ? (matchingAttributeStock.UserPrice || 0)
        : (Number(product.priceToUser) || 0)
      const totalPrice = quantity * unitPrice;
      totalAmount += totalPrice;

      const itemPayload = {
        productId: productId,
        productName: product.name,
        quantity,
        unitPrice,
        totalPrice,
        unit: matchingAttributeStock?.stockUnit || product.weight?.unit || 'kg',
      };

      // Add attribute combination if provided
      // Convert to Map format for MongoDB schema
      if (hasAttributes && Object.keys(attributeCombination).length > 0) {
        // Convert plain object to Map for MongoDB
        const attributeMap = new Map();
        Object.entries(attributeCombination).forEach(([key, value]) => {
          attributeMap.set(key, String(value));
        });
        itemPayload.attributeCombination = attributeMap;
      }

      return itemPayload;
    });

    // Calculate discount for Cash Payment (Scenario 1)
    const cashDiscount = paymentMode === 'cash' ? Math.round((totalAmount * 7) / 100) : 0;
    const finalTotalAmount = totalAmount - cashDiscount;

    // Get dynamic minimum User purchase from Settings
    const financialParams = await Settings.getSetting('FINANCIAL_PARAMETERS', {});
    const minUserPurchase = financialParams.minimumUserPurchase || MIN_USER_PURCHASE;

    if (totalAmount < minUserPurchase) {
      return res.status(400).json({
        success: false,
        message: `Minimum order value is ₹${minUserPurchase.toLocaleString('en-IN')}.`,
      });
    }

    if (totalAmount > MAX_USER_PURCHASE) {
      return res.status(400).json({
        success: false,
        message: `Maximum order value is ₹${MAX_USER_PURCHASE.toLocaleString('en-IN')}. Your request: ₹${totalAmount.toLocaleString('en-IN')}.`,
      });
    }

    // Check for unpaid credits
    const now = new Date();
    const repaymentDays = User.creditPolicy.repaymentDays || 30;
    const unpaidPurchases = await CreditPurchase.find({
      userId: user._id,
      status: 'approved',
      $or: [
        { deliveryStatus: { $in: ['pending', 'scheduled', 'in_transit'] } },
        {
          deliveryStatus: 'delivered',
          deliveredAt: {
            $gte: new Date(now.getTime() - repaymentDays * 24 * 60 * 60 * 1000),
          },
        },
      ],
    }).select('totalAmount deliveredAt deliveryStatus createdAt');

    const hasUnpaidCredits = unpaidPurchases.length > 0;
    const totalUnpaidAmount = unpaidPurchases.reduce((sum, p) => sum + (p.totalAmount || 0), 0);

    // Generate unique credit purchase ID
    const creditPurchaseId = await generateUniqueId(CreditPurchase, 'CRP', 'creditPurchaseId', 101);

    const purchase = await CreditPurchase.create({
      creditPurchaseId,
      userId: user._id,
      items: purchaseItems,
      totalAmount: finalTotalAmount,
      status: 'pending',
      notes: notes?.trim() || undefined,
      reason: reason.trim(),
      bankDetails: sanitizedBankDetails,
      confirmationText: confirmationText.trim(),
      deliveryStatus: 'pending',
      hasOutstandingDues: hasUnpaidCredits,
      outstandingDuesAmount: totalUnpaidAmount,
    });

    console.log(`✅ Credit purchase requested: ₹${finalTotalAmount} by User ${user.name} - ${user._id}`);

    res.status(201).json({
      success: true,
      data: {
        purchase,
        message: 'Credit purchase request submitted successfully. Awaiting admin approval.',
      },
    });

    // Create Admin TODO Task
    try {
      await adminTaskController.createTaskInternal({
        title: 'New Credit Purchase Request',
        description: `User "${user.name}" (${user.phone}) requested stock with final value ₹${finalTotalAmount.toLocaleString('en-IN')} (Gross: ₹${totalAmount.toLocaleString('en-IN')}). Reason: ${reason.substring(0, 100)}...`,
        category: 'finance',
        priority: 'high',
        link: '/Users/purchase-requests',
        relatedId: purchase._id,
        metadata: {
          UserName: user.name,
          amount: finalTotalAmount,
          grossAmount: totalAmount,
          purchaseId: purchase.creditPurchaseId
        }
      });
    } catch (taskError) {
      console.error('Failed to create admin task:', taskError);
    }
  } catch (error) {
    if (error.message && error.message.includes('exceeds admin stock')) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

/**
 * @desc    Get credit purchase requests
 * @route   GET /api/Users/credit/purchases
 * @access  Private (User)
 */
exports.getCreditPurchases = async (req, res, next) => {
  try {
    const user = req.user;
    const { status, page = 1, limit = 20 } = req.query;

    const query = { userId: user._id };

    if (status) {
      query.status = status;
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const purchases = await CreditPurchase.find(query)
      .populate('reviewedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .select('-__v')
      .lean();

    const total = await CreditPurchase.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        purchases,
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
 * @desc    Get pending credit purchases (approved/sent but not repaid)
 * @route   GET /api/Users/credit/purchases/pending
 * @access  Private (User)
 */
exports.getPendingPurchases = async (req, res, next) => {
  try {
    const user = req.user;

    const purchases = await CreditPurchase.find({
      userId: user._id,
      status: { $in: ['approved', 'sent'] },
    })
      .sort({ createdAt: -1 })
      .select('-__v')
      .lean();

    res.status(200).json({
      success: true,
      data: {
        purchases,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get credit purchase details
 * @route   GET /api/Users/credit/purchases/:requestId
 * @access  Private (User)
 */
exports.getCreditPurchaseDetails = async (req, res, next) => {
  try {
    const user = req.user;
    const { requestId } = req.params;

    const purchase = await CreditPurchase.findOne({
      _id: requestId,
      userId: user._id,
    })
      .populate('reviewedBy', 'name email')
      .populate('items.productId', 'name sku category')
      .select('-__v');

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: 'Credit purchase request not found',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        purchase,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get credit history
 * @route   GET /api/Users/credit/history
 * @access  Private (User)
 */
exports.getCreditHistory = async (req, res, next) => {
  try {
    const user = req.user;
    const { page = 1, limit = 20, period = '30' } = req.query;

    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(period));

    const query = {
      userId: user._id,
      createdAt: { $gte: daysAgo },
    };

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const purchases = await CreditPurchase.find(query)
      .populate('reviewedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .select('-__v')
      .lean();

    // Calculate summary
    const summary = await CreditPurchase.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' },
        },
      },
    ]);

    const total = await CreditPurchase.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        purchases,
        summary,
        period: parseInt(period),
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
// REPORTS & ANALYTICS CONTROLLERS
// ============================================================================

/**
 * @desc    Get reports data
 * @route   GET /api/Users/reports
 * @access  Private (User)
 */
exports.getReports = async (req, res, next) => {
  try {
    const user = req.user;
    const { period = '30', type = 'summary' } = req.query;

    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(period));

    // Revenue summary
    const revenueData = await Order.aggregate([
      {
        $match: {
          userId: user._id,
          status: { $in: [ORDER_STATUS.DELIVERED, ORDER_STATUS.FULLY_PAID] },
          paymentStatus: PAYMENT_STATUS.FULLY_PAID,
          createdAt: { $gte: daysAgo },
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

    // Order breakdown
    const orderBreakdown = await Order.aggregate([
      {
        $match: {
          userId: user._id,
          createdAt: { $gte: daysAgo },
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

    // Payment summary
    const UserOrderIds = await Order.distinct('_id', {
      userId: user._id,
      createdAt: { $gte: daysAgo },
    });

    const paymentData = await Payment.aggregate([
      {
        $match: {
          orderId: { $in: UserOrderIds },
          status: 'fully_paid',
        },
      },
      {
        $group: {
          _id: '$paymentMethod',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        period: parseInt(period),
        type,
        revenue: revenueData[0] || {
          totalRevenue: 0,
          orderCount: 0,
          averageOrderValue: 0,
        },
        orders: {
          breakdown: orderBreakdown,
          total: orderBreakdown.reduce((sum, item) => sum + item.count, 0),
        },
        payments: {
          breakdown: paymentData,
          total: paymentData.reduce((sum, item) => sum + item.totalAmount, 0),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get performance analytics
 * @route   GET /api/Users/reports/analytics
 * @access  Private (User)
 */
exports.getPerformanceAnalytics = async (req, res, next) => {
  try {
    const user = req.user;
    const { period = '30' } = req.query;

    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(period));

    // Sales trends
    const salesTrends = await Order.aggregate([
      {
        $match: {
          userId: user._id,
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

    // Top products
    const topProducts = await Order.aggregate([
      {
        $match: {
          userId: user._id,
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

    // User region stats (if user location data available)
    const userRegionStats = await Order.aggregate([
      {
        $match: {
          userId: user._id,
          status: 'delivered',
          paymentStatus: 'fully_paid',
          createdAt: { $gte: daysAgo },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user',
        },
      },
      {
        $unwind: '$user',
      },
      {
        $group: {
          _id: {
            city: '$user.location.city',
            state: '$user.location.state',
          },
          orderCount: { $sum: 1 },
          totalRevenue: { $sum: '$totalAmount' },
          uniqueUsers: { $addToSet: '$userId' },
        },
      },
      {
        $project: {
          city: '$_id.city',
          state: '$_id.state',
          orderCount: 1,
          totalRevenue: 1,
          uniqueCustomers: { $size: '$uniqueUsers' },
        },
      },
      {
        $sort: { totalRevenue: -1 },
      },
      {
        $limit: 10,
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        period: parseInt(period),
        analytics: {
          salesTrends,
          topProducts,
          userRegionStats,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// EARNINGS CONTROLLERS
// ============================================================================

/**
 * @desc    Get User earnings summary
 * @route   GET /api/Users/earnings
 * @access  Private (User)
 */
exports.getEarningsSummary = async (req, res, next) => {
  try {
    const user = req.user;

    // Calculate total earnings (lifetime)
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

    // Calculate pending withdrawal amount
    const pendingWithdrawals = await WithdrawalRequest.aggregate([
      {
        $match: {
          userId: user._id,
          status: 'pending',
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

    // Calculate available balance (total earnings - pending withdrawals)
    const availableBalance = totalEarnings - pendingWithdrawalAmount;

    // Calculate this month's earnings
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthEarningsResult = await UserEarning.aggregate([
      {
        $match: {
          userId: user._id,
          status: 'processed',
          processedAt: { $gte: monthStart },
        },
      },
      {
        $group: {
          _id: null,
          totalEarnings: { $sum: '$earnings' },
        },
      },
    ]);

    const thisMonthEarnings = thisMonthEarningsResult[0]?.totalEarnings || 0;

    // Calculate total withdrawn amount (approved and completed withdrawals)
    const totalWithdrawnResult = await WithdrawalRequest.aggregate([
      {
        $match: {
          userId: user._id,
          status: { $in: ['approved', 'completed'] },
        },
      },
      {
        $group: {
          _id: null,
          totalWithdrawn: { $sum: '$amount' },
        },
      },
    ]);

    const totalWithdrawn = totalWithdrawnResult[0]?.totalWithdrawn || 0;

    // Get last withdrawal date
    const lastWithdrawal = await WithdrawalRequest.findOne({
      userId: user._id,
      status: { $in: ['approved', 'completed'] },
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: {
        totalEarnings: Math.round(totalEarnings * 100) / 100,
        availableBalance: Math.round(availableBalance * 100) / 100,
        pendingWithdrawal: Math.round(pendingWithdrawalAmount * 100) / 100,
        totalWithdrawn: Math.round(totalWithdrawn * 100) / 100,
        thisMonthEarnings: Math.round(thisMonthEarnings * 100) / 100,
        lastWithdrawalDate: lastWithdrawal?.createdAt || null,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get User earnings history
 * @route   GET /api/Users/earnings/history
 * @access  Private (User)
 */
exports.getEarningsHistory = async (req, res, next) => {
  try {
    const user = req.user;
    const { page = 1, limit = 20, startDate, endDate, status } = req.query;

    const query = { userId: user._id };

    // Date filter
    if (startDate || endDate) {
      query.processedAt = {};
      if (startDate) {
        query.processedAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.processedAt.$lte = new Date(endDate);
      }
    }

    // Status filter
    if (status) {
      query.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const earnings = await UserEarning.find(query)
      .populate('orderId', 'orderNumber totalAmount')
      .populate('productId', 'name')
      .sort({ processedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await UserEarning.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        earnings,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get User earnings by orders
 * @route   GET /api/Users/earnings/orders
 * @access  Private (User)
 */
exports.getEarningsByOrders = async (req, res, next) => {
  try {
    const user = req.user;
    const { page = 1, limit = 20 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Group earnings by order
    const earningsByOrder = await UserEarning.aggregate([
      {
        $match: {
          userId: user._id,
        },
      },
      {
        $group: {
          _id: '$orderId',
          totalEarnings: { $sum: '$earnings' },
          itemCount: { $sum: 1 },
          processedAt: { $max: '$processedAt' },
        },
      },
      {
        $sort: { processedAt: -1 },
      },
      {
        $skip: skip,
      },
      {
        $limit: parseInt(limit),
      },
      {
        $lookup: {
          from: 'orders',
          localField: '_id',
          foreignField: '_id',
          as: 'order',
        },
      },
      {
        $unwind: '$order',
      },
      {
        $project: {
          orderId: '$_id',
          orderNumber: '$order.orderNumber',
          totalEarnings: 1,
          itemCount: 1,
          processedAt: 1,
          orderTotal: '$order.totalAmount',
        },
      },
    ]);

    const total = await UserEarning.distinct('orderId', { userId: user._id }).then(ids => ids.length);

    res.status(200).json({
      success: true,
      data: {
        earningsByOrder,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get User available balance
 * @route   GET /api/Users/balance
 * @access  Private (User)
 */
exports.getBalance = async (req, res, next) => {
  try {
    const user = req.user;

    // Calculate total earnings
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

    // Calculate pending withdrawal amount
    const pendingWithdrawals = await WithdrawalRequest.aggregate([
      {
        $match: {
          userId: user._id,
          status: 'pending',
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

    // Calculate available balance
    const availableBalance = totalEarnings - pendingWithdrawalAmount;

    res.status(200).json({
      success: true,
      data: {
        totalEarnings: Math.round(totalEarnings * 100) / 100,
        availableBalance: Math.round(availableBalance * 100) / 100,
        pendingWithdrawal: Math.round(pendingWithdrawalAmount * 100) / 100,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// WITHDRAWAL REQUEST CONTROLLERS
// ============================================================================

/**
 * @desc    Request withdrawal from earnings
 * @route   POST /api/Users/withdrawals/request
 * @access  Private (User)
 */
exports.requestWithdrawal = async (req, res, next) => {
  try {
    const user = req.user;
    const { amount, bankAccountId } = req.body;

    if (!amount || amount < 1000) {
      return res.status(400).json({
        success: false,
        message: 'Valid withdrawal amount is required (minimum ₹1,000)',
      });
    }

    // Check if User has a pending withdrawal request
    const existingPending = await WithdrawalRequest.findOne({
      userId: user._id,
      status: 'pending',
    });

    if (existingPending) {
      return res.status(400).json({
        success: false,
        message: 'You already have a pending withdrawal request. Please wait for admin approval.',
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

    if (amount > availableBalance) {
      return res.status(400).json({
        success: false,
        message: `Insufficient balance. Available: ₹${Math.round(availableBalance * 100) / 100}, Requested: ₹${amount}`,
      });
    }

    // Verify bank account if provided
    let bankAccount = null;
    if (bankAccountId) {
      bankAccount = await BankAccount.findOne({
        _id: bankAccountId,
        userId: user._id,
        userType: 'user',
      });

      if (!bankAccount) {
        return res.status(400).json({
          success: false,
          message: 'Bank account not found',
        });
      }
    } else {
      // Get primary bank account
      bankAccount = await BankAccount.findOne({
        userId: user._id,
        userType: 'user',
        isPrimary: true,
      });

      if (!bankAccount) {
        return res.status(400).json({
          success: false,
          message: 'Please add a bank account before requesting withdrawal',
        });
      }
    }

    // Generate unique withdrawal ID
    const withdrawalId = await generateUniqueId(WithdrawalRequest, 'WDR', 'withdrawalId', 101);

    // Create withdrawal request
    const withdrawal = await WithdrawalRequest.create({
      withdrawalId,
      userType: 'user',
      userId: user._id,
      amount,
      availableBalance,
      bankAccountId: bankAccount._id,
      status: 'pending',
    });

    // Log to payment history
    try {
      await createPaymentHistory({
        activityType: 'User_withdrawal_requested',
        userId: user._id,
        withdrawalRequestId: withdrawal._id,
        bankAccountId: bankAccount._id,
        amount,
        status: 'pending',
        bankDetails: {
          accountHolderName: bankAccount.accountHolderName,
          accountNumber: bankAccount.accountNumber,
          ifscCode: bankAccount.ifscCode,
          bankName: bankAccount.bankName,
        },
        description: `User ${user.name} requested withdrawal of ₹${amount}`,
        metadata: {
          UserName: user.name,
          UserPhone: user.phone,
          availableBalance,
        },
      });
    } catch (historyError) {
      console.error('Error logging withdrawal history:', historyError);
      // Don't fail withdrawal if history logging fails
    }

    console.log(`✅ Withdrawal requested: ₹${amount} by User ${user.name} (${user.phone})`);

    res.status(201).json({
      success: true,
      data: {
        withdrawal,
      },
      message: 'Withdrawal request submitted successfully. Awaiting admin approval.',
    });

    // Create Admin TODO Task
    try {
      await adminTaskController.createTaskInternal({
        title: 'New Withdrawal Request',
        description: `User "${user.name}" (${user.phone}) requested withdrawal of ₹${amount.toLocaleString('en-IN')}.`,
        category: 'finance',
        priority: 'high',
        link: '/User-withdrawals',
        relatedId: withdrawal._id,
        metadata: {
          UserName: user.name,
          amount: amount,
          withdrawalId: withdrawal.withdrawalId
        }
      });
    } catch (taskError) {
      console.error('Failed to create admin task:', taskError);
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get User withdrawal requests
 * @route   GET /api/Users/withdrawals
 * @access  Private (User)
 */
exports.getWithdrawals = async (req, res, next) => {
  try {
    const user = req.user;
    const { page = 1, limit = 20, status } = req.query;

    const query = {
      userId: user._id,
      userType: 'user',
    };

    if (status) {
      query.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const withdrawals = await WithdrawalRequest.find(query)
      .populate('bankAccountId')
      .populate('reviewedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await WithdrawalRequest.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        withdrawals,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// BANK ACCOUNT CONTROLLERS
// ============================================================================

/**
 * @desc    Add bank account
 * @route   POST /api/Users/bank-accounts
 * @access  Private (User)
 */
exports.addBankAccount = async (req, res, next) => {
  try {
    const user = req.user;
    const { accountHolderName, accountNumber, ifscCode, bankName, branchName, isPrimary = false } = req.body;

    if (!accountHolderName || !accountNumber || !ifscCode || !bankName) {
      return res.status(400).json({
        success: false,
        message: 'Account holder name, account number, IFSC code, and bank name are required',
      });
    }

    const bankAccount = await createBankAccount({
      userId: user._id,
      userType: 'user',
      accountHolderName,
      accountNumber,
      ifscCode: ifscCode.toUpperCase(),
      bankName,
      branchName,
      isPrimary,
    });

    res.status(201).json({
      success: true,
      data: {
        bankAccount,
      },
      message: 'Bank account added successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get User bank accounts
 * @route   GET /api/Users/bank-accounts
 * @access  Private (User)
 */
exports.getBankAccounts = async (req, res, next) => {
  try {
    const user = req.user;

    const bankAccounts = await BankAccount.find({
      userId: user._id,
      userType: 'user',
    }).sort({ isPrimary: -1, createdAt: -1 });

    res.status(200).json({
      success: true,
      data: {
        bankAccounts,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update bank account
 * @route   PUT /api/Users/bank-accounts/:accountId
 * @access  Private (User)
 */
exports.updateBankAccount = async (req, res, next) => {
  try {
    const user = req.user;
    const { accountId } = req.params;
    const { accountHolderName, accountNumber, ifscCode, bankName, branchName, isPrimary } = req.body;

    const bankAccount = await BankAccount.findOne({
      _id: accountId,
      userId: user._id,
      userType: 'user',
    });

    if (!bankAccount) {
      return res.status(404).json({
        success: false,
        message: 'Bank account not found',
      });
    }

    if (accountHolderName) bankAccount.accountHolderName = accountHolderName;
    if (accountNumber) bankAccount.accountNumber = accountNumber;
    if (ifscCode) bankAccount.ifscCode = ifscCode.toUpperCase();
    if (bankName) bankAccount.bankName = bankName;
    if (branchName !== undefined) bankAccount.branchName = branchName;
    if (isPrimary !== undefined) bankAccount.isPrimary = isPrimary;

    await bankAccount.save();

    res.status(200).json({
      success: true,
      data: {
        bankAccount,
      },
      message: 'Bank account updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete bank account
 * @route   DELETE /api/Users/bank-accounts/:accountId
 * @access  Private (User)
 */
exports.deleteBankAccount = async (req, res, next) => {
  try {
    const user = req.user;
    const { accountId } = req.params;

    const bankAccount = await BankAccount.findOne({
      _id: accountId,
      userId: user._id,
      userType: 'user',
    });

    if (!bankAccount) {
      return res.status(404).json({
        success: false,
        message: 'Bank account not found',
      });
    }

    await BankAccount.deleteOne({ _id: accountId });

    res.status(200).json({
      success: true,
      message: 'Bank account deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};


// ============================================================================
// User NOTIFICATION CONTROLLERS
// ============================================================================

/**
 * @desc    Get User notifications
 * @route   GET /api/Users/notifications
 * @access  Private (User)
 */
exports.getNotifications = async (req, res, next) => {
  try {
    const user = req.user;
    // Default limit to 4 as per requirement to show only latest few in bell icon
    const { page = 1, limit = 4, read, type } = req.query;

    // Clean up expired notifications (older than 24 hours)
    await UserNotification.cleanupExpired();

    const query = { userId: user._id };

    // Filter by read status
    if (read !== undefined) {
      query.read = read === 'true';
    }

    // Filter by type
    if (type) {
      query.type = type;
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const notifications = await UserNotification.find(query)
      .sort({ createdAt: -1 }) // Most recent first
      .skip(skip)
      .limit(limitNum)
      .lean();

    const total = await UserNotification.countDocuments(query);
    const unreadCount = await UserNotification.countDocuments({
      userId: user._id,
      read: false,
    });

    res.status(200).json({
      success: true,
      data: {
        notifications: notifications.map((notif) => ({
          id: notif._id,
          type: notif.type,
          title: notif.title,
          message: notif.message,
          read: notif.read,
          readAt: notif.readAt,
          priority: notif.priority,
          relatedEntityType: notif.relatedEntityType,
          relatedEntityId: notif.relatedEntityId,
          metadata: notif.metadata ? Object.fromEntries(notif.metadata) : {},
          timestamp: notif.createdAt,
          createdAt: notif.createdAt,
        })),
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          totalItems: total,
          itemsPerPage: limitNum,
        },
        unreadCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Mark notification as read
 * @route   PATCH /api/Users/notifications/:notificationId/read
 * @access  Private (User)
 */
exports.markNotificationAsRead = async (req, res, next) => {
  try {
    const user = req.user;
    const { notificationId } = req.params;

    const notification = await UserNotification.findOne({
      _id: notificationId,
      userId: user._id,
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    notification.read = true;
    notification.readAt = new Date();
    await notification.save();

    res.status(200).json({
      success: true,
      message: 'Notification marked as read',
      data: {
        notification: {
          id: notification._id,
          read: notification.read,
          readAt: notification.readAt,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Mark all notifications as read
 * @route   PATCH /api/Users/notifications/read-all
 * @access  Private (User)
 */
exports.markAllNotificationsAsRead = async (req, res, next) => {
  try {
    const user = req.user;

    const result = await UserNotification.updateMany(
      {
        userId: user._id,
        read: false,
      },
      {
        $set: {
          read: true,
          readAt: new Date(),
        },
      }
    );

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
      data: {
        updatedCount: result.modifiedCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete notification
 * @route   DELETE /api/Users/notifications/:notificationId
 * @access  Private (User)
 */
exports.deleteNotification = async (req, res, next) => {
  try {
    const user = req.user;
    const { notificationId } = req.params;

    const notification = await UserNotification.findOneAndDelete({
      _id: notificationId,
      userId: user._id,
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Notification deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get User notifications
 * @route   GET /api/Users/notifications
 * @access  Private (User)
 */
exports.getNotifications = async (req, res, next) => {
  try {
    const user = req.user;
    const { page = 1, limit = 50 } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const notifications = await UserNotification.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await UserNotification.countDocuments({ userId: user._id });
    const unreadCount = await UserNotification.countDocuments({
      userId: user._id,
      isRead: false
    });

    res.status(200).json({
      success: true,
      data: {
        notifications,
        unreadCount,
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
// ADDRESS MANAGEMENT CONTROLLERS
// ============================================================================

/**
 * @desc    Get user addresses
 * @route   GET /api/users/addresses
 * @access  Private (User)
 */
exports.getAddresses = async (req, res, next) => {
  try {
    const userId = req.user._id;
    console.log(`🏠 Fetching addresses for user: ${userId}`);

    const addresses = await Address.find({ userId }).sort({ isDefault: -1, createdAt: -1 });

    res.status(200).json({
      success: true,
      data: {
        addresses: addresses.map(addr => ({
          id: addr._id,
          name: addr.name,
          phone: addr.phone,
          address: addr.address,
          city: addr.city,
          state: addr.state,
          pincode: addr.pincode,
          isDefault: addr.isDefault,
          landmark: addr.landmark,
          addressType: addr.addressType
        }))
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Add new address
 * @route   POST /api/users/addresses
 * @access  Private (User)
 */
exports.addAddress = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { name, phone, address, city, state, pincode, isDefault, landmark, addressType } = req.body;

    // Validate required fields
    if (!name || !phone || !address || !city || !state || !pincode) {
      return res.status(400).json({
        success: false,
        message: 'All fields (name, phone, address, city, state, pincode) are required'
      });
    }

    // Generate addressId
    const addressId = await generateUniqueId(Address, 'ADD', 'addressId');

    const newAddress = new Address({
      userId,
      addressId,
      name,
      phone,
      address,
      city,
      state,
      pincode,
      isDefault: !!isDefault,
      landmark,
      addressType
    });

    await newAddress.save();

    res.status(201).json({
      success: true,
      data: {
        id: newAddress._id,
        addressId: newAddress.addressId,
        name: newAddress.name,
        phone: newAddress.phone,
        address: newAddress.address,
        city: newAddress.city,
        state: newAddress.state,
        pincode: newAddress.pincode,
        isDefault: newAddress.isDefault,
        landmark: newAddress.landmark,
        addressType: newAddress.addressType,
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update address
 * @route   PUT /api/users/addresses/:addressId
 * @access  Private (User)
 */
exports.updateAddress = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { addressId } = req.params;
    const { name, phone, address, city, state, pincode, isDefault, landmark, addressType } = req.body;

    const existingAddress = await Address.findOne({ _id: addressId, userId });

    if (!existingAddress) {
      return res.status(404).json({
        success: false,
        message: 'Address not found'
      });
    }

    // Update fields
    if (name !== undefined) existingAddress.name = name;
    if (phone !== undefined) existingAddress.phone = phone;
    if (address !== undefined) existingAddress.address = address;
    if (city !== undefined) existingAddress.city = city;
    if (state !== undefined) existingAddress.state = state;
    if (pincode !== undefined) existingAddress.pincode = pincode;
    if (isDefault !== undefined) existingAddress.isDefault = isDefault;
    if (landmark !== undefined) existingAddress.landmark = landmark;
    if (addressType !== undefined) existingAddress.addressType = addressType;

    await existingAddress.save(); // pre-save hook handles isDefault logic

    res.status(200).json({
      success: true,
      data: {
        id: existingAddress._id,
        name: existingAddress.name,
        phone: existingAddress.phone,
        address: existingAddress.address,
        city: existingAddress.city,
        state: existingAddress.state,
        pincode: existingAddress.pincode,
        isDefault: existingAddress.isDefault,
        landmark: existingAddress.landmark,
        addressType: existingAddress.addressType,
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete address
 * @route   DELETE /api/users/addresses/:addressId
 * @access  Private (User)
 */
exports.deleteAddress = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { addressId } = req.params;

    const address = await Address.findOneAndDelete({ _id: addressId, userId });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Address not found'
      });
    }

    // If deleted address was default, set another one as default if exists
    if (address.isDefault) {
      const anotherAddress = await Address.findOne({ userId });
      if (anotherAddress) {
        anotherAddress.isDefault = true;
        await anotherAddress.save();
      }
    }

    res.status(200).json({
      success: true,
      message: 'Address deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Set default address
 * @route   PUT /api/users/addresses/:addressId/default
 * @access  Private (User)
 */
exports.setDefaultAddress = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { addressId } = req.params;

    const address = await Address.findOne({ _id: addressId, userId });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Address not found'
      });
    }

    address.isDefault = true;
    await address.save(); // Model hook handles unsetting others

    res.status(200).json({
      success: true,
      message: 'Default address updated'
    });
  } catch (error) {
    next(error);
  }
};
// ============================================================================
// STOCK PURCHASE APIs
// ============================================================================

/**
 * @desc    Request stock purchase
 * @route   POST /api/users/stock-purchases/request
 * @access  Private (User)
 */
exports.requestStockPurchase = async (req, res, next) => {
  try {
    const { items, paymentMethod = 'razorpay', notes } = req.body;
    const user = req.user;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Stock items are required' });
    }

    // Process items and calculate total
    let totalAmount = 0;
    const processedItems = [];

    const Product = require('../models/Product'); // Ensure it's available
    
    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(404).json({ success: false, message: `Product ${item.productId} not found` });
      }

      const unitPrice = product.priceToUser || product.price;
      const totalPrice = unitPrice * item.quantity;
      totalAmount += totalPrice;

      processedItems.push({
        productId: product._id,
        productName: product.name,
        quantity: item.quantity,
        unitPrice,
        totalPrice,
        variantAttributes: item.variantAttributes || {}
      });
    }

    const UserPurchase = require('../models/UserPurchase');
    
    // Create new purchase request
    const purchase = new UserPurchase({
      userId: user._id,
      userName: user.name || `${user.firstName} ${user.lastName}`,
      userPhone: user.phone,
      items: processedItems,
      totalAmount,
      paymentMethod,
      status: 'pending',
      deliveryStatus: 'pending',
      notes
    });

    await purchase.save();

    // Log to payment history
    try {
      await createPaymentHistory({
        activityType: 'user_stock_purchase_requested',
        userId: user._id,
        amount: totalAmount,
        paymentMethod: paymentMethod,
        status: 'pending',
        description: `User ${user.name} requested stock purchase of ₹${totalAmount}`,
        metadata: {
          purchaseOrderId: purchase._id,
          userName: user.name,
          userPhone: user.phone,
        },
      });
    } catch (historyError) {
      console.error('Error logging stock purchase request to history:', historyError);
    }


    res.status(201).json({
      success: true,
      data: {
        purchase
      },
      message: 'Stock purchase request submitted successfully'
    });

  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all user stock purchases
 * @route   GET /api/users/stock-purchases
 * @access  Private (User)
 */
exports.getStockPurchases = async (req, res, next) => {
  try {
    const user = req.user;
    const { status, page = 1, limit = 20 } = req.query;

    const query = { userId: user._id };
    if (status) query.status = status;

    const UserPurchase = require('../models/UserPurchase');
    const purchases = await UserPurchase.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    const total = await UserPurchase.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        purchases,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get stock purchase details
 * @route   GET /api/users/stock-purchases/:purchaseId
 * @access  Private (User)
 */
exports.getStockPurchaseDetails = async (req, res, next) => {
  try {
    const user = req.user;
    const { purchaseId } = req.params;

    const UserPurchase = require('../models/UserPurchase');
    const purchase = await UserPurchase.findOne({
      _id: purchaseId,
      userId: user._id
    })
      .populate('items.productId', 'name images sku')
      .lean();

    if (!purchase) {
      return res.status(404).json({ success: false, message: 'Purchase record not found' });
    }

    res.status(200).json({
      success: true,
      data: {
        purchase
      }
    });
  } catch (error) {
    next(error);
  }
};
