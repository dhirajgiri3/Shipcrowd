/**
 * Weight Dispute Job
 *
 * Background job for weight dispute automation:
 * 1. Auto-resolve expired disputes (Daily)
 * 2. Fraud pattern detection (Hourly)
 * 3. Scan for pending weight updates (Hourly)
 */

import { Job } from 'bullmq';
import QueueManager from '../../utilities/queue-manager';
import logger from '../../../shared/logger/winston.logger';
import {
    WeightDisputeResolutionService,
    WeightDisputeAnalyticsService,
    WeightDisputeDetectionService,
} from '../../../core/application/services/disputes';

interface WeightDisputeJobData {
    type: 'auto_resolve' | 'fraud_check' | 'scan_updates';
}

export class WeightDisputeJob {
    private static readonly QUEUE_NAME = 'weight-dispute';

    /**
     * Initialize the job worker
     */
    static async initialize(): Promise<void> {
        await QueueManager.registerWorker({
            queueName: this.QUEUE_NAME,
            processor: this.processJob.bind(this),
            concurrency: 1, // Sequential processing is fine
        });

        logger.info('Weight dispute automation worker initialized');
    }

    /**
     * Process job
     */
    private static async processJob(job: Job<WeightDisputeJobData>): Promise<any> {
        const { type } = job.data;

        logger.info('Processing weight dispute job', {
            jobId: job.id,
            type,
        });

        try {
            switch (type) {
                case 'auto_resolve':
                    await this.runAutoResolve();
                    break;

                case 'fraud_check':
                    await this.runFraudCheck();
                    break;

                case 'scan_updates':
                    await this.runScanUpdates();
                    break;

                default:
                    logger.warn('Unknown job type', { type });
            }

            return { success: true };
        } catch (error: any) {
            logger.error('Weight dispute job failed', {
                jobId: job.id,
                type,
                error: error.message,
            });

            throw error;
        }
    }

    /**
     * Run auto-resolve logic
     */
    private static async runAutoResolve(): Promise<void> {
        const count = await WeightDisputeResolutionService.autoResolveExpiredDisputes();
        logger.info(`Auto-resolved ${count} expired disputes`);
    }

    /**
     * Run fraud check logic
     */
    private static async runFraudCheck(): Promise<void> {
        // Check for last 24 hours patterns
        const endDate = new Date();
        const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);

        const riskySellers = await WeightDisputeAnalyticsService.identifyHighRiskSellers(
            { start: startDate, end: endDate },
            10 // Top 10 risky sellers
        );

        if (riskySellers.length > 0) {
            logger.warn('High risk sellers detected', {
                count: riskySellers.length,
                sellers: riskySellers.map(s => ({
                    companyId: s.companyId,
                    score: s.riskScore
                }))
            });
            // TODO: Trigger alerts to admin/risk team
        }
    }

    /**
     * Run scan for pending updates
     */
    private static async runScanUpdates(): Promise<void> {
        const result = await WeightDisputeDetectionService.scanForPendingWeightUpdates();

        if (result.unverifiedCount > 0) {
            logger.info('Scanned pending weight updates', {
                unverifiedCount: result.unverifiedCount
            });
        }
    }

    /**
     * Queue Auto-Resolve Job
     */
    static async queueAutoResolve(): Promise<void> {
        await QueueManager.addJob(
            this.QUEUE_NAME,
            'auto-resolve-daily',
            { type: 'auto_resolve' },
            {
                jobId: `auto-resolve-${new Date().toISOString().slice(0, 10)}`, // Unique per day
                removeOnComplete: true
            }
        );
    }

    /**
     * Queue Fraud Check Job
     */
    static async queueFraudCheck(): Promise<void> {
        await QueueManager.addJob(
            this.QUEUE_NAME,
            'fraud-check-hourly',
            { type: 'fraud_check' },
            { removeOnComplete: true }
        );
    }

    /**
     * Queue Scan Updates Job
     */
    static async queueScanUpdates(): Promise<void> {
        await QueueManager.addJob(
            this.QUEUE_NAME,
            'scan-updates-hourly',
            { type: 'scan_updates' },
            { removeOnComplete: true }
        );
    }
}

export default WeightDisputeJob;
