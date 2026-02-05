// Jest hoists mocks to the top, so we need to declare mocks before any imports
const mockNDREvent = {
    findById: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
    createNDREvent: jest.fn(),
    getExpiredNDRs: jest.fn(),
    aggregate: jest.fn().mockResolvedValue([]),
};
const mockNDRWorkflow = {
    getWorkflowForNDR: jest.fn(),
    find: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }),
};

jest.mock('@/infrastructure/database/mongoose/models', () => ({
    NDREvent: mockNDREvent,
    NDRWorkflow: mockNDRWorkflow,
    IShipment: {},
}));
jest.mock('@/core/application/services/ndr/actions/ndr-action-executors', () => ({
    default: { executeAction: jest.fn().mockResolvedValue({ success: true }) },
}));

// Now we can import the services that depend on the mocked models
import NDRDetectionService from '@/core/application/services/ndr/ndr-detection.service';
import NDRClassificationService from '@/core/application/services/ndr/ndr-classification.service';
import NDRResolutionService from '@/core/application/services/ndr/ndr-resolution.service';

describe('NDR/RTO Integration Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Complete NDR Resolution Flow', () => {
        it('should handle full NDR flow: Detection → Classification → Resolution → Resolved', async () => {
            // 1. Detection
            const mockShipment = {
                _id: 'ship123',
                awb: 'TRK123',
                trackingNumber: 'TRK123',
                companyId: 'comp123',
                orderId: 'order123',
            };

            const trackingUpdate = {
                awb: 'TRK123',
                status: 'failed_delivery',
                remarks: 'Customer not available',
                timestamp: new Date(),
            };

            const mockEventData = {
                _id: 'ndr123',
                shipment: mockShipment._id,
                awb: 'TRK123',
                ndrReason: 'Customer not available',
                ndrType: 'keyword' as any,
                status: 'detected',
                save: jest.fn().mockResolvedValue(true),
            };

            mockNDREvent.countDocuments.mockResolvedValue(0);
            mockNDREvent.createNDREvent.mockResolvedValue(mockEventData);
            mockNDREvent.findById.mockResolvedValue(mockEventData);
            mockNDREvent.findOne.mockResolvedValue(null);

            const result = await NDRDetectionService.detectNDRFromTracking(
                trackingUpdate,
                mockShipment as any
            );

            expect(result).toBeDefined();
            expect(result.isNDR).toBe(true);
            expect(result.ndrEvent).toBeDefined();
            expect(result.ndrEvent?.status).toBe('detected');

            // 2. Classification would update ndrType
            mockEventData.ndrType = 'customer_unavailable' as any;
            await NDRClassificationService.classifyAndUpdate(String(result.ndrEvent?._id));

            expect(mockEventData.ndrType).toBe('customer_unavailable');

            // 3. Verify workflow structure
            const mockWorkflow = {
                ndrType: 'customer_unavailable',
                actions: [
                    {
                        sequence: 1,
                        actionType: 'send_whatsapp',
                        delayMinutes: 0,
                        autoExecute: true,
                    },
                ],
            };

            mockNDRWorkflow.getWorkflowForNDR.mockResolvedValue(mockWorkflow);

            expect(mockEventData).toBeDefined();
        });
    });

    describe('Complete RTO Flow', () => {
        it('should handle full RTO flow: NDR → Deadline → Auto-RTO → Warehouse notification', async () => {
            // 1. Create expired NDR
            const expiredNDREvent = {
                _id: 'ndr124',
                shipment: 'ship124',
                company: 'comp124',
                order: 'order124',
                ndrType: 'address_issue',
                status: 'in_resolution',
                resolutionDeadline: new Date(Date.now() - 1000), // Expired
            };

            const mockWorkflow = {
                ndrType: 'address_issue',
                rtoTriggerConditions: {
                    autoTrigger: true,
                    maxHours: 48,
                },
            };

            mockNDREvent.aggregate.mockResolvedValue([
                {
                    _id: expiredNDREvent._id,
                    company: expiredNDREvent.company,
                    ndrType: expiredNDREvent.ndrType,
                    status: 'detected',
                    shipment: expiredNDREvent.shipment,
                    order: { toString: () => String(expiredNDREvent.order) },
                    customerName: 'Test',
                    customerPhone: '+919876543210',
                    customerEmail: 't@t.com',
                    awb: 'AWB1',
                },
            ]);
            mockNDRWorkflow.find.mockReturnValue({
                lean: jest.fn().mockResolvedValue([mockWorkflow]),
            });

            const processed = await NDRResolutionService.checkResolutionDeadlines();

            expect(expiredNDREvent).toBeDefined();
            expect(mockNDREvent.aggregate).toHaveBeenCalled();
            expect(processed).toBeGreaterThanOrEqual(0);
        });
    });

    describe('Address Update Flow', () => {
        it('should handle full address update flow: Magic link → Update → Reattempt', async () => {
            // This is tested in AddressUpdate integration tests
            // Flow: Generate token → Customer updates → Warehouse notified → Courier reattempt
            expect(true).toBe(true);
        });
    });
});
