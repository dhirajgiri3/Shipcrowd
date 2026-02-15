import { Job } from 'bullmq';
import AmazonInventorySyncService from '../../../../core/application/services/amazon/amazon-inventory-sync.service';
import logger from '../../../../shared/logger/winston.logger';
import { AmazonStore } from '../../../database/mongoose/models';
import QueueManager from '../../../utilities/queue-manager';

interface InventorySyncJobData {
  storeId: string;
  type: 'manual' | 'scheduled';
  updates?: Array<{ sku: string; quantity: number; fulfillmentLatency?: number }>;
}

export default class AmazonInventorySyncJob {
  static async initialize(): Promise<void> {
    await QueueManager.registerWorker({
      queueName: 'amazon-inventory-sync',
      processor: this.processJob.bind(this),
      concurrency: 3,
    });

    logger.info('Amazon inventory sync worker initialized');
  }

  private static async processJob(job: Job<InventorySyncJobData>): Promise<any> {
    const { storeId, updates = [] } = job.data;

    logger.info('Processing Amazon inventory sync job', {
      jobId: job.id,
      storeId,
      updatesCount: updates.length,
    });

    const store = await AmazonStore.findById(storeId);
    if (!store) {
      return { skipped: true, reason: 'Store not found' };
    }

    if (!store.isActive || store.isPaused || !store.syncConfig.inventorySync.enabled) {
      return { skipped: true, reason: 'Inventory sync disabled/inactive' };
    }

    if (updates.length === 0) {
      return { skipped: true, reason: 'No inventory updates provided' };
    }

    const result = await AmazonInventorySyncService.batchInventorySync(storeId, updates);

    logger.info('Amazon inventory sync job completed', {
      jobId: job.id,
      storeId,
      ...result,
    });

    return result;
  }

  static async triggerManualSync(
    storeId: string,
    updates: Array<{ sku: string; quantity: number; fulfillmentLatency?: number }>
  ): Promise<Job> {
    return QueueManager.addJob(
      'amazon-inventory-sync',
      `manual-${storeId}-${Date.now()}`,
      {
        storeId,
        type: 'manual',
        updates,
      },
      { priority: 1 }
    );
  }
}
