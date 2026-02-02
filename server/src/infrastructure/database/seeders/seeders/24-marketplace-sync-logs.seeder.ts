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

import { SyncLog } from '../../mongoose/models';
import WooCommerceSyncLog from '../../mongoose/models/marketplaces/woocommerce/woocommerce-sync-log.model';
import AmazonSyncLog from '../../mongoose/models/marketplaces/amazon/amazon-sync-log.model';
import FlipkartSyncLog from '../../mongoose/models/marketplaces/flipkart/flipkart-sync-log.model';

import { logger, createTimer } from '../utils/logger.utils';
import { selectRandom, selectWeightedFromObject, randomInt } from '../utils/random.utils';
import { subMinutes } from '../utils/date.utils';

// Helper function to generate data (was private method in class)
function generateSyncLogData(store: any, type: string) {
    const isShopify = type === 'Shopify';

    // Enums casing depends on store type
    // Shopify: UPPERCASE, Others: lowercase
    const syncTypes = isShopify
        ? ['ORDER', 'INVENTORY', 'PRODUCT']
        : ['order', 'inventory', 'product'];

    const syncTriggers = ['SCHEDULED', 'WEBHOOK', 'MANUAL']; // Only used for Shopify

    const statuses = {
        'COMPLETED': 0.7,
        'PARTIAL': 0.2,
        'FAILED': 0.1
    };

    // Select Status
    const statusKey = selectWeightedFromObject(statuses);

    let status: string = statusKey;
    if (isShopify) {
        if (statusKey === 'COMPLETED') status = 'SUCCESS';
        if (statusKey === 'PARTIAL') status = 'PARTIAL_SUCCESS';
    }

    const syncType = selectRandom(syncTypes);
    const syncTrigger = selectRandom(syncTriggers);

    const startTime = subMinutes(new Date(), randomInt(0, 10000));
    const duration = randomInt(500, 5000);
    const endTime = new Date(startTime.getTime() + duration);

    // Generate Items Stats
    const itemsProcessed = randomInt(10, 100);
    let itemsSynced = itemsProcessed;
    let itemsFailed = 0;

    if (status === 'PARTIAL' || status === 'PARTIAL_SUCCESS') {
        itemsFailed = randomInt(1, 5);
        itemsSynced = itemsProcessed - itemsFailed;
    } else if (status === 'FAILED') {
        itemsSynced = 0;
        itemsFailed = itemsProcessed;
    }

    const log: any = {
        storeId: store._id,
        syncType: syncType,
        status: status,
        startTime: startTime,
        duration: duration,
        itemsProcessed: itemsProcessed,
        itemsSynced: itemsSynced,
        itemsFailed: itemsFailed,
        itemsSkipped: 0,
        metadata: {},
        createdAt: startTime,
        updatedAt: endTime
    };

    if (isShopify) {
        log.companyId = store.companyId;
        log.integrationType = 'SHOPIFY';
        log.triggerType = syncTrigger;
        log.startedAt = startTime;
        log.completedAt = endTime;
        log.durationMs = duration;

        if (status !== 'SUCCESS') {
            log.details = {
                errors: [{
                    itemId: `ITEM-${randomInt(1000, 9999)}`,
                    error: 'Validation failed',
                    timestamp: endTime
                }]
            };
        }
    } else {
        log.endTime = endTime;
        if (status !== 'COMPLETED') {
            log.syncErrors = [`Validation failed for item ${randomInt(1000, 9999)}`];
        }
    }

    return log;
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
            { type: 'Shopify', stores: shopifyStores, model: SyncLog },
            { type: 'WooCommerce', stores: wooCommerceStores, model: WooCommerceSyncLog },
            { type: 'Amazon', stores: amazonStores, model: AmazonSyncLog },
            { type: 'Flipkart', stores: flipkartStores, model: FlipkartSyncLog }
        ];

        let totalLogs = 0;

        for (const { type, stores, model } of allStores) {
            const logsToInsert: any[] = [];

            for (const store of stores) {
                // Generate 15 logs per store
                for (let i = 0; i < 15; i++) {
                    logsToInsert.push(generateSyncLogData(store, type));
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
