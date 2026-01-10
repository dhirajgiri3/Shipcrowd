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
import { selectRandom, selectWeightedFromObject, randomInt } from '../utils/random.utils';
import { subMinutes } from '../utils/date.utils';

const SYNC_STATUS_WEIGHTS = {
    'success': 0.70,
    'partial': 0.15,
    'failed': 0.10,
    'syncing': 0.05
};

const SYNC_TYPES = ['order', 'inventory', 'product'];

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
    const statusKey = selectWeightedFromObject(statuses); // Always picking uppercase key first
    // Map status to correct casing
    // Shopify: UPPERCASE ('COMPLETED')
    // Others: UPPERCASE ('COMPLETED') - Checked schemas, they ALL use UPPERCASE for status: 'IN_PROGRESS', 'COMPLETED', etc.
    // Wait, let me double check schemas. 
    // WooCommerce: enum: ['IN_PROGRESS', 'COMPLETED', 'FAILED', 'PARTIAL'] (UPPERCASE)
    // Amazon: enum: ['IN_PROGRESS', 'COMPLETED', 'FAILED', 'PARTIAL'] (UPPERCASE)
    // Flipkart: enum: ['IN_PROGRESS', 'COMPLETED', 'FAILED', 'PARTIAL'] (UPPERCASE)
    // Shopify: enum: ['IN_PROGRESS', 'COMPLETED', 'PARTIAL', 'FAILED'] (UPPERCASE)
    // So STATUS is consistently UPPERCASE. Good.
    const status = statusKey;

    const syncType = selectRandom(syncTypes);
    const syncTrigger = selectRandom(syncTriggers);

    const startTime = subMinutes(new Date(), randomInt(0, 10000));
    const duration = randomInt(500, 5000);
    const endTime = new Date(startTime.getTime() + duration);

    // Generate Items Stats
    const itemsProcessed = randomInt(10, 100);
    let itemsSynced = itemsProcessed;
    let itemsFailed = 0;

    if (status === 'PARTIAL') {
        itemsFailed = randomInt(1, 5);
        itemsSynced = itemsProcessed - itemsFailed;
    } else if (status === 'FAILED') {
        itemsSynced = 0;
        itemsFailed = itemsProcessed;
    }

    const log: any = {
        storeId: store._id,
        // companyId is ONLY in Shopify schema! Others use storeId reference which has company.
        // Wait, let's check schemas again.
        // Shopify: companyId, storeId.
        // WooCommerce: storeId (no companyId explicit).
        // Amazon: storeId (no companyId).
        // Flipkart: storeId (no companyId).
        // So I should only include companyId if Shopify.

        syncType: syncType,
        status: status,
        startTime: startTime,
        endTime: endTime,
        duration: duration,
        itemsProcessed: itemsProcessed,
        itemsSynced: itemsSynced,
        itemsFailed: itemsFailed,
        itemsSkipped: 0,
        // apiCallsUsed Only in Shopify? Not in others.
        // Others have syncErrors array of strings. Shopify has array of objects.
        metadata: {},
        createdAt: startTime,
        updatedAt: endTime
    };

    if (isShopify) {
        log.companyId = store.companyId;
        log.syncTrigger = syncTrigger;
        log.apiCallsUsed = randomInt(5, 50);

        // Shopify Sync Errors (Array of Objects)
        if (status !== 'COMPLETED') {
            log.syncErrors = [{
                itemId: `ITEM-${randomInt(1000, 9999)}`,
                error: 'Validation failed',
                timestamp: endTime
            }];
        }
    } else {
        // Others Sync Errors (Array of Strings)
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
            { type: 'Shopify', stores: shopifyStores, model: ShopifySyncLog },
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
