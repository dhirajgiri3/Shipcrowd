/**
 * NDR Resolution Job
 *
 * Background job for scheduled NDR resolution actions.
 */

import { Job } from 'bullmq';
import { NDREvent, NDRWorkflow } from '../../../database/mongoose/models';
import NDRResolutionService from '../../../../core/application/services/ndr/ndr-resolution.service';
import QueueManager from '../../../utilities/queue-manager';
import logger from '../../../../shared/logger/winston.logger';

interface NDRResolutionJobData {
    ndrEventId: string;
    actionSequence?: number;
    type?: 'execute_action' | 'check_deadline' | 'start_workflow';
}

export class NDRResolutionJob {
    private static readonly QUEUE_NAME = 'ndr-resolution';

    /**
     * Initialize the job worker
     */
    static async initialize(): Promise<void> {
        await QueueManager.registerWorker({
            queueName: this.QUEUE_NAME,
            processor: this.processJob.bind(this),
            concurrency: 5,
        });

        logger.info('NDR resolution worker initialized');
    }

    /**
     * Process job
     */
    private static async processJob(job: Job<NDRResolutionJobData>): Promise<any> {
        const { ndrEventId, actionSequence, type = 'execute_action' } = job.data;

        logger.info('Processing NDR resolution job', {
            jobId: job.id,
            ndrEventId,
            type,
            actionSequence,
        });

        try {
            switch (type) {
                case 'start_workflow':
                    await this.startWorkflow(ndrEventId);
                    break;

                case 'execute_action':
                    await this.executeScheduledAction(ndrEventId, actionSequence || 1);
                    break;

                case 'check_deadline':
                    await this.checkDeadline(ndrEventId);
                    break;

                default:
                    logger.warn('Unknown job type', { type });
            }

            return { success: true };
        } catch (error: any) {
            logger.error('NDR resolution job failed', {
                jobId: job.id,
                ndrEventId,
                error: error.message,
            });

            throw error;
        }
    }

    /**
     * Start workflow for NDR event
     */
    private static async startWorkflow(ndrEventId: string): Promise<void> {
        await NDRResolutionService.executeResolutionWorkflow(ndrEventId);
    }

    /**
     * Execute scheduled action
     */
    private static async executeScheduledAction(
        ndrEventId: string,
        actionSequence: number
    ): Promise<void> {
        const ndrEvent = await NDREvent.findById(ndrEventId).populate('shipment order');

        if (!ndrEvent) {
            logger.error('NDR event not found', { ndrEventId });
            return;
        }

        // Check if already resolved
        if (ndrEvent.status === 'resolved' || ndrEvent.status === 'rto_triggered') {
            logger.info('NDR already resolved, skipping action', { ndrEventId });
            return;
        }

        // Get workflow
        const workflow = await NDRWorkflow.getWorkflowForNDR(
            ndrEvent.ndrType,
            ndrEvent.company.toString()
        );

        if (!workflow) {
            logger.warn('No workflow found', { ndrEventId, ndrType: ndrEvent.ndrType });
            return;
        }

        // Find the action to execute
        const action = workflow.actions.find((a: any) => a.sequence === actionSequence);

        if (!action) {
            logger.info('No more actions to execute', { ndrEventId, actionSequence });
            return;
        }

        // Execute
        await NDRResolutionService.executeAction(ndrEvent, action, workflow);
    }

    /**
     * Check deadline and trigger RTO if needed
     */
    private static async checkDeadline(ndrEventId: string): Promise<void> {
        const ndrEvent = await NDREvent.findById(ndrEventId);

        if (!ndrEvent) {
            return;
        }

        if (ndrEvent.status === 'resolved' || ndrEvent.status === 'rto_triggered') {
            return;
        }

        if (new Date() > ndrEvent.resolutionDeadline) {
            logger.info('Resolution deadline passed, checking RTO conditions', { ndrEventId });

            const workflow = await NDRWorkflow.getWorkflowForNDR(
                ndrEvent.ndrType,
                ndrEvent.company.toString()
            );

            if (workflow) {
                await NDRResolutionService.checkWorkflowCompletion(ndrEvent, workflow);
            }
        }
    }

    /**
     * Queue workflow start for NDR event
     */
    static async queueWorkflowStart(ndrEventId: string): Promise<void> {
        await QueueManager.addJob(
            this.QUEUE_NAME,
            `ndr-workflow-${ndrEventId}`,
            {
                ndrEventId,
                type: 'start_workflow',
            }
        );
    }

    /**
     * Queue deadline check
     */
    static async queueDeadlineCheck(ndrEventId: string, deadline: Date): Promise<void> {
        const delay = deadline.getTime() - Date.now();

        if (delay > 0) {
            await QueueManager.addJob(
                this.QUEUE_NAME,
                `ndr-deadline-${ndrEventId}`,
                {
                    ndrEventId,
                    type: 'check_deadline',
                },
                { delay }
            );
        }
    }

    /**
     * Run deadline check for all active NDRs (scheduled task)
     */
    static async runDeadlineCheck(): Promise<number> {
        return NDRResolutionService.checkResolutionDeadlines();
    }
}

export default NDRResolutionJob;
