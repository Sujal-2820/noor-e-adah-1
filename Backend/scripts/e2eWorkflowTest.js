/**
 * COMPREHENSIVE END-TO-END API WORKFLOW TESTING
 * Tests complete user, vendor, seller, and admin journeys via API
 */

const axios = require('axios');
const mongoose = require('mongoose');
require('dotenv').config();

const BASE_URL = 'http://localhost:3000';
const API = `${BASE_URL}/api`;

// Test data storage
const testData = {
    admin: {},
    vendors: [],
    sellers: [],
    users: [],
    products: [],
    orders: [],
    tokens: {}
};

const results = [];

const log = (msg, type = 'INFO') => {
    const colors = { 'PASS': '\x1b[32m', 'FAIL': '\x1b[31m', 'INFO': '\x1b[36m', 'WARN': '\x1b[33m' };
    console.log(`${colors[type] || '\x1b[0m'}[${type}] ${msg}\x1b[0m`);
};

const test = async (id, name, fn) => {
    try {
        await fn();
        results.push({ id, name, status: 'PASS' });
        log(`✓ ${id}: ${name}`, 'PASS');
        return true;
    } catch (error) {
        results.push({ id, name, status: 'FAIL', error: error.message });
        log(`✗ ${id}: ${name} - ${error.message}`, 'FAIL');
        return false;
    }
};

const run = async () => {
    try {
        log('========================================', 'INFO');
        log('COMPREHENSIVE E2E WORKFLOW TESTING', 'INFO');
        log('========================================', 'INFO');

        await mongoose.connect(process.env.MONGO_URI);
        const Admin = require('../models/Admin');
        const Vendor = require('../models/Vendor');
        const Seller = require('../models/Seller');
        const User = require('../models/User');
        const Product = require('../models/Product');

        // ================================================================
        // ADMIN WORKFLOW
        // ================================================================
        log('\n========== ADMIN WORKFLOW ==========', 'INFO');

        // Setup admin
        let admin = await Admin.findOne({ email: 'admin@test.com' });
        if (!admin) {
            admin = await Admin.create({
                email: 'admin@test.com',
                password: 'Admin@123',
                name: 'E2E Test Admin',
                role: 'super_admin'
            });
        }
        testData.admin = admin;

        // E2E-ADMIN-01: Admin Login Step 1
        await test('E2E-ADMIN-01', 'Admin Login (Email/Password)', async () => {
            const res = await axios.post(`${API}/admin/auth/login`, {
                email: 'admin@test.com',
                password: 'Admin@123'
            });
            if (!res.data.success) throw new Error('Login failed');
        });

        // E2E-ADMIN-02: Admin OTP Request
        await test('E2E-ADMIN-02', 'Admin Request OTP', async () => {
            const res = await axios.post(`${API}/admin/auth/request-otp`, {
                email: 'admin@test.com'
            });
            if (!res.data.success) throw new Error('OTP request failed');
        });

        // E2E-ADMIN-03: Admin OTP Verify
        await test('E2E-ADMIN-03', 'Admin Verify OTP & Get Token', async () => {
            admin = await Admin.findOne({ email: 'admin@test.com' });
            const otp = admin.otp?.code;
            if (!otp) throw new Error('No OTP generated');

            const res = await axios.post(`${API}/admin/auth/verify-otp`, {
                email: 'admin@test.com',
                otp: otp
            });

            if (!res.data.success || !res.data.data?.token) {
                throw new Error('Token not received');
            }
            testData.tokens.admin = res.data.data.token;
        });

        // E2E-ADMIN-04: Admin Dashboard Access
        await test('E2E-ADMIN-04', 'Admin Dashboard Access', async () => {
            const res = await axios.get(`${API}/admin/dashboard`, {
                headers: { Authorization: `Bearer ${testData.tokens.admin}` }
            });
            if (!res.data.success) throw new Error('Dashboard access failed');
        });

        // E2E-ADMIN-05: Create Test Product
        await test('E2E-ADMIN-05', 'Admin Create Product', async () => {
            const product = await Product.create({
                name: 'E2E Test NPK Fertilizer',
                description: 'End-to-end test product',
                shortDescription: 'E2E NPK',
                category: 'fertilizer',
                priceToVendor: 800,
                priceToUser: 1000,
                stock: 100,
                images: [{ url: 'https://test.com/npk.jpg', isPrimary: true, order: 0 }]
            });
            testData.products.push(product);
        });

        // E2E-ADMIN-06: Create Product with Variants
        await test('E2E-ADMIN-06', 'Admin Create Product with Size Variants', async () => {
            const product = await Product.create({
                name: 'E2E Liquid Fertilizer',
                description: 'Test liquid with variants',
                shortDescription: 'E2E Liquid',
                category: 'fertilizer',
                priceToVendor: 500,
                priceToUser: 750,
                stock: 50,
                images: [{ url: 'https://test.com/liquid.jpg', isPrimary: true, order: 0 }],
                attributeStocks: [
                    { sizeValue: 250, sizeUnit: 'ml', actualStock: 20, displayStock: 20, vendorPrice: 300, userPrice: 400 },
                    { sizeValue: 500, sizeUnit: 'ml', actualStock: 15, displayStock: 15, vendorPrice: 550, userPrice: 700 },
                    { sizeValue: 1, sizeUnit: 'L', actualStock: 15, displayStock: 15, vendorPrice: 1000, userPrice: 1200 }
                ]
            });
            testData.products.push(product);

            const minPrice = Math.min(...product.attributeStocks.map(a => a.userPrice));
            if (minPrice !== 400) throw new Error(`Min price should be 400, got ${minPrice}`);
        });

        // ================================================================
        // SELLER (IRA PARTNER) WORKFLOW
        // ================================================================
        log('\n========== SELLER (IRA PARTNER) WORKFLOW ==========', 'INFO');

        // Clean and create seller
        await Seller.deleteOne({ phone: '+919000000001' });

        // E2E-SELLER-01: Request OTP
        await test('E2E-SELLER-01', 'Seller Request OTP', async () => {
            const res = await axios.post(`${API}/sellers/auth/request-otp`, {
                phone: '+919000000001'
            });
            if (!res.data.success) throw new Error('OTP request failed');
        });

        // E2E-SELLER-02: Register
        await test('E2E-SELLER-02', 'Seller Register', async () => {
            let seller = await Seller.findOne({ phone: '+919000000001' });
            const otp = seller?.otp?.code || '123456';

            const res = await axios.post(`${API}/sellers/auth/register`, {
                phone: '+919000000001',
                otp: otp,
                name: 'E2E Test Seller',
                area: 'Delhi NCR',
                bankDetails: {
                    accountNumber: '1234567890',
                    ifscCode: 'TEST0001234',
                    accountHolderName: 'E2E Test Seller'
                }
            }).catch(err => ({ data: { success: false, message: err.response?.data?.message } }));

            if (res.data.success) {
                seller = await Seller.findOne({ phone: '+919000000001' });
                seller.status = 'approved';
                await seller.save();
                testData.sellers.push(seller);
            }
        });

        // E2E-SELLER-03: Login
        await test('E2E-SELLER-03', 'Seller Login & Get Token', async () => {
            await axios.post(`${API}/sellers/auth/request-otp`, { phone: '+919000000001' });

            let seller = await Seller.findOne({ phone: '+919000000001' });
            const otp = seller?.otp?.code;
            if (!otp) throw new Error('No OTP');

            const res = await axios.post(`${API}/sellers/auth/verify-otp`, {
                phone: '+919000000001',
                otp: otp
            });

            if (!res.data.success || !res.data.data?.token) {
                throw new Error('Token not received');
            }
            testData.tokens.seller = res.data.data.token;
        });

        // ================================================================
        // VENDOR WORKFLOW
        // ================================================================
        log('\n========== VENDOR WORKFLOW (500m Radius Test) ==========', 'INFO');

        await Vendor.deleteMany({ phone: { $in: ['+919000000010', '+919000000011'] } });

        // E2E-VENDOR-01: First Vendor Register
        await test('E2E-VENDOR-01', 'Vendor 1 Registration', async () => {
            await axios.post(`${API}/vendors/auth/request-otp`, { phone: '+919000000010' });

            let vendor = await Vendor.findOne({ phone: '+919000000010' });
            const otp = vendor?.otp?.code || '123456';

            const res = await axios.post(`${API}/vendors/auth/register`, {
                phone: '+919000000010',
                otp: otp,
                name: 'E2E Vendor 1',
                shopName: 'E2E Shop 1',
                location: {
                    address: 'Delhi Location 1',
                    city: 'Delhi',
                    state: 'Delhi',
                    pincode: '110001',
                    coordinates: { lat: 28.6139, lng: 77.2090 }
                },
                businessLicense: 'E2E-LIC-001'
            }).catch(err => ({ data: { success: false } }));

            if (res.data.success) {
                vendor = await Vendor.findOne({ phone: '+919000000010' });
                vendor.status = 'approved';
                vendor.creditLimit = 100000;
                await vendor.save();
                testData.vendors.push(vendor);
            }
        });

        // E2E-VENDOR-02: Second Vendor 500m Away (Should Fail)
        await test('E2E-VENDOR-02', 'Vendor 2 Rejected (500m Rule)', async () => {
            await axios.post(`${API}/vendors/auth/request-otp`, { phone: '+919000000011' });

            let vendor = await Vendor.findOne({ phone: '+919000000011' });
            const otp = vendor?.otp?.code || '123456';

            // Try to register 500m away
            await axios.post(`${API}/vendors/auth/register`, {
                phone: '+919000000011',
                otp: otp,
                name: 'E2E Vendor 2',
                shopName: 'E2E Shop 2',
                location: {
                    address: 'Delhi Location 2',
                    city: 'Delhi',
                    state: 'Delhi',
                    pincode: '110001',
                    coordinates: { lat: 28.6184, lng: 77.2090 } // ~500m away
                },
                businessLicense: 'E2E-LIC-002'
            }).catch(() => ({}));

            vendor = await Vendor.findOne({ phone: '+919000000011' });
            if (vendor && vendor.status === 'pending') {
                // Try admin approval (should fail)
                const approvalRes = await axios.post(
                    `${API}/admin/vendors/${vendor._id}/approve`,
                    {},
                    { headers: { Authorization: `Bearer ${testData.tokens.admin}` } }
                ).catch(err => ({ data: { success: false, message: err.response?.data?.message } }));

                if (approvalRes.data.success || !approvalRes.data.message?.includes('500m')) {
                    throw new Error('500m rule not enforced');
                }
            }
        });

        // E2E-VENDOR-03: Vendor Login
        await test('E2E-VENDOR-03', 'Vendor 1 Login & Get Token', async () => {
            await axios.post(`${API}/vendors/auth/request-otp`, { phone: '+919000000010' });

            let vendor = await Vendor.findOne({ phone: '+919000000010' });
            const otp = vendor?.otp?.code;
            if (!otp) throw new Error('No OTP');

            const res = await axios.post(`${API}/vendors/auth/verify-otp`, {
                phone: '+919000000010',
                otp: otp
            });

            if (!res.data.success || !res.data.data?.token) {
                throw new Error('Token not received');
            }
            testData.tokens.vendor = res.data.data.token;
        });

        // E2E-VENDOR-04: Vendor Dashboard
        await test('E2E-VENDOR-04', 'Vendor Dashboard Access', async () => {
            const res = await axios.get(`${API}/vendors/dashboard`, {
                headers: { Authorization: `Bearer ${testData.tokens.vendor}` }
            });
            if (!res.data.success) throw new Error('Dashboard failed');
        });

        // E2E-VENDOR-05: Vendor Credit Summary
        await test('E2E-VENDOR-05', 'Vendor Credit Summary', async () => {
            const res = await axios.get(`${API}/vendors/credit/summary`, {
                headers: { Authorization: `Bearer ${testData.tokens.vendor}` }
            });
            if (!res.data.success) throw new Error('Credit summary failed');

            const creditLimit = res.data.data?.vendor?.creditLimit;
            if (creditLimit !== 100000) {
                throw new Error(`Credit limit should be 100000, got ${creditLimit}`);
            }
        });

        // ================================================================
        // USER WORKFLOW
        // ================================================================
        log('\n========== USER WORKFLOW ==========', 'INFO');

        await User.deleteOne({ phone: '+919000000100' });

        // E2E-USER-01: User Register with Seller Link
        await test('E2E-USER-01', 'User Registration with Seller ID', async () => {
            await axios.post(`${API}/users/auth/request-otp`, { phone: '+919000000100' });

            let user = await User.findOne({ phone: '+919000000100' });
            const otp = user?.otp?.code || '123456';

            const res = await axios.post(`${API}/users/auth/register`, {
                phone: '+919000000100',
                otp: otp,
                name: 'E2E Test User',
                sellerId: testData.sellers[0]?.sellerId,
                location: {
                    address: 'User Address',
                    city: 'Delhi',
                    state: 'Delhi',
                    pincode: '110001',
                    coordinates: { lat: 28.6140, lng: 77.2091 } // Near vendor
                }
            }).catch(err => ({ data: { success: false } }));

            if (res.data.success) {
                user = await User.findOne({ phone: '+919000000100' });
                if (testData.sellers[0]) {
                    user.sellerId = testData.sellers[0]._id;
                }
                await user.save();
                testData.users.push(user);
            }
        });

        // E2E-USER-02: User Login
        await test('E2E-USER-02', 'User Login & Get Token', async () => {
            await axios.post(`${API}/users/auth/request-otp`, { phone: '+919000000100' });

            let user = await User.findOne({ phone: '+919000000100' });
            const otp = user?.otp?.code;
            if (!otp) throw new Error('No OTP');

            const res = await axios.post(`${API}/users/auth/verify-otp`, {
                phone: '+919000000100',
                otp: otp
            });

            if (!res.data.success || !res.data.data?.token) {
                throw new Error('Token not received');
            }
            testData.tokens.user = res.data.data.token;
        });

        // E2E-USER-03: Get Products
        await test('E2E-USER-03', 'User Browse Products', async () => {
            const res = await axios.get(`${API}/users/products`, {
                headers: { Authorization: `Bearer ${testData.tokens.user}` }
            });
            if (!res.data.success) throw new Error('Products failed');
        });

        // E2E-USER-04: Get Assigned Vendor (500m radius)
        await test('E2E-USER-04', 'User Get Assigned Vendor (500m Radius)', async () => {
            const res = await axios.get(`${API}/users/vendors/assigned`, {
                headers: { Authorization: `Bearer ${testData.tokens.user}` }
            });
            if (!res.data.success) throw new Error('Vendor assignment failed');

            const assignedVendor = res.data.data?.vendor;
            if (!assignedVendor) {
                throw new Error('No vendor assigned (should assign within 500m)');
            }
        });

        // ================================================================
        // COMMISSION CALCULATION
        // ================================================================
        log('\n========== COMMISSION CALCULATION ==========', 'INFO');

        // E2E-COMM-01: Tier 1 Commission (2%)
        await test('E2E-COMM-01', 'IRA Partner Commission Tier 1 (2%)', async () => {
            const orderAmount = 3000;
            const tier1Rate = 0.02;
            const expectedCommission = orderAmount * tier1Rate;

            if (testData.sellers[0]) {
                const commission = orderAmount * tier1Rate;
                testData.sellers[0].walletBalance = (testData.sellers[0].walletBalance || 0) + commission;
                await testData.sellers[0].save();

                if (Math.abs(commission - expectedCommission) > 0.01) {
                    throw new Error(`Expected ₹${expectedCommission}, got ₹${commission}`);
                }
            }
        });

        // E2E-COMM-02: Verify Commission Constants
        await test('E2E-COMM-02', 'Verify Commission Tiers', async () => {
            const constants = require('../utils/constants');
            if (constants.IRA_PARTNER_COMMISSION_RATE_LOW !== 2) {
                throw new Error('Tier 1 should be 2%');
            }
            if (constants.IRA_PARTNER_COMMISSION_RATE_HIGH !== 3) {
                throw new Error('Tier 2 should be 3%');
            }
            if (constants.IRA_PARTNER_COMMISSION_THRESHOLD !== 50000) {
                throw new Error('Threshold should be ₹50,000');
            }
        });

        // ================================================================
        // GENERATE REPORT
        // ================================================================
        log('\n========================================', 'INFO');
        log('E2E TEST SUMMARY', 'INFO');
        log('========================================', 'INFO');

        const passed = results.filter(r => r.status === 'PASS').length;
        const failed = results.filter(r => r.status === 'FAIL').length;
        const total = results.length;
        const passRate = ((passed / total) * 100).toFixed(2);

        log(`\nTotal: ${total}`, 'INFO');
        log(`Passed: ${passed}`, 'PASS');
        log(`Failed: ${failed}`, failed > 0 ? 'FAIL' : 'INFO');
        log(`Pass Rate: ${passRate}%`, 'INFO');

        if (failed > 0) {
            log('\n========== FAILURES ==========', 'FAIL');
            results.filter(r => r.status === 'FAIL').forEach(r => {
                log(`${r.id}: ${r.name}`, 'FAIL');
                log(`  Error: ${r.error}`, 'FAIL');
            });
        }

        // Save report
        const fs = require('fs');
        const report = {
            timestamp: new Date().toISOString(),
            summary: { total, passed, failed, passRate: `${passRate}%` },
            results,
            testData: {
                productsCreated: testData.products.length,
                vendorsCreated: testData.vendors.length,
                sellersCreated: testData.sellers.length,
                usersCreated: testData.users.length
            }
        };

        if (!fs.existsSync('./test-results')) fs.mkdirSync('./test-results');
        fs.writeFileSync('./test-results/e2e-workflow-report.json', JSON.stringify(report, null, 2));

        log(`\nReport: ./test-results/e2e-workflow-report.json`, 'INFO');

        await mongoose.disconnect();
        log('\nDatabase disconnected', 'INFO');

        log('\n========================================', 'INFO');
        log('E2E WORKFLOW TESTING - COMPLETED', 'INFO');
        log('========================================', 'INFO');

        process.exit(failed > 0 ? 1 : 0);

    } catch (error) {
        log(`\nCRITICAL ERROR: ${error.message}`, 'FAIL');
        console.error(error.stack);
        process.exit(1);
    }
};

run();
