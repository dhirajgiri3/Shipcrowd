import mongoose from 'mongoose';
import { Order, ShopifyStore, SyncLog, Company } from '../../../../infrastructure/database/mongoose/models';
import ShopifyClient from '../../../../infrastructure/external/ecommerce/shopify/shopify.client';
import { CacheRepository } from '../../../../infrastructure/redis/cache.repository';
import { AppError } from '../../../../shared/errors/app.error';
import logger from '../../../../shared/logger/winston.logger';

/**
 * ShopifyOrderSyncService
 *
 * Handles synchronization of orders from Shopify to Shipcrowd.
 *
 * Features:
 * - Cursor-based pagination for efficient large-scale sync
 * - Duplicate prevention using shopify order ID
 * - Status mapping (financial + fulfillment)
 * - Payment method detection (COD vs Prepaid)
 * - Incremental sync (since last sync date)
 * - Comprehensive error logging
 */

interface ShopifyOrder {
  id: number;
  name: string;
  order_number: number;
  created_at: string;
  updated_at: string;
  financial_status: string;
  fulfillment_status: string | null;
  cancelled_at?: string | null; // ISO timestamp if order was cancelled
  cancel_reason?: string;
  currency?: string; // ISO 4217 currency code (e.g., 'USD', 'INR')
  email?: string; // Top-level email (when customer is null for gift cards)
  phone?: string; // Top-level phone
  customer?: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
  } | null;
  shipping_address?: {
    address1?: string;
    address2?: string;
    city?: string;
    province?: string;
    province_code?: string; // Alternative to province
    country?: string;
    country_code?: string; // Alternative to country
    zip?: string;
  } | null;
  billing_address?: {
    address1?: string;
    address2?: string;
    city?: string;
    province?: string;
    province_code?: string;
    country?: string;
    country_code?: string;
    zip?: string;
  } | null;
  line_items: Array<{
    id: number;
    title: string;
    sku?: string;
    quantity: number;
    price: string;
    grams: number;
  }>;
  total_line_items_price: string;
  total_tax?: string;
  total_shipping_price?: string;
  total_discounts?: string;
  total_price: string;
  subtotal_price?: string;
  payment_gateway_names?: string[];
  note?: string;
  tags?: string;
  fulfillments?: Array<{
    tracking_number?: string;
    tracking_company?: string;
  }>;
}

interface SyncResult {
  itemsProcessed: number;
  itemsSynced: number;
  itemsFailed: number;
  itemsSkipped: number;
  syncErrors: Array<{
    itemId: string;
    itemName?: string;
    error: string;
    errorCode?: string;
    timestamp: Date;
  }>;
}

export class ShopifyOrderSyncService {

  /**
   * Main sync orchestrator
   *
   * @param storeId - ShopifyStore ID
   * @param sinceDate - Only sync orders updated after this date (optional)
   * @returns Sync result statistics
   */
  static async syncOrders(storeId: string, sinceDate?: Date): Promise<SyncResult> {
    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      const store = await ShopifyStore.findById(storeId, null, { session }).select('+accessToken');
      if (!store) {
        throw new AppError('Store not found', 'STORE_NOT_FOUND', 404);
      }

      if (!store.isActive) {
        throw new AppError('Store is not active', 'STORE_INACTIVE', 400);
      }

      if (store.isPaused) {
        logger.info('Store sync is paused, skipping', { storeId });
        await session.abortTransaction();
        return {
          itemsProcessed: 0,
          itemsSynced: 0,
          itemsFailed: 0,
          itemsSkipped: 0,
          syncErrors: [],
        };
      }

      // Create sync log
      const [syncLog] = await SyncLog.create([{
        storeId,
        companyId: store.companyId,
        integrationType: 'SHOPIFY',
        triggerType: sinceDate ? 'SCHEDULED' : 'MANUAL',
        startedAt: new Date(),
      }], { session });

      logger.info('Starting order sync', {
        storeId,
        shop: store.shopDomain,
        sinceDate,
        syncLogId: syncLog._id,
      });

      // Initialize client
      const client = new ShopifyClient({
        shopDomain: store.shopDomain,
        accessToken: store.decryptAccessToken(),
      });

      const result: SyncResult = {
        itemsProcessed: 0,
        itemsSynced: 0,
        itemsFailed: 0,
        itemsSkipped: 0,
        syncErrors: [],
      };

      // Fetch and process orders with pagination using client.paginate
      const iterator = client.paginate<ShopifyOrder>('/orders.json', {
        status: 'any',
        ...(sinceDate && { updated_at_min: sinceDate.toISOString() }),
      }, 250);

      for await (const orders of iterator) {
        logger.debug('Fetched orders batch', {
          count: orders.length,
        });

        // Process batch
        for (const shopifyOrder of orders) {
          result.itemsProcessed++;

          try {
            const syncedOrder = await this.syncSingleOrder(shopifyOrder, store);

            if (syncedOrder) {
              result.itemsSynced++;
            } else {
              result.itemsSkipped++;
            }
          } catch (error: any) {
            result.itemsFailed++;
            result.syncErrors.push({
              itemId: shopifyOrder.id.toString(),
              itemName: shopifyOrder.name,
              error: error.message,
              errorCode: error.code,
              timestamp: new Date(),
            });

            logger.error('Failed to sync order', {
              orderId: shopifyOrder.id,
              orderName: shopifyOrder.name,
              error: error.message,
            });
          }
        }
      }

      // Complete sync log
      await syncLog.completeSyncWithErrors(result);


      // Update store sync status
      await store.updateSyncStatus('order', 'IDLE');
      await store.incrementSyncStats('order', result.itemsSynced);


      await session.commitTransaction();

      logger.info('Order sync completed', {
        storeId,
        ...result,
        syncLogId: syncLog._id,
      });

      return result;
    } catch (error: any) {
      await session.abortTransaction();

      logger.error('Order sync failed (transaction rolled back)', {
        storeId,
        error: error.message,
      });

      throw error;
    } finally {
      session.endSession();
    }
  }


  /**
   * Sync a single order from Shopify to Shipcrowd
   *
   * @param shopifyOrder - Shopify order object
   * @param store - ShopifyStore document
   * @returns Created/updated Order document or null if skipped
   */
  private static async syncSingleOrder(
    shopifyOrder: ShopifyOrder,
    store: any
  ): Promise<any | null> {
    // Check if order already exists
    const existingOrder = await Order.findOne({
      source: 'shopify',
      sourceId: shopifyOrder.id.toString(),
      companyId: store.companyId,
    });

    if (existingOrder) {
      // Skip if order already fulfilled in Shipcrowd
      if (existingOrder.currentStatus === 'DELIVERED' || existingOrder.currentStatus === 'COMPLETED') {
        logger.debug('Skipping fulfilled order', {
          orderId: shopifyOrder.id,
          currentStatus: existingOrder.currentStatus,
        });
        return null;
      }

      // Update if Shopify order is newer
      const shopifyUpdated = new Date(shopifyOrder.updated_at);
      const ShipcrowdUpdated = new Date(existingOrder.updatedAt);

      if (shopifyUpdated <= ShipcrowdUpdated) {
        logger.debug('Skipping unchanged order', {
          orderId: shopifyOrder.id,
        });
        return null;
      }

      // Update existing order
      return this.updateExistingOrder(existingOrder, shopifyOrder);
    }

    // Create new order
    return this.createNewOrder(shopifyOrder, store);
  }

  /**
   * Create new order in Shipcrowd from Shopify order
   */
  private static async createNewOrder(shopifyOrder: ShopifyOrder, store: any): Promise<any> {
    const mapped = this.mapShopifyOrderToShipcrowd(shopifyOrder, store);

    // Fetch company's default warehouse and assign it to the order
    try {
      const company = await Company.findById(store.companyId)
        .select('settings.defaultWarehouseId')
        .lean();

      const defaultWarehouseId = company?.settings?.defaultWarehouseId;
      if (defaultWarehouseId) {
        mapped.warehouseId = new mongoose.Types.ObjectId(defaultWarehouseId);
        logger.debug('Assigned default warehouse to Shopify order', {
          orderId: shopifyOrder.id,
          warehouseId: defaultWarehouseId,
        });
      } else {
        logger.warn('No default warehouse configured for company', {
          companyId: store.companyId,
          orderId: shopifyOrder.id,
        });
      }
    } catch (warehouseError) {
      logger.error('Failed to assign default warehouse', {
        error: warehouseError,
        orderId: shopifyOrder.id,
      });
    }

    const order = await Order.create(mapped);

    // Invalidate order list cache so the new order appears immediately
    try {
      const cache = new CacheRepository('orders');
      await cache.invalidateTags([`company:${store.companyId}:orders`]);
    } catch (cacheError) {
      logger.warn('Failed to invalidate order cache after Shopify sync', { error: cacheError });
    }

    logger.info('Created order from Shopify', {
      shopifyOrderId: shopifyOrder.id,
      ShipcrowdOrderId: order._id,
      orderNumber: order.orderNumber,
      warehouseId: order.warehouseId,
    });

    return order;
  }

  /**
   * Update existing Shipcrowd order with Shopify data
   */
  private static async updateExistingOrder(existingOrder: any, shopifyOrder: ShopifyOrder): Promise<any> {
    let updated = false;

    // Update payment status
    const paymentStatus = this.mapPaymentStatus(shopifyOrder.financial_status);
    if (existingOrder.paymentStatus !== paymentStatus) {
      existingOrder.paymentStatus = paymentStatus;
      updated = true;
    }

    // Determine order status: cancelled_at takes priority over fulfillment_status
    const currentStatus = shopifyOrder.cancelled_at
      ? 'cancelled'
      : this.mapFulfillmentStatus(shopifyOrder.fulfillment_status);

    if (existingOrder.currentStatus !== currentStatus) {
      existingOrder.currentStatus = currentStatus;
      existingOrder.statusHistory.push({
        status: currentStatus,
        timestamp: new Date(),
        comment: shopifyOrder.cancelled_at
          ? `Cancelled in Shopify. Reason: ${shopifyOrder.cancel_reason || 'Not specified'}`
          : `Updated from Shopify sync`,
      });
      updated = true;
    }

    // Update currency if not set
    if (!existingOrder.currency && shopifyOrder.currency) {
      existingOrder.currency = shopifyOrder.currency;
      updated = true;
    }

    if (updated) {
      await existingOrder.save();
    }

    logger.info('Updated order from Shopify', {
      shopifyOrderId: shopifyOrder.id,
      ShipcrowdOrderId: existingOrder._id,
      orderNumber: existingOrder.orderNumber,
      status: currentStatus,
      paymentStatus,
    });

    return existingOrder;
  }

  /**
   * Map Shopify order to Shipcrowd order schema
   */
  private static mapShopifyOrderToShipcrowd(shopifyOrder: ShopifyOrder, store: any): any {
    // Handle null customer (can happen with gift cards, digital products, warehouse fulfillment)
    const customer = shopifyOrder.customer || {};

    const customerName = customer.first_name || customer.last_name
      ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim()
      : 'No customer';

    const customerEmail = customer.email || shopifyOrder.email || '';
    const customerPhone = customer.phone || shopifyOrder.phone || '';

    // Handle null shipping_address (can happen with gift cards, digital products, warehouse fulfillment)
    const shippingAddress = shopifyOrder.shipping_address || shopifyOrder.billing_address || {};
    const hasAddressData = !!(shippingAddress.address1 || shippingAddress.city);

    // Determine order status: cancelled_at takes priority over fulfillment_status
    const orderStatus = shopifyOrder.cancelled_at
      ? 'cancelled'
      : this.mapFulfillmentStatus(shopifyOrder.fulfillment_status);

    return {
      orderNumber: this.generateOrderNumber(shopifyOrder),
      companyId: store.companyId,
      source: 'shopify',
      sourceId: shopifyOrder.id.toString(),

      customerInfo: {
        name: customerName,
        email: customerEmail || undefined,
        phone: customerPhone || undefined,
        address: {
          line1: shippingAddress.address1 || (hasAddressData ? '' : 'No address provided'),
          line2: shippingAddress.address2 || undefined,
          city: shippingAddress.city || (hasAddressData ? '' : 'Unknown'),
          state: shippingAddress.province || shippingAddress.province_code || (hasAddressData ? '' : 'Unknown'),
          country: shippingAddress.country || shippingAddress.country_code || (hasAddressData ? '' : 'Unknown'),
          postalCode: shippingAddress.zip || (hasAddressData ? '' : '000000'),
        },
      },

      products: shopifyOrder.line_items.map((item) => ({
        name: item.title,
        sku: item.sku || undefined,
        quantity: item.quantity,
        price: parseFloat(item.price) || 0,
        weight: item.grams > 0 ? item.grams : undefined,
      })),

      shippingDetails: {
        shippingCost: parseFloat(shopifyOrder.total_shipping_price || '0'),
      },

      paymentStatus: this.mapPaymentStatus(shopifyOrder.financial_status),
      paymentMethod: this.detectPaymentMethod(shopifyOrder.payment_gateway_names),

      currency: shopifyOrder.currency || 'USD',

      currentStatus: orderStatus,
      statusHistory: [
        {
          status: orderStatus,
          timestamp: new Date(shopifyOrder.created_at),
          comment: shopifyOrder.cancelled_at
            ? `Imported from Shopify (cancelled: ${shopifyOrder.cancel_reason || 'no reason'})`
            : 'Imported from Shopify',
        },
      ],

      totals: {
        subtotal: parseFloat(shopifyOrder.subtotal_price || shopifyOrder.total_line_items_price) || 0,
        tax: parseFloat(shopifyOrder.total_tax || '0') || 0,
        shipping: parseFloat(shopifyOrder.total_shipping_price || '0') || 0,
        discount: parseFloat(shopifyOrder.total_discounts || '0') || 0,
        total: parseFloat(shopifyOrder.total_price) || 0,
      },

      notes: shopifyOrder.note || undefined,
      tags: shopifyOrder.tags ? shopifyOrder.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],

      isDeleted: false,
    };
  }

  /**
   * Generate Shipcrowd order number from Shopify order
   */
  private static generateOrderNumber(shopifyOrder: ShopifyOrder): string {
    // Use Shopify's order name (e.g., "#1001") with shopify prefix
    return `SHOPIFY-${shopifyOrder.order_number}`;
  }

  /**
   * Map Shopify financial status to Shipcrowd payment status
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

    return statusMap[financialStatus.toLowerCase()] || 'pending';
  }

  /**
   * Map Shopify fulfillment status to Shipcrowd order status
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

  /**
   * Detect payment method (COD vs Prepaid)
   */
  private static detectPaymentMethod(paymentGateways: string[] | undefined): 'cod' | 'prepaid' {
    if (!paymentGateways || paymentGateways.length === 0) {
      return 'prepaid'; // Default to prepaid
    }

    const gateway = paymentGateways[0].toLowerCase();

    // COD detection
    if (
      gateway.includes('cash') ||
      gateway.includes('cod') ||
      gateway.includes('cash on delivery')
    ) {
      return 'cod';
    }

    return 'prepaid';
  }

  /**
   * Sync recent orders (last N hours)
   *
   * @param storeId - ShopifyStore ID
   * @param hours - Number of hours to look back (default: 24)
   */
  static async syncRecentOrders(storeId: string, hours: number = 24): Promise<SyncResult> {
    const sinceDate = new Date();
    sinceDate.setHours(sinceDate.getHours() - hours);

    logger.info('Syncing recent orders', {
      storeId,
      hours,
      sinceDate,
    });

    return this.syncOrders(storeId, sinceDate);
  }

  /**
   * Sync a single order by Shopify order ID
   *
   * @param storeId - ShopifyStore ID
   * @param shopifyOrderId - Shopify order ID
   */
  static async syncSingleOrderById(storeId: string, shopifyOrderId: string): Promise<any> {
    const store = await ShopifyStore.findById(storeId).select('+accessToken');
    if (!store) {
      throw new AppError('Store not found', 'STORE_NOT_FOUND', 404);
    }

    const client = new ShopifyClient({
      shopDomain: store.shopDomain,
      accessToken: store.decryptAccessToken(),
    });

    // Fetch single order
    const response = await client.get<{ order: ShopifyOrder }>(`/orders/${shopifyOrderId}.json`);
    const shopifyOrder = response.order;

    if (!shopifyOrder) {
      throw new AppError('Order not found in Shopify', 'ORDER_NOT_FOUND', 404);
    }

    // Sync order
    return this.syncSingleOrder(shopifyOrder, store);
  }
}

export default ShopifyOrderSyncService;
