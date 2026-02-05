
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { RateCardSimulationService, SimulationInput } from '../../../src/core/application/services/pricing/rate-card-simulation.service';
import mongoose from 'mongoose';

// Mock dependencies - use jest.fn() directly in factory
jest.mock('../../../src/infrastructure/database/mongoose/models', () => ({
    Shipment: {
        find: jest.fn()
    },
    RateCard: {}
}));

jest.mock('../../../src/core/application/services/pricing/dynamic-pricing.service', () => ({
    DynamicPricingService: jest.fn().mockImplementation(() => ({
        calculatePricing: jest.fn()
    }))
}));

// Import after mocking
import { Shipment } from '../../../src/infrastructure/database/mongoose/models';

describe('RateCardSimulationService', () => {
    let service: RateCardSimulationService;
    const mockCompanyId = new mongoose.Types.ObjectId().toString();

    beforeEach(() => {
        jest.clearAllMocks();
        service = new RateCardSimulationService();
    });

    describe('simulateRateCardChange', () => {
        const input: SimulationInput = {
            companyId: mockCompanyId,
            proposedRateCardId: 'rc_proposed',
            baselineRateCardId: 'rc_baseline',
            sampleSize: 10
        };

        const mockShipments = [
            {
                _id: 'ship_1',
                companyId: mockCompanyId,
                status: 'delivered',
                carrier: 'Delhivery',
                serviceType: 'Surface',
                deliveryDetails: { address: { postalCode: '400001' } },
                weights: { declared: { value: 1.5, unit: 'kg' }, verified: true },
                paymentDetails: { type: 'prepaid' as const, codAmount: 0 }
            },
            {
                _id: 'ship_2',
                companyId: mockCompanyId,
                status: 'delivered',
                carrier: 'Ekart',
                serviceType: 'Express',
                deliveryDetails: { address: { postalCode: '500001' } },
                weights: { declared: { value: 12, unit: 'kg' }, verified: true },
                paymentDetails: { type: 'cod' as const, codAmount: 1000 }
            }
        ];

        it('should correctly calculate price variance and generate recommendations', async () => {
            // Mock Shipment.find chain
            (Shipment.find as jest.Mock<any>).mockReturnValue({
                sort: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue(mockShipments)
            });

            // Mock Pricing Service response
            const mockCalculatePricing = jest.fn()
                .mockResolvedValueOnce({ total: 100, metadata: { zone: 'A' } } as any)
                .mockResolvedValueOnce({ total: 110, metadata: { zone: 'A' } } as any)
                .mockResolvedValueOnce({ total: 500, metadata: { zone: 'B' } } as any)
                .mockResolvedValueOnce({ total: 600, metadata: { zone: 'B' } } as any);

            service['pricingService'].calculatePricing = mockCalculatePricing;

            const result = await service.simulateRateCardChange(input);

            // Assert Summary
            expect(result.summary.totalShipments).toBe(2);
            expect(result.summary.priceIncreases).toBe(2);

            // Assert Weight Band Analysis exists
            expect(result.breakdown.byWeightBand).toBeDefined();
            expect(result.breakdown.byWeightBand.length).toBeGreaterThan(0);

            // Assert Recommendations exist
            expect(result.recommendations).toBeDefined();
            expect(Array.isArray(result.recommendations)).toBe(true);
        });

        it('should handle outliers correctly', async () => {
            // Mock Shipment.find chain
            (Shipment.find as jest.Mock<any>).mockReturnValue({
                sort: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue([mockShipments[0]])
            });

            // Baseline: 100, Proposed: 150 (+50%)
            const mockCalculatePricing = jest.fn()
                .mockResolvedValueOnce({ total: 100, metadata: { zone: 'A' } } as any)
                .mockResolvedValueOnce({ total: 150, metadata: { zone: 'A' } } as any);

            service['pricingService'].calculatePricing = mockCalculatePricing;

            const result = await service.simulateRateCardChange(input);

            expect(result.outliers.length).toBe(1);
            expect(result.outliers[0].changePercent).toBe(50);
            expect(result.outliers[0].reason).toBe('Significant Increase');
        });

        it('should throw error if no shipments found', async () => {
            (Shipment.find as jest.Mock<any>).mockReturnValue({
                sort: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue([])
            });

            await expect(service.simulateRateCardChange(input))
                .rejects
                .toThrow('No shipments found for simulation');
        });
    });
});
