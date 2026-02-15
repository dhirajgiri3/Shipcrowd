import NDRActionExecutors from '../../../../src/core/application/services/ndr/actions/ndr-action-executors';
import NDRResolutionService from '../../../../src/core/application/services/ndr/ndr-resolution.service';

jest.mock('../../../../src/infrastructure/database/mongoose/models', () => {
    return {
        NDREvent: {
            findById: jest.fn(() => ({
                populate: jest.fn().mockResolvedValue(null),
            })),
            find: jest.fn(),
            aggregate: jest.fn().mockResolvedValue([]),
        },
        NDRWorkflow: {
            getWorkflowForNDR: jest.fn(),
            find: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }),
        },
    };
});

jest.mock('../../../../src/core/application/services/ndr/actions/ndr-action-executors');

const { NDREvent, NDRWorkflow } = require('../../../../src/infrastructure/database/mongoose/models');
const QueueManager = require('../../../../src/infrastructure/utilities/queue-manager').default;

describe('NDRResolutionService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(QueueManager, 'addJob').mockResolvedValue(undefined as any);
        (NDRWorkflow.find as jest.Mock).mockReturnValue({ lean: jest.fn().mockResolvedValue([]) });
    });

    describe('executeResolutionWorkflow', () => {
        const mockNDREvent = {
            _id: 'ndr123',
            ndrType: 'address_issue',
            status: 'detected',
            company: 'company123',
            shipment: { recipientName: 'John', recipientPhone: '+919876543210', recipientEmail: 'j@test.com' },
            order: {
                recipientDetails: { name: 'John', phone: '+919876543210', email: 'j@test.com' },
                toString: () => 'order123',
            },
            resolutionActions: [],
            save: jest.fn().mockResolvedValue(true),
        };

        const mockWorkflow = {
            ndrType: 'address_issue',
            actions: [
                {
                    sequence: 1,
                    actionType: 'send_whatsapp',
                    delayMinutes: 0,
                    autoExecute: true,
                    actionConfig: {},
                },
                {
                    sequence: 2,
                    actionType: 'update_address',
                    delayMinutes: 60,
                    autoExecute: true,
                    actionConfig: {},
                },
            ],
        };

        it('should execute actions in sequence order', async () => {
            (NDREvent.findById as jest.Mock).mockReturnValue({
                populate: jest.fn().mockResolvedValue(mockNDREvent),
            });
            (NDRWorkflow.getWorkflowForNDR as jest.Mock).mockResolvedValue(mockWorkflow);

            (NDRActionExecutors.executeAction as jest.Mock).mockResolvedValue({
                success: true,
                actionType: 'send_whatsapp',
                result: 'success',
            });

            await NDRResolutionService.executeResolutionWorkflow('ndr123');

            // Should execute first action
            expect(NDRActionExecutors.executeAction).toHaveBeenCalledWith(
                'send_whatsapp',
                expect.any(Object),
                {}
            );
        });

        it('should apply delay between actions', async () => {
            const workflow = {
                ...mockWorkflow,
                actions: [
                    {
                        sequence: 1,
                        actionType: 'send_whatsapp',
                        delayMinutes: 30,
                        autoExecute: true,
                        actionConfig: {},
                    },
                ],
            };

            (NDREvent.findById as jest.Mock).mockReturnValue({
                populate: jest.fn().mockResolvedValue(mockNDREvent),
            });
            (NDRWorkflow.getWorkflowForNDR as jest.Mock).mockResolvedValue(workflow);

            const scheduleActionSpy = jest.spyOn(NDRResolutionService, 'scheduleAction' as any);

            await NDRResolutionService.executeResolutionWorkflow('ndr123');

            // Should schedule action with delay
            expect(scheduleActionSpy).toHaveBeenCalled();
        });

        it('should stop workflow when NDR is resolved', async () => {
            const resolvedNDR = {
                ...mockNDREvent,
                status: 'resolved',
            };

            (NDREvent.findById as jest.Mock).mockReturnValue({
                populate: jest.fn().mockResolvedValue(resolvedNDR),
            });

            await NDRResolutionService.executeResolutionWorkflow('ndr123');

            // Should not execute any actions
            expect(NDRActionExecutors.executeAction).not.toHaveBeenCalled();
        });

        it('should escalate NDR when deadline expires', async () => {
            const expiredAggregateRow = {
                _id: 'ndr123',
                company: 'company123',
                ndrType: 'address_issue',
                status: 'detected',
                shipment: {},
                order: { toString: () => 'order123' },
                customerName: 'John',
                customerPhone: '+919876543210',
                customerEmail: 'j@test.com',
                awb: 'AWB1',
            };
            (NDREvent.aggregate as jest.Mock).mockResolvedValue([expiredAggregateRow]);
            (NDRWorkflow.find as jest.Mock).mockReturnValue({
                lean: jest.fn().mockResolvedValue([
                    { company: 'company123', ndrType: 'address_issue', rtoTriggerConditions: null },
                ]),
            });

            const escalateSpy = jest.spyOn(NDRResolutionService, 'escalateNDR');

            await NDRResolutionService.checkResolutionDeadlines();

            expect(escalateSpy).toHaveBeenCalledWith('ndr123', 'Resolution deadline passed');
        });

        it('should auto-trigger RTO after deadline with auto-trigger enabled', async () => {
            const expiredAggregateRow = {
                _id: 'ndr123',
                company: 'company123',
                ndrType: 'address_issue',
                status: 'detected',
                shipment: {},
                order: { toString: () => 'order123' },
                customerName: 'John',
                customerPhone: '+919876543210',
                customerEmail: 'j@test.com',
                awb: 'AWB1',
            };
            (NDREvent.aggregate as jest.Mock).mockResolvedValue([expiredAggregateRow]);
            (NDRWorkflow.find as jest.Mock).mockReturnValue({
                lean: jest.fn().mockResolvedValue([
                    {
                        company: 'company123',
                        ndrType: 'address_issue',
                        rtoTriggerConditions: { autoTrigger: true, maxHours: 48 },
                    },
                ]),
            });

            await NDRResolutionService.checkResolutionDeadlines();

            expect(NDRActionExecutors.executeAction).toHaveBeenCalledWith(
                'trigger_rto',
                expect.any(Object),
                {}
            );
        });

        it('should log all actions in resolutionActions array', async () => {
            (NDREvent.findById as jest.Mock).mockReturnValue({
                populate: jest.fn().mockResolvedValue(mockNDREvent),
            });
            (NDRWorkflow.getWorkflowForNDR as jest.Mock).mockResolvedValue(mockWorkflow);

            (NDRActionExecutors.executeAction as jest.Mock).mockResolvedValue({
                success: true,
                actionType: 'send_whatsapp',
                result: 'success',
            });

            (NDRActionExecutors.recordActionResult as jest.Mock).mockResolvedValue(undefined);

            await NDRResolutionService.executeResolutionWorkflow('ndr123');

            expect(NDRActionExecutors.recordActionResult).toHaveBeenCalled();
        });
    });
});
