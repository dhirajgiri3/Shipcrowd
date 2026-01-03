/**
 * WooCommerceInventorySyncService
 *
 * Handles inventory synchronization from Shipcrowd to WooCommerce.
 * Updates product stock levels in WooCommerce when inventory changes in Shipcrowd.
 *
 * Features:
 * - Push inventory to WooCommerce (one-way sync)
 * - Batch inventory updates (up to 50 SKUs per batch)
 * - Product mapping lookup
 * - Rate limiting and error handling
 *
 * Sync Flow:
 * 1. Get product mapping by Shipcrowd SKU
 * 2. Fetch current inventory level from Shipcrowd
 * 3. Update WooCommerce product stock via REST API
 * 4. Log sync result
 */

import WooCommerceStore from '../../../../infrastructure/database/mongoose/models/woocommerce-store.model';
import WooCommerceProductMapping from '../../../../infrastructure/database/mongoose/models/woocommerce-product-mapping.model';
import WooCommerceSyncLog from '../../../../infrastructure/database/mongoose/models/woocommerce-sync-log.model';
import WooCommerceClient from '../../../../infrastructure/external/ecommerce/woocommerce/woocommerce.client';
import { AppError } from '../../../../shared/errors/app.error';
import logger from '../../../../shared/logger/winston.logger';

interface InventoryUpdate {
  sku: string;
  quantity: number;
  productId?: number;
  variationId?: number;
}

interface BatchSyncResult {
  itemsProcessed: number;
  itemsSynced: number;
  itemsSkipped: number;
  itemsFailed: number;
  errors: Array<{ sku: string; error: string }>;
}

export default class WooCommerceInventorySyncService {
  /**
   * Push inventory for a single SKU to WooCommerce
   */
  static async pushInventoryToWooCommerce(
    storeId: string,
    shipcrowdSKU: string,
    quantity: number
  ): Promise<void> {
    try {
      // 1. Get store
      const store = await WooCommerceStore.findById(storeId).select(
        '+consumerKey +consumerSecret'
      );

      if (!store) {
        throw new AppError('WooCommerce store not found', 'WOOCOMMERCE_STORE_NOT_FOUND', 404);
      }

      // 2. Get product mapping
      const mapping = await WooCommerceProductMapping.findByShipcrowdSKU(storeId, shipcrowdSKU);

      if (!mapping) {
        throw new AppError(
          `No product mapping found for SKU: ${shipcrowdSKU}`,
          'PRODUCT_MAPPING_NOT_FOUND',
          404
        );
      }

      if (!mapping.syncInventory) {
        logger.info('Inventory sync disabled for mapping', {
          mappingId: mapping._id,
          sku: shipcrowdSKU,
        });
        return;
      }

      // 3. Create WooCommerce client
      const client = new WooCommerceClient({
        storeUrl: store.storeUrl,
        consumerKey: store.decryptConsumerKey(),
        consumerSecret: store.decryptConsumerSecret(),
      });

      // 4. Update inventory in WooCommerce
      if (mapping.woocommerceVariationId) {
        // Update variation stock
        await client.put(
          `/products/${mapping.woocommerceProductId}/variations/${mapping.woocommerceVariationId}`,
          {
            stock_quantity: quantity,
            manage_stock: true,
            stock_status: quantity > 0 ? 'instock' : 'outofstock',
          }
        );
      } else {
        // Update simple product stock
        await client.put(`/products/${mapping.woocommerceProductId}`, {
          stock_quantity: quantity,
          manage_stock: true,
          stock_status: quantity > 0 ? 'instock' : 'outofstock',
        });
      }

      // 5. Record successful sync
      await mapping.recordSyncSuccess();

      logger.info('WooCommerce inventory synced successfully', {
        storeId,
        sku: shipcrowdSKU,
        quantity,
        productId: mapping.woocommerceProductId,
        variationId: mapping.woocommerceVariationId,
      });
    } catch (error: any) {
      logger.error('Failed to push inventory to WooCommerce', {
        storeId,
        sku: shipcrowdSKU,
        quantity,
        error: error.message,
      });

      // Record sync error
      const mapping = await WooCommerceProductMapping.findByShipcrowdSKU(storeId, shipcrowdSKU);
      if (mapping) {
        await mapping.recordSyncError(error.message);
      }

      throw error;
    }
  }

  /**
   * Batch inventory sync (up to 50 SKUs)
   * Uses WooCommerce batch API for efficiency
   */
  static async batchInventorySync(
    storeId: string,
    updates: InventoryUpdate[]
  ): Promise<BatchSyncResult> {
    const syncLog = await WooCommerceSyncLog.create({
      storeId,
      syncType: 'inventory',
      status: 'IN_PROGRESS',
      startTime: new Date(),
    });

    const result: BatchSyncResult = {
      itemsProcessed: 0,
      itemsSynced: 0,
      itemsSkipped: 0,
      itemsFailed: 0,
      errors: [],
    };

    try {
      // 1. Get store
      const store = await WooCommerceStore.findById(storeId).select(
        '+consumerKey +consumerSecret'
      );

      if (!store) {
        throw new AppError('WooCommerce store not found', 'WOOCOMMERCE_STORE_NOT_FOUND', 404);
      }

      if (!store.isActive || store.isPaused) {
        logger.info('WooCommerce inventory sync skipped - store inactive or paused', { storeId });
        await syncLog.completeSyncWithErrors(0, 0, 0, []);
        return result;
      }

      // 2. Create client
      const client = new WooCommerceClient({
        storeUrl: store.storeUrl,
        consumerKey: store.decryptConsumerKey(),
        consumerSecret: store.decryptConsumerSecret(),
      });

      // 3. Process in batches of 50
      const batchSize = 50;
      for (let i = 0; i < updates.length; i += batchSize) {
        const batch = updates.slice(i, i + batchSize);

        // Prepare batch update data
        const productUpdates: any[] = [];
        const variationUpdates: Map<number, any[]> = new Map();

        for (const update of batch) {
          result.itemsProcessed++;

          try {
            // Get mapping
            const mapping = await WooCommerceProductMapping.findByShipcrowdSKU(
              storeId,
              update.sku
            );

            if (!mapping || !mapping.syncInventory) {
              result.itemsSkipped++;
              continue;
            }

            const stockData = {
              stock_quantity: update.quantity,
              manage_stock: true,
              stock_status: update.quantity > 0 ? 'instock' : 'outofstock',
            };

            if (mapping.woocommerceVariationId) {
              // Group variations by product
              if (!variationUpdates.has(mapping.woocommerceProductId)) {
                variationUpdates.set(mapping.woocommerceProductId, []);
              }
              variationUpdates.get(mapping.woocommerceProductId)!.push({
                id: mapping.woocommerceVariationId,
                ...stockData,
              });
            } else {
              // Simple product
              productUpdates.push({
                id: mapping.woocommerceProductId,
                ...stockData,
              });
            }
          } catch (error: any) {
            result.itemsFailed++;
            result.errors.push({
              sku: update.sku,
              error: error.message,
            });
          }
        }

        // Send batch updates
        try {
          // Update simple products
          if (productUpdates.length > 0) {
            await client.batch('/products', {
              update: productUpdates,
            });
            result.itemsSynced += productUpdates.length;
          }

          // Update variations (grouped by product)
          for (const [productId, variations] of variationUpdates.entries()) {
            await client.batch(`/products/${productId}/variations`, {
              update: variations,
            });
            result.itemsSynced += variations.length;
          }

          // Rate limiting delay between batches
          if (i + batchSize < updates.length) {
            await this.sleep(100); // 100ms delay
          }
        } catch (error: any) {
          logger.error('Batch inventory update failed', {
            storeId,
            batchIndex: i / batchSize,
            error: error.message,
          });

          result.itemsFailed += batch.length;
          result.errors.push({
            sku: 'BATCH_ERROR',
            error: error.message,
          });
        }
      }

      // 4. Complete sync log
      await syncLog.completeSyncWithErrors(
        result.itemsSynced,
        result.itemsSkipped || 0,
        result.itemsFailed,
        result.errors.map((e) => `${e.sku}: ${e.error}`)
      );

      // 5. Update store stats
      await store.incrementSyncStats('inventory', result.itemsSynced);

      logger.info('WooCommerce batch inventory sync completed', {
        storeId,
        ...result,
      });

      return result;
    } catch (error: any) {
      logger.error('WooCommerce batch inventory sync failed', {
        storeId,
        error: error.message,
      });

      await syncLog.failSync(error.message);
      throw error;
    }
  }

  /**
   * Sync inventory for a specific product mapping
   * Used when inventory changes for a mapped product
   */
  static async syncProductInventory(mappingId: string, quantity: number): Promise<void> {
    try {
      const mapping = await WooCommerceProductMapping.findById(mappingId);

      if (!mapping) {
        throw new AppError('Product mapping not found', 'MAPPING_NOT_FOUND', 404);
      }

      if (!mapping.isActive || !mapping.syncInventory) {
        logger.info('Inventory sync skipped - mapping inactive or sync disabled', {
          mappingId,
        });
        return;
      }

      await this.pushInventoryToWooCommerce(
        mapping.woocommerceStoreId.toString(),
        mapping.shipcrowdSKU,
        quantity
      );
    } catch (error: any) {
      logger.error('Failed to sync product inventory', {
        mappingId,
        quantity,
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Sync all inventory for a store
   * Full inventory sync (expensive operation)
   */
  static async syncAllInventory(storeId: string): Promise<BatchSyncResult> {
    try {
      logger.info('Starting full inventory sync', { storeId });

      // Get all active mappings with sync enabled
      const mappings = await WooCommerceProductMapping.find({
        woocommerceStoreId: storeId,
        isActive: true,
        syncInventory: true,
      });

      logger.info('Found mappings for full sync', {
        storeId,
        count: mappings.length,
      });

      // TODO: Fetch actual inventory levels from Shipcrowd inventory system
      // For now, using placeholder logic
      const updates: InventoryUpdate[] = mappings.map((mapping) => ({
        sku: mapping.shipcrowdSKU,
        quantity: 0, // Replace with actual inventory lookup
        productId: mapping.woocommerceProductId,
        variationId: mapping.woocommerceVariationId || undefined,
      }));

      return this.batchInventorySync(storeId, updates);
    } catch (error: any) {
      logger.error('Full inventory sync failed', {
        storeId,
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Sleep utility for rate limiting
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
