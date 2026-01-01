import RTOService from '../../../../src/core/application/services/rto/RTOService';
import RTOEvent from '../../../../src/infrastructure/database/mongoose/models/RTOEvent';
import WarehouseNotificationService from '../../../../src/core/application/services/warehouse/WarehouseNotificationService';

jest.mock('../../../../src/infrastructure/database/mongoose/models/RTOEvent');
jest.mock('../../../../src/core/application/services/warehouse/WarehouseNotificationService');

describe('RTOService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('triggerRTO', () => {
        it('should create RTO event with correct fields', async () => {
            const mockShipment = {
                _id: 'shipment123',
                currentStatus: 'ndr',
                companyId: 'company123',
            };

            const mockRTOEvent = {
                _id: 'rto123',
                shipment: mockShipment._id,
                rtoReason: 'ndr_unresolved',
                save: jest.fn().mockResolvedValue(true),
            };

            (RTOEvent.create as jest.Mock).mockResolvedValue(mockRTOEvent);

            const result = await RTOService.triggerRTO(
                'shipment123',
                'ndr_unresolved',
                'ndr123',
                'auto'
            );

            expect(result.success).toBe(true);
            expect(RTOEvent.create).toHaveBeenCalled();
        });

        it('should calculate RTO charges based on shipment', async () => {
            const mockShipment = {
                _id: 'shipment123',
                paymentDetails: {
                    shippingCost: 100,
                },
            };

            const charges = await RTOService.calculateRTOCharges(mockShipment as any);

            expect(charges).toBeGreaterThan(0);
            expect(typeof charges).toBe('number');
        });

        it('should update order status to RTO_INITIATED', async () => {
            const updateStatusSpy = jest.spyOn(RTOService as any, 'updateOrderStatus');

            await RTOService.triggerRTO(
                'shipment123',
                'ndr_unresolved',
                'ndr123',
                'manual'
            );

            expect(updateStatusSpy).toHaveBeenCalled with ('RTO_INITIATED');
        });

        it('should notify warehouse of incoming return', async () => {
            const mockRTOEvent = {
                _id: 'rto124',
                shipment: 'shipment124',
                rtoReason: 'customer_cancellation',
                save: jest.fn().mockResolvedValue(true),
            };

            (RTOEvent.create as jest.Mock).mockResolvedValue(mockRTOEvent);

            await RTOService.triggerRTO(
                'shipment124',
                'customer_cancellation',
                undefined,
                'manual'
            );

            expect(WarehouseNotificationService.notifyRTOIncoming).toHaveBeenCalled();
        });

        it('should prevent RTO on already delivered shipments', async () => {
            const mockShipment = {
                _id: 'shipment125',
                currentStatus: 'delivered',
            };

            // Mock getShipmentInfo to return delivered shipment
            jest.spyOn(RTOService as any, 'getShipmentInfo').mockResolvedValue(mockShipment);

            const result = await RTOService.triggerRTO(
                'shipment125',
                'ndr_unresolved',
                undefined,
                'auto'
            );

            expect(result.success).toBe(false);
            expect(result.error).toContain('delivered');
        });
    });

    describe('getRTOStats', () => {
        it('should return RTO statistics for company', async () => {
            const mockRTOEvents = [
                {
                    company: 'company123',
                    rtoReason: 'ndr_unresolved',
                    rtoCharges: 50,
                },
                {
                    company: 'company123',
                    rtoReason: 'customer_cancellation',
                    rtoCharges: 75,
                },
            ];

            (RTOEvent.find as jest.Mock).mockResolvedValue(mockRTOEvents);

            const stats = await RTOService.getRTOStats('company123');

            expect(stats.total).toBe(2);
            expect(stats.byReason).toBeDefined();
            expect(stats.avgCharges).toBeGreaterThan(0);
        });
    });
});
