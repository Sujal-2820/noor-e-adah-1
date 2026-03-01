/**
 * Tier Validation Service
 * 
 * Ensures discount and interest tiers are configured correctly
 * Prevents admin misconfiguration through strict validation
 */

const RepaymentDiscount = require('../models/RepaymentDiscount');
const RepaymentInterest = require('../models/RepaymentInterest');

class TierValidationService {
    /**
     * Validate tier sequence (no gaps, no overlaps, chronological order)
     * @param {Array} tiers - Array of tier objects with periodStart and periodEnd
     * @returns {Object} - { valid: boolean, errors: [] }
     */
    static validateTierSequence(tiers) {
        const errors = [];

        if (!tiers || tiers.length === 0) {
            return { valid: true, errors: [] }; // Empty is valid
        }

        // Sort by periodStart
        const sortedTiers = [...tiers].sort((a, b) => a.periodStart - b.periodStart);

        // Check for negative or zero periods
        sortedTiers.forEach((tier, index) => {
            if (tier.periodStart < 0) {
                errors.push(`Tier ${index + 1}: Period start cannot be negative`);
            }
            if (tier.periodEnd < 0) {
                errors.push(`Tier ${index + 1}: Period end cannot be negative`);
            }
            if (tier.periodEnd <= tier.periodStart) {
                errors.push(`Tier ${index + 1}: Period end must be greater than period start`);
            }
        });

        // Check for overlaps
        for (let i = 0; i < sortedTiers.length - 1; i++) {
            const current = sortedTiers[i];
            const next = sortedTiers[i + 1];

            if (current.periodEnd >= next.periodStart) {
                errors.push(
                    `Overlap detected: Tier "${current.tierName || i + 1}" ends at day ${current.periodEnd}, ` +
                    `but Tier "${next.tierName || i + 2}" starts at day ${next.periodStart}. ` +
                    `The next tier should start at day ${current.periodEnd + 1} to prevent overlapping.`
                );
            }
        }

        return {
            valid: errors.length === 0,
            errors,
        };
    }

    /**
     * Validate that discount and interest tiers are properly separated
     * Ensures discount periods come before interest periods with a neutral zone
     * @returns {Object} - { valid: boolean, errors: [], warnings: [] }
     */
    static async validateDiscountInterestSeparation() {
        const errors = [];
        const warnings = [];

        try {
            const discountTiers = await RepaymentDiscount.find({ isActive: true })
                .sort({ periodEnd: -1 })
                .limit(1);

            const interestTiers = await RepaymentInterest.find({ isActive: true })
                .sort({ periodStart: 1 })
                .limit(1);

            if (discountTiers.length === 0 && interestTiers.length === 0) {
                warnings.push('No active discount or interest tiers configured');
                return { valid: true, errors, warnings };
            }

            if (discountTiers.length > 0 && interestTiers.length === 0) {
                warnings.push('Only discount tiers configured, no interest tiers');
                return { valid: true, errors, warnings };
            }

            if (discountTiers.length === 0 && interestTiers.length > 0) {
                warnings.push('Only interest tiers configured, no discount tiers');
                return { valid: true, errors, warnings };
            }

            const lastDiscountEnd = discountTiers[0].periodEnd;
            const firstInterestStart = interestTiers[0].periodStart;

            // CRITICAL: There must be a neutral zone (gap) between discounts and interests
            if (lastDiscountEnd >= firstInterestStart) {
                errors.push(
                    `CRITICAL: Discount periods must end BEFORE interest periods begin. ` +
                    `Last discount ends at day ${lastDiscountEnd}, ` +
                    `but first interest starts at day ${firstInterestStart}. ` +
                    `There must be a neutral zone (e.g., 90-105 days with 0% discount and 0% interest).`
                );
            } else {
                const gapDays = firstInterestStart - lastDiscountEnd - 1;
                if (gapDays < 1) {
                    warnings.push(
                        `Very small neutral zone (${gapDays} day(s)) between discounts and interests. ` +
                        `Consider increasing the gap for clarity.`
                    );
                } else {
                    warnings.push(
                        `Neutral zone exists: Days ${lastDiscountEnd + 1} to ${firstInterestStart - 1} ` +
                        `(${gapDays} days) have 0% discount and 0% interest.`
                    );
                }
            }

            return {
                valid: errors.length === 0,
                errors,
                warnings,
            };
        } catch (error) {
            errors.push(`Database error: ${error.message}`);
            return { valid: false, errors, warnings };
        }
    }

    /**
     * Comprehensive validation before saving a new discount tier
     * @param {Object} newTier - New tier data { periodStart, periodEnd, discountRate, ... }
     * @param {String} excludeId - Optional: ID to exclude from overlap check (for updates)
     * @returns {Object} - { valid: boolean, errors: [], warnings: [] }
     */
    static async validateNewDiscountTier(newTier, excludeId = null) {
        const errors = [];
        const warnings = [];

        try {
            // Basic validation
            if (newTier.periodEnd <= newTier.periodStart) {
                errors.push('Period end must be greater than period start');
            }

            if (newTier.discountRate < 0 || newTier.discountRate > 100) {
                errors.push('Discount rate must be between 0 and 100');
            }

            // Check for overlaps with existing discount tiers
            await RepaymentDiscount.validateNoOverlap(
                newTier.periodStart,
                newTier.periodEnd,
                excludeId
            );

            // Check if this tier will conflict with interest tiers
            const interestTiers = await RepaymentInterest.find({ isActive: true });
            if (interestTiers.length > 0) {
                const firstInterestStart = Math.min(...interestTiers.map(t => t.periodStart));

                if (newTier.periodEnd >= firstInterestStart) {
                    errors.push(
                        `This discount tier (ending at day ${newTier.periodEnd}) would overlap with ` +
                        `existing interest tier (starting at day ${firstInterestStart}). ` +
                        `Discount tiers must end before interest tiers begin.`
                    );
                }
            }

            // Warnings for high discount rates
            if (newTier.discountRate > 20) {
                warnings.push(`Discount rate of ${newTier.discountRate}% is unusually high. Verify this is intentional.`);
            }

            return {
                valid: errors.length === 0,
                errors,
                warnings,
            };
        } catch (error) {
            if (error.message.includes('overlaps')) {
                errors.push(error.message);
            } else {
                errors.push(`Validation error: ${error.message}`);
            }
            return { valid: false, errors, warnings };
        }
    }

    /**
     * Comprehensive validation before saving a new interest tier
     * @param {Object} newTier - New tier data { periodStart, periodEnd, interestRate, isOpenEnded, ... }
     * @param {String} excludeId - Optional: ID to exclude from overlap check (for updates)
     * @returns {Object} - { valid: boolean, errors: [], warnings: [] }
     */
    static async validateNewInterestTier(newTier, excludeId = null) {
        const errors = [];
        const warnings = [];

        try {
            // Basic validation
            if (!newTier.isOpenEnded && newTier.periodEnd <= newTier.periodStart) {
                errors.push('Period end must be greater than period start (unless tier is open-ended)');
            }

            if (newTier.interestRate < 0 || newTier.interestRate > 100) {
                errors.push('Interest rate must be between 0 and 100');
            }

            // Check for overlaps with existing interest tiers
            await RepaymentInterest.validateNoOverlap(
                newTier.periodStart,
                newTier.periodEnd,
                newTier.isOpenEnded,
                excludeId
            );

            // Check if this tier will conflict with discount tiers
            const discountTiers = await RepaymentDiscount.find({ isActive: true });
            if (discountTiers.length > 0) {
                const lastDiscountEnd = Math.max(...discountTiers.map(t => t.periodEnd));

                if (newTier.periodStart <= lastDiscountEnd) {
                    errors.push(
                        `This interest tier (starting at day ${newTier.periodStart}) would overlap with ` +
                        `existing discount tier (ending at day ${lastDiscountEnd}). ` +
                        `Interest tiers must start after discount tiers end.`
                    );
                }
            }

            // Warnings for high interest rates
            if (newTier.interestRate > 15) {
                warnings.push(`Interest rate of ${newTier.interestRate}% is very high. Verify this is intentional.`);
            }

            return {
                valid: errors.length === 0,
                errors,
                warnings,
            };
        } catch (error) {
            if (error.message.includes('overlaps')) {
                errors.push(error.message);
            } else {
                errors.push(`Validation error: ${error.message}`);
            }
            return { valid: false, errors, warnings };
        }
    }

    /**
     * Get comprehensive tier configuration status
     * @returns {Object} - Full system status
     */
    static async getSystemStatus() {
        try {
            const discountTiers = await RepaymentDiscount.find({ isActive: true })
                .sort({ periodStart: 1 });
            const interestTiers = await RepaymentInterest.find({ isActive: true })
                .sort({ periodStart: 1 });

            const discountValidation = this.validateTierSequence(discountTiers);
            const interestValidation = this.validateTierSequence(interestTiers);
            const separationValidation = await this.validateDiscountInterestSeparation();

            const allErrors = [
                ...discountValidation.errors,
                ...interestValidation.errors,
                ...separationValidation.errors,
            ];

            const allWarnings = [
                ...separationValidation.warnings,
            ];

            return {
                isHealthy: allErrors.length === 0,
                discountTiers: {
                    count: discountTiers.length,
                    tiers: discountTiers.map(t => ({
                        id: t._id,
                        name: t.tierName,
                        period: `${t.periodStart}-${t.periodEnd} days`,
                        rate: `${t.discountRate}%`,
                    })),
                    valid: discountValidation.valid,
                    errors: discountValidation.errors,
                },
                interestTiers: {
                    count: interestTiers.length,
                    tiers: interestTiers.map(t => ({
                        id: t._id,
                        name: t.tierName,
                        period: t.isOpenEnded ? `${t.periodStart}+ days` : `${t.periodStart}-${t.periodEnd} days`,
                        rate: `${t.interestRate}%`,
                    })),
                    valid: interestValidation.valid,
                    errors: interestValidation.errors,
                },
                separation: separationValidation,
                errors: allErrors,
                warnings: allWarnings,
            };
        } catch (error) {
            return {
                isHealthy: false,
                errors: [`System status check failed: ${error.message}`],
                warnings: [],
            };
        }
    }
}

module.exports = TierValidationService;
