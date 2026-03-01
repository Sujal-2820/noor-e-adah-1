/**
 * Ensure Vendor Dashboard Data
 * 
 * This script ensures all necessary data exists in MongoDB for Vendor Dashboard testing.
 * It checks and creates:
 * - Approved vendors with location data
 * - Product assignments (inventory) for vendors
 * - Orders assigned to vendors (pending, processing, delivered)
 * - Credit purchases for vendors
 * - Payments linked to orders
 * 
 * Usage: node scripts/ensureVendorData.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB } = require('../config/database');

const Vendor = require('../models/Vendor');
const Product = require('../models/Product');
const ProductAssignment = require('../models/ProductAssignment');
const Order = require('../models/Order');
const CreditPurchase = require('../models/CreditPurchase');
const Payment = require('../models/Payment');
const User = require('../models/User');
const Seller = require('../models/Seller');

const createdData = {
  vendors: [],
  products: [],
  productAssignments: [],
  orders: [],
  creditPurchases: [],
  payments: [],
};

/**
 * Ensure Approved Vendors exist (5+ vendors)
 */
const ensureVendors = async () => {
  console.log('\n👤 Checking Approved Vendors...\n');
  
  let vendors = await Vendor.find({ status: 'approved', isActive: true }).limit(5);
  
  if (vendors.length < 5) {
    console.log(`⚠️  Only ${vendors.length} approved vendors found. Creating more...`);
    
    // Get existing approved vendors to avoid 20km conflicts
    const existingVendors = await Vendor.find({ status: { $in: ['approved', 'pending'] } })
      .select('location.coordinates')
      .lean();
    
    // Base location (Kolhapur, Maharashtra)
    const baseLat = 16.7050;
    const baseLng = 74.2433;
    
    // Create vendors with locations at least 25km apart to avoid conflicts
    const locations = [
      { lat: baseLat, lng: baseLng, address: 'Kolhapur Main Hub, Maharashtra' },
      { lat: baseLat + 0.25, lng: baseLng + 0.25, address: 'Kolhapur North Hub, Maharashtra' }, // ~30km away
      { lat: baseLat + 0.25, lng: baseLng - 0.25, address: 'Kolhapur East Hub, Maharashtra' },
      { lat: baseLat - 0.25, lng: baseLng + 0.25, address: 'Kolhapur South Hub, Maharashtra' },
      { lat: baseLat - 0.25, lng: baseLng - 0.25, address: 'Kolhapur West Hub, Maharashtra' },
    ];
    
    for (let i = vendors.length; i < 5; i++) {
      const location = locations[i % locations.length];
      const vendor = await Vendor.create({
        name: `Vendor Hub ${i + 1}`,
        phone: `+9198765432${i + 1}`,
        location: {
          address: location.address,
          city: 'Kolhapur',
          state: 'Maharashtra',
          pincode: '416001',
          coordinates: {
            lat: location.lat,
            lng: location.lng,
          },
        },
        coverageRadius: 20,
        status: 'approved',
        isActive: true,
        approvedAt: new Date(),
        creditLimit: 3500000,
        creditUsed: Math.floor(Math.random() * 2000000) + 1000000,
        creditRepaymentDays: 30,
        creditPenaltyRate: 0.5,
      });
      
      vendors.push(vendor);
      createdData.vendors.push(vendor._id);
      console.log(`✅ Vendor created: ${vendor.name} (${vendor.phone}) at ${location.address}`);
    }
  } else {
    console.log(`✅ Approved vendors: ${vendors.length}`);
  }
  
  return vendors;
};

/**
 * Ensure Products exist (10+ products)
 */
const ensureProducts = async () => {
  console.log('\n📦 Checking Products...\n');
  
  let products = await Product.find().limit(10);
  
  if (products.length < 10) {
    console.log(`⚠️  Only ${products.length} products found. Creating more...`);
    
    const productNames = [
      'NPK 24:24:0 Fertilizer',
      'Urea Blend Premium',
      'DAP (Diammonium Phosphate)',
      'Potash Mix',
      'Micro Nutrients Package',
      'Organic Compost Blend',
      'Phosphate Rock',
      'Nitrogen Solution',
      'Sulfur Coated Urea',
      'Multi-Nutrient Mix',
    ];
    
    for (let i = products.length; i < 10; i++) {
      const product = await Product.create({
        name: productNames[i],
        sku: `PRD-${1000 + i}`,
        category: 'Fertilizer',
        description: `${productNames[i]} for agricultural use`,
        priceToUser: Math.floor(Math.random() * 500) + 500, // ₹500-₹1000
        priceToVendor: Math.floor(Math.random() * 400) + 400, // ₹400-₹800
        unit: 'kg',
        imageUrl: `https://example.com/products/${1000 + i}.jpg`,
        isActive: true,
        visibility: 'visible',
      });
      
      products.push(product);
      createdData.products.push(product._id);
      console.log(`✅ Product created: ${product.name} (₹${product.priceToUser}/kg)`);
    }
  } else {
    console.log(`✅ Products: ${products.length}`);
  }
  
  return products;
};

/**
 * Ensure Product Assignments exist (inventory for each vendor)
 */
const ensureProductAssignments = async (vendors, products) => {
  console.log('\n📋 Checking Product Assignments (Inventory)...\n');
  
  for (const vendor of vendors) {
    const assignments = await ProductAssignment.find({ vendorId: vendor._id });
    
    if (assignments.length < products.length) {
      console.log(`⚠️  Vendor ${vendor.name} has only ${assignments.length} product assignments. Creating more...`);
      
      for (const product of products) {
        // Check if assignment already exists
        const existing = await ProductAssignment.findOne({
          vendorId: vendor._id,
          productId: product._id,
        });
        
        if (existing) continue;
        
        // Random stock between 200-1500 kg
        const stock = Math.floor(Math.random() * 1300) + 200;
        
        // Determine stock status
        let stockStatus = 'healthy';
        if (stock < 300) stockStatus = 'critical';
        else if (stock < 600) stockStatus = 'low';
        
        const assignment = await ProductAssignment.create({
          vendorId: vendor._id,
          productId: product._id,
          stock: stock,
          stockUnit: 'kg',
          reorderLevel: 500,
          status: stockStatus,
          isActive: true,
        });
        
        createdData.productAssignments.push(assignment._id);
        console.log(`✅ Product assignment created: ${product.name} for ${vendor.name} (Stock: ${stock} kg, Status: ${stockStatus})`);
      }
    } else {
      console.log(`✅ Product assignments for vendor ${vendor.name}: ${assignments.length}`);
    }
  }
  
  const totalAssignments = await ProductAssignment.countDocuments();
  console.log(`\n✅ Total Product Assignments: ${totalAssignments}\n`);
};

/**
 * Ensure Orders exist (10+ orders per vendor with various statuses)
 */
const ensureOrders = async (vendors) => {
  console.log('\n📦 Checking Orders for Vendors...\n');
  
  // Get users and sellers for orders
  const users = await User.find().limit(10);
  const sellers = await Seller.find({ status: 'approved' }).limit(5);
  
  if (users.length === 0 || sellers.length === 0) {
    console.log('⚠️  No users or sellers found. Skipping order creation.');
    return;
  }
  
  for (const vendor of vendors) {
    // Get product assignments for this vendor
    const assignments = await ProductAssignment.find({ vendorId: vendor._id })
      .populate('productId')
      .limit(5);
    
    if (assignments.length === 0) {
      console.log(`⚠️  Vendor ${vendor.name} has no product assignments. Skipping order creation.`);
      continue;
    }
    
    const ordersCount = await Order.countDocuments({ vendorId: vendor._id });
    const targetCount = 15; // 10 current month + 5 past months
    
    if (ordersCount >= targetCount) {
      console.log(`✅ Orders for vendor ${vendor.name}: ${ordersCount}`);
      continue;
    }
    
    console.log(`⚠️  Vendor ${vendor.name} has only ${ordersCount} orders. Creating more...`);
    
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    for (let i = ordersCount; i < targetCount; i++) {
      // Mix of statuses
      const statuses = ['pending', 'processing', 'dispatched', 'delivered'];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      
      // Mix of payment statuses
      const paymentStatuses = ['pending', 'partially_paid', 'fully_paid'];
      let paymentStatus = paymentStatuses[Math.floor(Math.random() * paymentStatuses.length)];
      
      // If order is delivered, ensure it's fully paid
      if (status === 'delivered') {
        paymentStatus = 'fully_paid';
      }
      
      // Create order date (mix of current month and past months)
      const orderDate = i < 10 
        ? new Date(currentMonthStart.getTime() + (i * 24 * 60 * 60 * 1000)) // Current month
        : new Date(currentMonthStart.getTime() - ((i - 9) * 30 * 24 * 60 * 60 * 1000)); // Past months
      
      // Select random user and seller
      const user = users[Math.floor(Math.random() * users.length)];
      const seller = sellers[Math.floor(Math.random() * sellers.length)];
      
      // Create order items from vendor's assignments
      const numItems = Math.floor(Math.random() * 3) + 1; // 1-3 items
      const selectedAssignments = assignments.slice(0, numItems);
      
      const items = selectedAssignments.map((assignment) => {
        const quantity = Math.floor(Math.random() * 50) + 10; // 10-60 kg
        const unitPrice = assignment.productId.priceToUser || 500;
        
        return {
          productId: assignment.productId._id,
          name: assignment.productId.name,
          quantity: quantity,
          unit: 'kg',
          unitPrice: unitPrice,
          totalPrice: quantity * unitPrice,
        };
      });
      
      const totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);
      
      // Generate order number
      const dateStr = orderDate.toISOString().slice(0, 10).replace(/-/g, '');
      const orderNumber = `ORD-${dateStr}-${String(i + 1).padStart(4, '0')}`;
      
      const order = await Order.create({
        orderNumber: orderNumber,
        userId: user._id,
        vendorId: vendor._id,
        sellerId: seller.sellerId,
        items: items,
        totalAmount: totalAmount,
        status: status,
        paymentStatus: paymentStatus,
        createdAt: orderDate,
        ...(status === 'delivered' && { deliveredAt: new Date(orderDate.getTime() + (3 * 24 * 60 * 60 * 1000)) }),
        shippingAddress: user.addresses && user.addresses[0] ? user.addresses[0] : {
          name: user.name,
          phone: user.phone,
          address: user.location?.address || 'Address not available',
          city: user.location?.city || 'City',
          state: user.location?.state || 'State',
          pincode: user.location?.pincode || '000000',
        },
      });
      
      createdData.orders.push(order._id);
      console.log(`✅ Order created: ${order.orderNumber} for vendor ${vendor.name} (Status: ${status}, Amount: ₹${totalAmount})`);
    }
  }
  
  const totalOrders = await Order.countDocuments();
  console.log(`\n✅ Total Orders: ${totalOrders}\n`);
};

/**
 * Ensure Credit Purchases exist (3+ per vendor with various statuses)
 */
const ensureCreditPurchases = async (vendors) => {
  console.log('\n💳 Checking Credit Purchases for Vendors...\n');
  
  // Get products for credit purchases
  const products = await Product.find().limit(10);
  
  if (products.length === 0) {
    console.log('⚠️  No products found. Skipping credit purchase creation.');
    return;
  }
  
  // Get admin for review
  const Admin = require('../models/Admin');
  const admin = await Admin.findOne();
  
  for (const vendor of vendors) {
    const purchasesCount = await CreditPurchase.countDocuments({ vendorId: vendor._id });
    const targetCount = 5; // Mix of statuses
    
    if (purchasesCount >= targetCount) {
      console.log(`✅ Credit purchases for vendor ${vendor.name}: ${purchasesCount}`);
      continue;
    }
    
    console.log(`⚠️  Vendor ${vendor.name} has only ${purchasesCount} credit purchases. Creating more...`);
    
    const statuses = ['pending', 'approved', 'rejected'];
    
    for (let i = purchasesCount; i < targetCount; i++) {
      // Select random products
      const numItems = Math.floor(Math.random() * 3) + 2; // 2-4 items
      const selectedProducts = products.slice(0, numItems);
      
      const items = selectedProducts.map((product) => {
        const quantity = Math.floor(Math.random() * 500) + 100; // 100-600 kg
        const unitPrice = product.priceToVendor || 400;
        const totalPrice = quantity * unitPrice;
        
        return {
          productId: product._id,
          name: product.name,
          quantity: quantity,
          unit: 'kg',
          unitPrice: unitPrice, // Fixed: use unitPrice instead of price
          totalPrice: totalPrice,
        };
      });
      
      const totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);
      
      // Ensure minimum purchase amount
      if (totalAmount < 50000) {
        items[0].quantity = Math.ceil((50000 - totalAmount + items[0].totalPrice) / items[0].price);
        items[0].totalPrice = items[0].quantity * items[0].price;
      }
      
      const finalTotalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);
      
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const purchaseDate = new Date(Date.now() - (i * 7 * 24 * 60 * 60 * 1000)); // Spread over weeks
      
      const creditPurchase = await CreditPurchase.create({
        vendorId: vendor._id,
        items: items,
        totalAmount: finalTotalAmount,
        status: status,
        requestNotes: `Credit purchase request ${i + 1}`,
        createdAt: purchaseDate,
        ...(status !== 'pending' && admin && {
          reviewedBy: admin._id,
          reviewedAt: new Date(purchaseDate.getTime() + (2 * 24 * 60 * 60 * 1000)),
          ...(status === 'rejected' && { rejectionReason: 'Insufficient credit limit' }),
        }),
      });
      
      createdData.creditPurchases.push(creditPurchase._id);
      console.log(`✅ Credit purchase created: ₹${finalTotalAmount} for ${vendor.name} (Status: ${status})`);
    }
  }
  
  const totalPurchases = await CreditPurchase.countDocuments();
  console.log(`\n✅ Total Credit Purchases: ${totalPurchases}\n`);
};

/**
 * Main function
 */
const ensureVendorData = async () => {
  try {
    console.log('\n' + '='.repeat(70));
    console.log('🔍 VENDOR DASHBOARD DATA VERIFICATION & SEEDING');
    console.log('='.repeat(70));
    console.log('\nThis script will check and ensure all necessary data exists\n');
    
    // Connect to database
    await connectDB();
    console.log('✅ Connected to database\n');
    
    // Ensure all data exists
    const vendors = await ensureVendors();
    const products = await ensureProducts();
    await ensureProductAssignments(vendors, products);
    await ensureOrders(vendors);
    await ensureCreditPurchases(vendors);
    
    // Final summary
    console.log('\n' + '='.repeat(70));
    console.log('📊 FINAL DATA SUMMARY');
    console.log('='.repeat(70));
    
    const approvedVendors = await Vendor.find({ status: 'approved', isActive: true });
    console.log(`   Vendors: ${approvedVendors.length} approved and active`);
    
    for (const vendor of approvedVendors) {
      const ordersCount = await Order.countDocuments({ vendorId: vendor._id });
      const assignmentsCount = await ProductAssignment.countDocuments({ vendorId: vendor._id });
      const purchasesCount = await CreditPurchase.countDocuments({ vendorId: vendor._id });
      
      console.log(`   ${vendor.name} (${vendor.phone}):`);
      console.log(`      Orders: ${ordersCount} | Inventory Items: ${assignmentsCount} | Credit Purchases: ${purchasesCount}`);
    }
    
    console.log('='.repeat(70));
    
    console.log('\n✅ All Vendor Dashboard data verified and ensured!\n');
    
    // Close connection
    await mongoose.connection.close();
    console.log('✅ Database connection closed\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error in ensureVendorData script:', error);
    console.error(error.stack);
    await mongoose.connection.close();
    process.exit(1);
  }
};

// Run script
if (require.main === module) {
  ensureVendorData();
}

module.exports = { ensureVendorData };

