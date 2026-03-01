/**
 * Credit Cycle Management Service
 * 
 * Handles independent credit cycles per purchase with partial repayment support
 * 
 * CORE RULE: Each credit usage creates an independent cycle.
 * Repayments affect only that specific cycle, not the entire outstanding credit.
 */

const CreditPurchase = require('../models/CreditPurchase');
const CreditRepayment = require('../models/CreditRepayment');
const User = require('../models/User');
const RepaymentCalculationService = require('./repaymentCalculationService');

class CreditCycleService {
    /**
     * Process Partial Repayment for a Specific Credit Cycle
     * 
     * @param {ObjectId} purchaseId - The credit purchase (cycle) being repaid
     * @param {Number} repaymentAmount - Amount User wants to repay
     * @param {Date} repaymentDate - When repayment is being made
     * @param {Object} paymentDetails - Payment method, razorpay IDs, etc.
     * @returns {Object} - Updated cycle info and repayment record
     */
    static async processPartialRepayment(purchaseId, repaymentAmount, repaymentDate = new Date(), paymentDetails = {}) {
        try {
            // Step 1: Find the credit cycle
            const cycle = await CreditPurchase.findById(purchaseId).populate('UserId');

            if (!cycle) {
                throw new Error('Credit cycle not found');
            }

            if (cycle.status !== 'approved') {
                throw new Error('Credit cycle not approved yet');
            }

            if (!cycle.canAcceptRepayment()) {
                throw new Error('Credit cycle cannot accept repayments (already closed)');
            }

            const User = cycle.userId;
            const outstandingBeforeRepayment = cycle.outstandingAmount;

            // Step 2: Validate repayment amount
            if (repaymentAmount <= 0) {
                throw new Error('Repayment amount must be greater than 0');
            }

            if (repaymentAmount > outstandingBeforeRepayment) {
                throw new Error(`Repayment amount (₹${repaymentAmount}) exceeds outstanding (₹${outstandingBeforeRepayment}). To prevent overpayment, maximum allowed is ₹${outstandingBeforeRepayment}`);
            }

            // Step 3: Calculate discount/interest for THIS repayment
            // Calculation is based on the CYCLE START DATE, not repayment date
            const daysElapsed = Math.floor(
                (new Date(repaymentDate) - new Date(cycle.cycleStartDate)) / (1000 * 60 * 60 * 24)
            );

            // Calculate what would be owed on the FULL principal at this time
            const fullCalculation = await RepaymentCalculationService.calculateRepaymentAmount(cycle, repaymentDate);

            // Pro-rata: Apply the same discount/interest rate to this partial amount
            const discountRate = fullCalculation.discountRate || 0;
            const interestRate = fullCalculation.interestRate || 0;

            let discountAmount = 0;
            let interestAmount = 0;
            let adjustedRepaymentAmount = repaymentAmount;

            if (discountRate > 0) {
                // Early payment: Apply discount
                discountAmount = (repaymentAmount * discountRate) / 100;
                adjustedRepaymentAmount = repaymentAmount - discountAmount;
            } else if (interestRate > 0) {
                // Late payment: Apply interest
                interestAmount = (repaymentAmount * interestRate) / 100;
                adjustedRepaymentAmount = repaymentAmount + interestAmount;
            }

            // Step 4: Create Repayment Record
            const repayment = await CreditRepayment.create({
                userId: User._id,
                purchaseOrderId: cycle._id,
                amount: repaymentAmount, // Principal being repaid
                totalAmount: adjustedRepaymentAmount, // What User actually pays (after discount/interest)
                purchaseDate: cycle.cycleStartDate,
                repaymentDate: repaymentDate,
                daysElapsed: daysElapsed,

                // Discount tracking
                discountApplied: discountRate > 0 ? {
                    tierName: fullCalculation.discountTier,
                    tierId: fullCalculation.tierId,
                    discountRate: discountRate,
                    discountAmount: discountAmount
                } : undefined,

                // Interest tracking
                interestApplied: interestRate > 0 ? {
                    tierName: fullCalculation.interestTier,
                    tierId: fullCalculation.tierId,
                    interestRate: interestRate,
                    interestAmount: interestAmount
                } : undefined,

                // Financial breakdown
                originalAmount: repaymentAmount,
                adjustedAmount: adjustedRepaymentAmount,
                financialBreakdown: {
                    baseAmount: repaymentAmount,
                    discountDeduction: discountAmount,
                    interestAddition: interestAmount,
                    finalPayable: adjustedRepaymentAmount,
                    savingsFromEarlyPayment: discountAmount,
                    penaltyFromLatePayment: interestAmount
                },

                // Credit tracking
                creditUsedBefore: User.creditUsed,
                creditUsedAfter: User.creditUsed - repaymentAmount, // Restore credit by principal amount

                // Payment details
                status: paymentDetails.status || 'completed',
                paymentMethod: paymentDetails.paymentMethod || 'razorpay',
                razorpayOrderId: paymentDetails.razorpayOrderId,
                razorpayPaymentId: paymentDetails.razorpayPaymentId,
                razorpaySignature: paymentDetails.razorpaySignature,

                calculationMethod: 'tiered_discount_interest',
                calculatedAt: new Date()
            });

            // Step 5: Update Credit Cycle
            cycle.outstandingAmount -= repaymentAmount; // Reduce by principal
            cycle.totalRepaid += repaymentAmount; // Increase by principal
            cycle.lastRepaymentDate = repaymentDate;
            cycle.repayments.push(repayment._id);

            // Track cumulative discount/interest for this cycle
            cycle.totalDiscountEarned += discountAmount;
            cycle.totalInterestPaid += interestAmount;

            // Auto-close cycle if fully repaid
            if (cycle.outstandingAmount === 0) {
                cycle.closeCycle();
            }

            await cycle.save();

            // Step 6: Update User Credit
            // Restore credit by the PRINCIPAL amount re paid
            User.creditUsed -= repaymentAmount;

            // Update User credit history (existing logic)
            const historyUpdate = RepaymentCalculationService.updateUserCreditHistory(User, {
                baseAmount: repaymentAmount,
                finalPayable: adjustedRepaymentAmount,
                savingsFromEarlyPayment: discountAmount,
                penaltyFromLatePayment: interestAmount,
                daysElapsed: daysElapsed,
                repaymentDate: repaymentDate
            });

            User.creditHistory = historyUpdate;
            await User.save();

            console.log(`[CreditCycleService] Partial repayment processed:
  Cycle: ${cycle.creditPurchaseId}
  Repayment Principal: ₹${repaymentAmount}
  Adjusted Amount Paid: ₹${adjustedRepaymentAmount}
  Discount: ₹${discountAmount} (${discountRate}%)
  Interest: ₹${interestAmount} (${interestRate}%)
  Outstanding Remaining: ₹${cycle.outstandingAmount}
  User Credit Restored: ₹${repaymentAmount}
  User Available Credit: ₹${User.creditLimit - User.creditUsed}`);

            return {
                success: true,
                repayment: {
                    id: repayment._id,
                    repaymentId: repayment.repaymentId,
                    principalRepaid: repaymentAmount,
                    actualAmountPaid: adjustedRepaymentAmount,
                    discountEarned: discountAmount,
                    discountRate: discountRate,
                    interestPaid: interestAmount,
                    interestRate: interestRate,
                    daysElapsed: daysElapsed
                },
                cycle: {
                    id: cycle._id,
                    creditPurchaseId: cycle.creditPurchaseId,
                    principalAmount: cycle.principalAmount,
                    outstandingAmount: cycle.outstandingAmount,
                    totalRepaid: cycle.totalRepaid,
                    cycleStatus: cycle.cycleStatus,
                    repaymentStatus: cycle.repaymentStatus,
                    isClosed: cycle.cycleStatus === 'closed'
                },
                User: {
                    creditLimit: User.creditLimit,
                    creditUsed: User.creditUsed,
                    availableCredit: User.creditLimit - User.creditUsed,
                    creditScore: User.creditHistory?.creditScore || 100
                }
            };

        } catch (error) {
            console.error('[CreditCycleService] Error processing partial repayment:', error);
            throw error;
        }
    }

    /**
     * Get All Active Cycles for a User
     * 
     * @param {Object Id} UserId
     * @returns {Array} - List of active/partially paid cycles
     */
    static async getActiveCyclesForUser(UserId) {
        try {
            const cycles = await CreditPurchase.find({
                userId: UserId,
                cycleStatus: { $in: ['active', 'partially_paid'] },
                status: 'approved'
            }).sort({ cycleStartDate: 1 }); // Oldest first

            return cycles.map(cycle => ({
                id: cycle._id,
                creditPurchaseId: cycle.creditPurchaseId,
                principalAmount: cycle.principalAmount,
                outstandingAmount: cycle.outstandingAmount,
                totalRepaid: cycle.totalRepaid,
                cycleStartDate: cycle.cycleStartDate,
                daysElapsed: cycle.daysElapsed,
                cycleStatus: cycle.cycleStatus,
                repaymentStatus: cycle.repaymentStatus,
                totalDiscountEarned: cycle.totalDiscountEarned,
                totalInterestPaid: cycle.totalInterestPaid,
                items: cycle.items
            }));

        } catch (error) {
            console.error('[CreditCycleService] Error fetching active cycles:', error);
            throw error;
        }
    }

    /**
     * Get Cycle Details with Repayment History
     * 
     * @param {ObjectId} cycleId
     * @returns {Object} - Full cycle details
     */
    static async getCycleDetails(cycleId) {
        try {
            const cycle = await CreditPurchase.findById(cycleId)
                .populate('UserId', 'UserId name phone creditLimit creditUsed')
                .populate('repayments');

            if (!cycle) {
                throw new Error('Cycle not found');
            }

            return {
                id: cycle._id,
                creditPurchaseId: cycle.creditPurchaseId,
                User: cycle.userId,
                principalAmount: cycle.principalAmount,
                outstandingAmount: cycle.outstandingAmount,
                totalRepaid: cycle.totalRepaid,
                cycleStartDate: cycle.cycleStartDate,
                daysElapsed: cycle.daysElapsed,
                cycleStatus: cycle.cycleStatus,
                repaymentStatus: cycle.repaymentStatus,
                totalDiscountEarned: cycle.totalDiscountEarned,
                totalInterestPaid: cycle.totalInterestPaid,
                cycleClosedDate: cycle.cycleClosedDate,
                items: cycle.items,
                repayments: cycle.repayments || []
            };

        } catch (error) {
            console.error('[CreditCycleService] Error fetching cycle details:', error);
            throw error;
        }
    }

    /**
     * Validate if User can make a new credit purchase
     * 
     * @param {ObjectId} UserId
     * @param {Number} purchaseAmount
     * @returns {Object} - Validation result
     */
    static async validateNewPurchase(UserId, purchaseAmount) {
        try {
            const User = await User.findById(UserId);

            if (!User) {
                throw new Error('User not found');
            }

            const availableCredit = User.creditLimit - User.creditUsed;

            if (purchaseAmount > availableCredit) {
                return {
                    allowed: false,
                    reason: 'Insufficient credit',
                    details: {
                        creditLimit: User.creditLimit,
                        creditUsed: User.creditUsed,
                        availableCredit: availableCredit,
                        requestedAmount: purchaseAmount,
                        shortfall: purchaseAmount - availableCredit
                    }
                };
            }

            return {
                allowed: true,
                details: {
                    creditLimit: User.creditLimit,
                    creditUsed: User.creditUsed,
                    availableCredit: availableCredit,
                    requestedAmount: purchaseAmount,
                    remainingAfterPurchase: availableCredit - purchaseAmount
                }
            };

        } catch (error) {
            console.error('[CreditCycleService] Error validating new purchase:', error);
            throw error;
        }
    }

    /**
     * Get User's credit dashboard summary
     * 
     * @param {ObjectId} UserId
     * @returns {Object} - Summary with all cycles
     */
    static async getUserCreditSummary(UserId) {
        try {
            const User = await User.findById(UserId);
            const activeCycles = await this.getActiveCyclesForUser(UserId);
            const closedCycles = await CreditPurchase.find({
                userId: UserId,
                cycleStatus: 'closed'
            }).countDocuments();

            const totalOutstanding = activeCycles.reduce((sum, cycle) => sum + cycle.outstandingAmount, 0);

            return {
                User: {
                    id: User._id,
                    userId: User.userId,
                    name: User.name,
                    creditLimit: User.creditLimit,
                    creditUsed: User.creditUsed,
                    availableCredit: User.creditLimit - User.creditUsed,
                    creditScore: User.creditHistory?.creditScore || 100,
                    performanceTier: User.performanceTier || 'not_rated'
                },
                cycles: {
                    active: activeCycles,
                    activeCount: activeCycles.length,
                    closedCount: closedCycles,
                    totalOutstanding: totalOutstanding
                },
                creditHistory: User.creditHistory || {}
            };

        } catch (error) {
            console.error('[CreditCycleService] Error fetching User credit summary:', error);
            throw error;
        }
    }
}

module.exports = CreditCycleService;
