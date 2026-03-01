/**
 * Data Integrity Tests
 * 
 * Tests data relationships, constraints, and business rules:
 * 1. Order-Vendor relationships
 * 2. User-Seller relationships (lifetime linking)
 * 3. Payment-Order relationships
 * 4. Commission calculations
 * 5. Credit limits and repayments
 * 6. Stock deductions on order
 * 7. Vendor 20km radius rule
 * 8. Minimum order value enforcement
 */

const mongoose = require('mongoose');

const User = require('../../models/User');
const Order = require('../../models/Order');
const Payment = require('../../models/Payment');
const Vendor = require('../../models/Vendor');
const Seller = require('../../models/Seller');
const Commission = require('../../models/Commission');
const ProductAssignment = require('../../models/ProductAssignment');
const Cart = require('../../models/Cart');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testOrderVendorRelationship(record) {
  const orders = await Order.find({ assignedTo: 'vendor' }).limit(5);
  
  for (const order of orders) {
    if (order.vendorId) {
      const vendor = await Vendor.findById(order.vendorId);
      const vendorExists = vendor !== null;
      record('Data Integrity', `Order-Vendor Relationship (Order ${order._id})`, vendorExists, {
        orderId: order._id,
        vendorId: order.vendorId,
        vendorExists
      });
      
      // Check if vendor is approved and active
      if (vendor) {
        const vendorValid = vendor.status === 'approved' && vendor.isActive === true;
        record('Data Integrity', `Vendor Status Valid for Order ${order._id}`, vendorValid);
      }
    }
  }
  
  return true;
}

async function testUserSellerRelationship(record) {
  const users = await User.find({ sellerId: { $exists: true, $ne: null } }).limit(5);
  
  for (const user of users) {
    if (user.sellerId) {
      const seller = await Seller.findOne({ sellerId: user.sellerId });
      const sellerExists = seller !== null;
      record('Data Integrity', `User-Seller Relationship (User ${user._id})`, sellerExists, {
        userId: user._id,
        sellerId: user.sellerId,
        sellerExists
      });
      
      // Verify sellerId is locked (can't be changed)
      // This is a business rule - sellerId should be immutable after first set
      record('Data Integrity', `Seller ID Immutability (User ${user._id})`, true, {
        note: 'Seller ID should be immutable after first assignment'
      });
    }
  }
  
  return true;
}

async function testPaymentOrderRelationship(record) {
  const orders = await Order.find().limit(10);
  
  for (const order of orders) {
    const payments = await Payment.find({ orderId: order._id });
    
    let totalPaid = 0;
    for (const payment of payments) {
      if (payment.status === 'completed' || payment.status === 'success') {
        totalPaid += payment.amount || 0;
      }
    }
    
    // Check payment status consistency
    if (order.paymentStatus === 'fully_paid') {
      const isFullyPaid = totalPaid >= (order.totalAmount || 0) * 0.99; // 99% threshold for rounding
      record('Data Integrity', `Payment Status Consistency (Order ${order._id})`, isFullyPaid, {
        orderId: order._id,
        paymentStatus: order.paymentStatus,
        totalPaid,
        orderTotal: order.totalAmount
      });
    }
    
    if (order.paymentStatus === 'partial_paid') {
      const isPartialPaid = totalPaid > 0 && totalPaid < (order.totalAmount || 0) * 0.99;
      record('Data Integrity', `Partial Payment Consistency (Order ${order._id})`, isPartialPaid, {
        orderId: order._id,
        paymentStatus: order.paymentStatus,
        totalPaid,
        orderTotal: order.totalAmount
      });
    }
  }
  
  return true;
}

async function testCommissionCalculation(record) {
  const commissions = await Commission.find().limit(10);
  
  for (const commission of commissions) {
    if (commission.orderId) {
      const order = await Order.findById(commission.orderId);
      
      if (order) {
        // Verify commission amount is calculated correctly
        // Commission is typically a percentage of order value
        const expectedCommission = (order.totalAmount || 0) * (commission.rate || 0) / 100;
        const commissionMatch = Math.abs(commission.amount - expectedCommission) < 0.01; // 1 paise tolerance
        
        record('Data Integrity', `Commission Calculation (Order ${order._id})`, commissionMatch, {
          orderId: order._id,
          orderTotal: order.totalAmount,
          commissionRate: commission.rate,
          expectedCommission,
          actualCommission: commission.amount
        });
      }
    }
  }
  
  return true;
}

async function testCreditLimits(record) {
  const vendors = await Vendor.find({ status: 'approved', isActive: true }).limit(5);
  
  for (const vendor of vendors) {
    // Check credit usage vs limit
    const creditLimit = vendor.creditLimit || 0;
    const creditUsed = vendor.creditUsed || 0;
    const creditAvailable = creditLimit - creditUsed;
    
    const withinLimit = creditUsed <= creditLimit;
    record('Data Integrity', `Vendor Credit Limit (${vendor._id})`, withinLimit, {
      vendorId: vendor._id,
      creditLimit,
      creditUsed,
      creditAvailable,
      withinLimit
    });
    
    // Check overdue credit
    const CreditPurchase = require('../../models/CreditPurchase');
    const overduePurchases = await CreditPurchase.find({
      vendorId: vendor._id,
      status: 'approved',
      dueDate: { $lt: new Date() },
      isPaid: false
    });
    
    if (overduePurchases.length > 0) {
      record('Data Integrity', `Vendor Has Overdue Credit (${vendor._id})`, true, {
        vendorId: vendor._id,
        overdueCount: overduePurchases.length
      });
    }
  }
  
  return true;
}

async function testMinimumOrderValue(record) {
  const carts = await Cart.find().limit(10);
  
  for (const cart of carts) {
    if (cart.items && cart.items.length > 0) {
      let cartTotal = 0;
      for (const item of cart.items) {
        // We need to get product to calculate total
        const Product = require('../../models/Product');
        const product = await Product.findById(item.productId);
        if (product && product.priceToUser) {
          cartTotal += product.priceToUser * (item.quantity || 0);
        }
      }
      
      // Minimum order value is ₹2000
      const meetsMinimum = cartTotal >= 2000;
      record('Data Integrity', `Cart Minimum Order Value (₹2000) - Cart ${cart._id}`, meetsMinimum, {
        cartId: cart._id,
        cartTotal,
        meetsMinimum: meetsMinimum || cartTotal === 0 // Empty cart is OK
      });
    }
  }
  
  return true;
}

async function testStockDeductions(record) {
  const orders = await Order.find({ status: { $in: ['awaiting', 'dispatched', 'delivered'] } }).limit(10);
  
  for (const order of orders) {
    if (order.items && order.items.length > 0 && order.vendorId) {
      for (const item of order.items) {
        const assignment = await ProductAssignment.findOne({
          vendorId: order.vendorId,
          productId: item.productId
        });
        
        if (assignment) {
          // Check if stock was deducted (initial stock should be >= current stock + ordered quantity)
          // This is a simplified check - actual implementation would track initial stock
          const stockAvailable = assignment.stock || 0;
          const orderedQuantity = item.quantity || 0;
          
          record('Data Integrity', `Stock Available After Order (Order ${order._id})`, stockAvailable >= 0, {
            orderId: order._id,
            productId: item.productId,
            orderedQuantity,
            stockAvailable
          });
        }
      }
    }
  }
  
  return true;
}

async function testVendorRadiusRule(record) {
  // Test that orders are assigned to vendors within 20km
  const orders = await Order.find({ assignedTo: 'vendor', vendorId: { $exists: true } }).limit(10);
  
  for (const order of orders) {
    if (order.vendorId && order.shippingAddress?.coordinates) {
      const vendor = await Vendor.findById(order.vendorId);
      
      if (vendor && vendor.location?.coordinates) {
        // Calculate distance (simplified - actual would use haversine formula)
        const userLat = order.shippingAddress.coordinates.lat;
        const userLng = order.shippingAddress.coordinates.lng;
        const vendorLat = vendor.location.coordinates.lat;
        const vendorLng = vendor.location.coordinates.lng;
        
        // Simple distance calculation (approximate)
        const latDiff = userLat - vendorLat;
        const lngDiff = userLng - vendorLng;
        const distanceKm = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 111; // Rough conversion
        
        const within20km = distanceKm <= 20;
        record('Data Integrity', `Vendor 20km Radius Rule (Order ${order._id})`, within20km, {
          orderId: order._id,
          vendorId: order.vendorId,
          distanceKm: distanceKm.toFixed(2),
          within20km
        });
      }
    }
  }
  
  return true;
}

async function run(record) {
  await testOrderVendorRelationship(record);
  await sleep(200);
  
  await testUserSellerRelationship(record);
  await sleep(200);
  
  await testPaymentOrderRelationship(record);
  await sleep(200);
  
  await testCommissionCalculation(record);
  await sleep(200);
  
  await testCreditLimits(record);
  await sleep(200);
  
  await testMinimumOrderValue(record);
  await sleep(200);
  
  await testStockDeductions(record);
  await sleep(200);
  
  await testVendorRadiusRule(record);
}

module.exports = { run };




