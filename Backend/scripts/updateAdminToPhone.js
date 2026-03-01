/**
 * Script to update existing admin to use phone instead of email
 * Updates admin record in database with phone number: 8878495502
 * 
 * Usage: node scripts/updateAdminToPhone.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('../models/Admin');
const { connectDB } = require('../config/database');

const updateAdmin = async () => {
  try {
    // Connect to database
    await connectDB();
    console.log('✅ Connected to database\n');

    // Update or create admin with phone number
    const adminPhone = '8878495502';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    
    let admin = await Admin.findOne({ phone: adminPhone });

    if (!admin) {
      // Check if admin exists with email (old format) and migrate
      const oldAdmin = await Admin.findOne();
      
      if (oldAdmin) {
        console.log('🔄 Migrating existing admin from email to phone...');
        admin = oldAdmin;
        admin.phone = adminPhone;
        admin.password = adminPassword; // Will be hashed automatically
        // Remove email field if it exists
        if (admin.email) {
          admin.email = undefined;
        }
        await admin.save();
        console.log('✅ Admin migrated successfully!');
      } else {
        // Create new admin
        admin = await Admin.create({
          phone: adminPhone,
          password: adminPassword,
          name: 'Admin',
          role: 'super_admin',
          isActive: true,
        });
        console.log('✅ Admin created successfully!');
      }
    } else {
      // Update existing admin password if needed
      admin.password = adminPassword;
      await admin.save();
      console.log('✅ Admin updated successfully!');
    }

    console.log('\n📱 Admin Details:');
    console.log('   Phone:', admin.phone);
    console.log('   Name:', admin.name);
    console.log('   Role:', admin.role);
    console.log('   Password:', 'Set from ADMIN_PASSWORD env variable (hashed in database)');

    // Close connection
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating admin:', error);
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
    process.exit(1);
  }
};

// Run script
updateAdmin();



