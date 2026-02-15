/**
 * Worker Entry Point
 *
 * Starts background workers for ecommerce integrations.
 * No scheduling enabled in this entrypoint yet.
 */
import dotenv from 'dotenv';
import connectDB from './config/database';
import logger from './shared/logger/winston.logger';
import QueueManager from './infrastructure/utilities/queue-manager';
import CacheService from './infrastructure/utilities/cache.service';

import ShopifyOrderSyncJob from './infrastructure/jobs/marketplaces/shopify/shopify-order-sync.job';
import ShopifyWebhookProcessorJob from './infrastructure/jobs/marketplaces/shopify/shopify-webhook-processor.job';
import WooCommerceOrderSyncJob from './infrastructure/jobs/marketplaces/woocommerce/woocommerce-order-sync.job';
import WooCommerceWebhookProcessorJob from './infrastructure/jobs/marketplaces/woocommerce/woocommerce-webhook-processor.job';
import AmazonOrderSyncJob from './infrastructure/jobs/marketplaces/amazon/amazon-order-sync.job';
import AmazonInventorySyncJob from './infrastructure/jobs/marketplaces/amazon/amazon-inventory-sync.job';
import FlipkartOrderSyncJob from './infrastructure/jobs/marketplaces/flipkart/flipkart-order-sync.job';
import FlipkartWebhookProcessorJob from './infrastructure/jobs/marketplaces/flipkart/flipkart-webhook-processor.job';
import { SellerPolicyBootstrapJob } from './infrastructure/jobs/organization/seller-policy-bootstrap.job';

dotenv.config();

const startWorkers = async (): Promise<void> => {
  try {
    await connectDB();
    logger.info('Worker DB connected');

    await CacheService.initialize();
    logger.info('Worker cache initialized');

    await QueueManager.initialize();
    logger.info('Worker queue manager initialized');

    await ShopifyOrderSyncJob.initialize();
    await ShopifyWebhookProcessorJob.initialize();
    await WooCommerceOrderSyncJob.initialize();
    await WooCommerceWebhookProcessorJob.initialize();
    await AmazonOrderSyncJob.initialize();
    await AmazonInventorySyncJob.initialize();
    await FlipkartOrderSyncJob.initialize();
    await FlipkartWebhookProcessorJob.initialize();
    await SellerPolicyBootstrapJob.initialize();

    logger.info('Ecommerce workers initialized');
  } catch (error) {
    logger.error('Failed to start workers', error);
    process.exit(1);
  }
};

startWorkers();
