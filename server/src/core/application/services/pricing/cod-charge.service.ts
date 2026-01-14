/**
 * COD Charge Service
 * 
 * Purpose: Calculate Cash-on-Delivery surcharges
 * Logic: Max of (percentage × order value, minimum charge)
 * 
 * Industry Standard:
 * - Percentage: 2% of order value
 * - Minimum: ₹30
 * 
 * Examples:
 * - Order ₹1000 → 2% = ₹20 → Use ₹30 (minimum)
 * - Order ₹2000 → 2% = ₹40 → Use ₹40
 * - Order ₹5000 → 2% = ₹100 → Use ₹100
 */
export class CODChargeService {
    private readonly DEFAULT_PERCENTAGE = 0.02; // 2%
    private readonly DEFAULT_MINIMUM = 30;      // ₹30

    /**
     * Calculate COD charge based on RateCard or defaults
     * 
     * @param orderValue - Total order value (invoice amount)
     * @param rateCard - Optional RateCard with custom COD settings
     * @returns COD charge amount
     */
    calculateCODCharge(orderValue: number, rateCard?: any): number {
        if (orderValue <= 0) {
            return 0;
        }

        const percentage = rateCard?.codCharges?.percentage || this.DEFAULT_PERCENTAGE;
        const minimum = rateCard?.codCharges?.minimum || this.DEFAULT_MINIMUM;

        const percentageCharge = orderValue * percentage;
        const codCharge = Math.max(percentageCharge, minimum);

        // Round to 2 decimal places
        return Math.round(codCharge * 100) / 100;
    }

    /**
     * Calculate COD charges for multiple orders (bulk)
     */
    calculateBulkCODCharges(
        orders: Array<{ orderValue: number }>,
        rateCard?: any
    ): Array<{ orderValue: number; codCharge: number }> {
        return orders.map(order => ({
            orderValue: order.orderValue,
            codCharge: this.calculateCODCharge(order.orderValue, rateCard),
        }));
    }

    /**
     * Get COD configuration for a RateCard
     */
    getCODConfig(rateCard?: any): {
        percentage: number;
        minimum: number;
        formula: string;
    } {
        const percentage = rateCard?.codCharges?.percentage || this.DEFAULT_PERCENTAGE;
        const minimum = rateCard?.codCharges?.minimum || this.DEFAULT_MINIMUM;

        return {
            percentage,
            minimum,
            formula: `Max(${percentage * 100}% of order value, ₹${minimum})`,
        };
    }

    /**
     * Validate if COD is allowed for given order value
     * 
     * @param orderValue - Order value to validate
     * @param maxCODLimit - Maximum allowed COD value (company setting)
     * @returns true if COD allowed
     */
    isCODAllowed(orderValue: number, maxCODLimit: number = 50000): boolean {
        return orderValue > 0 && orderValue <= maxCODLimit;
    }
}

// Singleton instance
let codChargeServiceInstance: CODChargeService | null = null;

export function getCODChargeService(): CODChargeService {
    if (!codChargeServiceInstance) {
        codChargeServiceInstance = new CODChargeService();
    }
    return codChargeServiceInstance;
}
