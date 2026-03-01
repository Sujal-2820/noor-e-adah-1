/**
 * Admin Workflow End-to-End Tests
 * 
 * Tests complete admin workflows:
 * 1. Authentication
 * 2. Dashboard Overview
 * 3. Product Management (CRUD)
 * 4. Vendor Management (Approve, Reject, Credit Policy)
 * 5. Seller Management (Approve, Reject, Targets)
 * 6. Order Management (Escalated Orders, Reassign)
 * 7. Finance Management (Credits, Withdrawals)
 * 8. Analytics and Reports
 */

const axios = require('axios');

const BASE_URL = process.env.API_URL || 'http://127.0.0.1:3000/api';
axios.defaults.family = 4;

const Admin = require('../../models/Admin');
const Product = require('../../models/Product');
const Vendor = require('../../models/Vendor');
const Seller = require('../../models/Seller');
const Order = require('../../models/Order');

let testAdmin = null;
let authToken = null;

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

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testAuthentication(record) {
  testAdmin = await Admin.findOne();
  
  if (!testAdmin) {
    record('Admin Auth', 'Test Admin Setup', false, { error: 'No admin found' });
    return false;
  }
  
  // Step 1: Login with phone only
  const login = await makeRequest('POST', '/admin/auth/login', {
    phone: testAdmin.phone
  }, null, 'any');
  
  record('Admin Auth', 'Admin Login (Phone only)', login.success);
  
  if (!login.success || login.status !== 200) {
      return false;
  }
  
  // Step 2: Request OTP
  const otpRequest = await makeRequest('POST', '/admin/auth/request-otp', {
    phone: testAdmin.phone
  }, null, 'any');
  
  record('Admin Auth', 'Request OTP', otpRequest.success);
  
  await sleep(1500);
  
  // Step 3: Verify OTP
  const adminWithOTP = await Admin.findOne({ phone: testAdmin.phone }).select('+otp');
  if (!adminWithOTP?.otp?.code) {
    record('Admin Auth', 'OTP Generated', false);
    return false;
  }
  
  const verifyOTP = await makeRequest('POST', '/admin/auth/verify-otp', {
    phone: testAdmin.phone,
    otp: adminWithOTP.otp.code
  }, null, 'any');
  
  record('Admin Auth', 'Verify OTP', verifyOTP.success);
  
  if (verifyOTP.success && verifyOTP.data?.data?.token) {
    authToken = verifyOTP.data.data.token;
    return true;
  }
  
  return false;
}

async function testDashboard(record) {
  const dashboard = await makeRequest('GET', '/admin/dashboard', null, authToken);
  record('Admin Dashboard', 'Get Dashboard Overview', dashboard.success);
  
  return true;
}

async function testProductManagement(record) {
  // Get all products
  const products = await makeRequest('GET', '/admin/products', null, authToken);
  record('Admin Products', 'Get All Products', products.success, {
    count: products.data?.data?.products?.length
  });
  
  // Create product
  const newProduct = await makeRequest('POST', '/admin/products', {
    name: `E2E Test Product ${Date.now()}`,
    description: 'Product created during E2E testing',
    category: 'fertilizer',
    priceToVendor: 500,
    priceToUser: 600,
    stock: 1000,
    sku: `E2E-${Date.now()}`
  }, authToken, 'any');
  
  record('Admin Products', 'Create Product', newProduct.success);
  
  let productId = null;
  if (newProduct.success && newProduct.data?.data?.product?.id) {
    productId = newProduct.data.data.product.id;
    
    // Update product
    const updateProduct = await makeRequest('PUT', `/admin/products/${productId}`, {
      name: `Updated E2E Product ${Date.now()}`,
      description: 'Updated during E2E testing'
    }, authToken, 'any');
    
    record('Admin Products', 'Update Product', updateProduct.success);
    
    // Toggle visibility
    const toggleVisibility = await makeRequest('PUT', `/admin/products/${productId}/visibility`, {
      isActive: false
    }, authToken, 'any');
    
    record('Admin Products', 'Toggle Product Visibility', toggleVisibility.success);
    
    // Assign to vendor
    const vendor = await Vendor.findOne({ status: 'approved', isActive: true });
    if (vendor) {
      const assign = await makeRequest('POST', `/admin/products/${productId}/assign`, {
        vendorId: vendor._id.toString(),
        stock: 100
      }, authToken, 'any');
      
      record('Admin Products', 'Assign Product to Vendor', assign.success);
    }
  }
  
  return true;
}

async function testVendorManagement(record) {
  const vendors = await makeRequest('GET', '/admin/vendors', null, authToken);
  record('Admin Vendors', 'Get All Vendors', vendors.success);
  
  // Approve pending vendor
  const pendingVendor = await Vendor.findOne({ status: 'pending' });
  if (pendingVendor) {
    const approve = await makeRequest('POST', `/admin/vendors/${pendingVendor._id}/approve`, {
      notes: 'Approved via E2E testing'
    }, authToken, 'any');
    
    record('Admin Vendors', 'Approve Vendor', approve.success);
  }
  
  // Update credit policy
  const approvedVendor = await Vendor.findOne({ status: 'approved', isActive: true });
  if (approvedVendor) {
    const creditPolicy = await makeRequest('PUT', `/admin/vendors/${approvedVendor._id}/credit-policy`, {
      creditLimit: 100000,
      repaymentDays: 30,
      penaltyRate: 2.5
    }, authToken, 'any');
    
    record('Admin Vendors', 'Update Vendor Credit Policy', creditPolicy.success);
  }
  
  return true;
}

async function testSellerManagement(record) {
  const sellers = await makeRequest('GET', '/admin/sellers', null, authToken);
  record('Admin Sellers', 'Get All Sellers', sellers.success);
  
  // Set seller target
  const seller = await Seller.findOne({ status: 'approved', isActive: true });
  if (seller) {
    const target = await makeRequest('PUT', `/admin/sellers/${seller._id}/target`, {
      monthlyTarget: 150000
    }, authToken, 'any');
    
    record('Admin Sellers', 'Set Seller Target', target.success);
  }
  
  return true;
}

async function testOrderManagement(record) {
  const orders = await makeRequest('GET', '/admin/orders', null, authToken);
  record('Admin Orders', 'Get All Orders', orders.success);
  
  // Get escalated orders
  const escalated = await makeRequest('GET', '/admin/orders/escalated', null, authToken);
  record('Admin Orders', 'Get Escalated Orders', escalated.success);
  
  // Reassign order if escalated
  if (escalated.success && escalated.data?.data?.orders?.length > 0) {
    const order = escalated.data.data.orders[0];
    const vendor = await Vendor.findOne({ status: 'approved', isActive: true });
    
    if (vendor) {
      const reassign = await makeRequest('PUT', `/admin/orders/${order.id || order._id}/reassign`, {
        vendorId: vendor._id.toString()
      }, authToken, 'any');
      
      record('Admin Orders', 'Reassign Order', reassign.success);
    }
  }
  
  return true;
}

async function testFinanceManagement(record) {
  const credits = await makeRequest('GET', '/admin/finance/credits', null, authToken);
  record('Admin Finance', 'Get Vendor Credits', credits.success);
  
  const recovery = await makeRequest('GET', '/admin/finance/recovery', null, authToken);
  record('Admin Finance', 'Get Credit Recovery Status', recovery.success);
  
  // Approve credit purchase
  const CreditPurchase = require('../../models/CreditPurchase');
  const pendingPurchase = await CreditPurchase.findOne({ status: 'pending' });
  if (pendingPurchase) {
    const approvePurchase = await makeRequest('POST', `/admin/vendors/purchases/${pendingPurchase._id}/approve`, {
      notes: 'Approved via E2E testing'
    }, authToken, 'any');
    
    record('Admin Finance', 'Approve Credit Purchase', approvePurchase.success);
  }
  
  // Approve withdrawal
  const WithdrawalRequest = require('../../models/WithdrawalRequest');
  const pendingWithdrawal = await WithdrawalRequest.findOne({ status: 'pending' });
  if (pendingWithdrawal) {
    const approveWithdrawal = await makeRequest('POST', `/admin/vendors/withdrawals/${pendingWithdrawal._id}/approve`, {
      notes: 'Approved via E2E testing'
    }, authToken, 'any');
    
    record('Admin Finance', 'Approve Vendor Withdrawal', approveWithdrawal.success);
  }
  
  return true;
}

async function testAnalytics(record) {
  const analytics = await makeRequest('GET', '/admin/analytics', null, authToken);
  record('Admin Analytics', 'Get Analytics Data', analytics.success);
  
  const reports = await makeRequest('GET', '/admin/reports?period=month&type=orders', null, authToken);
  record('Admin Analytics', 'Generate Reports', reports.success);
  
  return true;
}

async function run(record) {
  if (!await testAuthentication(record)) {
    record('Admin Workflow', 'Authentication Failed - Skipping Other Tests', false);
    return;
  }
  
  await sleep(500);
  
  await testDashboard(record);
  await sleep(500);
  
  await testProductManagement(record);
  await sleep(500);
  
  await testVendorManagement(record);
  await sleep(500);
  
  await testSellerManagement(record);
  await sleep(500);
  
  await testOrderManagement(record);
  await sleep(500);
  
  await testFinanceManagement(record);
  await sleep(500);
  
  await testAnalytics(record);
}

module.exports = { run };


