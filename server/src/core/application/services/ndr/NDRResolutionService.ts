/**
 * NDRResolutionService
 *
 * Orchestrates NDR resolution workflows.
 */

import NDREvent, { INDREvent } from '../../../../infrastructure/database/mongoose/models/NDREvent';
import NDRWorkflow, { INDRWorkflow, IWorkflowAction } from '../../../../infrastructure/database/mongoose/models/NDRWorkflow';
import NDRActionExecutors from './actions/NDRActionExecutors';
import logger from '../../../../shared/logger/winston.logger';

interface CustomerInfo {
    name: string;
    phone: string;
    email?: string;
}

export default class NDRResolutionService {
    /**
     * Execute resolution workflow for an NDR event
     */
    static async executeResolutionWorkflow(ndrEventId: string): Promise<void> {
        const ndrEvent = await NDREvent.findById(ndrEventId).populate('shipment order');

        if (!ndrEvent) {
            logger.error('NDR event not found', { ndrEventId });
            return;
        }

        // Get workflow for this NDR type
        const workflow = await NDRWorkflow.getWorkflowForNDR(
            ndrEvent.ndrType,
            ndrEvent.company.toString()
        );

        if (!workflow) {
            logger.warn('No workflow found for NDR type', {
                ndrEventId,
                ndrType: ndrEvent.ndrType,
            });
            return;
        }

        logger.info('Starting NDR resolution workflow', {
            ndrEventId,
            workflowName: workflow.name,
            actionCount: workflow.actions.length,
        });

        // Update status
        ndrEvent.status = 'in_resolution';
        await ndrEvent.save();

        // Execute first action immediately
        await this.executeNextAction(ndrEvent, workflow, 0);
    }

    /**
     * Execute next action in workflow
     */
    static async executeNextAction(
        ndrEvent: INDREvent,
        workflow: INDRWorkflow,
        currentSequence: number
    ): Promise<void> {
        // Find next action
        const nextAction = workflow.actions.find((a) => a.sequence === currentSequence + 1);

        if (!nextAction) {
            // No more actions - check if we should escalate or trigger RTO
            await this.checkWorkflowCompletion(ndrEvent, workflow);
            return;
        }

        // Check if we should wait before executing
        if (nextAction.delayMinutes > 0) {
            await this.scheduleAction(String(ndrEvent._id), nextAction);
            return;
        }

        // Execute immediately if no delay
        await this.executeAction(ndrEvent, nextAction, workflow);
    }

    /**
     * Execute a single workflow action
     */
    static async executeAction(
        ndrEvent: INDREvent,
        action: IWorkflowAction,
        workflow: INDRWorkflow
    ): Promise<void> {
        // Check if action needs manual approval
        if (!action.autoExecute) {
            logger.info('Action requires manual approval', {
                ndrEventId: ndrEvent._id,
                actionType: action.actionType,
            });
            return;
        }

        // Get customer info from shipment/order
        const customer = await this.getCustomerInfo(ndrEvent);
        if (!customer) {
            logger.error('Could not get customer info for action', { ndrEventId: ndrEvent._id });
            return;
        }

        // Execute the action
        const result = await NDRActionExecutors.executeAction(
            action.actionType,
            {
                ndrEvent,
                customer,
                orderId: ndrEvent.order.toString(),
                companyId: ndrEvent.company.toString(),
            },
            action.actionConfig
        );

        // Record result
        await NDRActionExecutors.recordActionResult(
            String(ndrEvent._id),
            result,
            'system'
        );

        logger.info('Action executed', {
            ndrEventId: ndrEvent._id,
            actionType: action.actionType,
            result: result.result,
        });

        // If action succeeded and not RTO, continue to next
        if (result.success && action.actionType !== 'trigger_rto') {
            await this.executeNextAction(ndrEvent, workflow, action.sequence);
        }
    }

    /**
     * Schedule action for later execution
     */
    static async scheduleAction(
        ndrEventId: string,
        action: IWorkflowAction
    ): Promise<void> {
        // Import job dynamically
        const QueueManagerModule = await import('../../../../infrastructure/queue/QueueManager.js') as any;
        const QueueManager = QueueManagerModule.default;

        await QueueManager.addJob(
            'ndr-resolution',
            `ndr-action-${ndrEventId}-${action.sequence}`,
            {
                ndrEventId,
                actionSequence: action.sequence,
            },
            {
                delay: action.delayMinutes * 60 * 1000,
            }
        );

        logger.info('Action scheduled', {
            ndrEventId,
            actionType: action.actionType,
            delayMinutes: action.delayMinutes,
        });
    }

    /**
     * Check if workflow is complete and handle next steps
     */
    static async checkWorkflowCompletion(
        ndrEvent: INDREvent,
        workflow: INDRWorkflow
    ): Promise<void> {
        // Reload to get latest status
        const latest = await NDREvent.findById(ndrEvent._id);
        if (!latest) return;

        // If resolved, nothing to do
        if (latest.status === 'resolved') {
            return;
        }

        // Check deadline
        if (new Date() > latest.resolutionDeadline) {
            // Deadline passed - check RTO conditions
            if (workflow.rtoTriggerConditions.autoTrigger) {
                logger.info('Resolution deadline passed, triggering auto-RTO', {
                    ndrEventId: latest._id,
                });

                // Execute RTO action
                const customer = await this.getCustomerInfo(latest);
                if (customer) {
                    await NDRActionExecutors.executeAction(
                        'trigger_rto',
                        {
                            ndrEvent: latest,
                            customer,
                            orderId: latest.order.toString(),
                            companyId: latest.company.toString(),
                        },
                        {}
                    );
                }
            } else {
                // Escalate instead
                await this.escalateNDR(String(latest._id), 'Resolution deadline passed');
            }
        }
    }

    /**
     * Manually resolve NDR
     */
    static async resolveNDR(
        ndrEventId: string,
        resolution: string,
        resolvedBy: string
    ): Promise<void> {
        const ndrEvent = await NDREvent.findById(ndrEventId);

        if (!ndrEvent) {
            throw new Error('NDR event not found');
        }

        if (ndrEvent.status === 'resolved' || ndrEvent.status === 'rto_triggered') {
            throw new Error('NDR already resolved or RTO triggered');
        }

        await ndrEvent.markResolved(resolvedBy, resolution);

        logger.info('NDR manually resolved', {
            ndrEventId,
            resolution,
            resolvedBy,
        });
    }

    /**
     * Escalate NDR
     */
    static async escalateNDR(ndrEventId: string, reason: string): Promise<void> {
        const ndrEvent = await NDREvent.findById(ndrEventId);

        if (!ndrEvent) {
            throw new Error('NDR event not found');
        }

        await ndrEvent.escalate();

        // TODO: Send escalation notification to supervisor

        logger.info('NDR escalated', {
            ndrEventId,
            reason,
        });
    }

    /**
     * Check all active NDRs for deadline expiry
     */
    static async checkResolutionDeadlines(): Promise<number> {
        const expiredNDRs = await NDREvent.getExpiredNDRs();

        let processed = 0;

        for (const ndr of expiredNDRs) {
            try {
                const workflow = await NDRWorkflow.getWorkflowForNDR(
                    ndr.ndrType,
                    ndr.company.toString()
                );

                if (workflow?.rtoTriggerConditions.autoTrigger) {
                    // Auto-trigger RTO
                    const customer = await this.getCustomerInfo(ndr);
                    if (customer) {
                        await NDRActionExecutors.executeAction(
                            'trigger_rto',
                            {
                                ndrEvent: ndr,
                                customer,
                                orderId: ndr.order.toString(),
                                companyId: ndr.company.toString(),
                            },
                            {}
                        );
                    }
                } else {
                    // Escalate
                    await this.escalateNDR(String(ndr._id), 'Resolution deadline passed');
                }

                processed++;
            } catch (error: any) {
                logger.error('Error processing expired NDR', {
                    ndrId: ndr._id,
                    error: error.message,
                });
            }
        }

        return processed;
    }

    /**
     * Get customer info from NDR event
     */
    private static async getCustomerInfo(ndrEvent: INDREvent): Promise<CustomerInfo | null> {
        try {
            // Try to get from populated order/shipment
            const populated = await NDREvent.findById(ndrEvent._id)
                .populate({
                    path: 'order',
                    select: 'recipientDetails customerName customerPhone customerEmail',
                })
                .populate({
                    path: 'shipment',
                    select: 'recipientName recipientPhone recipientEmail',
                });

            const order = populated?.order as any;
            const shipment = populated?.shipment as any;

            // Priority: order > shipment
            const name =
                order?.recipientDetails?.name ||
                order?.customerName ||
                shipment?.recipientName ||
                'Customer';

            const phone =
                order?.recipientDetails?.phone ||
                order?.customerPhone ||
                shipment?.recipientPhone ||
                '';

            const email =
                order?.recipientDetails?.email ||
                order?.customerEmail ||
                shipment?.recipientEmail;

            if (!phone) {
                logger.warn('No phone number found for NDR', { ndrEventId: ndrEvent._id });
                return null;
            }

            return { name, phone, email };
        } catch (error: any) {
            logger.error('Error getting customer info', { error: error.message });
            return null;
        }
    }
}
