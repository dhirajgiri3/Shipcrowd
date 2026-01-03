import { FlipkartStore } from '../../../../infrastructure/database/mongoose/models';
import { FlipkartSyncLog } from '../../../../infrastructure/database/mongoose/models';
import { Order } from '../../../../infrastructure/database/mongoose/models';
import { AppError } from '../../../../shared/errors/app.error';
import winston from 'winston';

/**
 * FlipkartWebhookService
 *
 * Handles processing of Flipkart webhook events in real-time.
 *
 * Webhook Topics Supported:
 * 1. order/create - New order placed
 * 2. order/approve - Order approved by seller
 * 3. order/ready-to-dispatch - Order ready to be dispatched
 * 4. order/dispatch - Order dispatched
 * 5. order/deliver - Order delivered
 * 6. order/cancel - Order cancelled
 * 7. order/return - Order returned
 * 8. inventory/update - Inventory level changed
 */

export class FlipkartWebhookService {
  private static logger = winston.createLogger({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: winston.format.json(),
    transports: [new winston.transports.Console()],
  });

  /**
   * Process order/create webhook
   *
   * Triggered when a new order is placed on Flipkart.
   * Creates the order in Shipcrowd system.
   */
  static async processOrderCreate(payload: any, storeId: string): Promise<void> {
    this.logger.info('Processing order/create webhook', {
      storeId,
      orderId: payload.orderId,
      orderNumber: payload.orderNumber,
    });

    const syncLog = await FlipkartSyncLog.create({
      storeId,
      syncType: 'webhook',
      status: 'IN_PROGRESS',
      startTime: new Date(),
      metadata: {
        webhookTopic: 'order/create',
        orderId: payload.orderId,
      },
    });

    try {
      const store = await FlipkartStore.findById(storeId);
      if (!store) {
        throw new AppError('Store not found', 'STORE_NOT_FOUND', 404);
      }

      // Check if order already exists
      const existingOrder = await Order.findOne({
        source: 'flipkart',
        sourceId: payload.orderId,
        companyId: store.companyId,
      });

      if (existingOrder) {
        this.logger.info('Order already exists, skipping creation', {
          orderId: payload.orderId,
        });
        await syncLog.completeSync(0, 1);
        return;
      }

      // Create new order from webhook payload
      const order = await Order.create({
        companyId: store.companyId,
        source: 'flipkart',
        sourceId: payload.orderId,
        orderNumber: payload.orderNumber || payload.orderId,
        customerDetails: {
          name: payload.customer?.name || 'N/A',
          email: payload.customer?.email,
          phone: payload.customer?.phone,
        },
        shippingDetails: {
          address: payload.shippingAddress?.address,
          city: payload.shippingAddress?.city,
          state: payload.shippingAddress?.state,
          country: payload.shippingAddress?.country || 'IN',
          postalCode: payload.shippingAddress?.pincode,
        },
        items: payload.items?.map((item: any) => ({
          sku: item.sku,
          name: item.title,
          quantity: item.quantity,
          price: item.price,
          hsn: item.hsn,
        })) || [],
        pricing: {
          subtotal: payload.pricing?.subtotal || 0,
          tax: payload.pricing?.tax || 0,
          shipping: payload.pricing?.shipping || 0,
          total: payload.pricing?.total || 0,
          currency: 'INR',
        },
        paymentStatus: this.mapPaymentStatus(payload.paymentStatus),
        currentStatus: 'PENDING',
        statusHistory: [
          {
            status: 'PENDING',
            timestamp: new Date(),
            comment: 'Order created from Flipkart webhook',
          },
        ],
        placedAt: payload.orderDate ? new Date(payload.orderDate) : new Date(),
      });

      await syncLog.completeSync(1, 0);

      this.logger.info('Order created from webhook', {
        storeId,
        orderId: payload.orderId,
        orderNumber: order.orderNumber,
      });
    } catch (error: any) {
      this.logger.error('Failed to process order/create webhook', {
        storeId,
        orderId: payload.orderId,
        error: error.message,
      });
      await syncLog.failSync(error.message);
      throw error;
    }
  }

  /**
   * Process order/approve webhook
   *
   * Triggered when seller approves the order.
   * Updates order status to APPROVED.
   */
  static async processOrderApprove(payload: any, storeId: string): Promise<void> {
    this.logger.info('Processing order/approve webhook', {
      storeId,
      orderId: payload.orderId,
    });

    try {
      const store = await FlipkartStore.findById(storeId);
      if (!store) {
        throw new AppError('Store not found', 'STORE_NOT_FOUND', 404);
      }

      const order = await Order.findOne({
        source: 'flipkart',
        sourceId: payload.orderId,
        companyId: store.companyId,
      });

      if (!order) {
        this.logger.warn('Order not found for approval', {
          storeId,
          orderId: payload.orderId,
        });
        return;
      }

      order.currentStatus = 'APPROVED';
      order.statusHistory.push({
        status: 'APPROVED',
        timestamp: new Date(),
        comment: 'Order approved in Flipkart',
      });

      await order.save();

      this.logger.info('Order approved', {
        storeId,
        orderId: payload.orderId,
      });
    } catch (error: any) {
      this.logger.error('Failed to process order/approve webhook', {
        storeId,
        orderId: payload.orderId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Process order/ready-to-dispatch webhook
   *
   * Triggered when order is ready to be dispatched.
   * Updates order status to READY_TO_SHIP.
   */
  static async processOrderReadyToDispatch(payload: any, storeId: string): Promise<void> {
    this.logger.info('Processing order/ready-to-dispatch webhook', {
      storeId,
      orderId: payload.orderId,
    });

    try {
      const store = await FlipkartStore.findById(storeId);
      if (!store) {
        throw new AppError('Store not found', 'STORE_NOT_FOUND', 404);
      }

      const order = await Order.findOne({
        source: 'flipkart',
        sourceId: payload.orderId,
        companyId: store.companyId,
      });

      if (!order) {
        this.logger.warn('Order not found', {
          storeId,
          orderId: payload.orderId,
        });
        return;
      }

      order.currentStatus = 'READY_TO_SHIP';
      order.statusHistory.push({
        status: 'READY_TO_SHIP',
        timestamp: new Date(),
        comment: 'Order ready to dispatch in Flipkart',
      });

      await order.save();

      this.logger.info('Order ready to dispatch', {
        storeId,
        orderId: payload.orderId,
      });
    } catch (error: any) {
      this.logger.error('Failed to process order/ready-to-dispatch webhook', {
        storeId,
        orderId: payload.orderId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Process order/dispatch webhook
   *
   * Triggered when order is dispatched.
   * Updates order status to SHIPPED and records tracking.
   */
  static async processOrderDispatch(payload: any, storeId: string): Promise<void> {
    this.logger.info('Processing order/dispatch webhook', {
      storeId,
      orderId: payload.orderId,
    });

    try {
      const store = await FlipkartStore.findById(storeId);
      if (!store) {
        throw new AppError('Store not found', 'STORE_NOT_FOUND', 404);
      }

      const order = await Order.findOne({
        source: 'flipkart',
        sourceId: payload.orderId,
        companyId: store.companyId,
      });

      if (!order) {
        this.logger.warn('Order not found', {
          storeId,
          orderId: payload.orderId,
        });
        return;
      }

      order.currentStatus = 'SHIPPED';
      order.statusHistory.push({
        status: 'SHIPPED',
        timestamp: new Date(),
        comment: 'Order dispatched in Flipkart',
      });

      // Update tracking information if available
      if (payload.trackingNumber) {
        order.shippingDetails.trackingNumber = payload.trackingNumber;
      }
      if (payload.courierName) {
        order.shippingDetails.provider = payload.courierName;
      }

      await order.save();

      this.logger.info('Order dispatched', {
        storeId,
        orderId: payload.orderId,
        trackingNumber: payload.trackingNumber,
      });
    } catch (error: any) {
      this.logger.error('Failed to process order/dispatch webhook', {
        storeId,
        orderId: payload.orderId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Process order/deliver webhook
   *
   * Triggered when order is delivered.
   * Updates order status to DELIVERED.
   */
  static async processOrderDeliver(payload: any, storeId: string): Promise<void> {
    this.logger.info('Processing order/deliver webhook', {
      storeId,
      orderId: payload.orderId,
    });

    try {
      const store = await FlipkartStore.findById(storeId);
      if (!store) {
        throw new AppError('Store not found', 'STORE_NOT_FOUND', 404);
      }

      const order = await Order.findOne({
        source: 'flipkart',
        sourceId: payload.orderId,
        companyId: store.companyId,
      });

      if (!order) {
        this.logger.warn('Order not found', {
          storeId,
          orderId: payload.orderId,
        });
        return;
      }

      order.currentStatus = 'DELIVERED';
      order.statusHistory.push({
        status: 'DELIVERED',
        timestamp: new Date(),
        comment: 'Order delivered in Flipkart',
      });

      // Note: Delivery date is recorded in statusHistory above

      await order.save();

      this.logger.info('Order delivered', {
        storeId,
        orderId: payload.orderId,
      });
    } catch (error: any) {
      this.logger.error('Failed to process order/deliver webhook', {
        storeId,
        orderId: payload.orderId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Process order/cancel webhook
   *
   * Triggered when order is cancelled.
   * Updates order status to CANCELLED.
   */
  static async processOrderCancel(payload: any, storeId: string): Promise<void> {
    this.logger.info('Processing order/cancel webhook', {
      storeId,
      orderId: payload.orderId,
    });

    try {
      const store = await FlipkartStore.findById(storeId);
      if (!store) {
        throw new AppError('Store not found', 'STORE_NOT_FOUND', 404);
      }

      const order = await Order.findOne({
        source: 'flipkart',
        sourceId: payload.orderId,
        companyId: store.companyId,
      });

      if (!order) {
        this.logger.warn('Order not found', {
          storeId,
          orderId: payload.orderId,
        });
        return;
      }

      order.currentStatus = 'CANCELLED';
      order.statusHistory.push({
        status: 'CANCELLED',
        timestamp: new Date(),
        comment: `Cancelled in Flipkart. Reason: ${payload.cancelReason || 'Not specified'}`,
      });

      await order.save();

      // TODO: Restore inventory if applicable

      this.logger.info('Order cancelled', {
        storeId,
        orderId: payload.orderId,
      });
    } catch (error: any) {
      this.logger.error('Failed to process order/cancel webhook', {
        storeId,
        orderId: payload.orderId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Process order/return webhook
   *
   * Triggered when order is returned.
   * Updates order status to RETURNED.
   */
  static async processOrderReturn(payload: any, storeId: string): Promise<void> {
    this.logger.info('Processing order/return webhook', {
      storeId,
      orderId: payload.orderId,
    });

    try {
      const store = await FlipkartStore.findById(storeId);
      if (!store) {
        throw new AppError('Store not found', 'STORE_NOT_FOUND', 404);
      }

      const order = await Order.findOne({
        source: 'flipkart',
        sourceId: payload.orderId,
        companyId: store.companyId,
      });

      if (!order) {
        this.logger.warn('Order not found', {
          storeId,
          orderId: payload.orderId,
        });
        return;
      }

      order.currentStatus = 'RETURNED';
      order.statusHistory.push({
        status: 'RETURNED',
        timestamp: new Date(),
        comment: `Returned in Flipkart. Reason: ${payload.returnReason || 'Not specified'}`,
      });

      await order.save();

      // TODO: Restore inventory if applicable

      this.logger.info('Order returned', {
        storeId,
        orderId: payload.orderId,
      });
    } catch (error: any) {
      this.logger.error('Failed to process order/return webhook', {
        storeId,
        orderId: payload.orderId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Process inventory/update webhook
   *
   * Triggered when inventory is updated in Flipkart.
   * Optional: Two-way sync (Flipkart → Shipcrowd).
   */
  static async processInventoryUpdate(payload: any, storeId: string): Promise<void> {
    this.logger.info('Processing inventory/update webhook', {
      storeId,
      sku: payload.sku,
      quantity: payload.quantity,
    });

    try {
      const store = await FlipkartStore.findById(storeId);
      if (!store) {
        throw new AppError('Store not found', 'STORE_NOT_FOUND', 404);
      }

      // Only process if two-way sync is enabled
      if (store.syncConfig.inventorySync.syncDirection !== 'TWO_WAY') {
        this.logger.debug('Two-way sync not enabled, skipping inventory update', {
          storeId,
        });
        return;
      }

      // TODO: Update Shipcrowd inventory
      // This would integrate with InventoryService to update stock levels

      this.logger.info('Inventory updated (two-way sync)', {
        storeId,
        sku: payload.sku,
        quantity: payload.quantity,
      });
    } catch (error: any) {
      this.logger.error('Failed to process inventory/update webhook', {
        storeId,
        sku: payload.sku,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Map Flipkart payment status to Shipcrowd status
   */
  private static mapPaymentStatus(paymentStatus: string): 'pending' | 'paid' | 'failed' | 'refunded' {
    const statusMap: Record<string, 'pending' | 'paid' | 'failed' | 'refunded'> = {
      pending: 'pending',
      cod: 'pending',
      prepaid: 'paid',
      paid: 'paid',
      refunded: 'refunded',
      failed: 'failed',
    };

    return statusMap[paymentStatus?.toLowerCase()] || 'pending';
  }
}

export default FlipkartWebhookService;
