import { describe, expect, it } from '@jest/globals';
import { VolumetricWeightCalculator } from '../../../src/shared/utils/volumetric-weight.util';

describe('VolumetricWeightCalculator', () => {
    describe('calculate', () => {
        it('should calculate volumetric weight correctly for Delhivery', () => {
            const result = VolumetricWeightCalculator.calculate(
                { length: 30, width: 30, height: 30, unit: 'cm' },
                'delhivery'
            );
            expect(result).toBe(5.4); // (30*30*30)/5000 = 5.4
        });

        it('should use different DIM factor for Ekart', () => {
            const result = VolumetricWeightCalculator.calculate(
                { length: 30, width: 30, height: 30, unit: 'cm' },
                'ekart'
            );
            expect(result).toBeCloseTo(5.68, 2); // (30*30*30)/4750 ≈ 5.68
        });

        it('should use default DIM factor for unknown carrier', () => {
            const result = VolumetricWeightCalculator.calculate(
                { length: 30, width: 30, height: 30, unit: 'cm' },
                'unknown_carrier'
            );
            expect(result).toBe(5.4); // (30*30*30)/5000 = 5.4 (default)
        });

        it('should calculate correctly for Velocity', () => {
            const result = VolumetricWeightCalculator.calculate(
                { length: 30, width: 30, height: 30, unit: 'cm' },
                'velocity'
            );
            expect(result).toBe(5.4); // (30*30*30)/5000 = 5.4
        });
    });

    describe('getChargeableWeight', () => {
        it('should return actual weight when it is greater', () => {
            const result = VolumetricWeightCalculator.getChargeableWeight(10, 5);
            expect(result).toBe(10);
        });

        it('should return volumetric weight when it is greater', () => {
            const result = VolumetricWeightCalculator.getChargeableWeight(2, 5);
            expect(result).toBe(5);
        });

        it('should return same value when both are equal', () => {
            const result = VolumetricWeightCalculator.getChargeableWeight(5, 5);
            expect(result).toBe(5);
        });
    });

    describe('calculateChargeableWeight', () => {
        it('should calculate chargeable weight for light but bulky package', () => {
            // Light but bulky package
            const result = VolumetricWeightCalculator.calculateChargeableWeight(
                2, // actual weight: 2kg
                { length: 50, width: 50, height: 50, unit: 'cm' },
                'delhivery'
            );
            // Volumetric: (50*50*50)/5000 = 25kg
            expect(result).toBe(25); // Chargeable = max(2, 25) = 25
        });

        it('should calculate chargeable weight for heavy but small package', () => {
            // Heavy but small package
            const result = VolumetricWeightCalculator.calculateChargeableWeight(
                15, // actual weight: 15kg
                { length: 20, width: 20, height: 20, unit: 'cm' },
                'delhivery'
            );
            // Volumetric: (20*20*20)/5000 = 1.6kg
            expect(result).toBe(15); // Chargeable = max(15, 1.6) = 15
        });

        it('should use carrier-specific DIM factor (Ekart)', () => {
            const result = VolumetricWeightCalculator.calculateChargeableWeight(
                1, // actual weight
                { length: 30, width: 30, height: 30, unit: 'cm' },
                'ekart'
            );
            // Ekart DIM: (30*30*30)/4750 ≈ 5.68kg
            expect(result).toBeCloseTo(5.68, 2);
        });
    });

    describe('unit conversion', () => {
        it('should convert inches to cm', () => {
            const resultInch = VolumetricWeightCalculator.calculate(
                { length: 11.81, width: 11.81, height: 11.81, unit: 'inch' },
                'delhivery'
            );
            const resultCm = VolumetricWeightCalculator.calculate(
                { length: 30, width: 30, height: 30, unit: 'cm' },
                'delhivery'
            );
            expect(resultInch).toBeCloseTo(resultCm, 1); // Should be approximately equal
        });

        it('should default to cm when unit not specified', () => {
            const result = VolumetricWeightCalculator.calculate(
                { length: 30, width: 30, height: 30 },
                'delhivery'
            );
            expect(result).toBe(5.4);
        });
    });

    describe('getWeightBreakdown', () => {
        it('should provide complete weight breakdown', () => {
            const breakdown = VolumetricWeightCalculator.getWeightBreakdown(
                5, // actual weight
                { length: 40, width: 40, height: 40, unit: 'cm' },
                'delhivery'
            );

            expect(breakdown.actualWeight).toBe(5);
            expect(breakdown.volumetricWeight).toBeCloseTo(12.8, 1); // (40*40*40)/5000
            expect(breakdown.chargeableWeight).toBeCloseTo(12.8, 1);
            expect(breakdown.usedWeight).toBe('volumetric');
            expect(breakdown.dimFactor).toBe(5000);
            expect(breakdown.carrier).toBe('delhivery');
        });

        it('should indicate when actual weight is used', () => {
            const breakdown = VolumetricWeightCalculator.getWeightBreakdown(
                20, // actual weight
                { length: 20, width: 20, height: 20, unit: 'cm' },
                'velocity'
            );

            expect(breakdown.actualWeight).toBe(20);
            expect(breakdown.volumetricWeight).toBeCloseTo(1.6, 1); // (20*20*20)/5000
            expect(breakdown.chargeableWeight).toBe(20);
            expect(breakdown.usedWeight).toBe('actual');
        });
    });

    describe('getDimFactor', () => {
        it('should return correct DIM factor for each carrier', () => {
            expect(VolumetricWeightCalculator.getDimFactor('delhivery')).toBe(5000);
            expect(VolumetricWeightCalculator.getDimFactor('ekart')).toBe(4750);
            expect(VolumetricWeightCalculator.getDimFactor('velocity')).toBe(5000);
        });

        it('should return default DIM factor for unknown carrier', () => {
            expect(VolumetricWeightCalculator.getDimFactor('unknown')).toBe(5000);
        });

        it('should return default DIM factor when no carrier provided', () => {
            expect(VolumetricWeightCalculator.getDimFactor()).toBe(5000);
        });

        it('should be case-insensitive', () => {
            expect(VolumetricWeightCalculator.getDimFactor('DELHIVERY')).toBe(5000);
            expect(VolumetricWeightCalculator.getDimFactor('Ekart')).toBe(4750);
        });
    });
});
