const PurchaseIncentive = require('../models/PurchaseIncentive');
const UserIncentiveHistory = require('../models/UserIncentiveHistory');
const CreditPurchase = require('../models/CreditPurchase');
const UserNotification = require('../models/UserNotification');

/**
 * Incentive Service
 * 
 * Handles business logic for purchase-based incentives
 */

/**
 * Check and apply incentives for a new purchase
 * 
 * @param {string} purchaseId - CreditPurchase ID
 * @param {string} UserId - User ID
 * @param {number} amount - Purchase amount
 */
exports.processIncentivesForPurchase = async (purchaseId, UserId, amount) => {
    try {
        console.log(`[IncentiveService] Processing incentives for User ${UserId}, amount ${amount}`);

        // 1. Find all active and applicable incentives
        const incentives = await PurchaseIncentive.findApplicableIncentives(amount, UserId);

        if (!incentives || incentives.length === 0) {
            console.log('[IncentiveService] No applicable incentives found');
            return [];
        }

        console.log(`[IncentiveService] Found ${incentives.length} potential incentives`);

        const createdRecords = [];

        for (const incentive of incentives) {
            // 2. Double check eligibility (including order frequency)
            // Need User order count for frequency check
            const orderCount = await CreditPurchase.countDocuments({ UserId, status: 'approved' });

            const eligibility = incentive.isEligible(amount, orderCount);

            if (!eligibility.eligible) {
                console.log(`[IncentiveService] User not eligible for ${incentive.title}: ${eligibility.reason}`);
                continue;
            }

            // 3. Check if User already claimed this (if maxRedemptionsPerUser is 1)
            const existingClaim = await UserIncentiveHistory.findOne({
                UserId,
                incentiveId: incentive._id,
                status: { $ne: 'rejected' }
            });

            if (existingClaim && incentive.maxRedemptionsPerUser && (await UserIncentiveHistory.countDocuments({ UserId, incentiveId: incentive._id, status: { $ne: 'rejected' } })) >= incentive.maxRedemptionsPerUser) {
                console.log(`[IncentiveService] User already claimed/earning incentive ${incentive.title}`);
                continue;
            }

            // 4. Create history record
            const history = new UserIncentiveHistory({
                UserId,
                incentiveId: incentive._id,
                purchaseOrderId: purchaseId,
                purchaseAmount: amount,
                incentiveSnapshot: {
                    title: incentive.title,
                    description: incentive.description,
                    rewardType: incentive.rewardType,
                    rewardValue: incentive.rewardValue,
                    rewardUnit: incentive.rewardUnit
                },
                status: incentive.conditions?.requiresApproval ? 'pending_approval' : 'approved',
                earnedAt: new Date(),
                notes: `Automatically earned from order ${purchaseId}`
            });

            await history.save();

            // Send Notification
            await UserNotification.createNotification({
                UserId,
                type: 'incentive_earned',
                title: 'New Reward Earned! ✨',
                message: `Congratulations! Your purchase of ₹${amount.toLocaleString()} makes you eligible for "${incentive.title}".`,
                relatedEntityType: 'none',
                priority: 'normal'
            });

            // 5. Update current redemptions on the scheme
            incentive.currentRedemptions += 1;
            await incentive.save();

            createdRecords.push(history);
            console.log(`[IncentiveService] Incentive ${incentive.title} recorded for User`);
        }

        return createdRecords;

    } catch (error) {
        console.error('[IncentiveService] Error processing incentives:', error);
        throw error;
    }
};

/**
 * Get available schemes for a User (for browsing)
 */
exports.getAvailableSchemes = async (UserId) => {
    try {
        const now = new Date();
        const incentives = await PurchaseIncentive.find({
            isActive: true,
            validFrom: { $lte: now },
            $or: [
                { validUntil: { $exists: false } },
                { validUntil: { $gte: now } },
            ]
        }).sort({ minPurchaseAmount: 1 });

        return incentives;
    } catch (error) {
        console.error('[IncentiveService] Error getting available schemes:', error);
        throw error;
    }
};
