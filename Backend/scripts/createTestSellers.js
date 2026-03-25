/**
 * Script to create test seller (IRA Partner) accounts
 * 
 * Usage: node scripts/createTestSellers.js
 * Or: npm run create-test-sellers
 * 
 * Creates test sellers for testing
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Seller = require('../models/Seller');
const { connectDB } = require('../config/database');

const createTestSellers = async () => {
  try {
    // Connect to database
    await connectDB();

    // Test sellers data
    const sellersData = [
      {
        sellerId: 'IRA-1001',
        name: 'Rajesh Kumar',
        phone: '+919111111111',
        email: 'rajesh@nooreadah.com',
        area: 'North Delhi',
        location: {
          address: '123, Village Street',
          city: 'Delhi',
          state: 'Delhi',
          pincode: '110001',
        },
        monthlyTarget: 100000,
        status: 'approved',
        isActive: true,
        approvedAt: new Date(),
        wallet: {
          balance: 5000,
          pending: 0,
        },
      },
      {
        sellerId: 'IRA-1002',
        name: 'Priya Sharma',
        phone: '+919222222222',
        email: 'priya@nooreadah.com',
        area: 'South Mumbai',
        location: {
          address: '456, Urban Area',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400053',
        },
        monthlyTarget: 150000,
        status: 'approved',
        isActive: true,
        approvedAt: new Date(),
        wallet: {
          balance: 10000,
          pending: 2000,
        },
      },
      {
        sellerId: 'IRA-1003',
        name: 'Amit Patel',
        phone: '+919333333333',
        email: 'amit@nooreadah.com',
        area: 'West Bangalore',
        location: {
          address: '789, Rural District',
          city: 'Bangalore',
          state: 'Karnataka',
          pincode: '560066',
        },
        monthlyTarget: 200000,
        status: 'approved',
        isActive: true,
        approvedAt: new Date(),
        wallet: {
          balance: 7500,
          pending: 1500,
        },
      },
      {
        sellerId: 'IRA-1004',
        name: 'Sneha Reddy',
        phone: '+919444444444',
        email: 'sneha@nooreadah.com',
        area: 'East Hyderabad',
        location: {
          address: '321, Industrial Zone',
          city: 'Hyderabad',
          state: 'Telangana',
          pincode: '500032',
        },
        monthlyTarget: 80000,
        status: 'pending', // One pending seller for testing
        isActive: false,
        wallet: {
          balance: 0,
          pending: 0,
        },
      },
    ];

    console.log('\n🔄 Creating test sellers...\n');

    for (const sellerData of sellersData) {
      // Check if seller already exists
      const existingSeller = await Seller.findOne({ 
        $or: [
          { sellerId: sellerData.sellerId },
          { phone: sellerData.phone }
        ]
      });

      if (existingSeller) {
        console.log(`⚠️  Seller already exists: ${sellerData.sellerId} - ${sellerData.name}`);
        // Update existing seller
        Object.keys(sellerData).forEach(key => {
          if (sellerData[key] !== undefined) {
            existingSeller[key] = sellerData[key];
          }
        });
        await existingSeller.save();
        console.log(`✅ Seller updated: ${sellerData.sellerId} - ${sellerData.name}`);
      } else {
        // Create new seller
        const seller = await Seller.create(sellerData);
        console.log(`✅ Seller created: ${seller.sellerId} - ${seller.name}`);
        console.log(`   📱 Phone: ${seller.phone}`);
        console.log(`   📍 Area: ${seller.area}`);
        console.log(`   📊 Status: ${seller.status}`);
        console.log(`   🏢 Active: ${seller.isActive}`);
        console.log(`   💰 Wallet Balance: ₹${seller.wallet.balance}`);
        console.log(`   🎯 Monthly Target: ₹${seller.monthlyTarget}`);
        console.log('');
      }
    }

    // Summary
    const totalSellers = await Seller.countDocuments();
    const pendingSellers = await Seller.countDocuments({ status: 'pending' });
    const approvedSellers = await Seller.countDocuments({ status: 'approved' });
    const activeSellers = await Seller.countDocuments({ isActive: true });

    console.log('='.repeat(60));
    console.log('📊 SELLER SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Sellers: ${totalSellers}`);
    console.log(`Pending Approval: ${pendingSellers}`);
    console.log(`Approved: ${approvedSellers}`);
    console.log(`Active: ${activeSellers}`);
    console.log('='.repeat(60));

    // Close connection
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating sellers:', error);
    process.exit(1);
  }
};

// Run script
createTestSellers();

