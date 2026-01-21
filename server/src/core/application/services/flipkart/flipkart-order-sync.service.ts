/**
 * Flipkart Order Sync
 * 
 * Purpose: FlipkartOrderSyncService
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

import { FlipkartStore } from '../../../../infrastructure/database/mongoose/models';
import { FlipkartSyncLog } from '../../../../infrastructure/database/mongoose/models';
import { Order } from '../../../../infrastructure/database/mongoose/models';
import FlipkartClient from '../../../../infrastructure/external/ecommerce/flipkart/flipkart.client';
import { AppError } from '../../../../shared/errors/app.error';
import logger from '../../../../shared/logger/winston.logger';

/**
 * FlipkartOrderSyncService
 *
 * Handles synchronization of orders from Flipkart to Helix.
 *
 * Features:
 * - Pagination-based sync (max 20 items per page)
 * - Duplicate prevention using Flipkart orderItemId
 * - Status mapping (Flipkart status → Helix status)
 * - Payment method detection (COD vs Prepaid)
 * - Incremental sync (since last sync date)
 * - Comprehensive error logging
 */

interface FlipkartBuyerDetails {
  name: string;
  email?: string;
  phone: string;
  address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  };
}

interface FlipkartPriceComponent {
  totalPrice: number;
  sellingPrice: number;
  shippingCharge: number;
  discount: number;
  taxAmount: number;
}

interface FlipkartLineItem {
  sku: string;
  title: string;
  quantity: number;
  sellingPrice: number;
  hsn?: string;
  weight?: number; // in grams
}

interface FlipkartShipment {
  orderItemId: string; // Unique order item ID from Flipkart
  orderId: string; // Order ID
  orderDate: string; // ISO 8601 format
  modifiedAt: string; // ISO 8601 format
  status: string; // APPROVED, READY_TO_DISPATCH, SHIPPED, DELIVERED, CANCELLED, etc.
  buyerDetails: FlipkartBuyerDetails;
  lineItems: FlipkartLineItem[];
  priceComponents: FlipkartPriceComponent;
  paymentType: 'COD' | 'PREPAID';
  shippingProvider?: string;
  trackingId?: string;
  estimatedDeliveryDate?: string;
  tags?: string[];
  customerComments?: string;
}

interface FlipkartOrdersResponse {
  shipments: FlipkartShipment[];
  hasMore: boolean;
  nextPageUrl?: string;
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

export class FlipkartOrderSyncService {

  /**
   * Main sync orchestrator
   *
   * @param storeId - FlipkartStore ID
   * @param sinceDate - Only sync orders updated after this date (optional)
   * @returns Sync result statistics
   */
  static async syncOrders(storeId: string, sinceDate?: Date): Promise<SyncResult> {
    const store = await FlipkartStore.findById(storeId).select('+apiKey +apiSecret +accessToken');
    if (!store) {
      throw new AppError('Store not found', 'STORE_NOT_FOUND', 404);
    }

    if (!store.isActive) {
      throw new AppError('Store is not active', 'STORE_INACTIVE', 400);
    }

    if (store.isPaused) {
      logger.info('Store sync is paused, skipping', { storeId });
      return {
        itemsProcessed: 0,
        itemsSynced: 0,
        itemsFailed: 0,
        itemsSkipped: 0,
        syncErrors: [],
      };
    }

    // Create sync log
    const syncLog = await FlipkartSyncLog.create({
      storeId,
      companyId: store.companyId,
      syncType: 'order',
      syncTrigger: sinceDate ? 'SCHEDULED' : 'MANUAL',
      startTime: new Date(),
      status: 'IN_PROGRESS',
    });

    logger.info('Starting order sync', {
      storeId,
      sellerId: store.sellerId,
      sinceDate,
      syncLogId: syncLog._id,
    });

    try {
      // Initialize client
      const client = new FlipkartClient({
        apiKey: store.decryptApiKey(),
        apiSecret: store.decryptApiSecret(),
        sellerId: store.sellerId,
      });

      const result: SyncResult = {
        itemsProcessed: 0,
        itemsSynced: 0,
        itemsFailed: 0,
        itemsSkipped: 0,
        syncErrors: [],
      };

      // Fetch and process orders with pagination
      const pageSize = 20; // Flipkart max per page
      let pageNumber = 1;
      let hasMore = true;

      while (hasMore) {
        const params: any = {
          pageNumber,
          pageSize,
          ...(sinceDate && { 'filter.modifiedAfter': sinceDate.toISOString() }),
        };

        logger.debug('Fetching orders batch', {
          pageNumber,
          pageSize,
          sinceDate: sinceDate?.toISOString(),
        });

        const response = await this.fetchOrdersFromFlipkart(client, params);
        const shipments = response.shipments || [];

        logger.debug('Fetched orders batch', {
          count: shipments.length,
          pageNumber,
        });

        // Process batch
        for (const shipment of shipments) {
          result.itemsProcessed++;

          try {
            const syncedOrder = await this.syncSingleOrder(shipment, store);

            if (syncedOrder) {
              result.itemsSynced++;
            } else {
              result.itemsSkipped++;
            }
          } catch (error: any) {
            result.itemsFailed++;
            result.syncErrors.push({
              itemId: shipment.orderItemId,
              itemName: shipment.orderId,
              error: error.message,
              errorCode: error.code,
              timestamp: new Date(),
            });

            logger.error('Failed to sync order', {
              orderItemId: shipment.orderItemId,
              orderId: shipment.orderId,
              error: error.message,
            });
          }
        }

        // Check for next page
        hasMore = shipments.length === pageSize;
        if (hasMore) {
          pageNumber++;
        }
      }

      // Complete sync log
      await syncLog.completeSyncWithErrors(
        result.itemsSynced,
        result.itemsSkipped,
        result.itemsFailed,
        result.syncErrors.map(e => `${e.itemId}: ${e.error}`)
      );

      // Update store sync status
      await store.updateSyncStatus('order', 'IDLE');
      await store.incrementSyncStats('order', result.itemsSynced);

      logger.info('Order sync completed', {
        storeId,
        ...result,
        syncLogId: syncLog._id,
      });

      return result;
    } catch (error: any) {
      logger.error('Order sync failed', {
        storeId,
        error: error.message,
      });

      await syncLog.failSync(error.message);
      await store.updateSyncStatus('order', 'ERROR', { error: error.message });

      throw error;
    }
  }

  /**
   * Fetch orders from Flipkart with pagination
   *
   * @param client - FlipkartClient instance
   * @param params - Query parameters (pageNumber, pageSize, filter)
   * @returns Flipkart orders response
   */
  private static async fetchOrdersFromFlipkart(
    client: FlipkartClient,
    params: Record<string, any>
  ): Promise<FlipkartOrdersResponse> {
    try {
      const response = await client.get<FlipkartOrdersResponse>('/orders/v3/shipments', params);
      return response;
    } catch (error: any) {
      logger.error('Failed to fetch orders from Flipkart', {
        error: error.message,
        params,
      });
      throw new AppError(
        `Failed to fetch orders from Flipkart: ${error.message}`,
        'FLIPKART_API_ERROR',
        500
      );
    }
  }

  /**
   * Sync a single order from Flipkart to Helix
   *
   * @param shipment - Flipkart shipment object
   * @param store - FlipkartStore document
   * @returns Created/updated Order document or null if skipped
   */
  private static async syncSingleOrder(
    shipment: FlipkartShipment,
    store: any
  ): Promise<any | null> {
    // Check if order already exists
    const existingOrder = await Order.findOne({
      flipkartOrderId: shipment.orderItemId,
      companyId: store.companyId,
    });

    if (existingOrder) {
      // Skip if order already fulfilled in Helix
      if (existingOrder.currentStatus === 'DELIVERED' || existingOrder.currentStatus === 'COMPLETED') {
        logger.debug('Skipping fulfilled order', {
          orderItemId: shipment.orderItemId,
          currentStatus: existingOrder.currentStatus,
        });
        return null;
      }

      // Update if Flipkart order is newer
      const flipkartUpdated = new Date(shipment.modifiedAt);
      const HelixUpdated = new Date(existingOrder.updatedAt);

      if (flipkartUpdated <= HelixUpdated) {
        logger.debug('Skipping unchanged order', {
          orderItemId: shipment.orderItemId,
        });
        return null;
      }

      // Update existing order
      return this.updateExistingOrder(existingOrder, shipment);
    }

    // Create new order
    return this.createNewOrder(shipment, store);
  }

  /**
   * Create new order in Helix from Flipkart shipment
   */
  private static async createNewOrder(shipment: FlipkartShipment, store: any): Promise<any> {
    const mapped = this.mapFlipkartOrderToHelix(shipment, store);

    const order = await Order.create(mapped);

    logger.info('Created order from Flipkart', {
      flipkartOrderItemId: shipment.orderItemId,
      HelixOrderId: order._id,
      orderNumber: order.orderNumber,
    });

    return order;
  }

  /**
   * Update existing Helix order with Flipkart data
   */
  private static async updateExistingOrder(existingOrder: any, shipment: FlipkartShipment): Promise<any> {
    // Update payment status
    const paymentStatus = this.mapPaymentStatus(shipment.paymentType, shipment.status);
    if (existingOrder.paymentStatus !== paymentStatus) {
      existingOrder.paymentStatus = paymentStatus;
    }

    // Update fulfillment status
    const currentStatus = this.mapFulfillmentStatus(shipment.status);
    if (existingOrder.currentStatus !== currentStatus) {
      existingOrder.currentStatus = currentStatus;
      existingOrder.statusHistory.push({
        status: currentStatus,
        timestamp: new Date(),
        comment: `Updated from Flipkart sync`,
      });
    }

    // Update tracking information if available
    if (shipment.trackingId && !existingOrder.shippingDetails.trackingNumber) {
      existingOrder.shippingDetails.trackingNumber = shipment.trackingId;
      existingOrder.shippingDetails.provider = shipment.shippingProvider || 'Flipkart Logistics';
    }

    await existingOrder.save();

    logger.info('Updated order from Flipkart', {
      flipkartOrderItemId: shipment.orderItemId,
      HelixOrderId: existingOrder._id,
      orderNumber: existingOrder.orderNumber,
    });

    return existingOrder;
  }

  /**
   * Map Flipkart shipment to Helix order schema
   */
  private static mapFlipkartOrderToHelix(shipment: FlipkartShipment, store: any): any {
    const { buyerDetails, lineItems, priceComponents } = shipment;

    return {
      orderNumber: this.generateOrderNumber(shipment),
      companyId: store.companyId,
      source: 'flipkart',
      flipkartOrderId: shipment.orderItemId,
      flipkartStoreId: store._id,

      customerInfo: {
        name: buyerDetails.name,
        email: buyerDetails.email || undefined,
        phone: buyerDetails.phone || 'N/A',
        address: {
          line1: buyerDetails.address.line1,
          line2: buyerDetails.address.line2,
          city: buyerDetails.address.city,
          state: buyerDetails.address.state,
          country: buyerDetails.address.country || 'India',
          postalCode: buyerDetails.address.postalCode,
        },
      },

      products: lineItems.map((item) => ({
        name: item.title,
        sku: item.sku || undefined,
        quantity: item.quantity,
        price: item.sellingPrice,
        weight: item.weight && item.weight > 0 ? item.weight : undefined,
      })),

      shippingDetails: {
        shippingCost: priceComponents.shippingCharge || 0,
        provider: shipment.shippingProvider,
        trackingNumber: shipment.trackingId,
        estimatedDelivery: shipment.estimatedDeliveryDate
          ? new Date(shipment.estimatedDeliveryDate)
          : undefined,
      },

      paymentStatus: this.mapPaymentStatus(shipment.paymentType, shipment.status),
      paymentMethod: shipment.paymentType === 'COD' ? 'cod' : 'prepaid',

      currentStatus: this.mapFulfillmentStatus(shipment.status),
      statusHistory: [
        {
          status: this.mapFulfillmentStatus(shipment.status),
          timestamp: new Date(shipment.orderDate),
          comment: 'Imported from Flipkart',
        },
      ],

      totals: {
        subtotal: priceComponents.sellingPrice,
        tax: priceComponents.taxAmount || 0,
        shipping: priceComponents.shippingCharge || 0,
        discount: priceComponents.discount || 0,
        total: priceComponents.totalPrice,
      },

      notes: shipment.customerComments,
      tags: shipment.tags || [],

      isDeleted: false,
    };
  }

  /**
   * Generate Helix order number from Flipkart shipment
   */
  private static generateOrderNumber(shipment: FlipkartShipment): string {
    // Use Flipkart's orderId with FLIPKART prefix
    return `FLIPKART-${shipment.orderId}`;
  }

  /**
   * Map Flipkart payment type and status to Helix payment status
   */
  private static mapPaymentStatus(
    paymentType: 'COD' | 'PREPAID',
    orderStatus: string
  ): 'pending' | 'paid' | 'failed' | 'refunded' {
    // COD orders are pending until delivered
    if (paymentType === 'COD') {
      if (orderStatus === 'DELIVERED' || orderStatus === 'COMPLETED') {
        return 'paid';
      }
      return 'pending';
    }

    // Prepaid orders
    if (orderStatus === 'CANCELLED' || orderStatus === 'CUSTOMER_RETURN_REQUESTED') {
      return 'refunded';
    }

    if (orderStatus === 'APPROVED' || orderStatus === 'READY_TO_DISPATCH' || orderStatus === 'SHIPPED') {
      return 'paid';
    }

    return 'pending';
  }

  /**
   * Map Flipkart order status to Helix order status
   */
  private static mapFulfillmentStatus(flipkartStatus: string): string {
    const statusMap: Record<string, string> = {
      APPROVED: 'PENDING',
      READY_TO_DISPATCH: 'PROCESSING',
      PACKED: 'PROCESSING',
      FORM_FAILED: 'PENDING',
      PICKUP_COMPLETE: 'IN_TRANSIT',
      SHIPPED: 'SHIPPED',
      DELIVERED: 'DELIVERED',
      CANCELLED: 'CANCELLED',
      CUSTOMER_RETURN_REQUESTED: 'RETURN_REQUESTED',
      RETURNED: 'RETURNED',
      LOST: 'LOST',
    };

    return statusMap[flipkartStatus.toUpperCase()] || 'PENDING';
  }

  /**
   * Sync recent orders (last N hours)
   *
   * @param storeId - FlipkartStore ID
   * @param hoursBack - Number of hours to look back (default: 24)
   */
  static async syncRecentOrders(storeId: string, hoursBack: number = 24): Promise<SyncResult> {
    const sinceDate = new Date();
    sinceDate.setHours(sinceDate.getHours() - hoursBack);

    logger.info('Syncing recent orders', {
      storeId,
      hoursBack,
      sinceDate,
    });

    return this.syncOrders(storeId, sinceDate);
  }

  /**
   * Sync a single order by Flipkart order item ID
   *
   * @param storeId - FlipkartStore ID
   * @param orderItemId - Flipkart order item ID
   */
  static async syncSingleOrderById(storeId: string, orderItemId: string): Promise<any> {
    const store = await FlipkartStore.findById(storeId).select('+apiKey +apiSecret +accessToken');
    if (!store) {
      throw new AppError('Store not found', 'STORE_NOT_FOUND', 404);
    }

    const client = new FlipkartClient({
      apiKey: store.decryptApiKey(),
      apiSecret: store.decryptApiSecret(),
      sellerId: store.sellerId,
    });

    // Fetch single order by filtering with order item ID
    const response = await client.get<FlipkartOrdersResponse>('/orders/v3/shipments', {
      'filter.orderItemId': orderItemId,
    });

    const shipment = response.shipments?.[0];

    if (!shipment) {
      throw new AppError('Order not found in Flipkart', 'ORDER_NOT_FOUND', 404);
    }

    // Sync order
    return this.syncSingleOrder(shipment, store);
  }
}

export default FlipkartOrderSyncService;
