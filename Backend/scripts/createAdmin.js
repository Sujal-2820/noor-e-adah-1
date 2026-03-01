/**
 * Script to create a test admin account
 * 
 * Usage: node scripts/createAdmin.js
 * Or: npm run create-admin
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('../models/Admin');
const { connectDB } = require('../config/database');

const createAdmin = async () => {
  try {
    // Connect to database
    await connectDB();

    // Admin details
    const adminPhone = '8878495502';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    
    const adminData = {
      phone: adminPhone,
      password: adminPassword, // Will be hashed automatically
      name: 'Admin',
      role: 'super_admin',
      isActive: true,
    };

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ phone: adminData.phone });

    if (existingAdmin) {
      console.log('⚠️  Admin already exists with phone:', adminData.phone);
      console.log('Updating password...');
      existingAdmin.password = adminPassword;
      existingAdmin.name = adminData.name;
      existingAdmin.role = adminData.role;
      existingAdmin.isActive = true;
      await existingAdmin.save();
      console.log('✅ Admin updated successfully!');
    } else {
      // Create new admin
      const admin = await Admin.create(adminData);
      console.log('✅ Admin created successfully!');
      console.log('📱 Phone:', admin.phone);
      console.log('👤 Name:', admin.name);
      console.log('🔑 Role:', admin.role);
      console.log('🔒 Password: Set from ADMIN_PASSWORD env variable (hashed in database)');
    }

    // Close connection
    await mongoose.connection.close();
    console.log('✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin:', error);
    process.exit(1);
  }
};

// Run script
createAdmin();

