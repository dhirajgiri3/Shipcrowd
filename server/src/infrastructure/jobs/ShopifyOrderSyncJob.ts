import { Job } from 'bullmq';
import QueueManager from '../queue/QueueManager';
import ShopifyOrderSyncService from '../../core/application/services/shopify/ShopifyOrderSyncService';
import ShopifyStore from '../database/mongoose/models/ShopifyStore';
import winston from 'winston';

/**
 * ShopifyOrderSyncJob
 *
 * Background job processor for syncing orders from Shopify to Shipcrowd.
 *
 * Features:
 * - Scheduled sync every 15 minutes per store
 * - Manual sync trigger support
 * - Automatic retry on failure (3 attempts)
 * - Exponential backoff
 * - Comprehensive logging
 *
 * Job Data:
 * - storeId: ShopifyStore ID
 * - manual: Boolean (true for manual trigger, false for scheduled)
 */

interface OrderSyncJobData {
  storeId: string;
  manual?: boolean;
}

export class ShopifyOrderSyncJob {
  private static logger = winston.createLogger({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: winston.format.json(),
    transports: [new winston.transports.Console()],
  });

  /**
   * Initialize order sync worker
   */
  static async initialize(): Promise<void> {
    await QueueManager.registerWorker({
      queueName: 'shopify-order-sync',
      processor: this.processJob.bind(this),
      concurrency: 3, // Process 3 stores concurrently
    });

    this.logger.info('Shopify order sync worker initialized');
  }

  /**
   * Process order sync job
   */
  private static async processJob(job: Job<OrderSyncJobData>): Promise<any> {
    const { storeId, manual = false } = job.data;

    this.logger.info('Processing order sync job', {
      jobId: job.id,
      storeId,
      manual,
      attemptsMade: job.attemptsMade,
    });

    try {
      // Get store
      const store = await ShopifyStore.findById(storeId);
      if (!store) {
        throw new Error(`Store not found: ${storeId}`);
      }

      if (!store.isActive) {
        this.logger.info('Store is not active, skipping sync', { storeId });
        return { skipped: true, reason: 'Store not active' };
      }

      if (store.isPaused) {
        this.logger.info('Store sync is paused, skipping', { storeId });
        return { skipped: true, reason: 'Sync paused' };
      }

      // Update sync status
      await store.updateSyncStatus('order', 'SYNCING');

      // Determine sync date (incremental vs full)
      const sinceDate = manual
        ? undefined // Full sync for manual trigger
        : store.syncConfig.orderSync.lastSyncAt; // Incremental for scheduled

      // Sync orders
      const result = await ShopifyOrderSyncService.syncOrders(storeId, sinceDate);

      // Update job progress
      await job.updateProgress(100);

      this.logger.info('Order sync job completed', {
        jobId: job.id,
        storeId,
        ...result,
      });

      return result;
    } catch (error: any) {
      this.logger.error('Order sync job failed', {
        jobId: job.id,
        storeId,
        error: error.message,
        stack: error.stack,
      });

      // Update store sync status on failure
      try {
        await ShopifyStore.findByIdAndUpdate(storeId, {
          'syncConfig.orderSync.syncStatus': 'ERROR',
          'syncConfig.orderSync.lastError': error.message,
          'syncConfig.orderSync.errorCount': { $inc: 1 },
        });
      } catch (updateError) {
        this.logger.error('Failed to update store sync status', { updateError });
      }

      throw error; // Re-throw for BullMQ retry logic
    }
  }

  /**
   * Schedule automatic sync for a store
   *
   * Runs every 15 minutes by default (configurable per store)
   */
  static async scheduleStoreSync(storeId: string): Promise<void> {
    const store = await ShopifyStore.findById(storeId);
    if (!store) {
      throw new Error(`Store not found: ${storeId}`);
    }

    if (!store.syncConfig.orderSync.enabled || !store.syncConfig.orderSync.autoSync) {
      this.logger.info('Auto-sync not enabled for store, skipping schedule', { storeId });
      return;
    }

    const intervalMinutes = store.syncConfig.orderSync.syncInterval || 15;

    // Convert minutes to cron expression (e.g., */15 * * * * = every 15 minutes)
    const cronExpression = `*/${intervalMinutes} * * * *`;

    await QueueManager.addRepeatableJob(
      'shopify-order-sync',
      `order-sync-${storeId}`,
      { storeId, manual: false },
      cronExpression
    );

    this.logger.info('Scheduled order sync for store', {
      storeId,
      intervalMinutes,
      cronExpression,
    });
  }

  /**
   * Unschedule automatic sync for a store
   */
  static async unscheduleStoreSync(storeId: string): Promise<void> {
    const jobKey = `order-sync-${storeId}`;

    await QueueManager.removeRepeatableJob('shopify-order-sync', jobKey);

    this.logger.info('Unscheduled order sync for store', { storeId });
  }

  /**
   * Trigger manual sync for a store
   *
   * @param storeId - ShopifyStore ID
   * @param priority - Job priority (1 = high, 10 = low)
   * @returns Job instance
   */
  static async triggerManualSync(storeId: string, priority: number = 1): Promise<Job> {
    const job = await QueueManager.addJob(
      'shopify-order-sync',
      `manual-sync-${storeId}-${Date.now()}`,
      { storeId, manual: true },
      {
        priority,
        removeOnComplete: true, // Clean up immediately after completion
      }
    );

    this.logger.info('Triggered manual order sync', {
      jobId: job.id,
      storeId,
      priority,
    });

    return job;
  }

  /**
   * Schedule syncs for all active stores
   */
  static async scheduleAllStores(): Promise<void> {
    const stores = await ShopifyStore.find({
      isActive: true,
      'syncConfig.orderSync.enabled': true,
      'syncConfig.orderSync.autoSync': true,
    });

    this.logger.info('Scheduling order sync for all active stores', {
      count: stores.length,
    });

    for (const store of stores) {
      try {
        await this.scheduleStoreSync(String(store._id));
      } catch (error: any) {
        this.logger.error('Failed to schedule store sync', {
          storeId: store._id,
          error: error.message,
        });
      }
    }

    this.logger.info('Completed scheduling for all stores');
  }

  /**
   * Get sync job statistics
   */
  static async getJobStats(): Promise<any> {
    return QueueManager.getQueueStats('shopify-order-sync');
  }

  /**
   * Clean old completed/failed jobs
   */
  static async cleanOldJobs(gracePeriodMs: number = 86400000): Promise<void> {
    await QueueManager.cleanQueue('shopify-order-sync', gracePeriodMs);
    this.logger.info('Cleaned old order sync jobs', { gracePeriodMs });
  }
}

export default ShopifyOrderSyncJob;
