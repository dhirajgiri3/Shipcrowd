/**
 * Woocommerce Order Sync
 * 
 * Purpose: WooCommerceOrderSyncService
 * 
 * DEPENDENCIES:
 * - Database Models, Error Handling, Logger
 * 
 * TESTING:
 * Unit Tests: tests/unit/services/.../{filename}.test.ts
 * Coverage: TBD
 * 
 * NOTE: This service needs comprehensive documentation.
 * See SERVICE_TEMPLATE.md for documentation standards.
 */

import mongoose from 'mongoose';
import { Order, WooCommerceStore, WooCommerceSyncLog, Company } from '../../../../infrastructure/database/mongoose/models';
import WooCommerceClient from '../../../../infrastructure/external/ecommerce/woocommerce/woocommerce.client';
import { WooCommerceOrder } from '../../../../infrastructure/external/ecommerce/woocommerce/woocommerce.types';
import { AppError } from '../../../../shared/errors/app.error';
import logger from '../../../../shared/logger/winston.logger';
import { CacheRepository } from '../../../../infrastructure/redis/cache.repository';

interface SyncResult {
  itemsProcessed: number;
  itemsSynced: number;
  itemsSkipped: number;
  itemsFailed: number;
  errors: Array<{ orderId: number; error: string }>;
}

export default class WooCommerceOrderSyncService {
  /**
   * Sync orders from WooCommerce store
   * Main orchestrator for order synchronization
   */
  static async syncOrders(storeId: string, sinceDate?: Date): Promise<SyncResult> {
    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      const [syncLog] = await WooCommerceSyncLog.create([{
        storeId,
        syncType: 'order',
        status: 'IN_PROGRESS',
        startTime: new Date(),
      }], { session });

      // 1. Get store with credentials
      const store = await WooCommerceStore.findById(storeId, null, { session }).select(
        '+consumerKey +consumerSecret'
      );

      if (!store) {
        throw new AppError('WooCommerce store not found', 'WOOCOMMERCE_STORE_NOT_FOUND', 404);
      }

      if (!store.isActive) {
        throw new AppError('WooCommerce store is not active', 'WOOCOMMERCE_STORE_INACTIVE', 400);
      }

      if (store.isPaused) {
        logger.info('WooCommerce sync skipped - store is paused', { storeId });
        await syncLog.completeSyncWithErrors(0, 0, 0, []);
        return {
          itemsProcessed: 0,
          itemsSynced: 0,
          itemsSkipped: 0,
          itemsFailed: 0,
          errors: [],
        };
      }

      // 2. Update sync status to IN_PROGRESS
      await store.updateSyncStatus('order', 'IN_PROGRESS');

      // 3. Create WooCommerce client
      const client = new WooCommerceClient({
        storeUrl: store.storeUrl,
        consumerKey: store.decryptConsumerKey(),
        consumerSecret: store.decryptConsumerSecret(),
      });

      // 4. Fetch orders from WooCommerce
      const params: Record<string, any> = {
        per_page: 100,
        orderby: 'date',
        order: 'desc',
      };

      // Add date filter if provided
      if (sinceDate) {
        params.after = sinceDate.toISOString();
      }

      logger.info('Fetching WooCommerce orders', {
        storeId,
        sinceDate: sinceDate?.toISOString(),
      });

      const orders = await client.get<WooCommerceOrder[]>('/orders', params);

      logger.info('Fetched WooCommerce orders', {
        storeId,
        count: orders.length,
      });

      // 5. Process each order
      const result: SyncResult = {
        itemsProcessed: 0,
        itemsSynced: 0,
        itemsSkipped: 0,
        itemsFailed: 0,
        errors: [],
      };

      for (const wooOrder of orders) {
        result.itemsProcessed++;

        try {
          // Check if order already exists
          const existingOrder = await Order.findOne({
            source: 'woocommerce',
            sourceId: wooOrder.id.toString(),
            companyId: store.companyId,
          }, null, { session });

          // Skip if order exists and hasn't been updated
          if (existingOrder) {
            const wooOrderUpdated = new Date(wooOrder.date_modified);
            if (existingOrder.updatedAt >= wooOrderUpdated) {
              result.itemsSkipped++;
              continue;
            }
          }

          // Transform WooCommerce order to Shipcrowd order
          const mappedOrder = this.mapWooCommerceOrderToShipcrowd(wooOrder, store);

          // Assign default warehouse for new orders
          if (!existingOrder && !mappedOrder.warehouseId) {
            try {
              const company = await Company.findById(store.companyId)
                .select('settings.defaultWarehouseId')
                .lean();

              if (company?.settings?.defaultWarehouseId) {
                mappedOrder.warehouseId = new mongoose.Types.ObjectId(company.settings.defaultWarehouseId);
              }
            } catch (warehouseError) {
              logger.warn('Failed to assign default warehouse to WooCommerce order', {
                error: warehouseError,
                orderId: wooOrder.id,
              });
            }
          }

          // Create or update order
          if (existingOrder) {
            // Update existing order
            Object.assign(existingOrder, mappedOrder);
            await existingOrder.save({ session });
            result.itemsSynced++;

            logger.debug('WooCommerce order updated', {
              orderId: wooOrder.id,
              ShipcrowdOrderId: existingOrder._id,
            });
          } else {
            // Create new order
            const [newOrder] = await Order.create([mappedOrder], { session });
            result.itemsSynced++;

            logger.debug('WooCommerce order created', {
              orderId: wooOrder.id,
              ShipcrowdOrderId: newOrder._id,
            });
          }
        } catch (error: any) {
          result.itemsFailed++;
          result.errors.push({
            orderId: wooOrder.id,
            error: error.message,
          });

          logger.error('Failed to sync WooCommerce order', {
            orderId: wooOrder.id,
            error: error.message,
          });
        }
      }

      // 6. Update sync log
      await syncLog.completeSyncWithErrors(
        result.itemsSynced,
        result.itemsSkipped,
        result.itemsFailed,
        result.errors.map((e) => e.error)
      );

      // 7. Update store sync status and stats
      await store.updateSyncStatus('order', 'COMPLETED');
      await store.incrementSyncStats('order', result.itemsSynced);

      await session.commitTransaction();

      logger.info('WooCommerce order sync completed', {
        storeId,
        ...result,
      });

      return result;
    } catch (error: any) {
      await session.abortTransaction();

      logger.error('WooCommerce order sync failed (transaction rolled back)', {
        storeId,
        error: error.message,
      });

      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Sync recent orders (last N hours)
   * Quick sync for recent changes
   */
  static async syncRecentOrders(storeId: string, hoursBack: number = 24): Promise<SyncResult> {
    const sinceDate = new Date();
    sinceDate.setHours(sinceDate.getHours() - hoursBack);

    logger.info('Syncing recent WooCommerce orders', {
      storeId,
      hoursBack,
      sinceDate: sinceDate.toISOString(),
    });

    return this.syncOrders(storeId, sinceDate);
  }

  /**
   * Sync single order by WooCommerce ID
   * Used for webhook processing
   */
  static async syncSingleOrderById(storeId: string, wooOrderId: string): Promise<any> {
    try {
      // Get store
      const store = await WooCommerceStore.findById(storeId).select(
        '+consumerKey +consumerSecret'
      );

      if (!store) {
        throw new AppError('WooCommerce store not found', 'WOOCOMMERCE_STORE_NOT_FOUND', 404);
      }

      // Create client
      const client = new WooCommerceClient({
        storeUrl: store.storeUrl,
        consumerKey: store.decryptConsumerKey(),
        consumerSecret: store.decryptConsumerSecret(),
      });

      // Fetch order
      const wooOrder = await client.get<WooCommerceOrder>(`/orders/${wooOrderId}`);

      if (!wooOrder) {
        throw new AppError('Order not found in WooCommerce', 'WOOCOMMERCE_ORDER_NOT_FOUND', 404);
      }

      // Check if order exists
      const existingOrder = await Order.findOne({
        source: 'woocommerce',
        sourceId: wooOrder.id.toString(),
        companyId: store.companyId,
      });

      // Transform order
      const mappedOrder = this.mapWooCommerceOrderToShipcrowd(wooOrder, store);

      // Assign default warehouse for new orders
      if (!existingOrder && !mappedOrder.warehouseId) {
        try {
          const company = await Company.findById(store.companyId)
            .select('settings.defaultWarehouseId')
            .lean();

          if (company?.settings?.defaultWarehouseId) {
            mappedOrder.warehouseId = new mongoose.Types.ObjectId(company.settings.defaultWarehouseId);
          }
        } catch (warehouseError) {
          logger.warn('Failed to assign default warehouse to WooCommerce order', {
            error: warehouseError,
            orderId: wooOrder.id,
          });
        }
      }

      // Create or update
      let order;
      if (existingOrder) {
        Object.assign(existingOrder, mappedOrder);
        order = await existingOrder.save();
      } else {
        order = await Order.create(mappedOrder);
      }

      // Invalidate order list cache so new/updated orders appear immediately
      try {
        const cache = new CacheRepository('orders');
        await cache.invalidateTags([`company:${store.companyId}:orders`]);
      } catch (cacheError) {
        logger.warn('Failed to invalidate order cache after WooCommerce sync', { error: cacheError });
      }

      logger.info('WooCommerce order synced', {
        wooOrderId,
        ShipcrowdOrderId: order._id,
      });

      return order;
    } catch (error: any) {
      logger.error('Failed to sync single WooCommerce order', {
        storeId,
        wooOrderId,
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Transform WooCommerce order to Shipcrowd order format
   * Maps all fields from WooCommerce schema to Shipcrowd schema
   */
  private static mapWooCommerceOrderToShipcrowd(
    wooOrder: WooCommerceOrder,
    store: any
  ): any {
    // Handle null billing/shipping (can happen with digital products, gift cards)
    const billing = wooOrder.billing || {};
    const shipping = wooOrder.shipping || {};

    const customerName = billing.first_name || billing.last_name
      ? `${billing.first_name || ''} ${billing.last_name || ''}`.trim()
      : 'No customer';

    const hasAddress = !!(shipping.address_1 || billing.address_1 || shipping.city || billing.city);

    return {
      // Basic info
      orderNumber: this.generateOrderNumber(wooOrder),
      companyId: store.companyId,
      source: 'woocommerce',
      sourceId: wooOrder.id.toString(),
      externalOrderNumber: wooOrder.number,

      // Customer info
      customerInfo: {
        name: customerName,
        email: billing.email || undefined,
        phone: billing.phone || undefined,
        address: {
          line1: shipping.address_1 || billing.address_1 || (hasAddress ? '' : 'No address provided'),
          line2: shipping.address_2 || billing.address_2 || undefined,
          city: shipping.city || billing.city || (hasAddress ? '' : 'Unknown'),
          state: shipping.state || billing.state || (hasAddress ? '' : 'Unknown'),
          country: shipping.country || billing.country || (hasAddress ? '' : 'Unknown'),
          postalCode: shipping.postcode || billing.postcode || (hasAddress ? '' : '000000'),
        },
      },

      // Products
      products: wooOrder.line_items.map((item) => ({
        name: item.name,
        sku: item.sku || `WOO-${item.product_id}-${item.variation_id || 0}`,
        quantity: item.quantity,
        price: parseFloat(item.price.toString()),
        weight: 0, // WooCommerce doesn't include weight in line items
        imageUrl: item.image?.src || '',
      })),

      // Shipping details
      shippingDetails: {
        shippingCost: parseFloat(wooOrder.shipping_total || '0'),
        provider: wooOrder.shipping_lines[0]?.method_title || 'Standard Shipping',
        shippingMethod: wooOrder.shipping_lines[0]?.method_id || 'flat_rate',
      },

      // Payment
      paymentStatus: this.mapPaymentStatus(wooOrder.status),
      paymentMethod: this.detectPaymentMethod(wooOrder.payment_method),

      // Currency from WooCommerce store settings
      currency: wooOrder.currency || 'USD',

      // Order status
      currentStatus: this.mapOrderStatus(wooOrder.status),

      // Totals
      totals: {
        subtotal: parseFloat(wooOrder.total) - parseFloat(wooOrder.total_tax) || 0,
        tax: parseFloat(wooOrder.total_tax) || 0,
        shipping: parseFloat(wooOrder.shipping_total) || 0,
        discount: parseFloat(wooOrder.discount_total) || 0,
        total: parseFloat(wooOrder.total) || 0,
      },

      // Metadata
      notes: wooOrder.customer_note || '',
      tags: [],

      // Timestamps
      createdAt: new Date(wooOrder.date_created),
      updatedAt: new Date(wooOrder.date_modified),

      // Status history
      statusHistory: [
        {
          status: this.mapOrderStatus(wooOrder.status),
          timestamp: new Date(wooOrder.date_created),
          comment: `Order imported from WooCommerce (${wooOrder.status})`,
        },
      ],

      // WooCommerce specific
      woocommerceStoreId: store._id,
      woocommerceOrderId: wooOrder.id,
    };
  }

  /**
   * Generate Shipcrowd order number from WooCommerce order
   */
  private static generateOrderNumber(wooOrder: WooCommerceOrder): string {
    return `WOO-${wooOrder.number}`;
  }

  /**
   * Map WooCommerce order status to Shipcrowd payment status
   */
  private static mapPaymentStatus(
    wooStatus: string
  ): 'pending' | 'paid' | 'failed' | 'refunded' {
    const statusMap: Record<string, 'pending' | 'paid' | 'failed' | 'refunded'> = {
      pending: 'pending',
      processing: 'paid',
      'on-hold': 'pending',
      completed: 'paid',
      cancelled: 'pending', // Cancelled order doesn't mean payment failed
      refunded: 'refunded',
      failed: 'failed',
    };

    return statusMap[wooStatus] || 'pending';
  }

  /**
   * Map WooCommerce order status to Shipcrowd order status
   */
  private static mapOrderStatus(wooStatus: string): string {
    const statusMap: Record<string, string> = {
      pending: 'pending',
      processing: 'processing',
      'on-hold': 'pending',
      completed: 'delivered',
      cancelled: 'cancelled',
      refunded: 'delivered', // Refunded means goods were delivered but money returned
      failed: 'cancelled',
      trash: 'cancelled',
    };

    return statusMap[wooStatus] || 'pending';
  }

  /**
   * Detect payment method from WooCommerce payment gateway
   */
  private static detectPaymentMethod(paymentGateway: string): 'cod' | 'prepaid' {
    const codGateways = ['cod', 'cash_on_delivery', 'cash'];

    if (codGateways.some((gateway) => paymentGateway.toLowerCase().includes(gateway))) {
      return 'cod';
    }

    return 'prepaid';
  }

  /**
   * Update order status from WooCommerce webhook
   * Used when order.updated webhook is received
   */
  static async updateOrderStatus(
    wooOrderId: string,
    newStatus: string,
    companyId: string
  ): Promise<void> {
    try {
      const order = await Order.findOne({
        source: 'woocommerce',
        sourceId: wooOrderId,
        companyId,
      });

      if (!order) {
        logger.warn('Order not found for status update', { wooOrderId, companyId });
        return;
      }

      const mappedStatus = this.mapOrderStatus(newStatus);

      if (order.currentStatus !== mappedStatus) {
        order.currentStatus = mappedStatus;
        order.statusHistory.push({
          status: mappedStatus,
          timestamp: new Date(),
          comment: `Status updated from WooCommerce webhook (${newStatus})`,
        });
        await order.save();

        logger.info('WooCommerce order status updated', {
          orderId: order._id,
          wooOrderId,
          oldStatus: order.currentStatus,
          newStatus: mappedStatus,
        });
      }
    } catch (error: any) {
      logger.error('Failed to update WooCommerce order status', {
        wooOrderId,
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Cancel order from WooCommerce webhook
   */
  static async cancelOrder(wooOrderId: string, companyId: string): Promise<void> {
    try {
      const order = await Order.findOne({
        source: 'woocommerce',
        sourceId: wooOrderId,
        companyId,
      });

      if (!order) {
        logger.warn('Order not found for cancellation', { wooOrderId, companyId });
        return;
      }

      order.currentStatus = 'cancelled';
      order.statusHistory.push({
        status: 'cancelled',
        timestamp: new Date(),
        comment: 'Order cancelled in WooCommerce',
      });
      await order.save();

      logger.info('WooCommerce order cancelled', {
        orderId: order._id,
        wooOrderId,
      });
    } catch (error: any) {
      logger.error('Failed to cancel WooCommerce order', {
        wooOrderId,
        error: error.message,
      });

      throw error;
    }
  }
}
