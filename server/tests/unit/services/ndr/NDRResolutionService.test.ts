import NDRResolutionService from '../../../../src/core/application/services/ndr/ndr-resolution.service';
import NDRActionExecutors from '../../../../src/core/application/services/ndr/actions/ndr-action-executors';

// Mock must be defined inline in factory to avoid hoisting issues
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
        },
    };
});

jest.mock('../../../../src/core/application/services/ndr/actions/ndr-action-executors');

const { NDREvent, NDRWorkflow } = require('../../../../src/infrastructure/database/mongoose/models');

describe('NDRResolutionService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('executeResolutionWorkflow', () => {
        const mockNDREvent = {
            _id: 'ndr123',
            ndrType: 'address_issue',
            status: 'detected',
            company: 'company123',
            shipment: 'shipment123',
            order: 'order123',
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
            const expiredNDR = {
                ...mockNDREvent,
                resolutionDeadline: new Date(Date.now() - 1000), // 1 second ago
            };

            (NDREvent.findById as jest.Mock).mockReturnValue({
                populate: jest.fn().mockResolvedValue(expiredNDR),
            });

            const escalateSpy = jest.spyOn(NDRResolutionService, 'escalateNDR');

            await NDRResolutionService.checkResolutionDeadlines();

            expect(escalateSpy).toHaveBeenCalled();
        });

        it('should auto-trigger RTO after deadline with auto-trigger enabled', async () => {
            const workflowWithRTO = {
                ...mockWorkflow,
                rtoTriggerConditions: {
                    autoTrigger: true,
                    maxHours: 48,
                },
            };

            const expiredNDR = {
                ...mockNDREvent,
                resolutionDeadline: new Date(Date.now() - 1000),
            };

            (NDREvent.find as jest.Mock).mockResolvedValue([expiredNDR]);
            (NDRWorkflow.getWorkflowForNDR as jest.Mock).mockResolvedValue(workflowWithRTO);

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
