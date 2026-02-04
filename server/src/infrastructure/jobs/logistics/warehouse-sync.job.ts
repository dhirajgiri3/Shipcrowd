/**
 * Warehouse Sync Job
 *
 * Background job for retrying failed warehouse synchronization with courier partners.
 * Follows the same pattern as carrier-sync.job.ts
 */

import { Job } from 'bullmq';
import WarehouseSyncService from '@/core/application/services/logistics/warehouse-sync.service';
import QueueManager from '@/infrastructure/utilities/queue-manager';
import logger from '@/shared/logger/winston.logger';

interface WarehouseSyncJobData {
    warehouseId: string;
    carrier: string;
}

export class WarehouseSyncJob {
    private static readonly QUEUE_NAME = 'warehouse-sync';

    /**
     * Initialize the job worker
     */
    static async initialize(): Promise<void> {
        await QueueManager.registerWorker({
            queueName: this.QUEUE_NAME,
            processor: this.processJob.bind(this),
            concurrency: 3, // Lower concurrency for API calls
        });

        logger.info('Warehouse Sync worker initialized');
    }

    /**
     * Process job
     */
    private static async processJob(job: Job<WarehouseSyncJobData>): Promise<any> {
        const { warehouseId, carrier } = job.data;
        const { id: jobId } = job;

        logger.info('Processing warehouse sync job', {
            jobId,
            warehouseId,
            carrier
        });

        try {
            if (!warehouseId || !carrier) {
                throw new Error('Missing warehouseId or carrier in job data');
            }

            const success = await WarehouseSyncService.retrySync(warehouseId, carrier);

            if (success) {
                logger.info(`Warehouse sync successful for ${warehouseId} with ${carrier}`);
            } else {
                logger.warn(`Warehouse sync failed for ${warehouseId} with ${carrier}`);
            }

            return { success, warehouseId, carrier };
        } catch (error: any) {
            logger.error('Warehouse sync job failed', {
                jobId,
                warehouseId,
                carrier,
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }
}

export default WarehouseSyncJob;
