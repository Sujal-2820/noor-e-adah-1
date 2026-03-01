/**
 * Seed Orders, Payments, and Related Data
 * 
 * This script creates comprehensive test data for:
 * - Orders (various statuses and payment scenarios)
 * - Payments (linked to orders)
 * - CreditPurchases (vendor credit requests)
 * - WithdrawalRequests (seller withdrawal requests)
 * - Commissions (historical commission records)
 * 
 * Usage: node scripts/seedOrdersAndPayments.js
 * 
 * NOTE: Run seedTestData.js first to create Products, Vendors, Sellers, Users
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB } = require('../config/database');

// Import all models
const Product = require('../models/Product');
const Vendor = require('../models/Vendor');
const Seller = require('../models/Seller');
const User = require('../models/User');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const CreditPurchase = require('../models/CreditPurchase');
const WithdrawalRequest = require('../models/WithdrawalRequest');
const Commission = require('../models/Commission');
const Admin = require('../models/Admin');

// Import constants
const { ORDER_STATUS, PAYMENT_STATUS, PAYMENT_METHODS, DELIVERY_CHARGE, ADVANCE_PAYMENT_PERCENTAGE, REMAINING_PAYMENT_PERCENTAGE } = require('../utils/constants');

// Store created data
let createdOrders = [];
let createdPayments = [];
let createdCommissions = [];

/**
 * Seed Orders (various statuses and scenarios)
 */
const seedOrders = async () => {
  console.log('\n📦 Creating Orders...\n');
  
  // Get required data
  const activeUsers = await User.find({ isActive: true, isBlocked: false }).limit(10);
  const approvedVendors = await Vendor.find({ status: 'approved', isActive: true });
  const approvedSellers = await Seller.find({ status: 'approved', isActive: true });
  const activeProducts = await Product.find({ isActive: true });
  
  if (activeUsers.length === 0 || activeProducts.length === 0) {
    console.log('⚠️  No active users or products found. Skipping orders...\n');
    return;
  }
  
  // Create orders with different scenarios
  const orderScenarios = [
    // Scenario 1: Pending order (no payment)
    {
      userIndex: 0,
      vendorIndex: 0,
      sellerIndex: 0,
      status: ORDER_STATUS.AWAITING,
      paymentPreference: 'partial',
      paymentStatus: PAYMENT_STATUS.PENDING,
      numItems: 3,
    },
    // Scenario 2: Order with advance payment (30%) only
    {
      userIndex: 1,
      vendorIndex: 0,
      sellerIndex: 1,
      status: ORDER_STATUS.AWAITING,
      paymentPreference: 'partial',
      paymentStatus: PAYMENT_STATUS.PARTIAL_PAID,
      numItems: 4,
    },
    // Scenario 3: Fully paid order (awaiting dispatch)
    {
      userIndex: 2,
      vendorIndex: 1,
      sellerIndex: 2,
      status: ORDER_STATUS.AWAITING,
      paymentPreference: 'full',
      paymentStatus: PAYMENT_STATUS.FULLY_PAID,
      numItems: 2,
    },
    // Scenario 4: Dispatched order
    {
      userIndex: 3,
      vendorIndex: 1,
      sellerIndex: 3,
      status: ORDER_STATUS.DISPATCHED,
      paymentPreference: 'partial',
      paymentStatus: PAYMENT_STATUS.PARTIAL_PAID,
      numItems: 5,
    },
    // Scenario 5: Delivered order (pending remaining payment)
    {
      userIndex: 4,
      vendorIndex: 2,
      sellerIndex: 4,
      status: ORDER_STATUS.DELIVERED,
      paymentPreference: 'partial',
      paymentStatus: PAYMENT_STATUS.PARTIAL_PAID,
      numItems: 3,
    },
    // Scenario 6: Fully delivered and paid
    {
      userIndex: 5,
      vendorIndex: 2,
      sellerIndex: 5,
      status: ORDER_STATUS.DELIVERED,
      paymentPreference: 'full',
      paymentStatus: PAYMENT_STATUS.FULLY_PAID,
      numItems: 4,
      deliveredAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
    },
    // Scenario 7: Delivered and fully paid (for commission)
    {
      userIndex: 6,
      vendorIndex: 3,
      sellerIndex: 6,
      status: ORDER_STATUS.DELIVERED,
      paymentPreference: 'partial',
      paymentStatus: PAYMENT_STATUS.FULLY_PAID,
      numItems: 3,
      deliveredAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
    },
    // Scenario 8: Rejected order (vendor rejected)
    {
      userIndex: 7,
      vendorIndex: 3,
      sellerIndex: 7,
      status: ORDER_STATUS.REJECTED,
      paymentPreference: 'partial',
      paymentStatus: PAYMENT_STATUS.PARTIAL_PAID,
      numItems: 2,
      assignedTo: 'admin',
    },
    // Scenario 9: Partially accepted order
    {
      userIndex: 0,
      vendorIndex: 4,
      sellerIndex: 0,
      status: ORDER_STATUS.PARTIALLY_ACCEPTED,
      paymentPreference: 'partial',
      paymentStatus: PAYMENT_STATUS.PARTIAL_PAID,
      numItems: 5,
    },
    // Scenario 10: Cancelled order
    {
      userIndex: 1,
      vendorIndex: 4,
      sellerIndex: 1,
      status: ORDER_STATUS.CANCELLED,
      paymentPreference: 'full',
      paymentStatus: PAYMENT_STATUS.PENDING,
      numItems: 2,
      cancelledAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      cancelledBy: 'user',
    },
    // Scenario 11: Admin-assigned order (no vendor)
    {
      userIndex: 2,
      vendorIndex: null,
      sellerIndex: 2,
      status: ORDER_STATUS.AWAITING,
      paymentPreference: 'full',
      paymentStatus: PAYMENT_STATUS.FULLY_PAID,
      numItems: 3,
      assignedTo: 'admin',
    },
    // Scenario 12: User without seller ID
    {
      userIndex: 8,
      vendorIndex: 5,
      sellerIndex: null,
      status: ORDER_STATUS.DELIVERED,
      paymentPreference: 'full',
      paymentStatus: PAYMENT_STATUS.FULLY_PAID,
      numItems: 2,
      deliveredAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    },
  ];
  
  // Check existing orders for today to avoid duplicate order numbers
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const existingOrdersCount = await Order.countDocuments({
    orderNumber: { $regex: `^ORD-${dateStr}-` }
  });
  
  let orderCount = 0;
  
  for (const scenario of orderScenarios) {
    if (scenario.userIndex >= activeUsers.length) continue;
    if (scenario.vendorIndex !== null && scenario.vendorIndex >= approvedVendors.length) continue;
    if (scenario.sellerIndex !== null && scenario.sellerIndex >= approvedSellers.length) continue;
    
    const user = activeUsers[scenario.userIndex];
    const vendor = scenario.vendorIndex !== null ? approvedVendors[scenario.vendorIndex] : null;
    const seller = scenario.sellerIndex !== null ? approvedSellers[scenario.sellerIndex] : null;
    
    // Get user's address or use default
    const Address = require('../models/Address');
    let userAddress = await Address.findOne({ userId: user._id, isDefault: true });
    if (!userAddress) {
      userAddress = {
        name: user.name,
        phone: user.phone,
        address: user.location?.address || 'Default Address',
        city: user.location?.city || 'Test City',
        state: user.location?.state || 'Test State',
        pincode: user.location?.pincode || '110001',
        coordinates: user.location?.coordinates || { lat: 28.6139, lng: 77.2090 },
      };
    } else {
      userAddress = {
        name: userAddress.name,
        phone: userAddress.phone,
        address: userAddress.address,
        city: userAddress.city,
        state: userAddress.state,
        pincode: userAddress.pincode,
        coordinates: userAddress.coordinates,
      };
    }
    
    // Select random products
    const selectedProducts = activeProducts.slice(0, scenario.numItems);
    const orderItems = selectedProducts.map((product, idx) => ({
      productId: product._id,
      productName: product.name,
      quantity: Math.floor(Math.random() * 3) + 1, // 1-3 quantity
      unitPrice: product.priceToUser,
      totalPrice: 0, // Will be calculated
      status: scenario.status === ORDER_STATUS.PARTIALLY_ACCEPTED && idx >= 3 ? 'rejected' : 'accepted',
    }));
    
    // Calculate totals
    orderItems.forEach(item => {
      item.totalPrice = item.quantity * item.unitPrice;
    });
    
    const subtotal = orderItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const deliveryCharge = scenario.paymentPreference === 'full' ? 0 : DELIVERY_CHARGE;
    const totalAmount = subtotal + deliveryCharge;
    const upfrontAmount = scenario.paymentPreference === 'full' 
      ? totalAmount 
      : Math.round(totalAmount * (ADVANCE_PAYMENT_PERCENTAGE / 100));
    const remainingAmount = scenario.paymentPreference === 'full' 
      ? 0 
      : totalAmount - upfrontAmount;
    
    // Create order
    const order = new Order({
      userId: user._id,
      sellerId: seller?.sellerId || null,
      seller: seller?._id || null,
      vendorId: vendor?._id || null,
      assignedTo: scenario.assignedTo || (vendor ? 'vendor' : 'admin'),
      items: orderItems,
      subtotal,
      deliveryCharge,
      deliveryChargeWaived: scenario.paymentPreference === 'full',
      totalAmount,
      paymentPreference: scenario.paymentPreference,
      upfrontAmount,
      remainingAmount,
      paymentStatus: scenario.paymentStatus,
      deliveryAddress: userAddress,
      status: scenario.status,
      statusTimeline: [
        {
          status: ORDER_STATUS.AWAITING,
          timestamp: new Date(Date.now() - (scenario.numItems * 24 * 60 * 60 * 1000)),
          updatedBy: 'system',
        },
        ...(scenario.status !== ORDER_STATUS.AWAITING ? [{
          status: scenario.status,
          timestamp: new Date(Date.now() - (scenario.numItems - 1) * 24 * 60 * 60 * 1000),
          updatedBy: vendor ? 'vendor' : 'admin',
        }] : []),
      ],
      expectedDeliveryDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      deliveredAt: scenario.deliveredAt || null,
      cancelledAt: scenario.cancelledAt || null,
      cancelledBy: scenario.cancelledBy || null,
      isPartialFulfillment: scenario.status === ORDER_STATUS.PARTIALLY_ACCEPTED,
    });
    
    // Generate order number manually to avoid conflicts
    const sequence = String(existingOrdersCount + orderCount + 1).padStart(4, '0');
    order.orderNumber = `ORD-${dateStr}-${sequence}`;
    
    await order.save();
    createdOrders.push(order);
    orderCount++;
    
    console.log(`✅ Order created: ${order.orderNumber} - Status: ${order.status} - Payment: ${order.paymentStatus} - Amount: ₹${order.totalAmount}`);
  }
  
  console.log(`\n✅ Created ${orderCount} orders\n`);
};

/**
 * Seed Payments (linked to orders)
 */
const seedPayments = async () => {
  console.log('\n💳 Creating Payments...\n');
  
  const orders = await Order.find({ 
    paymentStatus: { $in: [PAYMENT_STATUS.PARTIAL_PAID, PAYMENT_STATUS.FULLY_PAID] }
  }).limit(createdOrders.length);
  
  if (orders.length === 0) {
    console.log('⚠️  No orders with payments found. Skipping payments...\n');
    return;
  }
  
  // Check existing payments for today to avoid duplicate payment IDs
  const paymentDate = new Date();
  const paymentDateStr = paymentDate.toISOString().slice(0, 10).replace(/-/g, '');
  const existingPaymentsCount = await Payment.countDocuments({
    paymentId: { $regex: `^PAY-${paymentDateStr}-` }
  });
  
  let paymentCount = 0;
  
  for (const order of orders) {
    // Create advance payment if partial or full payment
    if (order.paymentStatus === PAYMENT_STATUS.PARTIAL_PAID || order.paymentStatus === PAYMENT_STATUS.FULLY_PAID) {
      const paymentType = order.paymentPreference === 'full' ? 'full' : 'advance';
      const paymentAmount = order.paymentPreference === 'full' ? order.totalAmount : order.upfrontAmount;
      
      // Generate payment ID manually
      const sequence = String(existingPaymentsCount + paymentCount + 1).padStart(4, '0');
      const paymentId = `PAY-${paymentDateStr}-${sequence}`;
      
      const payment = new Payment({
        paymentId, // Generate manually to avoid validation error
        orderId: order._id,
        userId: order.userId,
        paymentType,
        amount: paymentAmount,
        paymentMethod: PAYMENT_METHODS.RAZORPAY,
        status: paymentType === 'full' ? PAYMENT_STATUS.FULLY_PAID : PAYMENT_STATUS.PARTIAL_PAID,
        gatewayPaymentId: `pay_gateway_${Date.now()}_${paymentCount}`,
        gatewayOrderId: `order_gateway_${Date.now()}_${paymentCount}`,
        paidAt: new Date(order.createdAt.getTime() + 30 * 60 * 1000), // 30 minutes after order
      });
      
      await payment.save();
      createdPayments.push(payment);
      paymentCount++;
    }
    
    // Create remaining payment if order is delivered and fully paid
    if (order.paymentStatus === PAYMENT_STATUS.FULLY_PAID && 
        order.paymentPreference === 'partial' && 
        order.status === ORDER_STATUS.DELIVERED &&
        order.remainingAmount > 0) {
      
      // Generate payment ID manually for remaining payment
      const sequence = String(existingPaymentsCount + paymentCount + 1).padStart(4, '0');
      const paymentId = `PAY-${paymentDateStr}-${sequence}`;
      
      const remainingPayment = new Payment({
        paymentId, // Generate manually to avoid validation error
        orderId: order._id,
        userId: order.userId,
        paymentType: 'remaining',
        amount: order.remainingAmount,
        paymentMethod: PAYMENT_METHODS.RAZORPAY,
        status: PAYMENT_STATUS.FULLY_PAID,
        gatewayPaymentId: `pay_gateway_remaining_${Date.now()}_${paymentCount}`,
        gatewayOrderId: `order_gateway_remaining_${Date.now()}_${paymentCount}`,
        paidAt: order.deliveredAt || new Date(),
      });
      
      await remainingPayment.save();
      createdPayments.push(remainingPayment);
      paymentCount++;
    }
  }
  
  console.log(`✅ Created ${paymentCount} payments\n`);
};

/**
 * Seed Commissions (historical commission records)
 */
const seedCommissions = async () => {
  console.log('\n💰 Creating Commissions...\n');
  
  // Get delivered and fully paid orders with seller
  const orders = await Order.find({
    status: ORDER_STATUS.DELIVERED,
    paymentStatus: PAYMENT_STATUS.FULLY_PAID,
    seller: { $exists: true, $ne: null },
  }).populate('seller').populate('userId').limit(10);
  
  if (orders.length === 0) {
    console.log('⚠️  No eligible orders for commission. Skipping commissions...\n');
    return;
  }
  
  let commissionCount = 0;
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();
  
  for (const order of orders) {
    if (!order.seller || !order.sellerId || !order.userId) continue;
    
    // Calculate user's cumulative purchases for this month (simulate)
    const existingCommissions = await Commission.find({
      userId: order.userId,
      month: currentMonth,
      year: currentYear,
    });
    
    const cumulativePurchase = existingCommissions.reduce((sum, comm) => sum + comm.orderAmount, 0);
    const newCumulativePurchase = cumulativePurchase + order.totalAmount;
    
    // Determine commission rate (2% up to ₹50,000, 3% above)
    const threshold = 50000;
    let commissionRate;
    let commissionAmount;
    
    if (newCumulativePurchase <= threshold) {
      // Entire order at 2%
      commissionRate = 2;
      commissionAmount = Math.round(order.totalAmount * 0.02);
    } else if (cumulativePurchase < threshold) {
      // Part at 2%, part at 3%
      const amountAt2Percent = threshold - cumulativePurchase;
      const amountAt3Percent = order.totalAmount - amountAt2Percent;
      commissionAmount = Math.round((amountAt2Percent * 0.02) + (amountAt3Percent * 0.03));
      commissionRate = (commissionAmount / order.totalAmount) * 100;
    } else {
      // Entire order at 3%
      commissionRate = 3;
      commissionAmount = Math.round(order.totalAmount * 0.03);
    }
    
    // Create commission
    const commission = new Commission({
      sellerId: order.seller._id,
      sellerIdCode: order.sellerId,
      userId: order.userId,
      orderId: order._id,
      month: currentMonth,
      year: currentYear,
      orderAmount: order.totalAmount,
      cumulativePurchaseAmount: cumulativePurchase,
      newCumulativePurchaseAmount: newCumulativePurchase,
      commissionRate,
      commissionAmount,
      status: 'credited',
      creditedAt: order.deliveredAt || order.createdAt,
    });
    
    await commission.save();
    
    // Update seller wallet
    const seller = await Seller.findById(order.seller._id);
    if (seller) {
      seller.wallet.balance += commissionAmount;
      await seller.save();
    }
    
    createdCommissions.push(commission);
    commissionCount++;
    
    console.log(`✅ Commission created: ${order.sellerId} - Order: ${order.orderNumber} - Amount: ₹${commissionAmount} (${commissionRate}%)`);
  }
  
  console.log(`\n✅ Created ${commissionCount} commissions\n`);
};

/**
 * Seed CreditPurchases (vendor credit requests)
 */
const seedCreditPurchases = async () => {
  console.log('\n💳 Creating Credit Purchases...\n');
  
  const approvedVendors = await Vendor.find({ status: 'approved', isActive: true }).limit(7);
  const activeProducts = await Product.find({ isActive: true }).limit(15);
  const admin = await Admin.findOne();
  
  if (approvedVendors.length === 0 || activeProducts.length === 0 || !admin) {
    console.log('⚠️  Missing required data. Skipping credit purchases...\n');
    return;
  }
  
  let creditPurchaseCount = 0;
  
  // Create multiple scenarios with different statuses (at least 10 for comprehensive testing)
  const creditPurchaseScenarios = [
    {
      vendorIndex: 0,
      status: 'pending',
      numItems: 5,
      baseQuantity: 50, // Larger quantities to meet ₹50,000 minimum
    },
    {
      vendorIndex: 1,
      status: 'pending',
      numItems: 4,
      baseQuantity: 60,
    },
    {
      vendorIndex: 2,
      status: 'approved',
      numItems: 6,
      baseQuantity: 70,
    },
    {
      vendorIndex: 3,
      status: 'approved',
      numItems: 5,
      baseQuantity: 65,
    },
    {
      vendorIndex: 4,
      status: 'rejected',
      numItems: 4,
      baseQuantity: 55,
      rejectionReason: 'Credit limit exceeded. Please clear existing dues first.',
    },
    {
      vendorIndex: 5,
      status: 'rejected',
      numItems: 5,
      baseQuantity: 60,
      rejectionReason: 'Insufficient stock available for requested quantities.',
    },
    {
      vendorIndex: 0, // Same vendor, different request
      status: 'approved',
      numItems: 3,
      baseQuantity: 80,
    },
    {
      vendorIndex: 1, // Same vendor, different request
      status: 'pending',
      numItems: 6,
      baseQuantity: 45,
    },
    {
      vendorIndex: 2, // Same vendor, different request
      status: 'approved',
      numItems: 4,
      baseQuantity: 75,
    },
    {
      vendorIndex: 3, // Same vendor, different request
      status: 'rejected',
      numItems: 5,
      baseQuantity: 58,
      rejectionReason: 'Pending documentation verification. Please submit required documents.',
    },
    {
      vendorIndex: 6,
      status: 'pending',
      numItems: 4,
      baseQuantity: 65,
    },
    {
      vendorIndex: 4, // Same vendor, different request
      status: 'approved',
      numItems: 6,
      baseQuantity: 62,
    },
  ];
  
  for (const scenario of creditPurchaseScenarios) {
    if (scenario.vendorIndex >= approvedVendors.length) continue;
    
    const vendor = approvedVendors[scenario.vendorIndex];
    const status = scenario.status;
    
    // Select random products
    const shuffledProducts = [...activeProducts].sort(() => 0.5 - Math.random());
    const selectedProducts = shuffledProducts.slice(0, scenario.numItems);
    
    // Build items array matching the schema (no productName field)
    const items = selectedProducts.map(product => {
      // Ensure quantity is large enough to meet minimum
      const quantity = scenario.baseQuantity + Math.floor(Math.random() * 20); // Add variation
      const unitPrice = product.priceToVendor;
      const totalPrice = quantity * unitPrice;
      
      return {
        productId: product._id,
        quantity,
        unitPrice,
        totalPrice,
      };
    });
    
    const totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);
    
    // Only create if amount >= ₹50,000 (minimum requirement)
    if (totalAmount >= 50000) {
      const creditPurchaseData = {
        vendorId: vendor._id,
        items,
        totalAmount,
        status,
      };
      
      // Add reviewedBy and reviewedAt if not pending
      if (status !== 'pending') {
        creditPurchaseData.reviewedBy = admin._id;
        creditPurchaseData.reviewedAt = new Date(Date.now() - (creditPurchaseCount + 1) * 24 * 60 * 60 * 1000);
      }
      
      // Add rejection reason if rejected
      if (status === 'rejected' && scenario.rejectionReason) {
        creditPurchaseData.rejectionReason = scenario.rejectionReason;
      }
      
      // Add notes
      if (status === 'approved') {
        creditPurchaseData.notes = `Approved for vendor ${vendor.name}. Inventory will be updated upon processing.`;
      } else if (status === 'rejected') {
        creditPurchaseData.notes = 'Request reviewed and rejected by admin.';
      }
      
      const creditPurchase = new CreditPurchase(creditPurchaseData);
      
      await creditPurchase.save();
      creditPurchaseCount++;
      
      console.log(`✅ Credit Purchase created: Vendor ${vendor.name} - Amount: ₹${totalAmount.toLocaleString()} - Status: ${status} - Items: ${items.length}`);
    } else {
      console.log(`⚠️  Skipped credit purchase (amount ₹${totalAmount.toLocaleString()} below minimum ₹50,000)`);
    }
  }
  
  console.log(`\n✅ Created ${creditPurchaseCount} credit purchases\n`);
};

/**
 * Seed WithdrawalRequests (seller withdrawal requests)
 */
const seedWithdrawalRequests = async () => {
  console.log('\n💸 Creating Withdrawal Requests...\n');
  
  const approvedSellers = await Seller.find({ 
    status: 'approved', 
    isActive: true,
    'wallet.balance': { $gt: 0 },
  }).limit(5);
  
  const admin = await Admin.findOne();
  
  if (approvedSellers.length === 0 || !admin) {
    console.log('⚠️  Missing required data. Skipping withdrawal requests...\n');
    return;
  }
  
  let withdrawalCount = 0;
  
  const statuses = ['pending', 'approved', 'rejected'];
  
  for (let i = 0; i < approvedSellers.length; i++) {
    const seller = approvedSellers[i];
    const status = statuses[i % statuses.length];
    
    const amount = Math.min(seller.wallet.balance, Math.floor(Math.random() * 5000) + 1000); // 1000-6000
    
    const withdrawalRequest = new WithdrawalRequest({
      sellerId: seller._id,
      amount,
      paymentDetails: {
        bankName: `Bank ${i + 1}`,
        accountNumber: `123456789${i}`,
        ifscCode: `BANK${i}000123`,
        accountHolderName: seller.name,
      },
      status,
      requestedAt: new Date(Date.now() - (i + 1) * 24 * 60 * 60 * 1000),
      ...(status === 'approved' ? {
        approvedBy: admin._id,
        approvedAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
      } : {}),
      ...(status === 'rejected' ? {
        rejectedBy: admin._id,
        rejectedAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
        rejectionReason: 'Bank details verification pending',
      } : {}),
    });
    
    await withdrawalRequest.save();
    withdrawalCount++;
    
    console.log(`✅ Withdrawal Request created: ${seller.sellerId} - Amount: ₹${amount} - Status: ${status}`);
  }
  
  console.log(`\n✅ Created ${withdrawalCount} withdrawal requests\n`);
};

/**
 * Main seeding function
 */
const seedAll = async () => {
  try {
    console.log('\n' + '='.repeat(70));
    console.log('🚀 SEEDING ORDERS, PAYMENTS & RELATED DATA');
    console.log('='.repeat(70));
    console.log('\nThis script creates orders, payments, commissions, credit purchases, and withdrawal requests.\n');
    console.log('⚠️  NOTE: Run seedTestData.js first to create Products, Vendors, Sellers, Users\n');
    
    // Connect to database
    await connectDB();
    console.log('✅ Connected to database\n');
    
    // Seed in order
    await seedOrders();
    await seedPayments();
    await seedCommissions();
    await seedCreditPurchases();
    await seedWithdrawalRequests();
    
    console.log('='.repeat(70));
    console.log('✅ ORDERS & PAYMENTS SEEDING COMPLETE');
    console.log('='.repeat(70));
    console.log('\n📊 SUMMARY:');
    console.log(`   Orders: ${createdOrders.length}`);
    console.log(`   Payments: ${createdPayments.length}`);
    console.log(`   Commissions: ${createdCommissions.length}`);
    console.log('='.repeat(70) + '\n');
    
    // Don't close connection if called from master script
    if (require.main === module) {
      await mongoose.connection.close();
      console.log('✅ Database connection closed\n');
      process.exit(0);
    }
  } catch (error) {
    console.error('\n❌ Error seeding data:', error);
    console.error(error.stack);
    await mongoose.connection.close();
    process.exit(1);
  }
};

// Run seeding
if (require.main === module) {
  seedAll();
}

module.exports = { seedAll };

