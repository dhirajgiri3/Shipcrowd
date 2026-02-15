/**
 * Flipkart Fulfillment Service
 *
 * Purpose: Push fulfillment and tracking information back to Flipkart Seller API
 * when orders are shipped in Shipcrowd.
 *
 * IMPORTANT: Flipkart uses order item-based updates (not order-based).
 * Each order item must be updated individually via the Flipkart API.
 *
 * FEATURES:
 * - Mark order items as ready to dispatch
 * - Dispatch order items with tracking information
 * - Mark order items as delivered
 * - Cancel order items
 * - Handle shipment status changes from Shipcrowd webhooks
 * - Bulk sync pending dispatches
 *
 * DEPENDENCIES:
 * - FlipkartStore model for store credentials
 * - FlipkartClient for API calls
 * - Order model for order data
 * - Shipment model for tracking data
 *
 * TESTING:
 * Unit Tests: tests/unit/services/flipkart/FlipkartFulfillmentService.test.ts
 */

import { FlipkartStore, Order, Shipment } from '../../../../infrastructure/database/mongoose/models';
import FlipkartClient from '../../../../infrastructure/external/ecommerce/flipkart/flipkart.client';
import { AppError } from '../../../../shared/errors/app.error';
import logger from '../../../../shared/logger/winston.logger';

/**
 * Tracking information for dispatch
 */
interface TrackingInfo {
    awbNumber: string;
    courierName: string;
    trackingUrl?: string;
}

/**
 * Status mappings from Shipcrowd to Flipkart
 */
const Shipcrowd_TO_FLIPKART_STATUS: Record<string, string> = {
    BOOKED: 'APPROVED',
    MANIFESTED: 'READY_TO_DISPATCH',
    PICKED_UP: 'READY_TO_DISPATCH',
    IN_TRANSIT: 'SHIPPED',
    OUT_FOR_DELIVERY: 'SHIPPED',
    DELIVERED: 'DELIVERED',
    CANCELLED: 'CANCELLED',
    RTO_INITIATED: 'RETURN_REQUESTED',
    RTO_IN_TRANSIT: 'RETURN_REQUESTED',
    RTO_DELIVERED: 'RETURN_COMPLETED',
};
void Shipcrowd_TO_FLIPKART_STATUS;

/**
 * FlipkartFulfillmentService
 *
 * Handles pushing fulfillment and tracking updates to Flipkart Seller API.
 * Works with order items (not orders) as per Flipkart's API design.
 */
export class FlipkartFulfillmentService {
    /**
     * Mark order item as ready to dispatch
     *
     * This is the first step in fulfillment - tells Flipkart the item is ready to ship.
     *
     * @param orderId - Shipcrowd order ID
     * @returns Success status
     */
    static async markAsReadyToDispatch(orderId: string): Promise<boolean> {
        try {
            // 1. Get order and validate it's from Flipkart
            const order = await Order.findById(orderId);

            if (!order) {
                throw new AppError('Order not found', 'ORDER_NOT_FOUND', 404);
            }

            if (order.source !== 'flipkart') {
                logger.debug('Order is not from Flipkart, skipping fulfillment push', {
                    orderId,
                    source: order.source,
                });
                return false;
            }

            if (!order.flipkartOrderId) {
                throw new AppError(
                    'Order missing Flipkart order item ID',
                    'FLIPKART_ORDER_ITEM_ID_MISSING',
                    400
                );
            }

            // 2. Get Flipkart store with credentials
            const store = await FlipkartStore.findOne({
                companyId: order.companyId,
                isActive: true,
            }).select('+apiKey +apiSecret');

            if (!store) {
                throw new AppError(
                    'No active Flipkart store found for this company',
                    'FLIPKART_STORE_NOT_FOUND',
                    404
                );
            }

            // 3. Create Flipkart client
            const client = new FlipkartClient({
                apiKey: store.apiKey,
                apiSecret: store.decryptApiSecret(),
                sellerId: store.sellerId,
                sandbox: (store as any).isSandbox || false,
            });

            // 4. Mark as ready to dispatch
            logger.info('Marking Flipkart order item as ready to dispatch', {
                orderId,
                orderItemId: order.flipkartOrderId,
            });

            await client.post(
                `/v3/shipments/${order.flipkartOrderId}/dispatch`,
                {
                    location_id: (store as any).locationId || 'default',
                }
            );

            // 5. Update order status
            order.statusHistory.push({
                status: 'READY_TO_SHIP',
                timestamp: new Date(),
                comment: 'Marked as ready to dispatch in Flipkart',
            });
            await order.save();

            logger.info('Flipkart order item marked as ready to dispatch', {
                orderId,
                orderItemId: order.flipkartOrderId,
            });

            return true;
        } catch (error: any) {
            logger.error('Failed to mark Flipkart order as ready to dispatch', {
                orderId,
                error: error.message,
                stack: error.stack,
            });

            if (error instanceof AppError) {
                throw error;
            }

            throw new AppError(
                `Failed to mark Flipkart order as ready: ${error.message}`,
                'FLIPKART_READY_TO_DISPATCH_FAILED',
                500
            );
        }
    }

    /**
     * Dispatch order item with tracking information
     *
     * This is the main fulfillment action - provides tracking details to Flipkart.
     *
     * @param orderId - Shipcrowd order ID
     * @param trackingInfo - Tracking information
     * @returns Success status
     */
    static async dispatchOrder(
        orderId: string,
        trackingInfo: TrackingInfo
    ): Promise<boolean> {
        try {
            // 1. Get order and validate
            const order = await Order.findById(orderId);

            if (!order) {
                throw new AppError('Order not found', 'ORDER_NOT_FOUND', 404);
            }

            if (order.source !== 'flipkart') {
                return false;
            }

            if (!order.flipkartOrderId) {
                throw new AppError(
                    'Order missing Flipkart order item ID',
                    'FLIPKART_ORDER_ITEM_ID_MISSING',
                    400
                );
            }

            // 2. Get store
            const store = await FlipkartStore.findOne({
                companyId: order.companyId,
                isActive: true,
            }).select('+apiKey +apiSecret');

            if (!store) {
                throw new AppError(
                    'No active Flipkart store found',
                    'FLIPKART_STORE_NOT_FOUND',
                    404
                );
            }

            // 3. Create client
            const client = new FlipkartClient({
                apiKey: store.apiKey,
                apiSecret: store.decryptApiSecret(),
                sellerId: store.sellerId,
                sandbox: (store as any).isSandbox || false,
            });

            // 4. Pack and dispatch with tracking
            logger.info('Dispatching Flipkart order item with tracking', {
                orderId,
                orderItemId: order.flipkartOrderId,
                awb: trackingInfo.awbNumber,
            });

            // Pack the order item
            await client.post(
                `/v3/shipments/${order.flipkartOrderId}/pack`,
                {
                    invoice: {
                        invoice_number: order.orderNumber,
                        invoice_date: new Date().toISOString().split('T')[0],
                    },
                }
            );

            // Dispatch with tracking
            await client.post(
                `/v3/shipments/${order.flipkartOrderId}/dispatch`,
                {
                    tracking_id: trackingInfo.awbNumber,
                    courier_name: trackingInfo.courierName,
                    location_id: (store as any).locationId || 'default',
                }
            );

            // 5. Update order
            order.statusHistory.push({
                status: 'SHIPPED',
                timestamp: new Date(),
                comment: `Dispatched in Flipkart with tracking: ${trackingInfo.awbNumber}`,
            });
            await order.save();

            logger.info('Flipkart order item dispatched successfully', {
                orderId,
                orderItemId: order.flipkartOrderId,
                trackingId: trackingInfo.awbNumber,
            });

            return true;
        } catch (error: any) {
            logger.error('Failed to dispatch Flipkart order', {
                orderId,
                error: error.message,
            });

            if (error instanceof AppError) {
                throw error;
            }

            throw new AppError(
                `Failed to dispatch Flipkart order: ${error.message}`,
                'FLIPKART_DISPATCH_FAILED',
                500
            );
        }
    }

    /**
     * Mark order item as delivered
     *
     * @param orderId - Shipcrowd order ID
     * @returns Success status
     */
    static async markAsDelivered(orderId: string): Promise<boolean> {
        try {
            const order = await Order.findById(orderId);

            if (!order || order.source !== 'flipkart' || !order.flipkartOrderId) {
                return false;
            }

            const store = await FlipkartStore.findOne({
                companyId: order.companyId,
                isActive: true,
            }).select('+apiKey +apiSecret');

            if (!store) {
                return false;
            }

            const client = new FlipkartClient({
                apiKey: store.apiKey,
                apiSecret: store.decryptApiSecret(),
                sellerId: store.sellerId,
                sandbox: (store as any).isSandbox || false,
            });

            // Mark as delivered
            await client.post(
                `/v3/shipments/${order.flipkartOrderId}/complete`,
                {}
            );

            order.currentStatus = 'DELIVERED';
            order.statusHistory.push({
                status: 'DELIVERED',
                timestamp: new Date(),
                comment: 'Marked as delivered in Flipkart',
            });
            await order.save();

            logger.info('Flipkart order item marked as delivered', {
                orderId,
                orderItemId: order.flipkartOrderId,
            });

            return true;
        } catch (error: any) {
            logger.error('Failed to mark Flipkart order as delivered', {
                orderId,
                error: error.message,
            });
            return false;
        }
    }

    /**
     * Cancel order item
     *
     * @param orderId - Shipcrowd order ID
     * @param reason - Cancellation reason
     * @returns Success status
     */
    static async cancelOrder(orderId: string, reason?: string): Promise<boolean> {
        try {
            const order = await Order.findById(orderId);

            if (!order || order.source !== 'flipkart' || !order.flipkartOrderId) {
                return false;
            }

            const store = await FlipkartStore.findOne({
                companyId: order.companyId,
                isActive: true,
            }).select('+apiKey +apiSecret');

            if (!store) {
                return false;
            }

            const client = new FlipkartClient({
                apiKey: store.apiKey,
                apiSecret: store.decryptApiSecret(),
                sellerId: store.sellerId,
                sandbox: (store as any).isSandbox || false,
            });

            // Cancel the order item
            await client.post(
                `/v3/shipments/${order.flipkartOrderId}/cancel`,
                {
                    reason: reason || 'SELLER_CANCELLED',
                }
            );

            order.currentStatus = 'cancelled';
            order.statusHistory.push({
                status: 'cancelled',
                timestamp: new Date(),
                comment: `Cancelled in Flipkart: ${reason || 'Seller cancelled'}`,
            });
            await order.save();

            logger.info('Flipkart order item cancelled', {
                orderId,
                orderItemId: order.flipkartOrderId,
                reason,
            });

            return true;
        } catch (error: any) {
            logger.error('Failed to cancel Flipkart order', {
                orderId,
                error: error.message,
            });
            return false;
        }
    }

    /**
     * Handle shipment status webhook and push to Flipkart
     *
     * Called automatically when a shipment status changes in Shipcrowd.
     *
     * @param shipmentId - Shipcrowd shipment ID
     * @param newStatus - New shipment status
     */
    static async handleShipmentStatusChange(
        shipmentId: string,
        newStatus: string
    ): Promise<void> {
        try {
            // Get shipment with order
            const shipment = await Shipment.findById(shipmentId);

            if (!shipment) {
                logger.warn('Shipment not found for Flipkart status push', { shipmentId });
                return;
            }

            const order = await Order.findById(shipment.orderId);

            if (!order || order.source !== 'flipkart') {
                return;
            }

            // Handle based on status
            switch (newStatus) {
                case 'BOOKED':
                    // Mark as ready to dispatch
                    await this.markAsReadyToDispatch(String(order._id));
                    break;

                case 'MANIFESTED':
                case 'PICKED_UP':
                    // Dispatch with tracking
                    await this.dispatchOrder(String(order._id), {
                        awbNumber: shipment.trackingNumber,
                        courierName: shipment.carrier,
                    });
                    break;

                case 'DELIVERED':
                    // Mark as delivered
                    await this.markAsDelivered(String(order._id));
                    break;

                case 'CANCELLED':
                    // Cancel order
                    await this.cancelOrder(String(order._id), 'Shipment cancelled');
                    break;

                // Other statuses don't require immediate action
            }

            logger.info('Flipkart fulfillment status synced', {
                shipmentId,
                orderId: order._id,
                status: newStatus,
            });
        } catch (error: any) {
            logger.error('Failed to sync shipment status to Flipkart', {
                shipmentId,
                newStatus,
                error: error.message,
            });
            // Don't throw - this is a background sync operation
        }
    }

    /**
     * Sync all pending dispatches for a store
     * Used for bulk operations or recovery
     *
     * @param storeId - Flipkart store ID
     * @returns Number of orders synced
     */
    static async syncPendingDispatches(storeId: string): Promise<number> {
        try {
            const store = await FlipkartStore.findById(storeId);

            if (!store) {
                throw new AppError('Flipkart store not found', 'FLIPKART_STORE_NOT_FOUND', 404);
            }

            // Find orders that need dispatch
            const orders = await Order.find({
                source: 'flipkart',
                companyId: store.companyId,
                currentStatus: { $in: ['processing', 'ready_to_ship', 'shipped'] },
            }).limit(50);

            const orderIds = orders.map((order: any) => order._id);
            const shipments = orderIds.length > 0
                ? await Shipment.find({ orderId: { $in: orderIds } })
                    .select('orderId trackingNumber carrier')
                    .lean()
                : [];
            const shipmentByOrderId = new Map<string, { trackingNumber?: string; carrier?: string }>();
            for (const shipment of shipments) {
                const key = shipment.orderId.toString();
                if (!shipmentByOrderId.has(key)) {
                    shipmentByOrderId.set(key, shipment);
                }
            }

            let syncedCount = 0;

            for (const order of orders) {
                // Get shipment for this order
                const orderId = String((order as any)._id ?? (order as any).id);
                const shipment = shipmentByOrderId.get(orderId);

                if (shipment && shipment.trackingNumber) {
                    try {
                        await this.dispatchOrder(orderId, {
                            awbNumber: shipment.trackingNumber,
                            courierName: shipment.carrier || 'other',
                        });
                        syncedCount++;

                        // Add delay between API calls to respect rate limits
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    } catch (error) {
                        logger.warn('Failed to sync dispatch', {
                            orderId,
                            error: (error as Error).message,
                        });
                    }
                }
            }

            logger.info('Pending Flipkart dispatches synced', {
                storeId,
                totalOrders: orders.length,
                syncedCount,
            });

            return syncedCount;
        } catch (error: any) {
            logger.error('Failed to sync pending Flipkart dispatches', {
                storeId,
                error: error.message,
            });

            throw error;
        }
    }
}

export default FlipkartFulfillmentService;
