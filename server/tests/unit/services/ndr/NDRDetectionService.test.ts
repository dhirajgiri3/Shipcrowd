import NDRDetectionService from '../../../../src/core/application/services/ndr/ndr-detection.service';
import { NDREvent } from '../../../../src/infrastructure/database/mongoose/models';
import { IShipment } from '../../../../src/infrastructure/database/mongoose/models';

// Mock the NDREvent model
jest.mock('../../../../src/infrastructure/database/mongoose/models/logistics/shipping/exceptions/ndr-event.model');

describe('NDRDetectionService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('isNDRStatus', () => {
        it('should detect NDR from failed_delivery status', () => {
            const result = NDRDetectionService.isNDRStatus('failed_delivery');
            expect(result).toBe(true);
        });

        it('should detect NDR from ndr status', () => {
            const result = NDRDetectionService.isNDRStatus('ndr');
            expect(result).toBe(true);
        });

        it('should detect NDR from customer_unavailable status', () => {
            const result = NDRDetectionService.isNDRStatus('customer_unavailable');
            expect(result).toBe(true);
        });

        it('should not detect NDR from delivered status', () => {
            const result = NDRDetectionService.isNDRStatus('delivered');
            expect(result).toBe(false);
        });

        it('should not detect NDR from in_transit status', () => {
            const result = NDRDetectionService.isNDRStatus('in_transit');
            expect(result).toBe(false);
        });
    });

    describe('extractNDRReason', () => {
        it('should extract "customer not available" from remarks', () => {
            const remarks = 'Delivery failed - customer not available at address';
            const reason = NDRDetectionService.extractNDRReason(remarks);

            expect(reason).toContain('customer not available');
        });

        it('should extract "wrong address" from remarks', () => {
            const remarks = 'Could not deliver - wrong address provided';
            const reason = NDRDetectionService.extractNDRReason(remarks);

            expect(reason).toContain('wrong address');
        });

        it('should extract "refused" from remarks', () => {
            const remarks = 'Customer refused to accept the package';
            const reason = NDRDetectionService.extractNDRReason(remarks);

            expect(reason).toContain('refused');
        });

        it('should return original remarks if no specific keyword found', () => {
            const remarks = 'Some other delivery issue';
            const reason = NDRDetectionService.extractNDRReason(remarks);

            expect(reason).toBe(remarks);
        });
    });

    describe('detectNDRFromTracking', () => {
        const mockShipment: Partial<IShipment> & { awb?: string } = {
            _id: '507f1f77bcf86cd799439011' as any,
            trackingNumber: 'TRK123456',
            awb: 'TRK123456',
            companyId: '507f1f77bcf86cd799439012' as any,
            orderId: '507f1f77bcf86cd799439013' as any,
        };

        const mockTrackingUpdate = {
            awb: 'TRK123456',
            status: 'failed_delivery',
            remarks: 'Customer not available',
            location: 'Mumbai',
            timestamp: new Date(),
        };

        it('should create NDR event when tracking status indicates failure', async () => {
            // Mock findOne to return null (no duplicates)
            (NDREvent.findOne as jest.Mock).mockResolvedValue(null);
            // Mock countDocuments for attempt calculation
            (NDREvent.countDocuments as jest.Mock).mockResolvedValue(0);

            // Mock createNDREvent
            const mockNDREvent = {
                _id: 'ndr123',
                shipment: mockShipment._id,
                awb: 'TRK123456',
                ndrReason: 'Customer not available',
                attemptNumber: 1,
                save: jest.fn().mockResolvedValue(true),
            };
            (NDREvent.createNDREvent as jest.Mock).mockResolvedValue(mockNDREvent);

            const result = await NDRDetectionService.detectNDRFromTracking(
                mockTrackingUpdate,
                mockShipment as any
            );

            expect(result).toBeDefined();
            expect(result.isNDR).toBe(true);
            expect(result.ndrEvent).toBeDefined();
            expect(NDREvent.createNDREvent).toHaveBeenCalled();
        });

        it('should not create duplicate NDR within 24 hours', async () => {
            // Mock findOne to return an existing NDR (duplicate exists)
            (NDREvent.findOne as jest.Mock).mockResolvedValue({
                _id: 'existing-ndr',
            });

            const result = await NDRDetectionService.detectNDRFromTracking(
                mockTrackingUpdate,
                mockShipment as any
            );

            expect(result.isNDR).toBe(true);
            expect(result.reason).toBe('Duplicate NDR');
            expect(NDREvent.createNDREvent).not.toHaveBeenCalled();
        });

        it('should increment attempt number for repeated NDRs', async () => {
            // Mock findOne to return null (no duplicates within 24h)
            (NDREvent.findOne as jest.Mock).mockResolvedValue(null);

            // Mock countDocuments to return 1 (one previous NDR exists)
            (NDREvent.countDocuments as jest.Mock).mockResolvedValue(1);

            const mockNDREvent = {
                _id: 'ndr124',
                attemptNumber: 2,
                save: jest.fn().mockResolvedValue(true),
            };
            (NDREvent.createNDREvent as jest.Mock).mockResolvedValue(mockNDREvent);

            const result = await NDRDetectionService.detectNDRFromTracking(
                mockTrackingUpdate,
                mockShipment as any
            );

            expect(result).toBeDefined();
            expect(result.ndrEvent?.attemptNumber).toBe(2);
        });

        it('should auto-calculate resolution deadline (48 hours from detection)', async () => {
            const now = new Date();
            const expectedDeadline = new Date(now.getTime() + 48 * 60 * 60 * 1000);

            (NDREvent.findOne as jest.Mock).mockResolvedValue(null);
            (NDREvent.countDocuments as jest.Mock).mockResolvedValue(0);

            const mockNDREvent = {
                _id: 'ndr125',
                resolutionDeadline: expectedDeadline,
                save: jest.fn().mockResolvedValue(true),
            };
            (NDREvent.createNDREvent as jest.Mock).mockResolvedValue(mockNDREvent);

            const result = await NDRDetectionService.detectNDRFromTracking(
                mockTrackingUpdate,
                mockShipment as any
            );

            expect(result).toBeDefined();
            expect(result.ndrEvent).toBeDefined();
            // Check deadline is approximately 48 hours from now (within 1 minute tolerance)
            const deadlineDiff = result.ndrEvent!.resolutionDeadline.getTime() - now.getTime();
            expect(deadlineDiff).toBeGreaterThan(47.9 * 60 * 60 * 1000);
            expect(deadlineDiff).toBeLessThan(48.1 * 60 * 60 * 1000);
        });
    });
});
