/**
 * Comprehensive Test Data Seed Script
 * 
 * This script creates comprehensive test data for all collections
 * to enable end-to-end testing of the entire system.
 * 
 * Usage: node scripts/seedTestData.js
 * Or: npm run seed-test-data
 * 
 * Collections seeded:
 * 1. Products (10+ products with different categories)
 * 2. Vendors (multiple approved vendors at different locations)
 * 3. Sellers (multiple sellers with different statuses)
 * 4. Users (10+ users with different scenarios)
 * 5. ProductAssignments (link products to vendors)
 * 6. Addresses (addresses for users)
 * 7. Carts (some users with items in cart)
 * 8. Orders (various statuses and payment scenarios)
 * 9. Payments (linked to orders)
 * 10. CreditPurchases (vendor credit requests)
 * 11. WithdrawalRequests (seller withdrawal requests)
 * 12. Commissions (historical commission records)
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB } = require('../config/database');

// Import all models
const Product = require('../models/Product');
const Vendor = require('../models/Vendor');
const Seller = require('../models/Seller');
const User = require('../models/User');
const ProductAssignment = require('../models/ProductAssignment');
const Address = require('../models/Address');
const Cart = require('../models/Cart');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const CreditPurchase = require('../models/CreditPurchase');
const WithdrawalRequest = require('../models/WithdrawalRequest');
const Commission = require('../models/Commission');
const Admin = require('../models/Admin');

// Import constants
const { ORDER_STATUS, PAYMENT_STATUS, PAYMENT_METHODS, MIN_ORDER_VALUE } = require('../utils/constants');

// Store created IDs for relationships
let createdData = {
  products: [],
  vendors: [],
  sellers: [],
  users: [],
  addresses: [],
  orders: [],
  payments: [],
  commissions: [],
};

/**
 * Clear existing test data (optional - commented out by default)
 */
const clearExistingData = async () => {
  console.log('\n⚠️  Clearing existing test data...\n');
  
  // Uncomment these if you want to clear existing data
  // await Commission.deleteMany({});
  // await WithdrawalRequest.deleteMany({});
  // await CreditPurchase.deleteMany({});
  // await Payment.deleteMany({});
  // await Order.deleteMany({});
  // await Cart.deleteMany({});
  // await Address.deleteMany({});
  // await ProductAssignment.deleteMany({});
  // await User.deleteMany({});
  // await Product.deleteMany({});
  // await Vendor.deleteMany({});
  // await Seller.deleteMany({});
  
  console.log('✅ Data clearing skipped (uncomment in script if needed)\n');
};

/**
 * 1. Seed Products (10+ products with different categories)
 */
const seedProducts = async () => {
  console.log('\n🌾 Creating Products...\n');
  
  const productsData = [
    // Fertilizers
    {
      name: 'Urea 46% Nitrogen',
      description: 'High-grade urea fertilizer with 46% nitrogen content, ideal for crop growth and yield improvement.',
      category: 'fertilizer',
      priceToVendor: 500,
      priceToUser: 650,
      stock: 1000,
      images: [{ url: 'https://via.placeholder.com/400?text=Urea', isPrimary: true }],
      brand: 'AgriGold',
      weight: { value: 50, unit: 'kg' },
      tags: ['urea', 'nitrogen', 'fertilizer'],
      isActive: true,
    },
    {
      name: 'DAP Fertilizer (Di-Ammonium Phosphate)',
      description: 'Premium DAP fertilizer with high phosphorus and nitrogen content for healthy root development.',
      category: 'fertilizer',
      priceToVendor: 650,
      priceToUser: 850,
      stock: 800,
      images: [{ url: 'https://via.placeholder.com/400?text=DAP', isPrimary: true }],
      brand: 'FarmPro',
      weight: { value: 50, unit: 'kg' },
      tags: ['dap', 'phosphorus', 'fertilizer'],
      isActive: true,
    },
    {
      name: 'NPK 19:19:19 Complex Fertilizer',
      description: 'Balanced NPK complex fertilizer with equal proportions of Nitrogen, Phosphorus, and Potassium.',
      category: 'fertilizer',
      priceToVendor: 700,
      priceToUser: 950,
      stock: 600,
      images: [{ url: 'https://via.placeholder.com/400?text=NPK', isPrimary: true }],
      brand: 'CropMax',
      weight: { value: 50, unit: 'kg' },
      tags: ['npk', 'complex', 'fertilizer'],
      isActive: true,
    },
    {
      name: 'Potash (MOP) - Muriate of Potash',
      description: 'High-grade potash fertilizer for potassium supply essential for plant health and disease resistance.',
      category: 'fertilizer',
      priceToVendor: 550,
      priceToUser: 750,
      stock: 500,
      images: [{ url: 'https://via.placeholder.com/400?text=Potash', isPrimary: true }],
      brand: 'GreenField',
      weight: { value: 50, unit: 'kg' },
      tags: ['potash', 'potassium', 'fertilizer'],
      isActive: true,
    },
    
    // Pesticides
    {
      name: 'Glyphosate 41% Herbicide',
      description: 'Effective weed control herbicide for broad-spectrum weed management in agricultural fields.',
      category: 'pesticide',
      priceToVendor: 1200,
      priceToUser: 1600,
      stock: 300,
      images: [{ url: 'https://via.placeholder.com/400?text=Glyphosate', isPrimary: true }],
      brand: 'WeedKill',
      weight: { value: 1, unit: 'l' },
      tags: ['herbicide', 'weed', 'pesticide'],
      isActive: true,
    },
    {
      name: 'Chlorpyriphos 20% EC Insecticide',
      description: 'Powerful insecticide for controlling various pests including stem borers, aphids, and termites.',
      category: 'pesticide',
      priceToVendor: 850,
      priceToUser: 1150,
      stock: 400,
      images: [{ url: 'https://via.placeholder.com/400?text=Chlorpyriphos', isPrimary: true }],
      brand: 'PestGuard',
      weight: { value: 500, unit: 'ml' },
      tags: ['insecticide', 'pest', 'pesticide'],
      isActive: true,
    },
    {
      name: 'Mancozeb 75% WP Fungicide',
      description: 'Broad-spectrum fungicide for preventing and treating fungal diseases in crops.',
      category: 'pesticide',
      priceToVendor: 600,
      priceToUser: 800,
      stock: 450,
      images: [{ url: 'https://via.placeholder.com/400?text=Mancozeb', isPrimary: true }],
      brand: 'FungiStop',
      weight: { value: 500, unit: 'g' },
      tags: ['fungicide', 'fungal', 'pesticide'],
      isActive: true,
    },
    
    // Seeds
    {
      name: 'Hybrid Rice Seeds - IR-64',
      description: 'High-yield hybrid rice seeds with excellent disease resistance and superior grain quality.',
      category: 'seeds',
      priceToVendor: 200,
      priceToUser: 280,
      stock: 2000,
      images: [{ url: 'https://via.placeholder.com/400?text=Rice+Seeds', isPrimary: true }],
      brand: 'SeedTech',
      weight: { value: 10, unit: 'kg' },
      tags: ['rice', 'seeds', 'hybrid'],
      isActive: true,
    },
    {
      name: 'Hybrid Wheat Seeds - HD-3086',
      description: 'Premium wheat seeds with high protein content and excellent drought tolerance.',
      category: 'seeds',
      priceToVendor: 250,
      priceToUser: 350,
      stock: 1500,
      images: [{ url: 'https://via.placeholder.com/400?text=Wheat+Seeds', isPrimary: true }],
      brand: 'CropSeed',
      weight: { value: 10, unit: 'kg' },
      tags: ['wheat', 'seeds', 'hybrid'],
      isActive: true,
    },
    {
      name: 'Cotton Seeds - BT Cotton',
      description: 'BT cotton seeds with built-in pest resistance for better yield and reduced pesticide use.',
      category: 'seeds',
      priceToVendor: 1800,
      priceToUser: 2400,
      stock: 800,
      images: [{ url: 'https://via.placeholder.com/400?text=Cotton+Seeds', isPrimary: true }],
      brand: 'FiberCrop',
      weight: { value: 450, unit: 'g' },
      tags: ['cotton', 'seeds', 'bt'],
      isActive: true,
    },
    
    // Tools & Equipment
    {
      name: 'Sprayer - 16L Capacity',
      description: 'Durable agricultural sprayer with adjustable nozzle for precise pesticide and fertilizer application.',
      category: 'tools',
      priceToVendor: 1200,
      priceToUser: 1600,
      stock: 200,
      images: [{ url: 'https://via.placeholder.com/400?text=Sprayer', isPrimary: true }],
      brand: 'FarmTools',
      weight: { value: 3, unit: 'kg' },
      tags: ['sprayer', 'tools', 'equipment'],
      isActive: true,
    },
    {
      name: 'Pruning Shears - Heavy Duty',
      description: 'Professional-grade pruning shears for trimming and pruning plants with precision.',
      category: 'tools',
      priceToVendor: 450,
      priceToUser: 650,
      stock: 350,
      images: [{ url: 'https://via.placeholder.com/400?text=Shears', isPrimary: true }],
      brand: 'CutPro',
      weight: { value: 0.5, unit: 'kg' },
      tags: ['shears', 'tools', 'pruning'],
      isActive: true,
    },
    {
      name: 'Organic Manure - Cow Dung',
      description: 'Pure organic cow dung manure rich in nutrients for healthy soil and plant growth.',
      category: 'fertilizer',
      priceToVendor: 300,
      priceToUser: 450,
      stock: 1200,
      images: [{ url: 'https://via.placeholder.com/400?text=Manure', isPrimary: true }],
      brand: 'OrganicFarm',
      weight: { value: 50, unit: 'kg' },
      tags: ['organic', 'manure', 'fertilizer'],
      isActive: true,
    },
    {
      name: 'Neem Oil - Organic Pesticide',
      description: 'Pure neem oil for organic pest control, safe for plants and environment.',
      category: 'pesticide',
      priceToVendor: 400,
      priceToUser: 550,
      stock: 500,
      images: [{ url: 'https://via.placeholder.com/400?text=Neem+Oil', isPrimary: true }],
      brand: 'OrganicGuard',
      weight: { value: 1, unit: 'l' },
      tags: ['neem', 'organic', 'pesticide'],
      isActive: true,
    },
    {
      name: 'Inactive Test Product',
      description: 'This product is inactive and should not appear in user product listings.',
      category: 'fertilizer',
      priceToVendor: 100,
      priceToUser: 150,
      stock: 100,
      images: [{ url: 'https://via.placeholder.com/400?text=Inactive', isPrimary: true }],
      isActive: false, // Inactive product
    },
  ];

  for (const productData of productsData) {
    const existingProduct = await Product.findOne({ name: productData.name });
    if (existingProduct) {
      console.log(`⚠️  Product already exists: ${productData.name}`);
      createdData.products.push(existingProduct._id);
    } else {
      const product = await Product.create(productData);
      console.log(`✅ Product created: ${product.name} (${product.category}) - Stock: ${product.stock}`);
      createdData.products.push(product._id);
    }
  }
  
  console.log(`\n✅ Total Products: ${createdData.products.length}\n`);
};

/**
 * 2. Seed Vendors (multiple approved vendors)
 */
const seedVendors = async () => {
  console.log('\n🏪 Creating Vendors...\n');
  
  const vendorsData = [
    {
      name: 'Delhi Agri Supply Hub',
      phone: '+919876543210',
      email: 'delhi@agrisupply.com',
      location: {
        address: '123, Main Street, Connaught Place',
        city: 'New Delhi',
        state: 'Delhi',
        pincode: '110001',
        coordinates: { lat: 28.6139, lng: 77.2090 },
        coverageRadius: 20,
      },
      status: 'approved',
      isActive: true,
      approvedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      creditPolicy: { limit: 500000, repaymentDays: 30, penaltyRate: 2 },
      creditLimit: 500000,
      creditUsed: 125000,
    },
    {
      name: 'Mumbai Farm Warehouse',
      phone: '+919876543211',
      email: 'mumbai@farmwarehouse.com',
      location: {
        address: '456, Business District, Andheri',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400053',
        coordinates: { lat: 19.0760, lng: 72.8777 },
        coverageRadius: 20,
      },
      status: 'approved',
      isActive: true,
      approvedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000), // 25 days ago
      creditPolicy: { limit: 750000, repaymentDays: 30, penaltyRate: 2 },
      creditLimit: 750000,
      creditUsed: 350000,
    },
    {
      name: 'Bangalore Rural Agri Center',
      phone: '+919876543212',
      email: 'bangalore@ruralagri.com',
      location: {
        address: '789, Industrial Area, Whitefield',
        city: 'Bangalore',
        state: 'Karnataka',
        pincode: '560066',
        coordinates: { lat: 12.9716, lng: 77.5946 },
        coverageRadius: 20,
      },
      status: 'approved',
      isActive: true,
      approvedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000), // 20 days ago
      creditPolicy: { limit: 600000, repaymentDays: 30, penaltyRate: 2 },
      creditLimit: 600000,
      creditUsed: 200000,
    },
    {
      name: 'Pune Agricultural Depot',
      phone: '+919876543213',
      email: 'pune@agridepot.com',
      location: {
        address: '321, Agricultural Zone, Kharadi',
        city: 'Pune',
        state: 'Maharashtra',
        pincode: '411014',
        coordinates: { lat: 18.5547, lng: 73.9417 },
        coverageRadius: 20,
      },
      status: 'approved',
      isActive: true,
      approvedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
      creditPolicy: { limit: 400000, repaymentDays: 30, penaltyRate: 2 },
      creditLimit: 400000,
      creditUsed: 0,
    },
    {
      name: 'Chennai Farm Supply Store',
      phone: '+919876543214',
      email: 'chennai@farmsupply.com',
      location: {
        address: '654, Coastal Road, T Nagar',
        city: 'Chennai',
        state: 'Tamil Nadu',
        pincode: '600017',
        coordinates: { lat: 13.0827, lng: 80.2707 },
        coverageRadius: 20,
      },
      status: 'approved',
      isActive: true,
      approvedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
      creditPolicy: { limit: 550000, repaymentDays: 30, penaltyRate: 2 },
      creditLimit: 550000,
      creditUsed: 180000,
    },
    {
      name: 'Hyderabad Agri Hub',
      phone: '+919876543215',
      email: 'hyderabad@agrihub.com',
      location: {
        address: '987, Technology Park, HITEC City',
        city: 'Hyderabad',
        state: 'Telangana',
        pincode: '500081',
        coordinates: { lat: 17.4486, lng: 78.3908 },
        coverageRadius: 20,
      },
      status: 'approved',
      isActive: true,
      approvedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      creditPolicy: { limit: 650000, repaymentDays: 30, penaltyRate: 2 },
      creditLimit: 650000,
      creditUsed: 95000,
    },
    {
      name: 'Kolkata Farm Distribution',
      phone: '+919876543216',
      email: 'kolkata@farmdist.com',
      location: {
        address: '147, Eastern Avenue, Salt Lake',
        city: 'Kolkata',
        state: 'West Bengal',
        pincode: '700064',
        coordinates: { lat: 22.5726, lng: 88.3639 },
        coverageRadius: 20,
      },
      status: 'approved',
      isActive: true,
      approvedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      creditPolicy: { limit: 450000, repaymentDays: 30, penaltyRate: 2 },
      creditLimit: 450000,
      creditUsed: 0,
    },
    {
      name: 'Pending Vendor - Ahmedabad',
      phone: '+919876543217',
      email: 'ahmedabad@pending.com',
      location: {
        address: '258, Business Hub, SG Highway',
        city: 'Ahmedabad',
        state: 'Gujarat',
        pincode: '380015',
        coordinates: { lat: 23.0225, lng: 72.5714 },
        coverageRadius: 20,
      },
      status: 'pending',
      isActive: false,
    },
    {
      name: 'Pending Vendor - Jaipur',
      phone: '+919876543218',
      email: 'jaipur@pending.com',
      location: {
        address: '369, Pink City, MI Road',
        city: 'Jaipur',
        state: 'Rajasthan',
        pincode: '302001',
        coordinates: { lat: 26.9124, lng: 75.7873 },
        coverageRadius: 20,
      },
      status: 'pending',
      isActive: false,
    },
    {
      name: 'Rejected Vendor - Test',
      phone: '+919876543219',
      email: 'rejected@test.com',
      location: {
        address: '741, Test Area, Test City',
        city: 'Test City',
        state: 'Test State',
        pincode: '000000',
        coordinates: { lat: 28.7041, lng: 77.1025 },
        coverageRadius: 20,
      },
      status: 'rejected',
      isActive: false,
      rejectionReason: 'Location conflict - too close to existing vendor',
    },
  ];

  for (const vendorData of vendorsData) {
    const existingVendor = await Vendor.findOne({ phone: vendorData.phone });
    if (existingVendor) {
      console.log(`⚠️  Vendor already exists: ${vendorData.name}`);
      // Update vendor
      Object.keys(vendorData).forEach(key => {
        if (vendorData[key] !== undefined) {
          existingVendor[key] = vendorData[key];
        }
      });
      await existingVendor.save();
      createdData.vendors.push(existingVendor._id);
    } else {
      const vendor = await Vendor.create(vendorData);
      console.log(`✅ Vendor created: ${vendor.name} - Status: ${vendor.status} - City: ${vendor.location.city}`);
      createdData.vendors.push(vendor._id);
    }
  }
  
  console.log(`\n✅ Total Vendors: ${createdData.vendors.length}\n`);
};

/**
 * 3. Seed Sellers (multiple sellers)
 */
const seedSellers = async () => {
  console.log('\n👤 Creating Sellers...\n');
  
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
      approvedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
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
      area: 'West Bangalore',
      location: {
        address: '789, Rural District, West Bangalore',
        city: 'Bangalore',
        state: 'Karnataka',
        pincode: '560066',
      },
      monthlyTarget: 200000,
      status: 'approved',
      isActive: true,
      approvedAt: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000),
      wallet: { balance: 18000, pending: 3500 },
    },
    {
      sellerId: 'IRA-1004',
      name: 'Sneha Reddy',
      phone: '+919444444444',
      email: 'sneha@irasathi.com',
      area: 'East Hyderabad',
      location: {
        address: '321, Industrial Zone, East Hyderabad',
        city: 'Hyderabad',
        state: 'Telangana',
        pincode: '500032',
      },
      monthlyTarget: 80000,
      status: 'approved',
      isActive: true,
      approvedAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
      wallet: { balance: 7500, pending: 1000 },
    },
    {
      sellerId: 'IRA-1005',
      name: 'Vikram Singh',
      phone: '+919555555555',
      email: 'vikram@irasathi.com',
      area: 'Central Pune',
      location: {
        address: '654, Central Area, Pune',
        city: 'Pune',
        state: 'Maharashtra',
        pincode: '411001',
      },
      monthlyTarget: 120000,
      status: 'approved',
      isActive: true,
      approvedAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
      wallet: { balance: 9500, pending: 0 },
    },
    {
      sellerId: 'IRA-1006',
      name: 'Lakshmi Nair',
      phone: '+919666666666',
      email: 'lakshmi@irasathi.com',
      area: 'South Chennai',
      location: {
        address: '987, Coastal Area, Chennai',
        city: 'Chennai',
        state: 'Tamil Nadu',
        pincode: '600028',
      },
      monthlyTarget: 90000,
      status: 'approved',
      isActive: true,
      approvedAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000),
      wallet: { balance: 6000, pending: 1500 },
    },
    {
      sellerId: 'IRA-1007',
      name: 'Anil Gupta',
      phone: '+919777777777',
      email: 'anil@irasathi.com',
      area: 'North Kolkata',
      location: {
        address: '147, Northern Area, Kolkata',
        city: 'Kolkata',
        state: 'West Bengal',
        pincode: '700001',
      },
      monthlyTarget: 110000,
      status: 'approved',
      isActive: true,
      approvedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      wallet: { balance: 8500, pending: 0 },
    },
    {
      sellerId: 'IRA-1008',
      name: 'Meera Desai',
      phone: '+919888888888',
      email: 'meera@irasathi.com',
      area: 'East Ahmedabad',
      location: {
        address: '258, Eastern Zone, Ahmedabad',
        city: 'Ahmedabad',
        state: 'Gujarat',
        pincode: '380009',
      },
      monthlyTarget: 95000,
      status: 'approved',
      isActive: true,
      approvedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
      wallet: { balance: 7200, pending: 1800 },
    },
    {
      sellerId: 'IRA-1009',
      name: 'Rohit Verma',
      phone: '+919999999999',
      email: 'rohit@irasathi.com',
      area: 'West Jaipur',
      location: {
        address: '369, Western Area, Jaipur',
        city: 'Jaipur',
        state: 'Rajasthan',
        pincode: '302001',
      },
      monthlyTarget: 85000,
      status: 'approved',
      isActive: true,
      approvedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
      wallet: { balance: 5500, pending: 0 },
    },
    {
      sellerId: 'IRA-1010',
      name: 'Pending Seller - Test',
      phone: '+919000000000',
      email: 'pending@irasathi.com',
      area: 'Test Area',
      location: {
        address: 'Test Address',
        city: 'Test City',
        state: 'Test State',
        pincode: '000000',
      },
      monthlyTarget: 50000,
      status: 'pending',
      isActive: false,
      wallet: { balance: 0, pending: 0 },
    },
  ];

  for (const sellerData of sellersData) {
    const existingSeller = await Seller.findOne({ 
      $or: [
        { sellerId: sellerData.sellerId },
        { phone: sellerData.phone }
      ]
    });
    if (existingSeller) {
      console.log(`⚠️  Seller already exists: ${sellerData.sellerId} - ${sellerData.name}`);
      // Update seller
      Object.keys(sellerData).forEach(key => {
        if (sellerData[key] !== undefined) {
          existingSeller[key] = sellerData[key];
        }
      });
      await existingSeller.save();
      createdData.sellers.push(existingSeller._id);
    } else {
      const seller = await Seller.create(sellerData);
      console.log(`✅ Seller created: ${seller.sellerId} - ${seller.name} - Area: ${seller.area} - Target: ₹${seller.monthlyTarget}`);
      createdData.sellers.push(seller._id);
    }
  }
  
  console.log(`\n✅ Total Sellers: ${createdData.sellers.length}\n`);
};

/**
 * 4. Seed Users (10+ users with different scenarios)
 */
const seedUsers = async () => {
  console.log('\n👥 Creating Users...\n');
  
  // Get approved sellers for linking
  const approvedSellers = await Seller.find({ status: 'approved', isActive: true }).limit(10);
  
  const usersData = [
    {
      name: 'Ramesh Yadav',
      phone: '+919011111111',
      email: 'ramesh@example.com',
      sellerId: approvedSellers[0]?.sellerId || null,
      location: {
        address: 'Farm House, Village Road',
        city: 'New Delhi',
        state: 'Delhi',
        pincode: '110001',
        coordinates: { lat: 28.6140, lng: 77.2091 },
      },
      language: 'hi',
      isActive: true,
      isBlocked: false,
    },
    {
      name: 'Suresh Kumar',
      phone: '+919012222222',
      email: 'suresh@example.com',
      sellerId: approvedSellers[0]?.sellerId || null,
      location: {
        address: 'Agricultural Land, Rural Area',
        city: 'New Delhi',
        state: 'Delhi',
        pincode: '110002',
        coordinates: { lat: 28.6142, lng: 77.2093 },
      },
      language: 'en',
      isActive: true,
      isBlocked: false,
    },
    {
      name: 'Lata Devi',
      phone: '+919013333333',
      email: 'lata@example.com',
      sellerId: approvedSellers[1]?.sellerId || null,
      location: {
        address: 'Farm Plot, Suburban Area',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400053',
        coordinates: { lat: 19.0761, lng: 72.8778 },
      },
      language: 'mr',
      isActive: true,
      isBlocked: false,
    },
    {
      name: 'Ganesh Iyer',
      phone: '+919014444444',
      email: 'ganesh@example.com',
      sellerId: approvedSellers[2]?.sellerId || null,
      location: {
        address: 'Village Farm, Rural District',
        city: 'Bangalore',
        state: 'Karnataka',
        pincode: '560066',
        coordinates: { lat: 12.9717, lng: 77.5947 },
      },
      language: 'en',
      isActive: true,
      isBlocked: false,
    },
    {
      name: 'Venkatesh Reddy',
      phone: '+919015555555',
      email: 'venkatesh@example.com',
      sellerId: approvedSellers[3]?.sellerId || null,
      location: {
        address: 'Agricultural Plot, Industrial Zone',
        city: 'Hyderabad',
        state: 'Telangana',
        pincode: '500032',
        coordinates: { lat: 17.4487, lng: 78.3909 },
      },
      language: 'en',
      isActive: true,
      isBlocked: false,
    },
    {
      name: 'Prakash Joshi',
      phone: '+919016666666',
      email: 'prakash@example.com',
      sellerId: approvedSellers[4]?.sellerId || null,
      location: {
        address: 'Farm House, Central Area',
        city: 'Pune',
        state: 'Maharashtra',
        pincode: '411001',
        coordinates: { lat: 18.5548, lng: 73.9418 },
      },
      language: 'mr',
      isActive: true,
      isBlocked: false,
    },
    {
      name: 'Murugan Nair',
      phone: '+919017777777',
      email: 'murugan@example.com',
      sellerId: approvedSellers[5]?.sellerId || null,
      location: {
        address: 'Coastal Farm, South Area',
        city: 'Chennai',
        state: 'Tamil Nadu',
        pincode: '600028',
        coordinates: { lat: 13.0828, lng: 80.2708 },
      },
      language: 'en',
      isActive: true,
      isBlocked: false,
    },
    {
      name: 'Debasis Banerjee',
      phone: '+919018888888',
      email: 'debasis@example.com',
      sellerId: approvedSellers[6]?.sellerId || null,
      location: {
        address: 'Agricultural Land, Northern Area',
        city: 'Kolkata',
        state: 'West Bengal',
        pincode: '700001',
        coordinates: { lat: 22.5727, lng: 88.3640 },
      },
      language: 'en',
      isActive: true,
      isBlocked: false,
    },
    {
      name: 'User Without Seller ID',
      phone: '+919019999999',
      email: 'no-seller@example.com',
      sellerId: null, // User without seller ID
      location: {
        address: 'Test Farm, Test Area',
        city: 'New Delhi',
        state: 'Delhi',
        pincode: '110003',
        coordinates: { lat: 28.6145, lng: 77.2095 },
      },
      language: 'en',
      isActive: true,
      isBlocked: false,
    },
    {
      name: 'Blocked User - Test',
      phone: '+919010000000',
      email: 'blocked@example.com',
      sellerId: null,
      location: {
        address: 'Test Address',
        city: 'Test City',
        state: 'Test State',
        pincode: '000000',
      },
      language: 'en',
      isActive: false,
      isBlocked: true, // Blocked user
    },
    {
      name: 'Inactive User - Test',
      phone: '+919020000000',
      email: 'inactive@example.com',
      sellerId: null,
      location: {
        address: 'Test Address',
        city: 'Test City',
        state: 'Test State',
        pincode: '000000',
      },
      language: 'en',
      isActive: false,
      isBlocked: false, // Inactive but not blocked
    },
  ];

  for (const userData of usersData) {
    const existingUser = await User.findOne({ phone: userData.phone });
    if (existingUser) {
      console.log(`⚠️  User already exists: ${userData.name} (${userData.phone})`);
      // Update user
      Object.keys(userData).forEach(key => {
        if (userData[key] !== undefined) {
          existingUser[key] = userData[key];
        }
      });
      
      // Link seller if sellerId provided
      if (userData.sellerId && approvedSellers.length > 0) {
        const seller = approvedSellers.find(s => s.sellerId === userData.sellerId);
        if (seller) {
          existingUser.seller = seller._id;
        }
      }
      
      await existingUser.save();
      createdData.users.push(existingUser._id);
    } else {
      const user = new User(userData);
      
      // Link seller if sellerId provided
      if (userData.sellerId && approvedSellers.length > 0) {
        const seller = approvedSellers.find(s => s.sellerId === userData.sellerId);
        if (seller) {
          user.seller = seller._id;
        }
      }
      
      await user.save();
      console.log(`✅ User created: ${user.name} (${user.phone}) - Seller: ${user.sellerId || 'None'} - Status: ${user.isActive && !user.isBlocked ? 'Active' : user.isBlocked ? 'Blocked' : 'Inactive'}`);
      createdData.users.push(user._id);
    }
  }
  
  console.log(`\n✅ Total Users: ${createdData.users.length}\n`);
};

/**
 * 5. Seed ProductAssignments (link products to vendors)
 */
const seedProductAssignments = async () => {
  console.log('\n🔗 Creating Product Assignments...\n');
  
  // Get approved vendors
  const approvedVendors = await Vendor.find({ status: 'approved', isActive: true });
  // Get admin
  const admin = await Admin.findOne();
  
  if (!admin) {
    console.log('⚠️  No admin found. Product assignments require admin. Skipping...\n');
    return;
  }
  
  if (approvedVendors.length === 0) {
    console.log('⚠️  No approved vendors found. Skipping product assignments...\n');
    return;
  }
  
  if (createdData.products.length === 0) {
    console.log('⚠️  No products found. Skipping product assignments...\n');
    return;
  }
  
  let assignmentCount = 0;
  
  // Assign all active products to all approved vendors
  const activeProducts = await Product.find({ isActive: true });
  
  for (const vendor of approvedVendors) {
    for (const product of activeProducts) {
      // Check if assignment already exists
      const existingAssignment = await ProductAssignment.findOne({
        productId: product._id,
        vendorId: vendor._id,
      });
      
      if (!existingAssignment) {
        await ProductAssignment.create({
          productId: product._id,
          vendorId: vendor._id,
          region: `${vendor.location.city}, ${vendor.location.state}`,
          isActive: true,
          assignedBy: admin._id,
          assignedAt: new Date(),
        });
        assignmentCount++;
      }
    }
  }
  
  console.log(`✅ Created ${assignmentCount} product assignments\n`);
};

/**
 * 6. Seed Addresses (for users)
 */
const seedAddresses = async () => {
  console.log('\n📍 Creating Addresses...\n');
  
  const activeUsers = await User.find({ isActive: true, isBlocked: false }).limit(8);
  
  if (activeUsers.length === 0) {
    console.log('⚠️  No active users found. Skipping addresses...\n');
    return;
  }
  
  let addressCount = 0;
  
  for (let i = 0; i < activeUsers.length; i++) {
    const user = activeUsers[i];
    
    // Create 1-2 addresses per user
    const addresses = [
      {
        userId: user._id,
        name: user.name,
        phone: user.phone,
        address: user.location?.address || `Address Line 1, User ${i + 1}`,
        city: user.location?.city || 'Test City',
        state: user.location?.state || 'Test State',
        pincode: user.location?.pincode || '110001',
        coordinates: user.location?.coordinates || { lat: 28.6139 + (i * 0.01), lng: 77.2090 + (i * 0.01) },
        isDefault: true,
        addressType: 'home',
      },
    ];
    
    // Add second address for some users
    if (i < 5) {
      addresses.push({
        userId: user._id,
        name: user.name,
        phone: user.phone,
        address: `Secondary Address, User ${i + 1}`,
        city: user.location?.city || 'Test City',
        state: user.location?.state || 'Test State',
        pincode: user.location?.pincode || '110002',
        coordinates: { lat: 28.6139 + (i * 0.02), lng: 77.2090 + (i * 0.02) },
        isDefault: false,
        addressType: 'work',
      });
    }
    
    for (const addressData of addresses) {
      const existingAddress = await Address.findOne({
        userId: user._id,
        address: addressData.address,
        pincode: addressData.pincode,
      });
      
      if (!existingAddress) {
        await Address.create(addressData);
        addressCount++;
        createdData.addresses.push(addressData);
      }
    }
  }
  
  console.log(`✅ Created ${addressCount} addresses\n`);
};

/**
 * 7. Seed Carts (some users with items in cart)
 */
const seedCarts = async () => {
  console.log('\n🛒 Creating Carts...\n');
  
  const activeUsers = await User.find({ isActive: true, isBlocked: false }).limit(5);
  const activeProducts = await Product.find({ isActive: true }).limit(10);
  
  if (activeUsers.length === 0 || activeProducts.length === 0) {
    console.log('⚠️  No active users or products found. Skipping carts...\n');
    return;
  }
  
  let cartCount = 0;
  
  for (let i = 0; i < Math.min(activeUsers.length, 5); i++) {
    const user = activeUsers[i];
    const cart = await Cart.findOne({ userId: user._id });
    
    if (!cart) {
      const newCart = new Cart({
        userId: user._id,
        items: [],
      });
      
      // Add 2-4 random products to cart
      const numItems = Math.floor(Math.random() * 3) + 2; // 2-4 items
      const selectedProducts = activeProducts.slice(0, numItems);
      
      for (const product of selectedProducts) {
        const quantity = Math.floor(Math.random() * 3) + 1; // 1-3 quantity
        newCart.addItem(product._id, quantity, product.priceToUser);
      }
      
      await newCart.save();
      cartCount++;
      console.log(`✅ Cart created for ${user.name} - Items: ${newCart.items.length} - Total: ₹${newCart.subtotal}`);
    }
  }
  
  console.log(`\n✅ Created ${cartCount} carts\n`);
};

/**
 * Main seeding function
 */
const seedAll = async () => {
  try {
    console.log('\n' + '='.repeat(70));
    console.log('🚀 COMPREHENSIVE TEST DATA SEEDING');
    console.log('='.repeat(70));
    console.log('\nThis script will create test data for all collections.\n');
    
    // Connect to database
    await connectDB();
    console.log('✅ Connected to database\n');
    
    // Optional: Clear existing data (uncomment if needed)
    // await clearExistingData();
    
    // Seed in order (respecting dependencies)
    await seedProducts();
    await seedVendors();
    await seedSellers();
    await seedUsers();
    await seedProductAssignments();
    await seedAddresses();
    await seedCarts();
    
    // Note: Orders, Payments, Commissions, CreditPurchases, WithdrawalRequests
    // will be seeded in a separate script to avoid complexity here
    
    console.log('='.repeat(70));
    console.log('✅ BASIC TEST DATA SEEDING COMPLETE');
    console.log('='.repeat(70));
    console.log('\n📊 SUMMARY:');
    console.log(`   Products: ${createdData.products.length}`);
    console.log(`   Vendors: ${createdData.vendors.length}`);
    console.log(`   Sellers: ${createdData.sellers.length}`);
    console.log(`   Users: ${createdData.users.length}`);
    console.log(`   Addresses: ${createdData.addresses.length}`);
    console.log('\n💡 Next: Run seedOrdersAndPayments.js for orders, payments, and related data');
    console.log('='.repeat(70) + '\n');
    
    // Don't close connection if called from master script
    if (require.main === module) {
      await mongoose.connection.close();
      console.log('✅ Database connection closed\n');
      process.exit(0);
    }
  } catch (error) {
    console.error('\n❌ Error seeding data:', error);
    console.error(error.stack);
    await mongoose.connection.close();
    process.exit(1);
  }
};

// Run seeding
if (require.main === module) {
  seedAll();
}

module.exports = { seedAll };

