import { Job } from 'bullmq';
import QueueManager from '../queue/queue.manager';
import AmazonStore from '../database/mongoose/models/amazon-store.model';
import AmazonOrderSyncService from '../../core/application/services/amazon/amazon-order-sync.service';
import logger from '../../shared/logger/winston.logger';

/**
 * AmazonOrderSyncJob
 *
 * Background job for automatic Amazon order synchronization.
 *
 * Features:
 * - Scheduled sync (every 15 minutes by default)
 * - Per-store sync scheduling
 * - Error handling with auto-pause after failures
 * - Concurrency control (1 sync per store at a time)
 *
 * Job Data:
 * - storeId: AmazonStore ID
 * - type: 'scheduled' | 'manual'
 */

interface OrderSyncJobData {
    storeId: string;
    type: 'scheduled' | 'manual';
    fromDate?: string;
    toDate?: string;
    maxOrders?: number;
}

export class AmazonOrderSyncJob {
    /**
     * Initialize order sync worker
     */
    static async initialize(): Promise<void> {
        await QueueManager.registerWorker({
            queueName: 'amazon-order-sync',
            processor: this.processJob.bind(this),
            concurrency: 5, // Process 5 stores concurrently
        });

        logger.info('Amazon order sync worker initialized');
    }

    /**
     * Process order sync job
     */
    private static async processJob(job: Job<OrderSyncJobData>): Promise<any> {
        const { storeId, type, fromDate, toDate, maxOrders } = job.data;

        logger.info('Processing Amazon order sync job', {
            jobId: job.id,
            storeId,
            type,
        });

        try {
            // Verify store is active
            const store = await AmazonStore.findById(storeId);

            if (!store) {
                logger.warn('Amazon store not found, removing from schedule', { storeId });
                return { skipped: true, reason: 'Store not found' };
            }

            if (!store.isActive) {
                logger.info('Amazon store inactive, skipping sync', { storeId });
                return { skipped: true, reason: 'Store inactive' };
            }

            if (store.isPaused) {
                logger.info('Amazon store paused, skipping sync', { storeId });
                return { skipped: true, reason: 'Store paused' };
            }

            if (!store.syncConfig.orderSync.enabled) {
                logger.info('Order sync disabled for store', { storeId });
                return { skipped: true, reason: 'Order sync disabled' };
            }

            // Perform sync
            const result = await AmazonOrderSyncService.syncOrders(storeId, {
                fromDate: fromDate ? new Date(fromDate) : undefined,
                toDate: toDate ? new Date(toDate) : undefined,
                maxOrders,
            });

            logger.info('Amazon order sync completed', {
                jobId: job.id,
                storeId,
                ...result,
            });

            return {
                success: true,
                itemsProcessed: result.itemsProcessed,
                itemsSynced: result.itemsSynced,
                itemsFailed: result.itemsFailed,
            };
        } catch (error: any) {
            logger.error('Amazon order sync job failed', {
                jobId: job.id,
                storeId,
                error: error.message,
                stack: error.stack,
            });

            throw error; // Re-throw for BullMQ retry logic
        }
    }

    /**
     * Schedule order sync for all active stores
     */
    static async scheduleAllStores(): Promise<void> {
        const stores = await AmazonStore.find({
            isActive: true,
            isPaused: false,
            'syncConfig.orderSync.enabled': true,
            'syncConfig.orderSync.autoSync': true,
        });

        logger.info('Scheduling Amazon order sync for stores', {
            count: stores.length,
        });

        for (const store of stores) {
            await this.scheduleStoreSync(String(store._id), store.syncConfig.orderSync.syncInterval);
        }
    }

    /**
     * Schedule order sync for a specific store
     */
    static async scheduleStoreSync(storeId: string, intervalMinutes: number = 15): Promise<void> {
        const jobName = `scheduled-${storeId}`;

        // Add repeatable job
        await QueueManager.addJob(
            'amazon-order-sync',
            jobName,
            {
                storeId,
                type: 'scheduled',
            },
            {
                repeat: {
                    every: intervalMinutes * 60 * 1000, // Convert to milliseconds
                },
                jobId: jobName, // Prevent duplicate schedules
            }
        );

        logger.info('Scheduled Amazon order sync', {
            storeId,
            intervalMinutes,
        });
    }

    /**
     * Trigger manual order sync for a store
     */
    static async triggerManualSync(
        storeId: string,
        options: { fromDate?: Date; toDate?: Date; maxOrders?: number } = {}
    ): Promise<Job> {
        const job = await QueueManager.addJob(
            'amazon-order-sync',
            `manual-${storeId}-${Date.now()}`,
            {
                storeId,
                type: 'manual',
                fromDate: options.fromDate?.toISOString(),
                toDate: options.toDate?.toISOString(),
                maxOrders: options.maxOrders,
            },
            {
                priority: 1, // High priority for manual syncs
            }
        );

        logger.info('Triggered manual Amazon order sync', {
            storeId,
            jobId: job.id,
        });

        return job;
    }

    /**
     * Cancel scheduled sync for a store
     */
    static async cancelStoreSync(storeId: string): Promise<void> {
        const jobName = `scheduled-${storeId}`;

        await QueueManager.removeRepeatableJob('amazon-order-sync', jobName);

        logger.info('Cancelled Amazon order sync schedule', { storeId });
    }

    /**
     * Get sync status for a store
     */
    static async getSyncStatus(storeId: string): Promise<any> {
        const store = await AmazonStore.findById(storeId);

        if (!store) {
            throw new Error('Store not found');
        }

        return {
            storeId,
            isActive: store.isActive,
            isPaused: store.isPaused,
            syncConfig: store.syncConfig.orderSync,
            lastSyncAt: store.syncConfig.orderSync.lastSyncAt,
            errorCount: store.syncConfig.orderSync.errorCount,
            lastError: store.syncConfig.orderSync.lastError,
        };
    }
}

export default AmazonOrderSyncJob;
