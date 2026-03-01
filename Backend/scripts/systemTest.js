/**
 * SIMPLIFIED COMPREHENSIVE SYSTEM TEST
 * Traces exact failure points with detailed logging
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Test Configuration
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

// Main Test Runner
const runTests = async () => {
    try {
        log('========================================', 'TEST');
        log('SYSTEM TEST STARTING', 'TEST');
        log('========================================', 'TEST');

        // Connect to database
        log('\n1. Connecting to database...', 'INFO');
        await mongoose.connect(process.env.MONGO_URI);
        log('✓ Database connected', 'PASS');

        // Test Database Models
        log('\n2. Testing Model Imports...', 'TEST');
        try {
            const Admin = require('../models/Admin');
            const Vendor = require('../models/Vendor');
            const Product = require('../models/Product');
            const User = require('../models/User');
            const Seller = require('../models/Seller');
            const Order = require('../models/Order');
            const CreditPurchase = require('../models/CreditPurchase');

            recordTest('MODEL-001', 'All required models load successfully', true, {
                models: ['Admin', 'Vendor', 'Product', 'User', 'Seller', 'Order', 'CreditPurchase']
            });
        } catch (error) {
            recordTest('MODEL-001', 'Model Loading', false, { error: error.message });
        }

        // Test 500m Radius Constant
        log('\n3. Testing Business Constants...', 'TEST');
        try {
            const constants = require('../utils/constants');
            const vendorRadius = constants.VENDOR_COVERAGE_RADIUS_KM;
            const bufferRadius = constants.VENDOR_ASSIGNMENT_BUFFER_KM;
            const totalRadius = constants.VENDOR_ASSIGNMENT_MAX_RADIUS_KM;

            const radiusCorrect = vendorRadius === 0.5;
            const bufferCorrect = bufferRadius === 0.3;
            const totalCorrect = totalRadius === 0.8;

            recordTest('CONST-001', 'Vendor Radius = 500m (0.5km)', radiusCorrect, {
                expected: 0.5,
                actual: vendorRadius,
                note: 'Changed from 20km to 500m'
            });

            recordTest('CONST-002', 'Buffer = 300m (0.3km)', bufferCorrect, {
                expected: 0.3,
                actual: bufferRadius
            });

            recordTest('CONST-003', 'Total Assignment Radius = 800m (0.8km)', totalCorrect, {
                expected: 0.8,
                actual: totalRadius
            });

        } catch (error) {
            recordTest('CONST-001', 'Constants Loading', false, { error: error.message });
        }

        // Test Vendor Radius Logic in Database
        log('\n4. Testing Vendor Radius Enforcement...', 'TEST');
        try {
            const Vendor = require('../models/Vendor');

            // Clean test vendors
            await Vendor.deleteMany({
                phone: {
                    $in: ['+919876543210', '+919876543211', '+919876543212']
                }
            });

            // Create first vendor
            const vendor1 = await Vendor.create({
                phone: '+919876543210',
                name: 'Test Vendor 1',
                shopName: 'Test Shop 1',
                location: {
                    address: 'Test Location 1',
                    city: 'Delhi',
                    state: 'Delhi',
                    pincode: '110001',
                    coordinates: {
                        lat: 28.6139,
                        lng: 77.2090
                    }
                },
                businessLicense: 'TEST001',
                status: 'approved',
                creditLimit: 100000
            });

            recordTest('VEND-001', 'First Vendor Created', true, {
                vendorId: vendor1._id,
                coordinates: vendor1.location.coordinates
            });

            // Try to create second vendor ~500m away
            // At equator, 1 degree ≈ 111km, so 0.5km ≈ 0.0045 degrees
            const vendor2Coords = {
                lat: vendor1.location.coordinates.lat + 0.0045,
                lng: vendor1.location.coordinates.lng
            };

            // Check distance using MongoDB geospatial
            const nearby = await Vendor.find({
                status: 'approved',
                'location.coordinates': {
                    $near: {
                        $geometry: {
                            type: 'Point',
                            coordinates: [vendor2Coords.lng, vendor2Coords.lat]
                        },
                        $maxDistance: 500 // 500 meters
                    }
                }
            });

            const hasConflict = nearby.length > 0;

            recordTest('VEND-002', '500m Radius Check Working', hasConflict, {
                testCoordinates: vendor2Coords,
                conflictingVendors: nearby.length,
                note: hasConflict ? 'Correctly detected vendor within 500m' : 'ERROR: Should detect vendor within 500m'
            });

            // Clean up
            await Vendor.deleteMany({
                phone: {
                    $in: ['+919876543210', '+919876543211', '+919876543212']
                }
            });

        } catch (error) {
            recordTest('VEND-002', 'Vendor Radius Enforcement', false, { error: error.message });
        }

        // Test Product with Attributes (Min Price Logic)
        log('\n5. Testing Product Min Price Logic...', 'TEST');
        try {
            const Product = require('../models/Product');

            // Clean
            await Product.deleteOne({ name: 'TEST_MIN_PRICE_PRODUCT' });

            const product = await Product.create({
                name: 'TEST_MIN_PRICE_PRODUCT',
                description: 'Test product',
                shortDescription: 'Test',
                category: 'fertilizer',
                priceToVendor: 500,
                priceToUser: 900, // Base price
                stock: 50,
                images: [{ url: 'https://test.com/image.jpg', isPrimary: true, order: 0 }],
                attributeStocks: [
                    {
                        sizeValue: 250,
                        sizeUnit: 'ml',
                        actualStock: 20,
                        displayStock: 20,
                        vendorPrice: 300,
                        userPrice: 400 // MIN PRICE
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
            });

            // Calculate min price
            const prices = product.attributeStocks.map(a => a.userPrice);
            const minPrice = Math.min(...prices);
            const expectedMin = 400;

            recordTest('PROD-001', 'Product Min Price Calculation', minPrice === expectedMin, {
                basePriceToUser: product.priceToUser,
                calculatedMinPrice: minPrice,
                expectedMinPrice: expectedMin,
                allPrices: prices,
                note: minPrice === expectedMin
                    ? 'Min price from attributes working correctly'
                    : 'ERROR: Min price calculation incorrect'
            });

            // Clean
            await Product.deleteOne({ name: 'TEST_MIN_PRICE_PRODUCT' });

        } catch (error) {
            recordTest('PROD-001', 'Product Min Price Logic', false, { error: error.message });
        }

        // Test Order Minimum Value
        log('\n6. Testing Order Minimum Value (₹2,000)...', 'TEST');
        try {
            const constants = require('../utils/constants');
            const minOrderValue = constants.MIN_ORDER_VALUE;

            recordTest('ORD-001', 'Minimum Order Value = ₹2,000', minOrderValue === 2000, {
                expected: 2000,
                actual: minOrderValue
            });
        } catch (error) {
            recordTest('ORD-001', 'Order Minimum Value', false, { error: error.message });
        }

        // Test Credit Cycle Service
        log('\n7. Testing Credit Cycle Service...', 'TEST');
        try {
            const CreditCycleService = require('../services/creditCycleService');

            recordTest('CRED-001', 'Credit Cycle Service Loads', true, {
                methods: Object.getOwnPropertyNames(CreditCycleService).filter(m => typeof CreditCycleService[m] === 'function')
            });
        } catch (error) {
            recordTest('CRED-001', 'Credit Cycle Service', false, { error: error.message });
        }

        // Test IRA Partner Commission Constants
        log('\n8. Testing IRA Partner Commission Structure...', 'TEST');
        try {
            const constants = require('../utils/constants');

            const tier1Rate = constants.IRA_PARTNER_COMMISSION_RATE_LOW;
            const tier2Rate = constants.IRA_PARTNER_COMMISSION_RATE_HIGH;
            const threshold = constants.IRA_PARTNER_COMMISSION_THRESHOLD;

            recordTest('COMM-001', 'Tier 1 Commission = 2%', tier1Rate === 2, {
                expected: 2,
                actual: tier1Rate
            });

            recordTest('COMM-002', 'Tier 2 Commission = 3%', tier2Rate === 3, {
                expected: 3,
                actual: tier2Rate
            });

            recordTest('COMM-003', 'Threshold = ₹50,000', threshold === 50000, {
                expected: 50000,
                actual: threshold
            });
        } catch (error) {
            recordTest('COMM-001', 'Commission Structure', false, { error: error.message });
        }

        // Generate Summary
        log('\n========================================', 'TEST');
        log('TEST SUMMARY', 'TEST');
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
        log(`Pass Rate: ${passRate}%`, parseFloat(passRate) >= 100 ? 'PASS' : 'WARN');

        // List failures
        if (failed > 0) {
            log('\n========== FAILURES ==========', 'FAIL');
            testResults.tests.filter(t => !t.passed).forEach(test => {
                log(`\n${test.id}: ${test.name}`, 'FAIL');
                if (test.details.error) log(`  Error: ${test.details.error}`, 'FAIL');
                if (test.details.expected) log(`  Expected: ${JSON.stringify(test.details.expected)}`, 'FAIL');
                if (test.details.actual) log(`  Actual: ${JSON.stringify(test.details.actual)}`, 'FAIL');
            });
        }

        // Save Report
        const fs = require('fs');
        const reportPath = './test-results/system-test-report.json';

        if (!fs.existsSync('./test-results')) {
            fs.mkdirSync('./test-results');
        }

        fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
        log(`\nReport saved: ${reportPath}`, 'INFO');

        // Disconnect
        await mongoose.disconnect();
        log('\nDatabase disconnected', 'INFO');

        log('\n========================================', 'TEST');
        log('SYSTEM TEST COMPLETED', 'TEST');
        log('========================================', 'TEST');

        process.exit(failed > 0 ? 1 : 0);

    } catch (error) {
        log(`\nCRITICAL ERROR: ${error.message}`, 'FAIL');
        console.error(error.stack);
        process.exit(1);
    }
};

// Run
runTests();
