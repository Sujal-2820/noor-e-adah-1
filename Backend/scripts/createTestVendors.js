/**
 * Script to create test vendor accounts
 * 
 * Usage: node scripts/createTestVendors.js
 * Or: npm run create-test-vendors
 * 
 * Creates test vendors at different locations for testing
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Vendor = require('../models/Vendor');
const { connectDB } = require('../config/database');

const createTestVendors = async () => {
  try {
    // Connect to database
    await connectDB();

    // Test vendors data
    const vendorsData = [
      {
        name: 'Agri Supply Hub - Delhi',
        phone: '+919876543210',
        email: 'delhi@agrisupply.com',
        location: {
          address: '123, Main Street, Connaught Place',
          city: 'New Delhi',
          state: 'Delhi',
          pincode: '110001',
          coordinates: {
            lat: 28.6139, // Delhi coordinates
            lng: 77.2090,
          },
          coverageRadius: 20,
        },
        status: 'pending',
        isActive: false,
      },
      {
        name: 'Farm Fresh Warehouse - Mumbai',
        phone: '+919876543211',
        email: 'mumbai@farmfresh.com',
        location: {
          address: '456, Business District, Andheri',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400053',
          coordinates: {
            lat: 19.0760, // Mumbai coordinates (far from Delhi, no conflict)
            lng: 72.8777,
          },
          coverageRadius: 20,
        },
        status: 'pending',
        isActive: false,
      },
      {
        name: 'Rural Agri Center - Bangalore',
        phone: '+919876543212',
        email: 'bangalore@ruralagri.com',
        location: {
          address: '789, Industrial Area, Whitefield',
          city: 'Bangalore',
          state: 'Karnataka',
          pincode: '560066',
          coordinates: {
            lat: 12.9716, // Bangalore coordinates (far from others, no conflict)
            lng: 77.5946,
          },
          coverageRadius: 20,
        },
        status: 'approved', // One approved vendor for testing
        isActive: true,
        approvedAt: new Date(),
        creditPolicy: {
          limit: 500000,
          repaymentDays: 30,
          penaltyRate: 2,
        },
        creditLimit: 500000,
        creditUsed: 0,
      },
      {
        name: 'Nearby Test Vendor - Delhi Area',
        phone: '+919876543213',
        email: 'nearby@testvendor.com',
        location: {
          address: '789, CP Circle, New Delhi',
          city: 'New Delhi',
          state: 'Delhi',
          pincode: '110001',
          coordinates: {
            lat: 28.6150, // Very close to first vendor (within 20km) - for testing rejection
            lng: 77.2100,
          },
          coverageRadius: 20,
        },
        status: 'pending',
        isActive: false,
      },
    ];

    console.log('\n🔄 Creating test vendors...\n');

    for (const vendorData of vendorsData) {
      // Check if vendor already exists
      const existingVendor = await Vendor.findOne({ phone: vendorData.phone });

      if (existingVendor) {
        console.log(`⚠️  Vendor already exists: ${vendorData.name} (${vendorData.phone})`);
        // Update existing vendor
        Object.keys(vendorData).forEach(key => {
          if (vendorData[key] !== undefined) {
            existingVendor[key] = vendorData[key];
          }
        });
        await existingVendor.save();
        console.log(`✅ Vendor updated: ${vendorData.name}`);
      } else {
        // Create new vendor
        const vendor = await Vendor.create(vendorData);
        console.log(`✅ Vendor created: ${vendor.name}`);
        console.log(`   📍 Location: ${vendor.location.city}, ${vendor.location.state}`);
        console.log(`   📱 Phone: ${vendor.phone}`);
        console.log(`   📊 Status: ${vendor.status}`);
        console.log(`   🏢 Active: ${vendor.isActive}`);
        if (vendor.status === 'approved') {
          console.log(`   💰 Credit Limit: ₹${vendor.creditPolicy.limit}`);
        }
        console.log('');
      }
    }

    // Summary
    const totalVendors = await Vendor.countDocuments();
    const pendingVendors = await Vendor.countDocuments({ status: 'pending' });
    const approvedVendors = await Vendor.countDocuments({ status: 'approved' });

    console.log('='.repeat(60));
    console.log('📊 VENDOR SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Vendors: ${totalVendors}`);
    console.log(`Pending Approval: ${pendingVendors}`);
    console.log(`Approved: ${approvedVendors}`);
    console.log('='.repeat(60));

    // Close connection
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating vendors:', error);
    process.exit(1);
  }
};

// Run script
createTestVendors();

