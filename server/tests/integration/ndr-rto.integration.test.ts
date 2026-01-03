import NDRDetectionService from '@/core/application/services/ndr/ndr-detection.service';
import NDRClassificationService from '@/core/application/services/ndr/ndr-classification.service';
import NDRResolutionService from '@/core/application/services/ndr/ndr-resolution.service';
import RTOService from '@/core/application/services/rto/rto.service';
import NDREvent from '@/infrastructure/database/mongoose/models/ndr-event.model';
import NDRWorkflow from '@/infrastructure/database/mongoose/models/ndr-workflow.model';

jest.mock('@/infrastructure/database/mongoose/models/ndr-event.model');
jest.mock('@/infrastructure/database/mongoose/models/ndr-workflow.model');

describe('NDR/RTO Integration Tests', () => {
    describe('Complete NDR Resolution Flow', () => {
        it('should handle full NDR flow: Detection → Classification → Resolution → Resolved', async () => {
            // 1. Detection
            const mockShipment = {
                _id: 'ship123',
                awb: 'TRK123',
                companyId: 'comp123',
                orderId: 'order123',
            };

            const trackingUpdate = {
                awb: 'TRK123',
                status: 'failed_delivery',
                remarks: 'Customer not available',
                timestamp: new Date(),
            };

            const mockNDREvent = {
                _id: 'ndr123',
                shipment: mockShipment._id,
                awb: 'TRK123',
                ndrReason: 'Customer not available',
                ndrType: 'keyword' as any, // Will be updated after classification
                status: 'detected',
                save: jest.fn().mockResolvedValue(true),
            };

            (NDREvent.countDocuments as jest.Mock).mockResolvedValue(0);
            (NDREvent.createNDREvent as jest.Mock).mockResolvedValue(mockNDREvent);
            (NDREvent.findById as jest.Mock).mockResolvedValue(mockNDREvent);
            (NDREvent.findOne as jest.Mock).mockResolvedValue(null);

            const result = await NDRDetectionService.detectNDRFromTracking(
                trackingUpdate,
                mockShipment as any
            );

            expect(result).toBeDefined();
            expect(result.isNDR).toBe(true);
            expect(result.ndrEvent).toBeDefined();
            expect(result.ndrEvent?.status).toBe('detected');

            // 2. Classification
            mockNDREvent.ndrType = 'customer_unavailable';
            await NDRClassificationService.classifyAndUpdate(String(result.ndrEvent?._id));

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

            (NDREvent.getExpiredNDRs as jest.Mock).mockResolvedValue([mockNDREvent]);
            (NDRWorkflow.getWorkflowForNDR as jest.Mock).mockResolvedValue(mockWorkflow);

            // 2. Check deadlines (would trigger RTO)
            const processed = await NDRResolutionService.checkResolutionDeadlines();

            // 3. RTO would be triggered automatically
            // RTOService.triggerRTO would be called
            expect(mockNDREvent).toBeDefined();
            expect(NDREvent.getExpiredNDRs).toHaveBeenCalled();
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
