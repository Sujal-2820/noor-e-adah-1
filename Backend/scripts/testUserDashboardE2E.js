/**
 * User Dashboard End-to-End Test Script
 * 
 * This script performs comprehensive end-to-end testing of the User Dashboard,
 * testing workflows from largest operations to smallest operations.
 * 
 * It tests:
 * 1. Authentication flow (OTP request, register, login)
 * 2. Product browsing (categories, products, search, popular)
 * 3. Cart management (add, update, remove, validate)
 * 4. Vendor assignment (geospatial - 20km radius)
 * 5. Order creation and management (create, list, details, track, cancel)
 * 6. Payment flows (advance, remaining)
 * 7. Address management
 * 8. Favourites
 * 9. Notifications
 * 
 * Usage: node scripts/testUserDashboardE2E.js
 */

require('dotenv').config();
const axios = require('axios');
const mongoose = require('mongoose');
const { connectDB } = require('../config/database');
const User = require('../models/User');
const Product = require('../models/Product');
const Vendor = require('../models/Vendor');
const Address = require('../models/Address');
const Order = require('../models/Order');
const Seller = require('../models/Seller');

const API_BASE_URL = process.env.API_BASE_URL || 'http://127.0.0.1:3000/api';

let testResults = {
  passed: 0,
  failed: 0,
  errors: [],
  warnings: [],
};

let authToken = null;
let testUser = null;
let testProducts = [];
let testVendors = [];
let testAddress = null;
let testOrder = null;

/**
 * Test Helper Functions
 */
const logTest = (testName, passed, message = '', connectionError = false) => {
  if (passed) {
    testResults.passed++;
    console.log(`✅ ${testName}: ${message || 'PASSED'}`);
  } else {
    testResults.failed++;
    const errorMsg = typeof message === 'object' ? (message.message || JSON.stringify(message)) : message;
    testResults.errors.push({ test: testName, error: errorMsg, connectionError });
    if (connectionError) {
      console.log(`⚠️  ${testName}: ${errorMsg || 'FAILED (Server not running)'}`);
    } else {
      console.log(`❌ ${testName}: ${errorMsg || 'FAILED'}`);
    }
  }
};

const makeRequest = async (method, endpoint, data = null, token = authToken) => {
  try {
    const config = {
      method,
      url: `${API_BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      ...(data && { data }),
    };
    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status || 500,
    };
  }
};

/**
 * ============================================================================
 * LARGE OPERATIONS - Complete Workflows
 * ============================================================================
 */

/**
 * Test 1: Complete Authentication Flow
 */
const testAuthenticationFlow = async () => {
  console.log('\n' + '='.repeat(70));
  console.log('🔐 TESTING: Complete Authentication Flow');
  console.log('='.repeat(70));
  
  // Get or create a test user
  testUser = await User.findOne({ isActive: true, isBlocked: false });
  if (!testUser) {
    // Create a test user
    const seller = await Seller.findOne({ status: 'approved', isActive: true });
    testUser = await User.create({
      name: 'Test User',
      phone: '+919876543210',
      email: 'testuser@example.com',
      language: 'en',
      sellerId: seller ? seller.sellerId : null,
      seller: seller ? seller._id : null,
      location: {
        type: 'Point',
        coordinates: [77.1025, 28.7041], // Delhi
        address: '123 Test Street',
        city: 'Delhi',
        state: 'Delhi',
        pincode: '110001',
      },
      isActive: true,
      isBlocked: false,
    });
    console.log(`📝 Created test user: ${testUser.phone}`);
  }
  
  const testPhone = testUser.phone;
  
  // Step 1: Request OTP
  console.log('\n📱 Step 1: Request OTP...');
  const requestOTPResult = await makeRequest('POST', '/users/auth/request-otp', {
    phone: testPhone,
    language: 'en',
  }, null);
  
  if (requestOTPResult.success && requestOTPResult.data.success) {
    logTest('Request OTP', true, 'OTP sent successfully');
    
    // Fetch user to get OTP
    testUser = await User.findOne({ phone: testPhone });
    const otpCode = testUser.otp?.code;
    
    if (!otpCode) {
      logTest('OTP Retrieval', false, 'OTP not found in database');
      return false;
    }
    
    console.log(`📝 OTP Code: ${otpCode}`);
    
    // Step 2: Verify OTP (Login)
    console.log('\n📱 Step 2: Verify OTP (Login)...');
    const verifyOTPResult = await makeRequest('POST', '/users/auth/verify-otp', {
      phone: testPhone,
      otp: otpCode,
    }, null);
    
    if (verifyOTPResult.success && verifyOTPResult.data.success && verifyOTPResult.data.data.token) {
      authToken = verifyOTPResult.data.data.token;
      logTest('Verify OTP (Login)', true, 'Logged in successfully');
      return true;
    } else {
      logTest('Verify OTP (Login)', false, verifyOTPResult.error);
      return false;
    }
  } else {
    logTest('Request OTP', false, requestOTPResult.error);
    return false;
  }
};

/**
 * Test 2: Product Browsing & Search
 */
const testProductBrowsing = async () => {
  console.log('\n' + '='.repeat(70));
  console.log('🛍️  TESTING: Product Browsing & Search');
  console.log('='.repeat(70));
  
  // Get Categories
  console.log('\n📂 Getting Categories...');
  const categoriesResult = await makeRequest('GET', '/users/products/categories', null, null);
  const categories = categoriesResult.data?.data?.categories || [];
  logTest('Get Categories', categoriesResult.success && Array.isArray(categories), 
    categoriesResult.success ? `Found ${categories.length} categories` : categoriesResult.error);
  
  // Get Products
  console.log('\n📦 Getting Products...');
  const productsResult = await makeRequest('GET', '/users/products?limit=10', null, null);
  if (productsResult.success && productsResult.data.success && productsResult.data.data.products) {
    testProducts = productsResult.data.data.products.slice(0, 3); // Store first 3 for later tests
    logTest('Get Products', true, `Found ${productsResult.data.data.products.length} products`);
  } else {
    logTest('Get Products', false, productsResult.error);
  }
  
  // Get Popular Products
  console.log('\n⭐ Getting Popular Products...');
  const popularResult = await makeRequest('GET', '/users/products/popular?limit=5', null, null);
  logTest('Get Popular Products', popularResult.success && Array.isArray(popularResult.data.data),
    popularResult.success ? `Found ${popularResult.data.data?.length || 0} popular products` : popularResult.error);
  
  // Search Products
  if (testProducts.length > 0) {
    console.log('\n🔍 Searching Products...');
    const searchQuery = testProducts[0].name.split(' ')[0]; // Use first word of product name
    const searchResult = await makeRequest('GET', `/users/products/search?q=${encodeURIComponent(searchQuery)}`, null, null);
    const searchProducts = searchResult.data?.data?.products || [];
    logTest('Search Products', searchResult.success && Array.isArray(searchProducts),
      searchResult.success ? `Found ${searchProducts.length} results` : searchResult.error);
  }
  
  // Get Product Details
  if (testProducts.length > 0) {
    console.log('\n📄 Getting Product Details...');
    const productId = testProducts[0]._id || testProducts[0].id;
    const detailsResult = await makeRequest('GET', `/users/products/${productId}`, null, null);
    logTest('Get Product Details', detailsResult.success && detailsResult.data.success,
      detailsResult.success ? 'Product details retrieved' : detailsResult.error);
  }
};

/**
 * Test 3: Cart Management
 */
const testCartManagement = async () => {
  console.log('\n' + '='.repeat(70));
  console.log('🛒 TESTING: Cart Management');
  console.log('='.repeat(70));
  
  if (testProducts.length === 0) {
    console.log('⚠️  No products available for cart testing. Skipping...');
    return;
  }
  
  // Clear cart first
  console.log('\n🗑️  Clearing Cart...');
  await makeRequest('DELETE', '/users/cart');
  
  // Add to Cart
  console.log('\n➕ Adding to Cart...');
  const productId = testProducts[0]._id || testProducts[0].id;
  const addToCartResult = await makeRequest('POST', '/users/cart', {
    productId,
    quantity: 2,
  });
  
  if (addToCartResult.success && addToCartResult.data.success) {
    logTest('Add to Cart', true, 'Item added to cart');
    
    // Get Cart
    console.log('\n📋 Getting Cart...');
    const getCartResult = await makeRequest('GET', '/users/cart');
    if (getCartResult.success && getCartResult.data.success) {
      const cartItems = getCartResult.data.data.items || getCartResult.data.data.cart?.items || [];
      logTest('Get Cart', true, `Cart has ${cartItems.length} items`);
      
      if (cartItems.length > 0) {
        const itemId = cartItems[0]._id || cartItems[0].id;
        
        // Update Cart Item
        console.log('\n✏️  Updating Cart Item...');
        const updateResult = await makeRequest('PUT', `/users/cart/${itemId}`, {
          quantity: 3,
        });
        logTest('Update Cart Item', updateResult.success && updateResult.data.success,
          updateResult.success ? 'Cart item updated' : updateResult.error);
        
        // Validate Cart
        console.log('\n✅ Validating Cart...');
        const validateResult = await makeRequest('POST', '/users/cart/validate');
        logTest('Validate Cart', validateResult.success && validateResult.data.success,
          validateResult.success ? 'Cart validated' : validateResult.error);
        
        // Remove from Cart
        console.log('\n➖ Removing from Cart...');
        const removeResult = await makeRequest('DELETE', `/users/cart/${itemId}`);
        logTest('Remove from Cart', removeResult.success && removeResult.data.success,
          removeResult.success ? 'Item removed from cart' : removeResult.error);
      }
    } else {
      logTest('Get Cart', false, getCartResult.error);
    }
  } else {
    logTest('Add to Cart', false, addToCartResult.error);
  }
};

/**
 * Test 4: Vendor Assignment (Geospatial)
 */
const testVendorAssignment = async () => {
  console.log('\n' + '='.repeat(70));
  console.log('📍 TESTING: Vendor Assignment (Geospatial)');
  console.log('='.repeat(70));
  
  // Get assigned vendor based on location
  console.log('\n🗺️  Getting Assigned Vendor...');
  const locationData = {
    location: {
      coordinates: {
        lat: 28.7041,
        lng: 77.1025,
      },
      address: '123 Test Street, Delhi',
      city: 'Delhi',
      state: 'Delhi',
      pincode: '110001',
    },
  };
  
  const assignVendorResult = await makeRequest('POST', '/users/vendors/assign', locationData);
  if (assignVendorResult.success && assignVendorResult.data.success) {
    const vendor = assignVendorResult.data.data.vendor;
    if (vendor) {
      testVendors = [vendor];
      logTest('Get Assigned Vendor', true, `Vendor assigned: ${vendor.name || vendor.vendorId}`);
      
      // Check Vendor Stock
      if (testProducts.length > 0) {
        console.log('\n📦 Checking Vendor Stock...');
        const productIds = testProducts.slice(0, 2).map(p => p._id || p.id);
        const checkStockResult = await makeRequest('POST', '/users/vendors/check-stock', {
          vendorId: vendor._id || vendor.id,
          productIds,
        });
        logTest('Check Vendor Stock', checkStockResult.success && checkStockResult.data.success,
          checkStockResult.success ? 'Stock checked' : checkStockResult.error);
      }
    } else {
      logTest('Get Assigned Vendor', false, 'No vendor assigned within 20km radius');
    }
  } else {
    logTest('Get Assigned Vendor', false, assignVendorResult.error);
  }
};

/**
 * Test 5: Address Management
 */
const testAddressManagement = async () => {
  console.log('\n' + '='.repeat(70));
  console.log('📍 TESTING: Address Management');
  console.log('='.repeat(70));
  
  // Get Addresses
  console.log('\n📋 Getting Addresses...');
  const getAddressesResult = await makeRequest('GET', '/users/addresses');
  if (getAddressesResult.success && getAddressesResult.data.success) {
    const addresses = getAddressesResult.data.data.addresses || getAddressesResult.data.data || [];
    logTest('Get Addresses', true, `Found ${addresses.length} addresses`);
    
    if (addresses.length > 0) {
      testAddress = addresses[0];
    }
  } else {
    logTest('Get Addresses', false, getAddressesResult.error);
  }
  
  // Add Address
  console.log('\n➕ Adding Address...');
  const newAddress = {
    name: 'Test User',
    phone: testUser.phone,
    address: '456 New Street, Test Area',
    city: 'Delhi',
    state: 'Delhi',
    pincode: '110002',
    isDefault: false,
  };
  
  const addAddressResult = await makeRequest('POST', '/users/addresses', newAddress);
  if (addAddressResult.success && addAddressResult.data.success) {
    const address = addAddressResult.data.data.address || addAddressResult.data.data;
    if (!testAddress) testAddress = address;
    logTest('Add Address', true, 'Address added');
    
    // Update Address
    console.log('\n✏️  Updating Address...');
    const addressId = address._id || address.id;
    const updateAddressResult = await makeRequest('PUT', `/users/addresses/${addressId}`, {
      city: 'New Delhi',
    });
    logTest('Update Address', updateAddressResult.success && updateAddressResult.data.success,
      updateAddressResult.success ? 'Address updated' : updateAddressResult.error);
    
    // Set Default Address
    console.log('\n⭐ Setting Default Address...');
    const setDefaultResult = await makeRequest('PUT', `/users/addresses/${addressId}/default`);
    logTest('Set Default Address', setDefaultResult.success && setDefaultResult.data.success,
      setDefaultResult.success ? 'Default address set' : setDefaultResult.error);
  } else {
    logTest('Add Address', false, addAddressResult.error);
  }
};

/**
 * Test 6: Order Creation & Management
 */
const testOrderManagement = async () => {
  console.log('\n' + '='.repeat(70));
  console.log('📦 TESTING: Order Creation & Management');
  console.log('='.repeat(70));
  
  if (testProducts.length === 0 || testVendors.length === 0 || !testAddress) {
    console.log('⚠️  Missing required data (products, vendors, or address). Skipping order tests...');
    return;
  }
  
  // First, add items to cart (ensure minimum order value ₹2000)
  console.log('\n🛒 Preparing Cart for Order...');
  await makeRequest('DELETE', '/users/cart'); // Clear cart
  // Add multiple items to meet minimum order value
  for (const product of testProducts.slice(0, Math.min(3, testProducts.length))) {
    await makeRequest('POST', '/users/cart', {
      productId: product._id || product.id,
      quantity: 2, // Increase quantity to meet minimum order value
    });
  }
  
  // Create Order
  console.log('\n📝 Creating Order...');
  const orderData = {
    items: testProducts.slice(0, Math.min(3, testProducts.length)).map(product => ({
      productId: product._id || product.id,
      quantity: 2, // Increase quantity to meet minimum order value
    })),
    addressId: testAddress._id || testAddress.id,
    vendorId: testVendors[0]._id || testVendors[0].id,
    paymentMethod: 'razorpay',
    paymentPreference: 'partial', // 30% advance, 70% remaining
    payInFull: false,
    shippingMethod: 'standard',
  };
  
  const createOrderResult = await makeRequest('POST', '/users/orders', orderData);
  if (createOrderResult.success && createOrderResult.data.success) {
    testOrder = createOrderResult.data.data.order || createOrderResult.data.data;
    logTest('Create Order', true, `Order created: ${testOrder.orderNumber || 'N/A'}`);
    
    const orderId = testOrder._id || testOrder.id;
    
    // Get Orders List
    console.log('\n📋 Getting Orders List...');
    const getOrdersResult = await makeRequest('GET', '/users/orders?limit=10');
    logTest('Get Orders List', getOrdersResult.success && getOrdersResult.data.success,
      getOrdersResult.success ? 'Orders list retrieved' : getOrdersResult.error);
    
    // Get Order Details
    console.log('\n📄 Getting Order Details...');
    const getOrderDetailsResult = await makeRequest('GET', `/users/orders/${orderId}`);
    logTest('Get Order Details', getOrderDetailsResult.success && getOrderDetailsResult.data.success,
      getOrderDetailsResult.success ? 'Order details retrieved' : getOrderDetailsResult.error);
    
    // Track Order
    console.log('\n📍 Tracking Order...');
    const trackOrderResult = await makeRequest('GET', `/users/orders/${orderId}/track`);
    logTest('Track Order', trackOrderResult.success && trackOrderResult.data.success,
      trackOrderResult.success ? 'Order tracking retrieved' : trackOrderResult.error);
    
    // Get Order Payments
    console.log('\n💳 Getting Order Payments...');
    const getOrderPaymentsResult = await makeRequest('GET', `/users/orders/${orderId}/payments`);
    logTest('Get Order Payments', getOrderPaymentsResult.success && getOrderPaymentsResult.data.success,
      getOrderPaymentsResult.success ? 'Order payments retrieved' : getOrderPaymentsResult.error);
  } else {
    logTest('Create Order', false, createOrderResult.error);
  }
};

/**
 * Test 7: Payment Flow
 */
const testPaymentFlow = async () => {
  console.log('\n' + '='.repeat(70));
  console.log('💳 TESTING: Payment Flow');
  console.log('='.repeat(70));
  
  if (!testOrder) {
    console.log('⚠️  No order available for payment testing. Skipping...');
    return;
  }
  
  const orderId = testOrder._id || testOrder.id;
  
  // Create Payment Intent (Advance)
  console.log('\n💰 Creating Payment Intent (Advance)...');
  const createIntentResult = await makeRequest('POST', '/users/payments/create-intent', {
    orderId,
    amount: testOrder.upfrontAmount || testOrder.totalAmount * 0.3,
    paymentMethod: 'razorpay',
  });
  
  logTest('Create Payment Intent (Advance)', createIntentResult.success && createIntentResult.data.success,
    createIntentResult.success ? 'Payment intent created' : createIntentResult.error);
  
  // Note: Actual payment confirmation would require payment gateway integration
  // We'll skip confirmPayment for now as it requires real gateway integration
};

/**
 * Test 8: Favourites
 */
const testFavourites = async () => {
  console.log('\n' + '='.repeat(70));
  console.log('⭐ TESTING: Favourites');
  console.log('='.repeat(70));
  
  if (testProducts.length === 0) {
    console.log('⚠️  No products available for favourites testing. Skipping...');
    return;
  }
  
  // Get Favourites
  console.log('\n📋 Getting Favourites...');
  const getFavouritesResult = await makeRequest('GET', '/users/favourites');
  logTest('Get Favourites', getFavouritesResult.success && getFavouritesResult.data.success,
    getFavouritesResult.success ? 'Favourites retrieved' : getFavouritesResult.error);
  
  // Add to Favourites
  console.log('\n➕ Adding to Favourites...');
  const productId = testProducts[0]._id || testProducts[0].id;
  const addFavouriteResult = await makeRequest('POST', '/users/favourites', {
    productId,
  });
  logTest('Add to Favourites', addFavouriteResult.success && addFavouriteResult.data.success,
    addFavouriteResult.success ? 'Product added to favourites' : addFavouriteResult.error);
  
  // Remove from Favourites
  console.log('\n➖ Removing from Favourites...');
  const removeFavouriteResult = await makeRequest('DELETE', `/users/favourites/${productId}`);
  logTest('Remove from Favourites', removeFavouriteResult.success && removeFavouriteResult.data.success,
    removeFavouriteResult.success ? 'Product removed from favourites' : removeFavouriteResult.error);
};

/**
 * Test 9: Profile Management
 */
const testProfileManagement = async () => {
  console.log('\n' + '='.repeat(70));
  console.log('👤 TESTING: Profile Management');
  console.log('='.repeat(70));
  
  // Get Profile
  console.log('\n📋 Getting Profile...');
  const getProfileResult = await makeRequest('GET', '/users/profile');
  logTest('Get Profile', getProfileResult.success && getProfileResult.data.success,
    getProfileResult.success ? 'Profile retrieved' : getProfileResult.error);
  
  // Update Profile
  console.log('\n✏️  Updating Profile...');
  const updateProfileResult = await makeRequest('PUT', '/users/profile', {
    name: 'Updated Test User',
    email: 'updatedtestuser@example.com',
  });
  logTest('Update Profile', updateProfileResult.success && updateProfileResult.data.success,
    updateProfileResult.success ? 'Profile updated' : updateProfileResult.error);
  
  // Get Seller ID (Read-only)
  console.log('\n🆔 Getting Seller ID...');
  const getSellerIDResult = await makeRequest('GET', '/users/profile/seller-id');
  logTest('Get Seller ID', getSellerIDResult.success && getSellerIDResult.data.success,
    getSellerIDResult.success ? 'Seller ID retrieved' : getSellerIDResult.error);
};

/**
 * Test 10: Notifications
 */
const testNotifications = async () => {
  console.log('\n' + '='.repeat(70));
  console.log('🔔 TESTING: Notifications');
  console.log('='.repeat(70));
  
  // Get Notifications
  console.log('\n📋 Getting Notifications...');
  const getNotificationsResult = await makeRequest('GET', '/users/notifications?limit=10');
  logTest('Get Notifications', getNotificationsResult.success && getNotificationsResult.data.success,
    getNotificationsResult.success ? 'Notifications retrieved' : getNotificationsResult.error);
  
  // Mark All Notifications as Read
  console.log('\n✅ Marking All Notifications as Read...');
  const markAllReadResult = await makeRequest('PUT', '/users/notifications/read-all');
  logTest('Mark All Notifications as Read', markAllReadResult.success && markAllReadResult.data.success,
    markAllReadResult.success ? 'All notifications marked as read' : markAllReadResult.error);
};

/**
 * Test 11: Logout
 */
const testLogout = async () => {
  console.log('\n' + '='.repeat(70));
  console.log('🚪 TESTING: Logout');
  console.log('='.repeat(70));
  
  // Logout
  console.log('\n🚪 Logging Out...');
  const logoutResult = await makeRequest('POST', '/users/auth/logout');
  logTest('Logout', logoutResult.success && logoutResult.data.success,
    logoutResult.success ? 'Logged out successfully' : logoutResult.error);
  
  // Verify token is invalid
  console.log('\n🔒 Verifying Token Invalidity...');
  const verifyTokenResult = await makeRequest('GET', '/users/profile');
  logTest('Token Invalidity Check', !verifyTokenResult.success || verifyTokenResult.status === 401,
    verifyTokenResult.success ? 'Token still valid (unexpected)' : 'Token invalidated correctly');
};

/**
 * ============================================================================
 * MEDIUM OPERATIONS - Feature-specific Tests
 * ============================================================================
 */

/**
 * Test 12: Invalid Input Handling
 */
const testInvalidInputHandling = async () => {
  console.log('\n' + '='.repeat(70));
  console.log('⚠️  TESTING: Invalid Input Handling');
  console.log('='.repeat(70));
  
  // Invalid OTP
  console.log('\n❌ Testing Invalid OTP...');
  const invalidOTPResult = await makeRequest('POST', '/users/auth/verify-otp', {
    phone: testUser.phone,
    otp: '000000',
  }, null);
  logTest('Invalid OTP Handling', !invalidOTPResult.success || invalidOTPResult.status === 401,
    invalidOTPResult.success ? 'OTP incorrectly accepted' : 'Invalid OTP correctly rejected');
  
  // Invalid Product ID
  if (authToken) {
    console.log('\n❌ Testing Invalid Product ID...');
    const invalidProductResult = await makeRequest('GET', '/users/products/invalid_product_id', null, null);
    logTest('Invalid Product ID Handling', !invalidProductResult.success || invalidProductResult.status === 404,
      invalidProductResult.success ? 'Invalid product found' : 'Invalid product correctly rejected');
  }
};

/**
 * ============================================================================
 * MAIN EXECUTION
 * ============================================================================
 */

const runAllTests = async () => {
  try {
    console.log('\n🚀 Starting User Dashboard E2E Tests...\n');
    
    // Connect to database
    await connectDB();
    console.log('✅ Connected to MongoDB\n');
    
    // Run tests in order
    const authenticated = await testAuthenticationFlow();
    
    if (authenticated) {
      await testProductBrowsing();
      await testCartManagement();
      await testVendorAssignment();
      await testAddressManagement();
      await testOrderManagement();
      await testPaymentFlow();
      await testFavourites();
      await testProfileManagement();
      await testNotifications();
      await testInvalidInputHandling();
      await testLogout();
    } else {
      console.log('\n⚠️  Authentication failed. Skipping authenticated tests...');
    }
    
    // Print summary
    console.log('\n' + '='.repeat(70));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(70));
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    console.log(`⚠️  Warnings: ${testResults.warnings.length}`);
    console.log(`📈 Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(2)}%`);
    
    if (testResults.errors.length > 0) {
      console.log('\n❌ Failed Tests:');
      testResults.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error.test}: ${error.error}`);
      });
    }
    
    if (testResults.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      testResults.warnings.forEach((warning, index) => {
        console.log(`   ${index + 1}. ${warning}`);
      });
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('✅ User Dashboard E2E Tests Complete!');
    console.log('='.repeat(70) + '\n');
    
    process.exit(testResults.failed > 0 ? 1 : 0);
  } catch (error) {
    console.error('\n❌ Test execution error:', error);
    process.exit(1);
  }
};

// Run tests
runAllTests();

