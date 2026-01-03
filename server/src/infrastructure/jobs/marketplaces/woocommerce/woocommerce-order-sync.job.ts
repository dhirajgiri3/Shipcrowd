/**
 * WooCommerceOrderSyncJob
 *
 * BullMQ job for automated WooCommerce order synchronization.
 *
 * Features:
 * - Scheduled sync every 15 minutes per store
 * - Manual trigger support
 * - Retry logic with exponential backoff
 * - Store-level concurrency control
 * - Error handling and logging
 *
 * Job Flow:
 * 1. Job triggered by cron or manual call
 * 2. Fetch store details from database
 * 3. Call WooCommerceOrderSyncService.syncOrders()
 * 4. Update store sync statistics
 * 5. Log results
 */

import { Job, Queue, Worker } from 'bullmq';
import QueueManager from '../../../utilities/queue-manager';
import RedisConnection from '../../../utilities/redis.connection';
import WooCommerceOrderSyncService from '../../../../core/application/services/woocommerce/woocommerce-order-sync.service';
import { WooCommerceStore } from '../../../database/mongoose/models';
import logger from '../../../../shared/logger/winston.logger';

interface OrderSyncJobData {
  storeId: string;
  manual?: boolean; // Manual trigger vs scheduled
  hoursBack?: number; // For recent sync
}

export default class WooCommerceOrderSyncJob {
  private static queue: Queue | null | undefined = null;
  private static worker: Worker | null = null;

  /**
   * Initialize the order sync job queue and worker
   */
  static async initialize(): Promise<void> {
    try {
      // Get or create queue
      this.queue = QueueManager.getQueue('woocommerce-order-sync');

      if (!this.queue) {
        throw new Error('Failed to get woocommerce-order-sync queue');
      }

      // Create worker
      this.worker = new Worker(
        'woocommerce-order-sync',
        async (job: Job<OrderSyncJobData>) => {
          return this.processJob(job);
        },
        {
          connection: RedisConnection.getConnectionOptions(),
          concurrency: 3, // Process 3 stores in parallel
          limiter: {
            max: 10, // Max 10 jobs
            duration: 60000, // Per minute
          },
        }
      );

      // Worker event listeners
      this.worker.on('completed', (job: Job) => {
        logger.info('WooCommerce order sync job completed', {
          jobId: job.id,
          storeId: job.data.storeId,
          result: job.returnvalue,
        });
      });

      this.worker.on('failed', (job: Job | undefined, error: Error) => {
        logger.error('WooCommerce order sync job failed', {
          jobId: job?.id,
          storeId: job?.data.storeId,
          error: error.message,
          stack: error.stack,
        });
      });

      this.worker.on('error', (error: Error) => {
        logger.error('WooCommerce order sync worker error', {
          error: error.message,
        });
      });

      logger.info('WooCommerce order sync job initialized');
    } catch (error: any) {
      logger.error('Failed to initialize WooCommerce order sync job', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Process order sync job
   */
  private static async processJob(job: Job<OrderSyncJobData>): Promise<any> {
    const { storeId, manual, hoursBack } = job.data;

    try {
      logger.info('Processing WooCommerce order sync job', {
        jobId: job.id,
        storeId,
        manual,
        hoursBack,
      });

      // Verify store exists and is active
      const store = await WooCommerceStore.findById(storeId);

      if (!store) {
        throw new Error(`WooCommerce store not found: ${storeId}`);
      }

      if (!store.isActive) {
        logger.warn('Skipping sync for inactive WooCommerce store', { storeId });
        return {
          skipped: true,
          reason: 'Store is inactive',
        };
      }

      if (store.isPaused) {
        logger.info('Skipping sync for paused WooCommerce store', { storeId });
        return {
          skipped: true,
          reason: 'Store is paused',
        };
      }

      // Perform sync
      let result;
      if (hoursBack) {
        result = await WooCommerceOrderSyncService.syncRecentOrders(storeId, hoursBack);
      } else {
        // Sync from last sync time
        const sinceDate = store.syncConfig.orderSync.lastSyncAt || undefined;
        result = await WooCommerceOrderSyncService.syncOrders(storeId, sinceDate);
      }

      logger.info('WooCommerce order sync job processed successfully', {
        jobId: job.id,
        storeId,
        result,
      });

      return result;
    } catch (error: any) {
      logger.error('WooCommerce order sync job processing failed', {
        jobId: job.id,
        storeId,
        error: error.message,
        stack: error.stack,
      });

      throw error;
    }
  }

  /**
   * Schedule order sync for a specific store
   * Creates a repeatable job that runs every N minutes
   */
  static async scheduleStoreSync(
    storeId: string,
    intervalMinutes: number = 15
  ): Promise<void> {
    try {
      if (!this.queue) {
        throw new Error('WooCommerce order sync queue not initialized');
      }

      // Remove existing repeatable job for this store
      await this.removeStoreSync(storeId);

      // Add new repeatable job
      await this.queue.add(
        `sync-store-${storeId}`,
        { storeId, manual: false },
        {
          repeat: {
            pattern: `*/${intervalMinutes} * * * *`, // Every N minutes
          },
          jobId: `woo-order-sync-${storeId}`,
          removeOnComplete: 100, // Keep last 100 completed jobs
          removeOnFail: 200, // Keep last 200 failed jobs
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000, // Start with 2 seconds
          },
        }
      );

      logger.info('WooCommerce order sync scheduled', {
        storeId,
        intervalMinutes,
      });
    } catch (error: any) {
      logger.error('Failed to schedule WooCommerce order sync', {
        storeId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Remove scheduled sync for a store
   */
  static async removeStoreSync(storeId: string): Promise<void> {
    try {
      if (!this.queue) {
        throw new Error('WooCommerce order sync queue not initialized');
      }

      const repeatableJobs = await this.queue.getRepeatableJobs();

      for (const job of repeatableJobs) {
        if (job.id === `woo-order-sync-${storeId}` || job.name === `sync-store-${storeId}`) {
          await this.queue.removeRepeatableByKey(job.key);
          logger.info('WooCommerce order sync removed', { storeId });
        }
      }
    } catch (error: any) {
      logger.error('Failed to remove WooCommerce order sync', {
        storeId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Trigger manual sync for a store
   * Adds a one-time job with high priority
   */
  static async triggerManualSync(storeId: string, hoursBack?: number): Promise<string> {
    try {
      if (!this.queue) {
        throw new Error('WooCommerce order sync queue not initialized');
      }

      const job = await this.queue.add(
        `manual-sync-${storeId}`,
        {
          storeId,
          manual: true,
          hoursBack,
        },
        {
          priority: 1, // High priority for manual triggers
          removeOnComplete: true,
          attempts: 1, // Don't retry manual syncs
        }
      );

      logger.info('WooCommerce manual order sync triggered', {
        jobId: job.id,
        storeId,
        hoursBack,
      });

      return job.id || '';
    } catch (error: any) {
      logger.error('Failed to trigger WooCommerce manual sync', {
        storeId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Schedule all active stores for sync
   * Called on server startup
   */
  static async scheduleAllStores(): Promise<void> {
    try {
      const stores = await WooCommerceStore.find({
        isActive: true,
        'syncConfig.orderSync.enabled': true,
        'syncConfig.orderSync.autoSync': true,
      });

      logger.info('Scheduling WooCommerce order sync for all active stores', {
        count: stores.length,
      });

      for (const store of stores) {
        const intervalMinutes = store.syncConfig.orderSync.syncInterval || 15;
        await this.scheduleStoreSync(String(store._id), intervalMinutes);
      }

      logger.info('All WooCommerce stores scheduled for order sync');
    } catch (error: any) {
      logger.error('Failed to schedule all WooCommerce stores', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get job status
   */
  static async getJobStatus(jobId: string): Promise<any> {
    try {
      if (!this.queue) {
        throw new Error('WooCommerce order sync queue not initialized');
      }

      const job = await this.queue.getJob(jobId);

      if (!job) {
        return null;
      }

      const state = await job.getState();
      const progress = job.progress;

      return {
        id: job.id,
        name: job.name,
        data: job.data,
        state,
        progress,
        attemptsMade: job.attemptsMade,
        processedOn: job.processedOn,
        finishedOn: job.finishedOn,
        returnvalue: job.returnvalue,
        failedReason: job.failedReason,
      };
    } catch (error: any) {
      logger.error('Failed to get WooCommerce job status', {
        jobId,
        error: error.message,
      });
      return null;
    }
  }

  /**
   * Shutdown worker gracefully
   */
  static async shutdown(): Promise<void> {
    try {
      if (this.worker) {
        await this.worker.close();
        logger.info('WooCommerce order sync worker shut down');
      }
    } catch (error: any) {
      logger.error('Error shutting down WooCommerce order sync worker', {
        error: error.message,
      });
    }
  }
}
