/**
 * Verify Admin Dashboard Data Script
 * 
 * This script verifies that all necessary data exists for Admin Dashboard
 * endpoints to work without 404 errors. It checks:
 * 1. All referenced IDs exist (populated relationships)
 * 2. All required data for dashboard stats
 * 3. Data for filtering and pagination
 * 
 * Usage: node scripts/verifyAdminData.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB } = require('../config/database');

// Import all models
const Admin = require('../models/Admin');
const Product = require('../models/Product');
const Vendor = require('../models/Vendor');
const Seller = require('../models/Seller');
const User = require('../models/User');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const CreditPurchase = require('../models/CreditPurchase');
const WithdrawalRequest = require('../models/WithdrawalRequest');
const ProductAssignment = require('../models/ProductAssignment');
const Commission = require('../models/Commission');
const Address = require('../models/Address');
const Cart = require('../models/Cart');

let errors = [];
let warnings = [];

/**
 * Check for broken references
 */
const checkBrokenReferences = async () => {
  console.log('\n🔍 Checking for Broken References...\n');
  
  // Check Orders with invalid userId
  const ordersWithInvalidUser = await Order.find({});
  for (const order of ordersWithInvalidUser) {
    if (order.userId) {
      const user = await User.findById(order.userId);
      if (!user) {
        errors.push(`Order ${order.orderNumber} has invalid userId: ${order.userId}`);
      }
    }
    
    if (order.vendorId) {
      const vendor = await Vendor.findById(order.vendorId);
      if (!vendor) {
        warnings.push(`Order ${order.orderNumber} has invalid vendorId: ${order.vendorId}`);
      }
    }
    
    if (order.seller) {
      const seller = await Seller.findById(order.seller);
      if (!seller) {
        warnings.push(`Order ${order.orderNumber} has invalid seller: ${order.seller}`);
      }
    }
    
    // Check order items
    for (const item of order.items || []) {
      if (item.productId) {
        const product = await Product.findById(item.productId);
        if (!product) {
          errors.push(`Order ${order.orderNumber} has invalid productId in item: ${item.productId}`);
        }
      }
    }
  }
  
  // Check Payments with invalid orderId
  const paymentsWithInvalidOrder = await Payment.find({});
  for (const payment of paymentsWithInvalidOrder) {
    if (payment.orderId) {
      const order = await Order.findById(payment.orderId);
      if (!order) {
        errors.push(`Payment ${payment.paymentId} has invalid orderId: ${payment.orderId}`);
      }
    }
    
    if (payment.userId) {
      const user = await User.findById(payment.userId);
      if (!user) {
        errors.push(`Payment ${payment.paymentId} has invalid userId: ${payment.userId}`);
      }
    }
  }
  
  // Check CreditPurchases with invalid vendorId
  const purchasesWithInvalidVendor = await CreditPurchase.find({});
  for (const purchase of purchasesWithInvalidVendor) {
    if (purchase.vendorId) {
      const vendor = await Vendor.findById(purchase.vendorId);
      if (!vendor) {
        errors.push(`CreditPurchase ${purchase._id} has invalid vendorId: ${purchase.vendorId}`);
      }
    }
    
    if (purchase.reviewedBy) {
      const admin = await Admin.findById(purchase.reviewedBy);
      if (!admin) {
        warnings.push(`CreditPurchase ${purchase._id} has invalid reviewedBy: ${purchase.reviewedBy}`);
      }
    }
    
    // Check purchase items
    for (const item of purchase.items || []) {
      if (item.productId) {
        const product = await Product.findById(item.productId);
        if (!product) {
          errors.push(`CreditPurchase ${purchase._id} has invalid productId in item: ${item.productId}`);
        }
      }
    }
  }
  
  // Check WithdrawalRequests with invalid sellerId
  const withdrawalsWithInvalidSeller = await WithdrawalRequest.find({});
  for (const withdrawal of withdrawalsWithInvalidSeller) {
    if (withdrawal.sellerId) {
      const seller = await Seller.findById(withdrawal.sellerId);
      if (!seller) {
        errors.push(`WithdrawalRequest ${withdrawal._id} has invalid sellerId: ${withdrawal.sellerId}`);
      }
    }
    
    if (withdrawal.reviewedBy) {
      const admin = await Admin.findById(withdrawal.reviewedBy);
      if (!admin) {
        warnings.push(`WithdrawalRequest ${withdrawal._id} has invalid reviewedBy: ${withdrawal.reviewedBy}`);
      }
    }
  }
  
  // Check ProductAssignments
  const assignmentsWithInvalidRefs = await ProductAssignment.find({});
  for (const assignment of assignmentsWithInvalidRefs) {
    if (assignment.productId) {
      const product = await Product.findById(assignment.productId);
      if (!product) {
        errors.push(`ProductAssignment ${assignment._id} has invalid productId: ${assignment.productId}`);
      }
    }
    
    if (assignment.vendorId) {
      const vendor = await Vendor.findById(assignment.vendorId);
      if (!vendor) {
        errors.push(`ProductAssignment ${assignment._id} has invalid vendorId: ${assignment.vendorId}`);
      }
    }
  }
  
  // Check Users with invalid seller reference
  const usersWithInvalidSeller = await User.find({ sellerId: { $exists: true, $ne: null } });
  for (const user of usersWithInvalidSeller) {
    if (user.sellerId) {
      const seller = await Seller.findOne({ sellerId: user.sellerId });
      if (!seller) {
        warnings.push(`User ${user._id} has invalid sellerId: ${user.sellerId}`);
      }
    }
    
    if (user.assignedVendor) {
      const vendor = await Vendor.findById(user.assignedVendor);
      if (!vendor) {
        warnings.push(`User ${user._id} has invalid assignedVendor: ${user.assignedVendor}`);
      }
    }
  }
  
  // Check Vendors with invalid approvedBy
  const vendorsWithInvalidAdmin = await Vendor.find({ approvedBy: { $exists: true, $ne: null } });
  for (const vendor of vendorsWithInvalidAdmin) {
    if (vendor.approvedBy) {
      const admin = await Admin.findById(vendor.approvedBy);
      if (!admin) {
        warnings.push(`Vendor ${vendor._id} has invalid approvedBy: ${vendor.approvedBy}`);
      }
    }
  }
  
  // Check Orders for escalation info (assignedTo: 'admin')
  const escalatedOrders = await Order.find({ assignedTo: 'admin' });
  console.log(`✅ Found ${escalatedOrders.length} escalated orders`);
  
  if (errors.length > 0) {
    console.log(`\n❌ Found ${errors.length} ERRORS:`);
    errors.forEach(err => console.log(`   - ${err}`));
  } else {
    console.log('\n✅ No broken references found');
  }
  
  if (warnings.length > 0) {
    console.log(`\n⚠️  Found ${warnings.length} WARNINGS:`);
    warnings.forEach(warn => console.log(`   - ${warn}`));
  }
};

/**
 * Verify minimum data requirements
 */
const verifyMinimumData = async () => {
  console.log('\n📊 Verifying Minimum Data Requirements...\n');
  
  const checks = [
    {
      name: 'Admin User',
      check: async () => {
        const count = await Admin.countDocuments();
        if (count === 0) {
          errors.push('No Admin user found - Admin login will fail');
          return false;
        }
        return true;
      },
    },
    {
      name: 'Products (Active)',
      check: async () => {
        const count = await Product.countDocuments({ isActive: true });
        if (count === 0) {
          warnings.push('No active products - Product management will be empty');
          return false;
        }
        return true;
      },
    },
    {
      name: 'Approved Vendors',
      check: async () => {
        const count = await Vendor.countDocuments({ status: 'approved', isActive: true });
        if (count === 0) {
          warnings.push('No approved vendors - Vendor management will be empty');
          return false;
        }
        return true;
      },
    },
    {
      name: 'Pending Vendors',
      check: async () => {
        const count = await Vendor.countDocuments({ status: 'pending' });
        if (count === 0) {
          warnings.push('No pending vendors - Vendor approval list will be empty');
          return false;
        }
        return true;
      },
    },
    {
      name: 'Approved Sellers',
      check: async () => {
        const count = await Seller.countDocuments({ status: 'approved', isActive: true });
        if (count === 0) {
          warnings.push('No approved sellers - Seller management will be empty');
          return false;
        }
        return true;
      },
    },
    {
      name: 'Active Users',
      check: async () => {
        const count = await User.countDocuments({ isActive: true, isBlocked: false });
        if (count === 0) {
          warnings.push('No active users - User management will be empty');
          return false;
        }
        return true;
      },
    },
    {
      name: 'Delivered Orders (Fully Paid)',
      check: async () => {
        const count = await Order.countDocuments({ status: 'delivered', paymentStatus: 'fully_paid' });
        if (count === 0) {
          warnings.push('No delivered/fully_paid orders - Revenue stats will be zero');
          return false;
        }
        return true;
      },
    },
    {
      name: 'Escalated Orders',
      check: async () => {
        const count = await Order.countDocuments({ assignedTo: 'admin' });
        if (count === 0) {
          warnings.push('No escalated orders - Escalated orders list will be empty');
          return false;
        }
        return true;
      },
    },
    {
      name: 'Pending Credit Purchases',
      check: async () => {
        const count = await CreditPurchase.countDocuments({ status: 'pending' });
        if (count === 0) {
          warnings.push('No pending credit purchases - Credit purchase requests will be empty');
          return false;
        }
        return true;
      },
    },
    {
      name: 'Pending Withdrawal Requests',
      check: async () => {
        const count = await WithdrawalRequest.countDocuments({ status: 'pending' });
        if (count === 0) {
          warnings.push('No pending withdrawal requests - Withdrawal requests will be empty');
          return false;
        }
        return true;
      },
    },
    {
      name: 'Product Assignments',
      check: async () => {
        const count = await ProductAssignment.countDocuments({ isActive: true });
        if (count === 0) {
          warnings.push('No product assignments - Product assignment data will be empty');
          return false;
        }
        return true;
      },
    },
  ];
  
  for (const check of checks) {
    const result = await check.check();
    if (result) {
      console.log(`✅ ${check.name}: OK`);
    } else {
      console.log(`⚠️  ${check.name}: Missing`);
    }
  }
};

/**
 * Test Admin Dashboard queries
 */
const testDashboardQueries = async () => {
  console.log('\n🧪 Testing Admin Dashboard Queries...\n');
  
  try {
    // Test dashboard aggregation
    const revenueStats = await Order.aggregate([
      {
        $match: {
          status: 'delivered',
          paymentStatus: 'fully_paid',
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
    
    console.log(`✅ Dashboard Revenue Query: ${revenueStats.length > 0 ? 'Has Data' : 'No Data'}`);
    
    // Test escalated orders query
    const escalatedOrders = await Order.find({ assignedTo: 'admin' })
      .populate('userId', 'name phone')
      .populate('vendorId', 'name')
      .populate('items.productId', 'name')
      .limit(10);
    
    console.log(`✅ Escalated Orders Query: ${escalatedOrders.length} orders found`);
    
    // Test vendor purchases query
    const vendorPurchases = await CreditPurchase.find({ status: 'pending' })
      .populate('vendorId', 'name phone')
      .populate('items.productId', 'name')
      .populate('reviewedBy', 'name')
      .limit(10);
    
    console.log(`✅ Vendor Purchases Query: ${vendorPurchases.length} pending purchases found`);
    
    // Test seller withdrawals query
    const sellerWithdrawals = await WithdrawalRequest.find({ status: 'pending' })
      .populate('sellerId', 'sellerId name')
      .populate('reviewedBy', 'name')
      .limit(10);
    
    console.log(`✅ Seller Withdrawals Query: ${sellerWithdrawals.length} pending withdrawals found`);
    
    console.log('\n✅ All dashboard queries working correctly');
  } catch (error) {
    errors.push(`Dashboard query test failed: ${error.message}`);
    console.log(`\n❌ Dashboard query test failed: ${error.message}`);
  }
};

/**
 * Main verification function
 */
const verifyAdminData = async () => {
  try {
    console.log('\n' + '='.repeat(70));
    console.log('🔍 ADMIN DASHBOARD DATA VERIFICATION');
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
      console.log('\n✅ All checks passed! Admin Dashboard should work without errors.\n');
    } else {
      if (errors.length > 0) {
        console.log(`\n❌ Found ${errors.length} ERRORS that need to be fixed:\n`);
        errors.forEach(err => console.log(`   - ${err}`));
      }
      if (warnings.length > 0) {
        console.log(`\n⚠️  Found ${warnings.length} WARNINGS (may cause empty lists):\n`);
        warnings.forEach(warn => console.log(`   - ${warn}`));
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
  verifyAdminData();
}

module.exports = { verifyAdminData };

