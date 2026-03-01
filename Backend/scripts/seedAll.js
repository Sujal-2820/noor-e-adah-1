/**
 * Master Seed Script
 * 
 * This script runs all seed scripts in the correct order
 * to create comprehensive test data for the entire system.
 * 
 * Usage: node scripts/seedAll.js
 * Or: npm run seed-all
 * 
 * This will seed:
 * 1. Products, Vendors, Sellers, Users (basic data)
 * 2. ProductAssignments, Addresses, Carts (relationships)
 * 3. Orders, Payments, Commissions (transactional data)
 * 4. CreditPurchases, WithdrawalRequests (request data)
 */

require('dotenv').config();
const { connectDB } = require('../config/database');
const mongoose = require('mongoose');

// Import seed functions
const { seedAll: seedBasicData } = require('./seedTestData');
const { seedAll: seedOrdersData } = require('./seedOrdersAndPayments');

const seedEverything = async () => {
  try {
    console.log('\n' + '='.repeat(70));
    console.log('🌟 MASTER SEED SCRIPT - COMPREHENSIVE TEST DATA');
    console.log('='.repeat(70));
    console.log('\nThis will create test data for ALL collections.\n');
    console.log('⚠️  WARNING: This may take a few minutes...\n');
    
    // Connect to database
    await connectDB();
    console.log('✅ Connected to database\n');
    
    // Step 1: Seed basic data (Products, Vendors, Sellers, Users)
    console.log('📦 STEP 1: Seeding Basic Data (Products, Vendors, Sellers, Users)...');
    console.log('='.repeat(70));
    await seedBasicData();
    
    // Reconnect after first script closes connection
    if (mongoose.connection.readyState === 0) {
      await connectDB();
    }
    
    // Step 2: Seed orders and related data
    console.log('\n📦 STEP 2: Seeding Orders, Payments & Related Data...');
    console.log('='.repeat(70));
    await seedOrdersData();
    
    // Final summary
    console.log('\n' + '='.repeat(70));
    console.log('🎉 ALL SEEDING COMPLETE!');
    console.log('='.repeat(70));
    
    // Get final counts
    const Product = require('../models/Product');
    const Vendor = require('../models/Vendor');
    const Seller = require('../models/Seller');
    const User = require('../models/User');
    const Order = require('../models/Order');
    const Payment = require('../models/Payment');
    const Commission = require('../models/Commission');
    const CreditPurchase = require('../models/CreditPurchase');
    const WithdrawalRequest = require('../models/WithdrawalRequest');
    const ProductAssignment = require('../models/ProductAssignment');
    const Address = require('../models/Address');
    const Cart = require('../models/Cart');
    
    console.log('\n📊 FINAL DATABASE STATISTICS:');
    console.log('='.repeat(70));
    console.log(`   Products: ${await Product.countDocuments()}`);
    console.log(`   Vendors: ${await Vendor.countDocuments()} (Approved: ${await Vendor.countDocuments({ status: 'approved' })})`);
    console.log(`   Sellers: ${await Seller.countDocuments()} (Approved: ${await Seller.countDocuments({ status: 'approved' })})`);
    console.log(`   Users: ${await User.countDocuments()} (Active: ${await User.countDocuments({ isActive: true, isBlocked: false })})`);
    console.log(`   Product Assignments: ${await ProductAssignment.countDocuments()}`);
    console.log(`   Addresses: ${await Address.countDocuments()}`);
    console.log(`   Carts: ${await Cart.countDocuments()}`);
    console.log(`   Orders: ${await Order.countDocuments()}`);
    console.log(`   Payments: ${await Payment.countDocuments()}`);
    console.log(`   Commissions: ${await Commission.countDocuments()}`);
    console.log(`   Credit Purchases: ${await CreditPurchase.countDocuments()}`);
    console.log(`   Withdrawal Requests: ${await WithdrawalRequest.countDocuments()}`);
    console.log('='.repeat(70));
    
    console.log('\n✅ Test data is ready! You can now test the entire system end-to-end.');
    console.log('\n💡 Testing Tips:');
    console.log('   - Login as Admin, Vendor, Seller, or User to test different dashboards');
    console.log('   - Test order creation, payment, and fulfillment workflows');
    console.log('   - Test vendor approval, seller management, credit management');
    console.log('   - Test all CRUD operations for products, orders, etc.');
    console.log('='.repeat(70) + '\n');
    
    // Close connection
    await mongoose.connection.close();
    console.log('✅ Database connection closed\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error in master seed script:', error);
    console.error(error.stack);
    await mongoose.connection.close();
    process.exit(1);
  }
};

// Run master seeding
if (require.main === module) {
  seedEverything();
}

module.exports = { seedEverything };


