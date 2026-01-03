/**
 * AmazonInventorySyncService
 *
 * Handles pushing inventory from Shipcrowd to Amazon using SP-API Feeds.
 *
 * Features:
 * - One-way sync (Shipcrowd → Amazon)
 * - Batch updates using XML feeds
 * - Async feed processing with polling
 * - ProductMapping validation
 * - Rate limiting
 * - Comprehensive error handling
 */

import { AmazonStore } from '../../../../infrastructure/database/mongoose/models';
import { AmazonProductMapping, IAmazonProductMapping } from '../../../../infrastructure/database/mongoose/models';
import { AmazonSyncLog } from '../../../../infrastructure/database/mongoose/models';
import { AmazonClient } from '../../../../infrastructure/external/ecommerce/amazon/amazon.client';
import AmazonOAuthService from './amazon-oauth.service';
import { AppError } from '../../../../shared/errors/app.error';
import logger from '../../../../shared/logger/winston.logger';

interface InventoryUpdate {
    sku: string;
    quantity: number;
    fulfillmentLatency?: number; // Days to ship
}

interface SyncResult {
    itemsProcessed: number;
    itemsSynced: number;
    itemsFailed: number;
    feedId?: string;
    syncErrors: Array<{
        itemId: string;
        itemName?: string;
        error: string;
        errorCode?: string;
        timestamp: Date;
    }>;
}

export default class AmazonInventorySyncService {
    /**
     * Record sync success on a mapping
     */
    private static async recordMappingSyncSuccess(mapping: IAmazonProductMapping): Promise<void> {
        mapping.lastSyncAt = new Date();
        mapping.lastSyncStatus = 'SUCCESS';
        mapping.lastSyncError = undefined;
        mapping.lastInventorySyncAt = new Date();
        await mapping.save();
    }

    /**
     * Record sync error on a mapping  
     */
    private static async recordMappingSyncError(mapping: IAmazonProductMapping, error: string): Promise<void> {
        mapping.lastSyncAt = new Date();
        mapping.lastSyncStatus = 'FAILED';
        mapping.lastSyncError = error;
        await mapping.save();
    }

    /**
     * Push inventory to Amazon for a single SKU
     */
    static async pushInventoryToAmazon(
        storeId: string,
        sku: string,
        quantity: number
    ): Promise<void> {
        const store = await AmazonStore.findById(storeId).select(
            '+lwaClientId +lwaClientSecret +lwaRefreshToken +awsAccessKeyId +awsSecretAccessKey'
        );

        if (!store) {
            throw new AppError('Amazon store not found', 'AMAZON_STORE_NOT_FOUND', 404);
        }

        if (!store.isActive || store.isPaused) {
            throw new AppError('Amazon store is not active or is paused', 'AMAZON_STORE_INACTIVE', 400);
        }

        // Find product mapping
        const mapping = await AmazonProductMapping.findOne({
            amazonStoreId: storeId,
            shipcrowdSKU: sku.toUpperCase(),
            isActive: true,
            syncInventory: true,
        });

        if (!mapping) {
            throw new AppError(
                `No active inventory mapping found for SKU: ${sku}`,
                'AMAZON_MAPPING_NOT_FOUND',
                404
            );
        }

        const client = await AmazonOAuthService.createClientForStore(storeId);

        try {
            // Use the client's updateInventory method (takes array, returns feedId)
            const feedId = await client.updateInventory([
                { sku: mapping.amazonSKU, quantity },
            ]);

            // Record success on mapping
            await this.recordMappingSyncSuccess(mapping);

            logger.info('Inventory synced to Amazon', {
                storeId,
                sku,
                quantity,
                sellerSKU: mapping.amazonSKU,
                feedId,
            });
        } catch (error: any) {
            await this.recordMappingSyncError(mapping, error.message);
            throw error;
        }
    }

    /**
     * Batch inventory sync using XML feed
     */
    static async batchInventorySync(
        storeId: string,
        updates: InventoryUpdate[]
    ): Promise<SyncResult> {
        const store = await AmazonStore.findById(storeId).select(
            '+lwaClientId +lwaClientSecret +lwaRefreshToken +awsAccessKeyId +awsSecretAccessKey'
        );

        if (!store) {
            throw new AppError('Amazon store not found', 'AMAZON_STORE_NOT_FOUND', 404);
        }

        if (!store.isActive || store.isPaused) {
            throw new AppError('Amazon store is not active or is paused', 'AMAZON_STORE_INACTIVE', 400);
        }

        // Create sync log
        const syncLog = await AmazonSyncLog.create({
            storeId,
            syncType: 'inventory',
            status: 'IN_PROGRESS',
            startTime: new Date(),
            itemsProcessed: 0,
            itemsSynced: 0,
            itemsSkipped: 0,
            itemsFailed: 0,
        });

        logger.info('Starting batch inventory sync', {
            storeId,
            count: updates.length,
            syncLogId: syncLog._id,
        });

        const result: SyncResult = {
            itemsProcessed: 0,
            itemsSynced: 0,
            itemsFailed: 0,
            syncErrors: [],
        };

        const client = await AmazonOAuthService.createClientForStore(storeId);

        // Build inventory messages for XML feed
        const inventoryMessages: Array<{
            sku: string;
            quantity: number;
            mappingId: string;
            shipcrowdSKU: string;
        }> = [];

        // Process each update and find mappings
        for (const update of updates) {
            result.itemsProcessed++;

            try {
                const mapping = await AmazonProductMapping.findOne({
                    amazonStoreId: storeId,
                    shipcrowdSKU: update.sku.toUpperCase(),
                    isActive: true,
                    syncInventory: true,
                });

                if (!mapping) {
                    result.itemsFailed++;
                    result.syncErrors.push({
                        itemId: update.sku,
                        error: 'No active inventory mapping found',
                        timestamp: new Date(),
                    });
                    continue;
                }

                inventoryMessages.push({
                    sku: mapping.amazonSKU,
                    quantity: update.quantity,
                    mappingId: String(mapping._id),
                    shipcrowdSKU: update.sku,
                });
            } catch (error: any) {
                result.itemsFailed++;
                result.syncErrors.push({
                    itemId: update.sku,
                    error: error.message,
                    timestamp: new Date(),
                });
            }
        }

        // If no valid messages, complete early
        if (inventoryMessages.length === 0) {
            const syncErrors = result.syncErrors.map((e) => `${e.itemId}: ${e.error}`);
            await syncLog.completeSyncWithErrors(0, 0, result.itemsFailed, syncErrors);
            return result;
        }

        try {
            // Submit inventory update feed
            const feedId = await client.updateInventory(
                inventoryMessages.map((m) => ({ sku: m.sku, quantity: m.quantity }))
            );

            result.feedId = feedId;

            logger.info('Inventory feed submitted', {
                storeId,
                feedId,
                messageCount: inventoryMessages.length,
            });

            // Poll for feed completion (max 5 minutes)
            const feedResult = await client.pollFeedUntilComplete(feedId);

            // Process feed result
            if (feedResult.processingStatus === 'DONE') {
                // Mark all as synced if feed completed successfully
                for (const msg of inventoryMessages) {
                    try {
                        const mapping = await AmazonProductMapping.findById(msg.mappingId);
                        if (mapping) {
                            await this.recordMappingSyncSuccess(mapping);
                        }
                        result.itemsSynced++;

                        logger.debug('Synced inventory for SKU', {
                            sku: msg.shipcrowdSKU,
                            sellerSKU: msg.sku,
                            quantity: msg.quantity,
                        });
                    } catch (error: any) {
                        result.itemsFailed++;
                        result.syncErrors.push({
                            itemId: msg.shipcrowdSKU,
                            error: error.message,
                            timestamp: new Date(),
                        });
                    }
                }
            } else {
                // Feed failed
                for (const msg of inventoryMessages) {
                    result.itemsFailed++;
                    result.syncErrors.push({
                        itemId: msg.shipcrowdSKU,
                        error: `Feed processing failed: ${feedResult.processingStatus}`,
                        timestamp: new Date(),
                    });

                    const mapping = await AmazonProductMapping.findById(msg.mappingId);
                    if (mapping) {
                        await this.recordMappingSyncError(mapping, `Feed failed: ${feedResult.processingStatus}`);
                    }
                }
            }
        } catch (error: any) {
            // Feed submission or polling failed
            for (const msg of inventoryMessages) {
                result.itemsFailed++;
                result.syncErrors.push({
                    itemId: msg.shipcrowdSKU,
                    error: error.message,
                    timestamp: new Date(),
                });
            }

            logger.error('Batch inventory sync feed failed', {
                storeId,
                error: error.message,
            });
        }

        // Complete sync log
        const syncErrors = result.syncErrors.map((e) => `${e.itemId}: ${e.error}`);
        await syncLog.completeSyncWithErrors(
            result.itemsSynced,
            0,
            result.itemsFailed,
            syncErrors
        );

        // Update store stats
        await store.incrementSyncStats('inventory', result.itemsSynced);

        logger.info('Batch inventory sync completed', {
            storeId,
            ...result,
            syncLogId: syncLog._id,
        });

        return result;
    }

    /**
     * Sync inventory for a specific product mapping
     */
    static async syncProductInventory(mappingId: string, quantity: number): Promise<void> {
        const mapping = await AmazonProductMapping.findById(mappingId);

        if (!mapping) {
            throw new AppError('Amazon product mapping not found', 'AMAZON_MAPPING_NOT_FOUND', 404);
        }

        if (!mapping.isActive || !mapping.syncInventory) {
            throw new AppError(
                'Inventory sync not enabled for this mapping',
                'AMAZON_SYNC_DISABLED',
                400
            );
        }

        await this.pushInventoryToAmazon(
            mapping.amazonStoreId.toString(),
            mapping.shipcrowdSKU,
            quantity
        );
    }
}
