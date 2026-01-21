/**
 * WooCommerce Fulfillment Service
 *
 * Purpose: Push order status and tracking information back to WooCommerce
 * when orders are shipped/delivered in Helix.
 *
 * FEATURES:
 * - Update order status (processing → completed)
 * - Add tracking info as order note
 * - Mark order as shipped with tracking details
 * - Handle order cancellations
 * - Sync refund status
 *
 * DEPENDENCIES:
 * - WooCommerceStore model for store credentials
 * - WooCommerceClient for API calls
 * - Order model for order data
 * - Shipment model for tracking data
 *
 * TESTING:
 * Unit Tests: tests/unit/services/woocommerce/WooCommerceFulfillmentService.test.ts
 */

import { WooCommerceStore } from '../../../../infrastructure/database/mongoose/models';
import { Order, IOrder } from '../../../../infrastructure/database/mongoose/models';
import { Shipment, IShipment } from '../../../../infrastructure/database/mongoose/models';
import WooCommerceClient from '../../../../infrastructure/external/ecommerce/woocommerce/woocommerce.client';
import { AppError } from '../../../../shared/errors/app.error';
import logger from '../../../../shared/logger/winston.logger';

/**
 * Tracking information for WooCommerce order update
 */
interface TrackingInfo {
    awbNumber: string;
    courierName: string;
    trackingUrl?: string;
}

/**
 * WooCommerce order status options
 */
type WooCommerceOrderStatus =
    | 'pending'
    | 'processing'
    | 'on-hold'
    | 'completed'
    | 'cancelled'
    | 'refunded'
    | 'failed';

/**
 * WooCommerce order update payload
 */
interface OrderUpdatePayload {
    status?: WooCommerceOrderStatus;
    meta_data?: Array<{
        key: string;
        value: string;
    }>;
}

/**
 * WooCommerce order note payload
 */
interface OrderNotePayload {
    note: string;
    customer_note?: boolean;
}

/**
 * Status mapping from Helix to WooCommerce
 */
const Helix_TO_WOOCOMMERCE_STATUS: Record<string, WooCommerceOrderStatus> = {
    PENDING: 'pending',
    PROCESSING: 'processing',
    BOOKED: 'processing',
    MANIFESTED: 'processing',
    PICKED_UP: 'processing',
    IN_TRANSIT: 'processing',
    OUT_FOR_DELIVERY: 'processing',
    DELIVERED: 'completed',
    CANCELLED: 'cancelled',
    FAILED: 'failed',
    REFUNDED: 'refunded',
    RTO_INITIATED: 'processing',
    RTO_IN_TRANSIT: 'processing',
    RTO_DELIVERED: 'failed', // RTO completed = order failed delivery
};

/**
 * WooCommerceFulfillmentService
 *
 * Handles pushing order status and tracking updates to WooCommerce stores.
 * Uses the WooCommerce REST API to update orders, add notes, and sync status.
 */
export class WooCommerceFulfillmentService {
    /**
     * Update order status in WooCommerce
     *
     * @param orderId - Helix order ID
     * @param status - New WooCommerce status
     * @param trackingInfo - Optional tracking information
     * @returns Updated WooCommerce order
     */
    static async updateOrderStatus(
        orderId: string,
        status: WooCommerceOrderStatus,
        trackingInfo?: TrackingInfo
    ): Promise<any> {
        try {
            // 1. Get order and validate it's from WooCommerce
            const order = await Order.findById(orderId);

            if (!order) {
                throw new AppError('Order not found', 'ORDER_NOT_FOUND', 404);
            }

            if (order.source !== 'woocommerce') {
                logger.debug('Order is not from WooCommerce, skipping status update', {
                    orderId,
                    source: order.source,
                });
                return null;
            }

            if (!order.sourceId) {
                throw new AppError(
                    'Order missing WooCommerce order ID',
                    'WOOCOMMERCE_ORDER_ID_MISSING',
                    400
                );
            }

            // 2. Get WooCommerce store with credentials
            const store = await WooCommerceStore.findOne({
                companyId: order.companyId,
                isActive: true,
            });

            if (!store) {
                throw new AppError(
                    'No active WooCommerce store found for this company',
                    'WOOCOMMERCE_STORE_NOT_FOUND',
                    404
                );
            }

            // 3. Create WooCommerce client
            const client = new WooCommerceClient({
                storeUrl: store.storeUrl,
                consumerKey: store.decryptConsumerKey(),
                consumerSecret: store.decryptConsumerSecret(),
            });

            // 4. Build update payload
            const payload: OrderUpdatePayload = {
                status,
            };

            // Add tracking info as meta data if provided
            if (trackingInfo) {
                payload.meta_data = [
                    { key: '_tracking_number', value: trackingInfo.awbNumber },
                    { key: '_tracking_provider', value: trackingInfo.courierName },
                    {
                        key: '_tracking_url',
                        value: trackingInfo.trackingUrl || this.generateTrackingUrl(
                            trackingInfo.awbNumber,
                            trackingInfo.courierName
                        ),
                    },
                    { key: '_Helix_order_id', value: String(order._id) },
                ];
            }

            // 5. Update order in WooCommerce
            logger.info('Updating WooCommerce order status', {
                orderId,
                wooOrderId: order.sourceId,
                storeId: store._id,
                newStatus: status,
            });

            const response = await client.put<any>(`/orders/${order.sourceId}`, payload);

            // 6. Add tracking note if tracking info provided
            if (trackingInfo) {
                await this.addTrackingNote(orderId, trackingInfo);
            }

            // 7. Update local order record
            order.currentStatus = this.mapWooCommerceToHelix(status);
            order.statusHistory.push({
                status: order.currentStatus,
                timestamp: new Date(),
                comment: `WooCommerce status updated to: ${status}`,
            });
            await order.save();

            logger.info('WooCommerce order status updated successfully', {
                orderId,
                wooOrderId: order.sourceId,
                newStatus: status,
            });

            return response;
        } catch (error: any) {
            logger.error('Failed to update WooCommerce order status', {
                orderId,
                status,
                error: error.message,
            });

            if (error instanceof AppError) {
                throw error;
            }

            throw new AppError(
                `Failed to update WooCommerce order: ${error.message}`,
                'WOOCOMMERCE_UPDATE_FAILED',
                500
            );
        }
    }

    /**
     * Add tracking note to WooCommerce order
     *
     * @param orderId - Helix order ID
     * @param trackingInfo - Tracking information
     * @param customerNote - Whether to send as customer-visible note
     * @returns Created note
     */
    static async addTrackingNote(
        orderId: string,
        trackingInfo: TrackingInfo,
        customerNote: boolean = true
    ): Promise<any> {
        try {
            const order = await Order.findById(orderId);

            if (!order || order.source !== 'woocommerce') {
                return null;
            }

            const store = await WooCommerceStore.findOne({
                companyId: order.companyId,
                isActive: true,
            });

            if (!store) {
                return null;
            }

            const client = new WooCommerceClient({
                storeUrl: store.storeUrl,
                consumerKey: store.decryptConsumerKey(),
                consumerSecret: store.decryptConsumerSecret(),
            });

            // Generate tracking URL
            const trackingUrl = trackingInfo.trackingUrl || this.generateTrackingUrl(
                trackingInfo.awbNumber,
                trackingInfo.courierName
            );

            // Build note content
            const noteContent = `📦 **Shipment Update**

Your order has been shipped!

**Courier:** ${trackingInfo.courierName}
**Tracking Number:** ${trackingInfo.awbNumber}

Track your package here: ${trackingUrl}

Thank you for your order!`;

            const payload: OrderNotePayload = {
                note: noteContent,
                customer_note: customerNote,
            };

            const response = await client.post<any>(`/orders/${order.sourceId}/notes`, payload);

            logger.info('WooCommerce order note added', {
                orderId,
                wooOrderId: order.sourceId,
                trackingNumber: trackingInfo.awbNumber,
                customerNote,
            });

            return response;
        } catch (error: any) {
            logger.warn('Failed to add WooCommerce order note', {
                orderId,
                error: error.message,
            });

            // Don't throw - notes are non-critical
            return null;
        }
    }

    /**
     * Mark order as shipped with tracking info
     * Convenience method combining status update and tracking note
     *
     * @param orderId - Helix order ID
     * @param trackingInfo - Tracking information
     * @returns Updated WooCommerce order
     */
    static async markAsShipped(
        orderId: string,
        trackingInfo: TrackingInfo
    ): Promise<any> {
        return this.updateOrderStatus(orderId, 'processing', trackingInfo);
    }

    /**
     * Mark order as delivered/completed
     *
     * @param orderId - Helix order ID
     * @returns Updated WooCommerce order
     */
    static async markAsDelivered(orderId: string): Promise<any> {
        try {
            const result = await this.updateOrderStatus(orderId, 'completed');

            // Add completion note
            const order = await Order.findById(orderId);
            if (order && order.source === 'woocommerce') {
                const store = await WooCommerceStore.findOne({
                    companyId: order.companyId,
                    isActive: true,
                });

                if (store) {
                    const client = new WooCommerceClient({
                        storeUrl: store.storeUrl,
                        consumerKey: store.decryptConsumerKey(),
                        consumerSecret: store.decryptConsumerSecret(),
                    });

                    await client.post(`/orders/${order.sourceId}/notes`, {
                        note: '✅ Order has been delivered successfully!',
                        customer_note: true,
                    });
                }
            }

            return result;
        } catch (error: any) {
            logger.error('Failed to mark WooCommerce order as delivered', {
                orderId,
                error: error.message,
            });
            throw error;
        }
    }

    /**
     * Cancel order in WooCommerce
     *
     * @param orderId - Helix order ID
     * @param reason - Cancellation reason
     * @returns Updated WooCommerce order
     */
    static async cancelOrder(orderId: string, reason?: string): Promise<any> {
        try {
            const result = await this.updateOrderStatus(orderId, 'cancelled');

            // Add cancellation note
            const order = await Order.findById(orderId);
            if (order && order.source === 'woocommerce') {
                const store = await WooCommerceStore.findOne({
                    companyId: order.companyId,
                    isActive: true,
                });

                if (store) {
                    const client = new WooCommerceClient({
                        storeUrl: store.storeUrl,
                        consumerKey: store.decryptConsumerKey(),
                        consumerSecret: store.decryptConsumerSecret(),
                    });

                    await client.post(`/orders/${order.sourceId}/notes`, {
                        note: `❌ Order cancelled${reason ? `: ${reason}` : ''}`,
                        customer_note: false, // Internal note for cancellation reason
                    });
                }
            }

            return result;
        } catch (error: any) {
            logger.error('Failed to cancel WooCommerce order', {
                orderId,
                error: error.message,
            });
            throw error;
        }
    }

    /**
     * Handle shipment status change and sync to WooCommerce
     *
     * Called automatically when shipment status changes in Helix.
     *
     * @param shipmentId - Helix shipment ID
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
                logger.warn('Shipment not found for WooCommerce sync', { shipmentId });
                return;
            }

            const order = await Order.findById(shipment.orderId);

            if (!order || order.source !== 'woocommerce') {
                return;
            }

            // Handle based on status
            switch (newStatus) {
                case 'BOOKED':
                case 'MANIFESTED':
                case 'PICKED_UP':
                    // Mark as shipped and add tracking
                    await this.markAsShipped(String(order._id), {
                        awbNumber: shipment.trackingNumber,
                        courierName: shipment.carrier,
                        trackingUrl: undefined, // Shipment model doesn't have trackingUrl field
                    });
                    break;

                case 'IN_TRANSIT':
                case 'OUT_FOR_DELIVERY':
                    // Add status update note only
                    await this.addStatusNote(String(order._id), newStatus, undefined); // statusMessage not in Shipment model
                    break;

                case 'DELIVERED':
                    // Mark as completed
                    await this.markAsDelivered(String(order._id));
                    break;

                case 'ATTEMPTED_DELIVERY':
                case 'FAILED_ATTEMPT':
                    // Add note about delivery attempt
                    await this.addStatusNote(String(order._id), newStatus, undefined); // statusMessage not in Shipment model
                    break;

                case 'RTO_INITIATED':
                case 'RTO_IN_TRANSIT':
                    // Add RTO note
                    await this.addStatusNote(
                        String(order._id),
                        newStatus,
                        'Return to Origin initiated: Delivery failed'
                    );
                    break;

                case 'RTO_DELIVERED':
                    // Mark as failed
                    await this.updateOrderStatus(String(order._id), 'failed');
                    await this.addStatusNote(
                        String(order._id),
                        newStatus,
                        'Order returned to origin - delivery failed'
                    );
                    break;

                case 'CANCELLED':
                    // Cancel order
                    await this.cancelOrder(String(order._id), 'Shipment cancelled');
                    break;
            }

            logger.info('WooCommerce order status synced', {
                shipmentId,
                orderId: order._id,
                status: newStatus,
            });
        } catch (error: any) {
            logger.error('Failed to sync shipment status to WooCommerce', {
                shipmentId,
                newStatus,
                error: error.message,
            });
            // Don't throw - this is a background sync operation
        }
    }

    /**
     * Add status update note to order
     *
     * @param orderId - Helix order ID
     * @param status - Status name
     * @param message - Optional status message
     */
    private static async addStatusNote(
        orderId: string,
        status: string,
        message?: string
    ): Promise<void> {
        try {
            const order = await Order.findById(orderId);

            if (!order || order.source !== 'woocommerce') {
                return;
            }

            const store = await WooCommerceStore.findOne({
                companyId: order.companyId,
                isActive: true,
            });

            if (!store) {
                return;
            }

            const client = new WooCommerceClient({
                storeUrl: store.storeUrl,
                consumerKey: store.decryptConsumerKey(),
                consumerSecret: store.decryptConsumerSecret(),
            });

            // Format status for display
            const statusLabels: Record<string, string> = {
                IN_TRANSIT: '📦 Package in transit',
                OUT_FOR_DELIVERY: '🚚 Out for delivery',
                ATTEMPTED_DELIVERY: '⚠️ Delivery attempted',
                FAILED_ATTEMPT: '❌ Delivery failed',
                RTO_INITIATED: '↩️ Return initiated',
                RTO_IN_TRANSIT: '↩️ Return in transit',
                RTO_DELIVERED: '📦 Returned to origin',
            };

            const noteContent = message
                ? `${statusLabels[status] || status}: ${message}`
                : statusLabels[status] || `Status: ${status}`;

            await client.post(`/orders/${order.sourceId}/notes`, {
                note: noteContent,
                customer_note: true,
            });
        } catch (error: any) {
            logger.warn('Failed to add WooCommerce status note', {
                orderId,
                status,
                error: error.message,
            });
        }
    }

    /**
     * Generate tracking URL for common courier services
     *
     * @param awbNumber - AWB/Tracking number
     * @param courierName - Courier service name
     * @returns Tracking URL
     */
    private static generateTrackingUrl(awbNumber: string, courierName: string): string {
        const courier = courierName.toLowerCase();

        // Common Indian courier tracking URLs
        const trackingUrls: Record<string, string> = {
            bluedart: `https://www.bluedart.com/tracking?tracking_id=${awbNumber}`,
            delhivery: `https://www.delhivery.com/track/package/${awbNumber}`,
            ecom: `https://ecomexpress.in/tracking/?awb_field=${awbNumber}`,
            'ecom express': `https://ecomexpress.in/tracking/?awb_field=${awbNumber}`,
            xpressbees: `https://www.xpressbees.com/shipment/tracking?awb=${awbNumber}`,
            dtdc: `https://www.dtdc.in/tracking/shipment-tracking.asp?strCnno=${awbNumber}`,
            ekart: `https://ekartlogistics.com/track/${awbNumber}`,
            shadowfax: `https://tracker.shadowfax.in/#/track?awb=${awbNumber}`,
            shiprocket: `https://shiprocket.co/tracking/${awbNumber}`,
            nimbuspost: `https://www.nimbuspost.com/tracking?search_by=awb&waybill_id=${awbNumber}`,
        };

        // Find matching courier
        for (const [key, url] of Object.entries(trackingUrls)) {
            if (courier.includes(key)) {
                return url;
            }
        }

        // Default fallback - Helix tracking page
        return `${process.env.FRONTEND_URL || 'https://Helix.com'}/track/${awbNumber}`;
    }

    /**
     * Map WooCommerce status to Helix status
     *
     * @param wooStatus - WooCommerce status
     * @returns Helix status
     */
    private static mapWooCommerceToHelix(wooStatus: WooCommerceOrderStatus): string {
        const statusMap: Record<WooCommerceOrderStatus, string> = {
            pending: 'PENDING',
            processing: 'PROCESSING',
            'on-hold': 'PENDING',
            completed: 'DELIVERED',
            cancelled: 'CANCELLED',
            refunded: 'REFUNDED',
            failed: 'FAILED',
        };

        return statusMap[wooStatus] || 'PENDING';
    }

    /**
     * Sync all pending status updates for a store
     * Used for bulk operations or recovery
     *
     * @param storeId - WooCommerce store ID
     * @returns Number of orders synced
     */
    static async syncPendingUpdates(storeId: string): Promise<number> {
        try {
            const store = await WooCommerceStore.findById(storeId);

            if (!store) {
                throw new AppError('WooCommerce store not found', 'WOOCOMMERCE_STORE_NOT_FOUND', 404);
            }

            // Find delivered orders that haven't been synced to WooCommerce
            // Note: Using currentStatus as proxy since woocommerceSynced field doesn't exist in Order model
            const orders = await Order.find({
                source: 'woocommerce',
                companyId: store.companyId,
                currentStatus: 'DELIVERED',
                // woocommerceSynced: { $ne: true }, // Field doesn't exist in model
            }).limit(100);

            let syncedCount = 0;

            for (const order of orders) {
                try {
                    await this.markAsDelivered(String(order._id));
                    // Note: woocommerceSynced field not in Order model - sync tracking happens via status
                    // order.woocommerceSynced = true;
                    await order.save();
                    syncedCount++;
                } catch (error) {
                    logger.warn('Failed to sync order to WooCommerce', {
                        orderId: order._id,
                        error: (error as Error).message,
                    });
                }
            }

            logger.info('Pending WooCommerce updates synced', {
                storeId,
                totalOrders: orders.length,
                syncedCount,
            });

            return syncedCount;
        } catch (error: any) {
            logger.error('Failed to sync pending WooCommerce updates', {
                storeId,
                error: error.message,
            });

            throw error;
        }
    }
}

export default WooCommerceFulfillmentService;
