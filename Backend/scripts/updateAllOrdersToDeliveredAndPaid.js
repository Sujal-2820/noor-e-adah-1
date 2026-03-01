/**
 * Script to update all orders to delivered and fully paid status
 * 
 * This script updates all orders in the database to:
 * - Status: 'delivered' (for full payment) or 'fully_paid' (for partial payment)
 * - Payment Status: 'fully_paid'
 * - Remaining Amount: 0
 * - Delivered At: Current date (if not already set)
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB } = require('../config/database');
const Order = require('../models/Order');
const { ORDER_STATUS, PAYMENT_STATUS } = require('../utils/constants');

async function updateAllOrders() {
  try {
    // Connect to database
    console.log('🔌 Connecting to MongoDB...');
    await connectDB();

    // Get all orders
    const orders = await Order.find({});
    console.log(`📦 Found ${orders.length} orders to update`);

    if (orders.length === 0) {
      console.log('ℹ️  No orders found in database');
      await mongoose.connection.close();
      return;
    }

    let updatedCount = 0;
    const now = new Date();

    // Update each order
    for (const order of orders) {
      const updates = {};
      let needsUpdate = false;

      // Determine final status based on payment preference
      if (order.paymentPreference === 'partial') {
        // For partial payment: use 'fully_paid' status (delivered + fully paid)
        if (order.status !== ORDER_STATUS.FULLY_PAID) {
          updates.status = ORDER_STATUS.FULLY_PAID;
          needsUpdate = true;
        }
      } else {
        // For full payment: use 'delivered' status
        if (order.status !== ORDER_STATUS.DELIVERED) {
          updates.status = ORDER_STATUS.DELIVERED;
          needsUpdate = true;
        }
      }

      // Update payment status to fully_paid
      if (order.paymentStatus !== PAYMENT_STATUS.FULLY_PAID) {
        updates.paymentStatus = PAYMENT_STATUS.FULLY_PAID;
        needsUpdate = true;
      }

      // Set remaining amount to 0
      if (order.remainingAmount !== 0) {
        updates.remainingAmount = 0;
        needsUpdate = true;
      }

      // Set deliveredAt if not already set
      if (!order.deliveredAt) {
        updates.deliveredAt = now;
        needsUpdate = true;
      }

      // Finalize any active grace periods
      if (order.statusUpdateGracePeriod?.isActive) {
        updates['statusUpdateGracePeriod.isActive'] = false;
        updates['statusUpdateGracePeriod.finalizedAt'] = now;
        needsUpdate = true;
      }

      if (order.acceptanceGracePeriod?.isActive) {
        updates['acceptanceGracePeriod.isActive'] = false;
        updates['acceptanceGracePeriod.confirmedAt'] = now;
        needsUpdate = true;
      }

      // Update order if needed
      if (needsUpdate) {
        await Order.updateOne(
          { _id: order._id },
          { $set: updates }
        );
        updatedCount++;
        console.log(`✅ Updated order ${order.orderNumber} (${order.paymentPreference === 'partial' ? 'fully_paid' : 'delivered'})`);
      } else {
        console.log(`⏭️  Order ${order.orderNumber} already up to date`);
      }
    }

    console.log(`\n✅ Update complete!`);
    console.log(`   Total orders: ${orders.length}`);
    console.log(`   Updated: ${updatedCount}`);
    console.log(`   Already up to date: ${orders.length - updatedCount}`);

    // Close database connection
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error updating orders:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run the script
updateAllOrders();

