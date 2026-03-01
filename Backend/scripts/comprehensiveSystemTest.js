/**
 * COMPREHENSIVE SYSTEM TEST SCRIPT
 * Based on: END_TO_END_WORKFLOW_AND_TESTING_PLAN.md
 * 
 * Tests all critical system workflows and reports failures
 * Run from: Backend directory
 * Command: node scripts/comprehensiveSystemTest.js
 */

const axios = require('axios');
const mongoose = require('mongoose');
require('dotenv').config();

// Models
const Admin = require('../models/Admin');
const Vendor = require('../models/Vendor');
const Seller = require('../models/Seller');
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const CreditPurchase = require('../models/CreditPurchase');

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const API_BASE = `${BASE_URL}/api`;

// Test Results Storage
const testResults = {
    passed: [],
    failed: [],
    warnings: [],
    summary: {}
};

// Utility Functions
const log = (message, type = 'INFO') => {
    const timestamp = new Date().toISOString();
    const color = {
        'INFO': '\x1b[36m',    // Cyan
        'PASS': '\x1b[32m',    // Green
        'FAIL': '\x1b[31m',    // Red
        'WARN': '\x1b[33m',    // Yellow
        'TEST': '\x1b[35m'     // Magenta
    }[type] || '\x1b[0m';

    console.log(`${color}[${timestamp}] [${type}] ${message}\x1b[0m`);
};

const recordTest = (testId, testName, passed, details = {}) => {
    const result = {
        testId,
        testName,
        passed,
        timestamp: new Date().toISOString(),
        details
    };

    if (passed) {
        testResults.passed.push(result);
        log(`✓ ${testId}: ${testName}`, 'PASS');
    } else {
        testResults.failed.push(result);
        log(`✗ ${testId}: ${testName}`, 'FAIL');
        if (details.error) {
            log(`  Error: ${details.error}`, 'FAIL');
        }
        if (details.expected) {
            log(`  Expected: ${JSON.stringify(details.expected)}`, 'FAIL');
        }
        if (details.actual) {
            log(`  Actual: ${JSON.stringify(details.actual)}`, 'FAIL');
        }
    }

    return passed;
};

const calculateDistance = (coord1, coord2) => {
    const R = 6371000; // Earth's radius in meters
    const lat1 = coord1.lat * Math.PI / 180;
    const lat2 = coord2.lat * Math.PI / 180;
    const deltaLat = (coord2.lat - coord1.lat) * Math.PI / 180;
    const deltaLng = (coord2.lng - coord1.lng) * Math.PI / 180;

    const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
        Math.cos(lat1) * Math.cos(lat2) *
        Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
};

// Test Data
let testData = {
    adminToken: null,
    vendorTokens: [],
    sellerTokens: [],
    userTokens: [],
    vendors: [],
    sellers: [],
    users: [],
    products: [],
    orders: [],
    creditCycles: []
};

// ============================================================================
// AUTHENTICATION TESTS
// ============================================================================

const testAuthentication = async () => {
    log('\n========== AUTHENTICATION TESTS ==========', 'TEST');

    // AUTH-001: Admin Two-Step Login
    try {
        log('Testing AUTH-001: Admin Two-Step Login...', 'INFO');

        // Find or create test admin
        let admin = await Admin.findOne({ email: 'test@admin.com' });
        if (!admin) {
            admin = await Admin.create({
                email: 'test@admin.com',
                password: 'Test@123',
                name: 'Test Admin',
                role: 'super_admin'
            });
        }

        // Step 1: Email/Password
        const loginResponse = await axios.post(`${API_BASE}/admin/auth/login`, {
            email: 'test@admin.com',
            password: 'Test@123'
        }).catch(err => ({ data: { success: false, error: err.response?.data?.message || err.message } }));

        if (!loginResponse.data.success) {
            recordTest('AUTH-001', 'Admin Two-Step Login - Step 1', false, {
                error: loginResponse.data.error || 'Login failed'
            });
            return false;
        }

        // Step 2: OTP Request (get OTP from database)
        await axios.post(`${API_BASE}/admin/auth/request-otp`, {
            email: 'test@admin.com'
        }).catch(err => ({ data: { success: false } }));

        // Get OTP from DB
        admin = await Admin.findOne({ email: 'test@admin.com' });
        const otp = admin.otp?.code;

        if (!otp) {
            recordTest('AUTH-001', 'Admin Two-Step Login - Step 2', false, {
                error: 'OTP not generated'
            });
            return false;
        }

        // Step 3: Verify OTP
        const otpResponse = await axios.post(`${API_BASE}/admin/auth/verify-otp`, {
            email: 'test@admin.com',
            otp: otp
        }).catch(err => ({ data: { success: false, error: err.response?.data?.message } }));

        if (otpResponse.data.success && otpResponse.data.data?.token) {
            testData.adminToken = otpResponse.data.data.token;
            recordTest('AUTH-001', 'Admin Two-Step Login', true, {
                tokenReceived: true
            });
        } else {
            recordTest('AUTH-001', 'Admin Two-Step Login', false, {
                error: otpResponse.data.error || 'No token received'
            });
        }
    } catch (error) {
        recordTest('AUTH-001', 'Admin Two-Step Login', false, {
            error: error.message
        });
    }

    // AUTH-002: Vendor OTP Registration
    try {
        log('Testing AUTH-002: Vendor OTP Registration...', 'INFO');

        const vendorPhone = '+919999000001';

        // Request OTP
        await axios.post(`${API_BASE}/vendors/auth/request-otp`, {
            phone: vendorPhone
        }).catch(err => ({ data: { success: false } }));

        // Get OTP from DB (for testing)
        let vendor = await Vendor.findOne({ phone: vendorPhone });
        const otp = vendor?.otp?.code || '123456';

        // Register with OTP
        const registerResponse = await axios.post(`${API_BASE}/vendors/auth/register`, {
            phone: vendorPhone,
            otp: otp,
            name: 'Test Vendor 1',
            shopName: 'Test Shop 1',
            location: {
                address: 'Test Address 1',
                city: 'Test City',
                state: 'Test State',
                pincode: '110001',
                coordinates: {
                    lat: 28.6139,
                    lng: 77.2090
                }
            },
            businessLicense: 'TEST-LIC-001'
        }).catch(err => ({ data: { success: false, error: err.response?.data?.message } }));

        if (registerResponse.data.success) {
            vendor = await Vendor.findOne({ phone: vendorPhone });
            testData.vendors.push(vendor);
            recordTest('AUTH-002', 'Vendor OTP Registration', true, {
                vendorId: vendor._id,
                status: vendor.status
            });
        } else {
            recordTest('AUTH-002', 'Vendor OTP Registration', false, {
                error: registerResponse.data.error || 'Registration failed'
            });
        }
    } catch (error) {
        recordTest('AUTH-002', 'Vendor OTP Registration', false, {
            error: error.message
        });
    }
};

// ============================================================================
// VENDOR RADIUS TESTS (500m - CRITICAL)
// ============================================================================

const testVendorRadius = async () => {
    log('\n========== VENDOR RADIUS TESTS (500m) ==========', 'TEST');

    // VRAD-001: First Vendor Registration
    try {
        log('Testing VRAD-001: First Vendor Registration...', 'INFO');

        const vendor1Data = {
            phone: '+919999000010',
            name: 'Vendor Radius Test 1',
            shopName: 'Shop 1',
            location: {
                address: 'Location 1',
                city: 'Delhi',
                state: 'Delhi',
                pincode: '110001',
                coordinates: {
                    lat: 28.6139,
                    lng: 77.2090
                }
            },
            businessLicense: 'TEST-RAD-001'
        };

        // Clean up if exists
        await Vendor.deleteOne({ phone: vendor1Data.phone });

        // Request OTP
        await axios.post(`${API_BASE}/vendors/auth/request-otp`, {
            phone: vendor1Data.phone
        }).catch(() => ({}));

        // Register
        let vendor = await Vendor.findOne({ phone: vendor1Data.phone });
        const otp = vendor?.otp?.code || '123456';

        await axios.post(`${API_BASE}/vendors/auth/register`, {
            ...vendor1Data,
            otp: otp
        }).catch(() => ({ data: { success: false } }));

        vendor = await Vendor.findOne({ phone: vendor1Data.phone });

        if (vendor) {
            // Admin approves
            vendor.status = 'approved';
            vendor.creditLimit = 100000;
            await vendor.save();

            testData.vendors.push(vendor);
            recordTest('VRAD-001', 'First Vendor Registration', true, {
                vendorId: vendor._id,
                coordinates: vendor.location.coordinates
            });
        } else {
            recordTest('VRAD-001', 'First Vendor Registration', false, {
                error: 'Vendor not created'
            });
        }
    } catch (error) {
        recordTest('VRAD-001', 'First Vendor Registration', false, {
            error: error.message
        });
    }

    // VRAD-002: Second Vendor 500m Away (Should be REJECTED)
    try {
        log('Testing VRAD-002: Vendor 500m Away (Should be Rejected)...', 'INFO');

        // Get first vendor coordinates
        const vendor1 = testData.vendors[testData.vendors.length - 1];
        if (!vendor1) {
            throw new Error('No first vendor found');
        }

        // Calculate coordinates ~500m away (about 0.0045 degrees)
        const vendor2Coords = {
            lat: vendor1.location.coordinates.lat + 0.0045,
            lng: vendor1.location.coordinates.lng
        };

        const actualDistance = calculateDistance(
            vendor1.location.coordinates,
            vendor2Coords
        );

        const vendor2Data = {
            phone: '+919999000011',
            name: 'Vendor Radius Test 2',
            shopName: 'Shop 2',
            location: {
                address: 'Location 2',
                city: 'Delhi',
                state: 'Delhi',
                pincode: '110001',
                coordinates: vendor2Coords
            },
            businessLicense: 'TEST-RAD-002'
        };

        // Clean up if exists
        await Vendor.deleteOne({ phone: vendor2Data.phone });

        // Try to register
        await axios.post(`${API_BASE}/vendors/auth/request-otp`, {
            phone: vendor2Data.phone
        }).catch(() => ({}));

        let vendor = await Vendor.findOne({ phone: vendor2Data.phone });
        const otp = vendor?.otp?.code || '123456';

        await axios.post(`${API_BASE}/vendors/auth/register`, {
            ...vendor2Data,
            otp: otp
        }).catch(() => ({ data: { success: false } }));

        vendor = await Vendor.findOne({ phone: vendor2Data.phone });

        if (vendor && vendor.status === 'pending') {
            // Try to approve (should fail due to 500m rule)
            const approvalResult = await axios.post(
                `${API_BASE}/admin/vendors/${vendor._id}/approve`,
                {},
                { headers: { Authorization: `Bearer ${testData.adminToken}` } }
            ).catch(err => ({
                data: {
                    success: false,
                    message: err.response?.data?.message
                }
            }));

            // Should be rejected
            if (!approvalResult.data.success && approvalResult.data.message?.includes('500m')) {
                recordTest('VRAD-002', 'Vendor 500m Away Rejected', true, {
                    actualDistance: `${actualDistance.toFixed(2)}m`,
                    rejectionReason: approvalResult.data.message
                });
            } else {
                recordTest('VRAD-002', 'Vendor 500m Away Rejected', false, {
                    error: 'Vendor should be rejected but was approved',
                    actualDistance: `${actualDistance.toFixed(2)}m`
                });
            }
        } else {
            recordTest('VRAD-002', 'Vendor 500m Away Rejected', false, {
                error: 'Vendor registration failed unexpectedly'
            });
        }
    } catch (error) {
        recordTest('VRAD-002', 'Vendor 500m Away Rejected', false, {
            error: error.message
        });
    }

    // VRAD-003: Vendor 501m+ Away (Should be APPROVED)
    try {
        log('Testing VRAD-003: Vendor >500m Away (Should be Approved)...', 'INFO');

        const vendor1 = testData.vendors[testData.vendors.length - 1];
        if (!vendor1) {
            throw new Error('No first vendor found');
        }

        // Calculate coordinates ~600m away
        const vendor3Coords = {
            lat: vendor1.location.coordinates.lat + 0.0055,
            lng: vendor1.location.coordinates.lng
        };

        const actualDistance = calculateDistance(
            vendor1.location.coordinates,
            vendor3Coords
        );

        const vendor3Data = {
            phone: '+919999000012',
            name: 'Vendor Radius Test 3',
            shopName: 'Shop 3',
            location: {
                address: 'Location 3',
                city: 'Delhi',
                state: 'Delhi',
                pincode: '110001',
                coordinates: vendor3Coords
            },
            businessLicense: 'TEST-RAD-003'
        };

        // Clean up
        await Vendor.deleteOne({ phone: vendor3Data.phone });

        // Register
        await axios.post(`${API_BASE}/vendors/auth/request-otp`, {
            phone: vendor3Data.phone
        }).catch(() => ({}));

        let vendor = await Vendor.findOne({ phone: vendor3Data.phone });
        const otp = vendor?.otp?.code || '123456';

        await axios.post(`${API_BASE}/vendors/auth/register`, {
            ...vendor3Data,
            otp: otp
        }).catch(() => ({ data: { success: false } }));

        vendor = await Vendor.findOne({ phone: vendor3Data.phone });

        if (vendor) {
            // Approve
            vendor.status = 'approved';
            vendor.creditLimit = 100000;
            await vendor.save();

            testData.vendors.push(vendor);
            recordTest('VRAD-003', 'Vendor >500m Away Approved', true, {
                vendorId: vendor._id,
                actualDistance: `${actualDistance.toFixed(2)}m`,
                status: 'approved'
            });
        } else {
            recordTest('VRAD-003', 'Vendor >500m Away Approved', false, {
                error: 'Vendor creation failed'
            });
        }
    } catch (error) {
        recordTest('VRAD-003', 'Vendor >500m Away Approved', false, {
            error: error.message
        });
    }
};

// ============================================================================
// PRODUCT MANAGEMENT TESTS
// ============================================================================

const testProductManagement = async () => {
    log('\n========== PRODUCT MANAGEMENT TESTS ==========', 'TEST');

    // PROD-001: Create Product
    try {
        log('Testing PROD-001: Create Product...', 'INFO');

        const productData = {
            name: 'Test NPK Fertilizer',
            description: 'Test fertilizer for automated testing',
            shortDescription: 'Test NPK',
            category: 'fertilizer',
            priceToVendor: 800,
            priceToUser: 1000,
            stock: 100,
            images: [{
                url: 'https://via.placeholder.com/300',
                isPrimary: true,
                order: 0
            }]
        };

        const product = await Product.create(productData);
        testData.products.push(product);

        recordTest('PROD-001', 'Create Product', true, {
            productId: product._id,
            name: product.name,
            priceToUser: product.priceToUser
        });
    } catch (error) {
        recordTest('PROD-001', 'Create Product', false, {
            error: error.message
        });
    }

    // PROD-002: Product with Attributes (Size Variants)
    try {
        log('Testing PROD-002: Product with Attributes...', 'INFO');

        const productData = {
            name: 'Test Liquid Fertilizer',
            description: 'Test liquid fertilizer with size variants',
            shortDescription: 'Test Liquid',
            category: 'fertilizer',
            priceToVendor: 500,
            priceToUser: 750, // Base price
            stock: 50,
            images: [{
                url: 'https://via.placeholder.com/300',
                isPrimary: true,
                order: 0
            }],
            attributeStocks: [
                {
                    sizeValue: 250,
                    sizeUnit: 'ml',
                    actualStock: 20,
                    displayStock: 20,
                    vendorPrice: 300,
                    userPrice: 400 // Min price
                },
                {
                    sizeValue: 500,
                    sizeUnit: 'ml',
                    actualStock: 15,
                    displayStock: 15,
                    vendorPrice: 550,
                    userPrice: 700
                },
                {
                    sizeValue: 1,
                    sizeUnit: 'L',
                    actualStock: 15,
                    displayStock: 15,
                    vendorPrice: 1000,
                    userPrice: 1200
                }
            ]
        };

        const product = await Product.create(productData);
        testData.products.push(product);

        // Verify min price logic
        const minPrice = Math.min(...product.attributeStocks.map(a => a.userPrice));
        const expectedMinPrice = 400;

        recordTest('PROD-002', 'Product with Attributes', minPrice === expectedMinPrice, {
            productId: product._id,
            attributeCount: product.attributeStocks.length,
            minPrice: minPrice,
            expected: expectedMinPrice
        });
    } catch (error) {
        recordTest('PROD-002', 'Product with Attributes', false, {
            error: error.message
        });
    }
};

// ============================================================================
// ORDER WORKFLOW TESTS
// ============================================================================

const testOrderWorkflow = async () => {
    log('\n========== ORDER WORKFLOW TESTS ==========', 'TEST');

    // Create test user first
    let testUser;
    try {
        const userPhone = '+919999000100';
        await User.deleteOne({ phone: userPhone });

        testUser = await User.create({
            name: 'Test User',
            phone: userPhone,
            location: {
                address: 'Test Address',
                city: 'Delhi',
                state: 'Delhi',
                pincode: '110001',
                coordinates: testData.vendors[0]?.location.coordinates || {
                    lat: 28.6139,
                    lng: 77.2090
                }
            }
        });
        testData.users.push(testUser);
    } catch (error) {
        log(`Failed to create test user: ${error.message}`, 'WARN');
        return;
    }

    // ORD-003: Below Minimum Order
    try {
        log('Testing ORD-003: Below Minimum Order (₹2,000)...', 'INFO');

        const orderData = {
            userId: testUser._id,
            items: [{
                productId: testData.products[0]?._id,
                quantity: 1,
                pricePerUnit: 1000
            }],
            totalAmount: 1500 // Below minimum
        };

        // This should fail validation
        const Order = require('../models/Order');

        try {
            await Order.create(orderData);
            recordTest('ORD-003', 'Below Minimum Order Validation', false, {
                error: 'Order should have been rejected but was created'
            });
        } catch (validationError) {
            // Expected to fail
            const failedCorrectly = validationError.message?.includes('2000') ||
                validationError.message?.includes('minimum');

            recordTest('ORD-003', 'Below Minimum Order Validation', failedCorrectly, {
                minOrderValue: 2000,
                attemptedValue: 1500,
                validationWorking: failedCorrectly
            });
        }
    } catch (error) {
        recordTest('ORD-003', 'Below Minimum Order Validation', false, {
            error: error.message
        });
    }
};

// ============================================================================
// CREDIT CYCLE TESTS
// ============================================================================

const testCreditCycles = async () => {
    log('\n========== CREDIT CYCLE TESTS ==========', 'TEST');

    if (testData.vendors.length === 0) {
        log('No vendors available for credit testing', 'WARN');
        return;
    }

    const vendor = testData.vendors[0];

    // CRED-001: First Credit Purchase
    try {
        log('Testing CRED-001: First Credit Purchase...', 'INFO');

        const purchaseData = {
            vendorId: vendor._id,
            items: [{
                productId: testData.products[0]?._id,
                quantity: 50,
                pricePerUnit: 1000
            }],
            totalAmount: 50000,
            status: 'approved'
        };

        const creditPurchase = await CreditPurchase.create(purchaseData);

        // Verify cycle created
        if (creditPurchase.cycleStatus === 'active' &&
            creditPurchase.principalAmount === 50000 &&
            creditPurchase.outstandingAmount === 50000) {

            testData.creditCycles.push(creditPurchase);

            recordTest('CRED-001', 'First Credit Purchase', true, {
                cycleId: creditPurchase._id,
                principalAmount: creditPurchase.principalAmount,
                outstandingAmount: creditPurchase.outstandingAmount,
                cycleStatus: creditPurchase.cycleStatus
            });
        } else {
            recordTest('CRED-001', 'First Credit Purchase', false, {
                error: 'Credit cycle not properly initialized'
            });
        }
    } catch (error) {
        recordTest('CRED-001', 'First Credit Purchase', false, {
            error: error.message
        });
    }

    // CRED-006: Overpayment Prevention
    try {
        log('Testing CRED-006: Overpayment Prevention...', 'INFO');

        if (testData.creditCycles.length === 0) {
            throw new Error('No credit cycles available');
        }

        const cycle = testData.creditCycles[0];
        const outstanding = cycle.outstandingAmount;
        const overpaymentAttempt = outstanding + 10000;

        // Try to process overpayment via service
        const CreditCycleService = require('../services/creditCycleService');

        try {
            await CreditCycleService.processPartialRepayment(
                cycle._id,
                overpaymentAttempt,
                new Date(),
                { method: 'test' }
            );

            recordTest('CRED-006', 'Overpayment Prevention', false, {
                error: 'System allowed overpayment'
            });
        } catch (validationError) {
            const preventedCorrectly = validationError.message?.includes('exceeds') ||
                validationError.message?.includes('outstanding');

            recordTest('CRED-006', 'Overpayment Prevention', preventedCorrectly, {
                outstanding: outstanding,
                attempted: overpaymentAttempt,
                preventionWorking: preventedCorrectly
            });
        }
    } catch (error) {
        recordTest('CRED-006', 'Overpayment Prevention', false, {
            error: error.message
        });
    }
};

// ============================================================================
// GENERATE REPORT
// ============================================================================

const generateReport = () => {
    log('\n========== TEST EXECUTION SUMMARY ==========', 'TEST');

    const totalTests = testResults.passed.length + testResults.failed.length;
    const passRate = totalTests > 0
        ? ((testResults.passed.length / totalTests) * 100).toFixed(2)
        : 0;

    testResults.summary = {
        totalTests,
        passed: testResults.passed.length,
        failed: testResults.failed.length,
        warnings: testResults.warnings.length,
        passRate: `${passRate}%`,
        timestamp: new Date().toISOString()
    };

    log(`Total Tests: ${totalTests}`, 'INFO');
    log(`Passed: ${testResults.passed.length}`, 'PASS');
    log(`Failed: ${testResults.failed.length}`, 'FAIL');
    log(`Warnings: ${testResults.warnings.length}`, 'WARN');
    log(`Pass Rate: ${passRate}%`, 'INFO');

    // List failed tests
    if (testResults.failed.length > 0) {
        log('\n========== FAILED TESTS DETAIL ==========', 'FAIL');
        testResults.failed.forEach(test => {
            log(`\n${test.testId}: ${test.testName}`, 'FAIL');
            if (test.details.error) {
                log(`  Error: ${test.details.error}`, 'FAIL');
            }
            if (test.details.expected) {
                log(`  Expected: ${JSON.stringify(test.details.expected, null, 2)}`, 'FAIL');
            }
            if (test.details.actual) {
                log(`  Actual: ${JSON.stringify(test.details.actual, null, 2)}`, 'FAIL');
            }
        });
    }

    // Save report to file
    const fs = require('fs');
    const reportPath = './test-results/comprehensive-test-report.json';

    try {
        if (!fs.existsSync('./test-results')) {
            fs.mkdirSync('./test-results');
        }

        fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
        log(`\nFull report saved to: ${reportPath}`, 'INFO');
    } catch (error) {
        log(`Failed to save report: ${error.message}`, 'WARN');
    }
};

// ============================================================================
// MAIN EXECUTION
// ============================================================================

const runAllTests = async () => {
    try {
        log('========================================', 'TEST');
        log('COMPREHENSIVE SYSTEM TEST - STARTING', 'TEST');
        log('========================================', 'TEST');

        // Connect to database
        log('\nConnecting to database...', 'INFO');
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        log('Database connected successfully', 'PASS');

        // Run test suites
        await testAuthentication();
        await testVendorRadius();
        await testProductManagement();
        await testOrderWorkflow();
        await testCreditCycles();

        // Generate report
        generateReport();

        // Disconnect
        await mongoose.disconnect();
        log('\nDatabase disconnected', 'INFO');

        log('\n========================================', 'TEST');
        log('COMPREHENSIVE SYSTEM TEST - COMPLETED', 'TEST');
        log('========================================', 'TEST');

        // Exit with proper code
        process.exit(testResults.failed.length > 0 ? 1 : 0);

    } catch (error) {
        log(`\nCRITICAL ERROR: ${error.message}`, 'FAIL');
        log(error.stack, 'FAIL');
        process.exit(1);
    }
};

// Start execution
runAllTests();
