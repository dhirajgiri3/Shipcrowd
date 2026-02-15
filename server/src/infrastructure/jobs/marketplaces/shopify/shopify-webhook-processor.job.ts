import { Job } from 'bullmq';
import ShopifyWebhookService from '../../../../core/application/services/shopify/shopify-webhook.service';
import logger from '../../../../shared/logger/winston.logger';
import { WebhookEvent } from '../../../database/mongoose/models';
import QueueManager from '../../../utilities/queue-manager';

/**
 * ShopifyWebhookProcessorJob
 *
 * Background job processor for Shopify webhook events.
 *
 * Features:
 * - Async webhook processing (prevents timeout)
 * - Automatic retry on failure (5 attempts)
 * - Exponential backoff
 * - Dead letter queue for failed webhooks
 * - High concurrency (10 workers)
 *
 * Job Data:
 * - eventId: WebhookEvent ID
 * - storeId: ShopifyStore ID
 * - topic: Webhook topic
 * - payload: Webhook payload
 */

interface WebhookJobData {
  eventId: string;
  storeId: string;
  topic: string;
  payload: any;
}

export class ShopifyWebhookProcessorJob {

  /**
   * Initialize webhook processor worker
   */
  static async initialize(): Promise<void> {
    await QueueManager.registerWorker({
      queueName: 'shopify-webhook-process',
      processor: this.processJob.bind(this),
      concurrency: 10, // Process 10 webhooks concurrently
    });

    logger.info('Shopify webhook processor worker initialized');
  }

  /**
   * Process webhook job
   */
  private static async processJob(job: Job<WebhookJobData>): Promise<any> {
    const { eventId, storeId, topic, payload } = job.data;

    logger.info('Processing webhook job', {
      jobId: job.id,
      eventId,
      storeId,
      topic,
      attemptsMade: job.attemptsMade,
    });

    try {
      // Get webhook event
      const event = await WebhookEvent.findById(eventId);
      if (!event) {
        throw new Error(`Webhook event not found: ${eventId}`);
      }

      // Skip if already processed
      if (event.processed) {
        logger.info('Webhook already processed, skipping', {
          eventId,
          topic,
        });
        return { skipped: true, reason: 'Already processed' };
      }

      // Route to appropriate handler
      await this.routeWebhook(storeId, topic, payload);

      // Mark as processed
      await event.markProcessed();

      logger.info('Webhook processed successfully', {
        jobId: job.id,
        eventId,
        topic,
      });

      return { success: true };
    } catch (error: any) {
      logger.error('Webhook processing failed', {
        jobId: job.id,
        eventId,
        topic,
        error: error.message,
        stack: error.stack,
      });

      // Mark as failed
      try {
        const event = await WebhookEvent.findById(eventId);
        if (event) {
          await event.markFailed(error.message);
        }
      } catch (updateError) {
        logger.error('Failed to update webhook event status', { updateError });
      }

      throw error; // Re-throw for BullMQ retry logic
    }
  }

  /**
   * Route webhook to appropriate service handler
   */
  private static async routeWebhook(
    storeId: string,
    topic: string,
    payload: any
  ): Promise<void> {
    switch (topic) {
      case 'orders/create':
        await ShopifyWebhookService.handleOrderCreate(storeId, payload);
        break;

      case 'orders/updated':
        await ShopifyWebhookService.handleOrderUpdated(storeId, payload);
        break;

      case 'orders/cancelled':
        await ShopifyWebhookService.handleOrderCancelled(storeId, payload);
        break;

      case 'orders/fulfilled':
        await ShopifyWebhookService.handleOrderFulfilled(storeId, payload);
        break;

      case 'products/update':
        await ShopifyWebhookService.handleProductUpdate(storeId, payload);
        break;

      case 'inventory_levels/update':
        await ShopifyWebhookService.handleInventoryUpdate(storeId, payload);
        break;

      case 'app/uninstalled':
        await ShopifyWebhookService.handleAppUninstalled(storeId, payload);
        break;

      case 'shop/update':
        await ShopifyWebhookService.handleShopUpdate(storeId, payload);
        break;

      default:
        logger.warn('Unknown webhook topic', { topic });
    }
  }

  /**
   * Get failed webhooks (dead letter queue)
   */
  static async getFailedWebhooks(limit: number = 50): Promise<any[]> {
    return WebhookEvent.getFailedEvents(limit);
  }

  /**
   * Retry failed webhook
   */
  static async retryFailedWebhook(eventId: string): Promise<Job> {
    const event = await WebhookEvent.retryEvent(eventId);

    const job = await QueueManager.addJob(
      'shopify-webhook-process',
      `retry-${eventId}-${Date.now()}`,
      {
        eventId: String(event._id).toString(),
        storeId: event.storeId.toString(),
        topic: event.topic,
        payload: event.payload,
      },
      {
        priority: 1, // High priority for manual retries
      }
    );

    logger.info('Retrying failed webhook', {
      eventId,
      jobId: job.id,
    });

    return job;
  }

  /**
   * Get webhook processing statistics
   */
  static async getProcessingStats(): Promise<any> {
    const [queueStats, queueSize] = await Promise.all([
      QueueManager.getQueueStats('shopify-webhook-process'),
      WebhookEvent.getQueueSize(),
    ]);

    return {
      queue: queueStats,
      events: queueSize,
    };
  }

  /**
   * Clean old processed webhooks
   */
  static async cleanOldWebhooks(retentionDays: number = 90): Promise<number> {
    const deletedCount = await WebhookEvent.cleanupOldEvents(retentionDays);
    logger.info('Cleaned old webhook events', {
      deletedCount,
      retentionDays,
    });
    return deletedCount;
  }

  /**
   * Process unprocessed webhooks (recovery mechanism)
   */
  static async processUnprocessedWebhooks(limit: number = 100): Promise<void> {
    const unprocessed = await WebhookEvent.getUnprocessed(limit);

    logger.info('Found unprocessed webhooks', {
      count: unprocessed.length,
    });

    for (const event of unprocessed) {
      try {
        await QueueManager.addJob(
          'shopify-webhook-process',
          `recovery-${String(event._id)}`,
          {
            eventId: String(event._id).toString(),
            storeId: event.storeId.toString(),
            topic: event.topic,
            payload: event.payload,
          },
          {
            priority: 3, // Medium priority for recovery
          }
        );
      } catch (error: any) {
        logger.error('Failed to queue unprocessed webhook', {
          eventId: String(event._id),
          error: error.message,
        });
      }
    }

    logger.info('Queued unprocessed webhooks for processing', {
      count: unprocessed.length,
    });
  }
}

export default ShopifyWebhookProcessorJob;
