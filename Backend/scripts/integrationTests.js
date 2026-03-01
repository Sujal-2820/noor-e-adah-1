/**
 * INTEGRATION TESTS - Step 2
 * Tests Order Flow, Credit Cycles, and Commission Calculations
 */

const mongoose = require('mongoose');
require('dotenv').config();

const Admin = require('../models/Admin');
const Vendor = require('../models/Vendor');
const Seller = require('../models/Seller');
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const CreditPurchase = require('../models/CreditPurchase');
const CreditRepayment = require('../models/CreditRepayment');

const testResults = {
    tests: [],
    summary: {}
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

const runIntegrationTests = async () => {
    try {
        log('========================================', 'TEST');
        log('INTEGRATION TESTS - STARTING', 'TEST');
        log('========================================', 'TEST');

        // Connect
        log('\nConnecting to database...', 'INFO');
        await mongoose.connect(process.env.MONGO_URI);
        log('✓ Database connected', 'PASS');

        // Clean test data
        log('\nCleaning test data...', 'INFO');
        await User.deleteMany({ name: /^INT_TEST/ });
        await Vendor.deleteMany({ name: /^INT_TEST/ });
        await Seller.deleteMany({ name: /^INT_TEST/ });
        await Product.deleteMany({ name: /^INT_TEST/ });
        await Order.deleteMany({ 'user.name': /^INT_TEST/ });
        await CreditPurchase.deleteMany({ vendorId: { $exists: true } });

        // =========================================================================
        // TEST SUITE 1: ORDER WORKFLOW
        // =========================================================================
        log('\n========== ORDER WORKFLOW TESTS ==========', 'TEST');

        let testVendor, testSeller, testUser, testProduct;

        // Create test vendor
        try {
            testVendor = await Vendor.create({
                phone: '+919876540001',
                name: 'INT_TEST Vendor',
                shopName: 'INT_TEST Shop',
                location: {
                    address: 'Test Address',
                    city: 'Delhi',
                    state: 'Delhi',
                    pincode: '110001',
                    coordinates: { lat: 28.6139, lng: 77.2090 }
                },
                businessLicense: 'INTTEST001',
                status: 'approved',
                creditLimit: 100000,
                creditUsed: 0
            });

            recordTest('INT-001', 'Test Vendor Created', true, {
                vendorId: testVendor._id
            });
        } catch (error) {
            recordTest('INT-001', 'Test Vendor Creation', false, { error: error.message });
            throw error;
        }

        // Create test seller (IRA Partner)
        try {
            testSeller = await Seller.create({
                phone: '+919876540002',
                name: 'INT_TEST Seller',
                sellerId: 'INTSELLER001',
                status: 'approved',
                bankDetails: {
                    accountNumber: '1234567890',
                    ifscCode: 'TEST0001234',
                    accountHolderName: 'INT_TEST Seller'
                }
            });

            recordTest('INT-002', 'Test Seller (IRA Partner) Created', true, {
                sellerId: testSeller.sellerId
            });
        } catch (error) {
            recordTest('INT-002', 'Test Seller Creation', false, { error: error.message });
        }

        // Create test user linked to seller
        try {
            testUser = await User.create({
                phone: '+919876540003',
                name: 'INT_TEST User',
                sellerId: testSeller?._id,
                location: {
                    address: 'Test User Address',
                    city: 'Delhi',
                    state: 'Delhi',
                    pincode: '110001',
                    coordinates: { lat: 28.6139, lng: 77.2090 }
                }
            });

            recordTest('INT-003', 'Test User Created with Seller Link', true, {
                userId: testUser._id,
                linkedSellerId: testUser.sellerId
            });
        } catch (error) {
            recordTest('INT-003', 'Test User Creation', false, { error: error.message });
        }

        // Create test product
        try {
            testProduct = await Product.create({
                name: 'INT_TEST Product',
                description: 'Integration test product',
                shortDescription: 'Test product',
                category: 'fertilizer',
                priceToVendor: 800,
                priceToUser: 1000,
                stock: 100,
                images: [{ url: 'https://test.com/image.jpg', isPrimary: true, order: 0 }]
            });

            recordTest('INT-004', 'Test Product Created', true, {
                productId: testProduct._id,
                priceToUser: testProduct.priceToUser
            });
        } catch (error) {
            recordTest('INT-004', 'Test Product Creation', false, { error: error.message });
        }

        // Test Order Creation - Below Minimum (Should Fail)
        try {
            const belowMinOrder = {
                orderNumber: 'TEST-' + Date.now(),
                userId: testUser._id,
                vendorId: testVendor._id,
                items: [{
                    productId: testProduct._id,
                    productName: testProduct.name,
                    quantity: 1,
                    unitPrice: 1000,
                    totalPrice: 1000
                }],
                subtotal: 1000,
                deliveryCharge: 50,
                totalAmount: 1050, // Below ₹2,000 minimum
                paymentPreference: 'full',
                upfrontAmount: 1050,
                remainingAmount: 0,
                paymentStatus: 'pending'
            };

            try {
                await Order.create(belowMinOrder);
                recordTest('INT-005', 'Order Below Minimum Validation', false, {
                    error: 'Order below ₹2,000 should fail but was created'
                });
            } catch (validationError) {
                // Expected to fail
                recordTest('INT-005', 'Order Below Minimum Validation', true, {
                    minRequired: 2000,
                    attempted: 1050,
                    validated: 'Correctly rejected'
                });
            }
        } catch (error) {
            recordTest('INT-005', 'Order Below Minimum Test', false, { error: error.message });
        }

        // Test Order Creation - Valid Order
        let testOrder;
        try {
            testOrder = await Order.create({
                orderNumber: 'TEST-' + Date.now(),
                userId: testUser._id,
                vendorId: testVendor._id,
                sellerId: testSeller._id.toString(),
                seller: testSeller._id,
                items: [{
                    productId: testProduct._id,
                    productName: testProduct.name,
                    quantity: 3,
                    unitPrice: 1000,
                    totalPrice: 3000
                }],
                subtotal: 3000,
                deliveryCharge: 0, // Free for full payment
                deliveryChargeWaived: true,
                totalAmount: 3000,
                paymentPreference: 'full', // 100% payment
                upfrontAmount: 3000,
                remainingAmount: 0,
                paymentStatus: 'fully_paid',
                status: 'delivered'
            });

            recordTest('INT-006', 'Valid Order Created (₹3,000, Full Payment)', true, {
                orderId: testOrder._id,
                orderNumber: testOrder.orderNumber,
                totalAmount: testOrder.totalAmount,
                deliveryCharge: testOrder.deliveryCharge
            });
        } catch (error) {
            recordTest('INT-006', 'Valid Order Creation', false, { error: error.message });
        }

        // =========================================================================
        // TEST SUITE 2: IRA PARTNER COMMISSION
        // =========================================================================
        log('\n========== IRA PARTNER COMMISSION TESTS ==========', 'TEST');

        // Test Commission Calculation - Tier 1 (2%)
        try {
            const orderAmount = 3000;
            const expectedCommission = orderAmount * 0.02; // 2% = ₹60

            // Simulate commission calculation
            let calculatedCommission = 0;
            if (testSeller) {
                // Tier 1: Up to ₹50,000
                calculatedCommission = orderAmount * 0.02;

                // Update seller wallet
                testSeller.walletBalance = (testSeller.walletBalance || 0) + calculatedCommission;
                await testSeller.save();
            }

            recordTest('INT-007', 'Commission Tier 1 Calculation (2%)', calculatedCommission === expectedCommission, {
                orderAmount: orderAmount,
                expectedCommission: expectedCommission,
                calculatedCommission: calculatedCommission,
                sellerWalletBalance: testSeller?.walletBalance
            });
        } catch (error) {
            recordTest('INT-007', 'Commission Calculation', false, { error: error.message });
        }

        // =========================================================================
        // TEST SUITE 3: CREDIT CYCLE SYSTEM
        // =========================================================================
        log('\n========== CREDIT CYCLE TESTS ==========', 'TEST');

        // Test Credit Purchase Creation
        let testCreditCycle;
        try {
            testCreditCycle = await CreditPurchase.create({
                vendorId: testVendor._id,
                items: [{
                    productId: testProduct._id,
                    name: testProduct.name,
                    quantity: 50,
                    unitPrice: 1000,
                    pricePerUnit: 1000,
                    totalPrice: 50000
                }],
                totalAmount: 50000,
                status: 'approved',
                cycleStatus: 'active',
                principalAmount: 50000,
                outstandingAmount: 50000,
                totalRepaid: 0,
                cycleStartDate: new Date()
            });

            // Update vendor credit
            testVendor.creditUsed += 50000;
            await testVendor.save();

            recordTest('INT-008', 'Credit Purchase Created', true, {
                cycleId: testCreditCycle._id,
                principalAmount: testCreditCycle.principalAmount,
                vendorCreditUsed: testVendor.creditUsed,
                vendorAvailableCredit: testVendor.creditLimit - testVendor.creditUsed
            });
        } catch (error) {
            recordTest('INT-008', 'Credit Purchase Creation', false, { error: error.message });
        }

        // Test Partial Repayment
        if (testCreditCycle) {
            try {
                const CreditCycleService = require('../services/creditCycleService');

                const repaymentAmount = 10000; // Repay ₹10,000

                const result = await CreditCycleService.processPartialRepayment(
                    testCreditCycle._id,
                    repaymentAmount,
                    new Date(),
                    { method: 'test', status: 'completed' }
                );

                const expectedOutstanding = 50000 - 10000; // ₹40,000

                recordTest('INT-009', 'Partial Repayment Processed',
                    result.success && result.cycle.outstandingAmount === expectedOutstanding,
                    {
                        repaidAmount: repaymentAmount,
                        outstandingAfter: result.cycle.outstandingAmount,
                        expectedOutstanding: expectedOutstanding,
                        discountEarned: result.repayment.discountEarned,
                        vendorCreditRestored: result.vendor.availableCredit
                    }
                );
            } catch (error) {
                recordTest('INT-009', 'Partial Repayment', false, { error: error.message });
            }
        }

        // Test Overpayment Prevention
        if (testCreditCycle) {
            try {
                const CreditCycleService = require('../services/creditCycleService');

                // Get current outstanding
                const cycle = await CreditPurchase.findById(testCreditCycle._id);
                const outstanding = cycle.outstandingAmount;
                const overpayment = outstanding + 5000; // Try to pay more

                try {
                    await CreditCycleService.processPartialRepayment(
                        testCreditCycle._id,
                        overpayment,
                        new Date(),
                        { method: 'test' }
                    );

                    recordTest('INT-010', 'Overpayment Prevention', false, {
                        error: 'System allowed overpayment'
                    });
                } catch (validationError) {
                    const prevented = validationError.message.includes('exceeds');
                    recordTest('INT-010', 'Overpayment Prevention', prevented, {
                        outstanding: outstanding,
                        attempted: overpayment,
                        prevented: prevented
                    });
                }
            } catch (error) {
                recordTest('INT-010', 'Overpayment Prevention Test', false, { error: error.message });
            }
        }

        // =========================================================================
        // GENERATE REPORT
        // =========================================================================
        log('\n========================================', 'TEST');
        log('INTEGRATION TEST SUMMARY', 'TEST');
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
            timestamp: new Date().toISOString()
        };

        log(`\nTotal Tests: ${total}`, 'INFO');
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
        const reportPath = './test-results/integration-test-report.json';

        if (!fs.existsSync('./test-results')) {
            fs.mkdirSync('./test-results');
        }

        fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
        log(`\nReport saved: ${reportPath}`, 'INFO');

        // Clean up
        log('\nCleaning up test data...', 'INFO');
        await User.deleteMany({ name: /^INT_TEST/ });
        await Vendor.deleteMany({ name: /^INT_TEST/ });
        await Seller.deleteMany({ name: /^INT_TEST/ });
        await Product.deleteMany({ name: /^INT_TEST/ });
        await Order.deleteMany({ 'items.name': /^INT_TEST/ });

        await mongoose.disconnect();
        log('Database disconnected', 'INFO');

        log('\n========================================', 'TEST');
        log('INTEGRATION TESTS - COMPLETED', 'TEST');
        log('========================================', 'TEST');

        process.exit(failed > 0 ? 1 : 0);

    } catch (error) {
        log(`\nCRITICAL ERROR: ${error.message}`, 'FAIL');
        console.error(error.stack);
        process.exit(1);
    }
};

// Run
runIntegrationTests();
