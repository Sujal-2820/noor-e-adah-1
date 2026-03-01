/**
 * Ensure Admin Dashboard Data Script
 * 
 * This script checks MongoDB collections and ensures all necessary data
 * exists for the Admin Dashboard to work without errors.
 * 
 * It will:
 * 1. Check for Admin user (create if missing)
 * 2. Check for Products (create if missing or insufficient)
 * 3. Check for Vendors (create if missing or insufficient - need approved and pending)
 * 4. Check for Sellers (create if missing or insufficient - need approved and pending)
 * 5. Check for Users (create if missing or insufficient - need active, blocked)
 * 6. Check for Orders (create if missing - need various statuses)
 * 7. Check for Payments (create if missing)
 * 8. Check for CreditPurchases (create if missing - need pending ones)
 * 9. Check for WithdrawalRequests (create if missing - need pending ones)
 * 10. Check for ProductAssignments (create if missing)
 * 11. Check for escalated orders (assignedTo: 'admin')
 * 
 * Usage: node scripts/ensureAdminData.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB } = require('../config/database');

// Import all models
const Admin = require('../models/Admin');
const Product = require('../models/Product');
const Vendor = require('../models/Vendor');
const Seller = require('../models/Seller');
const User = require('../models/User');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const CreditPurchase = require('../models/CreditPurchase');
const WithdrawalRequest = require('../models/WithdrawalRequest');
const ProductAssignment = require('../models/ProductAssignment');
const Commission = require('../models/Commission');
const Address = require('../models/Address');
const Cart = require('../models/Cart');

// Import constants
const { ORDER_STATUS, PAYMENT_STATUS, PAYMENT_METHODS, MIN_ORDER_VALUE, MIN_VENDOR_PURCHASE } = require('../utils/constants');

let createdData = {
  products: [],
  vendors: [],
  sellers: [],
  users: [],
  orders: [],
  payments: [],
  creditPurchases: [],
  withdrawalRequests: [],
  productAssignments: [],
};

/**
 * Ensure Admin user exists
 */
const ensureAdmin = async () => {
  console.log('\n🔐 Checking Admin User...\n');
  
  const adminPhone = '8878495502';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  let admin = await Admin.findOne({ phone: adminPhone });
  
  if (!admin) {
    admin = await Admin.create({
      phone: adminPhone,
      password: adminPassword,
      name: 'Admin',
      role: 'super_admin',
      isActive: true,
    });
    console.log('✅ Admin created:', admin.phone);
  } else {
    // Ensure password is set correctly
    const tempAdmin = await Admin.findById(admin._id).select('+password');
    const isPasswordMatch = await tempAdmin.comparePassword(adminPassword);
    if (!isPasswordMatch) {
      admin.password = adminPassword;
      await admin.save();
      console.log('✅ Admin password updated');
    } else {
      console.log('✅ Admin already exists:', admin.phone);
    }
  }
  
  return admin;
};

/**
 * Ensure Products exist (at least 10 products)
 */
const ensureProducts = async () => {
  console.log('\n📦 Checking Products...\n');
  
  const existingProducts = await Product.countDocuments();
  const targetCount = 10;
  
  if (existingProducts >= targetCount) {
    console.log(`✅ Products already exist: ${existingProducts}`);
    const products = await Product.find().limit(targetCount);
    createdData.products = products.map(p => p._id);
    return;
  }
  
  console.log(`⚠️  Only ${existingProducts} products found. Creating more...`);
  
  const productsData = [
    {
      name: 'Urea 46% Nitrogen',
      description: 'High-grade urea fertilizer with 46% nitrogen content',
      category: 'fertilizer',
      sku: 'FERT-UREA-001',
      priceToVendor: 500,
      priceToUser: 650,
      stock: 1000,
      images: [{ url: 'https://via.placeholder.com/400?text=Urea', isPrimary: true }],
      brand: 'AgriGold',
      weight: { value: 50, unit: 'kg' },
      tags: ['urea', 'nitrogen'],
      isActive: true,
    },
    {
      name: 'DAP Fertilizer',
      description: 'Premium DAP fertilizer with high phosphorus and nitrogen',
      category: 'fertilizer',
      sku: 'FERT-DAP-001',
      priceToVendor: 650,
      priceToUser: 850,
      stock: 800,
      images: [{ url: 'https://via.placeholder.com/400?text=DAP', isPrimary: true }],
      brand: 'FarmPro',
      weight: { value: 50, unit: 'kg' },
      tags: ['dap', 'phosphorus'],
      isActive: true,
    },
    {
      name: 'NPK 19:19:19 Complex',
      description: 'Balanced NPK complex fertilizer',
      category: 'fertilizer',
      sku: 'FERT-NPK-001',
      priceToVendor: 700,
      priceToUser: 950,
      stock: 600,
      images: [{ url: 'https://via.placeholder.com/400?text=NPK', isPrimary: true }],
      brand: 'CropMax',
      weight: { value: 50, unit: 'kg' },
      tags: ['npk', 'complex'],
      isActive: true,
    },
    {
      name: 'Potash (MOP)',
      description: 'High-grade potash fertilizer',
      category: 'fertilizer',
      sku: 'FERT-POT-001',
      priceToVendor: 550,
      priceToUser: 750,
      stock: 500,
      images: [{ url: 'https://via.placeholder.com/400?text=Potash', isPrimary: true }],
      brand: 'GreenField',
      weight: { value: 50, unit: 'kg' },
      tags: ['potash', 'potassium'],
      isActive: true,
    },
    {
      name: 'Glyphosate 41% Herbicide',
      description: 'Effective weed control herbicide',
      category: 'pesticide',
      sku: 'PEST-GLY-001',
      priceToVendor: 1200,
      priceToUser: 1600,
      stock: 300,
      images: [{ url: 'https://via.placeholder.com/400?text=Glyphosate', isPrimary: true }],
      brand: 'WeedKill',
      weight: { value: 1, unit: 'L' },
      tags: ['herbicide', 'weed'],
      isActive: true,
    },
    {
      name: 'Imidacloprid Insecticide',
      description: 'Systemic insecticide for pest control',
      category: 'pesticide',
      sku: 'PEST-IMI-001',
      priceToVendor: 800,
      priceToUser: 1100,
      stock: 400,
      images: [{ url: 'https://via.placeholder.com/400?text=Imidacloprid', isPrimary: true }],
      brand: 'PestGuard',
      weight: { value: 500, unit: 'ml' },
      tags: ['insecticide', 'pest'],
      isActive: true,
    },
    {
      name: 'Organic Compost',
      description: 'Rich organic compost for soil health',
      category: 'fertilizer',
      sku: 'FERT-ORG-001',
      priceToVendor: 300,
      priceToUser: 450,
      stock: 2000,
      images: [{ url: 'https://via.placeholder.com/400?text=Compost', isPrimary: true }],
      brand: 'EcoFarm',
      weight: { value: 50, unit: 'kg' },
      tags: ['organic', 'compost'],
      isActive: true,
    },
    {
      name: 'Neem Oil',
      description: 'Natural neem oil for organic pest control',
      category: 'pesticide',
      sku: 'PEST-NEE-001',
      priceToVendor: 600,
      priceToUser: 850,
      stock: 500,
      images: [{ url: 'https://via.placeholder.com/400?text=Neem', isPrimary: true }],
      brand: 'NaturalGuard',
      weight: { value: 1, unit: 'L' },
      tags: ['neem', 'organic'],
      isActive: true,
    },
    {
      name: 'Single Super Phosphate',
      description: 'SSP fertilizer with high phosphorus',
      category: 'fertilizer',
      sku: 'FERT-SSP-001',
      priceToVendor: 450,
      priceToUser: 600,
      stock: 700,
      images: [{ url: 'https://via.placeholder.com/400?text=SSP', isPrimary: true }],
      brand: 'PhosPro',
      weight: { value: 50, unit: 'kg' },
      tags: ['ssp', 'phosphorus'],
      isActive: true,
    },
    {
      name: 'Zinc Sulphate',
      description: 'Micronutrient fertilizer with zinc',
      category: 'fertilizer',
      sku: 'FERT-ZIN-001',
      priceToVendor: 400,
      priceToUser: 550,
      stock: 600,
      images: [{ url: 'https://via.placeholder.com/400?text=Zinc', isPrimary: true }],
      brand: 'MicroNutri',
      weight: { value: 25, unit: 'kg' },
      tags: ['zinc', 'micronutrient'],
      isActive: true,
    },
  ];
  
  // Create products that don't exist
  for (const productData of productsData) {
    const existing = await Product.findOne({ sku: productData.sku });
    if (!existing) {
      const product = await Product.create(productData);
      createdData.products.push(product._id);
      console.log(`✅ Product created: ${product.name}`);
    } else {
      createdData.products.push(existing._id);
    }
  }
  
  const totalProducts = await Product.countDocuments();
  console.log(`\n✅ Total Products: ${totalProducts}\n`);
};

/**
 * Ensure Vendors exist (need approved and pending)
 */
const ensureVendors = async () => {
  console.log('\n🏢 Checking Vendors...\n');
  
  const approvedCount = await Vendor.countDocuments({ status: 'approved', isActive: true });
  const pendingCount = await Vendor.countDocuments({ status: 'pending' });
  const targetApproved = 5;
  const targetPending = 2;
  
  // Create approved vendors if needed
  if (approvedCount < targetApproved) {
    console.log(`⚠️  Only ${approvedCount} approved vendors. Creating more...`);
    
    const locations = [
      { lat: 28.6139, lng: 77.2090, city: 'Delhi', state: 'Delhi', address: '123 Vendor Street, Delhi' },
      { lat: 19.0760, lng: 72.8777, city: 'Mumbai', state: 'Maharashtra', address: '456 Farm Road, Mumbai' },
      { lat: 12.9716, lng: 77.5946, city: 'Bangalore', state: 'Karnataka', address: '789 Agri Lane, Bangalore' },
      { lat: 17.3850, lng: 78.4867, city: 'Hyderabad', state: 'Telangana', address: '321 Crop Avenue, Hyderabad' },
      { lat: 18.5204, lng: 73.8567, city: 'Pune', state: 'Maharashtra', address: '654 Grow Street, Pune' },
    ];
    
    for (let i = approvedCount; i < targetApproved; i++) {
      const location = locations[i % locations.length];
      const vendorData = {
        name: `Approved Vendor ${i + 1}`,
        phone: `+919${String(i).padStart(9, '0')}`,
        email: `vendor${i + 1}@irasathi.com`,
        location: {
          address: location.address,
          city: location.city,
          state: location.state,
          pincode: '110001',
          coordinates: { lat: location.lat + (i * 0.01), lng: location.lng + (i * 0.01) },
          coverageRadius: 20,
        },
        status: 'approved',
        isActive: true,
        approvedAt: new Date(Date.now() - (30 - i * 5) * 24 * 60 * 60 * 1000),
        creditPolicy: {
          limit: 500000 * (i + 1),
          repaymentDays: 30,
          penaltyRate: 2,
        },
        creditUsed: 100000 * i,
      };
      
      const vendor = await Vendor.create(vendorData);
      createdData.vendors.push(vendor._id);
      console.log(`✅ Approved vendor created: ${vendor.name} - ${vendor.location.city}`);
    }
  } else {
    console.log(`✅ Approved vendors: ${approvedCount}`);
    const vendors = await Vendor.find({ status: 'approved', isActive: true }).limit(targetApproved);
    createdData.vendors = vendors.map(v => v._id);
  }
  
  // Create pending vendors if needed
  if (pendingCount < targetPending) {
    console.log(`⚠️  Only ${pendingCount} pending vendors. Creating more...`);
    
    for (let i = pendingCount; i < targetPending; i++) {
      const vendorData = {
        name: `Pending Vendor ${i + 1}`,
        phone: `+9199${String(i).padStart(8, '0')}`,
        email: `pending${i + 1}@irasathi.com`,
        location: {
          address: `Pending Vendor Address ${i + 1}`,
          city: 'Test City',
          state: 'Test State',
          pincode: '100000',
          coordinates: { lat: 28.6139 + (i * 0.05), lng: 77.2090 + (i * 0.05) },
          coverageRadius: 20,
        },
        status: 'pending',
        isActive: false,
      };
      
      const vendor = await Vendor.create(vendorData);
      createdData.vendors.push(vendor._id);
      console.log(`✅ Pending vendor created: ${vendor.name}`);
    }
  } else {
    console.log(`✅ Pending vendors: ${pendingCount}`);
  }
  
  const totalVendors = await Vendor.countDocuments();
  console.log(`\n✅ Total Vendors: ${totalVendors}\n`);
};

/**
 * Ensure Sellers exist (need approved and pending)
 */
const ensureSellers = async () => {
  console.log('\n👤 Checking Sellers...\n');
  
  const approvedCount = await Seller.countDocuments({ status: 'approved', isActive: true });
  const pendingCount = await Seller.countDocuments({ status: 'pending' });
  const targetApproved = 5;
  const targetPending = 1;
  
  // Create approved sellers if needed
  if (approvedCount < targetApproved) {
    console.log(`⚠️  Only ${approvedCount} approved sellers. Creating more...`);
    
    const sellerData = [
      { sellerId: 'IRA-1001', name: 'Rajesh Kumar', phone: '+919111111111', area: 'North Delhi' },
      { sellerId: 'IRA-1002', name: 'Priya Sharma', phone: '+919222222222', area: 'South Mumbai' },
      { sellerId: 'IRA-1003', name: 'Amit Patel', phone: '+919333333333', area: 'West Bangalore' },
      { sellerId: 'IRA-1004', name: 'Sneha Reddy', phone: '+919444444444', area: 'East Hyderabad' },
      { sellerId: 'IRA-1005', name: 'Vikram Singh', phone: '+919555555555', area: 'Central Pune' },
    ];
    
    for (let i = approvedCount; i < targetApproved; i++) {
      const data = sellerData[i % sellerData.length];
      const existing = await Seller.findOne({ sellerId: data.sellerId });
      
      if (!existing) {
        const seller = await Seller.create({
          ...data,
          email: `${data.name.toLowerCase().replace(' ', '')}@irasathi.com`,
          location: {
            address: `${data.area} Address`,
            city: data.area.split(' ')[1] || 'Test City',
            state: 'Test State',
            pincode: '100000',
          },
          monthlyTarget: 100000 * (i + 1),
          status: 'approved',
          isActive: true,
          approvedAt: new Date(Date.now() - (30 - i * 5) * 24 * 60 * 60 * 1000),
          wallet: { balance: 5000 * (i + 1), pending: 1000 * i },
        });
        createdData.sellers.push(seller._id);
        console.log(`✅ Approved seller created: ${seller.name} - ${seller.sellerId}`);
      } else {
        createdData.sellers.push(existing._id);
      }
    }
  } else {
    console.log(`✅ Approved sellers: ${approvedCount}`);
    const sellers = await Seller.find({ status: 'approved', isActive: true }).limit(targetApproved);
    createdData.sellers = sellers.map(s => s._id);
  }
  
  // Create pending seller if needed
  if (pendingCount < targetPending) {
    console.log(`⚠️  Only ${pendingCount} pending sellers. Creating one...`);
    const seller = await Seller.create({
      sellerId: 'IRA-PENDING-001',
      name: 'Pending Seller',
      phone: '+919999999999',
      email: 'pending@irasathi.com',
      area: 'Test Area',
      location: {
        address: 'Pending Seller Address',
        city: 'Test City',
        state: 'Test State',
        pincode: '100000',
      },
      monthlyTarget: 50000,
      status: 'pending',
      isActive: false,
      wallet: { balance: 0, pending: 0 },
    });
    createdData.sellers.push(seller._id);
    console.log(`✅ Pending seller created: ${seller.name}`);
  } else {
    console.log(`✅ Pending sellers: ${pendingCount}`);
  }
  
  const totalSellers = await Seller.countDocuments();
  console.log(`\n✅ Total Sellers: ${totalSellers}\n`);
};

/**
 * Ensure Users exist (need active and blocked)
 */
const ensureUsers = async () => {
  console.log('\n👥 Checking Users...\n');
  
  const activeCount = await User.countDocuments({ isActive: true, isBlocked: false });
  const blockedCount = await User.countDocuments({ isBlocked: true });
  const targetActive = 10;
  const targetBlocked = 1;
  
  // Get approved sellers for sellerId references
  const approvedSellers = await Seller.find({ status: 'approved' }).limit(10);
  
  // Fix existing users with invalid sellerId references first
  if (approvedSellers.length > 0) {
    console.log('🔧 Fixing existing user sellerId references...');
    const allUsers = await User.find({ sellerId: { $exists: true, $ne: null } });
    const validSellerIds = approvedSellers.map(s => s.sellerId);
    
    for (const user of allUsers) {
      // Check if sellerId is valid
      if (user.sellerId && !validSellerIds.includes(user.sellerId)) {
        const seller = approvedSellers[Math.floor(Math.random() * approvedSellers.length)];
        user.sellerId = seller.sellerId;
        user.seller = seller._id;
        await user.save();
        console.log(`✅ Fixed sellerId for user ${user.name}: ${seller.sellerId}`);
      } else if (user.sellerId && validSellerIds.includes(user.sellerId)) {
        // Ensure seller reference is set
        const seller = approvedSellers.find(s => s.sellerId === user.sellerId);
        if (seller && (!user.seller || user.seller.toString() !== seller._id.toString())) {
          user.seller = seller._id;
          await user.save();
        }
      }
    }
  }
  
  // Create active users if needed
  if (activeCount < targetActive) {
    console.log(`⚠️  Only ${activeCount} active users. Creating more...`);
    
    for (let i = activeCount; i < targetActive; i++) {
      // Get a valid sellerId (string, not ObjectId)
      const seller = approvedSellers[i % approvedSellers.length];
      const sellerIdValue = seller ? seller.sellerId : (approvedSellers[0]?.sellerId || null);
      
      const userData = {
        name: `User ${i + 1}`,
        phone: `+9198${String(i).padStart(8, '0')}`,
        email: `user${i + 1}@irasathi.com`,
        location: {
          address: `User ${i + 1} Address`,
          city: 'Test City',
          state: 'Test State',
          pincode: '100000',
          coordinates: { lat: 28.6139 + (i * 0.01), lng: 77.2090 + (i * 0.01) },
        },
        sellerId: sellerIdValue, // Use sellerId string field
        seller: seller?._id, // Reference to Seller document
        isActive: true,
        isBlocked: false,
      };
      
      const user = await User.create(userData);
      createdData.users.push(user._id);
      console.log(`✅ Active user created: ${user.name} - ${user.phone} - Seller: ${sellerIdValue || 'None'}`);
    }
  } else {
    console.log(`✅ Active users: ${activeCount}`);
    const users = await User.find({ isActive: true, isBlocked: false }).limit(targetActive);
    createdData.users = users.map(u => u._id);
    
    // Fix existing users with invalid sellerId references
    if (approvedSellers.length > 0) {
      console.log('\n🔧 Fixing user sellerId references...');
      const usersWithInvalidSeller = await User.find({
        sellerId: { $exists: true, $ne: null },
        $expr: { $not: { $in: ['$sellerId', approvedSellers.map(s => s.sellerId)] } },
      });
      
      for (const user of usersWithInvalidSeller) {
        const seller = approvedSellers[Math.floor(Math.random() * approvedSellers.length)];
        user.sellerId = seller.sellerId;
        user.seller = seller._id;
        await user.save();
        console.log(`✅ Fixed sellerId for user ${user.name}: ${seller.sellerId}`);
      }
    }
  }
  
  // Create blocked user if needed
  if (blockedCount < targetBlocked) {
    console.log(`⚠️  Only ${blockedCount} blocked users. Creating one...`);
    const seller = approvedSellers[0];
    const user = await User.create({
      name: 'Blocked User',
      phone: '+919999999990',
      email: 'blocked@irasathi.com',
      location: {
        address: 'Blocked User Address',
        city: 'Test City',
        state: 'Test State',
        pincode: '100000',
      },
      sellerId: seller?.sellerId || null,
      seller: seller?._id,
      isActive: false,
      isBlocked: true,
    });
    createdData.users.push(user._id);
    console.log(`✅ Blocked user created: ${user.name}`);
  } else {
    console.log(`✅ Blocked users: ${blockedCount}`);
  }
  
  const totalUsers = await User.countDocuments();
  console.log(`\n✅ Total Users: ${totalUsers}\n`);
};

/**
 * Ensure Product Assignments exist
 */
const ensureProductAssignments = async () => {
  console.log('\n🔗 Checking Product Assignments...\n');
  
  const existingAssignments = await ProductAssignment.countDocuments();
  const targetCount = 20;
  
  if (existingAssignments >= targetCount) {
    console.log(`✅ Product Assignments already exist: ${existingAssignments}`);
    const assignments = await ProductAssignment.find().limit(targetCount);
    createdData.productAssignments = assignments.map(a => a._id);
    return;
  }
  
  console.log(`⚠️  Only ${existingAssignments} assignments. Creating more...`);
  
  // Get approved vendors and products
  const vendors = await Vendor.find({ status: 'approved', isActive: true }).limit(5);
  const products = await Product.find({ isActive: true }).limit(10);
  
  if (vendors.length === 0 || products.length === 0) {
    console.log('⚠️  Cannot create assignments: Need approved vendors and products');
    return;
  }
  
  let assignmentsCreated = 0;
  for (const product of products) {
    for (const vendor of vendors) {
      // Check if assignment already exists
      const existing = await ProductAssignment.findOne({
        productId: product._id,
        vendorId: vendor._id,
      });
      
      if (!existing && assignmentsCreated < targetCount) {
        await ProductAssignment.create({
          productId: product._id,
          vendorId: vendor._id,
          stock: Math.floor(Math.random() * 500) + 100,
          isActive: true,
        });
        assignmentsCreated++;
      }
    }
  }
  
  console.log(`✅ Product Assignments created: ${assignmentsCreated}`);
  const totalAssignments = await ProductAssignment.countDocuments();
  console.log(`\n✅ Total Product Assignments: ${totalAssignments}\n`);
};

/**
 * Ensure Orders exist (need various statuses including delivered with fully_paid)
 */
const ensureOrders = async () => {
  console.log('\n📦 Checking Orders...\n');
  
  const deliveredFullyPaidCount = await Order.countDocuments({
    status: 'delivered',
    paymentStatus: 'fully_paid',
  });
  const pendingCount = await Order.countDocuments({ status: 'pending' });
  const processingCount = await Order.countDocuments({ status: 'processing' });
  const escalatedCount = await Order.countDocuments({ assignedTo: 'admin' });
  const targetDelivered = 5;
  const targetPending = 2;
  const targetProcessing = 2;
  const targetEscalated = 2;
  
  // Get required data
  const vendors = await Vendor.find({ status: 'approved', isActive: true });
  const users = await User.find({ isActive: true, isBlocked: false });
  const products = await Product.find({ isActive: true });
  const sellers = await Seller.find({ status: 'approved' });
  
  if (vendors.length === 0 || users.length === 0 || products.length === 0) {
    console.log('⚠️  Cannot create orders: Need vendors, users, and products');
    return;
  }
  
  // Create delivered orders with fully_paid (for revenue stats)
  if (deliveredFullyPaidCount < targetDelivered) {
    console.log(`⚠️  Only ${deliveredFullyPaidCount} delivered/fully_paid orders. Creating more...`);
    
    for (let i = deliveredFullyPaidCount; i < targetDelivered; i++) {
      const vendor = vendors[i % vendors.length];
      const user = users[i % users.length];
      const seller = sellers[i % sellers.length];
      const product = products[i % products.length];
      
      const orderNumber = `ORD-${Date.now()}-${i}`;
      const totalAmount = 2000 + (i * 500); // Above minimum order value
      
      const order = await Order.create({
        orderNumber,
        userId: user._id,
        sellerId: seller?.sellerId || createdData.sellers[0]?.toString(),
        seller: seller?._id || createdData.sellers[0],
        vendorId: vendor._id,
        assignedTo: 'vendor',
        items: [{
          productId: product._id,
          productName: product.name,
          quantity: 2 + i,
          unitPrice: product.priceToUser,
          totalPrice: product.priceToUser * (2 + i),
          status: 'accepted',
        }],
        subtotal: totalAmount,
        deliveryCharge: 0,
        deliveryChargeWaived: true,
        totalAmount,
        paymentPreference: 'full',
        upfrontAmount: totalAmount,
        remainingAmount: 0,
        paymentStatus: 'fully_paid',
        deliveryAddress: {
          ...user.location,
          name: user.name,
          phone: user.phone,
        },
        status: 'delivered',
        statusTimeline: [
          { status: 'pending', timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), updatedBy: 'system' },
          { status: 'processing', timestamp: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000), updatedBy: 'vendor' },
          { status: 'dispatched', timestamp: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), updatedBy: 'vendor' },
          { status: 'delivered', timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), updatedBy: 'vendor' },
        ],
        deliveredAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        expectedDeliveryDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      });
      
      // Create payment for delivered order
      const paymentId = `PAY-${Date.now()}-${i}`;
      await Payment.create({
        paymentId,
        orderId: order._id,
        userId: user._id,
        amount: totalAmount,
        paymentMethod: 'razorpay',
        paymentType: 'full',
        status: 'fully_paid',
        gatewayPaymentId: `gateway_${Date.now()}_${i}`,
        gatewayTransactionId: `txn_${Date.now()}_${i}`,
      });
      
      createdData.orders.push(order._id);
      console.log(`✅ Delivered/fully_paid order created: ${order.orderNumber}`);
    }
  } else {
    console.log(`✅ Delivered/fully_paid orders: ${deliveredFullyPaidCount}`);
  }
  
  // Create pending orders
  if (pendingCount < targetPending) {
    console.log(`⚠️  Only ${pendingCount} pending orders. Creating more...`);
    
    for (let i = pendingCount; i < targetPending; i++) {
      const vendor = vendors[i % vendors.length];
      const user = users[i % users.length];
      const seller = sellers[i % sellers.length];
      const product = products[i % products.length];
      
      const orderNumber = `ORD-${Date.now()}-P${i}`;
      const totalAmount = 2500;
      const upfrontAmount = Math.floor(totalAmount * 0.3);
      
      const order = await Order.create({
        orderNumber,
        userId: user._id,
        sellerId: seller?.sellerId || createdData.sellers[0]?.toString(),
        seller: seller?._id || createdData.sellers[0],
        vendorId: vendor._id,
        assignedTo: 'vendor',
        items: [{
          productId: product._id,
          productName: product.name,
          quantity: 3,
          unitPrice: product.priceToUser,
          totalPrice: product.priceToUser * 3,
          status: 'pending',
        }],
        subtotal: totalAmount - 50,
        deliveryCharge: 50,
        deliveryChargeWaived: false,
        totalAmount,
        paymentPreference: 'partial',
        upfrontAmount,
        remainingAmount: totalAmount - upfrontAmount,
        paymentStatus: 'partial_paid',
        deliveryAddress: {
          ...user.location,
          name: user.name,
          phone: user.phone,
        },
        status: 'pending',
      });
      
      createdData.orders.push(order._id);
      console.log(`✅ Pending order created: ${order.orderNumber}`);
    }
  } else {
    console.log(`✅ Pending orders: ${pendingCount}`);
  }
  
  // Create processing orders
  if (processingCount < targetProcessing) {
    console.log(`⚠️  Only ${processingCount} processing orders. Creating more...`);
    
    for (let i = processingCount; i < targetProcessing; i++) {
      const vendor = vendors[i % vendors.length];
      const user = users[i % users.length];
      const seller = sellers[i % sellers.length];
      const product = products[i % products.length];
      
      const orderNumber = `ORD-${Date.now()}-PR${i}`;
      const totalAmount = 3000;
      
      const order = await Order.create({
        orderNumber,
        userId: user._id,
        sellerId: seller?.sellerId || createdData.sellers[0]?.toString(),
        seller: seller?._id || createdData.sellers[0],
        vendorId: vendor._id,
        assignedTo: 'vendor',
        items: [{
          productId: product._id,
          productName: product.name,
          quantity: 4,
          unitPrice: product.priceToUser,
          totalPrice: product.priceToUser * 4,
          status: 'accepted',
        }],
        subtotal: totalAmount,
        deliveryCharge: 0,
        deliveryChargeWaived: true,
        totalAmount,
        paymentPreference: 'full',
        upfrontAmount: totalAmount,
        remainingAmount: 0,
        paymentStatus: 'fully_paid',
        deliveryAddress: {
          ...user.location,
          name: user.name,
          phone: user.phone,
        },
        status: 'processing',
        statusTimeline: [
          { status: 'pending', timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), updatedBy: 'system' },
          { status: 'processing', timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), updatedBy: 'vendor' },
        ],
      });
      
      createdData.orders.push(order._id);
      console.log(`✅ Processing order created: ${order.orderNumber}`);
    }
  } else {
    console.log(`✅ Processing orders: ${processingCount}`);
  }
  
  // Create escalated orders (assigned to admin)
  if (escalatedCount < targetEscalated) {
    console.log(`⚠️  Only ${escalatedCount} escalated orders. Creating more...`);
    
    for (let i = escalatedCount; i < targetEscalated; i++) {
      const user = users[i % users.length];
      const seller = sellers[i % sellers.length];
      const product = products[i % products.length];
      
      const orderNumber = `ORD-${Date.now()}-ESC${i}`;
      const totalAmount = 3500;
      
      const order = await Order.create({
        orderNumber,
        userId: user._id,
        sellerId: seller?.sellerId || createdData.sellers[0]?.toString(),
        seller: seller?._id || createdData.sellers[0],
        vendorId: null, // No vendor - escalated
        assignedTo: 'admin',
        items: [{
          productId: product._id,
          productName: product.name,
          quantity: 5,
          unitPrice: product.priceToUser,
          totalPrice: product.priceToUser * 5,
          status: 'rejected',
        }],
        subtotal: totalAmount,
        deliveryCharge: 50,
        deliveryChargeWaived: false,
        totalAmount,
        paymentPreference: 'partial',
        upfrontAmount: Math.floor(totalAmount * 0.3),
        remainingAmount: totalAmount - Math.floor(totalAmount * 0.3),
        paymentStatus: 'partial_paid',
        deliveryAddress: {
          ...user.location,
          name: user.name,
          phone: user.phone,
        },
        status: 'rejected',
        notes: 'Order escalated to admin - vendor rejected',
        statusTimeline: [
          { status: 'pending', timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), updatedBy: 'system' },
          { status: 'rejected', timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), updatedBy: 'vendor', note: 'Vendor rejected order' },
        ],
      });
      
      createdData.orders.push(order._id);
      console.log(`✅ Escalated order created: ${order.orderNumber}`);
    }
  } else {
    console.log(`✅ Escalated orders: ${escalatedCount}`);
  }
  
  const totalOrders = await Order.countDocuments();
  console.log(`\n✅ Total Orders: ${totalOrders}\n`);
};

/**
 * Ensure Payments exist
 */
const ensurePayments = async () => {
  console.log('\n💳 Checking Payments...\n');
  
  const pendingCount = await Payment.countDocuments({ status: 'pending' });
  const completedCount = await Payment.countDocuments({ status: 'fully_paid' });
  const targetPending = 3;
  const targetCompleted = 5;
  
  const orders = await Order.find().limit(10);
  if (orders.length === 0) {
    console.log('⚠️  Cannot create payments: Need orders first');
    return;
  }
  
  // Create pending payments
  if (pendingCount < targetPending) {
    console.log(`⚠️  Only ${pendingCount} pending payments. Creating more...`);
    
    const pendingOrders = await Order.find({ paymentStatus: { $ne: 'fully_paid' } }).limit(targetPending);
    
    for (let i = 0; i < Math.min(pendingOrders.length, targetPending - pendingCount); i++) {
      const order = pendingOrders[i];
      
      // Check if payment already exists
      const existingPayment = await Payment.findOne({ orderId: order._id });
      if (existingPayment) continue;
      
      const paymentId = `PAY-${Date.now()}-P${i}`;
      await Payment.create({
        paymentId,
        orderId: order._id,
        userId: order.userId,
        amount: order.remainingAmount || order.totalAmount - (order.upfrontAmount || 0),
        paymentMethod: 'razorpay',
        paymentType: 'remaining',
        status: 'pending',
      });
      
      console.log(`✅ Pending payment created: ${paymentId}`);
    }
  } else {
    console.log(`✅ Pending payments: ${pendingCount}`);
  }
  
  // Completed payments are created with delivered orders, so we check
  if (completedCount < targetCompleted) {
    console.log(`⚠️  Only ${completedCount} completed payments. Need more delivered orders.`);
  } else {
    console.log(`✅ Completed payments: ${completedCount}`);
  }
  
  const totalPayments = await Payment.countDocuments();
  console.log(`\n✅ Total Payments: ${totalPayments}\n`);
};

/**
 * Ensure Credit Purchases exist (need pending ones)
 */
const ensureCreditPurchases = async () => {
  console.log('\n💳 Checking Credit Purchases...\n');
  
  const pendingCount = await CreditPurchase.countDocuments({ status: 'pending' });
  const targetPending = 3;
  
  if (pendingCount >= targetPending) {
    console.log(`✅ Pending credit purchases: ${pendingCount}`);
    return;
  }
  
  console.log(`⚠️  Only ${pendingCount} pending credit purchases. Creating more...`);
  
  const vendors = await Vendor.find({ status: 'approved', isActive: true });
  const products = await Product.find({ isActive: true });
  
  if (vendors.length === 0 || products.length === 0) {
    console.log('⚠️  Cannot create credit purchases: Need approved vendors and products');
    return;
  }
  
  for (let i = pendingCount; i < targetPending; i++) {
    const vendor = vendors[i % vendors.length];
    const product = products[i % products.length];
    
    // Calculate quantity to meet minimum purchase
    const minQuantity = Math.ceil(MIN_VENDOR_PURCHASE / product.priceToVendor);
    const quantity = Math.max(minQuantity, 10 + (i * 5));
    const unitPrice = product.priceToVendor;
    const totalPrice = unitPrice * quantity;
    
    const items = [{
      productId: product._id,
      quantity,
      unitPrice,
      totalPrice,
    }];
    
    // Calculate totalAmount from items (must match sum)
    const totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);
    
    const purchase = await CreditPurchase.create({
      vendorId: vendor._id,
      items,
      totalAmount,
      status: 'pending',
      notes: `Credit purchase request ${i + 1}`,
    });
    
    createdData.creditPurchases.push(purchase._id);
    console.log(`✅ Pending credit purchase created: ₹${purchase.totalAmount} for ${vendor.name}`);
  }
  
  const totalPurchases = await CreditPurchase.countDocuments();
  console.log(`\n✅ Total Credit Purchases: ${totalPurchases}\n`);
};

/**
 * Ensure Withdrawal Requests exist (need pending ones)
 */
const ensureWithdrawalRequests = async () => {
  console.log('\n💰 Checking Withdrawal Requests...\n');
  
  const pendingCount = await WithdrawalRequest.countDocuments({ status: 'pending' });
  const targetPending = 2;
  
  if (pendingCount >= targetPending) {
    console.log(`✅ Pending withdrawal requests: ${pendingCount}`);
    return;
  }
  
  console.log(`⚠️  Only ${pendingCount} pending withdrawal requests. Creating more...`);
  
  const sellers = await Seller.find({ status: 'approved', isActive: true });
  
  if (sellers.length === 0) {
    console.log('⚠️  Cannot create withdrawal requests: Need approved sellers');
    return;
  }
  
  for (let i = pendingCount; i < targetPending; i++) {
    const seller = sellers[i % sellers.length];
    
    const withdrawal = await WithdrawalRequest.create({
      sellerId: seller._id,
      amount: 5000 + (i * 2000),
      status: 'pending',
      bankDetails: {
        accountNumber: `ACC${i}123456`,
        ifscCode: 'BANK0001234',
        accountHolderName: seller.name,
        bankName: 'Test Bank',
      },
      reason: `Withdrawal request ${i + 1}`,
    });
    
    createdData.withdrawalRequests.push(withdrawal._id);
    console.log(`✅ Pending withdrawal request created: ₹${withdrawal.amount} for ${seller.name}`);
  }
  
  const totalWithdrawals = await WithdrawalRequest.countDocuments();
  console.log(`\n✅ Total Withdrawal Requests: ${totalWithdrawals}\n`);
};

/**
 * Main function
 */
const ensureAdminData = async () => {
  try {
    console.log('\n' + '='.repeat(70));
    console.log('🔍 ADMIN DASHBOARD DATA VERIFICATION & SEEDING');
    console.log('='.repeat(70));
    console.log('\nThis script will check and ensure all necessary data exists\n');
    
    // Connect to database
    await connectDB();
    console.log('✅ Connected to database\n');
    
    // Ensure all data exists
    await ensureAdmin();
    await ensureProducts();
    await ensureVendors();
    await ensureSellers();
    await ensureUsers();
    await ensureProductAssignments();
    await ensureOrders();
    await ensurePayments();
    await ensureCreditPurchases();
    await ensureWithdrawalRequests();
    
    // Final summary
    console.log('\n' + '='.repeat(70));
    console.log('📊 FINAL DATA SUMMARY');
    console.log('='.repeat(70));
    console.log(`   Admin: ${await Admin.countDocuments()}`);
    console.log(`   Products: ${await Product.countDocuments()} (Active: ${await Product.countDocuments({ isActive: true })})`);
    console.log(`   Vendors: ${await Vendor.countDocuments()} (Approved: ${await Vendor.countDocuments({ status: 'approved', isActive: true })} | Pending: ${await Vendor.countDocuments({ status: 'pending' })})`);
    console.log(`   Sellers: ${await Seller.countDocuments()} (Approved: ${await Seller.countDocuments({ status: 'approved', isActive: true })} | Pending: ${await Seller.countDocuments({ status: 'pending' })})`);
    console.log(`   Users: ${await User.countDocuments()} (Active: ${await User.countDocuments({ isActive: true, isBlocked: false })} | Blocked: ${await User.countDocuments({ isBlocked: true })})`);
    console.log(`   Product Assignments: ${await ProductAssignment.countDocuments()}`);
    console.log(`   Orders: ${await Order.countDocuments()} (Delivered/Fully Paid: ${await Order.countDocuments({ status: 'delivered', paymentStatus: 'fully_paid' })} | Pending: ${await Order.countDocuments({ status: 'pending' })} | Processing: ${await Order.countDocuments({ status: 'processing' })} | Escalated: ${await Order.countDocuments({ assignedTo: 'admin' })})`);
    console.log(`   Payments: ${await Payment.countDocuments()} (Pending: ${await Payment.countDocuments({ status: 'pending' })} | Completed: ${await Payment.countDocuments({ status: 'fully_paid' })})`);
    console.log(`   Credit Purchases: ${await CreditPurchase.countDocuments()} (Pending: ${await CreditPurchase.countDocuments({ status: 'pending' })})`);
    console.log(`   Withdrawal Requests: ${await WithdrawalRequest.countDocuments()} (Pending: ${await WithdrawalRequest.countDocuments({ status: 'pending' })})`);
    console.log('='.repeat(70));
    
    console.log('\n✅ All Admin Dashboard data verified and ensured!\n');
    
    // Close connection
    await mongoose.connection.close();
    console.log('✅ Database connection closed\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error in ensureAdminData script:', error);
    console.error(error.stack);
    await mongoose.connection.close();
    process.exit(1);
  }
};

// Run script
if (require.main === module) {
  ensureAdminData();
}

module.exports = { ensureAdminData };

