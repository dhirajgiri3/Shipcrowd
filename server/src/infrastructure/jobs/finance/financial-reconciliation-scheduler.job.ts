import { Job } from 'bullmq';
import QueueManager from '@/infrastructure/utilities/queue-manager';
import logger from '@/shared/logger/winston.logger';

/**
 * Financial Reconciliation Scheduler
 * 
 * Schedules daily financial reconciliation jobs.
 */
export class FinancialReconciliationScheduler {
    private static readonly QUEUE_NAME = 'financial-reconciliation';

    /**
     * Initialize worker
     */
    static async initialize(): Promise<void> {
        const { FinancialReconciliationJob } = await import('../finance/financial-reconciliation.job.js');

        await QueueManager.registerWorker({
            queueName: this.QUEUE_NAME,
            processor: FinancialReconciliationJob.processJob.bind(FinancialReconciliationJob),
            concurrency: 1,
        });

        logger.info('Financial reconciliation worker initialized');
    }

    /**
     * Schedule daily reconciliation (runs at 2 AM)
     */
    static async scheduleDailyReconciliation(): Promise<void> {
        await QueueManager.addJob(
            this.QUEUE_NAME,
            'daily-reconciliation',
            { type: 'daily_reconciliation' },
            {
                repeat: {
                    pattern: '0 2 * * *', // 2 AM daily
                },
                jobId: 'daily-financial-reconciliation',
            }
        );

        logger.info('Daily financial reconciliation scheduled (2 AM)');
    }

    /**
     * Schedule hourly settlement checks
     */
    static async scheduleSettlementChecks(): Promise<void> {
        await QueueManager.addJob(
            this.QUEUE_NAME,
            'settlement-check',
            { type: 'settlement_check' },
            {
                repeat: {
                    every: 60 * 60 * 1000, // Every hour
                },
                jobId: 'hourly-settlement-check',
            }
        );

        logger.info('Hourly settlement checks scheduled');
    }
}
