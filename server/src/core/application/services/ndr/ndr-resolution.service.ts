/**
 * Ndr Resolution
 * 
 * Purpose: NDRResolutionService
 * 
 * DEPENDENCIES:
 * - Database Models, Error Handling, Logger
 * 
 * TESTING:
 * Unit Tests: tests/unit/services/.../{filename}.test.ts
 * Coverage: TBD
 * 
 * NOTE: This service needs comprehensive documentation.
 * See SERVICE_TEMPLATE.md for documentation standards.
 */

import { NDREvent, INDREvent } from '../../../../infrastructure/database/mongoose/models';
import { NDRWorkflow, INDRWorkflow, IWorkflowAction } from '../../../../infrastructure/database/mongoose/models';
import NDRActionExecutors from './actions/ndr-action-executors';
import QueueManager from '../../../../infrastructure/utilities/queue-manager';
import logger from '../../../../shared/logger/winston.logger';
import { AppError, NotFoundError, ValidationError } from '../../../../shared/errors/app.error';
import { ErrorCode } from '../../../../shared/errors/errorCodes';
import { createAuditLog } from '../../../../presentation/http/middleware/system/audit-log.middleware';

interface CustomerInfo {
    name: string;
    phone: string;
    email?: string;
}

type WorkflowConditionOperator =
    | 'equals'
    | 'not_equals'
    | 'includes'
    | 'in'
    | 'not_in'
    | 'exists'
    | 'not_exists'
    | 'gt'
    | 'gte'
    | 'lt'
    | 'lte'
    | 'regex';

interface WorkflowCondition {
    field: string;
    operator: WorkflowConditionOperator;
    value?: any;
}

interface WorkflowConditions {
    all?: WorkflowCondition[];
    any?: WorkflowCondition[];
    not?: WorkflowCondition[];
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
     * Build condition evaluation context
     */
    private static buildConditionContext(ndrEvent: INDREvent) {
        const actions = (ndrEvent as any).resolutionActions || [];
        const hasAction = (actionType: string, result?: string) =>
            actions.some(
                (a: any) =>
                    a.actionType === actionType && (!result || a.result === result)
            );

        const customerResponded =
            Boolean((ndrEvent as any).customerResponse) ||
            actions.some((a: any) => a.takenBy === 'customer' && a.result === 'success');

        const addressUpdated =
            hasAction('update_address', 'success') ||
            (ndrEvent as any).customerResponse === 'address_updated';

        return {
            ndrEvent,
            shipment: (ndrEvent as any).shipment,
            flags: {
                customerResponded,
                addressUpdated,
                reattemptRequested: hasAction('request_reattempt', 'success')
            }
        };
    }

    private static getFieldValue(path: string, context: any): any {
        return path.split('.').reduce((acc: any, key: string) => {
            if (acc === null || acc === undefined) return undefined;
            return acc[key];
        }, context);
    }

    private static evaluateCondition(condition: WorkflowCondition, context: any): boolean {
        const value = this.getFieldValue(condition.field, context);
        const compareValue = condition.value;

        switch (condition.operator) {
            case 'exists':
                return value !== undefined && value !== null && value !== '';
            case 'not_exists':
                return value === undefined || value === null || value === '';
            case 'equals':
                return value === compareValue;
            case 'not_equals':
                return value !== compareValue;
            case 'includes':
                if (Array.isArray(value)) {
                    return value.includes(compareValue);
                }
                if (typeof value === 'string') {
                    return value.includes(String(compareValue));
                }
                return false;
            case 'in':
                return Array.isArray(compareValue) ? compareValue.includes(value) : false;
            case 'not_in':
                return Array.isArray(compareValue) ? !compareValue.includes(value) : false;
            case 'gt':
                return Number(value) > Number(compareValue);
            case 'gte':
                return Number(value) >= Number(compareValue);
            case 'lt':
                return Number(value) < Number(compareValue);
            case 'lte':
                return Number(value) <= Number(compareValue);
            case 'regex':
                try {
                    return new RegExp(String(compareValue)).test(String(value));
                } catch {
                    return false;
                }
            default:
                return true;
        }
    }

    private static evaluateConditions(conditions: WorkflowConditions, context: any): boolean {
        if (!conditions || Object.keys(conditions).length === 0) return true;

        const allPass = conditions.all
            ? conditions.all.every((c) => this.evaluateCondition(c, context))
            : true;
        const anyPass = conditions.any
            ? conditions.any.some((c) => this.evaluateCondition(c, context))
            : true;
        const notPass = conditions.not
            ? conditions.not.every((c) => !this.evaluateCondition(c, context))
            : true;

        return allPass && anyPass && notPass;
    }

    private static shouldExecuteAction(ndrEvent: INDREvent, action: IWorkflowAction): boolean {
        const conditions: WorkflowConditions | undefined =
            (action as any).conditions || action.actionConfig?.conditions;
        if (!conditions) return true;

        const context = this.buildConditionContext(ndrEvent);
        return this.evaluateConditions(conditions, context);
    }

    private static async recordSkippedAction(
        ndrEvent: INDREvent,
        action: IWorkflowAction,
        reason: string
    ): Promise<void> {
        await NDRActionExecutors.recordActionResult(
            String(ndrEvent._id),
            {
                success: true,
                actionType: action.actionType,
                result: 'skipped',
                metadata: {
                    reason,
                    conditions: (action as any).conditions || action.actionConfig?.conditions
                }
            },
            'system'
        );
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

        // Evaluate conditional branching
        if (!this.shouldExecuteAction(ndrEvent, nextAction)) {
            await this.recordSkippedAction(ndrEvent, nextAction, 'conditions_not_met');
            await this.executeNextAction(ndrEvent, workflow, nextAction.sequence);
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
        // Refresh NDR event to evaluate latest state before executing
        const latestEvent = await NDREvent.findById(ndrEvent._id).populate('shipment order');
        const eventToUse = (latestEvent || ndrEvent) as INDREvent;

        // Evaluate conditions again at execution time (state may have changed)
        if (!this.shouldExecuteAction(eventToUse, action)) {
            await this.recordSkippedAction(eventToUse, action, 'conditions_not_met');
            await this.executeNextAction(eventToUse, workflow, action.sequence);
            return;
        }

        // Check if action needs manual approval
        if (!action.autoExecute) {
            logger.info('Action requires manual approval', {
                ndrEventId: eventToUse._id,
                actionType: action.actionType,
            });
            return;
        }

        // Get customer info from shipment/order
        const customer = await this.getCustomerInfo(eventToUse);
        if (!customer) {
            logger.error('Could not get customer info for action', { ndrEventId: eventToUse._id });
            return;
        }

        // Execute the action
        const result = await NDRActionExecutors.executeAction(
            action.actionType,
            {
                ndrEvent: eventToUse,
                customer,
                orderId: eventToUse.order.toString(),
                companyId: eventToUse.company.toString(),
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
            await this.executeNextAction(eventToUse, workflow, action.sequence);
        }
    }

    /**
     * Schedule action for later execution
     */
    static async scheduleAction(
        ndrEventId: string,
        action: IWorkflowAction
    ): Promise<void> {
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
     * Execute seller/admin initiated manual action on an NDR
     */
    static async takeAction(
        ndrEventId: string,
        action: string,
        actedBy: string,
        options?: {
            notes?: string;
            newAddress?: Record<string, any>;
            newDeliveryDate?: string;
            communicationChannel?: 'sms' | 'email' | 'whatsapp' | 'call';
        }
    ): Promise<void> {
        const ndrEvent = await NDREvent.findById(ndrEventId).populate('shipment order');
        if (!ndrEvent) {
            throw new AppError('NDR event not found', 'NDR_NOT_FOUND', 404);
        }

        if (ndrEvent.status === 'resolved') {
            throw new AppError('Cannot take action on resolved NDR', 'NDR_ALREADY_RESOLVED', 400);
        }

        if (ndrEvent.status === 'rto_triggered' && action !== 'contact_customer') {
            throw new AppError('RTO already triggered for this NDR', 'NDR_RTO_TRIGGERED', 400);
        }

        const customer = await this.getCustomerInfo(ndrEvent);
        if (!customer) {
            throw new ValidationError('No customer phone number found', ErrorCode.VAL_MISSING_FIELD);
        }

        const mapped = this.mapManualActionToExecutor(action, options);
        const orderId = String((ndrEvent.order as any)?._id || ndrEvent.order);

        const result = await NDRActionExecutors.executeAction(
            mapped.actionType,
            {
                ndrEvent,
                customer,
                orderId,
                companyId: ndrEvent.company.toString(),
            },
            mapped.actionConfig
        );

        await NDRActionExecutors.recordActionResult(ndrEventId, result, actedBy || 'system');

        await createAuditLog(
            actedBy || 'system',
            String(ndrEvent.company),
            'update',
            'ndr_event',
            ndrEventId,
            {
                action: 'manual_ndr_action',
                requestedAction: action,
                mappedAction: mapped.actionType,
                notes: options?.notes,
                result: result.result,
            }
        );

        if (!result.success) {
            throw new AppError(
                result.error || 'Failed to execute NDR action',
                'NDR_ACTION_FAILED',
                400
            );
        }
    }

    private static mapManualActionToExecutor(
        action: string,
        options?: {
            notes?: string;
            newAddress?: Record<string, any>;
            newDeliveryDate?: string;
            communicationChannel?: 'sms' | 'email' | 'whatsapp' | 'call';
        }
    ): { actionType: string; actionConfig: Record<string, any> } {
        switch (action) {
            case 'reattempt_delivery':
            case 'reschedule_delivery':
                return {
                    actionType: 'request_reattempt',
                    actionConfig: {
                        preferredDate: options?.newDeliveryDate,
                        notes: options?.notes,
                    },
                };
            case 'address_correction':
                return {
                    actionType: 'update_address',
                    actionConfig: {
                        newAddress: options?.newAddress,
                        notes: options?.notes,
                    },
                };
            case 'contact_customer': {
                const channelMap: Record<string, string> = {
                    sms: 'send_sms',
                    email: 'send_email',
                    whatsapp: 'send_whatsapp',
                    call: 'call_customer',
                };
                return {
                    actionType: channelMap[options?.communicationChannel || 'whatsapp'] || 'send_whatsapp',
                    actionConfig: {
                        message: options?.notes,
                    },
                };
            }
            case 'return_to_origin':
            case 'cancel_order':
                return {
                    actionType: 'trigger_rto',
                    actionConfig: {
                        notes: options?.notes,
                    },
                };
            case 'convert_prepaid':
                return {
                    actionType: 'send_whatsapp',
                    actionConfig: {
                        message: options?.notes || 'Please complete prepaid payment to continue delivery.',
                    },
                };
            default:
                throw new ValidationError('Unsupported NDR action', ErrorCode.VAL_INVALID_INPUT);
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
                    throw new NotFoundError('No workflow found for NDR type', ErrorCode.BIZ_NOT_FOUND);
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
                    throw new ValidationError('No customer phone number found', ErrorCode.VAL_MISSING_FIELD);
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
