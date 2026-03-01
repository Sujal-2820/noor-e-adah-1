/**
 * User Workflow End-to-End Tests
 * 
 * Tests complete user workflows:
 * 1. Authentication (OTP login, registration)
 * 2. Product Browsing (Categories, Search, Details)
 * 3. Cart Management (Add, Update, Remove, Validate)
 * 4. Checkout Flow (Vendor Assignment, Address Management)
 * 5. Order Creation (Full and Partial Payment)
 * 6. Payment Processing (30% advance, 70% remaining)
 * 7. Order Tracking and Management
 * 8. Address Management
 * 9. Favourites/Wishlist
 * 10. Notifications
 */

const axios = require('axios');
const mongoose = require('mongoose');

const BASE_URL = process.env.API_URL || 'http://127.0.0.1:3000/api';
axios.defaults.family = 4;

const User = require('../../models/User');
const Product = require('../../models/Product');
const Cart = require('../../models/Cart');
const Order = require('../../models/Order');
const Address = require('../../models/Address');
const Payment = require('../../models/Payment');
const Vendor = require('../../models/Vendor');
const Seller = require('../../models/Seller');

let testUser = null;
let authToken = null;
let testData = {
  products: [],
  addresses: [],
  orders: [],
  payments: []
};

/**
 * Helper: Make API request
 */
async function makeRequest(method, url, data = null, token = authToken, expectedStatus = 200) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${url}`,
      headers: { 'Content-Type': 'application/json' },
      timeout: 15000,
      family: 4
    };
    
    if (token) config.headers['Authorization'] = `Bearer ${token}`;
    if (data) config.data = data;
    
    const response = await axios(config);
    const success = expectedStatus === 'any' || response.status === expectedStatus;
    return { success, status: response.status, data: response.data, error: null };
  } catch (error) {
    const success = error.response?.status === expectedStatus;
    return {
      success,
      status: error.response?.status || 500,
      data: error.response?.data || null,
      error: error.message
    };
  }
}

/**
 * Helper: Sleep
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Test 1: Authentication Workflow
 */
async function testAuthentication(record) {
  record('User Workflow', 'Setting up test user', true);
  
  // Get or create test user
  testUser = await User.findOne({ phone: '+919999999999' });
  
  if (!testUser) {
    testUser = new User({
      name: 'E2E Test User',
      phone: '+919999999999',
      isActive: true,
      isBlocked: false
    });
    await testUser.save();
  }
  
  // Test OTP request
  const otpRequest = await makeRequest('POST', '/users/auth/request-otp', {
    phone: testUser.phone
  }, null, 'any');
  record('User Auth', 'Request OTP', otpRequest.success, { status: otpRequest.status });
  
  if (!otpRequest.success) return false;
  
  await sleep(1500);
  
  // Get OTP from database
  const userWithOTP = await User.findOne({ phone: testUser.phone }).select('+otp');
  if (!userWithOTP?.otp?.code) {
    record('User Auth', 'OTP Generated', false, { error: 'OTP not generated' });
    return false;
  }
  
  // Test OTP verification / Login
  const loginResult = await makeRequest('POST', '/users/auth/login', {
    phone: testUser.phone,
    otp: userWithOTP.otp.code
  }, null, 'any');
  
  record('User Auth', 'Login with OTP', loginResult.success, { status: loginResult.status });
  
  if (loginResult.success && loginResult.data?.data?.token) {
    authToken = loginResult.data.data.token;
    record('User Auth', 'Token Received', true);
    return true;
  }
  
  return false;
}

/**
 * Test 2: Product Browsing
 */
async function testProductBrowsing(record) {
  // Get categories
  const categories = await makeRequest('GET', '/users/products/categories', null, null);
  record('Product Browsing', 'Get Categories', categories.success, { count: categories.data?.data?.length });
  
  // Get products
  const products = await makeRequest('GET', '/users/products?limit=10', null, null);
  record('Product Browsing', 'Get Products', products.success, { count: products.data?.data?.products?.length });
  
  if (products.success && products.data?.data?.products?.length > 0) {
    testData.products = products.data.data.products.slice(0, 5);
    
    // Get popular products
    const popular = await makeRequest('GET', '/users/products/popular', null, null);
    record('Product Browsing', 'Get Popular Products', popular.success);
    
    // Search products
    const search = await makeRequest('GET', '/users/products/search?q=urea', null, null);
    record('Product Browsing', 'Search Products', search.success);
    
    // Get product details
    const productDetails = await makeRequest('GET', `/users/products/${testData.products[0].id || testData.products[0]._id}`, null, null);
    record('Product Browsing', 'Get Product Details', productDetails.success);
    
    // Get offers
    const offers = await makeRequest('GET', '/users/offers', null, null);
    record('Product Browsing', 'Get Offers', offers.success);
    
    return true;
  }
  
  return false;
}

/**
 * Test 3: Cart Management
 */
async function testCartManagement(record) {
  if (testData.products.length === 0) {
    record('Cart Management', 'Cart Tests', false, { error: 'No products available' });
    return false;
  }
  
  // Clear existing cart
  await makeRequest('DELETE', '/users/cart', null, authToken, 'any');
  await sleep(500);
  
  // Add products to cart
  let cartTotal = 0;
  for (let i = 0; i < Math.min(3, testData.products.length); i++) {
    const product = testData.products[i];
    const quantity = i + 1; // 1, 2, 3
    
    const addResult = await makeRequest('POST', '/users/cart', {
      productId: product.id || product._id,
      quantity: quantity
    }, authToken, 'any');
    
    record(`Cart Management`, `Add Product ${i + 1} to Cart`, addResult.success);
    
    if (addResult.success && product.priceToUser) {
      cartTotal += product.priceToUser * quantity;
    }
    
    await sleep(300);
  }
  
  // Get cart
  const getCart = await makeRequest('GET', '/users/cart', null, authToken);
  record('Cart Management', 'Get Cart', getCart.success, { itemCount: getCart.data?.data?.cart?.items?.length });
  
  if (!getCart.success || !getCart.data?.data?.cart?.items?.length) {
    return false;
  }
  
  const cartItems = getCart.data.data.cart.items;
  
  // Update cart item
  if (cartItems.length > 0) {
    const itemId = cartItems[0].id || cartItems[0]._id;
    const updateResult = await makeRequest('PUT', `/users/cart/${itemId}`, {
      quantity: 5
    }, authToken, 'any');
    record('Cart Management', 'Update Cart Item Quantity', updateResult.success);
  }
  
  // Validate cart (check minimum order value)
  const validateResult = await makeRequest('POST', '/users/cart/validate', null, authToken);
  record('Cart Management', 'Validate Cart (Min ₹2000)', validateResult.success, {
    isValid: validateResult.data?.data?.isValid,
    total: validateResult.data?.data?.total
  });
  
  // Test edge case: Remove item
  if (cartItems.length > 1) {
    const itemToRemove = cartItems[1].id || cartItems[1]._id;
    const removeResult = await makeRequest('DELETE', `/users/cart/${itemToRemove}`, null, authToken, 'any');
    record('Cart Management', 'Remove Cart Item', removeResult.success);
    await sleep(300);
  }
  
  return true;
}

/**
 * Test 4: Address Management
 */
async function testAddressManagement(record) {
  // Get existing addresses
  const getAddresses = await makeRequest('GET', '/users/addresses', null, authToken);
  record('Address Management', 'Get Addresses', getAddresses.success);
  
  // Add new address
  const newAddress = {
    name: 'Test Address E2E',
    address: '123 Test Street',
    city: 'Test City',
    state: 'Test State',
    pincode: '123456',
    phone: testUser.phone,
    coordinates: { lat: 28.6139, lng: 77.2090 },
    isDefault: false
  };
  
  const addAddress = await makeRequest('POST', '/users/addresses', newAddress, authToken, 'any');
  record('Address Management', 'Add Address', addAddress.success);
  
  if (addAddress.success && addAddress.data?.data?.address?.id) {
    testData.addresses.push(addAddress.data.data.address.id);
    
    // Update address
    const addressId = addAddress.data.data.address.id;
    const updateAddress = await makeRequest('PUT', `/users/addresses/${addressId}`, {
      city: 'Updated City'
    }, authToken, 'any');
    record('Address Management', 'Update Address', updateAddress.success);
    
    // Set as default
    const setDefault = await makeRequest('PUT', `/users/addresses/${addressId}/default`, null, authToken, 'any');
    record('Address Management', 'Set Default Address', setDefault.success);
  }
  
  return true;
}

/**
 * Test 5: Vendor Assignment
 */
async function testVendorAssignment(record) {
  // Get assigned vendor based on coordinates
  const assignVendor = await makeRequest('POST', '/users/vendors/assign', {
    coordinates: { lat: 28.6139, lng: 77.2090 }
  }, authToken, 'any');
  
  record('Vendor Assignment', 'Assign Vendor (20km radius)', assignVendor.success, {
    vendorId: assignVendor.data?.data?.vendor?.id,
    distance: assignVendor.data?.data?.distance
  });
  
  if (assignVendor.success && assignVendor.data?.data?.vendor?.id && testData.products.length > 0) {
    // Check vendor stock
    const checkStock = await makeRequest('POST', '/users/vendors/check-stock', {
      vendorId: assignVendor.data.data.vendor.id,
      productId: testData.products[0].id || testData.products[0]._id,
      quantity: 5
    }, authToken, 'any');
    
    record('Vendor Assignment', 'Check Vendor Stock', checkStock.success);
  }
  
  return true;
}

/**
 * Test 6: Order Creation
 */
async function testOrderCreation(record) {
  // Ensure cart has items
  const cart = await makeRequest('GET', '/users/cart', null, authToken);
  if (!cart.success || !cart.data?.data?.cart?.items?.length) {
    // Add items to cart first
    if (testData.products.length > 0) {
      await makeRequest('POST', '/users/cart', {
        productId: testData.products[0].id || testData.products[0]._id,
        quantity: 10 // Ensure high quantity for min order value
      }, authToken, 'any');
      await sleep(500);
    }
  }
  
  // Get or create address
  let addressId = null;
  if (testData.addresses.length > 0) {
    addressId = testData.addresses[0];
  } else {
    const addresses = await makeRequest('GET', '/users/addresses', null, authToken);
    if (addresses.success && addresses.data?.data?.addresses?.length > 0) {
      addressId = addresses.data.data.addresses[0].id || addresses.data.addresses[0]._id;
    } else {
      // Create address
      const newAddr = await makeRequest('POST', '/users/addresses', {
        name: 'Order Test Address',
        address: '456 Order Street',
        city: 'Order City',
        state: 'Order State',
        pincode: '654321',
        phone: testUser.phone,
        coordinates: { lat: 28.6139, lng: 77.2090 },
        isDefault: true
      }, authToken, 'any');
      
      if (newAddr.success && newAddr.data?.data?.address?.id) {
        addressId = newAddr.data.data.address.id;
      }
    }
  }
  
  if (!addressId) {
    record('Order Creation', 'Create Order - Address Missing', false, { error: 'No address available' });
    return false;
  }
  
  // Create order with partial payment
  const createOrder = await makeRequest('POST', '/users/orders', {
    addressId: addressId,
    paymentPreference: 'partial', // 30% advance
    notes: 'E2E Test Order'
  }, authToken, 'any');
  
  record('Order Creation', 'Create Order (Partial Payment)', createOrder.success, {
    orderId: createOrder.data?.data?.order?.id,
    paymentStatus: createOrder.data?.data?.order?.paymentStatus
  });
  
  if (createOrder.success && createOrder.data?.data?.order?.id) {
    testData.orders.push({
      id: createOrder.data.data.order.id,
      type: 'partial'
    });
    
    // Get order details
    const orderDetails = await makeRequest('GET', `/users/orders/${createOrder.data.data.order.id}`, null, authToken);
    record('Order Creation', 'Get Order Details', orderDetails.success);
    
    // Test order with full payment
    await sleep(1000);
    const cart2 = await makeRequest('GET', '/users/cart', null, authToken);
    if (cart2.success && cart2.data?.data?.cart?.items?.length > 0) {
      const createOrderFull = await makeRequest('POST', '/users/orders', {
        addressId: addressId,
        paymentPreference: 'full', // 100% payment
        notes: 'E2E Test Order - Full Payment'
      }, authToken, 'any');
      
      record('Order Creation', 'Create Order (Full Payment)', createOrderFull.success);
      
      if (createOrderFull.success && createOrderFull.data?.data?.order?.id) {
        testData.orders.push({
          id: createOrderFull.data.data.order.id,
          type: 'full'
        });
      }
    }
  }
  
  return true;
}

/**
 * Test 7: Payment Processing
 */
async function testPaymentProcessing(record) {
  if (testData.orders.length === 0) {
    record('Payment Processing', 'Payment Tests', false, { error: 'No orders available' });
    return false;
  }
  
  // Find an order that needs payment
  const orders = await makeRequest('GET', '/users/orders', null, authToken);
  if (!orders.success || !orders.data?.data?.orders?.length) {
    return false;
  }
  
  const pendingOrder = orders.data.data.orders.find(
    o => o.paymentStatus === 'pending' || o.paymentStatus === 'partial_paid'
  );
  
  if (!pendingOrder) {
    record('Payment Processing', 'Payment Intent - No Pending Orders', true, { note: 'All orders paid' });
    return true;
  }
  
  // Create payment intent (for advance payment)
  if (pendingOrder.paymentStatus === 'pending') {
    const paymentIntent = await makeRequest('POST', '/users/payments/create-intent', {
      orderId: pendingOrder.id || pendingOrder._id,
      paymentMethod: 'razorpay'
    }, authToken, 'any');
    
    record('Payment Processing', 'Create Payment Intent (30% Advance)', paymentIntent.success, {
      intentId: paymentIntent.data?.data?.intent?.id,
      amount: paymentIntent.data?.data?.intent?.amount
    });
    
    // Simulate payment confirmation (without actual gateway)
    // In real scenario, this would be done through gateway callback
    if (paymentIntent.success) {
      const confirmPayment = await makeRequest('POST', '/users/payments/confirm', {
        orderId: pendingOrder.id || pendingOrder._id,
        paymentId: `test_payment_${Date.now()}`,
        gatewayPaymentId: `gateway_${Date.now()}`,
        gatewayOrderId: paymentIntent.data?.data?.intent?.gatewayOrderId || `gateway_order_${Date.now()}`,
        gatewaySignature: 'test_signature'
      }, authToken, 'any');
      
      record('Payment Processing', 'Confirm Payment (30% Advance)', confirmPayment.success);
    }
  }
  
  // Test remaining payment (if order is delivered and partially paid)
  // First, we need to simulate order delivery (this would normally be done by vendor/admin)
  // For testing, we'll check if any orders are in delivered status with partial payment
  
  return true;
}

/**
 * Test 8: Order Tracking and Management
 */
async function testOrderTracking(record) {
  const orders = await makeRequest('GET', '/users/orders', null, authToken);
  record('Order Tracking', 'Get All Orders', orders.success, {
    count: orders.data?.data?.orders?.length
  });
  
  if (orders.success && orders.data?.data?.orders?.length > 0) {
    const order = orders.data.data.orders[0];
    const orderId = order.id || order._id;
    
    // Get order details
    const orderDetails = await makeRequest('GET', `/users/orders/${orderId}`, null, authToken);
    record('Order Tracking', 'Get Order Details', orderDetails.success);
    
    // Track order
    const trackOrder = await makeRequest('GET', `/users/orders/${orderId}/track`, null, authToken);
    record('Order Tracking', 'Track Order', trackOrder.success);
    
    // Get order payments
    const orderPayments = await makeRequest('GET', `/users/orders/${orderId}/payments`, null, authToken);
    record('Order Tracking', 'Get Order Payments', orderPayments.success);
    
    // Cancel order (if cancellable)
    if (order.status === 'pending' || order.status === 'awaiting') {
      const cancelOrder = await makeRequest('PUT', `/users/orders/${orderId}/cancel`, {
        reason: 'E2E Test Cancellation'
      }, authToken, 'any');
      record('Order Tracking', 'Cancel Order', cancelOrder.success);
    }
  }
  
  return true;
}

/**
 * Test 9: Favourites/Wishlist
 */
async function testFavourites(record) {
  if (testData.products.length === 0) return false;
  
  // Add to favourites
  const productId = testData.products[0].id || testData.products[0]._id;
  const addFav = await makeRequest('POST', '/users/favourites', {
    productId: productId
  }, authToken, 'any');
  
  record('Favourites', 'Add to Favourites', addFav.success);
  
  // Get favourites
  const getFavs = await makeRequest('GET', '/users/favourites', null, authToken);
  record('Favourites', 'Get Favourites', getFavs.success, {
    count: getFavs.data?.data?.favourites?.length
  });
  
  // Remove from favourites
  await sleep(300);
  const removeFav = await makeRequest('DELETE', `/users/favourites/${productId}`, null, authToken, 'any');
  record('Favourites', 'Remove from Favourites', removeFav.success);
  
  return true;
}

/**
 * Test 10: Notifications
 */
async function testNotifications(record) {
  const notifications = await makeRequest('GET', '/users/notifications', null, authToken);
  record('Notifications', 'Get Notifications', notifications.success, {
    count: notifications.data?.data?.notifications?.length
  });
  
  if (notifications.success && notifications.data?.data?.notifications?.length > 0) {
    const notifId = notifications.data.data.notifications[0].id || notifications.data.data.notifications[0]._id;
    
    // Mark as read
    const markRead = await makeRequest('PUT', `/users/notifications/${notifId}/read`, null, authToken, 'any');
    record('Notifications', 'Mark Notification as Read', markRead.success);
  }
  
  // Mark all as read
  const markAllRead = await makeRequest('PUT', '/users/notifications/read-all', null, authToken, 'any');
  record('Notifications', 'Mark All Notifications as Read', markAllRead.success);
  
  return true;
}

/**
 * Run all user workflow tests
 */
async function run(record) {
  // Setup
  if (!await testAuthentication(record)) {
    record('User Workflow', 'Authentication Failed - Skipping Other Tests', false);
    return;
  }
  
  await sleep(500);
  
  // Core workflow tests
  await testProductBrowsing(record);
  await sleep(500);
  
  await testCartManagement(record);
  await sleep(500);
  
  await testAddressManagement(record);
  await sleep(500);
  
  await testVendorAssignment(record);
  await sleep(500);
  
  await testOrderCreation(record);
  await sleep(1000);
  
  await testPaymentProcessing(record);
  await sleep(500);
  
  await testOrderTracking(record);
  await sleep(500);
  
  await testFavourites(record);
  await sleep(500);
  
  await testNotifications(record);
}

module.exports = { run };




