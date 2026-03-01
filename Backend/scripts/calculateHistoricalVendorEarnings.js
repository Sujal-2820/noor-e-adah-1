/**
 * Migration Script: Calculate Historical Vendor Earnings
 * 
 * This script calculates and creates earnings records for orders that were
 * fulfilled by vendors before the earnings feature was rolled out.
 * 
 * Only processes orders that:
 * - Are fully paid
 * - Have a vendor assigned
 * - Were fulfilled by vendor (not escalated to admin)
 * - Don't already have earnings calculated
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { calculateVendorEarnings } = require('../services/earningsService');
const Order = require('../models/Order');
const VendorEarning = require('../models/VendorEarning');
const { PAYMENT_STATUS } = require('../utils/constants');

async function calculateHistoricalEarnings() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/farmcommerce';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Find all orders that:
    // 1. Are fully paid
    // 2. Have a vendor assigned
    // 3. Were fulfilled by vendor (assignedTo === 'vendor' or not set, and not escalated)
    // 4. Don't already have earnings calculated
    const orders = await Order.find({
      paymentStatus: PAYMENT_STATUS.FULLY_PAID,
      vendorId: { $exists: true, $ne: null },
      $or: [
        { assignedTo: { $exists: false } }, // Old orders might not have assignedTo
        { assignedTo: 'vendor' },
      ],
      isEscalated: { $ne: true },
    }).populate('vendorId', 'name phone');

    console.log(`\n📊 Found ${orders.length} orders to process`);

    let processedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    let totalEarningsCreated = 0;

    for (const order of orders) {
      try {
        // Check if earnings already exist for this order
        const existingEarnings = await VendorEarning.findOne({
          orderId: order._id,
        });

        if (existingEarnings) {
          console.log(`⏭️  Skipping order ${order.orderNumber} - earnings already exist`);
          skippedCount++;
          continue;
        }

        // Calculate earnings for this order
        const earnings = await calculateVendorEarnings(order);

        if (earnings && earnings.length > 0) {
          const totalEarning = earnings.reduce((sum, e) => sum + e.earnings, 0);
          totalEarningsCreated += totalEarning;
          console.log(`✅ Processed order ${order.orderNumber} - Created ${earnings.length} earning record(s), Total: ₹${totalEarning.toFixed(2)}`);
          processedCount++;
        } else {
          console.log(`⚠️  Order ${order.orderNumber} - No earnings calculated (possibly escalated or no price difference)`);
          skippedCount++;
        }
      } catch (error) {
        console.error(`❌ Error processing order ${order.orderNumber}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n📈 Migration Summary:');
    console.log(`   ✅ Processed: ${processedCount} orders`);
    console.log(`   ⏭️  Skipped: ${skippedCount} orders`);
    console.log(`   ❌ Errors: ${errorCount} orders`);
    console.log(`   💰 Total Earnings Created: ₹${totalEarningsCreated.toFixed(2)}`);

    // Get summary by vendor
    const vendorSummary = await VendorEarning.aggregate([
      {
        $group: {
          _id: '$vendorId',
          totalEarnings: { $sum: '$earnings' },
          orderCount: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'vendors',
          localField: '_id',
          foreignField: '_id',
          as: 'vendor',
        },
      },
      {
        $unwind: '$vendor',
      },
      {
        $project: {
          vendorName: '$vendor.name',
          vendorPhone: '$vendor.phone',
          totalEarnings: 1,
          orderCount: 1,
        },
      },
      {
        $sort: { totalEarnings: -1 },
      },
    ]);

    if (vendorSummary.length > 0) {
      console.log('\n👥 Vendor Earnings Summary:');
      vendorSummary.forEach((summary) => {
        console.log(`   ${summary.vendorName} (${summary.vendorPhone}): ₹${summary.totalEarnings.toFixed(2)} from ${summary.orderCount} order(s)`);
      });
    }

    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
calculateHistoricalEarnings();

