/**
 * Amazon Order Sync
 * 
 * Purpose: AmazonOrderSyncService
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
import { AmazonStore, AmazonSyncLog, Order, Company } from '../../../../infrastructure/database/mongoose/models';
import { AmazonClient } from '../../../../infrastructure/external/ecommerce/amazon/amazon.client';
import { AppError } from '../../../../shared/errors/app.error';
import logger from '../../../../shared/logger/winston.logger';
import AmazonOAuthService from './amazon-oauth.service';
import { CacheRepository } from '../../../../infrastructure/redis/cache.repository';

// Amazon order statuses
type AmazonOrderStatus =
    | 'Pending'
    | 'Unshipped'
    | 'PartiallyShipped'
    | 'Shipped'
    | 'Canceled'
    | 'Unfulfillable'
    | 'InvoiceUnconfirmed'
    | 'PendingAvailability';

// Shipcrowd order statuses for mapping
type ShipcrowdOrderStatus =
    | 'pending'
    | 'confirmed'
    | 'processing'
    | 'ready_to_ship'
    | 'shipped'
    | 'delivered'
    | 'cancelled'
    | 'returned';

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

interface AmazonOrder {
    AmazonOrderId: string;
    SellerOrderId?: string;
    PurchaseDate: string;
    LastUpdateDate: string;
    OrderStatus: AmazonOrderStatus;
    FulfillmentChannel: 'AFN' | 'MFN'; // AFN = FBA, MFN = Merchant
    OrderTotal?: {
        CurrencyCode: string;
        Amount: string;
    };
    ShippingAddress?: {
        Name?: string;
        AddressLine1?: string;
        AddressLine2?: string;
        AddressLine3?: string;
        City?: string;
        StateOrRegion?: string;
        PostalCode?: string;
        CountryCode?: string;
        Phone?: string;
    };
    BuyerInfo?: {
        BuyerEmail?: string;
        BuyerName?: string;
    };
    PaymentMethod?: string;
    PaymentMethodDetails?: Array<{ PaymentMethodDetail: string }>;
    MarketplaceId?: string;
    ShipmentServiceLevelCategory?: string;
    ShipServiceLevel?: string;
    IsPrime?: boolean;
    IsBusinessOrder?: boolean;
    EarliestShipDate?: string;
    LatestShipDate?: string;
    EarliestDeliveryDate?: string;
    LatestDeliveryDate?: string;
}

interface AmazonOrderItem {
    OrderItemId: string;
    ASIN: string;
    SellerSKU?: string;
    Title: string;
    QuantityOrdered: number;
    QuantityShipped?: number;
    ItemPrice?: {
        CurrencyCode: string;
        Amount: string;
    };
    ItemTax?: {
        CurrencyCode: string;
        Amount: string;
    };
    ShippingPrice?: {
        CurrencyCode: string;
        Amount: string;
    };
    ShippingDiscount?: {
        CurrencyCode: string;
        Amount: string;
    };
}

export default class AmazonOrderSyncService {
    /**
     * Sync orders from Amazon for a store
     */
    static async syncOrders(
        storeId: string,
        options: {
            fromDate?: Date;
            toDate?: Date;
            orderStatuses?: AmazonOrderStatus[];
            maxOrders?: number;
        } = {}
    ): Promise<SyncResult> {
        const session = await mongoose.startSession();

        try {
            session.startTransaction();

            logger.info('Starting Amazon order sync', { storeId, options });

            const store = await AmazonStore.findById(storeId, null, { session }).select(
                '+lwaClientId +lwaClientSecret +lwaRefreshToken +awsAccessKeyId +awsSecretAccessKey'
            );

            if (!store) {
                throw new AppError('Amazon store not found', 'AMAZON_STORE_NOT_FOUND', 404);
            }

            if (!store.isActive || store.isPaused) {
                throw new AppError('Amazon store is not active or is paused', 'AMAZON_STORE_INACTIVE', 400);
            }

            // Create sync log
            const [syncLog] = await AmazonSyncLog.create([{
                storeId,
                syncType: 'order',
                status: 'IN_PROGRESS',
                startTime: new Date(),
                itemsProcessed: 0,
                itemsSynced: 0,
                itemsSkipped: 0,
                itemsFailed: 0,
            }], { session });

            const result: SyncResult = {
                itemsProcessed: 0,
                itemsSynced: 0,
                itemsFailed: 0,
                itemsSkipped: 0,
                syncErrors: [],
            };

            // Update sync status
            await store.updateSyncStatus('order', 'SYNCING');

            // Create Amazon client
            const client = await AmazonOAuthService.createClientForStore(storeId);

            // Calculate date range
            const toDate = options.toDate || new Date();
            const fromDate = options.fromDate || new Date(toDate.getTime() - 24 * 60 * 60 * 1000); // Default: last 24 hours

            // Build order statuses filter
            const orderStatuses = options.orderStatuses || [
                'Unshipped',
                'PartiallyShipped',
                'Shipped',
                'Pending',
            ];

            // Fetch orders using pagination
            const ordersResponse = await client.listOrders({
                marketplaceIds: [store.marketplaceId],
                createdAfter: fromDate.toISOString(),
                createdBefore: toDate.toISOString(),
                orderStatuses: orderStatuses,
                maxResultsPerPage: 100,
            });

            const orders = ordersResponse.Orders || [];
            let nextToken = ordersResponse.NextToken;

            // Process orders
            for (const amazonOrder of orders) {
                if (options.maxOrders && result.itemsProcessed >= options.maxOrders) {
                    break;
                }

                result.itemsProcessed++;

                try {
                    await this.processOrder(amazonOrder, store, client);
                    result.itemsSynced++;
                } catch (error: any) {
                    result.itemsFailed++;
                    result.syncErrors.push({
                        itemId: amazonOrder.AmazonOrderId,
                        error: error.message,
                        timestamp: new Date(),
                    });

                    logger.error('Failed to process Amazon order', {
                        storeId,
                        orderId: amazonOrder.AmazonOrderId,
                        error: error.message,
                    });
                }
            }

            // Continue with pagination if needed
            while (nextToken && (!options.maxOrders || result.itemsProcessed < options.maxOrders)) {
                try {
                    const moreOrders = await client.listOrders({
                        MarketplaceIds: [store.marketplaceId],
                        NextToken: nextToken,
                    } as any);

                    for (const amazonOrder of moreOrders.Orders || []) {
                        if (options.maxOrders && result.itemsProcessed >= options.maxOrders) {
                            break;
                        }

                        result.itemsProcessed++;

                        try {
                            await this.processOrder(amazonOrder, store, client);
                            result.itemsSynced++;
                        } catch (error: any) {
                            result.itemsFailed++;
                            result.syncErrors.push({
                                itemId: amazonOrder.AmazonOrderId,
                                error: error.message,
                                timestamp: new Date(),
                            });
                        }
                    }

                    nextToken = moreOrders.NextToken;
                } catch (error: any) {
                    logger.error('Failed to fetch next page of orders', {
                        storeId,
                        error: error.message,
                    });
                    break;
                }
            }

            // Update sync status and stats
            await store.updateSyncStatus('order', 'IDLE');
            await store.incrementSyncStats('order', result.itemsSynced);
            await AmazonOAuthService.resetErrorCount(storeId);

            // Complete sync log
            const syncErrors = result.syncErrors.map((e) => `${e.itemId}: ${e.error}`);
            await syncLog.completeSyncWithErrors(
                result.itemsSynced,
                result.itemsSkipped,
                result.itemsFailed,
                syncErrors
            );


            await session.commitTransaction();

            logger.info('Amazon order sync completed', {
                storeId,
                ...result,
                syncLogId: syncLog._id,
            });

            return result;
        } catch (error: any) {
            await session.abortTransaction();

            // Update sync status on error (outside transaction)
            const store = await AmazonStore.findById(storeId);
            if (store) {
                await store.updateSyncStatus('order', 'ERROR', { error: error.message });
                await AmazonOAuthService.recordError(storeId, error.message);
            }

            logger.error('Amazon order sync failed (transaction rolled back)', {
                storeId,
                error: error.message,
            });

            throw error;
        } finally {
            session.endSession();
        }
    }

    /**
     * Process a single Amazon order
     */
    private static async processOrder(
        amazonOrder: AmazonOrder,
        store: any,
        client: AmazonClient
    ): Promise<void> {
        logger.debug('Processing Amazon order', {
            storeId: store._id,
            orderId: amazonOrder.AmazonOrderId,
            status: amazonOrder.OrderStatus,
        });

        // Check if order exists
        const existingOrder = await Order.findOne({
            source: 'amazon',
            sourceId: amazonOrder.AmazonOrderId,
            companyId: store.companyId,
        });

        if (existingOrder) {
            // Update existing order
            await this.updateOrder(existingOrder, amazonOrder, store);
        } else {
            // Create new order
            await this.createOrder(amazonOrder, store, client);
        }
    }

    /**
     * Create a new order from Amazon data
     */
    private static async createOrder(
        amazonOrder: AmazonOrder,
        store: any,
        client: AmazonClient
    ): Promise<void> {
        // Fetch order items
        const itemsResponse = await client.getOrderItems(amazonOrder.AmazonOrderId);
        const orderItems = itemsResponse.OrderItems || [];

        // Map address
        const shippingAddress = amazonOrder.ShippingAddress || {};

        // Map order items
        const products = orderItems.map((item: AmazonOrderItem) => ({
            name: item.Title,
            sku: item.SellerSKU || item.ASIN,
            quantity: item.QuantityOrdered,
            price: item.ItemPrice ? parseFloat(item.ItemPrice.Amount) : 0,
            weight: 0, // Amazon doesn't provide weight in order items
        }));

        // Calculate totals
        const subtotal = orderItems.reduce((sum: number, item: AmazonOrderItem) => {
            return sum + (item.ItemPrice ? parseFloat(item.ItemPrice.Amount) : 0);
        }, 0);

        const tax = orderItems.reduce((sum: number, item: AmazonOrderItem) => {
            return sum + (item.ItemTax ? parseFloat(item.ItemTax.Amount) : 0);
        }, 0);

        const shipping = orderItems.reduce((sum: number, item: AmazonOrderItem) => {
            return sum + (item.ShippingPrice ? parseFloat(item.ShippingPrice.Amount) : 0);
        }, 0);

        const total = amazonOrder.OrderTotal ? parseFloat(amazonOrder.OrderTotal.Amount) : subtotal + tax + shipping;

        // Fetch default warehouse
        let warehouseId;
        try {
            const company = await Company.findById(store.companyId)
                .select('settings.defaultWarehouseId')
                .lean();

            if (company?.settings?.defaultWarehouseId) {
                warehouseId = new mongoose.Types.ObjectId(company.settings.defaultWarehouseId);
            }
        } catch (warehouseError) {
            logger.warn('Failed to assign default warehouse to Amazon order', {
                error: warehouseError,
                orderId: amazonOrder.AmazonOrderId,
            });
        }

        // Determine payment status and method from Amazon data
        const amazonPaymentStatus = this.mapAmazonPaymentStatus(amazonOrder.OrderStatus, amazonOrder.PaymentMethod);
        const amazonPaymentMethod = this.detectAmazonPaymentMethod(amazonOrder.PaymentMethod);
        const hasAddress = !!(shippingAddress.AddressLine1 || shippingAddress.City);

        // Create order
        await Order.create({
            orderNumber: amazonOrder.AmazonOrderId,
            companyId: store.companyId,
            warehouseId,
            customerInfo: {
                name: amazonOrder.BuyerInfo?.BuyerName || shippingAddress.Name || 'No customer',
                email: amazonOrder.BuyerInfo?.BuyerEmail || undefined,
                phone: shippingAddress.Phone || undefined,
                address: {
                    line1: shippingAddress.AddressLine1 || (hasAddress ? '' : 'No address provided'),
                    line2: [shippingAddress.AddressLine2, shippingAddress.AddressLine3]
                        .filter(Boolean)
                        .join(' ') || undefined,
                    city: shippingAddress.City || (hasAddress ? '' : 'Unknown'),
                    state: shippingAddress.StateOrRegion || (hasAddress ? '' : 'Unknown'),
                    country: shippingAddress.CountryCode || 'Unknown',
                    postalCode: shippingAddress.PostalCode || (hasAddress ? '' : '000000'),
                },
            },
            products,
            source: 'amazon',
            sourceId: amazonOrder.AmazonOrderId,
            externalOrderNumber: amazonOrder.SellerOrderId,
            amazonStoreId: store._id,
            amazonOrderId: amazonOrder.AmazonOrderId,
            fulfillmentType: amazonOrder.FulfillmentChannel === 'AFN' ? 'FBA' : 'MFN',
            paymentStatus: amazonPaymentStatus,
            paymentMethod: amazonPaymentMethod,
            currency: amazonOrder.OrderTotal?.CurrencyCode || 'INR',
            statusHistory: [
                {
                    status: this.mapAmazonStatus(amazonOrder.OrderStatus),
                    timestamp: new Date(amazonOrder.PurchaseDate),
                    comment: 'Order imported from Amazon',
                },
            ],
            currentStatus: this.mapAmazonStatus(amazonOrder.OrderStatus),
            totals: {
                subtotal,
                tax,
                shipping,
                discount: 0,
                total,
            },
        });

        // Invalidate order list cache so new orders appear immediately
        try {
            const cache = new CacheRepository('orders');
            await cache.invalidateTags([`company:${store.companyId}:orders`]);
        } catch (cacheError) {
            logger.warn('Failed to invalidate order cache after Amazon sync', { error: cacheError });
        }

        logger.info('Created order from Amazon', {
            storeId: store._id,
            amazonOrderId: amazonOrder.AmazonOrderId,
            status: amazonOrder.OrderStatus,
        });
    }

    /**
     * Update an existing order with Amazon data
     */
    private static async updateOrder(
        existingOrder: any,
        amazonOrder: AmazonOrder,
        store: any
    ): Promise<void> {
        const newStatus = this.mapAmazonStatus(amazonOrder.OrderStatus);

        // Only update if status has changed
        if (existingOrder.currentStatus !== newStatus) {
            existingOrder.statusHistory.push({
                status: newStatus,
                timestamp: new Date(),
                comment: `Status updated from Amazon: ${amazonOrder.OrderStatus}`,
            });
            existingOrder.currentStatus = newStatus;

            await existingOrder.save();

            // Invalidate order list cache so updates appear immediately
            try {
                const cache = new CacheRepository('orders');
                await cache.invalidateTags([`company:${store.companyId}:orders`]);
            } catch (cacheError) {
                logger.warn('Failed to invalidate order cache after Amazon update', { error: cacheError });
            }

            logger.info('Updated order from Amazon', {
                storeId: store._id,
                amazonOrderId: amazonOrder.AmazonOrderId,
                oldStatus: existingOrder.currentStatus,
                newStatus,
            });
        }
    }

    /**
     * Map Amazon order status to Shipcrowd status
     */
    private static mapAmazonStatus(amazonStatus: AmazonOrderStatus): ShipcrowdOrderStatus {
        const statusMap: Record<AmazonOrderStatus, ShipcrowdOrderStatus> = {
            Pending: 'pending',
            PendingAvailability: 'pending',
            InvoiceUnconfirmed: 'pending',
            Unshipped: 'confirmed',
            PartiallyShipped: 'processing',
            Shipped: 'shipped',
            Canceled: 'cancelled',
            Unfulfillable: 'cancelled',
        };

        return statusMap[amazonStatus] || 'pending';
    }

    /**
     * Map Amazon order status to payment status
     */
    private static mapAmazonPaymentStatus(
        orderStatus: AmazonOrderStatus,
        paymentMethod?: string
    ): 'pending' | 'paid' | 'failed' | 'refunded' {
        // Shipped/delivered means payment was collected
        if (['Shipped', 'PartiallyShipped'].includes(orderStatus)) return 'paid';
        // Unshipped with non-COD means prepaid (already paid)
        if (orderStatus === 'Unshipped' && paymentMethod !== 'COD') return 'paid';
        // Cancelled = pending (payment wasn't collected)
        if (['Canceled', 'Unfulfillable'].includes(orderStatus)) return 'pending';
        return 'pending';
    }

    /**
     * Detect Amazon payment method (COD vs Prepaid)
     */
    private static detectAmazonPaymentMethod(paymentMethod?: string): 'cod' | 'prepaid' {
        if (!paymentMethod) return 'prepaid';
        const method = paymentMethod.toLowerCase();
        if (method.includes('cod') || method.includes('cash')) return 'cod';
        return 'prepaid';
    }

    /**
     * Sync a single order by Amazon Order ID
     */
    static async syncOrder(storeId: string, amazonOrderId: string): Promise<void> {
        logger.info('Syncing single Amazon order', { storeId, amazonOrderId });

        const store = await AmazonStore.findById(storeId);

        if (!store) {
            throw new AppError('Amazon store not found', 'AMAZON_STORE_NOT_FOUND', 404);
        }

        const client = await AmazonOAuthService.createClientForStore(storeId);

        const orderResponse = await client.getOrder(amazonOrderId);

        if (!orderResponse) {
            throw new AppError('Amazon order not found', 'AMAZON_ORDER_NOT_FOUND', 404);
        }

        await this.processOrder(orderResponse, store, client);

        logger.info('Single Amazon order synced', { storeId, amazonOrderId });
    }
}
