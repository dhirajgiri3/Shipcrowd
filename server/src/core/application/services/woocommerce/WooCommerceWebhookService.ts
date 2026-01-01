/**
 * WooCommerceWebhookService
 *
 * Handles all WooCommerce webhook events.
 *
 * Supported webhooks:
 * 1. order.created - New order placed
 * 2. order.updated - Order modified
 * 3. order.deleted - Order cancelled/deleted
 * 4. product.created - New product added
 * 5. product.updated - Product modified
 * 6. product.deleted - Product removed
 * 7. customer.created - New customer registered
 * 8. customer.updated - Customer information changed
 */

import WooCommerceOrderSyncService from './WooCommerceOrderSyncService';
import WooCommerceProductMapping from '../../../../infrastructure/database/mongoose/models/WooCommerceProductMapping';
import WooCommerceStore from '../../../../infrastructure/database/mongoose/models/WooCommerceStore';
import { WooCommerceOrder, WooCommerceProduct } from '../../../../infrastructure/integrations/ecommerce/woocommerce/WooCommerceTypes';
import logger from '../../../../shared/logger/winston.logger';

export default class WooCommerceWebhookService {
  /**
   * Handle order.created webhook
   * Sync new order to Shipcrowd
   */
  static async handleOrderCreated(payload: WooCommerceOrder, storeId: string): Promise<void> {
    try {
      logger.info('Processing order.created webhook', {
        storeId,
        orderId: payload.id,
        orderNumber: payload.number,
      });

      // Sync order immediately
      await WooCommerceOrderSyncService.syncSingleOrderById(storeId, payload.id.toString());

      logger.info('Order created webhook processed successfully', {
        storeId,
        orderId: payload.id,
      });
    } catch (error: any) {
      logger.error('Failed to process order.created webhook', {
        storeId,
        orderId: payload.id,
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Handle order.updated webhook
   * Update order status in Shipcrowd
   */
  static async handleOrderUpdated(payload: WooCommerceOrder, storeId: string): Promise<void> {
    try {
      logger.info('Processing order.updated webhook', {
        storeId,
        orderId: payload.id,
        status: payload.status,
      });

      const store = await WooCommerceStore.findById(storeId);

      if (!store) {
        throw new Error('Store not found');
      }

      // Update order status
      await WooCommerceOrderSyncService.updateOrderStatus(
        payload.id.toString(),
        payload.status,
        store.companyId.toString()
      );

      logger.info('Order updated webhook processed successfully', {
        storeId,
        orderId: payload.id,
      });
    } catch (error: any) {
      logger.error('Failed to process order.updated webhook', {
        storeId,
        orderId: payload.id,
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Handle order.deleted webhook
   * Cancel order in Shipcrowd
   */
  static async handleOrderDeleted(payload: WooCommerceOrder, storeId: string): Promise<void> {
    try {
      logger.info('Processing order.deleted webhook', {
        storeId,
        orderId: payload.id,
      });

      const store = await WooCommerceStore.findById(storeId);

      if (!store) {
        throw new Error('Store not found');
      }

      // Cancel order
      await WooCommerceOrderSyncService.cancelOrder(
        payload.id.toString(),
        store.companyId.toString()
      );

      logger.info('Order deleted webhook processed successfully', {
        storeId,
        orderId: payload.id,
      });
    } catch (error: any) {
      logger.error('Failed to process order.deleted webhook', {
        storeId,
        orderId: payload.id,
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Handle product.created webhook
   * Optionally auto-create product mapping
   */
  static async handleProductCreated(payload: WooCommerceProduct, storeId: string): Promise<void> {
    try {
      logger.info('Processing product.created webhook', {
        storeId,
        productId: payload.id,
        name: payload.name,
        sku: payload.sku,
      });

      // Check if auto-mapping is enabled for this store
      const store = await WooCommerceStore.findById(storeId);

      if (!store) {
        throw new Error('Store not found');
      }

      // TODO: Implement auto-mapping logic
      // For now, just log the event
      logger.info('Product created in WooCommerce', {
        storeId,
        productId: payload.id,
        sku: payload.sku,
      });
    } catch (error: any) {
      logger.error('Failed to process product.created webhook', {
        storeId,
        productId: payload.id,
        error: error.message,
      });

      // Don't throw - product creation is not critical
    }
  }

  /**
   * Handle product.updated webhook
   * Update product mapping if SKU changed
   */
  static async handleProductUpdated(payload: WooCommerceProduct, storeId: string): Promise<void> {
    try {
      logger.info('Processing product.updated webhook', {
        storeId,
        productId: payload.id,
        sku: payload.sku,
      });

      // Find existing mapping
      const mapping = await WooCommerceProductMapping.findByWooCommerceId(
        storeId,
        payload.id
      );

      if (mapping) {
        // Update mapping if SKU changed
        if (mapping.woocommerceSKU !== payload.sku) {
          logger.info('Product SKU changed, updating mapping', {
            storeId,
            productId: payload.id,
            oldSKU: mapping.woocommerceSKU,
            newSKU: payload.sku,
          });

          mapping.woocommerceSKU = payload.sku;
          mapping.woocommerceTitle = payload.name;
          await mapping.save();
        }
      }

      logger.info('Product updated webhook processed successfully', {
        storeId,
        productId: payload.id,
      });
    } catch (error: any) {
      logger.error('Failed to process product.updated webhook', {
        storeId,
        productId: payload.id,
        error: error.message,
      });

      // Don't throw - product update is not critical
    }
  }

  /**
   * Handle product.deleted webhook
   * Deactivate product mapping
   */
  static async handleProductDeleted(payload: WooCommerceProduct, storeId: string): Promise<void> {
    try {
      logger.info('Processing product.deleted webhook', {
        storeId,
        productId: payload.id,
      });

      // Find and deactivate mapping
      const mapping = await WooCommerceProductMapping.findByWooCommerceId(
        storeId,
        payload.id
      );

      if (mapping) {
        logger.info('Deactivating product mapping', {
          storeId,
          productId: payload.id,
          mappingId: mapping._id,
        });

        mapping.isActive = false;
        await mapping.save();
      }

      logger.info('Product deleted webhook processed successfully', {
        storeId,
        productId: payload.id,
      });
    } catch (error: any) {
      logger.error('Failed to process product.deleted webhook', {
        storeId,
        productId: payload.id,
        error: error.message,
      });

      // Don't throw - product deletion is not critical
    }
  }

  /**
   * Handle customer.created webhook
   * Log customer creation (future: sync to CRM)
   */
  static async handleCustomerCreated(payload: any, storeId: string): Promise<void> {
    try {
      logger.info('Processing customer.created webhook', {
        storeId,
        customerId: payload.id,
        email: payload.email,
      });

      // TODO: Implement customer sync if needed
      // For now, just log the event
    } catch (error: any) {
      logger.error('Failed to process customer.created webhook', {
        storeId,
        customerId: payload.id,
        error: error.message,
      });

      // Don't throw - customer creation is not critical
    }
  }

  /**
   * Handle customer.updated webhook
   * Log customer update (future: sync to CRM)
   */
  static async handleCustomerUpdated(payload: any, storeId: string): Promise<void> {
    try {
      logger.info('Processing customer.updated webhook', {
        storeId,
        customerId: payload.id,
        email: payload.email,
      });

      // TODO: Implement customer sync if needed
      // For now, just log the event
    } catch (error: any) {
      logger.error('Failed to process customer.updated webhook', {
        storeId,
        customerId: payload.id,
        error: error.message,
      });

      // Don't throw - customer update is not critical
    }
  }

  /**
   * Process webhook by topic
   * Routes webhook to appropriate handler
   */
  static async processWebhook(
    topic: string,
    payload: any,
    storeId: string
  ): Promise<void> {
    const topicHandlers: Record<string, (payload: any, storeId: string) => Promise<void>> = {
      'order.created': this.handleOrderCreated.bind(this),
      'order.updated': this.handleOrderUpdated.bind(this),
      'order.deleted': this.handleOrderDeleted.bind(this),
      'product.created': this.handleProductCreated.bind(this),
      'product.updated': this.handleProductUpdated.bind(this),
      'product.deleted': this.handleProductDeleted.bind(this),
      'customer.created': this.handleCustomerCreated.bind(this),
      'customer.updated': this.handleCustomerUpdated.bind(this),
    };

    const handler = topicHandlers[topic];

    if (!handler) {
      logger.warn('Unknown webhook topic', { topic, storeId });
      return;
    }

    await handler(payload, storeId);
  }
}
