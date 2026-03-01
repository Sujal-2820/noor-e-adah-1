/**
 * Ensure User Dashboard Data Script
 * 
 * This script checks MongoDB collections and ensures all necessary data
 * exists for the User Dashboard to work without errors.
 * 
 * It will:
 * 1. Check for Approved Vendors with location data (create if missing - 5+ vendors)
 * 2. Check for Products (create if missing - 10+ products)
 * 3. Check for ProductAssignments (inventory) (create if missing - 15+ per vendor)
 * 4. Check for Approved Sellers (create if missing - needed for sellerId linking)
 * 5. Check for Users (create if missing - 10+ active users, some with sellerId)
 * 6. Check for Carts (create if missing - cart for each user)
 * 7. Check for Addresses (create if missing - 2+ addresses per user)
 * 8. Check for Orders (create if missing - 10+ orders per user with various statuses)
 * 9. Check for Payments (create if missing - linked to orders)
 * 
 * Usage: node scripts/ensureUserData.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB } = require('../config/database');

// Import all models
const Vendor = require('../models/Vendor');
const Product = require('../models/Product');
const ProductAssignment = require('../models/ProductAssignment');
const Seller = require('../models/Seller');
const User = require('../models/User');
const Cart = require('../models/Cart');
const Address = require('../models/Address');
const Order = require('../models/Order');
const Payment = require('../models/Payment');

// Import constants
const { ORDER_STATUS, PAYMENT_STATUS, PAYMENT_METHODS, MIN_ORDER_VALUE } = require('../utils/constants');

let createdData = {
  vendors: [],
  products: [],
  productAssignments: [],
  sellers: [],
  users: [],
  carts: [],
  addresses: [],
  orders: [],
  payments: [],
};

/**
 * Ensure Approved Vendors exist with location data
 */
const ensureVendors = async () => {
  console.log('\n🏪 Checking Approved Vendors...\n');
  
  const approvedCount = await Vendor.countDocuments({ status: 'approved', isActive: true });
  const targetCount = 5;
  
  if (approvedCount >= targetCount) {
    console.log(`✅ Approved vendors: ${approvedCount}`);
    const vendors = await Vendor.find({ status: 'approved', isActive: true }).limit(targetCount);
    createdData.vendors = vendors.map(v => v._id);
    return vendors;
  }
  
  console.log(`⚠️  Only ${approvedCount} approved vendors. Creating more...`);
  
  const vendorsData = [
    {
      vendorId: 'VEND-001',
      name: 'Rural Agri Supply',
      phone: '+919111111111',
      email: 'vendor1@irasathi.com',
      location: {
        type: 'Point',
        coordinates: [77.1025, 28.7041], // Delhi
        address: '123, Village Street, North Delhi',
        city: 'Delhi',
        state: 'Delhi',
        pincode: '110001',
      },
      status: 'approved',
      isActive: true,
      approvedAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      creditLimit: 100000,
      creditUsed: 25000,
      creditAvailable: 75000,
    },
    {
      vendorId: 'VEND-002',
      name: 'Farm Fresh Store',
      phone: '+919222222222',
      email: 'vendor2@irasathi.com',
      location: {
        type: 'Point',
        coordinates: [77.2090, 28.6139], // East Delhi
        address: '456, Market Area, East Delhi',
        city: 'Delhi',
        state: 'Delhi',
        pincode: '110092',
      },
      status: 'approved',
      isActive: true,
      approvedAt: new Date(Date.now() - 85 * 24 * 60 * 60 * 1000),
      creditLimit: 150000,
      creditUsed: 45000,
      creditAvailable: 105000,
    },
    {
      vendorId: 'VEND-003',
      name: 'Green Fields Distributor',
      phone: '+919333333333',
      email: 'vendor3@irasathi.com',
      location: {
        type: 'Point',
        coordinates: [77.1024, 28.5355], // South Delhi
        address: '789, Industrial Area, South Delhi',
        city: 'Delhi',
        state: 'Delhi',
        pincode: '110020',
      },
      status: 'approved',
      isActive: true,
      approvedAt: new Date(Date.now() - 80 * 24 * 60 * 60 * 1000),
      creditLimit: 200000,
      creditUsed: 60000,
      creditAvailable: 140000,
    },
    {
      vendorId: 'VEND-004',
      name: 'Agri Solutions Hub',
      phone: '+919444444444',
      email: 'vendor4@irasathi.com',
      location: {
        type: 'Point',
        coordinates: [77.0873, 28.6444], // Central Delhi
        address: '321, Main Road, Central Delhi',
        city: 'Delhi',
        state: 'Delhi',
        pincode: '110006',
      },
      status: 'approved',
      isActive: true,
      approvedAt: new Date(Date.now() - 75 * 24 * 60 * 60 * 1000),
      creditLimit: 120000,
      creditUsed: 30000,
      creditAvailable: 90000,
    },
    {
      vendorId: 'VEND-005',
      name: 'Crop Care Center',
      phone: '+919555555555',
      email: 'vendor5@irasathi.com',
      location: {
        type: 'Point',
        coordinates: [77.1027, 28.5925], // West Delhi
        address: '654, Commercial Street, West Delhi',
        city: 'Delhi',
        state: 'Delhi',
        pincode: '110018',
      },
      status: 'approved',
      isActive: true,
      approvedAt: new Date(Date.now() - 70 * 24 * 60 * 60 * 1000),
      creditLimit: 180000,
      creditUsed: 50000,
      creditAvailable: 130000,
    },
  ];
  
  const vendors = [];
  for (const vendorData of vendorsData) {
    let vendor = await Vendor.findOne({ vendorId: vendorData.vendorId });
    if (!vendor) {
      vendor = await Vendor.create(vendorData);
      console.log(`✅ Created vendor: ${vendor.name} (${vendor.vendorId})`);
    } else {
      console.log(`✅ Vendor already exists: ${vendor.name} (${vendor.vendorId})`);
    }
    vendors.push(vendor);
  }
  
  createdData.vendors = vendors.map(v => v._id);
  return vendors;
};

/**
 * Ensure Products exist
 */
const ensureProducts = async () => {
  console.log('\n📦 Checking Products...\n');
  
  const existingProducts = await Product.countDocuments({ isActive: true });
  const targetCount = 10;
  
  if (existingProducts >= targetCount) {
    console.log(`✅ Products already exist: ${existingProducts}`);
    const products = await Product.find({ isActive: true }).limit(targetCount);
    createdData.products = products.map(p => p._id);
    return products;
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
      name: 'Wheat Seeds Premium',
      description: 'High-yield wheat seeds, certified quality',
      category: 'seeds',
      sku: 'SEED-WHEAT-001',
      priceToVendor: 40,
      priceToUser: 60,
      stock: 5000,
      images: [{ url: 'https://via.placeholder.com/400?text=Wheat', isPrimary: true }],
      brand: 'SeedMaster',
      weight: { value: 1, unit: 'kg' },
      tags: ['wheat', 'seeds'],
      isActive: true,
    },
    {
      name: 'Rice Seeds Basmati',
      description: 'Premium Basmati rice seeds',
      category: 'seeds',
      sku: 'SEED-RICE-001',
      priceToVendor: 50,
      priceToUser: 75,
      stock: 4000,
      images: [{ url: 'https://via.placeholder.com/400?text=Rice', isPrimary: true }],
      brand: 'RicePro',
      weight: { value: 1, unit: 'kg' },
      tags: ['rice', 'basmati'],
      isActive: true,
    },
    {
      name: 'Organic Compost',
      description: '100% organic compost for healthy crops',
      category: 'organic',
      sku: 'ORG-COMPOST-001',
      priceToVendor: 300,
      priceToUser: 450,
      stock: 700,
      images: [{ url: 'https://via.placeholder.com/400?text=Compost', isPrimary: true }],
      brand: 'EcoFarm',
      weight: { value: 25, unit: 'kg' },
      tags: ['organic', 'compost'],
      isActive: true,
    },
    {
      name: 'Potassium Sulphate',
      description: 'Potassium sulphate fertilizer for flowering and fruiting',
      category: 'fertilizer',
      sku: 'FERT-K2SO4-001',
      priceToVendor: 600,
      priceToUser: 800,
      stock: 500,
      images: [{ url: 'https://via.placeholder.com/400?text=Potassium', isPrimary: true }],
      brand: 'GrowMax',
      weight: { value: 50, unit: 'kg' },
      tags: ['potassium', 'sulphate'],
      isActive: true,
    },
    {
      name: 'Tomato Seeds Hybrid',
      description: 'High-yield hybrid tomato seeds',
      category: 'seeds',
      sku: 'SEED-TOMATO-001',
      priceToVendor: 30,
      priceToUser: 50,
      stock: 6000,
      images: [{ url: 'https://via.placeholder.com/400?text=Tomato', isPrimary: true }],
      brand: 'VeggiePro',
      weight: { value: 100, unit: 'g' },
      tags: ['tomato', 'hybrid'],
      isActive: true,
    },
    {
      name: 'Insecticide Neem Oil',
      description: 'Natural neem-based insecticide',
      category: 'pesticide',
      sku: 'PEST-NEEM-001',
      priceToVendor: 200,
      priceToUser: 300,
      stock: 900,
      images: [{ url: 'https://via.placeholder.com/400?text=Neem', isPrimary: true }],
      brand: 'BioCare',
      weight: { value: 1, unit: 'liter' },
      tags: ['neem', 'insecticide'],
      isActive: true,
    },
    {
      name: 'Herbicide Glyphosate',
      description: 'Broad-spectrum herbicide for weed control',
      category: 'pesticide',
      sku: 'PEST-GLYPHO-001',
      priceToVendor: 150,
      priceToUser: 250,
      stock: 800,
      images: [{ url: 'https://via.placeholder.com/400?text=Herbicide', isPrimary: true }],
      brand: 'WeedFree',
      weight: { value: 500, unit: 'ml' },
      tags: ['herbicide', 'glyphosate'],
      isActive: true,
    },
  ];
  
  const products = [];
  for (const productData of productsData) {
    let product = await Product.findOne({ sku: productData.sku });
    if (!product) {
      product = await Product.create(productData);
      console.log(`✅ Created product: ${product.name} (${product.sku})`);
    } else {
      console.log(`✅ Product already exists: ${product.name} (${product.sku})`);
    }
    products.push(product);
  }
  
  createdData.products = products.map(p => p._id);
  return products;
};

/**
 * Ensure ProductAssignments (Inventory) exist for each vendor
 */
const ensureProductAssignments = async () => {
  console.log('\n📋 Checking ProductAssignments (Inventory)...\n');
  
  if (createdData.vendors.length === 0 || createdData.products.length === 0) {
    console.log('⚠️  No vendors or products found. Skipping ProductAssignments...');
    return;
  }
  
  const targetPerVendor = 15;
  
  for (const vendorId of createdData.vendors) {
    const existingCount = await ProductAssignment.countDocuments({ vendorId, isActive: true });
    
    if (existingCount >= targetPerVendor) {
      console.log(`✅ Vendor ${vendorId} has ${existingCount} product assignments`);
      continue;
    }
    
    console.log(`⚠️  Vendor ${vendorId} has only ${existingCount} product assignments. Creating more...`);
    
    const assignments = [];
    const productSample = createdData.products.slice(0, Math.min(targetPerVendor, createdData.products.length));
    
    for (const productId of productSample) {
      const existing = await ProductAssignment.findOne({ vendorId, productId });
      if (existing) {
        assignments.push(existing);
        continue;
      }
      
      const product = await Product.findById(productId);
      if (!product) continue;
      
      // Random stock between 50-500
      const stock = Math.floor(Math.random() * 450) + 50;
      
      const assignment = await ProductAssignment.create({
        vendorId,
        productId,
        stock,
        availableStock: stock,
        reservedStock: 0,
        minStockLevel: 10,
        maxStockLevel: 1000,
        isActive: true,
        assignedAt: new Date(Date.now() - Math.floor(Math.random() * 60) * 24 * 60 * 60 * 1000),
      });
      
      assignments.push(assignment);
      console.log(`✅ Created assignment: ${product.name} for vendor`);
    }
    
    createdData.productAssignments.push(...assignments.map(a => a._id));
  }
  
  console.log(`✅ ProductAssignments ensured for ${createdData.vendors.length} vendors`);
};

/**
 * Ensure Approved Sellers exist (for sellerId linking)
 */
const ensureSellers = async () => {
  console.log('\n👤 Checking Approved Sellers...\n');
  
  const approvedCount = await Seller.countDocuments({ status: 'approved', isActive: true });
  const targetCount = 5;
  
  if (approvedCount >= targetCount) {
    console.log(`✅ Approved sellers: ${approvedCount}`);
    const sellers = await Seller.find({ status: 'approved', isActive: true }).limit(targetCount);
    createdData.sellers = sellers.map(s => s._id);
    return sellers;
  }
  
  console.log(`⚠️  Only ${approvedCount} approved sellers. Creating more...`);
  
  // Reuse seller data from ensureSellerData.js pattern
  const sellersData = [
    {
      sellerId: 'IRA-1001',
      name: 'Rajesh Kumar',
      phone: '+919111111111',
      email: 'rajesh@irasathi.com',
      area: 'North Delhi',
      location: {
        address: '123, Village Street, North Delhi',
        city: 'Delhi',
        state: 'Delhi',
        pincode: '110001',
      },
      monthlyTarget: 100000,
      status: 'approved',
      isActive: true,
      approvedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      wallet: { balance: 5000, pending: 0 },
    },
    {
      sellerId: 'IRA-1002',
      name: 'Priya Sharma',
      phone: '+919222222222',
      email: 'priya@irasathi.com',
      area: 'South Mumbai',
      location: {
        address: '456, Urban Area, South Mumbai',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400053',
      },
      monthlyTarget: 150000,
      status: 'approved',
      isActive: true,
      approvedAt: new Date(Date.now() - 55 * 24 * 60 * 60 * 1000),
      wallet: { balance: 12000, pending: 2000 },
    },
    {
      sellerId: 'IRA-1003',
      name: 'Amit Patel',
      phone: '+919333333333',
      email: 'amit@irasathi.com',
      area: 'Gujarat Rural',
      location: {
        address: '789, Farm Road, Gujarat',
        city: 'Ahmedabad',
        state: 'Gujarat',
        pincode: '380001',
      },
      monthlyTarget: 120000,
      status: 'approved',
      isActive: true,
      approvedAt: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000),
      wallet: { balance: 8000, pending: 1500 },
    },
    {
      sellerId: 'IRA-1004',
      name: 'Sunita Devi',
      phone: '+919444444444',
      email: 'sunita@irasathi.com',
      area: 'Bihar Village',
      location: {
        address: '321, Village Street, Bihar',
        city: 'Patna',
        state: 'Bihar',
        pincode: '800001',
      },
      monthlyTarget: 80000,
      status: 'approved',
      isActive: true,
      approvedAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
      wallet: { balance: 3000, pending: 1000 },
    },
    {
      sellerId: 'IRA-1005',
      name: 'Ramesh Yadav',
      phone: '+919555555555',
      email: 'ramesh@irasathi.com',
      area: 'Uttar Pradesh',
      location: {
        address: '654, Rural Area, UP',
        city: 'Lucknow',
        state: 'Uttar Pradesh',
        pincode: '226001',
      },
      monthlyTarget: 90000,
      status: 'approved',
      isActive: true,
      approvedAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
      wallet: { balance: 6000, pending: 800 },
    },
  ];
  
  const sellers = [];
  for (const sellerData of sellersData) {
    let seller = await Seller.findOne({ sellerId: sellerData.sellerId });
    if (!seller) {
      seller = await Seller.create(sellerData);
      console.log(`✅ Created seller: ${seller.name} (${seller.sellerId})`);
    } else {
      console.log(`✅ Seller already exists: ${seller.name} (${seller.sellerId})`);
    }
    sellers.push(seller);
  }
  
  createdData.sellers = sellers.map(s => s._id);
  return sellers;
};

/**
 * Ensure Users exist (10+ active users, some with sellerId)
 */
const ensureUsers = async () => {
  console.log('\n👥 Checking Users...\n');
  
  const existingUsers = await User.countDocuments({ isActive: true, isBlocked: false });
  const targetCount = 10;
  
  if (existingUsers >= targetCount) {
    console.log(`✅ Active users already exist: ${existingUsers}`);
    const users = await User.find({ isActive: true, isBlocked: false }).limit(targetCount);
    createdData.users = users.map(u => u._id);
    return users;
  }
  
  console.log(`⚠️  Only ${existingUsers} active users found. Creating more...`);
  
  // Get sellers for sellerId assignment
  const sellers = await Seller.find({ status: 'approved', isActive: true }).limit(5);
  const sellerIds = sellers.map(s => s.sellerId);
  
  const usersData = [];
  for (let i = 1; i <= targetCount; i++) {
    const phone = `+91987654${String(1000 + i).padStart(4, '0')}`;
    const hasSellerId = i <= 5 && sellerIds.length > 0; // First 5 users have sellerId
    const sellerId = hasSellerId ? sellerIds[(i - 1) % sellerIds.length] : null;
    const seller = hasSellerId ? sellers[(i - 1) % sellers.length] : null;
    
    usersData.push({
      name: `User ${i}`,
      phone,
      email: `user${i}@example.com`,
      language: 'en',
      sellerId: sellerId,
      seller: seller ? seller._id : null,
      location: {
        type: 'Point',
        coordinates: [
          77.1025 + (Math.random() - 0.5) * 0.1, // Delhi area
          28.7041 + (Math.random() - 0.5) * 0.1,
        ],
        address: `${i}00, User Street, Delhi`,
        city: 'Delhi',
        state: 'Delhi',
        pincode: '110001',
      },
      isActive: true,
      isBlocked: false,
      createdAt: new Date(Date.now() - (targetCount - i) * 24 * 60 * 60 * 1000),
    });
  }
  
  const users = [];
  for (const userData of usersData) {
    let user = await User.findOne({ phone: userData.phone });
    if (!user) {
      user = await User.create(userData);
      console.log(`✅ Created user: ${user.name} (${user.phone})${user.sellerId ? ` [Seller: ${user.sellerId}]` : ''}`);
    } else {
      // Update sellerId if not set
      if (!user.sellerId && userData.sellerId) {
        user.sellerId = userData.sellerId;
        user.seller = userData.seller;
        await user.save();
      }
      console.log(`✅ User already exists: ${user.name} (${user.phone})${user.sellerId ? ` [Seller: ${user.sellerId}]` : ''}`);
    }
    users.push(user);
  }
  
  createdData.users = users.map(u => u._id);
  return users;
};

/**
 * Ensure Carts exist for each user
 */
const ensureCarts = async () => {
  console.log('\n🛒 Checking Carts...\n');
  
  if (createdData.users.length === 0 || createdData.products.length === 0) {
    console.log('⚠️  No users or products found. Skipping Carts...');
    return;
  }
  
  for (const userId of createdData.users) {
    let cart = await Cart.findOne({ userId });
    
    if (cart && cart.items.length > 0) {
      console.log(`✅ User ${userId} has cart with ${cart.items.length} items`);
      continue;
    }
    
    // Create or update cart with some items
    const items = [];
    const numItems = Math.floor(Math.random() * 3) + 1; // 1-3 items
    const productSample = createdData.products.slice(0, Math.min(numItems, createdData.products.length));
    
    for (const productId of productSample) {
      const product = await Product.findById(productId);
      if (!product) continue;
      
      const quantity = Math.floor(Math.random() * 3) + 1; // 1-3 quantity
      items.push({
        productId,
        quantity,
        unitPrice: product.priceToUser,
        totalPrice: product.priceToUser * quantity,
      });
    }
    
    const totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);
    
    if (cart) {
      cart.items = items;
      cart.totalAmount = totalAmount;
      cart.updatedAt = new Date();
      await cart.save();
      console.log(`✅ Updated cart for user ${userId} with ${items.length} items`);
    } else {
      cart = await Cart.create({
        userId,
        items,
        totalAmount,
      });
      console.log(`✅ Created cart for user ${userId} with ${items.length} items`);
    }
    
    createdData.carts.push(cart._id);
  }
  
  console.log(`✅ Carts ensured for ${createdData.users.length} users`);
};

/**
 * Ensure Addresses exist for each user (2+ addresses per user)
 */
const ensureAddresses = async () => {
  console.log('\n📍 Checking Addresses...\n');
  
  if (createdData.users.length === 0) {
    console.log('⚠️  No users found. Skipping Addresses...');
    return;
  }
  
  for (const userId of createdData.users) {
    const existingCount = await Address.countDocuments({ userId });
    const targetCount = 2;
    
    if (existingCount >= targetCount) {
      console.log(`✅ User ${userId} has ${existingCount} addresses`);
      continue;
    }
    
    const user = await User.findById(userId);
    if (!user) continue;
    
    const addressesToCreate = targetCount - existingCount;
    
    for (let i = 0; i < addressesToCreate; i++) {
      const isDefault = i === 0; // First address is default
      
      const address = await Address.create({
        userId,
        name: user.name || `User ${userId}`,
        phone: user.phone,
        address: `${100 + i}${i === 0 ? ', Main Street' : ', Alternate Address'}, ${user.location?.city || 'Delhi'}`,
        city: user.location?.city || 'Delhi',
        state: user.location?.state || 'Delhi',
        pincode: user.location?.pincode || '110001',
        isDefault,
        location: {
          type: 'Point',
          coordinates: [
            (user.location?.coordinates?.[0] || 77.1025) + (Math.random() - 0.5) * 0.05,
            (user.location?.coordinates?.[1] || 28.7041) + (Math.random() - 0.5) * 0.05,
          ],
        },
      });
      
      createdData.addresses.push(address._id);
      console.log(`✅ Created address ${i + 1} for user ${userId}${isDefault ? ' (default)' : ''}`);
    }
  }
  
  console.log(`✅ Addresses ensured for ${createdData.users.length} users`);
};

/**
 * Ensure Orders exist for each user (10+ orders per user with various statuses)
 */
const ensureOrders = async () => {
  console.log('\n📦 Checking Orders...\n');
  
  if (createdData.users.length === 0 || createdData.products.length === 0 || createdData.vendors.length === 0) {
    console.log('⚠️  No users, products, or vendors found. Skipping Orders...');
    return;
  }
  
  // Get latest order number
  const latestOrder = await Order.findOne().sort({ orderNumber: -1 });
  let orderNumberSequence = 1;
  if (latestOrder && latestOrder.orderNumber) {
    const match = latestOrder.orderNumber.match(/ORD-(\d{8})-(\d+)/);
    if (match) {
      orderNumberSequence = parseInt(match[2]) + 1;
    }
  }
  
  for (const userId of createdData.users) {
    const existingCount = await Order.countDocuments({ userId });
    const targetCount = 10;
    
    if (existingCount >= targetCount) {
      console.log(`✅ User ${userId} has ${existingCount} orders`);
      continue;
    }
    
    const user = await User.findById(userId);
    if (!user) continue;
    
    const userAddresses = await Address.find({ userId }).limit(1);
    const deliveryAddress = userAddresses[0] || user.location;
    
    // Assign vendor based on user location (geospatial query)
    let assignedVendor = null;
    
    // Try to find vendor using geospatial query if user has valid coordinates
    if (user.location?.coordinates && Array.isArray(user.location.coordinates) && user.location.coordinates.length === 2) {
      try {
        assignedVendor = await Vendor.findOne({
          status: 'approved',
          isActive: true,
          location: {
            $near: {
              $geometry: {
                type: 'Point',
                coordinates: user.location.coordinates, // [lng, lat]
              },
              $maxDistance: 20000, // 20km
            },
          },
        });
      } catch (geoError) {
        console.log(`⚠️  Geospatial query failed for user ${userId}, using fallback vendor`);
      }
    }
    
    // Fallback: use first available vendor
    if (!assignedVendor && createdData.vendors.length > 0) {
      assignedVendor = await Vendor.findById(createdData.vendors[0]);
    }
    
    if (!assignedVendor) {
      console.log(`⚠️  No vendor found for user ${userId}. Skipping orders...`);
      continue;
    }
    
    const ordersToCreate = targetCount - existingCount;
    
    for (let i = 0; i < ordersToCreate; i++) {
      const orderDate = new Date(Date.now() - (ordersToCreate - i) * 24 * 60 * 60 * 1000);
      const orderNumber = `ORD-${new Date(orderDate).toISOString().slice(0, 10).replace(/-/g, '')}-${String(orderNumberSequence++).padStart(4, '0')}`;
      
      // Random status distribution
      const statusRand = Math.random();
      let orderStatus;
      let paymentStatus;
      
      if (statusRand < 0.2) {
        orderStatus = ORDER_STATUS.AWAITING_DISPATCH;
        paymentStatus = PAYMENT_STATUS.PENDING;
      } else if (statusRand < 0.4) {
        orderStatus = ORDER_STATUS.DISPATCHED;
        paymentStatus = PAYMENT_STATUS.PARTIAL;
      } else if (statusRand < 0.7) {
        orderStatus = ORDER_STATUS.DELIVERED;
        paymentStatus = PAYMENT_STATUS.FULLY_PAID;
      } else {
        orderStatus = ORDER_STATUS.CANCELLED;
        paymentStatus = PAYMENT_STATUS.REFUNDED;
      }
      
      // Create order items
      const items = [];
      const numItems = Math.floor(Math.random() * 3) + 1; // 1-3 items
      const productSample = createdData.products.slice(0, Math.min(numItems, createdData.products.length));
      
      let subtotal = 0;
      for (const productId of productSample) {
        const product = await Product.findById(productId);
        if (!product) continue;
        
        const quantity = Math.floor(Math.random() * 3) + 1; // 1-3 quantity
        const unitPrice = product.priceToUser;
        const totalPrice = unitPrice * quantity;
        subtotal += totalPrice;
        
        items.push({
          productId,
          productName: product.name,
          quantity,
          unitPrice,
          totalPrice,
        });
      }
      
      const deliveryCharge = subtotal >= MIN_ORDER_VALUE ? 0 : 50;
      const totalAmount = subtotal + deliveryCharge;
      
      // Payment preference: 70% partial, 30% full
      const paymentPreferenceRand = Math.random();
      const paymentPreference = paymentPreferenceRand < 0.7 ? 'partial' : 'full';
      const upfrontAmount = paymentPreference === 'full' ? totalAmount : Math.round(totalAmount * 0.3); // 30% or 100%
      const remainingAmount = paymentPreference === 'full' ? 0 : Math.round(totalAmount * 0.7); // 70% or 0
      const deliveryChargeWaived = paymentPreference === 'full';
      
      const order = await Order.create({
        orderNumber,
        userId,
        sellerId: user.sellerId || null,
        vendorId: assignedVendor._id,
        items,
        subtotal,
        deliveryCharge: deliveryChargeWaived ? 0 : deliveryCharge,
        deliveryChargeWaived,
        totalAmount,
        paymentPreference,
        upfrontAmount,
        remainingAmount,
        deliveryAddress: {
          name: deliveryAddress.name || user.name,
          phone: deliveryAddress.phone || user.phone,
          address: deliveryAddress.address || user.location?.address,
          city: deliveryAddress.city || user.location?.city,
          state: deliveryAddress.state || user.location?.state,
          pincode: deliveryAddress.pincode || user.location?.pincode,
          coordinates: deliveryAddress.location?.coordinates || (user.location?.coordinates ? {
            lat: user.location.coordinates[1],
            lng: user.location.coordinates[0],
          } : undefined),
        },
        status: orderStatus,
        paymentStatus,
        assignedTo: orderStatus === ORDER_STATUS.AWAITING_DISPATCH || orderStatus === ORDER_STATUS.CANCELLED ? null : 'vendor',
        createdAt: orderDate,
      });
      
      createdData.orders.push(order._id);
      console.log(`✅ Created order ${order.orderNumber} for user ${userId} (${orderStatus})`);
      
      // Create payment if order is paid or partially paid
      if (paymentStatus === PAYMENT_STATUS.PARTIAL || paymentStatus === PAYMENT_STATUS.FULLY_PAID) {
        const advanceAmount = upfrontAmount; // Already calculated above
        const remainingAmount = paymentStatus === PAYMENT_STATUS.FULLY_PAID ? order.remainingAmount : 0;
        
        // Create advance payment
        const advancePayment = await Payment.create({
          paymentId: `PAY-${order.orderNumber}-ADV-${Date.now()}`,
          orderId: order._id,
          userId,
          paymentType: paymentPreference === 'full' ? 'full' : 'advance',
          amount: advanceAmount,
          paymentMethod: PAYMENT_METHODS.RAZORPAY,
          status: PAYMENT_STATUS.FULLY_PAID, // Advance is always paid
          paidAt: orderDate,
          createdAt: orderDate,
        });
        
        createdData.payments.push(advancePayment._id);
        
        // Create remaining payment if fully paid
        if (paymentStatus === PAYMENT_STATUS.FULLY_PAID && remainingAmount > 0) {
          const remainingPayment = await Payment.create({
            paymentId: `PAY-${order.orderNumber}-REM-${Date.now()}`,
            orderId: order._id,
            userId,
            paymentType: 'remaining',
            amount: remainingAmount,
            paymentMethod: PAYMENT_METHODS.RAZORPAY,
            status: PAYMENT_STATUS.FULLY_PAID,
            paidAt: new Date(orderDate.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days after order
            createdAt: new Date(orderDate.getTime() + 7 * 24 * 60 * 60 * 1000),
          });
          
          createdData.payments.push(remainingPayment._id);
        }
      }
    }
  }
  
  console.log(`✅ Orders ensured for ${createdData.users.length} users`);
};

/**
 * Main execution function
 */
const main = async () => {
  try {
    console.log('\n🚀 Starting User Dashboard Data Setup...\n');
    
    // Connect to database
    await connectDB();
    console.log('✅ Connected to MongoDB\n');
    
    // Indexes are automatically created by Mongoose schemas
    // Skip manual index creation to avoid conflicts with existing data
    console.log('✅ Indexes handled by Mongoose schemas\n');
    
    // Run all ensure functions
    await ensureVendors();
    await ensureProducts();
    await ensureProductAssignments();
    await ensureSellers();
    await ensureUsers();
    await ensureCarts();
    await ensureAddresses();
    await ensureOrders();
    
    // Summary
    console.log('\n✅ ============================================');
    console.log('✅ User Dashboard Data Setup Complete!');
    console.log('✅ ============================================\n');
    console.log('📊 Data Summary:');
    console.log(`   - Vendors: ${createdData.vendors.length}`);
    console.log(`   - Products: ${createdData.products.length}`);
    console.log(`   - ProductAssignments: ${createdData.productAssignments.length}`);
    console.log(`   - Sellers: ${createdData.sellers.length}`);
    console.log(`   - Users: ${createdData.users.length}`);
    console.log(`   - Carts: ${createdData.carts.length}`);
    console.log(`   - Addresses: ${createdData.addresses.length}`);
    console.log(`   - Orders: ${createdData.orders.length}`);
    console.log(`   - Payments: ${createdData.payments.length}`);
    console.log('\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error setting up User Dashboard data:', error);
    process.exit(1);
  }
};

// Run the script
main();

