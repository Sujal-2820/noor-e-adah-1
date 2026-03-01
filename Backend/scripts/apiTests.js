/**
 * API ENDPOINT TESTS - Step 3
 * Tests live API endpoints on running dev server
 */

const axios = require('axios');
const mongoose = require('mongoose');
require('dotenv').config();

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const API_BASE = `${BASE_URL}/api`;

const testResults = {
    tests: [],
    summary: {},
    tokens: {}
};

const log = (message, type = 'INFO') => {
    const colors = {
        'INFO': '\x1b[36m', 'PASS': '\x1b[32m', 'FAIL': '\x1b[31m',
        'WARN': '\x1b[33m', 'TEST': '\x1b[35m'
    };
    const color = colors[type] || '\x1b[0m';
    console.log(`${color}[${type}] ${message}\x1b[0m`);
};

const recordTest = (id, name, passed, details = {}) => {
    testResults.tests.push({ id, name, passed, details });
    log(`${passed ? '✓' : '✗'} ${id}: ${name}`, passed ? 'PASS' : 'FAIL');
    if (!passed && details.error) log(`  Error: ${details.error}`, 'FAIL');
    return passed;
};

const runApiTests = async () => {
    try {
        log('========================================', 'TEST');
        log('API ENDPOINT TESTS - STARTING', 'TEST');
        log(`Testing server at: ${BASE_URL}`, 'INFO');
        log('========================================', 'TEST');

        // Connect to DB for data setup
        await mongoose.connect(process.env.MONGO_URI);

        const Admin = require('../models/Admin');
        const Vendor = require('../models/Vendor');
        const User = require('../models/User');
        const Product = require('../models/Product');

        // =========================================================================
        // TEST SUITE 1: ADMIN API
        // =========================================================================
        log('\n========== ADMIN API TESTS ==========', 'TEST');

        // Ensure test admin exists
        let testAdmin = await Admin.findOne({ email: 'test@admin.com' });
        if (!testAdmin) {
            testAdmin = await Admin.create({
                email: 'test@admin.com',
                password: 'Test@123',
                name: 'Test Admin',
                role: 'super_admin'
            });
        }

        // API-001: Admin Login (Step 1)
        try {
            const response = await axios.post(`${API_BASE}/admin/auth/login`, {
                email: 'test@admin.com',
                password: 'Test@123'
            });

            recordTest('API-001', 'Admin Login (Step 1)', response.data.success, {
                status: response.status,
                message: response.data.message
            });
        } catch (error) {
            recordTest('API-001', 'Admin Login (Step 1)', false, {
                error: error.response?.data?.message || error.message
            });
        }

        // API-002: Admin OTP Request (Step 2)
        try {
            const response = await axios.post(`${API_BASE}/admin/auth/request-otp`, {
                email: 'test@admin.com'
            });

            recordTest('API-002', 'Admin OTP Request', response.data.success, {
                status: response.status
            });
        } catch (error) {
            recordTest('API-002', 'Admin OTP Request', false, {
                error: error.response?.data?.message || error.message
            });
        }

        // API-003: Admin OTP Verify & Get Token
        try {
            // Get OTP from database
            const admin = await Admin.findOne({ email: 'test@admin.com' });
            const otp = admin.otp?.code;

            if (!otp) {
                throw new Error('OTP not generated');
            }

            const response = await axios.post(`${API_BASE}/admin/auth/verify-otp`, {
                email: 'test@admin.com',
                otp: otp
            });

            if (response.data.success && response.data.data?.token) {
                testResults.tokens.admin = response.data.data.token;
                recordTest('API-003', 'Admin OTP Verify & Token Received', true, {
                    status: response.status,
                    tokenReceived: true
                });
            } else {
                recordTest('API-003', 'Admin OTP Verify', false, {
                    error: 'No token received'
                });
            }
        } catch (error) {
            recordTest('API-003', 'Admin OTP Verify', false, {
                error: error.response?.data?.message || error.message
            });
        }

        // API-004: Admin Dashboard (Authenticated)
        if (testResults.tokens.admin) {
            try {
                const response = await axios.get(`${API_BASE}/admin/dashboard`, {
                    headers: { Authorization: `Bearer ${testResults.tokens.admin}` }
                });

                recordTest('API-004', 'Admin Dashboard (Authenticated)', response.data.success, {
                    status: response.status,
                    hasData: !!response.data.data
                });
            } catch (error) {
                recordTest('API-004', 'Admin Dashboard', false, {
                    error: error.response?.data?.message || error.message
                });
            }
        }

        // =========================================================================
        // TEST SUITE 2: USER API
        // =========================================================================
        log('\n========== USER API TESTS ==========', 'TEST');

        // Ensure test user exists
        let testUser = await User.findOne({ phone: '+919999888801' });
        if (!testUser) {
            testUser = await User.create({
                phone: '+919999888801',
                name: 'API Test User',
                location: {
                    address: 'API Test Address',
                    city: 'Delhi',
                    state: 'Delhi',
                    pincode: '110001',
                    coordinates: { lat: 28.6139, lng: 77.2090 }
                }
            });
        }

        // API-005: User OTP Request
        try {
            const response = await axios.post(`${API_BASE}/users/auth/request-otp`, {
                phone: '+919999888801'
            });

            recordTest('API-005', 'User OTP Request', response.data.success, {
                status: response.status
            });
        } catch (error) {
            recordTest('API-005', 'User OTP Request', false, {
                error: error.response?.data?.message || error.message
            });
        }

        // API-006: User OTP Verify
        try {
            // Get OTP from database
            const user = await User.findOne({ phone: '+919999888801' });
            const otp = user.otp?.code;

            if (!otp) {
                throw new Error('OTP not generated');
            }

            const response = await axios.post(`${API_BASE}/users/auth/verify-otp`, {
                phone: '+919999888801',
                otp: otp
            });

            if (response.data.success && response.data.data?.token) {
                testResults.tokens.user = response.data.data.token;
                recordTest('API-006', 'User OTP Verify & Token Received', true, {
                    status: response.status,
                    tokenReceived: true
                });
            } else {
                recordTest('API-006', 'User OTP Verify', false, {
                    error: 'No token received'
                });
            }
        } catch (error) {
            recordTest('API-006', 'User OTP Verify', false, {
                error: error.response?.data?.message || error.message
            });
        }

        // API-007: User Get Products
        try {
            const response = await axios.get(`${API_BASE}/users/products`, {
                headers: testResults.tokens.user ? { Authorization: `Bearer ${testResults.tokens.user}` } : {}
            });

            recordTest('API-007', 'User Get Products', response.data.success, {
                status: response.status,
                productCount: response.data.data?.products?.length || 0
            });
        } catch (error) {
            recordTest('API-007', 'User Get Products', false, {
                error: error.response?.data?.message || error.message
            });
        }

        // API-008: User Get Categories
        try {
            const response = await axios.get(`${API_BASE}/users/categories`);

            recordTest('API-008', 'User Get Categories', response.data.success, {
                status: response.status,
                categoryCount: response.data.data?.categories?.length || 0
            });
        } catch (error) {
            recordTest('API-008', 'User Get Categories', false, {
                error: error.response?.data?.message || error.message
            });
        }

        // API-009: User Get Assigned Vendor
        if (testResults.tokens.user) {
            try {
                const response = await axios.get(`${API_BASE}/users/vendors/assigned`, {
                    headers: { Authorization: `Bearer ${testResults.tokens.user}` }
                });

                recordTest('API-009', 'User Get Assigned Vendor (500m radius)', response.data.success, {
                    status: response.status,
                    vendorAssigned: !!response.data.data?.vendor,
                    vendorName: response.data.data?.vendor?.name || 'None'
                });
            } catch (error) {
                recordTest('API-009', 'User Get Assigned Vendor', false, {
                    error: error.response?.data?.message || error.message
                });
            }
        }

        // =========================================================================
        // TEST SUITE 3: VENDOR API
        // =========================================================================
        log('\n========== VENDOR API TESTS ==========', 'TEST');

        // Ensure test vendor exists
        let testVendor = await Vendor.findOne({ phone: '+919999888802' });
        if (!testVendor) {
            testVendor = await Vendor.create({
                phone: '+919999888802',
                name: 'API Test Vendor',
                shopName: 'API Test Shop',
                location: {
                    address: 'API Test Vendor Address',
                    city: 'Delhi',
                    state: 'Delhi',
                    pincode: '110001',
                    coordinates: { lat: 28.6200, lng: 77.2100 }
                },
                businessLicense: 'APITEST001',
                status: 'approved',
                creditLimit: 100000
            });
        }

        // API-010: Vendor OTP Request
        try {
            const response = await axios.post(`${API_BASE}/vendors/auth/request-otp`, {
                phone: '+919999888802'
            });

            recordTest('API-010', 'Vendor OTP Request', response.data.success, {
                status: response.status
            });
        } catch (error) {
            recordTest('API-010', 'Vendor OTP Request', false, {
                error: error.response?.data?.message || error.message
            });
        }

        // API-011: Vendor OTP Verify
        try {
            const vendor = await Vendor.findOne({ phone: '+919999888802' });
            const otp = vendor.otp?.code;

            if (!otp) {
                throw new Error('OTP not generated');
            }

            const response = await axios.post(`${API_BASE}/vendors/auth/verify-otp`, {
                phone: '+919999888802',
                otp: otp
            });

            if (response.data.success && response.data.data?.token) {
                testResults.tokens.vendor = response.data.data.token;
                recordTest('API-011', 'Vendor OTP Verify & Token Received', true, {
                    status: response.status,
                    tokenReceived: true
                });
            } else {
                recordTest('API-011', 'Vendor OTP Verify', false, {
                    error: 'No token received'
                });
            }
        } catch (error) {
            recordTest('API-011', 'Vendor OTP Verify', false, {
                error: error.response?.data?.message || error.message
            });
        }

        // API-012: Vendor Dashboard
        if (testResults.tokens.vendor) {
            try {
                const response = await axios.get(`${API_BASE}/vendors/dashboard`, {
                    headers: { Authorization: `Bearer ${testResults.tokens.vendor}` }
                });

                recordTest('API-012', 'Vendor Dashboard (Authenticated)', response.data.success, {
                    status: response.status,
                    hasData: !!response.data.data
                });
            } catch (error) {
                recordTest('API-012', 'Vendor Dashboard', false, {
                    error: error.response?.data?.message || error.message
                });
            }
        }

        // API-013: Vendor Credit Summary
        if (testResults.tokens.vendor) {
            try {
                const response = await axios.get(`${API_BASE}/vendors/credit/summary`, {
                    headers: { Authorization: `Bearer ${testResults.tokens.vendor}` }
                });

                recordTest('API-013', 'Vendor Credit Summary', response.data.success, {
                    status: response.status,
                    creditLimit: response.data.data?.vendor?.creditLimit,
                    availableCredit: response.data.data?.vendor?.availableCredit
                });
            } catch (error) {
                recordTest('API-013', 'Vendor Credit Summary', false, {
                    error: error.response?.data?.message || error.message
                });
            }
        }

        // =========================================================================
        // GENERATE REPORT
        // =========================================================================
        log('\n========================================', 'TEST');
        log('API TEST SUMMARY', 'TEST');
        log('========================================', 'TEST');

        const passed = testResults.tests.filter(t => t.passed).length;
        const failed = testResults.tests.filter(t => !t.passed).length;
        const total = testResults.tests.length;
        const passRate = ((passed / total) * 100).toFixed(2);

        testResults.summary = {
            total,
            passed,
            failed,
            passRate: `${passRate}%`,
            timestamp: new Date().toISOString(),
            serverUrl: BASE_URL
        };

        log(`\nTotal API Tests: ${total}`, 'INFO');
        log(`Passed: ${passed}`, 'PASS');
        log(`Failed: ${failed}`, failed > 0 ? 'FAIL' : 'INFO');
        log(`Pass Rate: ${passRate}%`, parseFloat(passRate) >= 90 ? 'PASS' : 'WARN');

        // List failures
        if (failed > 0) {
            log('\n========== FAILURES ==========', 'FAIL');
            testResults.tests.filter(t => !t.passed).forEach(test => {
                log(`\n${test.id}: ${test.name}`, 'FAIL');
                if (test.details.error) log(`  Error: ${test.details.error}`, 'FAIL');
            });
        }

        // Save Report
        const fs = require('fs');
        const reportPath = './test-results/api-test-report.json';

        if (!fs.existsSync('./test-results')) {
            fs.mkdirSync('./test-results');
        }

        fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
        log(`\nReport saved: ${reportPath}`, 'INFO');

        await mongoose.disconnect();
        log('Database disconnected', 'INFO');

        log('\n========================================', 'TEST');
        log('API TESTS - COMPLETED', 'TEST');
        log('========================================', 'TEST');

        process.exit(failed > 0 ? 1 : 0);

    } catch (error) {
        log(`\nCRITICAL ERROR: ${error.message}`, 'FAIL');
        console.error(error.stack);
        process.exit(1);
    }
};

// Run
runApiTests();
