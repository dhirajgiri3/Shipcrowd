/**
 * Volumetric Weight Utility
 * 
 * Handles volumetric weight calculations for different carriers with
 * carrier-specific DIM factors and unit conversion support.
 */

// Carrier-specific dimensional weight factors
export const DIM_FACTORS: Record<string, number> = {
    delhivery: 5000,
    ekart: 4750, // Ekart uses a different DIM factor
    velocity: 5000,
    default: 5000,
};

// Unit conversion constants
const CM_TO_INCH = 0.393701;
const INCH_TO_CM = 2.54;

export type DimensionUnit = 'cm' | 'inch';

export interface Dimensions {
    length: number;
    width: number;
    height: number;
    unit?: DimensionUnit;
}

/**
 * VolumetricWeightCalculator
 * 
 * Provides utility methods for calculating volumetric and chargeable weights
 */
export class VolumetricWeightCalculator {
    /**
     * Convert dimensions to centimeters
     */
    private static convertToCm(dimensions: Dimensions): { length: number; width: number; height: number } {
        if (!dimensions.unit || dimensions.unit === 'cm') {
            return {
                length: dimensions.length,
                width: dimensions.width,
                height: dimensions.height,
            };
        }

        // Convert from inches to cm
        return {
            length: dimensions.length * INCH_TO_CM,
            width: dimensions.width * INCH_TO_CM,
            height: dimensions.height * INCH_TO_CM,
        };
    }

    /**
     * Get DIM factor for a carrier
     */
    static getDimFactor(carrierId?: string): number {
        if (!carrierId) {
            return DIM_FACTORS.default;
        }

        const normalizedCarrierId = carrierId.toLowerCase();
        return DIM_FACTORS[normalizedCarrierId] || DIM_FACTORS.default;
    }

    /**
     * Calculate volumetric weight in kg
     * 
     * Formula: (L × W × H in cm) / DIM_FACTOR
     * 
     * @param dimensions - Package dimensions (default unit: cm)
     * @param dimFactor - Dimensional weight factor (optional, defaults to 5000)
     * @returns Volumetric weight in kg
     */
    static calculateVolumetricWeight(
        dimensions: Dimensions,
        dimFactor: number = DIM_FACTORS.default
    ): number {
        const dimensionsInCm = this.convertToCm(dimensions);
        return (dimensionsInCm.length * dimensionsInCm.width * dimensionsInCm.height) / dimFactor;
    }

    /**
     * Calculate volumetric weight for a specific carrier
     * 
     * @param dimensions - Package dimensions
     * @param carrierId - Carrier identifier (e.g., 'delhivery', 'ekart', 'velocity')
     * @returns Volumetric weight in kg
     */
    static calculate(dimensions: Dimensions, carrierId?: string): number {
        const dimFactor = this.getDimFactor(carrierId);
        return this.calculateVolumetricWeight(dimensions, dimFactor);
    }

    /**
     * Get chargeable weight (max of actual and volumetric)
     * 
     * @param actualWeight - Actual weight in kg
     * @param volumetricWeight - Volumetric weight in kg
     * @returns Chargeable weight in kg
     */
    static getChargeableWeight(actualWeight: number, volumetricWeight: number): number {
        return Math.max(actualWeight, volumetricWeight);
    }

    /**
     * Calculate chargeable weight directly
     * 
     * @param actualWeight - Actual weight in kg
     * @param dimensions - Package dimensions
     * @param carrierId - Carrier identifier
     * @returns Chargeable weight in kg
     */
    static calculateChargeableWeight(
        actualWeight: number,
        dimensions: Dimensions,
        carrierId?: string
    ): number {
        const volumetricWeight = this.calculate(dimensions, carrierId);
        return this.getChargeableWeight(actualWeight, volumetricWeight);
    }

    /**
     * Get detailed weight breakdown
     * 
     * @param actualWeight - Actual weight in kg
     * @param dimensions - Package dimensions
     * @param carrierId - Carrier identifier
     * @returns Object containing actual, volumetric, and chargeable weights with metadata
     */
    static getWeightBreakdown(
        actualWeight: number,
        dimensions: Dimensions,
        carrierId?: string
    ): {
        actualWeight: number;
        volumetricWeight: number;
        chargeableWeight: number;
        usedWeight: 'actual' | 'volumetric';
        dimFactor: number;
        carrier: string;
    } {
        const carrier = carrierId || 'default';
        const dimFactor = this.getDimFactor(carrierId);
        const volumetricWeight = this.calculateVolumetricWeight(dimensions, dimFactor);
        const chargeableWeight = this.getChargeableWeight(actualWeight, volumetricWeight);

        return {
            actualWeight,
            volumetricWeight,
            chargeableWeight,
            usedWeight: chargeableWeight === actualWeight ? 'actual' : 'volumetric',
            dimFactor,
            carrier,
        };
    }
}

// Legacy helper functions (for backward compatibility with existing code)

/**
 * Calculate volumetric weight (legacy function)
 * @deprecated Use VolumetricWeightCalculator.calculateVolumetricWeight instead
 */
export function calculateVolumetricWeight(
    dimensions: { length: number; width: number; height: number }
): number {
    return VolumetricWeightCalculator.calculateVolumetricWeight(dimensions);
}

/**
 * Get shipping weight (legacy function)
 * @deprecated Use VolumetricWeightCalculator.calculateChargeableWeight instead
 */
export function getShippingWeight(
    actualWeight: number,
    dimensions: { length: number; width: number; height: number }
): number {
    return VolumetricWeightCalculator.calculateChargeableWeight(actualWeight, dimensions);
}
