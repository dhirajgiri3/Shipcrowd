import { Job } from 'bullmq';
import { SLATrackingService } from '@/core/application/services/monitoring/sla-tracking.service';
import QueueManager from '@/infrastructure/utilities/queue-manager';
import logger from '@/shared/logger/winston.logger';

/**
 * SLA Monitoring Job
 * 
 * Runs periodically to check for SLA violations and alert ops team.
 */
export class SLAMonitoringJob {
    private static readonly QUEUE_NAME = 'sla-monitoring';

    /**
     * Initialize worker
     */
    static async initialize(): Promise<void> {
        await QueueManager.registerWorker({
            queueName: this.QUEUE_NAME,
            processor: this.processJob.bind(this),
            concurrency: 1,
        });

        logger.info('SLA monitoring worker initialized');
    }

    /**
     * Process job
     */
    private static async processJob(job: Job): Promise<any> {
        logger.info('Running SLA violation check');

        try {
            const result = await SLATrackingService.checkSLAViolations();

            logger.info('SLA check completed', {
                violationCount: result.violations.length
            });

            return result;

        } catch (error: any) {
            logger.error('SLA monitoring job failed', { error: error.message });
            throw error;
        }
    }

    /**
     * Schedule recurring SLA checks (every 2 hours)
     */
    static async scheduleRecurring(): Promise<void> {
        await QueueManager.addJob(
            this.QUEUE_NAME,
            'sla-check',
            {},
            {
                repeat: {
                    every: 2 * 60 * 60 * 1000, // 2 hours
                },
                jobId: 'sla-monitoring-recurring',
            }
        );

        logger.info('SLA monitoring scheduled (every 2 hours)');
    }
}
