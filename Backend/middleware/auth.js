const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key_change_in_production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '30d';

/**
 * Generate JWT Token
 * @param {Object} payload - Token payload (userId, role, etc.)
 * @returns {string} - JWT token
 */
exports.generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
};

/**
 * Verify JWT Token
 * @param {string} token - JWT token
 * @returns {Object} - Decoded token payload
 */
exports.verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};

/**
 * Protect routes - Require authentication
 * Middleware to check if user is authenticated
 */
exports.protect = async (req, res, next) => {
  try {
    let token;

    // Get token from Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route',
      });
    }

    try {
      // Verify token
      const decoded = exports.verifyToken(token);

      // Attach decoded token to request
      req.user = decoded;
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Admin Authorization Middleware
 * Requires authentication and admin role
 */
exports.authorizeAdmin = async (req, res, next) => {
  try {
    let token;

    // Get token from Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route',
      });
    }

    try {
      // Verify token
      const decoded = exports.verifyToken(token);

      // Check if user is admin
      if (decoded.role !== 'admin' && decoded.role !== 'super_admin' && decoded.role !== 'manager') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Admin role required.',
        });
      }

      // Fetch admin details from database
      const admin = await Admin.findById(decoded.adminId || decoded.userId || decoded.id);

      if (!admin || !admin.isActive) {
        return res.status(403).json({
          success: false,
          message: 'Admin account not found or inactive',
        });
      }

      req.user = decoded;
      req.admin = admin;
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * User Authorization Middleware (Previously authorizeVendor)
 * Requires authentication and user role
 */
exports.authorizeUser = async (req, res, next) => {
  try {
    let token;

    // Get token from Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route',
      });
    }

    try {
      // Verify token
      const decoded = exports.verifyToken(token);

      // Check if user has 'user' role (previously 'vendor' or others)
      if (decoded.role !== 'user' && decoded.role !== 'vendor' && decoded.role !== 'customer') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. User role required.',
        });
      }

      // Attach decoded token to request
      req.user = decoded;

      // Fetch user details from database
      const user = await User.findById(decoded.userId || decoded.id || decoded.vendorId);

      if (!user) {
        return res.status(403).json({
          success: false,
          message: 'User account not found',
        });
      }

      // Use logic from former Vendor model as it's the primary one now
      if (!user.isActive || (user.status && user.status === 'rejected')) {
        return res.status(403).json({
          success: false,
          message: 'User account is inactive or not approved',
        });
      }

      req.user = user;
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Role-based authorization
 * Check if user has required role
 * @param {...string} roles - Allowed roles
 */
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(' or ')}`,
      });
    }
    next();
  };
};

