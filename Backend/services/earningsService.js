/**
 * Earnings Service
 * 
 * Handles calculation and processing of User earnings and seller commissions
 * Triggered when orders are completed and fully paid
 */

const UserEarning = require('../models/UserEarning');
const Commission = require('../models/Commission');
const PaymentHistory = require('../models/PaymentHistory');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const Seller = require('../models/Seller');
const { PAYMENT_STATUS, ORDER_STATUS, CUSTOMER_REWARD_COMMISSION_THRESHOLD, CUSTOMER_REWARD_COMMISSION_RATE_LOW, CUSTOMER_REWARD_COMMISSION_RATE_HIGH } = require('../utils/constants');
const { createUserEarning, createCommission, createPaymentHistory } = require('../utils/createWithId');

/**
 * Calculate and create User earnings for an order
 * @param {Object} order - Order document
 * @returns {Promise<Array>} Array of created UserEarning documents
 */
async function calculateUserEarnings(order) {
  try {
    // Only calculate earnings for orders with Users and fully paid
    if (!order.userId || order.paymentStatus !== PAYMENT_STATUS.FULLY_PAID) {
      return [];
    }

    // Only calculate earnings if User fulfilled the order themselves (not escalated to admin)
    // Check if order is assigned to User and not escalated
    if (order.assignedTo === 'admin' || order.isEscalated === true) {
      console.log(`⚠️ Skipping earnings calculation for order ${order.orderNumber} - order was escalated to admin`);
      return [];
    }

    const User = await User.findById(order.userId);
    if (!User) {
      console.warn(`⚠️ User not found for order ${order.orderNumber}`);
      return [];
    }

    const earnings = [];

    // Calculate earnings for each order item
    for (const item of order.items) {
      // Get product to get User price
      const product = await Product.findById(item.productId);
      if (!product) {
        console.warn(`⚠️ Product not found for item in order ${order.orderNumber}`);
        continue;
      }

      const userPrice = item.unitPrice; // Price user paid
      const UserPrice = product.priceToUser; // Price User paid to admin
      const quantity = item.quantity;

      // Calculate earnings: (User Price - User Price) × Quantity
      const earningsPerItem = (userPrice - UserPrice) * quantity;

      if (earningsPerItem > 0) {
        const earning = await createUserEarning({
          userId: User._id,
          orderId: order._id,
          productId: product._id,
          productName: item.productName || product.name,
          quantity,
          userPrice,
          UserPrice,
          earnings: Math.round(earningsPerItem * 100) / 100, // Round to 2 decimal places
          status: 'processed',
          processedAt: new Date(),
          notes: `Earnings from order ${order.orderNumber}`,
        });

        earnings.push(earning);

        // Log to payment history
        await createPaymentHistory({
          activityType: 'User_earning_credited',
          userId: User._id,
          orderId: order._id,
          UserEarningId: earning._id,
          amount: earning.earnings,
          status: 'credited',
          description: `User earning of ₹${earning.earnings} credited for order ${order.orderNumber} item ${product.name}`,
          metadata: {
            orderNumber: order.orderNumber,
            productName: product.name,
            quantity: earning.quantity,
            userPrice: earning.userPrice,
            UserPrice: earning.UserPrice,
          },
        });

        console.log(`💰 User earning created: ₹${earningsPerItem} for User ${User.name} from order ${order.orderNumber}`);
      }
    }

    return earnings;
  } catch (error) {
    console.error('Error calculating User earnings:', error);
    throw error;
  }
}

/**
 * Calculate and create seller commission for an order
 * This function is already implemented in userController, but we'll keep it here for consistency
 * @param {Object} order - Order document
 * @returns {Promise<Object|null>} Created Commission document or null
 */
async function calculateSellerCommission(order) {
  try {
    // Only calculate commission for orders with sellers and fully paid
    if (!order.seller || !order.sellerId || order.paymentStatus !== PAYMENT_STATUS.FULLY_PAID) {
      return null;
    }

    const seller = await Seller.findById(order.seller);
    if (!seller) {
      console.warn(`⚠️ Seller not found for order ${order.orderNumber}`);
      return null;
    }

    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    // Calculate user's cumulative purchases for this month (excluding this order)
    const userOrdersThisMonth = await Order.find({
      userId: order.userId,
      sellerId: order.sellerId,
      paymentStatus: PAYMENT_STATUS.FULLY_PAID,
      _id: { $ne: order._id },
      createdAt: {
        $gte: new Date(year, month - 1, 1),
        $lt: new Date(year, month, 1),
      },
    });

    const cumulativePurchaseAmount = userOrdersThisMonth.reduce((sum, o) => sum + o.totalAmount, 0);
    const newCumulativePurchaseAmount = cumulativePurchaseAmount + order.totalAmount;

    // Determine commission rate based on monthly purchases
    // 3% if >= 50000, 2% if < 50000
    const commissionRate = newCumulativePurchaseAmount < CUSTOMER_REWARD_COMMISSION_THRESHOLD
      ? CUSTOMER_REWARD_COMMISSION_RATE_LOW
      : CUSTOMER_REWARD_COMMISSION_RATE_HIGH;

    // Calculate commission amount
    const commissionAmount = (order.totalAmount * commissionRate) / 100;

    // Create commission record
    const commission = await createCommission({
      sellerId: seller._id,
      sellerIdCode: seller.sellerId,
      userId: order.userId,
      orderId: order._id,
      month,
      year,
      orderAmount: order.totalAmount,
      cumulativePurchaseAmount,
      newCumulativePurchaseAmount,
      commissionRate,
      commissionAmount: Math.round(commissionAmount * 100) / 100,
      status: 'credited',
      creditedAt: new Date(),
      notes: `Commission for order ${order.orderNumber}`,
    });

    // Update seller wallet
    seller.wallet.balance = (seller.wallet.balance || 0) + commissionAmount;
    await seller.save();

    // Log to payment history
    await createPaymentHistory({
      activityType: 'seller_commission_credited',
      sellerId: seller._id,
      userId: order.userId,
      orderId: order._id,
      commissionId: commission._id,
      amount: commission.commissionAmount,
      status: 'credited',
      description: `Seller commission of ₹${commission.commissionAmount} credited for order ${order.orderNumber}`,
      metadata: {
        orderNumber: order.orderNumber,
        commissionRate: commission.commissionRate,
        newCumulativePurchaseAmount: commission.newCumulativePurchaseAmount,
      },
    });

    console.log(`💰 Commission credited: ₹${commissionAmount} to seller ${seller.sellerId} for order ${order.orderNumber}`);

    // SEND SELLER NOTIFICATION: Commission Earned
    try {
      const SellerNotification = require('../models/SellerNotification');

      await SellerNotification.createNotification({
        sellerId: seller._id,
        type: 'commission_earned',
        title: 'New Commission Earned',
        message: `You earned ₹${commission.commissionAmount} (Rate: ${commission.commissionRate}%) for Order #${order.orderNumber}.`,
        relatedEntityType: 'commission',
        relatedEntityId: commission._id,
        priority: 'normal',
        metadata: { orderNumber: order.orderNumber, amount: commission.commissionAmount }
      });

      // SEND SELLER NOTIFICATION: Tier Upgraded (2% -> 3%)
      if (cumulativePurchaseAmount < CUSTOMER_REWARD_COMMISSION_THRESHOLD &&
        newCumulativePurchaseAmount >= CUSTOMER_REWARD_COMMISSION_THRESHOLD) {

        await SellerNotification.createNotification({
          sellerId: seller._id,
          type: 'tier_upgraded',
          title: '🎉 Commission Tier Upgraded!',
          message: `Congratulations! Your monthly sales crossed ₹${CUSTOMER_REWARD_COMMISSION_THRESHOLD}. You are now earning ${CUSTOMER_REWARD_COMMISSION_RATE_HIGH}% commission!`,
          relatedEntityType: 'seller',
          relatedEntityId: seller._id,
          priority: 'high',
          metadata: { newRate: CUSTOMER_REWARD_COMMISSION_RATE_HIGH, threshold: CUSTOMER_REWARD_COMMISSION_THRESHOLD }
        });
      }

    } catch (notifError) {
      console.error('Failed to send seller commission notification:', notifError);
    }

    return commission;
  } catch (error) {
    // Fault-tolerant: Return null instead of throwing to prevent breaking User earnings flow
    // This follows safe-change principles - Seller module can be disabled without breaking order completion
    console.warn('[FaultTolerant] Seller commission calculation failed, returning null:', error.message);
    return null;
  }
}

/**
 * Process earnings for a completed order
 * Called when order is fully paid
 * @param {Object} order - Order document
 * @returns {Promise<Object>} Object with UserEarnings and commission
 */
async function processOrderEarnings(order) {
  try {
    const results = {
      UserEarnings: [],
      commission: null,
    };

    // Calculate User earnings
    if (order.userId) {
      results.UserEarnings = await calculateUserEarnings(order);
    }

    // Calculate seller commission
    if (order.seller && order.sellerId) {
      results.commission = await calculateSellerCommission(order);
    }

    return results;
  } catch (error) {
    console.error('Error processing order earnings:', error);
    throw error;
  }
}

module.exports = {
  calculateUserEarnings,
  calculateSellerCommission,
  processOrderEarnings,
};

