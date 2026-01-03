/**
 * WooCommerceOrderSyncService
 *
 * Handles order synchronization from WooCommerce to Shipcrowd.
 *
 * Features:
 * - Fetch orders from WooCommerce REST API
 * - Transform WooCommerce order schema to Shipcrowd order schema
 * - Create/update orders in Shipcrowd database
 * - Prevent duplicate orders
 * - Track sync statistics
 *
 * Sync Flow:
 * 1. Get WooCommerce store with decrypted credentials
 * 2. Fetch orders from WooCommerce (with pagination)
 * 3. Transform each order to Shipcrowd format
 * 4. Check for existing order (by woocommerceOrderId)
 * 5. Create new order or update existing
 * 6. Update sync logs and statistics
 */

import WooCommerceStore from '../../../../infrastructure/database/mongoose/models/woocommerce-store.model';
import WooCommerceSyncLog from '../../../../infrastructure/database/mongoose/models/woocommerce-sync-log.model';
import Order from '../../../../infrastructure/database/mongoose/models/order.model';
import WooCommerceClient from '../../../../infrastructure/integrations/ecommerce/woocommerce/woocommerce.client';
import { WooCommerceOrder } from '../../../../infrastructure/integrations/ecommerce/woocommerce/woocommerce.types';
import { AppError } from '../../../../shared/errors/app.error';
import logger from '../../../../shared/logger/winston.logger';

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
    const syncLog = await WooCommerceSyncLog.create({
      storeId,
      syncType: 'order',
      status: 'IN_PROGRESS',
      startTime: new Date(),
    });

    try {
      // 1. Get store with credentials
      const store = await WooCommerceStore.findById(storeId).select(
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
          });

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

          // Create or update order
          if (existingOrder) {
            // Update existing order
            Object.assign(existingOrder, mappedOrder);
            await existingOrder.save();
            result.itemsSynced++;

            logger.debug('WooCommerce order updated', {
              orderId: wooOrder.id,
              shipcrowdOrderId: existingOrder._id,
            });
          } else {
            // Create new order
            const newOrder = await Order.create(mappedOrder);
            result.itemsSynced++;

            logger.debug('WooCommerce order created', {
              orderId: wooOrder.id,
              shipcrowdOrderId: newOrder._id,
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

      logger.info('WooCommerce order sync completed', {
        storeId,
        ...result,
      });

      return result;
    } catch (error: any) {
      logger.error('WooCommerce order sync failed', {
        storeId,
        error: error.message,
      });

      await syncLog.failSync(error.message);

      // Update store sync status to ERROR
      const store = await WooCommerceStore.findById(storeId);
      if (store) {
        await store.updateSyncStatus('order', 'ERROR', error.message);
      }

      throw error;
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

      // Create or update
      let order;
      if (existingOrder) {
        Object.assign(existingOrder, mappedOrder);
        order = await existingOrder.save();
      } else {
        order = await Order.create(mappedOrder);
      }

      logger.info('WooCommerce order synced', {
        wooOrderId,
        shipcrowdOrderId: order._id,
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
    return {
      // Basic info
      orderNumber: this.generateOrderNumber(wooOrder),
      companyId: store.companyId,
      source: 'woocommerce',
      sourceId: wooOrder.id.toString(),
      externalOrderNumber: wooOrder.number,

      // Customer info
      customerInfo: {
        name: `${wooOrder.billing.first_name} ${wooOrder.billing.last_name}`.trim(),
        email: wooOrder.billing.email || '',
        phone: wooOrder.billing.phone || '',
        address: {
          line1: wooOrder.shipping.address_1 || wooOrder.billing.address_1,
          line2: wooOrder.shipping.address_2 || wooOrder.billing.address_2 || '',
          city: wooOrder.shipping.city || wooOrder.billing.city,
          state: wooOrder.shipping.state || wooOrder.billing.state,
          country: wooOrder.shipping.country || wooOrder.billing.country,
          postalCode: wooOrder.shipping.postcode || wooOrder.billing.postcode,
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

      // Order status
      currentStatus: this.mapOrderStatus(wooOrder.status),

      // Totals
      totals: {
        subtotal: parseFloat(wooOrder.total) - parseFloat(wooOrder.total_tax),
        tax: parseFloat(wooOrder.total_tax),
        shipping: parseFloat(wooOrder.shipping_total),
        discount: parseFloat(wooOrder.discount_total),
        total: parseFloat(wooOrder.total),
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
      cancelled: 'failed',
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
      pending: 'PENDING',
      processing: 'PROCESSING',
      'on-hold': 'PENDING',
      completed: 'FULFILLED',
      cancelled: 'CANCELLED',
      refunded: 'REFUNDED',
      failed: 'CANCELLED',
      trash: 'CANCELLED',
    };

    return statusMap[wooStatus] || 'PENDING';
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

      order.currentStatus = 'CANCELLED';
      order.statusHistory.push({
        status: 'CANCELLED',
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
