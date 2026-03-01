/**
 * Ensure Seller Dashboard Data Script
 * 
 * This script checks MongoDB collections and ensures all necessary data
 * exists for the Seller Dashboard to work without errors.
 * 
 * It will:
 * 1. Check for Approved Sellers (create if missing or insufficient)
 * 2. Check for Users with sellerId matching (create if missing - 10+ per seller)
 * 3. Check for Orders with sellerId matching (create if missing - 15+ per seller)
 *    - 10+ in current month with status='delivered', paymentStatus='fully_paid'
 *    - 5+ in past months (last 12 months)
 * 4. Check for Commissions (create if missing - 10+ per seller)
 * 5. Check for WithdrawalRequests (create if missing - 3+ per seller)
 * 
 * Usage: node scripts/ensureSellerData.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB } = require('../config/database');

// Import all models
const Seller = require('../models/Seller');
const User = require('../models/User');
const Order = require('../models/Order');
const Commission = require('../models/Commission');
const WithdrawalRequest = require('../models/WithdrawalRequest');
const Product = require('../models/Product');
const Vendor = require('../models/Vendor');
const Payment = require('../models/Payment');

// Import constants
const { ORDER_STATUS, PAYMENT_STATUS, IRA_PARTNER_COMMISSION_THRESHOLD, IRA_PARTNER_COMMISSION_RATE_LOW, IRA_PARTNER_COMMISSION_RATE_HIGH } = require('../utils/constants');

let createdData = {
  sellers: [],
  users: [],
  orders: [],
  commissions: [],
  withdrawalRequests: [],
};

/**
 * Ensure Approved Sellers exist
 */
const ensureSellers = async () => {
  console.log('\n👤 Checking Approved Sellers...\n');
  
  const approvedCount = await Seller.countDocuments({ status: 'approved', isActive: true });
  const targetCount = 5;
  
  if (approvedCount >= targetCount) {
    console.log(`✅ Approved sellers: ${approvedCount}`);
    const sellers = await Seller.find({ status: 'approved', isActive: true }).limit(targetCount);
    createdData.sellers = sellers.map(s => s._id);
    return;
  }
  
  console.log(`⚠️  Only ${approvedCount} approved sellers. Creating more...`);
  
  const sellersData = [
    {
      sellerId: 'IRA-1001',
      name: 'Rajesh Kumar',
      phone: '+919111111111',
      email: 'rajesh@irasathi.com',
      area: 'North Delhi',
      location: {
        address: '123, Village Street, North Delhi',
        city: 'Delhi',
        state: 'Delhi',
        pincode: '110001',
      },
      monthlyTarget: 100000,
      status: 'approved',
      isActive: true,
      approvedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      wallet: { balance: 5000, pending: 0 },
    },
    {
      sellerId: 'IRA-1002',
      name: 'Priya Sharma',
      phone: '+919222222222',
      email: 'priya@irasathi.com',
      area: 'South Mumbai',
      location: {
        address: '456, Urban Area, South Mumbai',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400053',
      },
      monthlyTarget: 150000,
      status: 'approved',
      isActive: true,
      approvedAt: new Date(Date.now() - 55 * 24 * 60 * 60 * 1000),
      wallet: { balance: 12000, pending: 2000 },
    },
    {
      sellerId: 'IRA-1003',
      name: 'Amit Patel',
      phone: '+919333333333',
      email: 'amit@irasathi.com',
      area: 'West Bangalore',
      location: {
        address: '789, Rural District, West Bangalore',
        city: 'Bangalore',
        state: 'Karnataka',
        pincode: '560066',
      },
      monthlyTarget: 200000,
      status: 'approved',
      isActive: true,
      approvedAt: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000),
      wallet: { balance: 18000, pending: 3500 },
    },
    {
      sellerId: 'IRA-1004',
      name: 'Sneha Reddy',
      phone: '+919444444444',
      email: 'sneha@irasathi.com',
      area: 'East Hyderabad',
      location: {
        address: '321, Industrial Zone, East Hyderabad',
        city: 'Hyderabad',
        state: 'Telangana',
        pincode: '500032',
      },
      monthlyTarget: 80000,
      status: 'approved',
      isActive: true,
      approvedAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
      wallet: { balance: 7500, pending: 1000 },
    },
    {
      sellerId: 'IRA-1005',
      name: 'Vikram Singh',
      phone: '+919555555555',
      email: 'vikram@irasathi.com',
      area: 'Central Pune',
      location: {
        address: '654, Agri Zone, Central Pune',
        city: 'Pune',
        state: 'Maharashtra',
        pincode: '411001',
      },
      monthlyTarget: 120000,
      status: 'approved',
      isActive: true,
      approvedAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
      wallet: { balance: 10000, pending: 1500 },
    },
  ];
  
  for (let i = approvedCount; i < targetCount; i++) {
    const sellerData = sellersData[i % sellersData.length];
    const existing = await Seller.findOne({ sellerId: sellerData.sellerId });
    
    if (!existing) {
      const seller = await Seller.create(sellerData);
      createdData.sellers.push(seller._id);
      console.log(`✅ Approved seller created: ${seller.name} - ${seller.sellerId}`);
    } else {
      createdData.sellers.push(existing._id);
      console.log(`✅ Seller already exists: ${existing.name} - ${existing.sellerId}`);
    }
  }
  
  // Get all approved sellers
  const sellers = await Seller.find({ status: 'approved', isActive: true }).limit(targetCount);
  createdData.sellers = sellers.map(s => s._id);
  
  console.log(`\n✅ Total Approved Sellers: ${sellers.length}\n`);
};

/**
 * Ensure Users with sellerId matching exist (10+ per seller)
 */
const ensureUsersForSellers = async () => {
  console.log('\n👥 Checking Users for Sellers...\n');
  
  const sellers = await Seller.find({ status: 'approved', isActive: true }).limit(5);
  
  if (sellers.length === 0) {
    console.log('⚠️  No approved sellers found. Cannot create users.');
    return;
  }
  
  for (const seller of sellers) {
    const usersCount = await User.countDocuments({ sellerId: seller.sellerId });
    const targetCount = 10;
    
    if (usersCount >= targetCount) {
      console.log(`✅ Users for seller ${seller.sellerId}: ${usersCount}`);
      continue;
    }
    
    console.log(`⚠️  Only ${usersCount} users for seller ${seller.sellerId}. Creating more...`);
    
    for (let i = usersCount; i < targetCount; i++) {
      const userData = {
        name: `User ${seller.sellerId} ${i + 1}`,
        phone: `+9198${String(i).padStart(8, '0')}${seller.sellerId.slice(-1)}`,
        email: `user${seller.sellerId}-${i + 1}@irasathi.com`,
        location: {
          address: `User ${i + 1} Address`,
          city: seller.location?.city || 'Test City',
          state: seller.location?.state || 'Test State',
          pincode: seller.location?.pincode || '100000',
          coordinates: {
            lat: 28.6139 + (i * 0.01),
            lng: 77.2090 + (i * 0.01),
          },
        },
        sellerId: seller.sellerId, // String match, NOT ObjectId
        seller: seller._id, // ObjectId reference
        isActive: true,
        isBlocked: false,
      };
      
      const existing = await User.findOne({ phone: userData.phone });
      if (!existing) {
        const user = await User.create(userData);
        createdData.users.push(user._id);
        console.log(`✅ User created: ${user.name} - Seller: ${seller.sellerId}`);
      }
    }
  }
  
  const totalUsers = await User.countDocuments();
  console.log(`\n✅ Total Users: ${totalUsers}\n`);
};

/**
 * Ensure Orders with sellerId matching exist (15+ per seller)
 * - 10+ in current month with status='delivered', paymentStatus='fully_paid'
 * - 5+ in past months (last 12 months)
 */
const ensureOrdersForSellers = async () => {
  console.log('\n📦 Checking Orders for Sellers...\n');
  
  const sellers = await Seller.find({ status: 'approved', isActive: true }).limit(5);
  const products = await Product.find({ isActive: true }).limit(10);
  const vendors = await Vendor.find({ status: 'approved', isActive: true }).limit(5);
  
  if (sellers.length === 0 || products.length === 0) {
    console.log('⚠️  No sellers or products found. Cannot create orders.');
    return;
  }
  
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  
  for (const seller of sellers) {
    // Check current month orders
    const currentMonthOrdersCount = await Order.countDocuments({
      sellerId: seller.sellerId,
      status: 'delivered',
      paymentStatus: 'fully_paid',
      createdAt: { $gte: currentMonthStart },
    });
    
    const targetCurrentMonth = 10;
    const targetPastMonths = 5;
    
    // Get users for this seller
    const users = await User.find({ sellerId: seller.sellerId }).limit(10);
    
    if (users.length === 0) {
      console.log(`⚠️  No users found for seller ${seller.sellerId}. Skipping orders.`);
      continue;
    }
    
    // Create current month orders
    if (currentMonthOrdersCount < targetCurrentMonth) {
      console.log(`⚠️  Only ${currentMonthOrdersCount} current month orders for seller ${seller.sellerId}. Creating more...`);
      
      for (let i = currentMonthOrdersCount; i < targetCurrentMonth; i++) {
        const user = users[i % users.length];
        const product = products[i % products.length];
        const vendor = vendors[i % vendors.length];
        
        const orderNumber = `ORD-${Date.now()}-${i}-${seller.sellerId}`;
        const totalAmount = 2500 + (i * 500); // Above minimum order value
        
        const order = await Order.create({
          orderNumber,
          userId: user._id,
          sellerId: seller.sellerId,
          seller: seller._id,
          vendorId: vendor?._id || null,
          assignedTo: vendor ? 'vendor' : 'admin',
          items: [{
            productId: product._id,
            productName: product.name,
            quantity: 2 + i,
            unitPrice: product.priceToUser,
            totalPrice: product.priceToUser * (2 + i),
            status: 'accepted',
          }],
          subtotal: totalAmount - 50,
          deliveryCharge: 0,
          deliveryChargeWaived: true,
          totalAmount,
          paymentPreference: 'full',
          upfrontAmount: totalAmount,
          remainingAmount: 0,
          paymentStatus: 'fully_paid',
          deliveryAddress: {
            ...user.location,
            name: user.name,
            phone: user.phone,
          },
          status: 'delivered',
          deliveredAt: new Date(Date.now() - (10 - i) * 24 * 60 * 60 * 1000),
          expectedDeliveryDate: new Date(Date.now() - (10 - i) * 24 * 60 * 60 * 1000),
          statusTimeline: [
            { status: 'pending', timestamp: new Date(Date.now() - (10 - i + 2) * 24 * 60 * 60 * 1000), updatedBy: 'system' },
            { status: 'processing', timestamp: new Date(Date.now() - (10 - i + 1) * 24 * 60 * 60 * 1000), updatedBy: 'vendor' },
            { status: 'delivered', timestamp: new Date(Date.now() - (10 - i) * 24 * 60 * 60 * 1000), updatedBy: 'vendor' },
          ],
        });
        
        createdData.orders.push(order._id);
        console.log(`✅ Current month order created: ${order.orderNumber} - Seller: ${seller.sellerId}`);
      }
    } else {
      console.log(`✅ Current month orders for seller ${seller.sellerId}: ${currentMonthOrdersCount}`);
    }
    
    // Create past months orders (last 12 months)
    for (let monthOffset = 1; monthOffset <= 12; monthOffset++) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);
      const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
      const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59, 999);
      
      const monthOrdersCount = await Order.countDocuments({
        sellerId: seller.sellerId,
        status: 'delivered',
        paymentStatus: 'fully_paid',
        createdAt: { $gte: monthStart, $lte: monthEnd },
      });
      
      const targetPerMonth = monthOffset <= 5 ? 1 : 0; // Create 1 order for first 5 past months
      
      if (monthOrdersCount < targetPerMonth) {
        const user = users[0];
        const product = products[0];
        const vendor = vendors[0];
        
        const orderNumber = `ORD-${Date.now()}-PM${monthOffset}-${seller.sellerId}`;
        const totalAmount = 3000;
        
        const order = await Order.create({
          orderNumber,
          userId: user._id,
          sellerId: seller.sellerId,
          seller: seller._id,
          vendorId: vendor?._id || null,
          assignedTo: vendor ? 'vendor' : 'admin',
          items: [{
            productId: product._id,
            productName: product.name,
            quantity: 3,
            unitPrice: product.priceToUser,
            totalPrice: product.priceToUser * 3,
            status: 'accepted',
          }],
          subtotal: totalAmount,
          deliveryCharge: 0,
          deliveryChargeWaived: true,
          totalAmount,
          paymentPreference: 'full',
          upfrontAmount: totalAmount,
          remainingAmount: 0,
          paymentStatus: 'fully_paid',
          deliveryAddress: {
            ...user.location,
            name: user.name,
            phone: user.phone,
          },
          status: 'delivered',
          deliveredAt: new Date(monthStart.getTime() + 15 * 24 * 60 * 60 * 1000), // Mid-month delivery
          expectedDeliveryDate: new Date(monthStart.getTime() + 15 * 24 * 60 * 60 * 1000),
          createdAt: new Date(monthStart.getTime() + 10 * 24 * 60 * 60 * 1000), // Early month order
          statusTimeline: [
            { status: 'pending', timestamp: new Date(monthStart.getTime() + 10 * 24 * 60 * 60 * 1000), updatedBy: 'system' },
            { status: 'processing', timestamp: new Date(monthStart.getTime() + 12 * 24 * 60 * 60 * 1000), updatedBy: 'vendor' },
            { status: 'delivered', timestamp: new Date(monthStart.getTime() + 15 * 24 * 60 * 60 * 1000), updatedBy: 'vendor' },
          ],
        });
        
        createdData.orders.push(order._id);
        console.log(`✅ Past month order created: ${order.orderNumber} - Month: ${monthDate.toLocaleString('default', { month: 'long', year: 'numeric' })}`);
      }
    }
  }
  
  const totalOrders = await Order.countDocuments();
  console.log(`\n✅ Total Orders: ${totalOrders}\n`);
};

/**
 * Ensure Commissions exist (10+ per seller)
 * Commissions are created for delivered/fully_paid orders
 */
const ensureCommissionsForSellers = async () => {
  console.log('\n💰 Checking Commissions for Sellers...\n');
  
  const sellers = await Seller.find({ status: 'approved', isActive: true }).limit(5);
  
  if (sellers.length === 0) {
    console.log('⚠️  No sellers found. Cannot create commissions.');
    return;
  }
  
  for (const seller of sellers) {
    const commissionsCount = await Commission.countDocuments({ sellerId: seller._id });
    const targetCount = 10;
    
    if (commissionsCount >= targetCount) {
      console.log(`✅ Commissions for seller ${seller.sellerId}: ${commissionsCount}`);
      continue;
    }
    
    console.log(`⚠️  Only ${commissionsCount} commissions for seller ${seller.sellerId}. Creating more...`);
    
    // Get orders for this seller (delivered and fully_paid)
    const orders = await Order.find({
      sellerId: seller.sellerId,
      status: 'delivered',
      paymentStatus: 'fully_paid',
    })
      .populate('userId')
      .limit(20)
      .sort({ createdAt: -1 });
    
    if (orders.length === 0) {
      console.log(`⚠️  No delivered/fully_paid orders found for seller ${seller.sellerId}. Skipping commissions.`);
      continue;
    }
    
    // Track cumulative purchases per user per month for commission calculation
    const userMonthlyPurchases = {};
    let commissionsCreatedForThisSeller = 0;
    const targetCommissionsToCreate = targetCount - commissionsCount;
    
    for (const order of orders) {
      if (commissionsCreatedForThisSeller >= targetCommissionsToCreate) break;
      
      // Check if commission already exists for this order
      const existingCommission = await Commission.findOne({ orderId: order._id });
      if (existingCommission) continue;
      
      const orderDate = new Date(order.createdAt || order.deliveredAt);
      const month = orderDate.getMonth() + 1;
      const year = orderDate.getFullYear();
      const userId = order.userId._id || order.userId;
      const userKey = `${userId}-${year}-${month}`;
      
      // Get cumulative purchases for this user this month before this order
      if (!userMonthlyPurchases[userKey]) {
        const previousOrders = await Order.find({
          sellerId: seller.sellerId,
          userId: userId,
          status: 'delivered',
          paymentStatus: 'fully_paid',
          createdAt: {
            $gte: new Date(year, month - 1, 1),
            $lt: orderDate,
          },
        });
        
        userMonthlyPurchases[userKey] = previousOrders.reduce((sum, o) => sum + o.totalAmount, 0);
      }
      
      const cumulativeBefore = userMonthlyPurchases[userKey];
      const cumulativeAfter = cumulativeBefore + order.totalAmount;
      
      // Determine commission rate (2% up to ₹50,000, 3% above)
      let commissionRate = IRA_PARTNER_COMMISSION_RATE_LOW; // 2%
      if (cumulativeAfter > IRA_PARTNER_COMMISSION_THRESHOLD) {
        // Mixed rate: some at 2%, some at 3%
        if (cumulativeBefore <= IRA_PARTNER_COMMISSION_THRESHOLD) {
          // This order crosses threshold
          const belowThreshold = IRA_PARTNER_COMMISSION_THRESHOLD - cumulativeBefore;
          const aboveThreshold = order.totalAmount - belowThreshold;
          const commission = (belowThreshold * IRA_PARTNER_COMMISSION_RATE_LOW / 100) +
                            (aboveThreshold * IRA_PARTNER_COMMISSION_RATE_HIGH / 100);
          // Use weighted average rate for simplicity
          commissionRate = (commission / order.totalAmount) * 100;
        } else {
          // All at 3%
          commissionRate = IRA_PARTNER_COMMISSION_RATE_HIGH; // 3%
        }
      }
      
      // Calculate commission amount correctly based on threshold
      let commissionAmount = 0;
      if (cumulativeAfter > IRA_PARTNER_COMMISSION_THRESHOLD) {
        if (cumulativeBefore <= IRA_PARTNER_COMMISSION_THRESHOLD) {
          // Mixed rate: some at 2%, some at 3%
          const belowThreshold = IRA_PARTNER_COMMISSION_THRESHOLD - cumulativeBefore;
          const aboveThreshold = order.totalAmount - belowThreshold;
          commissionAmount = (belowThreshold * IRA_PARTNER_COMMISSION_RATE_LOW / 100) +
                            (aboveThreshold * IRA_PARTNER_COMMISSION_RATE_HIGH / 100);
        } else {
          // All at 3%
          commissionAmount = (order.totalAmount * IRA_PARTNER_COMMISSION_RATE_HIGH) / 100;
        }
      } else {
        // All at 2%
        commissionAmount = (order.totalAmount * IRA_PARTNER_COMMISSION_RATE_LOW) / 100;
      }
      
      const commission = await Commission.create({
        sellerId: seller._id,
        sellerIdCode: seller.sellerId,
        userId: userId,
        orderId: order._id,
        month,
        year,
        orderAmount: order.totalAmount,
        cumulativePurchaseAmount: cumulativeBefore,
        newCumulativePurchaseAmount: cumulativeAfter,
        commissionRate,
        commissionAmount: Math.round(commissionAmount * 100) / 100,
        status: 'credited',
        creditedAt: order.deliveredAt || order.createdAt,
        notes: `Commission for order ${order.orderNumber}`,
      });
      
      userMonthlyPurchases[userKey] = cumulativeAfter;
      createdData.commissions.push(commission._id);
      commissionsCreatedForThisSeller++;
      console.log(`✅ Commission created: ₹${commission.commissionAmount} for order ${order.orderNumber} - Seller: ${seller.sellerId}`);
    }
    
    // Update seller wallet balance based on commissions
    const sellerTotalCommissions = await Commission.countDocuments({ sellerId: seller._id });
    if (sellerTotalCommissions > 0) {
      const totalCommissionAmount = await Commission.aggregate([
        { $match: { sellerId: seller._id } },
        { $group: { _id: null, total: { $sum: '$commissionAmount' } } }
      ]);
      
      if (totalCommissionAmount.length > 0) {
        const currentSeller = await Seller.findById(seller._id);
        if (currentSeller && currentSeller.wallet.balance < totalCommissionAmount[0].total) {
          currentSeller.wallet.balance = totalCommissionAmount[0].total;
          await currentSeller.save();
          console.log(`✅ Updated wallet balance for ${currentSeller.sellerId}: ₹${currentSeller.wallet.balance}`);
        }
      }
    }
  }
  
  const totalCommissionsAll = await Commission.countDocuments();
  console.log(`\n✅ Total Commissions: ${totalCommissionsAll}\n`);
};

/**
 * Ensure WithdrawalRequests exist (3+ per seller)
 * - 2+ pending
 * - 1+ approved/rejected
 */
const ensureWithdrawalRequestsForSellers = async () => {
  console.log('\n💳 Checking Withdrawal Requests for Sellers...\n');
  
  const sellers = await Seller.find({ status: 'approved', isActive: true }).limit(5);
  const admin = await require('../models/Admin').findOne();
  
  if (sellers.length === 0) {
    console.log('⚠️  No sellers found. Cannot create withdrawal requests.');
    return;
  }
  
  for (const seller of sellers) {
    const pendingCount = await WithdrawalRequest.countDocuments({
      sellerId: seller._id,
      status: 'pending',
    });
    const approvedCount = await WithdrawalRequest.countDocuments({
      sellerId: seller._id,
      status: 'approved',
    });
    const rejectedCount = await WithdrawalRequest.countDocuments({
      sellerId: seller._id,
      status: 'rejected',
    });
    
    const targetPending = 2;
    const targetApproved = 1;
    const targetRejected = 1;
    
    // Create pending withdrawal requests
    if (pendingCount < targetPending) {
      console.log(`⚠️  Only ${pendingCount} pending withdrawal requests for seller ${seller.sellerId}. Creating more...`);
      
      for (let i = pendingCount; i < targetPending; i++) {
        const withdrawal = await WithdrawalRequest.create({
          sellerId: seller._id,
          amount: 3000 + (i * 1000),
          status: 'pending',
          bankDetails: {
            accountNumber: `ACC${seller.sellerId.slice(-3)}${i}`,
            ifscCode: 'BANK0001234',
            accountHolderName: seller.name,
            bankName: 'Test Bank',
          },
          reason: `Withdrawal request ${i + 1}`,
        });
        
        createdData.withdrawalRequests.push(withdrawal._id);
        console.log(`✅ Pending withdrawal request created: ₹${withdrawal.amount} for ${seller.name}`);
      }
    } else {
      console.log(`✅ Pending withdrawal requests for seller ${seller.sellerId}: ${pendingCount}`);
    }
    
    // Create approved withdrawal requests
    if (approvedCount < targetApproved) {
      console.log(`⚠️  Only ${approvedCount} approved withdrawal requests for seller ${seller.sellerId}. Creating one...`);
      
      const withdrawal = await WithdrawalRequest.create({
        sellerId: seller._id,
        amount: 5000,
        status: 'approved',
        reviewedBy: admin?._id,
        reviewedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        bankDetails: {
          accountNumber: `ACC${seller.sellerId.slice(-3)}A`,
          ifscCode: 'BANK0001234',
          accountHolderName: seller.name,
          bankName: 'Test Bank',
        },
        reason: 'Approved withdrawal request',
      });
      
      createdData.withdrawalRequests.push(withdrawal._id);
      console.log(`✅ Approved withdrawal request created: ₹${withdrawal.amount} for ${seller.name}`);
    }
    
    // Create rejected withdrawal requests
    if (rejectedCount < targetRejected) {
      console.log(`⚠️  Only ${rejectedCount} rejected withdrawal requests for seller ${seller.sellerId}. Creating one...`);
      
      const withdrawal = await WithdrawalRequest.create({
        sellerId: seller._id,
        amount: 2000,
        status: 'rejected',
        reviewedBy: admin?._id,
        reviewedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        rejectionReason: 'Insufficient balance at time of request',
        bankDetails: {
          accountNumber: `ACC${seller.sellerId.slice(-3)}R`,
          ifscCode: 'BANK0001234',
          accountHolderName: seller.name,
          bankName: 'Test Bank',
        },
        reason: 'Rejected withdrawal request',
      });
      
      createdData.withdrawalRequests.push(withdrawal._id);
      console.log(`✅ Rejected withdrawal request created: ₹${withdrawal.amount} for ${seller.name}`);
    }
  }
  
  const totalWithdrawals = await WithdrawalRequest.countDocuments();
  console.log(`\n✅ Total Withdrawal Requests: ${totalWithdrawals}\n`);
};

/**
 * Main function
 */
const ensureSellerData = async () => {
  try {
    console.log('\n' + '='.repeat(70));
    console.log('🔍 SELLER DASHBOARD DATA VERIFICATION & SEEDING');
    console.log('='.repeat(70));
    console.log('\nThis script will check and ensure all necessary data exists\n');
    
    // Connect to database
    await connectDB();
    console.log('✅ Connected to database\n');
    
    // Ensure all data exists
    await ensureSellers();
    await ensureUsersForSellers();
    await ensureOrdersForSellers();
    await ensureCommissionsForSellers();
    await ensureWithdrawalRequestsForSellers();
    
    // Final summary
    console.log('\n' + '='.repeat(70));
    console.log('📊 FINAL DATA SUMMARY');
    console.log('='.repeat(70));
    
    const sellers = await Seller.find({ status: 'approved', isActive: true });
    console.log(`   Sellers: ${sellers.length} approved and active`);
    
    for (const seller of sellers) {
      const usersCount = await User.countDocuments({ sellerId: seller.sellerId });
      const now = new Date();
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const currentMonthOrders = await Order.countDocuments({
        sellerId: seller.sellerId,
        status: 'delivered',
        paymentStatus: 'fully_paid',
        createdAt: { $gte: currentMonthStart },
      });
      const totalOrders = await Order.countDocuments({ sellerId: seller.sellerId });
      const commissionsCount = await Commission.countDocuments({ sellerId: seller._id });
      const withdrawalsCount = await WithdrawalRequest.countDocuments({ sellerId: seller._id });
      
      console.log(`   ${seller.sellerId} (${seller.name}):`);
      console.log(`      Users: ${usersCount} | Current Month Orders: ${currentMonthOrders} | Total Orders: ${totalOrders}`);
      console.log(`      Commissions: ${commissionsCount} | Withdrawals: ${withdrawalsCount}`);
    }
    
    console.log('='.repeat(70));
    
    console.log('\n✅ All Seller Dashboard data verified and ensured!\n');
    
    // Close connection
    await mongoose.connection.close();
    console.log('✅ Database connection closed\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error in ensureSellerData script:', error);
    console.error(error.stack);
    await mongoose.connection.close();
    process.exit(1);
  }
};

// Run script
if (require.main === module) {
  ensureSellerData();
}

module.exports = { ensureSellerData };

