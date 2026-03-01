/**
 * Repayment Calculation Service
 * 
 * Core business logic for calculating repayment amounts with discounts/interest
 * Handles all financial calculations for the User credit system
 */

const RepaymentDiscount = require('../models/RepaymentDiscount');
const RepaymentInterest = require('../models/RepaymentInterest');

class RepaymentCalculationService {
    /**
     * Calculate repayment amount for a given purchase and repayment date
     * @param {Object} creditPurchase - Credit purchase document
     * @param {Date} repaymentDate - Actual or projected repayment date
     * @returns {Object} - Detailed calculation breakdown
     */
    static async calculateRepaymentAmount(creditPurchase, repaymentDate = new Date()) {
        const purchaseDate = creditPurchase.createdAt;
        // USE OUTSTANDING AMOUNT FOR CALCULATION
        // If outstandingAmount is available and consistent, use it. Otherwise fallback to totalAmount.
        // For new purchases, outstandingAmount == totalAmount initially.
        // For partial paid, outstandingAmount < totalAmount.
        const baseAmount = (creditPurchase.outstandingAmount !== undefined && creditPurchase.outstandingAmount !== null)
            ? creditPurchase.outstandingAmount
            : creditPurchase.totalAmount;

        // Calculate days elapsed
        const daysElapsed = Math.floor(
            (new Date(repaymentDate) - new Date(purchaseDate)) / (1000 * 60 * 60 * 24)
        );

        // Initialize calculation results
        const calculation = {
            purchaseId: creditPurchase._id,
            purchaseDate,
            repaymentDate,
            daysElapsed,
            baseAmount: baseAmount,
            discountTier: null,
            discountRate: 0,
            discountAmount: 0,
            interestTier: null,
            interestRate: 0,
            interestAmount: 0,
            finalPayable: baseAmount,
            savingsFromEarlyPayment: 0,
            penaltyFromLatePayment: 0,
            tierApplied: null,
            tierId: null,
            tierType: 'none', // 'discount', 'interest', or 'none'
        };

        try {
            // Fetch User to check for overrides
            let User = null;
            if (creditPurchase.userId && typeof creditPurchase.userId === 'object' && creditPurchase.userId.creditPolicy) {
                User = creditPurchase.userId;
            } else if (creditPurchase.userId) {
                const User = require('../models/User');
                User = await User.findById(creditPurchase.userId).select('creditPolicy').lean();
            }

            // Check for Special Agreement (Offline Settlement) for overrides
            if (User && User.creditPolicy && User.creditPolicy.specialAgreement && User.creditPolicy.specialAgreement.active) {
                const { agreedAmount, notes } = User.creditPolicy.specialAgreement;

                // Return forced calculation based on offline agreement
                calculation.tierApplied = 'Offline Agreement (Fixed Assessment)';
                calculation.tierType = 'special_agreement';
                calculation.finalPayable = agreedAmount;
                calculation.baseAmount = baseAmount; // Keep original reference
                calculation.discountAmount = 0;
                calculation.interestAmount = 0;
                calculation.savingsFromEarlyPayment = 0;
                calculation.penaltyFromLatePayment = 0;

                // Add note about override
                calculation.overrideNote = notes;

                return this._formatCalculation(calculation);
            }

            // Check for custom overrides (Tier overrides)
            if (User && User.creditPolicy && User.creditPolicy.overrideGlobalTiers) {
                const { customDiscountTiers, customInterestTiers } = User.creditPolicy;

                // 1. Check Custom Discount Tier
                const discountTier = customDiscountTiers.find(tier =>
                    daysElapsed >= tier.periodStart && daysElapsed <= tier.periodEnd
                );

                if (discountTier) {
                    calculation.discountTier = discountTier.tierName || 'Custom Discount';
                    calculation.discountRate = discountTier.discountRate;
                    calculation.discountAmount = (baseAmount * discountTier.discountRate) / 100;
                    calculation.savingsFromEarlyPayment = calculation.discountAmount;
                    calculation.finalPayable = baseAmount - calculation.discountAmount;
                    calculation.tierApplied = discountTier.tierName || `Custom Discount (${discountTier.discountRate}%)`;
                    calculation.tierId = discountTier._id;
                    calculation.tierType = 'discount';
                    return this._formatCalculation(calculation);
                }

                // 2. Check Custom Interest Tier
                const interestTier = customInterestTiers.find(tier =>
                    daysElapsed >= tier.periodStart && daysElapsed <= tier.periodEnd
                );

                if (interestTier) {
                    calculation.interestTier = interestTier.tierName || 'Custom Interest';
                    calculation.interestRate = interestTier.interestRate;
                    calculation.interestAmount = (baseAmount * interestTier.interestRate) / 100;
                    calculation.penaltyFromLatePayment = calculation.interestAmount;
                    calculation.finalPayable = baseAmount + calculation.interestAmount;
                    calculation.tierApplied = interestTier.tierName || `Custom Interest (${interestTier.interestRate}%)`;
                    calculation.tierId = interestTier._id;
                    calculation.tierType = 'interest';
                    return this._formatCalculation(calculation);
                }

                // 3. Neutral Zone (if overriding but no tier matches)
                calculation.tierApplied = 'Neutral Zone (Custom Policy)';
                calculation.tierType = 'none';
                calculation.finalPayable = baseAmount;
                return this._formatCalculation(calculation);
            }

            // --- Default Global Logic (Fallback) ---

            // Step 1: Check for applicable discount tier (early payment)
            const discountTier = await RepaymentDiscount.findApplicableTier(daysElapsed);

            if (discountTier) {
                calculation.discountTier = discountTier.tierName;
                calculation.discountRate = discountTier.discountRate;
                calculation.discountAmount = (baseAmount * discountTier.discountRate) / 100;
                calculation.savingsFromEarlyPayment = calculation.discountAmount;
                calculation.finalPayable = baseAmount - calculation.discountAmount;
                calculation.tierApplied = discountTier.tierName;
                calculation.tierId = discountTier._id;
                calculation.tierType = 'discount';

                return this._formatCalculation(calculation);
            }

            // Step 2: Check for applicable interest tier (late payment)
            // Only check if no discount was found (mutually exclusive)
            const interestTier = await RepaymentInterest.findApplicableTier(daysElapsed);

            if (interestTier) {
                calculation.interestTier = interestTier.tierName;
                calculation.interestRate = interestTier.interestRate;
                calculation.interestAmount = (baseAmount * interestTier.interestRate) / 100;
                calculation.penaltyFromLatePayment = calculation.interestAmount;
                calculation.finalPayable = baseAmount + calculation.interestAmount;
                calculation.tierApplied = interestTier.tierName;
                calculation.tierId = interestTier._id;
                calculation.tierType = 'interest';

                return this._formatCalculation(calculation);
            }

            // Step 3: No tier applies (neutral zone)
            calculation.tierApplied = 'Neutral Zone (No Discount, No Interest)';
            calculation.tierType = 'none';
            calculation.finalPayable = baseAmount;

            return this._formatCalculation(calculation);

        } catch (error) {
            throw new Error(`Calculation error: ${error.message}`);
        }
    }

    /**
     * Format calculation results
     * @private
     */
    static _formatCalculation(calc) {
        return {
            ...calc,
            financialBreakdown: {
                baseAmount: calc.baseAmount,
                discountDeduction: calc.discountAmount,
                interestAddition: calc.interestAmount,
                finalPayable: calc.finalPayable,
                savingsFromEarlyPayment: calc.savingsFromEarlyPayment,
                penaltyFromLatePayment: calc.penaltyFromLatePayment,
            },
            summary: {
                youPay: `₹${calc.finalPayable.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`,
                youSave: calc.savingsFromEarlyPayment > 0
                    ? `₹${calc.savingsFromEarlyPayment.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
                    : '₹0',
                penalty: calc.penaltyFromLatePayment > 0
                    ? `₹${calc.penaltyFromLatePayment.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
                    : '₹0',
                message: this._getPaymentMessage(calc),
            },
        };
    }

    /**
     * Get user-friendly message based on calculation
     * @private
     */
    static _getPaymentMessage(calc) {
        if (calc.tierType === 'discount') {
            return `🎉 You're saving ₹${calc.savingsFromEarlyPayment.toFixed(2)} by paying early! (${calc.discountRate}% discount)`;
        } else if (calc.tierType === 'interest') {
            return `⚠️ Late payment penalty of ₹${calc.penaltyFromLatePayment.toFixed(2)} applied (${calc.interestRate}% interest)`;
        } else if (calc.tierType === 'special_agreement') {
            return `🤝 Offline Agreement Active: Fixed repayment amount settled.`;
        } else {
            return `Standard repayment - no discount or interest applied`;
        }
    }

    /**
     * Project repayment amounts for multiple future dates
     * Shows User what they would pay on different dates
     * @param {Object} creditPurchase - Credit purchase document
     * @param {Array} projectionDays - Array of days to project (e.g., [15, 30, 45, 60, 90, 105, 120])
     * @returns {Array} - Array of projections
     */
    static async projectRepaymentSchedule(creditPurchase, projectionDays = null) {
        // Default projection points (strategically placed at tier boundaries)
        if (!projectionDays) {
            projectionDays = [
                'today',
                15,  // Mid-30 day tier
                30,  // End of 30-day tier
                35,  // Mid-40 day tier
                40,  // End of 40-day tier
                50,  // Mid-60 day tier
                60,  // End of 60-day tier
                75,  // Mid-90 day tier
                90,  // End of 90-day tier (last discount)
                100,  // Mid neutral zone
                105, // Start of 5% interest
                112, // Mid-120 day tier
                120, // End of 120-day tier / Start of 10% interest
                130, // Well into 10% interest
            ];
        }

        const projections = [];
        const purchaseDate = new Date(creditPurchase.createdAt);

        for (const daySpec of projectionDays) {
            let projectionDate;
            let daysFromNow;
            let label;

            if (daySpec === 'today') {
                projectionDate = new Date();
                daysFromNow = 0;
                label = 'Today';
            } else {
                projectionDate = new Date(purchaseDate);
                projectionDate.setDate(projectionDate.getDate() + daySpec);

                const now = new Date();
                daysFromNow = Math.floor((projectionDate - now) / (1000 * 60 * 60 * 24));
                label = `Day ${daySpec}`;
            }

            const calculation = await this.calculateRepaymentAmount(creditPurchase, projectionDate);

            projections.push({
                label,
                day: daySpec === 'today' ? calculation.daysElapsed : daySpec,
                date: projectionDate.toISOString().split('T')[0],
                daysFromNow,
                isPast: daysFromNow < 0,
                isFuture: daysFromNow > 0,
                isToday: daysFromNow === 0,
                ...calculation.financialBreakdown,
                tierApplied: calculation.tierApplied,
                tierType: calculation.tierType,
                discountRate: calculation.discountRate,
                interestRate: calculation.interestRate,
                paymentAdvice: this._getPaymentAdvice(calculation, daysFromNow),
            });
        }

        return {
            purchaseId: creditPurchase._id,
            purchaseAmount: creditPurchase.totalAmount,
            purchaseDate: creditPurchase.createdAt,
            projections,
            bestOption: this._findBestPaymentOption(projections),
            recommendation: this._getRecommendation(projections),
        };
    }

    /**
     * Get payment advice for a specific projection
     * @private
     */
    static _getPaymentAdvice(calc, daysFromNow) {
        if (calc.tierType === 'discount') {
            if (daysFromNow <= 0) {
                return `✅ Great! ${calc.discountRate}% discount available now`;
            } else {
                return `💰 ${calc.discountRate}% discount if you pay in ${daysFromNow} days`;
            }
        } else if (calc.tierType === 'interest') {
            if (daysFromNow <= 0) {
                return `⚠️ Already in interest zone - pay now to avoid more charges`;
            } else {
                return `⚠️ ${calc.interestRate}% interest will apply in ${daysFromNow} days`;
            }
        } else {
            if (daysFromNow <= 0) {
                return `Standard repayment - no discount or penalty`;
            } else {
                return `Neutral zone - no benefit or penalty`;
            }
        }
    }

    /**
     * Find the best payment option (highest discount or lowest interest)
     * @private
     */
    static _findBestPaymentOption(projections) {
        const futureOptions = projections.filter(p => !p.isPast);

        // Find the option with the highest savings (or lowest penalty)
        const bestOption = futureOptions.reduce((best, current) => {
            const currentValue = current.savingsFromEarlyPayment - current.penaltyFromLatePayment;
            const bestValue = best.savingsFromEarlyPayment - best.penaltyFromLatePayment;

            return currentValue > bestValue ? current : best;
        }, futureOptions[0]);

        return {
            day: bestOption.day,
            date: bestOption.date,
            amount: bestOption.finalPayable,
            savings: bestOption.savingsFromEarlyPayment,
            tierApplied: bestOption.tierApplied,
        };
    }

    /**
     * Get payment recommendation
     * @private
     */
    static _getRecommendation(projections) {
        const futureOptions = projections.filter(p => !p.isPast);
        const maxDiscount = Math.max(...futureOptions.map(p => p.savingsFromEarlyPayment));

        if (maxDiscount > 0) {
            const bestDiscountOption = futureOptions.find(p => p.savingsFromEarlyPayment === maxDiscount);
            return {
                type: 'discount',
                message: `💰 Pay within ${bestDiscountOption.day} days to save ₹${maxDiscount.toFixed(2)}`,
                urgency: 'high',
            };
        }

        const firstInterestDay = futureOptions.find(p => p.tierType === 'interest');
        if (firstInterestDay) {
            return {
                type: 'warning',
                message: `⚠️ Interest charges begin on day ${firstInterestDay.day}. Pay before then!`,
                urgency: 'medium',
            };
        }

        return {
            type: 'neutral',
            message: `Standard repayment schedule - pay at your convenience`,
            urgency: 'low',
        };
    }

    /**
     * Calculate User credit score based on repayment history
     * @param {Object} User - User document
     * @returns {Number} - Credit score (0-100)
     */
    static calculateCreditScore(User) {
        const { creditHistory } = User;

        if (!creditHistory || creditHistory.totalRepaymentCount === 0) {
            return 100; // New User starts with perfect score
        }

        let score = 100;

        // Factor 1: On-time repayment rate (40 points)
        const onTimeRate = creditHistory.onTimeRepaymentCount / creditHistory.totalRepaymentCount;
        score = score - ((1 - onTimeRate) * 40);

        // Factor 2: Average repayment days (30 points)
        // Target: <= 45 days average
        if (creditHistory.avgRepaymentDays > 45) {
            const penalty = Math.min(((creditHistory.avgRepaymentDays - 45) / 45) * 30, 30);
            score = score - penalty;
        }

        // Factor 3: Interest-to-discount ratio (20 points)
        // Ideal: More discounts earned than interest paid
        if (creditHistory.totalDiscountsEarned > 0 || creditHistory.totalInterestPaid > 0) {
            const ratio = creditHistory.totalInterestPaid /
                (creditHistory.totalDiscountsEarned + creditHistory.totalInterestPaid + 1);
            score = score - (ratio * 20);
        }

        // Factor 4: Repayment consistency (10 points)
        // Check if recent repayments are improving or declining
        if (creditHistory.lastRepaymentDays > creditHistory.avgRepaymentDays + 15) {
            score = score - 10; // Recent performance declining
        }

        // Ensure score stays within bounds
        return Math.max(0, Math.min(100, Math.round(score)));
    }

    /**
     * Update User credit history after a repayment
     * @param {Object} User - User document
     * @param {Object} repaymentData - Repayment calculation results
     * @returns {Object} - Updated credit history
     */
    static updateUserCreditHistory(User, repaymentData) {
        if (!User.creditHistory) {
            User.creditHistory = {
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

        const ch = User.creditHistory;

        // Update totals
        ch.totalCreditTaken += repaymentData.baseAmount;
        ch.totalRepaid += repaymentData.finalPayable;
        ch.totalDiscountsEarned += repaymentData.savingsFromEarlyPayment;
        ch.totalInterestPaid += repaymentData.penaltyFromLatePayment;

        // Update counters
        ch.totalRepaymentCount += 1;
        if (repaymentData.daysElapsed <= 90) {
            ch.onTimeRepaymentCount += 1;
        } else {
            ch.lateRepaymentCount += 1;
        }

        // Update average repayment days (moving average)
        ch.avgRepaymentDays = Math.round(
            ((ch.avgRepaymentDays * (ch.totalRepaymentCount - 1)) + repaymentData.daysElapsed) /
            ch.totalRepaymentCount
        );

        // Store last repayment info
        ch.lastRepaymentDate = repaymentData.repaymentDate;
        ch.lastRepaymentDays = repaymentData.daysElapsed;

        // Recalculate credit score
        ch.creditScore = this.calculateCreditScore(User);

        return User.creditHistory;
    }
}

module.exports = RepaymentCalculationService;
