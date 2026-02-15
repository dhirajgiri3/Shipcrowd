import { Job } from 'bullmq';
import WooCommerceWebhookService from '../../../../core/application/services/woocommerce/woocommerce-webhook.service';
import logger from '../../../../shared/logger/winston.logger';
import QueueManager from '../../../utilities/queue-manager';

interface WooWebhookJobData {
  storeId: string;
  topic: string;
  payload: any;
}

export default class WooCommerceWebhookProcessorJob {
  static async initialize(): Promise<void> {
    await QueueManager.registerWorker({
      queueName: 'woocommerce-webhook-process',
      processor: this.processJob.bind(this),
      concurrency: 10,
    });

    logger.info('WooCommerce webhook processor worker initialized');
  }

  private static async processJob(job: Job<WooWebhookJobData>): Promise<any> {
    const { storeId, topic, payload } = job.data;

    logger.info('Processing WooCommerce webhook job', {
      jobId: job.id,
      storeId,
      topic,
      attemptsMade: job.attemptsMade,
    });

    switch (topic) {
      case 'order.created':
        await WooCommerceWebhookService.handleOrderCreated(payload, storeId);
        break;
      case 'order.updated':
        await WooCommerceWebhookService.handleOrderUpdated(payload, storeId);
        break;
      case 'order.deleted':
        await WooCommerceWebhookService.handleOrderDeleted(payload, storeId);
        break;
      case 'product.created':
        await WooCommerceWebhookService.handleProductCreated(payload, storeId);
        break;
      case 'product.updated':
        await WooCommerceWebhookService.handleProductUpdated(payload, storeId);
        break;
      case 'product.deleted':
        await WooCommerceWebhookService.handleProductDeleted(payload, storeId);
        break;
      case 'customer.created':
        await WooCommerceWebhookService.handleCustomerCreated(payload, storeId);
        break;
      case 'customer.updated':
        await WooCommerceWebhookService.handleCustomerUpdated(payload, storeId);
        break;
      default:
        logger.warn('Unknown WooCommerce webhook topic', { topic, storeId });
    }

    return { success: true };
  }
}
