/**
 * Vendor Workflow End-to-End Tests
 * 
 * Tests complete vendor workflows:
 * 1. Authentication
 * 2. Dashboard Overview
 * 3. Order Management (Accept, Reject, Partial Accept)
 * 4. Order Status Updates (Awaiting → Dispatched → Delivered)
 * 5. Inventory Management
 * 6. Credit Purchase Requests
 * 7. Earnings and Withdrawals
 * 8. Reports and Analytics
 */

const axios = require('axios');

const BASE_URL = process.env.API_URL || 'http://127.0.0.1:3000/api';
axios.defaults.family = 4;

const Vendor = require('../../models/Vendor');
const Order = require('../../models/Order');
const ProductAssignment = require('../../models/ProductAssignment');
const CreditPurchase = require('../../models/CreditPurchase');
const Product = require('../../models/Product');

let testVendor = null;
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
  testVendor = await Vendor.findOne({ status: 'approved', isActive: true });
  
  if (!testVendor) {
    record('Vendor Auth', 'Test Vendor Setup', false, { error: 'No approved vendor found' });
    return false;
  }
  
  // Request OTP
  const otpRequest = await makeRequest('POST', '/vendors/auth/request-otp', {
    phone: testVendor.phone
  }, null, 'any');
  
  record('Vendor Auth', 'Request OTP', otpRequest.success);
  
  if (!otpRequest.success) return false;
  
  await sleep(1500);
  
  const vendorWithOTP = await Vendor.findOne({ phone: testVendor.phone }).select('+otp');
  if (!vendorWithOTP?.otp?.code) {
    record('Vendor Auth', 'OTP Generated', false);
    return false;
  }
  
  // Verify OTP
  const verifyOTP = await makeRequest('POST', '/vendors/auth/verify-otp', {
    phone: testVendor.phone,
    otp: vendorWithOTP.otp.code
  }, null, 'any');
  
  record('Vendor Auth', 'Verify OTP / Login', verifyOTP.success);
  
  if (verifyOTP.success && verifyOTP.data?.data?.token) {
    authToken = verifyOTP.data.data.token;
    return true;
  }
  
  return false;
}

async function testDashboard(record) {
  const dashboard = await makeRequest('GET', '/vendors/dashboard', null, authToken);
  record('Vendor Dashboard', 'Get Dashboard Overview', dashboard.success);
  
  const stats = await makeRequest('GET', '/vendors/orders/stats', null, authToken);
  record('Vendor Dashboard', 'Get Order Statistics', stats.success);
  
  return true;
}

async function testOrderManagement(record) {
  // Get orders
  const orders = await makeRequest('GET', '/vendors/orders', null, authToken);
  record('Vendor Orders', 'Get All Orders', orders.success, {
    count: orders.data?.data?.orders?.length
  });
  
  if (!orders.success || !orders.data?.data?.orders?.length) {
    return false;
  }
  
  // Find pending order
  const pendingOrder = orders.data.data.orders.find(o => o.status === 'pending' || o.status === 'awaiting');
  
  if (pendingOrder) {
    const orderId = pendingOrder.id || pendingOrder._id;
    
    // Accept order
    const acceptOrder = await makeRequest('POST', `/vendors/orders/${orderId}/accept`, {
      notes: 'E2E Test Acceptance'
    }, authToken, 'any');
    
    record('Vendor Orders', 'Accept Order', acceptOrder.success);
    
    // Confirm acceptance (after grace period would have passed)
    await sleep(2000);
    const confirmAccept = await makeRequest('POST', `/vendors/orders/${orderId}/confirm-acceptance`, null, authToken, 'any');
    record('Vendor Orders', 'Confirm Order Acceptance', confirmAccept.success);
    
    // Update order status
    const updateStatus = await makeRequest('PUT', `/vendors/orders/${orderId}/status`, {
      status: 'dispatched',
      notes: 'Order dispatched via E2E test'
    }, authToken, 'any');
    
    record('Vendor Orders', 'Update Order Status (Dispatched)', updateStatus.success);
    
    // Update to delivered
    await sleep(1000);
    const deliveredStatus = await makeRequest('PUT', `/vendors/orders/${orderId}/status`, {
      status: 'delivered',
      notes: 'Order delivered via E2E test'
    }, authToken, 'any');
    
    record('Vendor Orders', 'Update Order Status (Delivered)', deliveredStatus.success);
  }
  
  // Test reject order
  const anotherPending = orders.data.data.orders.find(
    o => (o.status === 'pending' || o.status === 'awaiting') && o.id !== pendingOrder?.id
  );
  
  if (anotherPending) {
    const rejectOrder = await makeRequest('POST', `/vendors/orders/${anotherPending.id || anotherPending._id}/reject`, {
      reason: 'E2E Test Rejection - Out of stock'
    }, authToken, 'any');
    
    record('Vendor Orders', 'Reject Order', rejectOrder.success);
  }
  
  // Test partial accept
  const partialOrder = orders.data.data.orders.find(
    o => o.status === 'pending' && o.items && o.items.length > 1
  );
  
  if (partialOrder && partialOrder.items && partialOrder.items.length > 1) {
    const partialAccept = await makeRequest('POST', `/vendors/orders/${partialOrder.id || partialOrder._id}/accept-partial`, {
      acceptedItems: [
        {
          itemId: partialOrder.items[0].id || partialOrder.items[0]._id,
          quantity: partialOrder.items[0].quantity
        }
      ],
      rejectedItems: [
        {
          itemId: partialOrder.items[1].id || partialOrder.items[1]._id,
          quantity: partialOrder.items[1].quantity,
          reason: 'Out of stock'
        }
      ],
      notes: 'E2E Partial Acceptance Test'
    }, authToken, 'any');
    
    record('Vendor Orders', 'Partial Accept Order', partialAccept.success);
  }
  
  return true;
}

async function testInventory(record) {
  const inventory = await makeRequest('GET', '/vendors/inventory', null, authToken);
  record('Vendor Inventory', 'Get Inventory', inventory.success, {
    count: inventory.data?.data?.inventory?.length
  });
  
  const stats = await makeRequest('GET', '/vendors/inventory/stats', null, authToken);
  record('Vendor Inventory', 'Get Inventory Statistics', stats.success);
  
  if (inventory.success && inventory.data?.data?.inventory?.length > 0) {
    const item = inventory.data.data.inventory[0];
    const itemId = item.id || item._id;
    
    // Update stock
    const updateStock = await makeRequest('PUT', `/vendors/inventory/${itemId}/stock`, {
      quantity: (item.stock || 0) + 10,
      notes: 'E2E Stock Update Test'
    }, authToken, 'any');
    
    record('Vendor Inventory', 'Update Stock Quantity', updateStock.success);
    
    // Get item details
    const itemDetails = await makeRequest('GET', `/vendors/inventory/${itemId}`, null, authToken);
    record('Vendor Inventory', 'Get Inventory Item Details', itemDetails.success);
  }
  
  return true;
}

async function testCreditManagement(record) {
  // Get credit info
  const creditInfo = await makeRequest('GET', '/vendors/credit', null, authToken);
  record('Vendor Credit', 'Get Credit Information', creditInfo.success);
  
  // Get credit purchases
  const purchases = await makeRequest('GET', '/vendors/credit/purchases', null, authToken);
  record('Vendor Credit', 'Get Credit Purchases', purchases.success);
  
  // Get credit history
  const history = await makeRequest('GET', '/vendors/credit/history', null, authToken);
  record('Vendor Credit', 'Get Credit History', history.success);
  
  // Request credit purchase (if vendor has products assigned)
  const products = await Product.find({ isActive: true }).limit(3);
  if (products.length >= 3 && testVendor) {
    const items = products.map((p, idx) => ({
      productId: p._id.toString(),
      quantity: 50 + (idx * 10),
      unitPrice: p.priceToVendor || 500,
      totalPrice: (50 + (idx * 10)) * (p.priceToVendor || 500)
    }));
    
    const totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);
    
    if (totalAmount >= 50000) {
      const requestCredit = await makeRequest('POST', '/vendors/credit/purchase', {
        items: items,
        totalAmount: totalAmount,
        notes: 'E2E Credit Purchase Test'
      }, authToken, 'any');
      
      record('Vendor Credit', 'Request Credit Purchase (≥₹50,000)', requestCredit.success, {
        amount: totalAmount
      });
    } else {
      // Test minimum requirement (should fail)
      const minTest = await makeRequest('POST', '/vendors/credit/purchase', {
        items: [{ productId: products[0]._id.toString(), quantity: 1, unitPrice: 1000, totalPrice: 1000 }],
        totalAmount: 1000
      }, authToken, 400);
      
      record('Vendor Credit', 'Credit Purchase Below Minimum (₹50,000)', !minTest.success, {
        expected: 'Should fail with 400'
      });
    }
  }
  
  return true;
}

async function testEarnings(record) {
  const earnings = await makeRequest('GET', '/vendors/earnings', null, authToken);
  record('Vendor Earnings', 'Get Earnings Summary', earnings.success);
  
  const earningsHistory = await makeRequest('GET', '/vendors/earnings/history', null, authToken);
  record('Vendor Earnings', 'Get Earnings History', earningsHistory.success);
  
  const earningsByOrders = await makeRequest('GET', '/vendors/earnings/orders', null, authToken);
  record('Vendor Earnings', 'Get Earnings by Orders', earningsByOrders.success);
  
  const balance = await makeRequest('GET', '/vendors/balance', null, authToken);
  record('Vendor Earnings', 'Get Available Balance', balance.success);
  
  return true;
}

async function testWithdrawals(record) {
  // Get withdrawals
  const withdrawals = await makeRequest('GET', '/vendors/withdrawals', null, authToken);
  record('Vendor Withdrawals', 'Get Withdrawal Requests', withdrawals.success);
  
  // Request withdrawal (if balance available)
  const balance = await makeRequest('GET', '/vendors/balance', null, authToken);
  if (balance.success && balance.data?.data?.availableBalance > 100) {
    const requestWithdrawal = await makeRequest('POST', '/vendors/withdrawals/request', {
      amount: Math.min(balance.data.data.availableBalance, 1000),
      bankAccountId: null, // Would normally provide bank account ID
      notes: 'E2E Withdrawal Test'
    }, authToken, 'any');
    
    record('Vendor Withdrawals', 'Request Withdrawal', requestWithdrawal.success);
  }
  
  return true;
}

async function testReports(record) {
  const reports = await makeRequest('GET', '/vendors/reports?period=month&type=revenue', null, authToken);
  record('Vendor Reports', 'Get Reports', reports.success);
  
  const analytics = await makeRequest('GET', '/vendors/reports/analytics', null, authToken);
  record('Vendor Reports', 'Get Performance Analytics', analytics.success);
  
  return true;
}

async function run(record) {
  if (!await testAuthentication(record)) {
    record('Vendor Workflow', 'Authentication Failed - Skipping Other Tests', false);
    return;
  }
  
  await sleep(500);
  
  await testDashboard(record);
  await sleep(500);
  
  await testOrderManagement(record);
  await sleep(1000);
  
  await testInventory(record);
  await sleep(500);
  
  await testCreditManagement(record);
  await sleep(500);
  
  await testEarnings(record);
  await sleep(500);
  
  await testWithdrawals(record);
  await sleep(500);
  
  await testReports(record);
}

module.exports = { run };




