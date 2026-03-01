/**
 * Seed Default Repayment Tiers
 * 
 * Creates the discount and interest tiers as per Satpura Bio requirements:
 * 
 * DISCOUNT TIERS (Early Payment Incentives):
 * - 0-30 days: 10% discount
 * - 30-40 days: 6% discount
 * - 40-60 days: 4% discount
 * - 60-90 days: 2% discount
 * 
 * NEUTRAL ZONE:
 * - 90-105 days: 0% discount, 0% interest
 * 
 * INTEREST TIERS (Late Payment Penalties):
 * - 105-120 days: 5% interest
 * - 120+ days: 10% interest
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const RepaymentDiscount = require('../models/RepaymentDiscount');
const RepaymentInterest = require('../models/RepaymentInterest');
const Vendor = require('../models/Vendor');

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

const discountTiers = [
    {
        tierName: '0-30 Days Super Early Bird Discount',
        periodStart: 0,
        periodEnd: 30,
        discountRate: 10,
        description: 'Maximum savings! Pay within 30 days and save 10% on your purchase.',
        isActive: true,
    },
    {
        tierName: '30-40 Days Early Payment Discount',
        periodStart: 30,
        periodEnd: 40,
        discountRate: 6,
        description: 'Great savings! Pay within 40 days and save 6%.',
        isActive: true,
    },
    {
        tierName: '40-60 Days Good Payment Discount',
        periodStart: 40,
        periodEnd: 60,
        discountRate: 4,
        description: 'Good savings! Pay within 60 days and save 4%.',
        isActive: true,
    },
    {
        tierName: '60-90 Days Standard Discount',
        periodStart: 60,
        periodEnd: 90,
        discountRate: 2,
        description: 'Modest savings! Pay within 90 days and save 2%.',
        isActive: true,
    },
];

const interestTiers = [
    {
        tierName: '105-120 Days Late Payment Interest',
        periodStart: 105,
        periodEnd: 120,
        interestRate: 5,
        description: 'Late payment charges apply. 5% interest for payments between 105-120 days.',
        isActive: true,
        isOpenEnded: false,
    },
    {
        tierName: '120+ Days Severe Delay Interest',
        periodStart: 120,
        periodEnd: 999999, // Very large number
        interestRate: 10,
        description: 'Severe delay! 10% interest for payments after 120 days.',
        isActive: true,
        isOpenEnded: true,
    },
];

async function seedRepaymentTiers() {
    try {
        console.log('\n🌱 Seeding Repayment Tiers for Satpura Bio\n');

        // Connect to database
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to database\n');

        // ========================================
        // STEP 1: Clear existing tiers
        // ========================================
        console.log('🗑️  Clearing existing tiers...');
        await RepaymentDiscount.deleteMany({});
        await RepaymentInterest.deleteMany({});
        console.log('✅ Existing tiers cleared\n');

        // ========================================
        // STEP 2: Create discount tiers
        // ========================================
        console.log('💰 Creating Discount Tiers...');
        console.log('─'.repeat(70));

        for (const tier of discountTiers) {
            const created = await RepaymentDiscount.create(tier);
            console.log(`✅ ${created.tierName}`);
            console.log(`   Period: ${created.periodStart}-${created.periodEnd} days`);
            console.log(`   Discount: ${created.discountRate}%`);
            console.log(`   ${created.description}`);
            console.log('');
        }

        console.log('─'.repeat(70));
        console.log(`✅ Created ${discountTiers.length} discount tiers\n`);

        // ========================================
        // STEP 3: Create interest tiers
        // ========================================
        console.log('⚠️  Creating Interest Tiers...');
        console.log('─'.repeat(70));

        for (const tier of interestTiers) {
            const created = await RepaymentInterest.create(tier);
            console.log(`✅ ${created.tierName}`);
            console.log(`   Period: ${created.periodStart}${created.isOpenEnded ? '+' : `-${created.periodEnd}`} days`);
            console.log(`   Interest: ${created.interestRate}%`);
            console.log(`   ${created.description}`);
            console.log('');
        }

        console.log('─'.repeat(70));
        console.log(`✅ Created ${interestTiers.length} interest tiers\n`);

        // ========================================
        // STEP 4: Display complete timeline
        // ========================================
        console.log('📅 COMPLETE REPAYMENT TIMELINE:');
        console.log('═'.repeat(70));
        console.log('');
        console.log('  Days 0-30:   💰 10% DISCOUNT - Maximum savings zone');
        console.log('  Days 30-40:  💰 6% DISCOUNT - Great savings zone');
        console.log('  Days 40-60:  💰 4% DISCOUNT - Good savings zone');
        console.log('  Days 60-90:  💰 2% DISCOUNT - Standard savings zone');
        console.log('  Days 90-105: ⚪ NEUTRAL ZONE - No discount, no interest');
        console.log('  Days 105-120: ⚠️  5% INTEREST - Late payment charges');
        console.log('  Days 120+:    ⚠️  10% INTEREST - Severe delay charges');
        console.log('');
        console.log('═'.repeat(70));

        // ========================================
        // STEP 5: Set default credit limit for existing vendors
        // ========================================
        console.log('\n🏦 Updating Vendor Credit Limits...');
        const DEFAULT_CREDIT_LIMIT = 200000; // ₹2 Lakhs

        const vendorUpdateResult = await Vendor.updateMany(
            { creditLimit: { $lt: DEFAULT_CREDIT_LIMIT } },
            {
                $set: { creditLimit: DEFAULT_CREDIT_LIMIT },
                $setOnInsert: {
                    creditHistory: {
                        totalCreditTaken: 0,
                        totalRepaid: 0,
                        totalDiscountsEarned: 0,
                        totalInterestPaid: 0,
                        avgRepaymentDays: 0,
                        onTimeRepaymentCount: 0,
                        lateRepaymentCount: 0,
                        totalRepaymentCount: 0,
                        creditScore: 100,
                    },
                },
            }
        );

        console.log(`✅ Updated ${vendorUpdateResult.modifiedCount} vendor(s) credit limit to ₹${DEFAULT_CREDIT_LIMIT.toLocaleString('en-IN')}`);

        // ========================================
        // STEP 6: Verification
        // ========================================
        console.log('\n✅ Verifying seeded data...');

        const discountCount = await RepaymentDiscount.countDocuments({ isActive: true });
        const interestCount = await RepaymentInterest.countDocuments({ isActive: true });
        const vendorCount = await Vendor.countDocuments({ creditLimit: DEFAULT_CREDIT_LIMIT });

        console.log(`   - Active discount tiers: ${discountCount}`);
        console.log(`   - Active interest tiers: ${interestCount}`);
        console.log(`   - Vendors with ₹2L credit limit: ${vendorCount}`);

        console.log('\n🎉 Seeding complete! The system is ready for use.\n');

        console.log('📊 SYSTEM STATUS:');
        console.log('   - Discount system: ✅ ACTIVE');
        console.log('   - Interest system: ✅ ACTIVE');
        console.log('   - Credit limits: ✅ SET');
        console.log('   - Vendor module: ✅ READY\n');

    } catch (error) {
        console.error('\n❌ Seeding failed:', error.message);
        console.error(error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from database\n');
        process.exit(0);
    }
}

// Run seeding
seedRepaymentTiers();
