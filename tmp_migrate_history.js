require('dotenv').config({ path: './Backend/.env' });
const mongoose = require('mongoose');
const Order = require('./Backend/models/Order');
const UserPurchase = require('./Backend/models/UserPurchase');
const User = require('./Backend/models/User');
const PaymentHistory = require('./Backend/models/PaymentHistory');
const { generateUniqueId } = require('./Backend/utils/generateUniqueId');

async function migrateData() {
  try {
    const mongoURI = process.env.MONGO_URI;
    await mongoose.connect(mongoURI);
    
    // Find paid/delivered orders
    const paidOrders = await Order.find({ 
      status: { $in: ['paid', 'confirmed', 'processing', 'dispatched', 'delivered'] } 
    }).populate('userId');
    
    console.log(`Found ${paidOrders.length} orders to migrate`);
    
    for (const order of paidOrders) {
      if (!order.userId) continue;
      
      // Check if already exists in history
      const exists = await PaymentHistory.findOne({ orderId: order._id, activityType: 'user_storefront_order_paid' });
      if (exists) continue;
      
      const historyId = await generateUniqueId(PaymentHistory, 'PH', 'historyId', 101);
      await PaymentHistory.create({
        historyId,
        activityType: 'user_storefront_order_paid',
        userId: order.userId._id,
        orderId: order._id,
        amount: order.totalAmount,
        status: 'completed',
        description: `User paid ₹${order.totalAmount} for storefront order ${order.orderNumber} (Migrated)`,
        metadata: {
          orderNumber: order.orderNumber,
          userName: order.userId.name,
          userPhone: order.userId.phone,
        },
        createdAt: order.updatedAt || order.createdAt
      });
      console.log(`Migrated order ${order.orderNumber}`);
    }
    
    // Find User Purchases
    const purchases = await UserPurchase.find({ 
      status: { $in: ['approved', 'processing', 'dispatched', 'delivered'] } 
    }).populate('userId');
    
    console.log(`Found ${purchases.length} stock purchases to migrate`);
    
    for (const purchase of purchases) {
       // Approved stage
       const approvedExists = await PaymentHistory.findOne({ metadata: { purchaseOrderId: purchase._id }, activityType: 'user_stock_purchase_approved' });
       if (!approvedExists) {
         const hId = await generateUniqueId(PaymentHistory, 'PH', 'historyId', 101);
         await PaymentHistory.create({
           historyId: hId,
           activityType: 'user_stock_purchase_approved',
           userId: purchase.userId ? purchase.userId._id : purchase._id, // fallback if userId not found
           amount: purchase.totalAmount,
           status: 'approved',
           description: `Admin approved stock purchase request ${purchase.orderId} (Migrated)`,
           metadata: {
             purchaseOrderId: purchase._id,
             orderId: purchase.orderId
           },
           createdAt: purchase.createdAt
         });
       }
       
       // Delivered stage
       if (purchase.deliveryStatus === 'delivered') {
          const deliveredExists = await PaymentHistory.findOne({ metadata: { purchaseOrderId: purchase._id }, activityType: 'user_stock_purchase_delivered' });
          if (!deliveredExists) {
             const hId = await generateUniqueId(PaymentHistory, 'PH', 'historyId', 101);
             await PaymentHistory.create({
               historyId: hId,
               activityType: 'user_stock_purchase_delivered',
               userId: purchase.userId ? purchase.userId._id : purchase._id,
               amount: purchase.totalAmount,
               status: 'completed',
               description: `Stock delivered for purchase ${purchase.orderId} (Migrated)`,
               metadata: {
                 purchaseOrderId: purchase._id,
                 orderId: purchase.orderId
               },
               createdAt: purchase.updatedAt
             });
          }
       }
    }
    
    console.log('Migration complete');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

migrateData();
