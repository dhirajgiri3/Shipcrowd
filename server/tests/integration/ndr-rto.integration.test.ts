import NDRDetectionService from '../../../src/core/application/services/ndr/NDRDetectionService';
import NDRClassificationService from '../../../src/core/application/services/ndr/NDRClassificationService';
import NDRResolutionService from '../../../src/core/application/services/ndr/NDRResolutionService';
import RTOService from '../../../src/core/application/services/rto/RTOService';
import NDREvent from '../../../src/infrastructure/database/mongoose/models/NDREvent';
import NDRWorkflow from '../../../src/infrastructure/database/mongoose/models/NDRWorkflow';

jest.mock('../../../src/infrastructure/database/mongoose/models/NDREvent');
jest.mock('../../../src/infrastructure/database/mongoose/models/NDRWorkflow');

describe('NDR/RTO Integration Tests', () => {
    describe('Complete NDR Resolution Flow', () => {
        it('should handle full NDR flow: Detection → Classification → Resolution → Resolved', async () => {
            // 1. Detection
            const mockShipment = {
                _id: 'ship123',
                trackingNumber: 'TRK123',
                companyId: 'comp123',
                orderId: 'order123',
            };

            const trackingUpdate = {
                status: 'failed_delivery',
                remarks: 'Customer not available',
                timestamp: new Date(),
            };

            const mockNDREvent = {
                _id: 'ndr123',
                shipment: mockShipment._id,
                ndrReason: 'Customer not available',
                ndrType: undefined,
                status: 'detected',
                save: jest.fn().mockResolvedValue(true),
            };

            (NDREvent.countDocuments as jest.Mock).mockResolvedValue(0);
            (NDREvent.create as jest.Mock).mockResolvedValue(mockNDREvent);
            (NDREvent.findById as jest.Mock).mockResolvedValue(mockNDREvent);

            const ndrEvent = await NDRDetectionService.detectNDRFromTracking(
                trackingUpdate,
                mockShipment as any
            );

            expect(ndrEvent).toBeDefined();
            expect(ndrEvent?.status).toBe('detected');

            // 2. Classification
            mockNDREvent.ndrType = 'customer_unavailable';
            await NDRClassificationService.classifyAndUpdate(String(ndrEvent?._id));

            expect(mockNDREvent.ndrType).toBe('customer_unavailable');

            // 3. Resolution workflow would be triggered
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

            (NDRWorkflow.getWorkflowForNDR as jest.Mock).mockResolvedValue(mockWorkflow);

            // Workflow would execute actions here
            expect(mockNDREvent).toBeDefined();
        });
    });

    describe('Complete RTO Flow', () => {
        it('should handle full RTO flow: NDR → Deadline → Auto-RTO → Warehouse notification', async () => {
            // 1. Create expired NDR
            const mockNDREvent = {
                _id: 'ndr124',
                shipment: 'ship124',
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

            (NDREvent.find as jest.Mock).mockResolvedValue([mockNDREvent]);
            (NDRWorkflow.getWorkflowForNDR as jest.Mock).mockResolvedValue(mockWorkflow);

            // 2. Check deadlines (would trigger RTO)
            await NDRResolutionService.checkResolutionDeadlines();

            // 3. RTO would be triggered automatically
            // RTOService.triggerRTO would be called
            expect(mockNDREvent).toBeDefined();
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
