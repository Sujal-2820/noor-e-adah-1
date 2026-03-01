/**
 * Seller Workflow End-to-End Tests
 * 
 * Tests complete seller workflows:
 * 1. Authentication
 * 2. Dashboard Overview
 * 3. Wallet Management
 * 4. Referrals Management
 * 5. Target and Performance
 * 6. Withdrawals
 * 7. Notifications
 */

const axios = require('axios');

const BASE_URL = process.env.API_URL || 'http://127.0.0.1:3000/api';
axios.defaults.family = 4;

const Seller = require('../../models/Seller');
const User = require('../../models/User');
const Order = require('../../models/Order');
const Commission = require('../../models/Commission');

let testSeller = null;
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
  testSeller = await Seller.findOne({ status: 'approved', isActive: true });
  
  if (!testSeller) {
    record('Seller Auth', 'Test Seller Setup', false, { error: 'No approved seller found' });
    return false;
  }
  
  const otpRequest = await makeRequest('POST', '/sellers/auth/request-otp', {
    phone: testSeller.phone
  }, null, 'any');
  
  record('Seller Auth', 'Request OTP', otpRequest.success);
  
  if (!otpRequest.success) return false;
  
  await sleep(1500);
  
  const sellerWithOTP = await Seller.findOne({ phone: testSeller.phone }).select('+otp');
  if (!sellerWithOTP?.otp?.code) {
    record('Seller Auth', 'OTP Generated', false);
    return false;
  }
  
  const verifyOTP = await makeRequest('POST', '/sellers/auth/verify-otp', {
    phone: testSeller.phone,
    otp: sellerWithOTP.otp.code
  }, null, 'any');
  
  record('Seller Auth', 'Verify OTP / Login', verifyOTP.success);
  
  if (verifyOTP.success && verifyOTP.data?.data?.token) {
    authToken = verifyOTP.data.data.token;
    return true;
  }
  
  return false;
}

async function testDashboard(record) {
  const dashboard = await makeRequest('GET', '/sellers/dashboard', null, authToken);
  record('Seller Dashboard', 'Get Dashboard Overview', dashboard.success);
  
  const overview = await makeRequest('GET', '/sellers/dashboard/overview', null, authToken);
  record('Seller Dashboard', 'Get Overview Data', overview.success);
  
  const wallet = await makeRequest('GET', '/sellers/dashboard/wallet', null, authToken);
  record('Seller Dashboard', 'Get Dashboard Wallet', wallet.success);
  
  const referrals = await makeRequest('GET', '/sellers/dashboard/referrals', null, authToken);
  record('Seller Dashboard', 'Get Dashboard Referrals', referrals.success);
  
  const performance = await makeRequest('GET', '/sellers/dashboard/performance', null, authToken);
  record('Seller Dashboard', 'Get Dashboard Performance', performance.success);
  
  const highlights = await makeRequest('GET', '/sellers/dashboard/highlights', null, authToken);
  record('Seller Dashboard', 'Get Dashboard Highlights', highlights.success);
  
  const activity = await makeRequest('GET', '/sellers/dashboard/activity', null, authToken);
  record('Seller Dashboard', 'Get Recent Activity', activity.success);
  
  return true;
}

async function testWallet(record) {
  const wallet = await makeRequest('GET', '/sellers/wallet', null, authToken);
  record('Seller Wallet', 'Get Wallet Details', wallet.success);
  
  const transactions = await makeRequest('GET', '/sellers/wallet/transactions', null, authToken);
  record('Seller Wallet', 'Get Wallet Transactions', transactions.success);
  
  const withdrawals = await makeRequest('GET', '/sellers/wallet/withdrawals', null, authToken);
  record('Seller Wallet', 'Get Withdrawal Requests', withdrawals.success);
  
  // Request withdrawal if balance available
  if (wallet.success && wallet.data?.data?.balance > 100) {
    const withdraw = await makeRequest('POST', '/sellers/wallet/withdraw', {
      amount: Math.min(wallet.data.data.balance, 1000),
      paymentDetails: {
        bankName: 'Test Bank',
        accountNumber: '1234567890',
        ifscCode: 'TEST0001234',
        accountHolderName: testSeller?.name || 'Test Seller'
      }
    }, authToken, 'any');
    
    record('Seller Wallet', 'Request Withdrawal', withdraw.success);
  }
  
  return true;
}

async function testReferrals(record) {
  const referrals = await makeRequest('GET', '/sellers/referrals', null, authToken);
  record('Seller Referrals', 'Get All Referrals', referrals.success, {
    count: referrals.data?.data?.referrals?.length
  });
  
  const stats = await makeRequest('GET', '/sellers/referrals/stats', null, authToken);
  record('Seller Referrals', 'Get Referral Statistics', stats.success);
  
  // Get referral details
  if (referrals.success && referrals.data?.data?.referrals?.length > 0) {
    const referralId = referrals.data.data.referrals[0].id || referrals.data.data.referrals[0]._id;
    const details = await makeRequest('GET', `/sellers/referrals/${referralId}`, null, authToken);
    record('Seller Referrals', 'Get Referral Details', details.success);
  }
  
  return true;
}

async function testTargetPerformance(record) {
  const target = await makeRequest('GET', '/sellers/target', null, authToken);
  record('Seller Performance', 'Get Monthly Target', target.success);
  
  const targetHistory = await makeRequest('GET', '/sellers/targets/history', null, authToken);
  record('Seller Performance', 'Get Target History', targetHistory.success);
  
  const incentives = await makeRequest('GET', '/sellers/targets/incentives', null, authToken);
  record('Seller Performance', 'Get Target Incentives', incentives.success);
  
  const performance = await makeRequest('GET', '/sellers/performance', null, authToken);
  record('Seller Performance', 'Get Performance Analytics', performance.success);
  
  return true;
}

async function testNotifications(record) {
  const notifications = await makeRequest('GET', '/sellers/notifications', null, authToken);
  record('Seller Notifications', 'Get Notifications', notifications.success);
  
  const announcements = await makeRequest('GET', '/sellers/announcements', null, authToken);
  record('Seller Notifications', 'Get Announcements', announcements.success);
  
  if (notifications.success && notifications.data?.data?.notifications?.length > 0) {
    const notifId = notifications.data.data.notifications[0].id || notifications.data.data.notifications[0]._id;
    const markRead = await makeRequest('PUT', `/sellers/notifications/${notifId}/read`, null, authToken, 'any');
    record('Seller Notifications', 'Mark Notification as Read', markRead.success);
  }
  
  return true;
}

async function run(record) {
  if (!await testAuthentication(record)) {
    record('Seller Workflow', 'Authentication Failed - Skipping Other Tests', false);
    return;
  }
  
  await sleep(500);
  
  await testDashboard(record);
  await sleep(500);
  
  await testWallet(record);
  await sleep(500);
  
  await testReferrals(record);
  await sleep(500);
  
  await testTargetPerformance(record);
  await sleep(500);
  
  await testNotifications(record);
}

module.exports = { run };




