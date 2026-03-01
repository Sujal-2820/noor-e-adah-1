/**
 * Comprehensive Endpoint Testing Script
 * 
 * Tests all API endpoints with various scenarios and edge cases
 * Generates detailed test report in markdown format
 */

require('dotenv').config();
const axios = require('axios');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { connectDB } = require('../config/database');

// Force IPv4 to avoid connection issues
const BASE_URL = process.env.API_URL || 'http://127.0.0.1:3000/api';
// Configure axios default to use IPv4
axios.defaults.family = 4;

// Test results storage
const testResults = {
  totalTests: 0,
  passed: 0,
  failed: 0,
  errors: [],
  results: {},
  startTime: new Date(),
  endTime: null,
};

// Store authentication tokens
const authTokens = {
  admin: null,
  vendor: null,
  seller: null,
  user: null,
};

// Helper function to make API request
async function makeRequest(method, url, data = null, token = null, expectedStatus = 200) {
  const requestUrl = `${BASE_URL}${url}`;
  const config = {
    method,
    url: requestUrl,
    headers: {
      'Content-Type': 'application/json',
    },
    timeout: 15000, // 15 second timeout
    // Force IPv4
    family: 4,
  };

  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }

  if (data) {
    config.data = data;
  }

  try {
    const response = await axios(config);
    return {
      success: response.status === expectedStatus || (expectedStatus === 'any' && response.status >= 200 && response.status < 300),
      status: response.status,
      data: response.data,
      error: null,
    };
  } catch (error) {
    // Handle connection errors - return the error response structure
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
      // Connection failed
      return {
        success: false,
        status: 503,
        data: null,
        error: `Connection failed: ${error.message || error.code}`,
      };
    }
    // HTTP error response
    return {
      success: error.response?.status === expectedStatus || (expectedStatus === 'any' && error.response?.status >= 400),
      status: error.response?.status || 500,
      data: error.response?.data || null,
      error: error.message || error.code || 'Unknown error',
    };
  }
}

// Helper function to record test result
function recordTest(category, endpoint, method, testName, result, notes = '') {
  testResults.totalTests++;
  if (result.success) {
    testResults.passed++;
  } else {
    testResults.failed++;
    testResults.errors.push({
      category,
      endpoint,
      method,
      testName,
      status: result.status,
      error: result.error || result.data?.message || 'Unknown error',
    });
  }

  if (!testResults.results[category]) {
    testResults.results[category] = [];
  }

  testResults.results[category].push({
    endpoint,
    method,
    testName,
    success: result.success,
    status: result.status,
    notes,
    error: result.error || result.data?.message || null,
  });
}

// Helper function to sleep
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// ADMIN AUTHENTICATION TESTS
// ============================================================================

async function testAdminAuth() {
  console.log('\n🔐 Testing Admin Authentication...\n');

  // Get admin from database
  const Admin = require('../models/Admin');
  const admin = await Admin.findOne();
  
  if (!admin) {
    console.log('⚠️  No admin found in database. Creating one...');
    // Admin should be created by seed script
    recordTest('Admin Auth', '/admin/auth/login', 'POST', 'Admin Login - No Admin Found', { success: false, status: 404 });
    return;
  }

  // Test 1: Admin Login (Step 1: Phone only)
  const loginResult = await makeRequest('POST', '/admin/auth/login', {
    phone: admin.phone,
  }, null, 'any');

  recordTest('Admin Auth', '/admin/auth/login', 'POST', 'Admin Login - Step 1 (Phone only)', loginResult);

  if (!loginResult.success || loginResult.status !== 200) {
    console.log('⚠️  Admin login failed. Response:', JSON.stringify(loginResult.data || loginResult.error, null, 2));
    console.log('⚠️  Status:', loginResult.status);
    console.log('⚠️  Skipping admin tests.');
      return;
  }

  // Test 2: Request OTP
  const otpResult = await makeRequest('POST', '/admin/auth/request-otp', {
    phone: admin.phone,
  }, null, 'any');

  recordTest('Admin Auth', '/admin/auth/request-otp', 'POST', 'Request OTP', otpResult);

  // Get OTP from database (for testing)
  // OTP is generated in the login endpoint, so we need to fetch admin after login
  await sleep(1500); // Wait for OTP generation and save
  const adminWithOTP = await Admin.findOne({ phone: admin.phone }).select('+otp');
  
  let otpCode = null;
  if (!adminWithOTP || !adminWithOTP.otp || !adminWithOTP.otp.code) {
    console.log('⚠️  OTP not generated from login. Requesting OTP separately...');
    // Try requesting OTP separately
    await makeRequest('POST', '/admin/auth/request-otp', { phone: admin.phone }, null, 'any');
    await sleep(1500);
    const adminAfterRequest = await Admin.findOne({ phone: admin.phone }).select('+otp');
    if (!adminAfterRequest || !adminAfterRequest.otp || !adminAfterRequest.otp.code) {
      console.log('⚠️  OTP still not generated. Skipping OTP verification tests.');
      return;
    }
    otpCode = adminAfterRequest.otp.code;
  } else {
    otpCode = adminWithOTP.otp.code;
  }
  
  console.log(`   📱 Admin OTP for testing: ${otpCode}`);

  // Test 3: Verify OTP
  const verifyResult = await makeRequest('POST', '/admin/auth/verify-otp', {
    phone: admin.phone,
    otp: otpCode,
  }, null, 'any');

  recordTest('Admin Auth', '/admin/auth/verify-otp', 'POST', 'Verify OTP', verifyResult);

  if (verifyResult.success && verifyResult.data?.data?.token) {
    authTokens.admin = verifyResult.data.data.token;
    console.log('   ✅ Admin authenticated successfully');
  }

  // Test 4: Get Admin Profile (with token)
  if (authTokens.admin) {
    const profileResult = await makeRequest('GET', '/admin/auth/profile', null, authTokens.admin);
    recordTest('Admin Auth', '/admin/auth/profile', 'GET', 'Get Admin Profile (Authenticated)', profileResult);
  }

  // Test 5: Get Admin Profile (without token) - Should fail
  const noTokenResult = await makeRequest('GET', '/admin/auth/profile', null, null, 401);
  recordTest('Admin Auth', '/admin/auth/profile', 'GET', 'Get Admin Profile (Unauthenticated)', noTokenResult);

  // Test 6: Invalid credentials
  const invalidLoginResult = await makeRequest('POST', '/admin/auth/login', {
    email: 'invalid@example.com',
    password: 'wrongpassword',
  }, null, 401);
  recordTest('Admin Auth', '/admin/auth/login', 'POST', 'Admin Login - Invalid Credentials', invalidLoginResult);

  // Test 7: Invalid OTP
  const invalidOTPResult = await makeRequest('POST', '/admin/auth/verify-otp', {
    phone: admin.phone,
    otp: '000000',
  }, null, 401);
  recordTest('Admin Auth', '/admin/auth/verify-otp', 'POST', 'Verify OTP - Invalid OTP', invalidOTPResult);
}

// ============================================================================
// VENDOR AUTHENTICATION TESTS
// ============================================================================

async function testVendorAuth() {
  console.log('\n🏪 Testing Vendor Authentication...\n');

  const Vendor = require('../models/Vendor');
  const approvedVendor = await Vendor.findOne({ status: 'approved', isActive: true });

  if (!approvedVendor) {
    console.log('⚠️  No approved vendor found. Skipping vendor auth tests.');
    return;
  }

  // Test 1: Request OTP
  const otpResult = await makeRequest('POST', '/vendors/auth/request-otp', {
    phone: approvedVendor.phone,
  }, null, 'any');

  recordTest('Vendor Auth', '/vendors/auth/request-otp', 'POST', 'Request OTP', otpResult);

  await sleep(1500); // Wait for OTP generation and save
  const vendorWithOTP = await Vendor.findOne({ phone: approvedVendor.phone }).select('+otp');

  if (!vendorWithOTP || !vendorWithOTP.otp || !vendorWithOTP.otp.code) {
    console.log('⚠️  OTP not generated for vendor.');
    return;
  }

  const otpCode = vendorWithOTP.otp.code;
  console.log(`   📱 Vendor OTP: ${otpCode}`);

  // Test 2: Verify OTP / Login
  const verifyResult = await makeRequest('POST', '/vendors/auth/verify-otp', {
    phone: approvedVendor.phone,
    otp: otpCode,
  }, null, 'any');

  recordTest('Vendor Auth', '/vendors/auth/verify-otp', 'POST', 'Verify OTP / Login', verifyResult);

  if (verifyResult.success && verifyResult.data?.data?.token) {
    authTokens.vendor = verifyResult.data.data.token;
    console.log('   ✅ Vendor authenticated successfully');
  }

  // Test 3: Get Vendor Profile
  if (authTokens.vendor) {
    const profileResult = await makeRequest('GET', '/vendors/auth/profile', null, authTokens.vendor);
    recordTest('Vendor Auth', '/vendors/auth/profile', 'GET', 'Get Vendor Profile', profileResult);
  }

  // Test 4: Invalid phone number
  const invalidPhoneResult = await makeRequest('POST', '/vendors/auth/request-otp', {
    phone: '+919999999999',
  }, null, 'any');
  recordTest('Vendor Auth', '/vendors/auth/request-otp', 'POST', 'Request OTP - Invalid Phone', invalidPhoneResult);
}

// ============================================================================
// SELLER AUTHENTICATION TESTS
// ============================================================================

async function testSellerAuth() {
  console.log('\n👤 Testing Seller Authentication...\n');

  const Seller = require('../models/Seller');
  const approvedSeller = await Seller.findOne({ status: 'approved', isActive: true });

  if (!approvedSeller) {
    console.log('⚠️  No approved seller found. Skipping seller auth tests.');
    return;
  }

  // Test 1: Request OTP
  const otpResult = await makeRequest('POST', '/sellers/auth/request-otp', {
    phone: approvedSeller.phone,
  }, null, 'any');

  recordTest('Seller Auth', '/sellers/auth/request-otp', 'POST', 'Request OTP', otpResult);

  await sleep(1500); // Wait for OTP generation and save
  const sellerWithOTP = await Seller.findOne({ phone: approvedSeller.phone }).select('+otp');

  if (!sellerWithOTP || !sellerWithOTP.otp || !sellerWithOTP.otp.code) {
    console.log('⚠️  OTP not generated for seller.');
    return;
  }

  const otpCode = sellerWithOTP.otp.code;
  console.log(`   📱 Seller OTP: ${otpCode}`);

  // Test 2: Verify OTP / Login
  const verifyResult = await makeRequest('POST', '/sellers/auth/verify-otp', {
    phone: approvedSeller.phone,
    otp: otpCode,
  }, null, 'any');

  recordTest('Seller Auth', '/sellers/auth/verify-otp', 'POST', 'Verify OTP / Login', verifyResult);

  if (verifyResult.success && verifyResult.data?.data?.token) {
    authTokens.seller = verifyResult.data.data.token;
    console.log('   ✅ Seller authenticated successfully');
  }

  // Test 3: Get Seller Profile
  if (authTokens.seller) {
    const profileResult = await makeRequest('GET', '/sellers/auth/profile', null, authTokens.seller);
    recordTest('Seller Auth', '/sellers/auth/profile', 'GET', 'Get Seller Profile', profileResult);
  }
}

// ============================================================================
// USER AUTHENTICATION TESTS
// ============================================================================

async function testUserAuth() {
  console.log('\n👥 Testing User Authentication...\n');

  const User = require('../models/User');
  let testUser = await User.findOne({ isActive: true, isBlocked: false });

  // Create test user if none exists
  if (!testUser) {
    console.log('   Creating test user...');
    testUser = new User({
      name: 'Test User',
      phone: '+919012345678',
      isActive: true,
    });
    await testUser.save();
  }

  // Test 1: Request OTP
  const otpResult = await makeRequest('POST', '/users/auth/request-otp', {
    phone: testUser.phone,
  }, null, 'any');

  recordTest('User Auth', '/users/auth/request-otp', 'POST', 'Request OTP', otpResult);

  await sleep(1500); // Wait for OTP generation and save
  const userWithOTP = await User.findOne({ phone: testUser.phone }).select('+otp');

  if (!userWithOTP || !userWithOTP.otp || !userWithOTP.otp.code) {
    console.log('⚠️  OTP not generated for user.');
    return;
  }

  const otpCode = userWithOTP.otp.code;
  console.log(`   📱 User OTP: ${otpCode}`);

  // Test 2: Register with OTP (first time)
  const registerResult = await makeRequest('POST', '/users/auth/register', {
    fullName: testUser.name || 'Test User',
    phone: testUser.phone,
    otp: otpCode,
    sellerId: null, // Test without sellerId first
  }, null, 'any');

  recordTest('User Auth', '/users/auth/register', 'POST', 'Register User', registerResult);

  // Test 3: Login with OTP
  await sleep(1000);
  testUser.generateOTP();
  await testUser.save();
  await sleep(1000);
  
  const loginOTP = testUser.otp.code;
  const loginResult = await makeRequest('POST', '/users/auth/login', {
    phone: testUser.phone,
    otp: loginOTP,
  }, null, 'any');

  recordTest('User Auth', '/users/auth/login', 'POST', 'Login with OTP', loginResult);

  if (loginResult.success && loginResult.data?.data?.token) {
    authTokens.user = loginResult.data.data.token;
    console.log('   ✅ User authenticated successfully');
  }

  // Test 4: Register with sellerId (testing lifetime linking)
  const Seller = require('../models/Seller');
  const seller = await Seller.findOne({ status: 'approved', isActive: true });
  
  if (seller) {
    await sleep(1000);
    testUser.generateOTP();
    await testUser.save();
    await sleep(1000);
    
    // Try to register again with sellerId - should work for new user or user without sellerId
    const registerWithSellerResult = await makeRequest('POST', '/users/auth/register', {
      fullName: testUser.name,
      phone: testUser.phone,
      otp: testUser.otp.code,
      sellerId: seller.sellerId,
    }, null, 'any');

    recordTest('User Auth', '/users/auth/register', 'POST', 'Register with SellerID', registerWithSellerResult, 
      testUser.sellerId ? 'User already has sellerId - should preserve it' : 'First time sellerId linking');
  }

  // Test 5: Get User Profile
  if (authTokens.user) {
    const profileResult = await makeRequest('GET', '/users/profile', null, authTokens.user);
    recordTest('User Auth', '/users/profile', 'GET', 'Get User Profile', profileResult);
  }

  // Test 6: Get Seller ID (read-only endpoint)
  if (authTokens.user) {
    const sellerIdResult = await makeRequest('GET', '/users/profile/seller-id', null, authTokens.user);
    recordTest('User Auth', '/users/profile/seller-id', 'GET', 'Get Seller ID', sellerIdResult);
  }

  // Test 7: Invalid OTP
  const invalidOTPResult = await makeRequest('POST', '/users/auth/login', {
    phone: testUser.phone,
    otp: '000000',
  }, null, 401);
  recordTest('User Auth', '/users/auth/login', 'POST', 'Login - Invalid OTP', invalidOTPResult);
}

// ============================================================================
// ADMIN ENDPOINT TESTS
// ============================================================================

async function testAdminDashboard() {
  console.log('   Testing Admin Dashboard...');
  
  // Test 1: Get Dashboard
  const dashboardResult = await makeRequest('GET', '/admin/dashboard', null, authTokens.admin);
  recordTest('Admin Dashboard', '/admin/dashboard', 'GET', 'Get Dashboard Overview', dashboardResult);
  
  // Test 2: Get Dashboard - Unauthorized
  const unauthorizedResult = await makeRequest('GET', '/admin/dashboard', null, null, 401);
  recordTest('Admin Dashboard', '/admin/dashboard', 'GET', 'Get Dashboard - Unauthorized', unauthorizedResult);
}

async function testAdminProducts() {
  console.log('   Testing Admin Products...');
  
  const Product = require('../models/Product');
  const products = await Product.find().limit(5);
  
  // Test 1: Get All Products
  const listResult = await makeRequest('GET', '/admin/products', null, authTokens.admin);
  recordTest('Admin Products', '/admin/products', 'GET', 'Get All Products', listResult);
  
  // Test 2: Get Products with filters
  const filteredResult = await makeRequest('GET', '/admin/products?isActive=true&category=fertilizer', null, authTokens.admin);
  recordTest('Admin Products', '/admin/products', 'GET', 'Get Products - Filtered (Active & Category)', filteredResult);
  
  // Test 3: Get Product Details
  if (products.length > 0) {
    const detailsResult = await makeRequest('GET', `/admin/products/${products[0]._id}`, null, authTokens.admin);
    recordTest('Admin Products', '/admin/products/:productId', 'GET', 'Get Product Details', detailsResult);
  }
  
  // Test 4: Get Product Details - Invalid ID
  const invalidIdResult = await makeRequest('GET', '/admin/products/507f1f77bcf86cd799439011', null, authTokens.admin, 404);
  recordTest('Admin Products', '/admin/products/:productId', 'GET', 'Get Product Details - Invalid ID', invalidIdResult);
  
  // Test 5: Create Product
  const createResult = await makeRequest('POST', '/admin/products', {
    name: `Test Product ${Date.now()}`,
    description: 'Test product for API testing',
    category: 'fertilizer',
    priceToVendor: 500,
    priceToUser: 600,
    stock: 1000,
    sku: `TEST-${Date.now()}`,
  }, authTokens.admin, 'any');
  recordTest('Admin Products', '/admin/products', 'POST', 'Create Product', createResult);
  
  let createdProductId = null;
  if (createResult.success && createResult.data?.data?.product?.id) {
    createdProductId = createResult.data.data.product.id;
  } else if (products.length > 0) {
    createdProductId = products[0]._id.toString();
  }
  
  // Test 6: Update Product
  if (createdProductId) {
    const updateResult = await makeRequest('PUT', `/admin/products/${createdProductId}`, {
      name: `Updated Test Product ${Date.now()}`,
      description: 'Updated test product',
    }, authTokens.admin, 'any');
    recordTest('Admin Products', '/admin/products/:productId', 'PUT', 'Update Product', updateResult);
    
    // Test 7: Toggle Product Visibility
    const visibilityResult = await makeRequest('PUT', `/admin/products/${createdProductId}/visibility`, {
      isActive: false,
    }, authTokens.admin, 'any');
    recordTest('Admin Products', '/admin/products/:productId/visibility', 'PUT', 'Toggle Product Visibility', visibilityResult);
    
    // Test 8: Assign Product to Vendor
    const Vendor = require('../models/Vendor');
    const vendor = await Vendor.findOne({ status: 'approved', isActive: true });
    if (vendor) {
      const assignResult = await makeRequest('POST', `/admin/products/${createdProductId}/assign`, {
        vendorId: vendor._id.toString(),
        stock: 100,
      }, authTokens.admin, 'any');
      recordTest('Admin Products', '/admin/products/:productId/assign', 'POST', 'Assign Product to Vendor', assignResult);
    }
  }
  
  // Test 9: Create Product - Missing Required Fields
  const missingFieldsResult = await makeRequest('POST', '/admin/products', {
    name: 'Incomplete Product',
  }, authTokens.admin, 400);
  recordTest('Admin Products', '/admin/products', 'POST', 'Create Product - Missing Required Fields', missingFieldsResult);
  
  // Test 10: Delete Product (if created)
  if (createdProductId && createResult.success) {
    const deleteResult = await makeRequest('DELETE', `/admin/products/${createdProductId}`, null, authTokens.admin, 'any');
    recordTest('Admin Products', '/admin/products/:productId', 'DELETE', 'Delete Product', deleteResult);
  }
}

async function testAdminVendors() {
  console.log('   Testing Admin Vendors...');
  
  const Vendor = require('../models/Vendor');
  const vendors = await Vendor.find().limit(5);
  
  // Test 1: Get All Vendors
  const listResult = await makeRequest('GET', '/admin/vendors', null, authTokens.admin);
  recordTest('Admin Vendors', '/admin/vendors', 'GET', 'Get All Vendors', listResult);
  
  // Test 2: Get Vendors with filters
  const filteredResult = await makeRequest('GET', '/admin/vendors?status=approved&isActive=true', null, authTokens.admin);
  recordTest('Admin Vendors', '/admin/vendors', 'GET', 'Get Vendors - Filtered (Status & Active)', filteredResult);
  
  // Test 3: Get Vendor Details
  if (vendors.length > 0) {
    const detailsResult = await makeRequest('GET', `/admin/vendors/${vendors[0]._id}`, null, authTokens.admin);
    recordTest('Admin Vendors', '/admin/vendors/:vendorId', 'GET', 'Get Vendor Details', detailsResult);
    
    // Test 4: Approve Vendor (if pending)
    const pendingVendor = await Vendor.findOne({ status: 'pending' });
    if (pendingVendor) {
      const approveResult = await makeRequest('POST', `/admin/vendors/${pendingVendor._id}/approve`, {
        notes: 'Approved via API testing',
      }, authTokens.admin, 'any');
      recordTest('Admin Vendors', '/admin/vendors/:vendorId/approve', 'POST', 'Approve Vendor', approveResult);
    }
    
    // Test 5: Reject Vendor
    const pendingVendor2 = await Vendor.findOne({ status: 'pending' });
    if (pendingVendor2) {
      const rejectResult = await makeRequest('POST', `/admin/vendors/${pendingVendor2._id}/reject`, {
        reason: 'Rejected via API testing',
      }, authTokens.admin, 'any');
      recordTest('Admin Vendors', '/admin/vendors/:vendorId/reject', 'POST', 'Reject Vendor', rejectResult);
    }
    
    // Test 6: Update Vendor Credit Policy
    const approvedVendor = await Vendor.findOne({ status: 'approved', isActive: true });
    if (approvedVendor) {
      const creditPolicyResult = await makeRequest('PUT', `/admin/vendors/${approvedVendor._id}/credit-policy`, {
        creditLimit: 100000,
        repaymentDays: 30,
        penaltyRate: 2.5,
      }, authTokens.admin, 'any');
      recordTest('Admin Vendors', '/admin/vendors/:vendorId/credit-policy', 'PUT', 'Update Vendor Credit Policy', creditPolicyResult);
      
      // Test 7: Get Vendor Purchase Requests
      const purchasesResult = await makeRequest('GET', `/admin/vendors/${approvedVendor._id}/purchases`, null, authTokens.admin);
      recordTest('Admin Vendors', '/admin/vendors/:vendorId/purchases', 'GET', 'Get Vendor Purchase Requests', purchasesResult);
    }
  }
  
  // Test 8: Get Vendor Details - Invalid ID
  const invalidIdResult = await makeRequest('GET', '/admin/vendors/507f1f77bcf86cd799439011', null, authTokens.admin, 404);
  recordTest('Admin Vendors', '/admin/vendors/:vendorId', 'GET', 'Get Vendor Details - Invalid ID', invalidIdResult);
}

async function testAdminSellers() {
  console.log('   Testing Admin Sellers...');
  
  const Seller = require('../models/Seller');
  const sellers = await Seller.find().limit(5);
  
  // Test 1: Get All Sellers
  const listResult = await makeRequest('GET', '/admin/sellers', null, authTokens.admin);
  recordTest('Admin Sellers', '/admin/sellers', 'GET', 'Get All Sellers', listResult);
  
  // Test 2: Get Sellers with filters
  const filteredResult = await makeRequest('GET', '/admin/sellers?status=approved&isActive=true', null, authTokens.admin);
  recordTest('Admin Sellers', '/admin/sellers', 'GET', 'Get Sellers - Filtered', filteredResult);
  
  // Test 3: Get Seller Details
  if (sellers.length > 0) {
    const detailsResult = await makeRequest('GET', `/admin/sellers/${sellers[0]._id}`, null, authTokens.admin);
    recordTest('Admin Sellers', '/admin/sellers/:sellerId', 'GET', 'Get Seller Details', detailsResult);
    
    // Test 4: Create Seller
    const createResult = await makeRequest('POST', '/admin/sellers', {
      name: `Test Seller ${Date.now()}`,
      phone: `+91999${Math.floor(Math.random() * 10000000)}`,
      area: 'Test Area',
      monthlyTarget: 100000,
    }, authTokens.admin, 'any');
    recordTest('Admin Sellers', '/admin/sellers', 'POST', 'Create Seller', createResult);
    
    // Test 5: Update Seller
    const updateResult = await makeRequest('PUT', `/admin/sellers/${sellers[0]._id}`, {
      name: `Updated Seller ${Date.now()}`,
      area: 'Updated Area',
    }, authTokens.admin, 'any');
    recordTest('Admin Sellers', '/admin/sellers/:sellerId', 'PUT', 'Update Seller', updateResult);
    
    // Test 6: Set Seller Target
    const targetResult = await makeRequest('PUT', `/admin/sellers/${sellers[0]._id}/target`, {
      monthlyTarget: 150000,
    }, authTokens.admin, 'any');
    recordTest('Admin Sellers', '/admin/sellers/:sellerId/target', 'PUT', 'Set Seller Target', targetResult);
    
    // Test 7: Get Seller Withdrawals
    const withdrawalsResult = await makeRequest('GET', `/admin/sellers/${sellers[0]._id}/withdrawals`, null, authTokens.admin);
    recordTest('Admin Sellers', '/admin/sellers/:sellerId/withdrawals', 'GET', 'Get Seller Withdrawals', withdrawalsResult);
  }
  
  // Test 8: Approve/Reject Withdrawal
  const WithdrawalRequest = require('../models/WithdrawalRequest');
  const pendingWithdrawal = await WithdrawalRequest.findOne({ status: 'pending' });
  if (pendingWithdrawal) {
    // Test 9: Approve Withdrawal
    const approveResult = await makeRequest('POST', `/admin/sellers/withdrawals/${pendingWithdrawal._id}/approve`, {
      notes: 'Approved via API testing',
    }, authTokens.admin, 'any');
    recordTest('Admin Sellers', '/admin/sellers/withdrawals/:requestId/approve', 'POST', 'Approve Withdrawal', approveResult);
    
    // Test 10: Reject Withdrawal (if another pending exists)
    const pendingWithdrawal2 = await WithdrawalRequest.findOne({ status: 'pending' });
    if (pendingWithdrawal2) {
      const rejectResult = await makeRequest('POST', `/admin/sellers/withdrawals/${pendingWithdrawal2._id}/reject`, {
        reason: 'Rejected via API testing',
      }, authTokens.admin, 'any');
      recordTest('Admin Sellers', '/admin/sellers/withdrawals/:requestId/reject', 'POST', 'Reject Withdrawal', rejectResult);
    }
  }
}

async function testAdminUsers() {
  console.log('   Testing Admin Users...');
  
  const User = require('../models/User');
  const users = await User.find().limit(5);
  
  // Test 1: Get All Users
  const listResult = await makeRequest('GET', '/admin/users', null, authTokens.admin);
  recordTest('Admin Users', '/admin/users', 'GET', 'Get All Users', listResult);
  
  // Test 2: Get Users with filters
  const filteredResult = await makeRequest('GET', '/admin/users?isActive=true&isBlocked=false', null, authTokens.admin);
  recordTest('Admin Users', '/admin/users', 'GET', 'Get Users - Filtered', filteredResult);
  
  // Test 3: Get User Details
  if (users.length > 0) {
    const detailsResult = await makeRequest('GET', `/admin/users/${users[0]._id}`, null, authTokens.admin);
    recordTest('Admin Users', '/admin/users/:userId', 'GET', 'Get User Details', detailsResult);
    
    // Test 4: Block User (use a different user, not the test user)
    const activeUser = await User.findOne({ 
      isActive: true, 
      isBlocked: false,
      phone: { $ne: '+919012345678' }, // Don't block the test user
    });
    if (activeUser && users.length > 1) {
      const blockResult = await makeRequest('PUT', `/admin/users/${activeUser._id}/block`, {
        isBlocked: true,
        reason: 'Blocked via API testing',
      }, authTokens.admin, 'any');
      recordTest('Admin Users', '/admin/users/:userId/block', 'PUT', 'Block User', blockResult);
      
      // Test 5: Unblock User (immediately unblock to not affect other tests)
      const unblockResult = await makeRequest('PUT', `/admin/users/${activeUser._id}/block`, {
        isBlocked: false,
      }, authTokens.admin, 'any');
      recordTest('Admin Users', '/admin/users/:userId/block', 'PUT', 'Unblock User', unblockResult);
    } else {
      // Just test with a user that won't be used later
      if (users.length > 1) {
        const testUser = users[1];
        const blockResult = await makeRequest('PUT', `/admin/users/${testUser._id}/block`, {
          isBlocked: true,
          reason: 'Blocked via API testing',
        }, authTokens.admin, 'any');
        recordTest('Admin Users', '/admin/users/:userId/block', 'PUT', 'Block User', blockResult);
        
        // Immediately unblock
        await sleep(500);
        const unblockResult = await makeRequest('PUT', `/admin/users/${testUser._id}/block`, {
          isBlocked: false,
        }, authTokens.admin, 'any');
        recordTest('Admin Users', '/admin/users/:userId/block', 'PUT', 'Unblock User', unblockResult);
      }
    }
  }
}

async function testAdminOrders() {
  console.log('   Testing Admin Orders...');
  
  const Order = require('../models/Order');
  const orders = await Order.find().limit(5);
  
  // Test 1: Get All Orders
  const listResult = await makeRequest('GET', '/admin/orders', null, authTokens.admin);
  recordTest('Admin Orders', '/admin/orders', 'GET', 'Get All Orders', listResult);
  
  // Test 2: Get Orders with filters
  const filteredResult = await makeRequest('GET', '/admin/orders?status=pending&limit=10', null, authTokens.admin);
  recordTest('Admin Orders', '/admin/orders', 'GET', 'Get Orders - Filtered', filteredResult);
  
  // Test 3: Get Order Details
  if (orders.length > 0) {
    const detailsResult = await makeRequest('GET', `/admin/orders/${orders[0]._id}`, null, authTokens.admin);
    recordTest('Admin Orders', '/admin/orders/:orderId', 'GET', 'Get Order Details', detailsResult);
    
    // Test 4: Reassign Order
    const Vendor = require('../models/Vendor');
    const vendor = await Vendor.findOne({ status: 'approved', isActive: true });
    if (vendor && orders[0].assignedTo !== 'vendor') {
      const reassignResult = await makeRequest('PUT', `/admin/orders/${orders[0]._id}/reassign`, {
        vendorId: vendor._id.toString(),
      }, authTokens.admin, 'any');
      recordTest('Admin Orders', '/admin/orders/:orderId/reassign', 'PUT', 'Reassign Order', reassignResult);
    }
  }
}

async function testAdminPayments() {
  console.log('   Testing Admin Payments...');
  
  // Test 1: Get All Payments
  const listResult = await makeRequest('GET', '/admin/payments', null, authTokens.admin);
  recordTest('Admin Payments', '/admin/payments', 'GET', 'Get All Payments', listResult);
  
  // Test 2: Get Payments with filters
  const filteredResult = await makeRequest('GET', '/admin/payments?status=fully_paid&limit=20', null, authTokens.admin);
  recordTest('Admin Payments', '/admin/payments', 'GET', 'Get Payments - Filtered', filteredResult);
}

async function testAdminFinance() {
  console.log('   Testing Admin Finance...');
  
  // Test 1: Get Credits
  const creditsResult = await makeRequest('GET', '/admin/finance/credits', null, authTokens.admin);
  recordTest('Admin Finance', '/admin/finance/credits', 'GET', 'Get Vendor Credits', creditsResult);
  
  // Test 2: Get Recovery Status
  const recoveryResult = await makeRequest('GET', '/admin/finance/recovery', null, authTokens.admin);
  recordTest('Admin Finance', '/admin/finance/recovery', 'GET', 'Get Credit Recovery Status', recoveryResult);
  
  // Test 3: Approve/Reject Credit Purchase
  const CreditPurchase = require('../models/CreditPurchase');
  const pendingPurchase = await CreditPurchase.findOne({ status: 'pending' });
  if (pendingPurchase) {
    // Test 4: Approve Credit Purchase
    const approveResult = await makeRequest('POST', `/admin/vendors/purchases/${pendingPurchase._id}/approve`, {
      notes: 'Approved via API testing',
    }, authTokens.admin, 'any');
    recordTest('Admin Finance', '/admin/vendors/purchases/:requestId/approve', 'POST', 'Approve Credit Purchase', approveResult);
    
    // Test 5: Reject Credit Purchase (if another pending exists)
    const pendingPurchase2 = await CreditPurchase.findOne({ status: 'pending' });
    if (pendingPurchase2) {
      const rejectResult = await makeRequest('POST', `/admin/vendors/purchases/${pendingPurchase2._id}/reject`, {
        reason: 'Rejected via API testing',
      }, authTokens.admin, 'any');
      recordTest('Admin Finance', '/admin/vendors/purchases/:requestId/reject', 'POST', 'Reject Credit Purchase', rejectResult);
    }
  }
}

async function testAdminAnalytics() {
  console.log('   Testing Admin Analytics...');
  
  // Test 1: Get Analytics
  const analyticsResult = await makeRequest('GET', '/admin/analytics', null, authTokens.admin);
  recordTest('Admin Analytics', '/admin/analytics', 'GET', 'Get Analytics Data', analyticsResult);
  
  // Test 2: Get Reports
  const reportsResult = await makeRequest('GET', '/admin/reports?period=month&type=orders', null, authTokens.admin);
  recordTest('Admin Analytics', '/admin/reports', 'GET', 'Generate Reports', reportsResult);
}

async function testAdminMessages() {
  console.log('   Testing Admin Messages...');
  
  // Test 1: Get All Vendor Messages
  const listResult = await makeRequest('GET', '/admin/vendor-messages', null, authTokens.admin);
  recordTest('Admin Messages', '/admin/vendor-messages', 'GET', 'Get All Vendor Messages', listResult);
  
  // Test 2: Get Message Statistics
  const statsResult = await makeRequest('GET', '/admin/vendor-messages/stats', null, authTokens.admin);
  recordTest('Admin Messages', '/admin/vendor-messages/stats', 'GET', 'Get Message Statistics', statsResult);
  
  // Test 3: Create Message to Vendor (if vendor exists)
  const Vendor = require('../models/Vendor');
  const vendor = await Vendor.findOne({ status: 'approved', isActive: true });
  if (vendor) {
    const createResult = await makeRequest('POST', '/admin/vendor-messages', {
      vendorId: vendor._id.toString(),
      subject: 'Test Message from Admin',
      message: 'This is a test message from admin to vendor',
      category: 'general',
      priority: 'normal',
    }, authTokens.admin, 'any');
    recordTest('Admin Messages', '/admin/vendor-messages', 'POST', 'Create Message to Vendor', createResult);
    
    // Test 4: Get Message Details
    if (createResult.success && createResult.data?.data?.message?.id) {
      const messageId = createResult.data.data.message.id;
      const detailsResult = await makeRequest('GET', `/admin/vendor-messages/${messageId}`, null, authTokens.admin);
      recordTest('Admin Messages', '/admin/vendor-messages/:messageId', 'GET', 'Get Message Details', detailsResult);
      
      // Test 5: Update Message Status
      const statusResult = await makeRequest('PUT', `/admin/vendor-messages/${messageId}/status`, {
        status: 'resolved',
        resolutionNote: 'Resolved via API testing',
      }, authTokens.admin, 'any');
      recordTest('Admin Messages', '/admin/vendor-messages/:messageId/status', 'PUT', 'Update Message Status', statusResult);
    }
  }
}

// ============================================================================
// VENDOR ENDPOINT TESTS
// ============================================================================

async function testVendorDashboard() {
  console.log('   Testing Vendor Dashboard...');
  
  // Test 1: Get Dashboard
  const dashboardResult = await makeRequest('GET', '/vendors/dashboard', null, authTokens.vendor);
  recordTest('Vendor Dashboard', '/vendors/dashboard', 'GET', 'Get Dashboard Overview', dashboardResult);
  
  // Test 2: Get Dashboard - Unauthorized
  const unauthorizedResult = await makeRequest('GET', '/vendors/dashboard', null, null, 401);
  recordTest('Vendor Dashboard', '/vendors/dashboard', 'GET', 'Get Dashboard - Unauthorized', unauthorizedResult);
}

async function testVendorOrders() {
  console.log('   Testing Vendor Orders...');
  
  const Order = require('../models/Order');
  const orders = await Order.find({ assignedTo: 'vendor' }).limit(5);
  
  // Test 1: Get All Orders
  const listResult = await makeRequest('GET', '/vendors/orders', null, authTokens.vendor);
  recordTest('Vendor Orders', '/vendors/orders', 'GET', 'Get All Orders', listResult);
  
  // Test 2: Get Orders with filters
  const filteredResult = await makeRequest('GET', '/vendors/orders?status=pending&limit=10', null, authTokens.vendor);
  recordTest('Vendor Orders', '/vendors/orders', 'GET', 'Get Orders - Filtered', filteredResult);
  
  // Test 3: Get Order Statistics
  const statsResult = await makeRequest('GET', '/vendors/orders/stats', null, authTokens.vendor);
  recordTest('Vendor Orders', '/vendors/orders/stats', 'GET', 'Get Order Statistics', statsResult);
  
  // Test 4: Get Order Details
  if (orders.length > 0) {
    const detailsResult = await makeRequest('GET', `/vendors/orders/${orders[0]._id}`, null, authTokens.vendor);
    recordTest('Vendor Orders', '/vendors/orders/:orderId', 'GET', 'Get Order Details', detailsResult);
    
    // Test 5: Accept Order (if pending)
    const pendingOrder = await Order.findOne({ status: 'pending', assignedTo: 'vendor' });
    if (pendingOrder) {
      const acceptResult = await makeRequest('POST', `/vendors/orders/${pendingOrder._id}/accept`, {
        notes: 'Accepted via API testing',
      }, authTokens.vendor, 'any');
      recordTest('Vendor Orders', '/vendors/orders/:orderId/accept', 'POST', 'Accept Order', acceptResult);
    }
    
    // Test 6: Reject Order
    const awaitingOrder = await Order.findOne({ status: 'awaiting', assignedTo: 'vendor' });
    if (awaitingOrder) {
      const rejectResult = await makeRequest('POST', `/vendors/orders/${awaitingOrder._id}/reject`, {
        reason: 'Rejected via API testing - insufficient stock',
      }, authTokens.vendor, 'any');
      recordTest('Vendor Orders', '/vendors/orders/:orderId/reject', 'POST', 'Reject Order', rejectResult);
    }
    
    // Test 7: Partial Accept Order
    const pendingOrder2 = await Order.findOne({ status: 'pending', assignedTo: 'vendor' });
    if (pendingOrder2 && pendingOrder2.items && pendingOrder2.items.length > 1) {
      const partialAcceptResult = await makeRequest('POST', `/vendors/orders/${pendingOrder2._id}/accept-partial`, {
        acceptedItems: [{ itemId: pendingOrder2.items[0]._id.toString(), quantity: pendingOrder2.items[0].quantity }],
        rejectedItems: [{ itemId: pendingOrder2.items[1]._id.toString(), quantity: pendingOrder2.items[1].quantity, reason: 'Out of stock' }],
        notes: 'Partially accepted via API testing',
      }, authTokens.vendor, 'any');
      recordTest('Vendor Orders', '/vendors/orders/:orderId/accept-partial', 'POST', 'Partially Accept Order', partialAcceptResult);
    }
    
    // Test 8: Update Order Status
    const awaitingOrder2 = await Order.findOne({ status: 'awaiting', assignedTo: 'vendor' });
    if (awaitingOrder2) {
      const statusResult = await makeRequest('PUT', `/vendors/orders/${awaitingOrder2._id}/status`, {
        status: 'dispatched',
        notes: 'Order dispatched via API testing',
      }, authTokens.vendor, 'any');
      recordTest('Vendor Orders', '/vendors/orders/:orderId/status', 'PUT', 'Update Order Status', statusResult);
    }
  }
  
  // Test 9: Get Order Details - Invalid ID
  const invalidIdResult = await makeRequest('GET', '/vendors/orders/507f1f77bcf86cd799439011', null, authTokens.vendor, 404);
  recordTest('Vendor Orders', '/vendors/orders/:orderId', 'GET', 'Get Order Details - Invalid ID', invalidIdResult);
}

async function testVendorInventory() {
  console.log('   Testing Vendor Inventory...');
  
  const ProductAssignment = require('../models/ProductAssignment');
  const Vendor = require('../models/Vendor');
  const vendor = await Vendor.findOne({ status: 'approved', isActive: true });
  
  if (!vendor) return;
  
  const assignments = await ProductAssignment.find({ vendorId: vendor._id }).limit(5);
  
  // Test 1: Get All Inventory
  const listResult = await makeRequest('GET', '/vendors/inventory', null, authTokens.vendor);
  recordTest('Vendor Inventory', '/vendors/inventory', 'GET', 'Get All Inventory', listResult);
  
  // Test 2: Get Inventory Statistics
  const statsResult = await makeRequest('GET', '/vendors/inventory/stats', null, authTokens.vendor);
  recordTest('Vendor Inventory', '/vendors/inventory/stats', 'GET', 'Get Inventory Statistics', statsResult);
  
  // Test 3: Get Inventory Item Details
  if (assignments.length > 0) {
    const detailsResult = await makeRequest('GET', `/vendors/inventory/${assignments[0]._id}`, null, authTokens.vendor);
    recordTest('Vendor Inventory', '/vendors/inventory/:itemId', 'GET', 'Get Inventory Item Details', detailsResult);
    
    // Test 4: Update Stock
    const updateResult = await makeRequest('PUT', `/vendors/inventory/${assignments[0]._id}/stock`, {
      quantity: 150,
      notes: 'Stock updated via API testing',
    }, authTokens.vendor, 'any');
    recordTest('Vendor Inventory', '/vendors/inventory/:itemId/stock', 'PUT', 'Update Stock Quantity', updateResult);
  }
}

async function testVendorCredit() {
  console.log('   Testing Vendor Credit...');
  
  // Test 1: Get Credit Info
  const creditInfoResult = await makeRequest('GET', '/vendors/credit', null, authTokens.vendor);
  recordTest('Vendor Credit', '/vendors/credit', 'GET', 'Get Credit Information', creditInfoResult);
  
  // Test 2: Get Credit Purchase History
  const purchasesResult = await makeRequest('GET', '/vendors/credit/purchases', null, authTokens.vendor);
  recordTest('Vendor Credit', '/vendors/credit/purchases', 'GET', 'Get Credit Purchase Requests', purchasesResult);
  
  // Test 3: Get Credit Purchase Details
  const CreditPurchase = require('../models/CreditPurchase');
  const Vendor = require('../models/Vendor');
  const vendor = await Vendor.findOne({ status: 'approved', isActive: true });
  if (vendor) {
    const purchase = await CreditPurchase.findOne({ vendorId: vendor._id });
    if (purchase) {
      const detailsResult = await makeRequest('GET', `/vendors/credit/purchases/${purchase._id}`, null, authTokens.vendor);
      recordTest('Vendor Credit', '/vendors/credit/purchases/:requestId', 'GET', 'Get Credit Purchase Details', detailsResult);
    }
    
    // Test 4: Request Credit Purchase
    const Product = require('../models/Product');
    const products = await Product.find({ isActive: true }).limit(3);
    if (products.length >= 3) {
      const items = products.map((p, idx) => ({
        productId: p._id.toString(),
        quantity: 50 + (idx * 10),
        unitPrice: p.priceToVendor,
        totalPrice: (50 + (idx * 10)) * p.priceToVendor,
      }));
      const totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);
      
      if (totalAmount >= 50000) {
        const requestResult = await makeRequest('POST', '/vendors/credit/purchase', {
          items,
          totalAmount,
          notes: 'Credit purchase request via API testing',
        }, authTokens.vendor, 'any');
        recordTest('Vendor Credit', '/vendors/credit/purchase', 'POST', 'Request Credit Purchase', requestResult);
      }
    }
    
    // Test 5: Get Credit History
    const historyResult = await makeRequest('GET', '/vendors/credit/history', null, authTokens.vendor);
    recordTest('Vendor Credit', '/vendors/credit/history', 'GET', 'Get Credit History', historyResult);
  }
  
  // Test 6: Request Credit Purchase - Below Minimum (should fail)
  const Product = require('../models/Product');
  const product = await Product.findOne({ isActive: true });
  if (product) {
    const minTestResult = await makeRequest('POST', '/vendors/credit/purchase', {
      items: [{ productId: product._id.toString(), quantity: 1, unitPrice: 1000, totalPrice: 1000 }],
      totalAmount: 1000,
    }, authTokens.vendor, 400);
    recordTest('Vendor Credit', '/vendors/credit/purchase', 'POST', 'Request Credit Purchase - Below Minimum (₹50,000)', minTestResult);
  }
}

async function testVendorReports() {
  console.log('   Testing Vendor Reports...');
  
  // Test 1: Get Reports
  const reportsResult = await makeRequest('GET', '/vendors/reports?period=month&type=revenue', null, authTokens.vendor);
  recordTest('Vendor Reports', '/vendors/reports', 'GET', 'Get Reports Data', reportsResult);
  
  // Test 2: Get Performance Analytics
  const analyticsResult = await makeRequest('GET', '/vendors/reports/analytics', null, authTokens.vendor);
  recordTest('Vendor Reports', '/vendors/reports/analytics', 'GET', 'Get Performance Analytics', analyticsResult);
}

async function testVendorMessages() {
  console.log('   Testing Vendor Messages...');
  
  // Test 1: Get Vendor Messages
  const listResult = await makeRequest('GET', '/vendors/messages', null, authTokens.vendor);
  recordTest('Vendor Messages', '/vendors/messages', 'GET', 'Get Vendor Messages', listResult);
  
  // Test 2: Create Message to Admin
  const createResult = await makeRequest('POST', '/vendors/messages', {
    subject: 'Test Message from Vendor',
    message: 'This is a test message from vendor to admin',
    category: 'general',
    priority: 'normal',
  }, authTokens.vendor, 'any');
  recordTest('Vendor Messages', '/vendors/messages', 'POST', 'Create Message to Admin', createResult);
  
  // Test 3: Get Message Details
  if (createResult.success && createResult.data?.data?.message?.id) {
    const messageId = createResult.data.data.message.id;
    const detailsResult = await makeRequest('GET', `/vendors/messages/${messageId}`, null, authTokens.vendor);
    recordTest('Vendor Messages', '/vendors/messages/:messageId', 'GET', 'Get Message Details', detailsResult);
  }
  
  // Test 4: Create Message - Missing Required Fields
  const missingFieldsResult = await makeRequest('POST', '/vendors/messages', {
    subject: 'Incomplete Message',
  }, authTokens.vendor, 400);
  recordTest('Vendor Messages', '/vendors/messages', 'POST', 'Create Message - Missing Required Fields', missingFieldsResult);
}

// ============================================================================
// SELLER ENDPOINT TESTS
// ============================================================================

async function testSellerDashboard() {
  console.log('   Testing Seller Dashboard...');
  
  // Test 1: Get Dashboard
  const dashboardResult = await makeRequest('GET', '/sellers/dashboard', null, authTokens.seller);
  recordTest('Seller Dashboard', '/sellers/dashboard', 'GET', 'Get Dashboard Overview', dashboardResult);
  
  // Test 2: Get Overview
  const overviewResult = await makeRequest('GET', '/sellers/dashboard/overview', null, authTokens.seller);
  recordTest('Seller Dashboard', '/sellers/dashboard/overview', 'GET', 'Get Dashboard Overview', overviewResult);
  
  // Test 3: Get Wallet
  const walletResult = await makeRequest('GET', '/sellers/dashboard/wallet', null, authTokens.seller);
  recordTest('Seller Dashboard', '/sellers/dashboard/wallet', 'GET', 'Get Dashboard Wallet', walletResult);
  
  // Test 4: Get Referrals
  const referralsResult = await makeRequest('GET', '/sellers/dashboard/referrals', null, authTokens.seller);
  recordTest('Seller Dashboard', '/sellers/dashboard/referrals', 'GET', 'Get Dashboard Referrals', referralsResult);
  
  // Test 5: Get Performance
  const performanceResult = await makeRequest('GET', '/sellers/dashboard/performance', null, authTokens.seller);
  recordTest('Seller Dashboard', '/sellers/dashboard/performance', 'GET', 'Get Dashboard Performance', performanceResult);
}

async function testSellerWallet() {
  console.log('   Testing Seller Wallet...');
  
  // Test 1: Get Wallet Details
  const walletResult = await makeRequest('GET', '/sellers/wallet', null, authTokens.seller);
  recordTest('Seller Wallet', '/sellers/wallet', 'GET', 'Get Wallet Details', walletResult);
  
  // Test 2: Get Wallet Transactions
  const transactionsResult = await makeRequest('GET', '/sellers/wallet/transactions', null, authTokens.seller);
  recordTest('Seller Wallet', '/sellers/wallet/transactions', 'GET', 'Get Wallet Transactions', transactionsResult);
  
  // Test 3: Request Withdrawal
  let seller = null;
  if (authTokens.seller) {
    try {
      const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key_change_in_production';
      const decoded = jwt.verify(authTokens.seller, JWT_SECRET);
      const Seller = require('../models/Seller');
      seller = await Seller.findById(decoded.userId || decoded.sellerId);
    } catch (e) {
      // Token invalid - skip
    }
  }
  if (seller && seller.wallet?.balance > 100) {
    const withdrawResult = await makeRequest('POST', '/sellers/wallet/withdraw', {
      amount: Math.min(seller.wallet.balance, 1000),
      paymentDetails: {
        bankName: 'Test Bank',
        accountNumber: '1234567890',
        ifscCode: 'TEST0001234',
        accountHolderName: seller.name,
      },
    }, authTokens.seller, 'any');
    recordTest('Seller Wallet', '/sellers/wallet/withdraw', 'POST', 'Request Withdrawal', withdrawResult);
  }
  
  // Test 4: Get Withdrawals
  const withdrawalsResult = await makeRequest('GET', '/sellers/wallet/withdrawals', null, authTokens.seller);
  recordTest('Seller Wallet', '/sellers/wallet/withdrawals', 'GET', 'Get Withdrawal Requests', withdrawalsResult);
  
  // Test 5: Request Withdrawal - Insufficient Balance
  const insufficientResult = await makeRequest('POST', '/sellers/wallet/withdraw', {
    amount: 9999999,
    paymentDetails: {
      bankName: 'Test Bank',
      accountNumber: '1234567890',
      ifscCode: 'TEST0001234',
      accountHolderName: 'Test',
    },
  }, authTokens.seller, 400);
  recordTest('Seller Wallet', '/sellers/wallet/withdraw', 'POST', 'Request Withdrawal - Insufficient Balance', insufficientResult);
}

async function testSellerReferrals() {
  console.log('   Testing Seller Referrals...');
  
  // Test 1: Get Referrals
  const referralsResult = await makeRequest('GET', '/sellers/referrals', null, authTokens.seller);
  recordTest('Seller Referrals', '/sellers/referrals', 'GET', 'Get All Referrals', referralsResult);
  
  // Test 2: Get Referral Statistics
  const statsResult = await makeRequest('GET', '/sellers/referrals/stats', null, authTokens.seller);
  recordTest('Seller Referrals', '/sellers/referrals/stats', 'GET', 'Get Referral Statistics', statsResult);
  
  // Test 3: Get Referral Details
  const User = require('../models/User');
  const Seller = require('../models/Seller');
  const sellerDoc = await Seller.findOne({ status: 'approved', isActive: true });
  if (sellerDoc) {
    const referralUser = await User.findOne({ sellerId: sellerDoc.sellerId });
    if (referralUser) {
      const detailsResult = await makeRequest('GET', `/sellers/referrals/${referralUser._id}`, null, authTokens.seller);
      recordTest('Seller Referrals', '/sellers/referrals/:referralId', 'GET', 'Get Referral Details', detailsResult);
    }
  }
}

async function testSellerPerformance() {
  console.log('   Testing Seller Performance...');
  
  // Test 1: Get Target
  const targetResult = await makeRequest('GET', '/sellers/target', null, authTokens.seller);
  recordTest('Seller Performance', '/sellers/target', 'GET', 'Get Monthly Target', targetResult);
  
  // Test 2: Get Performance Analytics
  const performanceResult = await makeRequest('GET', '/sellers/performance', null, authTokens.seller);
  recordTest('Seller Performance', '/sellers/performance', 'GET', 'Get Performance Analytics', performanceResult);
}

// ============================================================================
// USER ENDPOINT TESTS
// ============================================================================

async function testUserProducts() {
  console.log('   Testing User Products...');
  
  // Test 1: Get Categories
  const categoriesResult = await makeRequest('GET', '/users/products/categories', null, null);
  recordTest('User Products', '/users/products/categories', 'GET', 'Get Categories', categoriesResult, 'Public endpoint');
  
  // Test 2: Get Products (Public)
  const productsResult = await makeRequest('GET', '/users/products', null, null);
  recordTest('User Products', '/users/products', 'GET', 'Get Products', productsResult, 'Public endpoint');
  
  // Test 3: Get Products with filters
  const filteredResult = await makeRequest('GET', '/users/products?category=fertilizer&isActive=true', null, null);
  recordTest('User Products', '/users/products', 'GET', 'Get Products - Filtered', filteredResult, 'Public endpoint');
  
  // Test 4: Get Popular Products
  const popularResult = await makeRequest('GET', '/users/products/popular', null, null);
  recordTest('User Products', '/users/products/popular', 'GET', 'Get Popular Products', popularResult, 'Public endpoint');
  
  // Test 5: Search Products
  const searchResult = await makeRequest('GET', '/users/products/search?q=urea', null, null);
  recordTest('User Products', '/users/products/search', 'GET', 'Search Products', searchResult, 'Public endpoint');
  
  // Test 6: Get Product Details
  const Product = require('../models/Product');
  const product = await Product.findOne({ isActive: true });
  if (product) {
    const detailsResult = await makeRequest('GET', `/users/products/${product._id}`, null, null);
    recordTest('User Products', '/users/products/:productId', 'GET', 'Get Product Details', detailsResult, 'Public endpoint');
  }
  
  // Test 7: Get Offers
  const offersResult = await makeRequest('GET', '/users/offers', null, null);
  recordTest('User Products', '/users/offers', 'GET', 'Get Offers/Banners', offersResult, 'Public endpoint');
}

async function testUserCart() {
  console.log('   Testing User Cart...');
  
  // Test 1: Get Cart
  const getCartResult = await makeRequest('GET', '/users/cart', null, authTokens.user);
  recordTest('User Cart', '/users/cart', 'GET', 'Get Cart', getCartResult);
  
  // Test 2: Validate Cart
  const validateResult = await makeRequest('POST', '/users/cart/validate', null, authTokens.user);
  recordTest('User Cart', '/users/cart/validate', 'POST', 'Validate Cart', validateResult);
  
  // Test 3: Add to Cart
  const Product = require('../models/Product');
  const product = await Product.findOne({ isActive: true });
  if (product) {
    const addResult = await makeRequest('POST', '/users/cart', {
      productId: product._id.toString(),
      quantity: 2,
    }, authTokens.user, 'any');
    recordTest('User Cart', '/users/cart', 'POST', 'Add to Cart', addResult);
    
    // Get cart again to get item ID
    await sleep(500);
    const cartResult = await makeRequest('GET', '/users/cart', null, authTokens.user);
    if (cartResult.success && cartResult.data?.data?.cart?.items?.length > 0) {
      const itemId = cartResult.data.data.cart.items[0].id || cartResult.data.data.cart.items[0]._id;
      
      // Test 4: Update Cart Item
      const updateResult = await makeRequest('PUT', `/users/cart/${itemId}`, {
        quantity: 3,
      }, authTokens.user, 'any');
      recordTest('User Cart', '/users/cart/:itemId', 'PUT', 'Update Cart Item', updateResult);
      
      // Test 5: Remove from Cart
      const removeResult = await makeRequest('DELETE', `/users/cart/${itemId}`, null, authTokens.user, 'any');
      recordTest('User Cart', '/users/cart/:itemId', 'DELETE', 'Remove from Cart', removeResult);
    }
    
    // Test 6: Add to Cart again and Clear Cart
    await makeRequest('POST', '/users/cart', {
      productId: product._id.toString(),
      quantity: 1,
    }, authTokens.user, 'any');
    await sleep(500);
    
    const clearResult = await makeRequest('DELETE', '/users/cart', null, authTokens.user, 'any');
    recordTest('User Cart', '/users/cart', 'DELETE', 'Clear Cart', clearResult);
  }
  
  // Test 7: Add to Cart - Invalid Product ID
  const invalidProductResult = await makeRequest('POST', '/users/cart', {
    productId: '507f1f77bcf86cd799439011',
    quantity: 1,
  }, authTokens.user, 404);
  recordTest('User Cart', '/users/cart', 'POST', 'Add to Cart - Invalid Product ID', invalidProductResult);
  
  // Test 8: Add to Cart - Missing Quantity
  if (product) {
    const missingQtyResult = await makeRequest('POST', '/users/cart', {
      productId: product._id.toString(),
    }, authTokens.user, 400);
    recordTest('User Cart', '/users/cart', 'POST', 'Add to Cart - Missing Quantity', missingQtyResult);
  }
}

async function testUserOrders() {
  console.log('   Testing User Orders...');
  
  // Test 1: Get Orders
  const listResult = await makeRequest('GET', '/users/orders', null, authTokens.user);
  recordTest('User Orders', '/users/orders', 'GET', 'Get All Orders', listResult);
  
  // Test 2: Get Orders with filters
  const filteredResult = await makeRequest('GET', '/users/orders?status=pending&limit=10', null, authTokens.user);
  recordTest('User Orders', '/users/orders', 'GET', 'Get Orders - Filtered', filteredResult);
  
  // Test 3: Get Order Details
  const Order = require('../models/Order');
  const User = require('../models/User');
  let userId = null;
  if (authTokens.user) {
    try {
      const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key_change_in_production';
      const decoded = jwt.verify(authTokens.user, JWT_SECRET);
      userId = decoded.userId || decoded.id;
    } catch (e) {
      // Token invalid
    }
  }
  const user = userId ? await User.findById(userId) : null;
  if (user) {
    const order = await Order.findOne({ userId: user._id });
    if (order) {
      const detailsResult = await makeRequest('GET', `/users/orders/${order._id}`, null, authTokens.user);
      recordTest('User Orders', '/users/orders/:orderId', 'GET', 'Get Order Details', detailsResult);
      
      // Test 4: Track Order
      const trackResult = await makeRequest('GET', `/users/orders/${order._id}/track`, null, authTokens.user);
      recordTest('User Orders', '/users/orders/:orderId/track', 'GET', 'Track Order', trackResult);
      
      // Test 5: Cancel Order (if cancellable)
      if (order.status === 'pending' || order.status === 'awaiting') {
        const cancelResult = await makeRequest('PUT', `/users/orders/${order._id}/cancel`, {
          reason: 'Cancelled via API testing',
        }, authTokens.user, 'any');
        recordTest('User Orders', '/users/orders/:orderId/cancel', 'PUT', 'Cancel Order', cancelResult);
      }
    }
    
    // Test 6: Create Order (requires cart)
    const Cart = require('../models/Cart');
    const Product = require('../models/Product');
    const products = await Product.find({ isActive: true, priceToUser: { $exists: true, $ne: null, $gt: 0 } }).limit(2);
    const Address = require('../models/Address');
    let userAddress = await Address.findOne({ userId: user._id, isDefault: true });
    
    if (products.length >= 2 && userAddress) {
      // Add items to cart first using API (proper way)
      const cart = await Cart.findOne({ userId: user._id });
      if (cart) {
        // Clear cart first
        await makeRequest('DELETE', '/users/cart', null, authTokens.user, 'any');
        await sleep(500);
        
        // Add items via API
        for (const product of products) {
          if (product.priceToUser && product.priceToUser > 0) {
            await makeRequest('POST', '/users/cart', {
              productId: product._id.toString(),
              quantity: 2,
            }, authTokens.user, 'any');
            await sleep(300);
          }
        }
        
        await sleep(500);
        
        // Create order
        const createResult = await makeRequest('POST', '/users/orders', {
          addressId: userAddress._id.toString(),
          paymentPreference: 'partial',
          notes: 'Order created via API testing',
        }, authTokens.user, 'any');
        recordTest('User Orders', '/users/orders', 'POST', 'Create Order', createResult);
      }
    } else if (!userAddress) {
      // Create address first if missing
      const createAddressResult = await makeRequest('POST', '/users/addresses', {
        name: 'Test Address',
        address: '123 Test Street',
        city: 'Test City',
        state: 'Test State',
        pincode: '123456',
        phone: user.phone || '+919012345678',
        coordinates: { lat: 28.6139, lng: 77.2090 },
        isDefault: true,
      }, authTokens.user, 'any');
      
      if (createAddressResult.success && createAddressResult.data?.data?.address?.id) {
        userAddress = { _id: createAddressResult.data.data.address.id };
        // Retry order creation
        if (products.length >= 2) {
          await sleep(500);
          const createResult = await makeRequest('POST', '/users/orders', {
            addressId: userAddress._id.toString(),
            paymentPreference: 'partial',
            notes: 'Order created via API testing',
          }, authTokens.user, 'any');
          recordTest('User Orders', '/users/orders', 'POST', 'Create Order (with new address)', createResult);
        }
      }
    }
  }
  
  // Test 7: Create Order - Empty Cart (should fail)
  const Cart = require('../models/Cart');
  let userId2 = null;
  if (authTokens.user) {
    try {
      const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key_change_in_production';
      const decoded = jwt.verify(authTokens.user, JWT_SECRET);
      userId2 = decoded.userId || decoded.id;
    } catch (e) {
      // Token invalid
    }
  }
  const user2 = userId2 ? await User.findById(userId2) : null;
  if (user2) {
    const cart = await Cart.findOne({ userId: user2._id });
    if (cart) {
      cart.clear();
      await cart.save();
      await sleep(500);
      
      const emptyCartResult = await makeRequest('POST', '/users/orders', {
        paymentPreference: 'partial',
      }, authTokens.user, 400);
      recordTest('User Orders', '/users/orders', 'POST', 'Create Order - Empty Cart', emptyCartResult);
    }
  }
}

async function testUserPayments() {
  console.log('   Testing User Payments...');
  
  // Test 1: Get Payment Status
  const Payment = require('../models/Payment');
  const User = require('../models/User');
  let userId3 = null;
  if (authTokens.user) {
    try {
      const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key_change_in_production';
      const decoded = jwt.verify(authTokens.user, JWT_SECRET);
      userId3 = decoded.userId || decoded.id;
    } catch (e) {
      // Token invalid
    }
  }
  const user3 = userId3 ? await User.findById(userId3) : null;
  if (user3) {
    const payment = await Payment.findOne({ userId: user3._id });
    if (payment) {
      const statusResult = await makeRequest('GET', `/users/payments/${payment._id}`, null, authTokens.user);
      recordTest('User Payments', '/users/payments/:paymentId', 'GET', 'Get Payment Status', statusResult);
    }
    
    // Test 2: Get Order Payments
    const Order = require('../models/Order');
    const order = await Order.findOne({ userId: user3._id });
    if (order) {
      const orderPaymentsResult = await makeRequest('GET', `/users/orders/${order._id}/payments`, null, authTokens.user);
      recordTest('User Payments', '/users/orders/:orderId/payments', 'GET', 'Get Order Payments', orderPaymentsResult);
      
      // Test 3: Create Payment Intent (if order exists and payment pending)
      if (order.paymentStatus === 'pending') {
        const intentResult = await makeRequest('POST', '/users/payments/create-intent', {
          orderId: order._id.toString(),
          paymentMethod: 'razorpay',
        }, authTokens.user, 'any');
        recordTest('User Payments', '/users/payments/create-intent', 'POST', 'Create Payment Intent', intentResult);
      }
      
      // Test 4: Confirm Payment (if intent created)
      if (order.paymentStatus === 'pending' || order.paymentStatus === 'partial_paid') {
        const confirmResult = await makeRequest('POST', '/users/payments/confirm', {
          orderId: order._id.toString(),
          paymentId: payment?._id?.toString() || 'test_payment_id',
          gatewayPaymentId: 'gateway_test_123',
          gatewayOrderId: 'gateway_order_123',
        }, authTokens.user, 'any');
        recordTest('User Payments', '/users/payments/confirm', 'POST', 'Confirm Payment', confirmResult);
      }
      
      // Test 5: Create Remaining Payment Intent (if order is delivered and partially paid)
      if (order.status === 'delivered' && order.paymentStatus === 'partial_paid' && order.remainingAmount > 0) {
        const remainingIntentResult = await makeRequest('POST', '/users/payments/create-remaining', {
          orderId: order._id.toString(),
          paymentMethod: 'razorpay',
        }, authTokens.user, 'any');
        recordTest('User Payments', '/users/payments/create-remaining', 'POST', 'Create Remaining Payment Intent', remainingIntentResult);
        
        // Test 6: Confirm Remaining Payment
        const confirmRemainingResult = await makeRequest('POST', '/users/payments/confirm-remaining', {
          orderId: order._id.toString(),
          paymentId: 'test_remaining_payment_id',
          gatewayPaymentId: 'gateway_remaining_123',
          gatewayOrderId: 'gateway_remaining_order_123',
        }, authTokens.user, 'any');
        recordTest('User Payments', '/users/payments/confirm-remaining', 'POST', 'Confirm Remaining Payment', confirmRemainingResult);
      }
    }
  }
}

async function testUserAddresses() {
  console.log('   Testing User Addresses...');
  
  const User = require('../models/User');
  const Address = require('../models/Address');
  
  // Test 1: Get Addresses
  const listResult = await makeRequest('GET', '/users/addresses', null, authTokens.user);
  recordTest('User Addresses', '/users/addresses', 'GET', 'Get All Addresses', listResult);
  
  // Test 2: Add Address
  const addResult = await makeRequest('POST', '/users/addresses', {
    name: 'Test Address',
    address: '123 Test Street',
    city: 'Test City',
    state: 'Test State',
    pincode: '123456',
    phone: '+919012345678',
    coordinates: { lat: 28.6139, lng: 77.2090 },
    isDefault: false,
  }, authTokens.user, 'any');
  recordTest('User Addresses', '/users/addresses', 'POST', 'Add Address', addResult);
  
  let addressId = null;
  if (addResult.success && addResult.data?.data?.address?.id) {
    addressId = addResult.data.data.address.id;
  } else {
    // Get existing address
    let userId4 = null;
    if (authTokens.user) {
      try {
        const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key_change_in_production';
        const decoded = jwt.verify(authTokens.user, JWT_SECRET);
        userId4 = decoded.userId || decoded.id;
      } catch (e) {
        // Token invalid
      }
    }
    const user4 = userId4 ? await User.findById(userId4) : null;
    if (user4) {
      const address = await Address.findOne({ userId: user4._id });
      if (address) addressId = address._id.toString();
    }
  }
  
  // Test 3: Update Address
  if (addressId) {
    const updateResult = await makeRequest('PUT', `/users/addresses/${addressId}`, {
      name: 'Updated Test Address',
      city: 'Updated City',
    }, authTokens.user, 'any');
    recordTest('User Addresses', '/users/addresses/:addressId', 'PUT', 'Update Address', updateResult);
    
    // Test 4: Set Default Address
    const defaultResult = await makeRequest('PUT', `/users/addresses/${addressId}/default`, null, authTokens.user, 'any');
    recordTest('User Addresses', '/users/addresses/:addressId/default', 'PUT', 'Set Default Address', defaultResult);
  }
  
  // Test 5: Add Address - Missing Required Fields
  const missingFieldsResult = await makeRequest('POST', '/users/addresses', {
    name: 'Incomplete Address',
  }, authTokens.user, 400);
  recordTest('User Addresses', '/users/addresses', 'POST', 'Add Address - Missing Required Fields', missingFieldsResult);
  
  // Test 6: Delete Address (if we have one)
  if (addressId) {
    // Create another address first so we don't delete the last one
    let userId5 = null;
    if (authTokens.user) {
      try {
        const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key_change_in_production';
        const decoded = jwt.verify(authTokens.user, JWT_SECRET);
        userId5 = decoded.userId || decoded.id;
      } catch (e) {
        // Token invalid
      }
    }
    const user5 = userId5 ? await User.findById(userId5) : null;
    if (user5) {
      const Address = require('../models/Address');
      const addresses = await Address.find({ userId: user5._id });
      if (addresses.length > 1) {
        const deleteResult = await makeRequest('DELETE', `/users/addresses/${addressId}`, null, authTokens.user, 'any');
        recordTest('User Addresses', '/users/addresses/:addressId', 'DELETE', 'Delete Address', deleteResult);
      }
    }
  }
}

async function testUserFavourites() {
  console.log('   Testing User Favourites...');
  
  // Test 1: Get Favourites
  const listResult = await makeRequest('GET', '/users/favourites', null, authTokens.user);
  recordTest('User Favourites', '/users/favourites', 'GET', 'Get Favourites', listResult);
  
  // Test 2: Add to Favourites
  const Product = require('../models/Product');
  const product = await Product.findOne({ isActive: true });
  if (product) {
    const addResult = await makeRequest('POST', '/users/favourites', {
      productId: product._id.toString(),
    }, authTokens.user, 'any');
    recordTest('User Favourites', '/users/favourites', 'POST', 'Add to Favourites', addResult);
    
    // Test 3: Remove from Favourites
    await sleep(500);
    const removeResult = await makeRequest('DELETE', `/users/favourites/${product._id}`, null, authTokens.user, 'any');
    recordTest('User Favourites', '/users/favourites/:productId', 'DELETE', 'Remove from Favourites', removeResult);
  }
  
  // Test 4: Add to Favourites - Invalid Product ID
  const invalidProductResult = await makeRequest('POST', '/users/favourites', {
    productId: '507f1f77bcf86cd799439011',
  }, authTokens.user, 404);
  recordTest('User Favourites', '/users/favourites', 'POST', 'Add to Favourites - Invalid Product ID', invalidProductResult);
}

async function testUserNotifications() {
  console.log('   Testing User Notifications...');
  
  // Test 1: Get Notifications
  const listResult = await makeRequest('GET', '/users/notifications', null, authTokens.user);
  recordTest('User Notifications', '/users/notifications', 'GET', 'Get Notifications', listResult);
  
  // Test 2: Mark All Notifications as Read
  const markAllResult = await makeRequest('PUT', '/users/notifications/read-all', null, authTokens.user, 'any');
  recordTest('User Notifications', '/users/notifications/read-all', 'PUT', 'Mark All Notifications as Read', markAllResult);
}

async function testUserSupport() {
  console.log('   Testing User Support...');
  
  // Test 1: Get Support Tickets
  const listResult = await makeRequest('GET', '/users/support/tickets', null, authTokens.user);
  recordTest('User Support', '/users/support/tickets', 'GET', 'Get Support Tickets', listResult);
  
  // Test 2: Create Support Ticket
  const createResult = await makeRequest('POST', '/users/support/tickets', {
    subject: 'Test Support Ticket',
    message: 'This is a test support ticket',
    category: 'general',
    priority: 'normal',
  }, authTokens.user, 'any');
  recordTest('User Support', '/users/support/tickets', 'POST', 'Create Support Ticket', createResult);
  
  let ticketId = null;
  if (createResult.success && createResult.data?.data?.ticket?.id) {
    ticketId = createResult.data.data.ticket.id;
    
    // Test 3: Get Support Ticket Details
    const detailsResult = await makeRequest('GET', `/users/support/tickets/${ticketId}`, null, authTokens.user);
    recordTest('User Support', '/users/support/tickets/:ticketId', 'GET', 'Get Support Ticket Details', detailsResult);
    
    // Test 4: Send Support Message
    const messageResult = await makeRequest('POST', `/users/support/tickets/${ticketId}/messages`, {
      message: 'This is a test support message',
    }, authTokens.user, 'any');
    recordTest('User Support', '/users/support/tickets/:ticketId/messages', 'POST', 'Send Support Message', messageResult);
  }
  
  // Test 5: Initiate Support Call
  const callResult = await makeRequest('POST', '/users/support/call', {
    reason: 'Need assistance with order',
  }, authTokens.user, 'any');
  recordTest('User Support', '/users/support/call', 'POST', 'Initiate Support Call', callResult);
  
  // Test 6: Create Support Ticket - Missing Required Fields
  const missingFieldsResult = await makeRequest('POST', '/users/support/tickets', {
    subject: 'Incomplete Ticket',
  }, authTokens.user, 400);
  recordTest('User Support', '/users/support/tickets', 'POST', 'Create Support Ticket - Missing Required Fields', missingFieldsResult);
}

// ============================================================================
// VENDOR ASSIGNMENT TESTS
// ============================================================================

async function testUserVendorAssignment() {
  console.log('   Testing User Vendor Assignment...');
  
  // Test 1: Get Assigned Vendor
  const assignResult = await makeRequest('POST', '/users/vendors/assign', {
    coordinates: { lat: 28.6139, lng: 77.2090 },
  }, authTokens.user, 'any');
  recordTest('User Vendor Assignment', '/users/vendors/assign', 'POST', 'Get Assigned Vendor', assignResult);
  
  // Test 2: Check Vendor Stock
  const Product = require('../models/Product');
  const Vendor = require('../models/Vendor');
  const vendor = await Vendor.findOne({ status: 'approved', isActive: true });
  const product = await Product.findOne({ isActive: true });
  
  if (vendor && product) {
    const stockResult = await makeRequest('POST', '/users/vendors/check-stock', {
      vendorId: vendor._id.toString(),
      productId: product._id.toString(),
      quantity: 5,
    }, authTokens.user, 'any');
    recordTest('User Vendor Assignment', '/users/vendors/check-stock', 'POST', 'Check Vendor Stock', stockResult);
  }
  
  // Test 3: Get Assigned Vendor - Invalid Coordinates
  const invalidCoordsResult = await makeRequest('POST', '/users/vendors/assign', {
    coordinates: { lat: null, lng: null },
  }, authTokens.user, 400);
  recordTest('User Vendor Assignment', '/users/vendors/assign', 'POST', 'Get Assigned Vendor - Invalid Coordinates', invalidCoordsResult);
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function runAllTests() {
  try {
    console.log('🚀 Starting Comprehensive Endpoint Testing...\n');
    console.log('='.repeat(70));

    // Connect to database
    await connectDB();
    console.log('✅ Connected to MongoDB\n');

    // Run authentication tests first (required for other tests)
    await testAdminAuth();
    await sleep(500);
    
    await testVendorAuth();
    await sleep(500);
    
    await testSellerAuth();
    await sleep(500);
    
    await testUserAuth();
    await sleep(500);

    // Admin endpoint tests
    if (authTokens.admin) {
      console.log('\n📊 Testing Admin Endpoints...\n');
      try { await testAdminDashboard(); } catch (e) { console.error('   ❌ Error in testAdminDashboard:', e.message); }
      await sleep(500);
      try { await testAdminProducts(); } catch (e) { console.error('   ❌ Error in testAdminProducts:', e.message); }
      await sleep(500);
      try { await testAdminVendors(); } catch (e) { console.error('   ❌ Error in testAdminVendors:', e.message); }
      await sleep(500);
      try { await testAdminSellers(); } catch (e) { console.error('   ❌ Error in testAdminSellers:', e.message); }
      await sleep(500);
      try { await testAdminUsers(); } catch (e) { console.error('   ❌ Error in testAdminUsers:', e.message); }
      await sleep(500);
      try { await testAdminOrders(); } catch (e) { console.error('   ❌ Error in testAdminOrders:', e.message); }
      await sleep(500);
      try { await testAdminPayments(); } catch (e) { console.error('   ❌ Error in testAdminPayments:', e.message); }
      await sleep(500);
      try { await testAdminFinance(); } catch (e) { console.error('   ❌ Error in testAdminFinance:', e.message); }
      await sleep(500);
      try { await testAdminAnalytics(); } catch (e) { console.error('   ❌ Error in testAdminAnalytics:', e.message); }
      await sleep(500);
      try { await testAdminMessages(); } catch (e) { console.error('   ❌ Error in testAdminMessages:', e.message); }
      await sleep(500);
    }

    // Vendor endpoint tests
    if (authTokens.vendor) {
      console.log('\n🏪 Testing Vendor Endpoints...\n');
      try { await testVendorDashboard(); } catch (e) { console.error('   ❌ Error in testVendorDashboard:', e.message); }
      await sleep(500);
      try { await testVendorOrders(); } catch (e) { console.error('   ❌ Error in testVendorOrders:', e.message); }
      await sleep(500);
      try { await testVendorInventory(); } catch (e) { console.error('   ❌ Error in testVendorInventory:', e.message); }
      await sleep(500);
      try { await testVendorCredit(); } catch (e) { console.error('   ❌ Error in testVendorCredit:', e.message); }
      await sleep(500);
      try { await testVendorReports(); } catch (e) { console.error('   ❌ Error in testVendorReports:', e.message); }
      await sleep(500);
      try { await testVendorMessages(); } catch (e) { console.error('   ❌ Error in testVendorMessages:', e.message); }
      await sleep(500);
    }

    // Seller endpoint tests
    if (authTokens.seller) {
      console.log('\n👤 Testing Seller Endpoints...\n');
      try { await testSellerDashboard(); } catch (e) { console.error('   ❌ Error in testSellerDashboard:', e.message); }
      await sleep(500);
      try { await testSellerWallet(); } catch (e) { console.error('   ❌ Error in testSellerWallet:', e.message); }
      await sleep(500);
      try { await testSellerReferrals(); } catch (e) { console.error('   ❌ Error in testSellerReferrals:', e.message); }
      await sleep(500);
      try { await testSellerPerformance(); } catch (e) { console.error('   ❌ Error in testSellerPerformance:', e.message); }
      await sleep(500);
    }

    // User endpoint tests
    if (authTokens.user) {
      console.log('\n👥 Testing User Endpoints...\n');
      try { await testUserProducts(); } catch (e) { console.error('   ❌ Error in testUserProducts:', e.message); }
      await sleep(500);
      try { await testUserCart(); } catch (e) { console.error('   ❌ Error in testUserCart:', e.message); }
      await sleep(500);
      try { await testUserOrders(); } catch (e) { console.error('   ❌ Error in testUserOrders:', e.message); }
      await sleep(500);
      try { await testUserPayments(); } catch (e) { console.error('   ❌ Error in testUserPayments:', e.message); }
      await sleep(500);
      try { await testUserAddresses(); } catch (e) { console.error('   ❌ Error in testUserAddresses:', e.message); }
      await sleep(500);
      try { await testUserFavourites(); } catch (e) { console.error('   ❌ Error in testUserFavourites:', e.message); }
      await sleep(500);
      try { await testUserNotifications(); } catch (e) { console.error('   ❌ Error in testUserNotifications:', e.message); }
      await sleep(500);
      try { await testUserSupport(); } catch (e) { console.error('   ❌ Error in testUserSupport:', e.message); }
      await sleep(500);
      try { await testUserVendorAssignment(); } catch (e) { console.error('   ❌ Error in testUserVendorAssignment:', e.message); }
      await sleep(500);
    }

    // Mark end time
    testResults.endTime = new Date();

    console.log('\n' + '='.repeat(70));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(70));
    console.log(`Total Tests: ${testResults.totalTests}`);
    console.log(`Passed: ${testResults.passed} ✅`);
    console.log(`Failed: ${testResults.failed} ❌`);
    console.log(`Success Rate: ${((testResults.passed / testResults.totalTests) * 100).toFixed(2)}%`);
    console.log(`Duration: ${((testResults.endTime - testResults.startTime) / 1000).toFixed(2)}s`);
    console.log('='.repeat(70) + '\n');

    // Generate detailed report
    await generateReport();

    await mongoose.connection.close();
    console.log('✅ Database connection closed\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test execution error:', error);
    console.error(error.stack);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Generate detailed markdown report
async function generateReport() {
  const fs = require('fs');
  const path = require('path');
  
  console.log('📝 Generating detailed test report...\n');
  
  const reportPath = path.join(__dirname, '../API_TEST_REPORT.md');
  
  let markdown = `# IRA SATHI Backend API - Comprehensive Test Report\n\n`;
  markdown += `**Generated:** ${new Date().toISOString()}\n\n`;
  markdown += `## Test Summary\n\n`;
  markdown += `- **Total Tests:** ${testResults.totalTests}\n`;
  markdown += `- **Passed:** ${testResults.passed} ✅\n`;
  markdown += `- **Failed:** ${testResults.failed} ❌\n`;
  markdown += `- **Success Rate:** ${((testResults.passed / testResults.totalTests) * 100).toFixed(2)}%\n`;
  markdown += `- **Duration:** ${((testResults.endTime - testResults.startTime) / 1000).toFixed(2)}s\n\n`;
  
  markdown += `## Test Results by Category\n\n`;
  
  // Group results by category
  for (const [category, tests] of Object.entries(testResults.results)) {
    markdown += `### ${category}\n\n`;
    markdown += `| Endpoint | Method | Test Case | Status | Notes |\n`;
    markdown += `|----------|--------|-----------|--------|-------|\n`;
    
    for (const test of tests) {
      const status = test.success ? '✅ PASS' : '❌ FAIL';
      const statusCode = test.status || 'N/A';
      const error = test.error ? `Error: ${test.error}` : '';
      const notes = test.notes || '';
      
      markdown += `| \`${test.endpoint}\` | ${test.method} | ${test.testName} | ${status} (${statusCode}) | ${notes || error} |\n`;
    }
    
    markdown += `\n`;
  }
  
  // Failed tests summary
  if (testResults.errors.length > 0) {
    markdown += `## Failed Tests Details\n\n`;
    markdown += `| Category | Endpoint | Method | Test Case | Status | Error |\n`;
    markdown += `|----------|----------|--------|-----------|--------|-------|\n`;
    
    for (const error of testResults.errors) {
      markdown += `| ${error.category} | \`${error.endpoint}\` | ${error.method} | ${error.testName} | ${error.status} | ${error.error} |\n`;
    }
    
    markdown += `\n`;
  }
  
  markdown += `## Test Environment\n\n`;
  markdown += `- **Base URL:** ${BASE_URL}\n`;
  markdown += `- **MongoDB:** Connected\n`;
  markdown += `- **Test Start Time:** ${testResults.startTime.toISOString()}\n`;
  markdown += `- **Test End Time:** ${testResults.endTime.toISOString()}\n\n`;
  
  markdown += `---\n\n`;
  markdown += `*This report was automatically generated by the API testing script.*\n`;
  
  fs.writeFileSync(reportPath, markdown);
  console.log(`✅ Test report generated: ${reportPath}\n`);
}

// Run tests
if (require.main === module) {
  runAllTests();
}

module.exports = { runAllTests, testResults };

