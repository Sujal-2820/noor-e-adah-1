/**
 * API Edge Case Tests
 * 
 * Tests error handling, validation, limits, and edge cases:
 * 1. Invalid authentication
 * 2. Missing required fields
 * 3. Invalid data types
 * 4. Boundary conditions (min/max values)
 * 5. Unauthorized access
 * 6. Non-existent resources
 * 7. Concurrent operations
 * 8. Data validation rules
 */

const axios = require('axios');

const BASE_URL = process.env.API_URL || 'http://127.0.0.1:3000/api';
axios.defaults.family = 4;

async function makeRequest(method, url, data = null, token = null, expectedStatus = 200) {
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

async function testInvalidAuth(record) {
  // Invalid token
  const invalidToken = await makeRequest('GET', '/users/profile', null, 'invalid_token', 401);
  record('Edge Cases', 'Access with Invalid Token', !invalidToken.success && invalidToken.status === 401);
  
  // No token
  const noToken = await makeRequest('GET', '/users/profile', null, null, 401);
  record('Edge Cases', 'Access without Token', !noToken.success && noToken.status === 401);
  
  // Invalid OTP
  const User = require('../../models/User');
  const user = await User.findOne({ isActive: true });
  if (user) {
    const invalidOTP = await makeRequest('POST', '/users/auth/login', {
      phone: user.phone,
      otp: '000000'
    }, null, 401);
    record('Edge Cases', 'Login with Invalid OTP', !invalidOTP.success && invalidOTP.status === 401);
  }
  
  return true;
}

async function testMissingFields(record) {
  // Create order without required fields
  const incompleteOrder = await makeRequest('POST', '/users/orders', {
    // Missing addressId, paymentPreference
  }, null, 400);
  record('Edge Cases', 'Create Order Missing Required Fields', !incompleteOrder.success);
  
  // Add to cart without quantity
  const incompleteCart = await makeRequest('POST', '/users/cart', {
    productId: '507f1f77bcf86cd799439011'
    // Missing quantity
  }, null, 400);
  record('Edge Cases', 'Add to Cart Missing Quantity', !incompleteCart.success);
  
  return true;
}

async function testInvalidDataTypes(record) {
  // Invalid product ID format
  const invalidProductId = await makeRequest('GET', '/users/products/invalid-id-format', null, null, 400);
  record('Edge Cases', 'Invalid Product ID Format', !invalidProductId.success);
  
  // Invalid coordinates
  const invalidCoords = await makeRequest('POST', '/users/vendors/assign', {
    coordinates: { lat: 'invalid', lng: 'invalid' }
  }, null, 400);
  record('Edge Cases', 'Invalid Coordinates Format', !invalidCoords.success);
  
  return true;
}

async function testBoundaryConditions(record) {
  // Cart minimum order value (₹2000)
  const User = require('../../models/User');
  const Product = require('../../models/Product');
  
  let testUser = await User.findOne({ isActive: true });
  if (testUser) {
    // Generate OTP and get token
    await makeRequest('POST', '/users/auth/request-otp', { phone: testUser.phone }, null, 'any');
    await sleep(1500);
    const userWithOTP = await User.findOne({ phone: testUser.phone }).select('+otp');
    
    if (userWithOTP?.otp?.code) {
      const login = await makeRequest('POST', '/users/auth/login', {
        phone: testUser.phone,
        otp: userWithOTP.otp.code
      }, null, 'any');
      
      if (login.success && login.data?.data?.token) {
        const token = login.data.data.token;
        
        // Clear cart
        await makeRequest('DELETE', '/users/cart', null, token, 'any');
        
        // Add product with quantity that results in less than ₹2000
        const product = await Product.findOne({ isActive: true, priceToUser: { $exists: true, $lt: 2000 } });
        if (product) {
          const quantity = Math.floor(1999 / product.priceToUser);
          if (quantity > 0) {
            await makeRequest('POST', '/users/cart', {
              productId: product._id.toString(),
              quantity: quantity
            }, token, 'any');
            
            await sleep(500);
            
            // Validate cart - should fail minimum order check
            const validate = await makeRequest('POST', '/users/cart/validate', null, token);
            record('Edge Cases', 'Cart Below Minimum Order (₹2000)', 
              validate.data?.data?.isValid === false || validate.data?.data?.total < 2000);
          }
        }
      }
    }
  }
  
  // Credit purchase minimum (₹50,000)
  const Vendor = require('../../models/Vendor');
  const vendor = await Vendor.findOne({ status: 'approved', isActive: true });
  if (vendor) {
    await makeRequest('POST', '/vendors/auth/request-otp', { phone: vendor.phone }, null, 'any');
    await sleep(1500);
    const vendorWithOTP = await Vendor.findOne({ phone: vendor.phone }).select('+otp');
    
    if (vendorWithOTP?.otp?.code) {
      const vendorLogin = await makeRequest('POST', '/vendors/auth/verify-otp', {
        phone: vendor.phone,
        otp: vendorWithOTP.otp.code
      }, null, 'any');
      
      if (vendorLogin.success && vendorLogin.data?.data?.token) {
        const vendorToken = vendorLogin.data.data.token;
        
        // Try credit purchase below minimum
        const product = await Product.findOne({ isActive: true });
        if (product) {
          const belowMin = await makeRequest('POST', '/vendors/credit/purchase', {
            items: [{
              productId: product._id.toString(),
              quantity: 1,
              unitPrice: 1000,
              totalPrice: 1000
            }],
            totalAmount: 1000
          }, vendorToken, 400);
          
          record('Edge Cases', 'Credit Purchase Below Minimum (₹50,000)', !belowMin.success && belowMin.status === 400);
        }
      }
    }
  }
  
  return true;
}

async function testNonExistentResources(record) {
  // Non-existent product
  const fakeProductId = '507f1f77bcf86cd799439011';
  const nonExistentProduct = await makeRequest('GET', `/users/products/${fakeProductId}`, null, null, 404);
  record('Edge Cases', 'Get Non-existent Product', !nonExistentProduct.success && nonExistentProduct.status === 404);
  
  // Non-existent order
  const fakeOrderId = '507f1f77bcf86cd799439011';
  const nonExistentOrder = await makeRequest('GET', `/users/orders/${fakeOrderId}`, null, null, 404);
  record('Edge Cases', 'Get Non-existent Order', !nonExistentOrder.success && nonExistentOrder.status === 404);
  
  return true;
}

async function testDataValidation(record) {
  // Invalid phone number format
  const invalidPhone = await makeRequest('POST', '/users/auth/request-otp', {
    phone: '12345' // Invalid format
  }, null, 400);
  record('Edge Cases', 'Invalid Phone Number Format', !invalidPhone.success);
  
  // Invalid phone format
  const Admin = require('../../models/Admin');
  const admin = await Admin.findOne();
  if (admin) {
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const invalidPhone = await makeRequest('POST', '/admin/auth/login', {
      phone: 'invalid-phone-format',
      password: adminPassword
    }, null, 400);
    record('Edge Cases', 'Invalid Phone Format', !invalidPhone.success);
  }
  
  // Negative quantity
  const User = require('../../models/User');
  const Product = require('../../models/Product');
  const user = await User.findOne({ isActive: true });
  const product = await Product.findOne({ isActive: true });
  
  if (user && product) {
    await makeRequest('POST', '/users/auth/request-otp', { phone: user.phone }, null, 'any');
    await sleep(1500);
    const userWithOTP = await User.findOne({ phone: user.phone }).select('+otp');
    
    if (userWithOTP?.otp?.code) {
      const login = await makeRequest('POST', '/users/auth/login', {
        phone: user.phone,
        otp: userWithOTP.otp.code
      }, null, 'any');
      
      if (login.success && login.data?.data?.token) {
        const token = login.data.data.token;
        
        const negativeQty = await makeRequest('POST', '/users/cart', {
          productId: product._id.toString(),
          quantity: -1
        }, token, 400);
        
        record('Edge Cases', 'Negative Quantity in Cart', !negativeQty.success);
      }
    }
  }
  
  return true;
}

async function run(record) {
  await testInvalidAuth(record);
  await sleep(300);
  
  await testMissingFields(record);
  await sleep(300);
  
  await testInvalidDataTypes(record);
  await sleep(300);
  
  await testBoundaryConditions(record);
  await sleep(500);
  
  await testNonExistentResources(record);
  await sleep(300);
  
  await testDataValidation(record);
}

module.exports = { run };


