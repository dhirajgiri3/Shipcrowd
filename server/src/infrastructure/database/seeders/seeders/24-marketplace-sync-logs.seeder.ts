/**
 * Marketplace Sync Logs Seeder
 * 
 * Generates sync logs for marketplace stores.
 */

import mongoose from 'mongoose';
import ShopifyStore from '../../mongoose/models/marketplaces/shopify/shopify-store.model';
import WooCommerceStore from '../../mongoose/models/marketplaces/woocommerce/woocommerce-store.model';
import AmazonStore from '../../mongoose/models/marketplaces/amazon/amazon-store.model';
import FlipkartStore from '../../mongoose/models/marketplaces/flipkart/flipkart-store.model';

import ShopifySyncLog from '../../mongoose/models/marketplaces/shopify/shopify-sync-log.model';
import WooCommerceSyncLog from '../../mongoose/models/marketplaces/woocommerce/woocommerce-sync-log.model';
import AmazonSyncLog from '../../mongoose/models/marketplaces/amazon/amazon-sync-log.model';
import FlipkartSyncLog from '../../mongoose/models/marketplaces/flipkart/flipkart-sync-log.model';

import { logger, createTimer } from '../utils/logger.utils';
import { selectRandom, selectWeightedFromObject } from '../utils/random.utils';

const SYNC_STATUS_WEIGHTS = {
    'success': 0.70,
    'partial': 0.15,
    'failed': 0.10,
    'syncing': 0.05
};

const SYNC_TYPES = ['order', 'inventory', 'product'];

function generateSyncLogData(storeId: string, companyId: string) {
    const status = selectWeightedFromObject(SYNC_STATUS_WEIGHTS);
    const startedAt = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
    const completedAt = status === 'syncing' ? null : new Date(startedAt.getTime() + Math.random() * 60 * 60 * 1000);

    // Create random errors if failed or partial
    const errors = (status === 'failed' || status === 'partial') ? [
        {
            recordId: `REC-${Math.floor(Math.random() * 1000)}`,
            externalId: `EXT-${Math.floor(Math.random() * 1000)}`,
            errorCode: 'SYNC_ERROR',
            errorMessage: 'Simulated sync error',
            timestamp: new Date()
        }
    ] : [];

    return {
        storeId,
        companyId,
        syncType: selectRandom(SYNC_TYPES),
        status,
        startedAt,
        completedAt,
        duration: completedAt ? (completedAt.getTime() - startedAt.getTime()) : null,
        totalRecords: Math.floor(Math.random() * 100) + 10,
        successCount: status === 'success' ? 100 : Math.floor(Math.random() * 90),
        failureCount: errors.length,
        errors,
        retryCount: status === 'failed' ? Math.floor(Math.random() * 3) : 0,
        nextRetryAt: status === 'failed' ? new Date(Date.now() + 60 * 60 * 1000) : null,
        metadata: {
            source: selectRandom(['manual', 'webhook', 'scheduled']),
            trigger: selectRandom(['user', 'system'])
        }
    };
}

export async function seedMarketplaceSyncLogs(): Promise<void> {
    const timer = createTimer();
    logger.step(24, 'Seeding Marketplace Sync Logs');

    try {
        const shopifyStores = await ShopifyStore.find().lean();
        const wooCommerceStores = await WooCommerceStore.find().lean();
        const amazonStores = await AmazonStore.find().lean();
        const flipkartStores = await FlipkartStore.find().lean();

        const allStores = [
            { type: 'shopify', stores: shopifyStores, model: ShopifySyncLog },
            { type: 'woocommerce', stores: wooCommerceStores, model: WooCommerceSyncLog },
            { type: 'amazon', stores: amazonStores, model: AmazonSyncLog },
            { type: 'flipkart', stores: flipkartStores, model: FlipkartSyncLog }
        ];

        let totalLogs = 0;

        for (const { type, stores, model } of allStores) {
            const logsToInsert: any[] = [];

            for (const store of stores) {
                // Generate 15 logs per store
                for (let i = 0; i < 15; i++) {
                    logsToInsert.push(generateSyncLogData((store as any)._id, (store as any).companyId));
                }
            }

            if (logsToInsert.length > 0) {
                await (model as any).insertMany(logsToInsert);
                totalLogs += logsToInsert.length;
                logger.debug(`Seeded ${logsToInsert.length} ${type} sync logs`);
            }
        }

        logger.complete('Marketplace Sync Logs', totalLogs, timer.elapsed());
    } catch (error) {
        logger.error('Failed to seed marketplace sync logs:', error);
        throw error;
    }
}
