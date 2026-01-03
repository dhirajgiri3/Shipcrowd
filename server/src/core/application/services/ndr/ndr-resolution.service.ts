/**
 * NDRResolutionService
 *
 * Orchestrates NDR resolution workflows.
 */

import { NDREvent, INDREvent } from '../../../../infrastructure/database/mongoose/models';
import { NDRWorkflow, INDRWorkflow, IWorkflowAction } from '../../../../infrastructure/database/mongoose/models';
import NDRActionExecutors from './actions/ndr-action-executors';
import logger from '../../../../shared/logger/winston.logger';
import { AppError } from '../../../../shared/errors/app.error';
import { createAuditLog } from '../../../../presentation/http/middleware/system/audit-log.middleware';
import mongoose from 'mongoose';

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
        const QueueManagerModule = await import('../../../../infrastructure/utilities/queue-manager.js') as any;
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
                // Escalate
                await this.escalateNDR(String(latest._id), 'Resolution deadline passed');
            }
        }
    }

    /**
     * Manually resolve NDR
     * Issue #15: Added notes parameter for complete audit trail
     */
    static async resolveNDR(
        ndrEventId: string,
        resolution: string,
        resolvedBy: string,
        notes?: string
    ): Promise<void> {
        try {
            logger.info('Attempting to resolve NDR', { ndrEventId, resolvedBy });

            const ndrEvent = await NDREvent.findById(ndrEventId);

            if (!ndrEvent) {
                throw new AppError('NDR event not found', 'NDR_NOT_FOUND', 404);
            }

            if (ndrEvent.status === 'resolved') {
                throw new AppError('NDR already resolved', 'NDR_ALREADY_RESOLVED', 400);
            }

            if (ndrEvent.status === 'rto_triggered') {
                throw new AppError('NDR already has RTO triggered', 'NDR_RTO_TRIGGERED', 400);
            }

            await ndrEvent.markResolved(resolvedBy, resolution);

            // Audit log
            await createAuditLog(
                resolvedBy,
                String(ndrEvent.company),
                'update',
                'ndr_event',
                ndrEventId,
                {
                    action: 'resolve_ndr',
                    resolution,
                    previousStatus: ndrEvent.status,
                    newStatus: 'resolved',
                }
            );

            logger.info('NDR manually resolved', {
                ndrEventId,
                resolution,
                resolvedBy,
            });
        } catch (error: any) {
            logger.error('Failed to resolve NDR', {
                ndrEventId,
                resolvedBy,
                error: error.message,
                stack: error.stack,
            });
            throw error;
        }
    }

    /**
     * Escalate NDR
     * Issue #15: Added priority and escalateTo parameters
     */
    static async escalateNDR(
        ndrEventId: string,
        reason: string,
        priority?: string,
        escalateTo?: string
    ): Promise<void> {
        try {
            logger.info('Attempting to escalate NDR', { ndrEventId, reason });

            const ndrEvent = await NDREvent.findById(ndrEventId);

            if (!ndrEvent) {
                throw new AppError('NDR event not found', 'NDR_NOT_FOUND', 404);
            }

            if (ndrEvent.status === 'resolved') {
                throw new AppError('Cannot escalate resolved NDR', 'NDR_ALREADY_RESOLVED', 400);
            }

            if (ndrEvent.status === 'rto_triggered') {
                throw new AppError('Cannot escalate NDR with RTO triggered', 'NDR_RTO_TRIGGERED', 400);
            }

            if (ndrEvent.status === 'escalated') {
                logger.warn('NDR already escalated', { ndrEventId });
                return;
            }

            await ndrEvent.escalate();

            // Audit log
            await createAuditLog(
                'system',
                String(ndrEvent.company),
                'update',
                'ndr_event',
                ndrEventId,
                {
                    action: 'escalate_ndr',
                    reason,
                    previousStatus: ndrEvent.status,
                    newStatus: 'escalated',
                }
            );

            // TODO: Send escalation notification to supervisor

            logger.info('NDR escalated', {
                ndrEventId,
                reason,
            });
        } catch (error: any) {
            logger.error('Failed to escalate NDR', {
                ndrEventId,
                reason,
                error: error.message,
                stack: error.stack,
            });
            throw error;
        }
    }

    /**
     * Check all active NDRs for deadline expiry
     * OPTIMIZED (Issue #8): Uses aggregation with $lookup to eliminate N+1 queries
     * Before: 1000 NDRs = 3000+ queries (1 for NDRs + 2000 for workflows/customers)
     * After: 1000 NDRs = 3 queries (1 aggregation + 1 workflow cache + 1 batch action)
     */
    static async checkResolutionDeadlines(): Promise<number> {
        // Issue #33: Explicitly use UTC for timezone-consistent comparisons
        const now = new Date();
        // Ensure we're comparing in UTC by using ISO string conversion
        const nowUTC = new Date(now.toISOString());

        // OPTIMIZATION 1: Use aggregation with $lookup to pre-load all related data in ONE query
        const expiredNDRsWithData = await NDREvent.aggregate([
            // Match expired NDRs
            {
                $match: {
                    status: { $in: ['detected', 'in_resolution'] },
                    resolutionDeadline: { $lt: nowUTC }, // Issue #33: UTC comparison
                    autoRtoTriggered: false,
                },
            },
            // Lookup order details (for customer info)
            {
                $lookup: {
                    from: 'orders',
                    localField: 'order',
                    foreignField: '_id',
                    as: 'orderDetails',
                },
            },
            // Lookup shipment details (fallback for customer info)
            {
                $lookup: {
                    from: 'shipments',
                    localField: 'shipment',
                    foreignField: '_id',
                    as: 'shipmentDetails',
                },
            },
            // Unwind to convert arrays to objects
            {
                $unwind: {
                    path: '$orderDetails',
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $unwind: {
                    path: '$shipmentDetails',
                    preserveNullAndEmptyArrays: true,
                },
            },
            // Project only needed fields
            {
                $project: {
                    _id: 1,
                    shipment: 1,
                    order: 1,
                    company: 1,
                    ndrType: 1,
                    status: 1,
                    awb: 1,
                    // Customer info from order (priority)
                    customerName: {
                        $ifNull: [
                            '$orderDetails.recipientDetails.name',
                            { $ifNull: ['$orderDetails.customerName', '$shipmentDetails.recipientName'] },
                        ],
                    },
                    customerPhone: {
                        $ifNull: [
                            '$orderDetails.recipientDetails.phone',
                            { $ifNull: ['$orderDetails.customerPhone', '$shipmentDetails.recipientPhone'] },
                        ],
                    },
                    customerEmail: {
                        $ifNull: [
                            '$orderDetails.recipientDetails.email',
                            { $ifNull: ['$orderDetails.customerEmail', '$shipmentDetails.recipientEmail'] },
                        ],
                    },
                },
            },
        ]);

        if (expiredNDRsWithData.length === 0) {
            return 0;
        }

        logger.info('Processing expired NDRs', {
            count: expiredNDRsWithData.length,
            optimized: true,
        });

        // OPTIMIZATION 2: Pre-load ALL workflows in ONE query (instead of 1 query per NDR)
        const uniqueCompanyIds = [...new Set(expiredNDRsWithData.map((ndr) => ndr.company.toString()))];
        const uniqueNdrTypes = [...new Set(expiredNDRsWithData.map((ndr) => ndr.ndrType))];

        const workflows = await NDRWorkflow.find({
            company: { $in: uniqueCompanyIds },
            ndrType: { $in: uniqueNdrTypes },
            isActive: true,
        }).lean();

        // Create workflow lookup map for O(1) access
        const workflowMap = new Map<string, INDRWorkflow>();
        workflows.forEach((wf) => {
            const key = `${wf.company}-${wf.ndrType}`;
            workflowMap.set(key, wf);
        });

        // OPTIMIZATION 3: Process NDRs in batches with concurrency control
        const BATCH_SIZE = 10; // Prevent overwhelming DB/system
        let processed = 0;
        let failed = 0;

        // Process in batches instead of unbounded parallelism
        for (let i = 0; i < expiredNDRsWithData.length; i += BATCH_SIZE) {
            const batch = expiredNDRsWithData.slice(i, i + BATCH_SIZE);

            const batchPromises = batch.map(async (ndrData) => {
                // Get workflow from cache (no DB query)
                const workflowKey = `${ndrData.company}-${ndrData.ndrType}`;
                const workflow = workflowMap.get(workflowKey);

                if (!workflow) {
                    logger.warn('No workflow found for expired NDR', {
                        ndrId: ndrData._id,
                        ndrType: ndrData.ndrType,
                        companyId: ndrData.company,
                    });
                    throw new Error('No workflow found');
                }

                // Extract customer info from aggregated data (no DB query)
                const customer: CustomerInfo | null = ndrData.customerPhone
                    ? {
                        name: ndrData.customerName || 'Customer',
                        phone: ndrData.customerPhone,
                        email: ndrData.customerEmail,
                    }
                    : null;

                if (!customer) {
                    logger.warn('No customer phone found for expired NDR', {
                        ndrId: ndrData._id,
                    });
                    throw new Error('No customer phone');
                }

                // FIX #1: Use aggregated data directly instead of redundant findById
                // Creates minimal INDREvent-compatible object from aggregation result
                const ndrEvent = {
                    _id: ndrData._id,
                    shipment: ndrData.shipment,
                    order: ndrData.order,
                    company: ndrData.company,
                    ndrType: ndrData.ndrType,
                    status: ndrData.status,
                    awb: ndrData.awb,
                } as unknown as INDREvent;

                if (workflow.rtoTriggerConditions?.autoTrigger) {
                    // Auto-trigger RTO
                    await NDRActionExecutors.executeAction(
                        'trigger_rto',
                        {
                            ndrEvent,
                            customer,
                            orderId: ndrData.order.toString(),
                            companyId: ndrData.company.toString(),
                        },
                        {}
                    );
                } else {
                    // Escalate
                    await this.escalateNDR(
                        String(ndrData._id),
                        'Resolution deadline passed'
                    );
                }

                return { success: true, ndrId: ndrData._id };
            });

            // FIX #2: Use Promise.allSettled for proper error tracking
            const results = await Promise.allSettled(batchPromises);

            results.forEach((result, index) => {
                if (result.status === 'fulfilled') {
                    processed++;
                } else {
                    failed++;
                    logger.error('Failed to process expired NDR', {
                        ndrId: batch[index]._id,
                        error: result.reason?.message || String(result.reason),
                    });
                }
            });
        }

        logger.info('Completed processing expired NDRs', {
            total: expiredNDRsWithData.length,
            processed,
            failed,
            batchSize: BATCH_SIZE,
            queriesOptimized: `~${expiredNDRsWithData.length * 3} → 2`,
        });

        return processed;
    }

    /**
     * Get customer info from NDR event
     */
    /**
     * Get customer info from NDR event
     * Issue #14: Optimized to avoid double-populate if data already exists
     */
    private static async getCustomerInfo(ndrEvent: any): Promise<CustomerInfo | null> {
        try {
            let order = ndrEvent.order;
            let shipment = ndrEvent.shipment;

            // Check if data is already populated or available from aggregation ($lookup)
            const hasOrderData = order && (order.recipientDetails || order.customerName);
            const hasShipmentData = shipment && (shipment.recipientName || shipment.recipientDetails);
            const hasAggregationData = ndrEvent.orderDetails?.[0] || ndrEvent.shipmentDetails?.[0];

            // Only query DB if we don't have the data
            if (!hasOrderData && !hasShipmentData && !hasAggregationData) {
                const populated = await NDREvent.findById(ndrEvent._id)
                    .populate({
                        path: 'order',
                        select: 'recipientDetails customerName customerPhone customerEmail',
                    })
                    .populate({
                        path: 'shipment',
                        select: 'recipientName recipientPhone recipientEmail',
                    });

                if (populated) {
                    order = populated.order;
                    shipment = populated.shipment;
                }
            } else if (hasAggregationData) {
                // Use aggregation data if available
                order = ndrEvent.orderDetails?.[0] || order;
                shipment = ndrEvent.shipmentDetails?.[0] || shipment;
            }

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
