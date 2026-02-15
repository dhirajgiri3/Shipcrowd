
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import WeightDisputeDetectionService from '../../../../src/core/application/services/disputes/weight-dispute-detection.service';
import Shipment from '../../../../src/infrastructure/database/mongoose/models/logistics/shipping/core/shipment.model';
import WeightDispute from '../../../../src/infrastructure/database/mongoose/models/logistics/shipping/exceptions/weight-dispute.model';
import { NotFoundError } from '../../../../src/shared/errors/app.error';

// Mock models
jest.mock('../../../../src/infrastructure/database/mongoose/models/logistics/shipping/core/shipment.model');
jest.mock('../../../../src/infrastructure/database/mongoose/models/logistics/shipping/exceptions/weight-dispute.model');
jest.mock('../../../../src/shared/logger/winston.logger');

// Type helpers for mocks
describe('WeightDisputeDetectionService', () => {
    const mockShipmentId = '654321654321654321654321';
    const mockCompanyId = '123456123456123456123456';

    let mockShipment: any;

    beforeEach(() => {
        jest.clearAllMocks();

        mockShipment = {
            _id: mockShipmentId,
            companyId: mockCompanyId,
            orderId: '987654987654987654987654',
            trackingNumber: 'SHP-20230101-1234',
            packageDetails: { weight: 1.0 }, // 1kg declared
            paymentDetails: { shippingCost: 100 },
            weights: { declared: { value: 1.0, unit: 'kg' } },
            save: jest.fn<() => Promise<boolean>>().mockResolvedValue(true),
        };

        (Shipment.findById as jest.MockedFunction<any>).mockResolvedValue(mockShipment);
    });

    describe('detectOnCarrierScan', () => {
        it('should NOT create dispute when discrepancy is within 5% threshold', async () => {
            // Act: 1.04kg (4% discrepancy)
            const result = await WeightDisputeDetectionService.detectOnCarrierScan(
                mockShipmentId,
                { value: 1.04, unit: 'kg' },
                { scannedAt: new Date(), carrierName: 'Velocity' }
            );

            // Assert
            expect(result).toBeNull();
            expect(mockShipment.weights.verified).toBe(true);
            expect(mockShipment.save).toHaveBeenCalled();
            expect(WeightDispute).not.toHaveBeenCalled();
        });

        it('should create dispute when discrepancy exceeds 5%', async () => {
            // Act: 1.1kg (10% discrepancy)
            const mockDispute = {
                _id: 'dispute123',
                disputeId: 'WD-20230101-ABCDE',
                detectedAt: new Date(),
                financialImpact: { difference: 10 }
            };

            (WeightDispute as jest.MockedFunction<any>).mockImplementation(() => ({
                save: jest.fn<() => Promise<typeof mockDispute>>().mockResolvedValue(mockDispute),
                ...mockDispute
            }));

            const result = await WeightDisputeDetectionService.detectOnCarrierScan(
                mockShipmentId,
                { value: 1.1, unit: 'kg' },
                { scannedAt: new Date(), carrierName: 'Velocity' }
            );

            // Assert
            expect(result).toBeDefined();
            expect(WeightDispute).toHaveBeenCalled();
            expect(mockShipment.weights.verified).toBe(true);
            expect(mockShipment.weightDispute.exists).toBe(true);
            expect(mockShipment.weightDispute.disputeId).toBeDefined();
        });

        it('should create dispute when financial impact exceeds ₹50', async () => {
            // Setup: 2kg declared, shipping cost 200 (100/kg). Actual 3kg -> 300 cost. Diff 100 > 50
            mockShipment.packageDetails.weight = 2.0;
            mockShipment.weights.declared.value = 2.0;
            mockShipment.paymentDetails.shippingCost = 200;

            const mockDispute = {
                _id: 'dispute123',
                disputeId: 'WD-20230101-ABCDE',
                detectedAt: new Date(),
                financialImpact: { difference: 100 }
            };

            (WeightDispute as jest.MockedFunction<any>).mockImplementation(() => ({
                save: jest.fn<() => Promise<typeof mockDispute>>().mockResolvedValue(mockDispute),
                ...mockDispute
            }));

            // Act: 3kg (50% discrepancy, ₹100 diff)
            const result = await WeightDisputeDetectionService.detectOnCarrierScan(
                mockShipmentId,
                { value: 3.0, unit: 'kg' },
                { scannedAt: new Date(), carrierName: 'Velocity' }
            );

            // Assert
            expect(result).toBeDefined();
            expect(WeightDispute).toHaveBeenCalled();
        });

        it('should handle weight unit conversion (g to kg)', async () => {
            // Act: 1040g = 1.04kg (4% diff - no dispute)
            const result = await WeightDisputeDetectionService.detectOnCarrierScan(
                mockShipmentId,
                { value: 1040, unit: 'g' },
                { scannedAt: new Date(), carrierName: 'Velocity' }
            );

            // Assert
            expect(result).toBeNull();
            expect(mockShipment.weights.actual.value).toBe(1.04);
            expect(mockShipment.weights.actual.unit).toBe('kg');
        });

        it('should throw error if shipment not found', async () => {
            (Shipment.findById as jest.MockedFunction<any>).mockResolvedValue(null);

            await expect(WeightDisputeDetectionService.detectOnCarrierScan(
                mockShipmentId,
                { value: 1.0, unit: 'kg' },
                { scannedAt: new Date(), carrierName: 'Velocity' }
            )).rejects.toThrow(NotFoundError);
        });
    });
});
