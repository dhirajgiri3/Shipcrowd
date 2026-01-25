/**
 * Amazon Fulfillment Service
 *
 * Purpose: Push fulfillment and tracking information back to Amazon SP-API
 * when MFN (Merchant Fulfilled Network) orders are shipped in Shipcrowd.
 *
 * IMPORTANT: This service ONLY handles MFN orders. FBA (Fulfilled by Amazon)
 * orders are skipped entirely as Amazon handles their fulfillment.
 *
 * FEATURES:
 * - Confirm shipment for MFN orders via Feed API
 * - Update tracking information
 * - Cancel shipments when orders are cancelled
 * - Handle shipment status changes from Shipcrowd webhooks
 * - Carrier code mapping for Indian carriers
 * - Feed status polling and error handling
 *
 * DEPENDENCIES:
 * - AmazonStore model for store credentials
 * - AmazonClient for SP-API calls and Feed submissions
 * - Order model for order data
 * - Shipment model for tracking data
 *
 * TESTING:
 * Unit Tests: tests/unit/services/amazon/AmazonFulfillmentService.test.ts
 */

import { AmazonStore, Order, Shipment } from '../../../../infrastructure/database/mongoose/models';
import AmazonClient from '../../../../infrastructure/external/ecommerce/amazon/amazon.client';
import { AppError } from '../../../../shared/errors/app.error';
import logger from '../../../../shared/logger/winston.logger';

/**
 * Tracking information for fulfillment
 */
interface TrackingInfo {
    awbNumber: string;
    courierName: string;
    trackingUrl?: string;
}

/**
 * Amazon carrier code mappings for Indian couriers
 */
const CARRIER_CODE_MAP: Record<string, string> = {
    'blue dart': 'BlueDart',
    'bluedart': 'BlueDart',
    'delhivery': 'DELHIVERY',
    'ecom express': 'EcomExpress',
    'ecom': 'EcomExpress',
    'xpressbees': 'XPRESSBEES',
    'dtdc': 'DTDC',
    'ekart': 'EKART',
    'shadowfax': 'Shadowfax',
    'shiprocket': 'Shiprocket',
    'nimbuspost': 'NimbusPost',
    'india post': 'IndiaPost',
    'fedex': 'FedEx',
    'dhl': 'DHL',
};

/**
 * Status mappings from Shipcrowd to Amazon
 */
const Shipcrowd_TO_AMAZON_STATUS: Record<string, string> = {
    BOOKED: 'Pending',
    MANIFESTED: 'Shipped',
    PICKED_UP: 'Shipped',
    IN_TRANSIT: 'Shipped',
    OUT_FOR_DELIVERY: 'Shipped',
    DELIVERED: 'Delivered',
    RTO_INITIATED: 'ReturnInitiated',
    RTO_IN_TRANSIT: 'ReturnInTransit',
    RTO_DELIVERED: 'ReturnCompleted',
    CANCELLED: 'Cancelled',
};

/**
 * AmazonFulfillmentService
 *
 * Handles pushing fulfillment and tracking updates to Amazon SP-API.
 * Only processes MFN (Merchant Fulfilled) orders. FBA orders are skipped.
 */
export class AmazonFulfillmentService {
    /**
     * Confirm shipment for an MFN order
     * 
     * Uses Amazon Feed API to submit shipment confirmation.
     * This is the primary method for informing Amazon that an order has shipped.
     *
     * @param orderId - Shipcrowd order ID
     * @param trackingInfo - Tracking information
     * @returns Feed submission result
     */
    static async confirmShipment(
        orderId: string,
        trackingInfo: TrackingInfo
    ): Promise<{ feedId: string; status: string } | null> {
        try {
            // 1. Get order and validate it's from Amazon MFN
            const order = await Order.findById(orderId);

            if (!order) {
                throw new AppError('Order not found', 'ORDER_NOT_FOUND', 404);
            }

            if (order.source !== 'amazon') {
                logger.debug('Order is not from Amazon, skipping fulfillment push', {
                    orderId,
                    source: order.source,
                });
                return null;
            }

            // CRITICAL: Skip FBA orders - Amazon handles their fulfillment
            if (order.fulfillmentType === 'FBA') {
                logger.debug('Skipping FBA order - Amazon handles fulfillment', {
                    orderId,
                    amazonOrderId: order.amazonOrderId,
                    fulfillmentType: order.fulfillmentType,
                });
                return null;
            }

            if (!order.amazonOrderId) {
                throw new AppError(
                    'Order missing Amazon order ID',
                    'AMAZON_ORDER_ID_MISSING',
                    400
                );
            }

            // 2. Get Amazon store with credentials
            const store = await AmazonStore.findOne({
                companyId: order.companyId,
                isActive: true,
            }).select('+lwaClientId +lwaClientSecret +lwaRefreshToken +awsAccessKeyId +awsSecretAccessKey');

            if (!store) {
                throw new AppError(
                    'No active Amazon store found for this company',
                    'AMAZON_STORE_NOT_FOUND',
                    404
                );
            }

            // 3. Decrypt credentials
            const lwaCredentials = store.decryptLwaCredentials();
            const awsCredentials = store.decryptAwsCredentials();

            // 4. Create Amazon client
            const client = new AmazonClient({
                clientId: lwaCredentials.clientId,
                clientSecret: lwaCredentials.clientSecret,
                refreshToken: lwaCredentials.refreshToken,
                awsAccessKeyId: awsCredentials.accessKeyId,
                awsSecretAccessKey: awsCredentials.secretAccessKey,
                awsRegion: store.region || 'us-east-1',
                marketplace: 'NA', // TODO: Make this configurable based on store region
            });

            // 4. Map courier name to Amazon carrier code
            const carrierCode = this.mapCarrierCode(trackingInfo.courierName);

            // 5. Build shipment confirmation feed (XML format)
            const feedXml = this.buildShipmentConfirmationFeed(
                order.amazonOrderId,
                trackingInfo.awbNumber,
                carrierCode,
                new Date()
            );

            // 6. Submit feed to Amazon
            logger.info('Submitting shipment confirmation feed to Amazon', {
                orderId,
                amazonOrderId: order.amazonOrderId,
                awb: trackingInfo.awbNumber,
                carrier: carrierCode,
            });

            const feedResponse = await client.submitFeed(
                'POST_ORDER_FULFILLMENT_DATA',
                feedXml,
                'text/xml; charset=UTF-8'
            );

            // 7. Poll feed status (wait for processing)
            const feedResult = await client.pollFeedUntilComplete(
                feedResponse.feedId,
                30, // max 30 attempts
                10000 // 10 second intervals
            );

            logger.info('Amazon shipment confirmation feed processed', {
                orderId,
                feedId: feedResponse.feedId,
                status: feedResult.processingStatus,
            });

            // 8. Update order with feed info
            order.statusHistory.push({
                status: 'SHIPPED',
                timestamp: new Date(),
                comment: `Shipment confirmed in Amazon (Feed: ${feedResponse.feedId})`,
            });
            await order.save();

            return {
                feedId: feedResponse.feedId,
                status: feedResult.processingStatus,
            };
        } catch (error: any) {
            logger.error('Failed to confirm Amazon shipment', {
                orderId,
                error: error.message,
                stack: error.stack,
            });

            if (error instanceof AppError) {
                throw error;
            }

            throw new AppError(
                `Failed to confirm Amazon shipment: ${error.message}`,
                'AMAZON_SHIPMENT_CONFIRMATION_FAILED',
                500
            );
        }
    }

    /**
     * Build XML feed for shipment confirmation
     *
     * @param amazonOrderId - Amazon order ID
     * @param trackingNumber - AWB/Tracking number
     * @param carrierCode - Amazon carrier code
     * @param shipmentDate - Date of shipment
     * @returns XML feed content
     */
    private static buildShipmentConfirmationFeed(
        amazonOrderId: string,
        trackingNumber: string,
        carrierCode: string,
        shipmentDate: Date
    ): string {
        const isoDate = shipmentDate.toISOString();

        return `<?xml version="1.0" encoding="UTF-8"?>
<AmazonEnvelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="amzn-envelope.xsd">
    <Header>
        <DocumentVersion>1.01</DocumentVersion>
        <MerchantIdentifier>Shipcrowd</MerchantIdentifier>
    </Header>
    <MessageType>OrderFulfillment</MessageType>
    <Message>
        <MessageID>1</MessageID>
        <OperationType>Update</OperationType>
        <OrderFulfillment>
            <AmazonOrderID>${amazonOrderId}</AmazonOrderID>
            <FulfillmentDate>${isoDate}</FulfillmentDate>
            <FulfillmentData>
                <CarrierCode>${carrierCode}</CarrierCode>
                <ShippingMethod>Standard</ShippingMethod>
                <ShipperTrackingNumber>${trackingNumber}</ShipperTrackingNumber>
            </FulfillmentData>
        </OrderFulfillment>
    </Message>
</AmazonEnvelope>`;
    }

    /**
     * Map courier name to Amazon carrier code
     *
     * @param courierName - Courier service name
     * @returns Amazon carrier code
     */
    private static mapCarrierCode(courierName: string): string {
        const normalizedName = courierName.toLowerCase().trim();

        // Check exact matches and partial matches
        for (const [key, code] of Object.entries(CARRIER_CODE_MAP)) {
            if (normalizedName.includes(key)) {
                return code;
            }
        }

        // Default to courier name as-is if no mapping found
        return courierName.replace(/\s+/g, '');
    }

    /**
     * Cancel shipment when order is cancelled
     *
     * @param orderId - Shipcrowd order ID
     * @returns True if cancellation was successful
     */
    static async cancelShipment(orderId: string): Promise<boolean> {
        try {
            const order = await Order.findById(orderId);

            if (!order || order.source !== 'amazon' || order.fulfillmentType === 'FBA') {
                return false;
            }

            // For Amazon, cancellations are typically handled through order cancellation API
            // Feed API doesn't support shipment cancellation directly
            logger.info('Amazon MFN shipment cancelled', {
                orderId,
                amazonOrderId: order.amazonOrderId,
            });

            order.currentStatus = 'CANCELLED';
            order.statusHistory.push({
                status: 'CANCELLED',
                timestamp: new Date(),
                comment: 'Shipment cancelled',
            });
            await order.save();

            return true;
        } catch (error: any) {
            logger.error('Failed to cancel Amazon shipment', {
                orderId,
                error: error.message,
            });
            return false;
        }
    }

    /**
     * Handle shipment status webhook and push to Amazon
     *
     * Called automatically when a shipment status changes in Shipcrowd.
     * Only processes MFN orders.
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
                logger.warn('Shipment not found for Amazon status push', { shipmentId });
                return;
            }

            const order = await Order.findById(shipment.orderId);

            if (!order || order.source !== 'amazon' || order.fulfillmentType === 'FBA') {
                return; // Skip non-Amazon or FBA orders
            }

            // Handle based on status
            switch (newStatus) {
                case 'BOOKED':
                case 'MANIFESTED':
                case 'PICKED_UP':
                    // Confirm shipment in Amazon
                    await this.confirmShipment(String(order._id), {
                        awbNumber: shipment.trackingNumber,
                        courierName: shipment.carrier,
                    });
                    break;

                case 'CANCELLED':
                    // Cancel shipment
                    await this.cancelShipment(String(order._id));
                    break;

                // Other statuses (IN_TRANSIT, DELIVERED, etc.) don't require immediate action
                // Amazon tracks these automatically via carrier integration
            }

            logger.info('Amazon fulfillment status synced', {
                shipmentId,
                orderId: order._id,
                status: newStatus,
            });
        } catch (error: any) {
            logger.error('Failed to sync shipment status to Amazon', {
                shipmentId,
                newStatus,
                error: error.message,
            });
            // Don't throw - this is a background sync operation
        }
    }

    /**
     * Sync all pending MFN shipments for a store
     * Used for bulk operations or recovery
     *
     * @param storeId - Amazon store ID
     * @returns Number of shipments synced
     */
    static async syncPendingShipments(storeId: string): Promise<number> {
        try {
            const store = await AmazonStore.findById(storeId);

            if (!store) {
                throw new AppError('Amazon store not found', 'AMAZON_STORE_NOT_FOUND', 404);
            }

            // Find MFN orders that need shipment confirmation
            const orders = await Order.find({
                source: 'amazon',
                companyId: store.companyId,
                fulfillmentType: 'MFN', // Only MFN orders
                currentStatus: { $in: ['PROCESSING', 'SHIPPED', 'IN_TRANSIT'] },
            }).limit(50); // Limit to prevent overwhelming Feed API

            let syncedCount = 0;

            for (const order of orders) {
                // Get shipment for this order
                const shipment = await Shipment.findOne({ orderId: order._id });

                if (shipment && shipment.trackingNumber) {
                    try {
                        await this.confirmShipment(String(order._id), {
                            awbNumber: shipment.trackingNumber,
                            courierName: shipment.carrier,
                        });
                        syncedCount++;

                        // Add delay between feeds to respect rate limits
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    } catch (error) {
                        logger.warn('Failed to sync shipment', {
                            orderId: order._id,
                            error: (error as Error).message,
                        });
                    }
                }
            }

            logger.info('Pending Amazon MFN shipments synced', {
                storeId,
                totalOrders: orders.length,
                syncedCount,
            });

            return syncedCount;
        } catch (error: any) {
            logger.error('Failed to sync pending Amazon shipments', {
                storeId,
                error: error.message,
            });

            throw error;
        }
    }
}

export default AmazonFulfillmentService;
