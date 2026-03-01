/**
 * Migration Script: Initialize Credit Cycles for Existing Purchases
 * 
 * Purpose: Add cycle tracking fields to existing approved CreditPurchase documents
 * Run this ONCE after deploying the credit cycle system
 * 
 * Usage: node scripts/migrateToCreditCycles.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const CreditPurchase = require('../models/CreditPurchase');
const CreditRepayment = require('../models/CreditRepayment');

async function migrateToCreditCycles() {
    try {
        console.log('[Migration] Starting credit cycle initialization...\n');

        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('[Migration] ✅ Connected to MongoDB\n');

        // Find all approved credit purchases without cycle fields
        const purchasesToMigrate = await CreditPurchase.find({
            status: 'approved',
            cycleStartDate: { $exists: false }
        });

        console.log(`[Migration] Found ${purchasesToMigrate.length} approved purchases to migrate\n`);

        if (purchasesToMigrate.length === 0) {
            console.log('[Migration] No purchases to migrate. All cycles already initialized.');
            await mongoose.connection.close();
            return;
        }

        let successCount = 0;
        let errorCount = 0;

        for (const purchase of purchasesToMigrate) {
            try {
                console.log(`\n[Migration] Processing ${purchase.creditPurchaseId}...`);

                // Find all repayments for this purchase
                const repayments = await CreditRepayment.find({
                    purchaseOrderId: purchase._id,
                    status: 'completed'
                });

                // Calculate total repaid from existing repayments
                const totalRepaid = repayments.reduce((sum, rep) => sum + (rep.amount || 0), 0);
                const totalDiscountEarned = repayments.reduce((sum, rep) =>
                    sum + (rep.discountApplied?.discountAmount || 0), 0);
                const totalInterestPaid = repayments.reduce((sum, rep) =>
                    sum + (rep.interestApplied?.interestAmount || 0), 0);

                // Initialize cycle fields
                purchase.principalAmount = purchase.totalAmount;
                purchase.outstandingAmount = purchase.totalAmount - totalRepaid;
                purchase.totalRepaid = totalRepaid;
                purchase.cycleStartDate = purchase.reviewedAt || purchase.updatedAt || purchase.createdAt;
                purchase.totalDiscountEarned = totalDiscountEarned;
                purchase.totalInterestPaid = totalInterestPaid;
                purchase.repayments = repayments.map(r => r._id);

                // Determine cycle status
                if (totalRepaid === 0) {
                    purchase.cycleStatus = 'active';
                    purchase.repaymentStatus = 'not_started';
                } else if (totalRepaid < purchase.totalAmount) {
                    purchase.cycleStatus = 'partially_paid';
                    purchase.repaymentStatus = 'in_progress';
                    purchase.lastRepaymentDate = repayments[repayments.length - 1]?.paidAt || repayments[repayments.length - 1]?.createdAt;
                } else if (totalRepaid >= purchase.totalAmount) {
                    purchase.cycleStatus = 'closed';
                    purchase.repaymentStatus = 'completed';
                    purchase.cycleClosedDate = repayments[repayments.length - 1]?.paidAt || repayments[repayments.length - 1]?.createdAt;
                    purchase.lastRepaymentDate = purchase.cycleClosedDate;
                }

                await purchase.save();

                console.log(`  ✅ Initialized cycle:`);
                console.log(`     Principal: ₹${purchase.principalAmount.toLocaleString('en-IN')}`);
                console.log(`     Outstanding: ₹${purchase.outstandingAmount.toLocaleString('en-IN')}`);
                console.log(`     Total Repaid: ₹${purchase.totalRepaid.toLocaleString('en-IN')}`);
                console.log(`     Status: ${purchase.cycleStatus}`);
                console.log(`     Repayments: ${repayments.length}`);

                successCount++;

            } catch (error) {
                console.error(`  ❌ Error migrating ${purchase.creditPurchaseId}:`, error.message);
                errorCount++;
            }
        }

        console.log('\n[Migration] ═══════════════════════════════════════');
        console.log('[Migration] Migration Summary:');
        console.log(`  - Total Processed: ${purchasesToMigrate.length}`);
        console.log(`  - Successfully Migrated: ${successCount}`);
        console.log(`  - Errors: ${errorCount}`);
        console.log('[Migration] ═══════════════════════════════════════\n');

        // Close MongoDB connection
        await mongoose.connection.close();
        console.log('[Migration] ✅ MongoDB connection closed');
        console.log('[Migration] Migration completed successfully!');

        process.exit(0);

    } catch (error) {
        console.error('[Migration] ❌ Migration failed:', error);
        process.exit(1);
    }
}

// Run migration
migrateToCreditCycles();
