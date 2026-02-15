/**
 * Shopify Webhook
 * 
 * Purpose: ShopifyWebhookService
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

import { Order, ShopifyProductMapping as ProductMapping, ShopifyStore } from '../../../../infrastructure/database/mongoose/models';
import QueueManager from '../../../../infrastructure/utilities/queue-manager';
import { AppError } from '../../../../shared/errors/app.error';
import logger from '../../../../shared/logger/winston.logger';
import ShopifyOrderSyncService from './shopify-order-sync.service';
import { CacheRepository } from '../../../../infrastructure/redis/cache.repository';

/**
 * ShopifyWebhookService
 *
 * Handles processing of Shopify webhook events in real-time.
 *
 * Webhook Topics Supported:
 * 1. orders/create - New order placed
 * 2. orders/updated - Order modified
 * 3. orders/cancelled - Order cancelled
 * 4. orders/fulfilled - Order fulfilled
 * 5. products/update - Product changed
 * 6. inventory_levels/update - Inventory changed
 * 7. app/uninstalled - Store disconnected
 * 8. shop/update - Store settings changed
 */

export class ShopifyWebhookService {

  /**
   * Handle orders/create webhook
   *
   * Triggered when a new order is placed in Shopify.
   * Immediately syncs the order to Shipcrowd.
   */
  static async handleOrderCreate(storeId: string, payload: any): Promise<void> {
    logger.info('Processing orders/create webhook', {
      storeId,
      orderId: payload.id,
      orderNumber: payload.name,
    });

    try {
      // Queue immediate order sync for this specific order
      await QueueManager.addJob(
        'shopify-order-sync',
        `webhook-order-create-${payload.id}`,
        {
          storeId,
          orderId: payload.id.toString(),
          manual: false,
        },
        {
          priority: 2, // High priority for webhook-triggered syncs
        }
      );

      // Alternative: Sync immediately without queue
      await ShopifyOrderSyncService.syncSingleOrderById(storeId, payload.id.toString());

      logger.info('Order created and queued for sync', {
        storeId,
        orderId: payload.id,
      });
    } catch (error: any) {
      console.error('\n❌ ORDER CREATE WEBHOOK ERROR:');
      console.error('Store ID:', storeId);
      console.error('Order ID:', payload.id);
      console.error('Error:', error);
      console.error('Stack:', error.stack);

      logger.error('Failed to handle orders/create webhook', {
        storeId,
        orderId: payload.id,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Handle orders/updated webhook
   *
   * Triggered when an order is modified (status change, items added, etc.)
   * Updates the corresponding Shipcrowd order.
   */
  static async handleOrderUpdated(storeId: string, payload: any): Promise<void> {
    logger.info('Processing orders/updated webhook', {
      storeId,
      orderId: payload.id,
      orderNumber: payload.name,
    });

    try {
      // Find existing order in Shipcrowd
      const store = await ShopifyStore.findById(storeId);
      if (!store) {
        throw new AppError('Store not found', 'STORE_NOT_FOUND', 404);
      }

      const order = await Order.findOne({
        source: 'shopify',
        sourceId: payload.id.toString(),
        companyId: store.companyId,
      });

      if (!order) {
        // Order doesn't exist yet, sync it
        await ShopifyOrderSyncService.syncSingleOrderById(storeId, payload.id.toString());
        return;
      }

      // Update order status based on Shopify changes
      const paymentStatus = this.mapPaymentStatus(payload.financial_status);
      // cancelled_at takes priority over fulfillment_status
      const currentStatus = payload.cancelled_at
        ? 'cancelled'
        : this.mapFulfillmentStatus(payload.fulfillment_status);

      let updated = false;

      if (order.paymentStatus !== paymentStatus) {
        order.paymentStatus = paymentStatus;
        updated = true;
      }

      if (order.currentStatus !== currentStatus) {
        order.currentStatus = currentStatus;
        order.statusHistory.push({
          status: currentStatus,
          timestamp: new Date(),
          comment: payload.cancelled_at
            ? `Cancelled in Shopify. Reason: ${payload.cancel_reason || 'Not specified'}`
            : 'Updated from Shopify webhook',
        });
        updated = true;
      }

      if (updated) {
        await order.save();

        // Invalidate order list cache so updates appear immediately in UI
        try {
          const cache = new CacheRepository('orders');
          await cache.invalidateTags([`company:${store.companyId}:orders`]);
        } catch (cacheError) {
          logger.warn('Failed to invalidate order cache after webhook update', { error: cacheError });
        }

        logger.info('Order updated from webhook', {
          storeId,
          orderId: payload.id,
          orderNumber: order.orderNumber,
        });
      }
    } catch (error: any) {
      console.error('\n❌ ORDER UPDATED WEBHOOK ERROR:');
      console.error('Store ID:', storeId);
      console.error('Order ID:', payload.id);
      console.error('Error:', error);
      console.error('Stack:', error.stack);

      logger.error('Failed to handle orders/updated webhook', {
        storeId,
        orderId: payload.id,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Handle orders/cancelled webhook
   *
   * Triggered when an order is cancelled.
   * Updates order status to CANCELLED and restores inventory if needed.
   */
  static async handleOrderCancelled(storeId: string, payload: any): Promise<void> {
    logger.info('Processing orders/cancelled webhook', {
      storeId,
      orderId: payload.id,
      orderNumber: payload.name,
    });

    try {
      const store = await ShopifyStore.findById(storeId);
      if (!store) {
        throw new AppError('Store not found', 'STORE_NOT_FOUND', 404);
      }

      const order = await Order.findOne({
        source: 'shopify',
        sourceId: payload.id.toString(),
        companyId: store.companyId,
      });

      if (!order) {
        logger.warn('Order not found for cancellation', {
          storeId,
          orderId: payload.id,
        });
        return;
      }

      // Update order status
      order.currentStatus = 'cancelled';
      order.statusHistory.push({
        status: 'cancelled',
        timestamp: new Date(),
        comment: `Cancelled in Shopify. Reason: ${payload.cancel_reason || 'Not specified'}`,
      });

      await order.save();

      // Invalidate order list cache so updates appear immediately in UI
      try {
        const cache = new CacheRepository('orders');
        await cache.invalidateTags([`company:${store.companyId}:orders`]);
      } catch (cacheError) {
        logger.warn('Failed to invalidate order cache after webhook cancellation', { error: cacheError });
      }

      // TODO: Restore inventory if applicable
      // This would integrate with InventoryService

      logger.info('Order cancelled', {
        storeId,
        orderId: payload.id,
        orderNumber: order.orderNumber,
      });
    } catch (error: any) {
      logger.error('Failed to handle orders/cancelled webhook', {
        storeId,
        orderId: payload.id,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Handle orders/fulfilled webhook
   *
   * Triggered when an order is fulfilled.
   * Updates fulfillment status and syncs tracking number.
   */
  static async handleOrderFulfilled(storeId: string, payload: any): Promise<void> {
    logger.info('Processing orders/fulfilled webhook', {
      storeId,
      orderId: payload.id,
      orderNumber: payload.name,
    });

    try {
      const store = await ShopifyStore.findById(storeId);
      if (!store) {
        throw new AppError('Store not found', 'STORE_NOT_FOUND', 404);
      }

      const order = await Order.findOne({
        source: 'shopify',
        sourceId: payload.id.toString(),
        companyId: store.companyId,
      });

      if (!order) {
        logger.warn('Order not found for fulfillment', {
          storeId,
          orderId: payload.id,
        });
        return;
      }

      // Update order status
      order.currentStatus = 'delivered';
      order.statusHistory.push({
        status: 'delivered',
        timestamp: new Date(),
        comment: 'Fulfilled in Shopify',
      });

      // Extract tracking number if available
      if (payload.fulfillments && payload.fulfillments.length > 0) {
        const fulfillment = payload.fulfillments[0];
        if (fulfillment.tracking_number) {
          order.shippingDetails.trackingNumber = fulfillment.tracking_number;
          order.shippingDetails.provider = fulfillment.tracking_company || undefined;
        }
      }

      await order.save();

      // Invalidate order list cache so updates appear immediately in UI
      try {
        const cache = new CacheRepository('orders');
        await cache.invalidateTags([`company:${store.companyId}:orders`]);
      } catch (cacheError) {
        logger.warn('Failed to invalidate order cache after webhook fulfillment', { error: cacheError });
      }

      logger.info('Order fulfilled', {
        storeId,
        orderId: payload.id,
        orderNumber: order.orderNumber,
        trackingNumber: order.shippingDetails.trackingNumber,
      });
    } catch (error: any) {
      logger.error('Failed to handle orders/fulfilled webhook', {
        storeId,
        orderId: payload.id,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Handle products/update webhook
   *
   * Triggered when a product is updated (title, SKU, variants changed).
   * Refreshes product mappings if SKU changed.
   */
  static async handleProductUpdate(storeId: string, payload: any): Promise<void> {
    logger.info('Processing products/update webhook', {
      storeId,
      productId: payload.id,
      productTitle: payload.title,
    });

    try {
      // Check if any variants have updated SKUs
      for (const variant of payload.variants || []) {
        const mapping = await ProductMapping.findOne({
          shopifyStoreId: storeId,
          shopifyVariantId: variant.id.toString(),
        });

        if (mapping) {
          let updated = false;

          // Update SKU if changed
          if (mapping.shopifySKU !== variant.sku) {
            logger.info('Product SKU changed', {
              variantId: variant.id,
              oldSKU: mapping.shopifySKU,
              newSKU: variant.sku,
            });
            mapping.shopifySKU = variant.sku;
            updated = true;
          }

          // Update title if changed
          const newTitle = `${payload.title} - ${variant.title}`;
          if (mapping.shopifyTitle !== newTitle) {
            mapping.shopifyTitle = newTitle;
            updated = true;
          }

          if (updated) {
            await mapping.save();
          }
        }
      }

      logger.info('Product updated processed', {
        storeId,
        productId: payload.id,
      });
    } catch (error: any) {
      logger.error('Failed to handle products/update webhook', {
        storeId,
        productId: payload.id,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Handle inventory_levels/update webhook
   *
   * Triggered when inventory is updated in Shopify.
   * Optional: Two-way sync (Shopify → Shipcrowd).
   */
  static async handleInventoryUpdate(storeId: string, payload: any): Promise<void> {
    logger.info('Processing inventory_levels/update webhook', {
      storeId,
      inventoryItemId: payload.inventory_item_id,
      available: payload.available,
    });

    try {
      const store = await ShopifyStore.findById(storeId);
      if (!store) {
        throw new AppError('Store not found', 'STORE_NOT_FOUND', 404);
      }

      // Only process if two-way sync is enabled
      if (store.syncConfig.inventorySync.syncDirection !== 'TWO_WAY') {
        logger.debug('Two-way sync not enabled, skipping inventory update', {
          storeId,
        });
        return;
      }

      // Find product mapping by inventory item ID
      const mapping = await ProductMapping.findOne({
        shopifyStoreId: storeId,
        shopifyInventoryItemId: payload.inventory_item_id.toString(),
        isActive: true,
      });

      if (!mapping) {
        logger.debug('No mapping found for inventory item', {
          inventoryItemId: payload.inventory_item_id,
        });
        return;
      }

      // TODO: Update Shipcrowd inventory
      // This would integrate with InventoryService to update stock levels

      logger.info('Inventory updated (two-way sync)', {
        storeId,
        sku: mapping.ShipcrowdSKU,
        available: payload.available,
      });
    } catch (error: any) {
      logger.error('Failed to handle inventory_levels/update webhook', {
        storeId,
        inventoryItemId: payload.inventory_item_id,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Handle app/uninstalled webhook
   *
   * Triggered when the app is uninstalled from Shopify store.
   * Deactivates the store and pauses all sync jobs.
   */
  static async handleAppUninstalled(storeId: string, payload: any): Promise<void> {
    logger.warn('Processing app/uninstalled webhook', {
      storeId,
      shopDomain: payload.domain,
    });

    try {
      const store = await ShopifyStore.findById(storeId);
      if (!store) {
        throw new AppError('Store not found', 'STORE_NOT_FOUND', 404);
      }

      // Deactivate store
      store.isActive = false;
      store.uninstalledAt = new Date();
      await store.save();

      // TODO: Unschedule background jobs
      // This would call ShopifyOrderSyncJob.unscheduleStoreSync(storeId)

      logger.warn('Store deactivated due to app uninstall', {
        storeId,
        shopDomain: store.shopDomain,
      });

      // TODO: Send notification to admin
    } catch (error: any) {
      logger.error('Failed to handle app/uninstalled webhook', {
        storeId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Handle shop/update webhook
   *
   * Triggered when shop settings are updated (name, email, currency, etc.)
   * Updates ShopifyStore metadata.
   */
  static async handleShopUpdate(storeId: string, payload: any): Promise<void> {
    logger.info('Processing shop/update webhook', {
      storeId,
      shopDomain: payload.domain,
    });

    try {
      const store = await ShopifyStore.findById(storeId);
      if (!store) {
        throw new AppError('Store not found', 'STORE_NOT_FOUND', 404);
      }

      // Update store metadata
      store.shopName = payload.name || store.shopName;
      store.shopEmail = payload.email || store.shopEmail;
      store.shopCountry = payload.country_code || store.shopCountry;
      store.shopCurrency = payload.currency || store.shopCurrency;
      store.shopPlan = payload.plan_name || store.shopPlan;

      await store.save();

      logger.info('Shop metadata updated', {
        storeId,
        shopDomain: store.shopDomain,
      });
    } catch (error: any) {
      logger.error('Failed to handle shop/update webhook', {
        storeId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Map Shopify payment status
   */
  private static mapPaymentStatus(financialStatus: string): 'pending' | 'paid' | 'failed' | 'refunded' {
    const statusMap: Record<string, 'pending' | 'paid' | 'failed' | 'refunded'> = {
      pending: 'pending',
      authorized: 'pending',
      partially_paid: 'pending',
      paid: 'paid',
      partially_refunded: 'paid',
      refunded: 'refunded',
      voided: 'failed',
      expired: 'failed',
    };

    return statusMap[financialStatus?.toLowerCase()] || 'pending';
  }

  /**
   * Map Shopify fulfillment status
   * NOTE: Must use lowercase to match order service conventions
   */
  private static mapFulfillmentStatus(fulfillmentStatus: string | null): string {
    if (!fulfillmentStatus) return 'pending';

    const statusMap: Record<string, string> = {
      fulfilled: 'delivered',
      partial: 'processing',
      restocked: 'rto_delivered', // Items returned and restocked, not cancelled
    };

    return statusMap[fulfillmentStatus.toLowerCase()] || 'pending';
  }
}

export default ShopifyWebhookService;
