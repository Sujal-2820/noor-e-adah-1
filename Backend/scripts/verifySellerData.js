/**
 * Verify Seller Dashboard Data Script
 * 
 * This script verifies that all necessary data exists for Seller Dashboard
 * endpoints to work without errors. It checks:
 * 1. All referenced IDs exist (populated relationships)
 * 2. All required data for dashboard stats
 * 3. Data for filtering and pagination
 * 
 * Usage: node scripts/verifySellerData.js
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

let errors = [];
let warnings = [];

/**
 * Check for broken references
 */
const checkBrokenReferences = async () => {
  console.log('\n🔍 Checking for Broken References...\n');
  
  const sellers = await Seller.find({ status: 'approved', isActive: true }).limit(5);
  
  for (const seller of sellers) {
    // Check users with sellerId matching
    const users = await User.find({ sellerId: seller.sellerId });
    for (const user of users) {
      // Verify seller reference is valid
      if (user.seller && user.seller.toString() !== seller._id.toString()) {
        warnings.push(`User ${user._id} has seller reference mismatch: ${user.seller} vs ${seller._id}`);
      }
    }
    
    // Check orders with sellerId matching
    const orders = await Order.find({ sellerId: seller.sellerId });
    for (const order of orders) {
      if (order.userId) {
        const user = await User.findById(order.userId);
        if (!user) {
          errors.push(`Order ${order.orderNumber} has invalid userId: ${order.userId}`);
        } else if (user.sellerId !== seller.sellerId) {
          warnings.push(`Order ${order.orderNumber} userId ${order.userId} has sellerId ${user.sellerId} which doesn't match order sellerId ${seller.sellerId}`);
        }
      }
      
      if (order.items && order.items.length > 0) {
        for (const item of order.items) {
          if (item.productId) {
            const product = await require('../models/Product').findById(item.productId);
            if (!product) {
              errors.push(`Order ${order.orderNumber} has invalid productId in item: ${item.productId}`);
            }
          }
        }
      }
    }
    
    // Check commissions with sellerId reference
    const commissions = await Commission.find({ sellerId: seller._id });
    for (const commission of commissions) {
      if (commission.userId) {
        const user = await User.findById(commission.userId);
        if (!user) {
          errors.push(`Commission ${commission._id} has invalid userId: ${commission.userId}`);
        }
      }
      
      if (commission.orderId) {
        const order = await Order.findById(commission.orderId);
        if (!order) {
          errors.push(`Commission ${commission._id} has invalid orderId: ${commission.orderId}`);
        } else if (order.sellerId !== seller.sellerId) {
          warnings.push(`Commission ${commission._id} orderId ${commission.orderId} has sellerId ${order.sellerId} which doesn't match commission sellerId ${seller.sellerId}`);
        }
      }
    }
    
    // Check withdrawal requests with sellerId reference
    const withdrawals = await WithdrawalRequest.find({ sellerId: seller._id });
    for (const withdrawal of withdrawals) {
      if (withdrawal.reviewedBy) {
        const admin = await require('../models/Admin').findById(withdrawal.reviewedBy);
        if (!admin) {
          warnings.push(`WithdrawalRequest ${withdrawal._id} has invalid reviewedBy: ${withdrawal.reviewedBy}`);
        }
      }
    }
  }
  
  if (errors.length > 0) {
    console.log(`\n❌ Found ${errors.length} ERRORS:`);
    errors.forEach(err => console.log(`   - ${err}`));
  } else {
    console.log('\n✅ No broken references found');
  }
  
  if (warnings.length > 0) {
    console.log(`\n⚠️  Found ${warnings.length} WARNINGS:`);
    warnings.slice(0, 10).forEach(warn => console.log(`   - ${warn}`));
    if (warnings.length > 10) {
      console.log(`   ... and ${warnings.length - 10} more warnings`);
    }
  }
};

/**
 * Verify minimum data requirements
 */
const verifyMinimumData = async () => {
  console.log('\n📊 Verifying Minimum Data Requirements...\n');
  
  const sellers = await Seller.find({ status: 'approved', isActive: true }).limit(5);
  
  if (sellers.length === 0) {
    errors.push('No approved sellers found - Seller login will fail');
    console.log('❌ No approved sellers found');
    return;
  }
  
  console.log(`✅ Approved sellers: ${sellers.length}`);
  
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  
  for (const seller of sellers) {
    console.log(`\n📋 Checking data for seller: ${seller.sellerId} (${seller.name})`);
    
    // Check users
    const usersCount = await User.countDocuments({ sellerId: seller.sellerId });
    if (usersCount < 10) {
      warnings.push(`Seller ${seller.sellerId} has only ${usersCount} users (target: 10+)`);
      console.log(`   ⚠️  Users: ${usersCount} (target: 10+)`);
    } else {
      console.log(`   ✅ Users: ${usersCount}`);
    }
    
    // Check monthly target
    if (seller.monthlyTarget <= 0) {
      warnings.push(`Seller ${seller.sellerId} has monthlyTarget = ${seller.monthlyTarget} (should be > 0)`);
      console.log(`   ⚠️  Monthly Target: ${seller.monthlyTarget} (should be > 0)`);
    } else {
      console.log(`   ✅ Monthly Target: ₹${seller.monthlyTarget.toLocaleString('en-IN')}`);
    }
    
    // Check wallet balance
    if (seller.wallet.balance === 0) {
      warnings.push(`Seller ${seller.sellerId} has wallet balance = 0`);
      console.log(`   ⚠️  Wallet Balance: ₹0`);
    } else {
      console.log(`   ✅ Wallet Balance: ₹${seller.wallet.balance.toLocaleString('en-IN')}`);
    }
    
    // Check current month orders (delivered/fully_paid)
    const currentMonthOrdersCount = await Order.countDocuments({
      sellerId: seller.sellerId,
      status: 'delivered',
      paymentStatus: 'fully_paid',
      createdAt: { $gte: currentMonthStart },
    });
    
    if (currentMonthOrdersCount < 10) {
      warnings.push(`Seller ${seller.sellerId} has only ${currentMonthOrdersCount} current month delivered/fully_paid orders (target: 10+)`);
      console.log(`   ⚠️  Current Month Orders: ${currentMonthOrdersCount} (target: 10+)`);
    } else {
      console.log(`   ✅ Current Month Orders: ${currentMonthOrdersCount}`);
    }
    
    // Check total orders
    const totalOrdersCount = await Order.countDocuments({ sellerId: seller.sellerId });
    if (totalOrdersCount < 15) {
      warnings.push(`Seller ${seller.sellerId} has only ${totalOrdersCount} total orders (target: 15+)`);
      console.log(`   ⚠️  Total Orders: ${totalOrdersCount} (target: 15+)`);
    } else {
      console.log(`   ✅ Total Orders: ${totalOrdersCount}`);
    }
    
    // Check commissions
    const commissionsCount = await Commission.countDocuments({ sellerId: seller._id });
    if (commissionsCount < 10) {
      warnings.push(`Seller ${seller.sellerId} has only ${commissionsCount} commissions (target: 10+)`);
      console.log(`   ⚠️  Commissions: ${commissionsCount} (target: 10+)`);
    } else {
      console.log(`   ✅ Commissions: ${commissionsCount}`);
    }
    
    // Check withdrawal requests
    const withdrawalsCount = await WithdrawalRequest.countDocuments({ sellerId: seller._id });
    const pendingWithdrawalsCount = await WithdrawalRequest.countDocuments({
      sellerId: seller._id,
      status: 'pending',
    });
    
    if (withdrawalsCount < 3) {
      warnings.push(`Seller ${seller.sellerId} has only ${withdrawalsCount} withdrawal requests (target: 3+)`);
      console.log(`   ⚠️  Withdrawal Requests: ${withdrawalsCount} (target: 3+)`);
    } else {
      console.log(`   ✅ Withdrawal Requests: ${withdrawalsCount} (Pending: ${pendingWithdrawalsCount})`);
    }
    
    // Check past months orders (for target history)
    let pastMonthsWithOrders = 0;
    for (let i = 1; i <= 12; i++) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
      const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59, 999);
      
      const monthOrdersCount = await Order.countDocuments({
        sellerId: seller.sellerId,
        status: 'delivered',
        paymentStatus: 'fully_paid',
        createdAt: { $gte: monthStart, $lte: monthEnd },
      });
      
      if (monthOrdersCount > 0) {
        pastMonthsWithOrders++;
      }
    }
    
    if (pastMonthsWithOrders === 0) {
      warnings.push(`Seller ${seller.sellerId} has no orders in past 12 months (target history will be empty)`);
      console.log(`   ⚠️  Past Months with Orders: 0 (target history will be empty)`);
    } else {
      console.log(`   ✅ Past Months with Orders: ${pastMonthsWithOrders}`);
    }
  }
};

/**
 * Test Seller Dashboard queries
 */
const testDashboardQueries = async () => {
  console.log('\n🧪 Testing Seller Dashboard Queries...\n');
  
  const sellers = await Seller.find({ status: 'approved', isActive: true }).limit(1);
  
  if (sellers.length === 0) {
    console.log('⚠️  No sellers found. Skipping query tests.');
    return;
  }
  
  const seller = sellers[0];
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  
  try {
    // Test dashboard overview query
    const totalReferrals = await User.countDocuments({ sellerId: seller.sellerId });
    console.log(`✅ Dashboard Overview Query: Total Referrals = ${totalReferrals}`);
    
    // Test current month sales aggregation
    const currentMonthSales = await Order.aggregate([
      {
        $match: {
          sellerId: seller.sellerId,
          status: 'delivered',
          paymentStatus: 'fully_paid',
          createdAt: { $gte: currentMonthStart },
        },
      },
      {
        $group: {
          _id: null,
          totalSales: { $sum: '$totalAmount' },
          orderCount: { $sum: 1 },
        },
      },
    ]);
    
    console.log(`✅ Current Month Sales Query: ${currentMonthSales.length > 0 ? `₹${currentMonthSales[0]?.totalSales || 0} (${currentMonthSales[0]?.orderCount || 0} orders)` : 'No data'}`);
    
    // Test referrals query
    const referrals = await User.find({ sellerId: seller.sellerId }).limit(5);
    console.log(`✅ Referrals Query: ${referrals.length} referrals found`);
    
    // Test wallet transactions query
    const walletTransactions = await Commission.find({ sellerId: seller._id })
      .populate('userId', 'name phone')
      .populate('orderId', 'orderNumber totalAmount')
      .limit(5)
      .lean();
    
    console.log(`✅ Wallet Transactions Query: ${walletTransactions.length} transactions found`);
    
    // Test withdrawal requests query
    const withdrawalRequests = await WithdrawalRequest.find({ sellerId: seller._id })
      .populate('reviewedBy', 'name email')
      .limit(5)
      .lean();
    
    console.log(`✅ Withdrawal Requests Query: ${withdrawalRequests.length} requests found`);
    
    // Test target history query
    const targetHistoryMonths = [];
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
      
      const monthSales = await Order.aggregate([
        {
          $match: {
            sellerId: seller.sellerId,
            status: 'delivered',
            paymentStatus: 'fully_paid',
            createdAt: { $gte: monthStart, $lte: monthEnd },
          },
        },
        {
          $group: {
            _id: null,
            achieved: { $sum: '$totalAmount' },
          },
        },
      ]);
      
      if (monthSales.length > 0) {
        targetHistoryMonths.push({
          month: date.toLocaleString('default', { month: 'long' }),
          achieved: monthSales[0].achieved,
        });
      }
    }
    
    console.log(`✅ Target History Query: ${targetHistoryMonths.length} months with data`);
    
    // Test recent activity query
    const recentCommissions = await Commission.find({ sellerId: seller._id })
      .populate('userId', 'name phone')
      .populate('orderId', 'orderNumber totalAmount')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();
    
    const recentOrders = await Order.find({ sellerId: seller.sellerId })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();
    
    console.log(`✅ Recent Activity Query: ${recentCommissions.length} commissions + ${recentOrders.length} orders`);
    
    console.log('\n✅ All dashboard queries working correctly');
  } catch (error) {
    errors.push(`Dashboard query test failed: ${error.message}`);
    console.log(`\n❌ Dashboard query test failed: ${error.message}`);
  }
};

/**
 * Main verification function
 */
const verifySellerData = async () => {
  try {
    console.log('\n' + '='.repeat(70));
    console.log('🔍 SELLER DASHBOARD DATA VERIFICATION');
    console.log('='.repeat(70));
    
    // Connect to database
    await connectDB();
    console.log('\n✅ Connected to database\n');
    
    // Run checks
    await verifyMinimumData();
    await checkBrokenReferences();
    await testDashboardQueries();
    
    // Final summary
    console.log('\n' + '='.repeat(70));
    console.log('📊 VERIFICATION SUMMARY');
    console.log('='.repeat(70));
    
    if (errors.length === 0 && warnings.length === 0) {
      console.log('\n✅ All checks passed! Seller Dashboard should work without errors.\n');
    } else {
      if (errors.length > 0) {
        console.log(`\n❌ Found ${errors.length} ERRORS that need to be fixed:\n`);
        errors.forEach(err => console.log(`   - ${err}`));
      }
      if (warnings.length > 0) {
        console.log(`\n⚠️  Found ${warnings.length} WARNINGS (may cause empty lists or missing data):\n`);
        warnings.slice(0, 20).forEach(warn => console.log(`   - ${warn}`));
        if (warnings.length > 20) {
          console.log(`   ... and ${warnings.length - 20} more warnings`);
        }
      }
    }
    
    // Close connection
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed\n');
    process.exit(errors.length > 0 ? 1 : 0);
  } catch (error) {
    console.error('\n❌ Error in verification script:', error);
    console.error(error.stack);
    await mongoose.connection.close();
    process.exit(1);
  }
};

// Run verification
if (require.main === module) {
  verifySellerData();
}

module.exports = { verifySellerData };

