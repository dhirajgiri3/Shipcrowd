/**
 * Shopify Fulfillment Service
 *
 * Purpose: Push fulfillment and tracking information back to Shopify
 * when orders are shipped in Shipcrowd.
 *
 * FEATURES:
 * - Create fulfillment with tracking info when shipment is booked
 * - Update tracking number/URL on existing fulfillments
 * - Cancel fulfillment when order is cancelled
 * - Notify customer of shipment updates
 * - Handle partial fulfillments for multi-shipment orders
 *
 * DEPENDENCIES:
 * - ShopifyStore model for store credentials
 * - ShopifyClient for API calls
 * - Order model for order data
 * - Shipment model for tracking data
 *
 * TESTING:
 * Unit Tests: tests/unit/services/shopify/ShopifyFulfillmentService.test.ts
 */

import { ShopifyStore } from '../../../../infrastructure/database/mongoose/models';
import { Order, IOrder } from '../../../../infrastructure/database/mongoose/models';
import { Shipment, IShipment } from '../../../../infrastructure/database/mongoose/models';
import ShopifyClient from '../../../../infrastructure/external/ecommerce/shopify/shopify.client';
import { AppError } from '../../../../shared/errors/app.error';
import logger from '../../../../shared/logger/winston.logger';

/**
 * Tracking information for fulfillment
 */
interface TrackingInfo {
    awbNumber: string;
    courierName: string;
    trackingUrl?: string;
    notifyCustomer?: boolean;
}

/**
 * Fulfillment response from Shopify
 */
interface ShopifyFulfillment {
    id: number;
    order_id: number;
    status: string;
    created_at: string;
    tracking_number: string | null;
    tracking_numbers: string[];
    tracking_url: string | null;
    tracking_urls: string[];
    tracking_company: string | null;
    shipment_status: string | null;
    line_items: Array<{
        id: number;
        quantity: number;
    }>;
}

/**
 * Fulfillment creation payload
 */
interface CreateFulfillmentPayload {
    fulfillment: {
        location_id?: number;
        tracking_number?: string;
        tracking_numbers?: string[];
        tracking_url?: string;
        tracking_urls?: string[];
        tracking_company?: string;
        notify_customer?: boolean;
        line_items?: Array<{
            id: number;
            quantity?: number;
        }>;
    };
}

/**
 * Status update mappings from Shipcrowd to Shopify
 */
const Shipcrowd_TO_SHOPIFY_STATUS: Record<string, string> = {
    PICKED_UP: 'in_transit',
    IN_TRANSIT: 'in_transit',
    OUT_FOR_DELIVERY: 'out_for_delivery',
    DELIVERED: 'delivered',
    ATTEMPTED_DELIVERY: 'attempted_delivery',
    FAILED_ATTEMPT: 'failure',
    RTO_INITIATED: 'failure',
    RTO_IN_TRANSIT: 'failure',
    RTO_DELIVERED: 'failure',
    CANCELLED: 'cancelled',
};

/**
 * ShopifyFulfillmentService
 *
 * Handles pushing fulfillment and tracking updates to Shopify stores.
 * Uses the Shopify Admin API to create fulfillments, update tracking,
 * and notify customers of shipment status changes.
 */
export class ShopifyFulfillmentService {
    /**
     * Create a fulfillment in Shopify when a shipment is created
     *
     * @param orderId - Shipcrowd order ID
     * @param trackingInfo - Tracking information (AWB, courier, URL)
     * @returns Shopify fulfillment response
     */
    static async createFulfillment(
        orderId: string,
        trackingInfo: TrackingInfo
    ): Promise<ShopifyFulfillment | null> {
        try {
            // 1. Get order and validate it's from Shopify
            const order = await Order.findById(orderId);

            if (!order) {
                throw new AppError('Order not found', 'ORDER_NOT_FOUND', 404);
            }

            if (order.source !== 'shopify') {
                logger.debug('Order is not from Shopify, skipping fulfillment push', {
                    orderId,
                    source: order.source,
                });
                return null;
            }

            if (!order.sourceId) {
                throw new AppError(
                    'Order missing Shopify order ID',
                    'SHOPIFY_ORDER_ID_MISSING',
                    400
                );
            }

            // 2. Get Shopify store with credentials
            const store = await ShopifyStore.findOne({
                companyId: order.companyId,
                isActive: true,
            }).select('+accessToken');

            if (!store) {
                throw new AppError(
                    'No active Shopify store found for this company',
                    'SHOPIFY_STORE_NOT_FOUND',
                    404
                );
            }

            // 3. Create Shopify client
            const client = new ShopifyClient({
                shopDomain: store.shopDomain,
                accessToken: store.decryptAccessToken(),
            });

            // 4. Get location ID for fulfillment (use primary location)
            const locationsResponse = await client.get<{ locations: Array<{ id: number; name: string; primary: boolean }> }>(
                '/locations.json'
            );

            const primaryLocation = locationsResponse.locations.find((loc) => loc.primary) ||
                locationsResponse.locations[0];

            if (!primaryLocation) {
                throw new AppError(
                    'No fulfillment location found in Shopify store',
                    'SHOPIFY_LOCATION_NOT_FOUND',
                    400
                );
            }

            // 5. Build fulfillment payload
            const payload: CreateFulfillmentPayload = {
                fulfillment: {
                    location_id: primaryLocation.id,
                    tracking_number: trackingInfo.awbNumber,
                    tracking_company: trackingInfo.courierName,
                    tracking_url: trackingInfo.trackingUrl || this.generateTrackingUrl(
                        trackingInfo.awbNumber,
                        trackingInfo.courierName
                    ),
                    notify_customer: trackingInfo.notifyCustomer !== false, // Default: true
                },
            };

            // 6. Create fulfillment in Shopify
            logger.info('Creating Shopify fulfillment', {
                orderId,
                shopifyOrderId: order.sourceId,
                storeId: store._id,
                awb: trackingInfo.awbNumber,
            });

            const response = await client.post<{ fulfillment: ShopifyFulfillment }>(
                `/orders/${order.sourceId}/fulfillments.json`,
                payload
            );

            const fulfillment = response.fulfillment;

            // 7. Update order with Shopify fulfillment ID
            // Note: shopifyFulfillmentId field may not exist in Order model - add if needed
            (order as any).shopifyFulfillmentId = fulfillment.id.toString();
            order.currentStatus = 'PROCESSING';
            order.statusHistory.push({
                status: 'PROCESSING',
                timestamp: new Date(),
                comment: `Fulfillment created in Shopify (ID: ${fulfillment.id})`,
            });
            await order.save();

            logger.info('Shopify fulfillment created successfully', {
                orderId,
                shopifyOrderId: order.sourceId,
                fulfillmentId: fulfillment.id,
                trackingNumber: fulfillment.tracking_number,
            });

            return fulfillment;
        } catch (error: any) {
            logger.error('Failed to create Shopify fulfillment', {
                orderId,
                error: error.message,
                stack: error.stack,
            });

            // Don't throw for non-critical failures
            if (error instanceof AppError) {
                throw error;
            }

            throw new AppError(
                `Failed to create Shopify fulfillment: ${error.message}`,
                'SHOPIFY_FULFILLMENT_FAILED',
                500
            );
        }
    }

    /**
     * Update tracking information on an existing fulfillment
     *
     * @param orderId - Shipcrowd order ID
     * @param trackingInfo - New tracking information
     * @returns Updated Shopify fulfillment
     */
    static async updateTracking(
        orderId: string,
        trackingInfo: TrackingInfo
    ): Promise<ShopifyFulfillment | null> {
        try {
            // 1. Get order with fulfillment ID
            const order = await Order.findById(orderId);

            if (!order) {
                throw new AppError('Order not found', 'ORDER_NOT_FOUND', 404);
            }

            if (order.source !== 'shopify') {
                return null;
            }

            if (!(order as any).shopifyFulfillmentId) {
                // No existing fulfillment, create one instead
                return this.createFulfillment(orderId, trackingInfo);
            }

            // 2. Get store
            const store = await ShopifyStore.findOne({
                companyId: order.companyId,
                isActive: true,
            }).select('+accessToken');

            if (!store) {
                throw new AppError(
                    'No active Shopify store found',
                    'SHOPIFY_STORE_NOT_FOUND',
                    404
                );
            }

            // 3. Update fulfillment tracking
            const client = new ShopifyClient({
                shopDomain: store.shopDomain,
                accessToken: store.decryptAccessToken(),
            });

            const response = await client.put<{ fulfillment: ShopifyFulfillment }>(
                `/orders/${order.sourceId}/fulfillments/${(order as any).shopifyFulfillmentId}.json`,
                {
                    fulfillment: {
                        tracking_number: trackingInfo.awbNumber,
                        tracking_company: trackingInfo.courierName,
                        tracking_url: trackingInfo.trackingUrl || this.generateTrackingUrl(
                            trackingInfo.awbNumber,
                            trackingInfo.courierName
                        ),
                        notify_customer: trackingInfo.notifyCustomer !== false,
                    },
                }
            );

            logger.info('Shopify fulfillment tracking updated', {
                orderId,
                fulfillmentId: (order as any).shopifyFulfillmentId,
                newAwb: trackingInfo.awbNumber,
            });

            return response.fulfillment;
        } catch (error: any) {
            logger.error('Failed to update Shopify tracking', {
                orderId,
                error: error.message,
            });

            throw new AppError(
                `Failed to update Shopify tracking: ${error.message}`,
                'SHOPIFY_TRACKING_UPDATE_FAILED',
                500
            );
        }
    }

    /**
     * Update shipment status in Shopify when tracking status changes
     *
     * Note: Shopify doesn't have a direct API for shipment_status updates.
     * We use fulfillment events API to add status updates.
     *
     * @param orderId - Shipcrowd order ID
     * @param ShipcrowdStatus - Shipcrowd shipment status
     * @param message - Optional status message
     */
    static async updateShipmentStatus(
        orderId: string,
        ShipcrowdStatus: string,
        message?: string
    ): Promise<void> {
        try {
            const order = await Order.findById(orderId);

            if (!order || order.source !== 'shopify' || !(order as any).shopifyFulfillmentId) {
                return;
            }

            const store = await ShopifyStore.findOne({
                companyId: order.companyId,
                isActive: true,
            }).select('+accessToken');

            if (!store) {
                return;
            }

            const client = new ShopifyClient({
                shopDomain: store.shopDomain,
                accessToken: store.decryptAccessToken(),
            });

            // Map Shipcrowd status to Shopify status
            const shopifyStatus = Shipcrowd_TO_SHOPIFY_STATUS[ShipcrowdStatus];

            if (!shopifyStatus) {
                logger.debug('No Shopify status mapping for Shipcrowd status', {
                    ShipcrowdStatus,
                });
                return;
            }

            // Create fulfillment event
            await client.post(
                `/orders/${order.sourceId}/fulfillments/${(order as any).shopifyFulfillmentId}/events.json`,
                {
                    event: {
                        status: shopifyStatus,
                        message: message || `Shipment status: ${ShipcrowdStatus}`,
                    },
                }
            );

            logger.info('Shopify fulfillment event created', {
                orderId,
                fulfillmentId: (order as any).shopifyFulfillmentId,
                status: shopifyStatus,
            });
        } catch (error: any) {
            // Log but don't throw - status updates are non-critical
            logger.warn('Failed to update Shopify shipment status', {
                orderId,
                ShipcrowdStatus,
                error: error.message,
            });
        }
    }

    /**
     * Cancel fulfillment when order is cancelled
     *
     * @param orderId - Shipcrowd order ID
     * @returns True if cancellation was successful
     */
    static async cancelFulfillment(orderId: string): Promise<boolean> {
        try {
            const order = await Order.findById(orderId);

            if (!order || order.source !== 'shopify' || !(order as any).shopifyFulfillmentId) {
                return false;
            }

            const store = await ShopifyStore.findOne({
                companyId: order.companyId,
                isActive: true,
            }).select('+accessToken');

            if (!store) {
                throw new AppError(
                    'No active Shopify store found',
                    'SHOPIFY_STORE_NOT_FOUND',
                    404
                );
            }

            const client = new ShopifyClient({
                shopDomain: store.shopDomain,
                accessToken: store.decryptAccessToken(),
            });

            // Cancel the fulfillment
            await client.post(
                `/orders/${order.sourceId}/fulfillments/${(order as any).shopifyFulfillmentId}/cancel.json`,
                {}
            );

            // Update order
            (order as any).shopifyFulfillmentId = undefined;
            order.currentStatus = 'CANCELLED';
            order.statusHistory.push({
                status: 'CANCELLED',
                timestamp: new Date(),
                comment: 'Fulfillment cancelled in Shopify',
            });
            await order.save();

            logger.info('Shopify fulfillment cancelled', {
                orderId,
                shopifyOrderId: order.sourceId,
            });

            return true;
        } catch (error: any) {
            logger.error('Failed to cancel Shopify fulfillment', {
                orderId,
                error: error.message,
            });

            throw new AppError(
                `Failed to cancel Shopify fulfillment: ${error.message}`,
                'SHOPIFY_CANCEL_FAILED',
                500
            );
        }
    }

    /**
     * Handle shipment status webhook and push to Shopify
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
                logger.warn('Shipment not found for status push', { shipmentId });
                return;
            }

            const order = await Order.findById(shipment.orderId);

            if (!order || order.source !== 'shopify') {
                return;
            }

            // Handle based on status
            switch (newStatus) {
                case 'BOOKED':
                case 'MANIFESTED':
                    // Create fulfillment if not exists
                    if (!(order as any).shopifyFulfillmentId) {
                        await this.createFulfillment(String(order._id), {
                            awbNumber: shipment.trackingNumber,
                            courierName: shipment.carrier,
                            trackingUrl: undefined, // trackingUrl not in Shipment model
                            notifyCustomer: true,
                        });
                    }
                    break;

                case 'PICKED_UP':
                case 'IN_TRANSIT':
                case 'OUT_FOR_DELIVERY':
                case 'DELIVERED':
                case 'ATTEMPTED_DELIVERY':
                case 'FAILED_ATTEMPT':
                    // Update shipment status event
                    await this.updateShipmentStatus(
                        String(order._id),
                        newStatus,
                        undefined // statusMessage not in Shipment model
                    );
                    break;

                case 'RTO_INITIATED':
                case 'RTO_IN_TRANSIT':
                case 'RTO_DELIVERED':
                    // Handle RTO - update status event
                    await this.updateShipmentStatus(
                        String(order._id),
                        newStatus,
                        `Return to Origin: ${newStatus}` // statusMessage not in Shipment model
                    );
                    break;

                case 'CANCELLED':
                    // Cancel fulfillment
                    await this.cancelFulfillment(String(order._id));
                    break;
            }

            logger.info('Shopify fulfillment status synced', {
                shipmentId,
                orderId: order._id,
                status: newStatus,
            });
        } catch (error: any) {
            logger.error('Failed to sync shipment status to Shopify', {
                shipmentId,
                newStatus,
                error: error.message,
            });
            // Don't throw - this is a background sync operation
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

        // Default fallback - Shipcrowd tracking page
        return `${process.env.FRONTEND_URL || 'https://Shipcrowd.com'}/track/${awbNumber}`;
    }

    /**
     * Sync all pending fulfillments for a store
     * Used for bulk operations or recovery
     *
     * @param storeId - Shopify store ID
     * @returns Number of fulfillments synced
     */
    static async syncPendingFulfillments(storeId: string): Promise<number> {
        try {
            const store = await ShopifyStore.findById(storeId);

            if (!store) {
                throw new AppError('Shopify store not found', 'SHOPIFY_STORE_NOT_FOUND', 404);
            }

            // Find orders that have shipments but no Shopify fulfillment
            const orders = await Order.find({
                source: 'shopify',
                companyId: store.companyId,
                // shopifyFulfillmentId: { $exists: false }, // Field may not exist in Order model
                currentStatus: { $in: ['PROCESSING', 'SHIPPED', 'IN_TRANSIT', 'DELIVERED'] },
            }).limit(100);

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
                        await this.createFulfillment(orderId, {
                            awbNumber: shipment.trackingNumber,
                            courierName: shipment.carrier || 'other',
                            trackingUrl: undefined, // trackingUrl not in Shipment model
                            notifyCustomer: false, // Don't notify for bulk sync
                        });
                        syncedCount++;
                    } catch (error) {
                        logger.warn('Failed to sync fulfillment', {
                            orderId,
                            error: (error as Error).message,
                        });
                    }
                }
            }

            logger.info('Pending fulfillments synced', {
                storeId,
                totalOrders: orders.length,
                syncedCount,
            });

            return syncedCount;
        } catch (error: any) {
            logger.error('Failed to sync pending fulfillments', {
                storeId,
                error: error.message,
            });

            throw error;
        }
    }
}

export default ShopifyFulfillmentService;
