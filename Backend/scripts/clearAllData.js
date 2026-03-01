/**
 * Script to clear all data from MongoDB collections
 * 
 * This script removes all documents from all collections but keeps
 * the collections and database structure intact.
 * 
 * Usage: node scripts/clearAllData.js
 * Or: npm run clear-all-data
 * 
 * WARNING: This will delete ALL data from ALL collections!
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB } = require('../config/database');

// Import all models to ensure collections are registered
require('../models/Admin');
require('../models/User');
require('../models/Vendor');
require('../models/Seller');
require('../models/Product');
require('../models/Order');
require('../models/Cart');
require('../models/Payment');
require('../models/Commission');
require('../models/Address');
require('../models/Notification');
require('../models/ProductAssignment');
require('../models/Settings');
require('../models/CreditPurchase');
require('../models/VendorAdminMessage');
require('../models/WithdrawalRequest');

const clearAllData = async () => {
  try {
    console.log('🔄 Connecting to MongoDB...');
    // Connect to database
    await connectDB();

    // Get database instance
    const db = mongoose.connection.db;
    
    // Get all collection names
    const collections = await db.listCollections().toArray();
    
    // Filter out system collections
    const systemCollections = ['system.profile', 'system.users'];
    const userCollections = collections.filter(
      col => !systemCollections.includes(col.name) && !col.name.startsWith('system.')
    );

    if (userCollections.length === 0) {
      console.log('ℹ️  No collections found in the database.');
      await mongoose.connection.close();
      process.exit(0);
    }

    console.log(`\n📋 Found ${userCollections.length} collection(s):`);
    userCollections.forEach(col => {
      console.log(`   - ${col.name}`);
    });

    console.log('\n⚠️  WARNING: This will delete ALL data from the above collections!');
    console.log('   Collections and database structure will be preserved.\n');

    // Delete all documents from each collection
    let totalDeleted = 0;
    const results = [];

    for (const collection of userCollections) {
      try {
        const collectionName = collection.name;
        const collectionObj = db.collection(collectionName);
        
        // Get count before deletion
        const countBefore = await collectionObj.countDocuments();
        
        if (countBefore > 0) {
          // Delete all documents
          const result = await collectionObj.deleteMany({});
          const deletedCount = result.deletedCount || 0;
          totalDeleted += deletedCount;
          
          results.push({
            collection: collectionName,
            deleted: deletedCount,
            status: 'success'
          });
          
          console.log(`✅ ${collectionName}: Deleted ${deletedCount} document(s)`);
        } else {
          results.push({
            collection: collectionName,
            deleted: 0,
            status: 'empty'
          });
          console.log(`ℹ️  ${collectionName}: Already empty`);
        }
      } catch (error) {
        results.push({
          collection: collection.name,
          deleted: 0,
          status: 'error',
          error: error.message
        });
        console.error(`❌ ${collection.name}: Error - ${error.message}`);
      }
    }

    // Summary
    console.log('\n📊 Summary:');
    console.log(`   Total collections processed: ${userCollections.length}`);
    console.log(`   Total documents deleted: ${totalDeleted}`);
    
    const successCount = results.filter(r => r.status === 'success').length;
    const emptyCount = results.filter(r => r.status === 'empty').length;
    const errorCount = results.filter(r => r.status === 'error').length;
    
    console.log(`   Successfully cleared: ${successCount}`);
    console.log(`   Already empty: ${emptyCount}`);
    if (errorCount > 0) {
      console.log(`   Errors: ${errorCount}`);
    }

    console.log('\n✅ Data clearing completed!');
    console.log('📌 Collections and database structure preserved.');

    // Close connection
    await mongoose.connection.close();
    console.log('✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error clearing data:', error);
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
    process.exit(1);
  }
};

// Run script
clearAllData();

