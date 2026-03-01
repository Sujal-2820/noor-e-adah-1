/**
 * Migration Script: Update Vendor Credit Limits
 * 
 * Purpose: Set default credit limit to ₹100,000 for existing vendors
 * Run this ONCE after deploying the new credit system
 * 
 * Usage: node scripts/migrateVendorCreditLimits.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Vendor = require('../models/Vendor');

const DEFAULT_CREDIT_LIMIT = 100000; // ₹1,00,000

async function migrateVendorCreditLimits() {
    try {
        console.log('[Migration] Starting vendor credit limit migration...');
        console.log(`[Migration] Target: Set credit limit to ₹${DEFAULT_CREDIT_LIMIT.toLocaleString('en-IN')} for vendors with 0 limit\n`);

        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('[Migration] ✅ Connected to MongoDB\n');

        // Find all vendors with 0 credit limit
        const vendorsToUpdate = await Vendor.find({
            creditLimit: { $lte: 0 }
        });

        console.log(`[Migration] Found ${vendorsToUpdate.length} vendors with 0 or negative credit limit\n`);

        if (vendorsToUpdate.length === 0) {
            console.log('[Migration] No vendors to update. Migration already completed or not needed.');
            await mongoose.connection.close();
            return;
        }

        let updatedCount = 0;
        let errorCount = 0;

        console.log('[Migration] Updating vendors...\n');

        for (const vendor of vendorsToUpdate) {
            try {
                const oldLimit = vendor.creditLimit;
                vendor.creditLimit = DEFAULT_CREDIT_LIMIT;

                // Initialize credit history if not exists
                if (!vendor.creditHistory) {
                    vendor.creditHistory = {
                        totalCreditTaken: 0,
                        totalRepaid: 0,
                        totalDiscountsEarned: 0,
                        totalInterestPaid: 0,
                        avgRepaymentDays: 0,
                        onTimeRepaymentCount: 0,
                        lateRepaymentCount: 0,
                        totalRepaymentCount: 0,
                        creditScore: 100,
                    };
                }

                // Set performance tier to 'not_rated' if not set
                if (!vendor.performanceTier) {
                    vendor.performanceTier = 'not_rated';
                }

                await vendor.save();

                console.log(`✅ ${vendor.vendorId} (${vendor.name}): ₹${oldLimit} → ₹${DEFAULT_CREDIT_LIMIT.toLocaleString('en-IN')}`);
                updatedCount++;

            } catch (error) {
                console.error(`❌ Error updating ${vendor.vendorId}:`, error.message);
                errorCount++;
            }
        }

        console.log('\n[Migration] Migration Summary:');
        console.log(`  - Total Vendors Processed: ${vendorsToUpdate.length}`);
        console.log(`  - Successfully Updated: ${updatedCount}`);
        console.log(`  - Errors: ${errorCount}`);

        // Close MongoDB connection
        await mongoose.connection.close();
        console.log('\n[Migration] ✅ MongoDB connection closed');
        console.log('[Migration] Migration completed successfully!');

        process.exit(0);

    } catch (error) {
        console.error('[Migration] ❌ Migration failed:', error);
        process.exit(1);
    }
}

// Run migration
migrateVendorCreditLimits();
