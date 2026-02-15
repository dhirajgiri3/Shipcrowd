/**
 * Flipkart Inventory Sync
 * 
 * Purpose: FlipkartInventorySyncService
 * 
 * DEPENDENCIES:
 * - Database Models, Error Handling
 * 
 * TESTING:
 * Unit Tests: tests/unit/services/.../{filename}.test.ts
 * Coverage: TBD
 * 
 * NOTE: This service needs comprehensive documentation.
 * See SERVICE_TEMPLATE.md for documentation standards.
 */

import { FlipkartProductMapping, FlipkartStore, FlipkartSyncLog } from '../../../../infrastructure/database/mongoose/models';
import FlipkartClient from '../../../../infrastructure/external/ecommerce/flipkart/flipkart.client';
import { AppError } from '../../../../shared/errors/app.error';
import logger from '../../../../shared/logger/winston.logger';

/**
 * FlipkartInventorySyncService
 *
 * Handles pushing inventory from Shipcrowd to Flipkart.
 *
 * Features:
 * - One-way sync (Shipcrowd → Flipkart)
 * - Batch updates (50 SKUs per request)
 * - Flipkart Inventory API v3 integration
 * - ProductMapping validation
 * - Rate limiting (100ms delay between batches)
 * - Comprehensive error handling
 */

interface InventoryUpdate {
  sku: string;
  quantity: number;
}

interface SyncResult {
  itemsProcessed: number;
  itemsSynced: number;
  itemsFailed: number;
  syncErrors: Array<{
    itemId: string;
    itemName?: string;
    error: string;
    errorCode?: string;
    timestamp: Date;
  }>;
}

interface FlipkartInventoryUpdateRequest {
  listings: Array<{
    fsn: string;
    sku: string;
    inventory: number;
  }>;
}

interface FlipkartInventoryUpdateResponse {
  successful?: Array<{
    fsn: string;
    sku: string;
    message?: string;
  }>;
  failed?: Array<{
    fsn: string;
    sku: string;
    error: string;
    errorCode?: string;
  }>;
}

export class FlipkartInventorySyncService {

  /**
   * Push inventory to Flipkart for a single SKU
   *
   * @param storeId - FlipkartStore ID
   * @param sku - Product SKU
   * @param quantity - Available quantity
   */
  static async pushInventoryToFlipkart(
    storeId: string,
    sku: string,
    quantity: number
  ): Promise<void> {
    const store = await FlipkartStore.findById(storeId).select('+apiKey +apiSecret');
    if (!store) {
      throw new AppError('Store not found', 'STORE_NOT_FOUND', 404);
    }

    if (!store.isActive || store.isPaused) {
      throw new AppError('Store is not active or paused', 'STORE_INACTIVE', 400);
    }

    // Find product mapping
    const mapping = await FlipkartProductMapping.findOne({
      flipkartStoreId: storeId,
      ShipcrowdSKU: sku.toUpperCase(),
      isActive: true,
      syncInventory: true,
    });

    if (!mapping) {
      throw new AppError(`No active inventory mapping found for SKU: ${sku}`, 'MAPPING_NOT_FOUND', 404);
    }

    const client = new FlipkartClient({
      apiKey: store.decryptApiKey(),
      apiSecret: store.decryptApiSecret(),
      sellerId: store.sellerId,
    });

    try {
      // Update inventory using Flipkart Inventory API v3
      const requestData: FlipkartInventoryUpdateRequest = {
        listings: [
          {
            fsn: mapping.flipkartFSN,
            sku: mapping.flipkartSKU,
            inventory: quantity,
          },
        ],
      };

      const response = await client.post<FlipkartInventoryUpdateResponse>(
        '/inventory/v3/update',
        requestData
      );

      // Check for errors in response
      if (response.failed && response.failed.length > 0) {
        const error = response.failed[0];
        throw new AppError(
          `Flipkart inventory update failed: ${error.error}`,
          error.errorCode || 'FLIPKART_ERROR',
          400
        );
      }

      // Record success
      await mapping.recordSyncSuccess();

      logger.info('Inventory synced to Flipkart', {
        storeId,
        sku,
        quantity,
        fsn: mapping.flipkartFSN,
      });
    } catch (error: any) {
      await mapping.recordSyncError(error.message);
      throw error;
    }
  }

  /**
   * Batch inventory sync
   *
   * @param storeId - FlipkartStore ID
   * @param updates - Array of SKU and quantity updates
   */
  static async batchInventorySync(
    storeId: string,
    updates: InventoryUpdate[]
  ): Promise<SyncResult> {
    const store = await FlipkartStore.findById(storeId).select('+apiKey +apiSecret');
    if (!store) {
      throw new AppError('Store not found', 'STORE_NOT_FOUND', 404);
    }

    if (!store.isActive || store.isPaused) {
      throw new AppError('Store is not active or paused', 'STORE_INACTIVE', 400);
    }

    // Create sync log
    const syncLog = await FlipkartSyncLog.create({
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

    const client = new FlipkartClient({
      apiKey: store.decryptApiKey(),
      apiSecret: store.decryptApiSecret(),
      sellerId: store.sellerId,
    });

    // Process in batches of 50
    const batchSize = 50;
    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize);
      const batchListings: Array<{
        fsn: string;
        sku: string;
        inventory: number;
        mappingId: string;
        ShipcrowdSKU: string;
      }> = [];
      const batchSkus = batch.map((update) => update.sku.toUpperCase());
      const mappings = batchSkus.length > 0
        ? await FlipkartProductMapping.find({
          flipkartStoreId: storeId,
          ShipcrowdSKU: { $in: batchSkus },
          isActive: true,
          syncInventory: true,
        })
        : [];
      const mappingBySku = new Map(mappings.map((mapping) => [mapping.ShipcrowdSKU, mapping]));
      const mappingById = new Map(mappings.map((mapping) => [String(mapping._id), mapping]));

      // Prepare batch data
      for (const update of batch) {
        result.itemsProcessed++;

        try {
          // Find mapping
          const mapping = mappingBySku.get(update.sku.toUpperCase());

          if (!mapping) {
            result.itemsFailed++;
            result.syncErrors.push({
              itemId: update.sku,
              error: 'No active inventory mapping found',
              timestamp: new Date(),
            });
            continue;
          }

          batchListings.push({
            fsn: mapping.flipkartFSN,
            sku: mapping.flipkartSKU,
            inventory: update.quantity,
            mappingId: String(mapping._id),
            ShipcrowdSKU: update.sku,
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

      // Send batch update to Flipkart
      if (batchListings.length > 0) {
        try {
          const requestData: FlipkartInventoryUpdateRequest = {
            listings: batchListings.map((item) => ({
              fsn: item.fsn,
              sku: item.sku,
              inventory: item.inventory,
            })),
          };

          const response = await client.post<FlipkartInventoryUpdateResponse>(
            '/inventory/v3/update',
            requestData
          );

          // Process successful updates
          if (response.successful && response.successful.length > 0) {
            for (const success of response.successful) {
              const item = batchListings.find((b) => b.fsn === success.fsn);
              if (item) {
                const mapping = mappingById.get(item.mappingId);
                if (mapping) {
                  await mapping.recordSyncSuccess();
                }
                result.itemsSynced++;

                logger.debug('Synced inventory for SKU', {
                  sku: item.ShipcrowdSKU,
                  fsn: item.fsn,
                  quantity: item.inventory,
                });
              }
            }
          }

          // Process failed updates
          if (response.failed && response.failed.length > 0) {
            for (const failure of response.failed) {
              const item = batchListings.find((b) => b.fsn === failure.fsn);
              if (item) {
                const mapping = mappingById.get(item.mappingId);
                if (mapping) {
                  await mapping.recordSyncError(failure.error);
                }
                result.itemsFailed++;
                result.syncErrors.push({
                  itemId: item.ShipcrowdSKU,
                  error: failure.error,
                  errorCode: failure.errorCode,
                  timestamp: new Date(),
                });

                logger.error('Failed to sync inventory for SKU', {
                  sku: item.ShipcrowdSKU,
                  fsn: item.fsn,
                  error: failure.error,
                });
              }
            }
          }
        } catch (error: any) {
          // Batch request failed
          for (const item of batchListings) {
            result.itemsFailed++;
            result.syncErrors.push({
              itemId: item.ShipcrowdSKU,
              error: error.message,
              timestamp: new Date(),
            });
          }

          logger.error('Batch inventory sync request failed', {
            error: error.message,
            batchSize: batchListings.length,
          });
        }
      }

      // Rate limiting delay between batches
      if (i + batchSize < updates.length) {
        await this.sleep(100); // 100ms delay
      }
    }

    // Complete sync log
    const syncErrors = result.syncErrors.map(
      (e) => `${e.itemId}: ${e.error}${e.errorCode ? ` (${e.errorCode})` : ''}`
    );

    await syncLog.completeSyncWithErrors(
      result.itemsSynced,
      0, // skipped
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
   *
   * @param mappingId - FlipkartProductMapping ID
   * @param quantity - Available quantity
   */
  static async syncProductInventory(mappingId: string, quantity: number): Promise<void> {
    const mapping = await FlipkartProductMapping.findById(mappingId);
    if (!mapping) {
      throw new AppError('Product mapping not found', 'MAPPING_NOT_FOUND', 404);
    }

    if (!mapping.isActive || !mapping.syncInventory) {
      throw new AppError('Inventory sync not enabled for this mapping', 'SYNC_DISABLED', 400);
    }

    await this.pushInventoryToFlipkart(
      mapping.flipkartStoreId.toString(),
      mapping.ShipcrowdSKU,
      quantity
    );
  }

  /**
   * Sleep utility
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export default FlipkartInventorySyncService;
