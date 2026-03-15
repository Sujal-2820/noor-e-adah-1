/**
 * System Constants
 * 
 * Centralized constants for Noor E Adah
 */

// Financial Thresholds
const MIN_ORDER_VALUE = parseInt(process.env.MIN_ORDER_VALUE) || 500;
const DELIVERY_CHARGE = parseInt(process.env.DELIVERY_CHARGE) || 100;

// Credit Purchase Thresholds
const MIN_USER_PURCHASE = 50000;
const MAX_USER_PURCHASE = 100000;

// Delivery Policy
const DELIVERY_TIMELINE_HOURS = parseInt(process.env.DELIVERY_TIMELINE_HOURS) || 24;

// Payment Options
const FULL_PAYMENT_PERCENTAGE = 100;

// OTP Configuration
const OTP_LENGTH = parseInt(process.env.OTP_LENGTH) || 6;
const OTP_EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES) || 5;

// Order Status
const ORDER_STATUS = {
  PENDING: 'pending',
  AWAITING: 'awaiting',
  PAID: 'paid',
  PROCESSING: 'processing',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  RETURNED: 'returned',
  REFUNDED: 'refunded',
  FULLY_PAID: 'fully_paid'
};

// Payment Status
const PAYMENT_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REFUNDED: 'refunded',
  FULLY_PAID: 'fully_paid'
};

// Payment Methods
const PAYMENT_METHODS = {
  RAZORPAY: 'razorpay',
  PAYTM: 'paytm',
  STRIPE: 'stripe',
};

module.exports = {
  MIN_ORDER_VALUE,
  DELIVERY_CHARGE,
  MIN_USER_PURCHASE,
  MAX_USER_PURCHASE,
  DELIVERY_TIMELINE_HOURS,
  FULL_PAYMENT_PERCENTAGE,
  PAYMENT_METHODS,
  OTP_LENGTH,
  OTP_EXPIRY_MINUTES,
  ORDER_STATUS,
  PAYMENT_STATUS
};
