import mongoose from 'mongoose';
import { Order } from '../../../../infrastructure/database/mongoose/models';
import { generateOrderNumber, validateStatusTransition } from '../../../../shared/helpers/controller.helpers';
import { ORDER_STATUS_TRANSITIONS } from '../../../../shared/validation/schemas';
import eventBus, { OrderEventPayload } from '../../../../shared/events/eventBus';
import logger from '../../../../shared/logger/winston.logger';
import { AuthenticationError, ValidationError, DatabaseError, AppError } from '../../../../shared/errors/app.error';
import { ErrorCode } from '../../../../shared/errors/errorCodes';
import { DynamicPricingService } from '../pricing/dynamic-pricing.service';
import { CachedService } from '../../base/cached.service';

/**
 * OrderService - Business logic for order management
 * 
 * Includes caching via CachedService (Tier 3 Strategy)
 */
export class OrderService extends CachedService {
    protected serviceName = 'order';

    // Singleton pattern helper
    private static instance: OrderService;
    static getInstance(): OrderService {
        if (!OrderService.instance) {
            OrderService.instance = new OrderService();
        }
        return OrderService.instance;
    }

    /**
     * Calculate order totals from products
     */
    static calculateTotalsLegacy(products: Array<{ price: number; quantity: number }>) {
        const subtotal = products.reduce((sum, p) => sum + p.price * p.quantity, 0);
        return { subtotal, tax: 0, shipping: 0, discount: 0, total: subtotal };
    }

    /**
     * Calculate order totals with dynamic pricing
     */
    static async calculateTotals(
        products: Array<{ price: number; quantity: number }>,
        shipmentDetails?: {
            companyId?: string;
            fromPincode?: string;
            toPincode?: string;
            paymentMode?: 'cod' | 'prepaid';
            weight?: number;
        }
    ) {
        // [Existing logic unchanged for brevity, but crucial to keep]
        const useDynamicPricing = process.env.USE_DYNAMIC_PRICING === 'true';

        if (!useDynamicPricing || !shipmentDetails?.fromPincode || !shipmentDetails?.toPincode) {
            return this.calculateTotalsLegacy(products);
        }

        try {
            const pricingService = new DynamicPricingService();
            const subtotal = products.reduce((sum, p) => sum + p.price * p.quantity, 0);

            const pricing = await pricingService.calculatePricing({
                companyId: shipmentDetails.companyId || '',
                fromPincode: shipmentDetails.fromPincode,
                toPincode: shipmentDetails.toPincode,
                weight: shipmentDetails.weight || 0.5,
                paymentMode: shipmentDetails.paymentMode || 'prepaid',
                orderValue: subtotal,
                carrier: 'velocity',
                serviceType: 'standard',
            });

            const total = subtotal + pricing.shipping + pricing.codCharge + pricing.tax.total;

            return {
                subtotal,
                shipping: pricing.shipping,
                tax: pricing.tax.total,
                codCharge: pricing.codCharge,
                discount: 0,
                total,
                breakdown: {
                    cgst: pricing.tax.cgst,
                    sgst: pricing.tax.sgst,
                    igst: pricing.tax.igst,
                    zone: pricing.metadata.zone,
                    rateCardUsed: true,
                },
            };
        } catch (error) {
            console.error('[OrderService] Dynamic pricing failed, falling back to legacy:', error);
            return this.calculateTotalsLegacy(products);
        }
    }

    /**
     * Generate a unique order number
     */
    static async getUniqueOrderNumber(maxAttempts = 10): Promise<string | null> {
        for (let i = 0; i < maxAttempts; i++) {
            const orderNumber = generateOrderNumber();
            const exists = await Order.exists({ orderNumber });
            if (!exists) return orderNumber;
        }
        return null;
    }

    /**
     * List Orders with Caching (Tier 3)
     */
    async listOrders(companyId: string, queryParams: any, pagination: { page: number; limit: number }) {
        // 1. Generate Cache Key based on query params
        const cacheKey = this.listCacheKey(companyId, { ...queryParams, ...pagination });

        // 2. Define Tags for invalidation
        // Tag 1: company:{id}:orders (Invalidate all lists for this company)
        const tags = [this.companyTag(companyId, 'orders')];

        // 3. Fetch (Cache Hit/Miss)
        return this.cache.getOrSet(
            cacheKey,
            async () => {
                // Real DB Query
                const skip = (pagination.page - 1) * pagination.limit;
                const filter: any = { companyId: new mongoose.Types.ObjectId(companyId) };

                // Apply filters (simplified for example)
                if (queryParams.status && queryParams.status !== 'all') {
                    filter.currentStatus = queryParams.status;
                }

                const [orders, total] = await Promise.all([
                    Order.find(filter)
                        .sort({ createdAt: -1 })
                        .skip(skip)
                        .limit(pagination.limit)
                        .lean(),
                    Order.countDocuments(filter)
                ]);

                return { orders, total, page: pagination.page, pages: Math.ceil(total / pagination.limit) };
            },
            {
                ttl: 300, // 5 minutes list caching
                tags: tags
            }
        );
    }

    /**
     * Create a new order (Invalidates List Cache)
     */
    async createOrder(args: {
        companyId: mongoose.Types.ObjectId;
        userId: string;
        payload: {
            customerInfo: any;
            products: Array<{ name: string; sku?: string; quantity: number; price: number; weight?: number }>;
            paymentMethod?: string;
            warehouseId?: string;
            notes?: string;
            tags?: string[];
            salesRepId?: string;
        };
    }) {
        const session = await mongoose.startSession();

        try {
            session.startTransaction();

            const { companyId, payload } = args;

            const orderNumber = await OrderService.getUniqueOrderNumber();
            if (!orderNumber) {
                throw new AppError('Failed to generate unique order number', ErrorCode.SYS_INTERNAL_ERROR, 500);
            }

            const totals = await OrderService.calculateTotals(payload.products); // Using static call properly

            const order = new Order({
                orderNumber,
                companyId,
                customerInfo: payload.customerInfo,
                products: payload.products,
                paymentMethod: payload.paymentMethod || 'prepaid',
                paymentStatus: payload.paymentMethod === 'cod' ? 'pending' : 'paid',
                source: 'manual',
                warehouseId: payload.warehouseId ? new mongoose.Types.ObjectId(payload.warehouseId) : undefined,
                currentStatus: 'pending',
                totals,
                notes: payload.notes,
                tags: payload.tags,
                shippingDetails: { shippingCost: 0 },
                salesRepresentative: payload.salesRepId ? new mongoose.Types.ObjectId(payload.salesRepId) : undefined,
            });

            await order.save({ session });

            await session.commitTransaction();

            // Emit event
            const eventPayload: OrderEventPayload = {
                orderId: (order._id as any).toString(),
                companyId: companyId.toString(),
                orderNumber: order.orderNumber,
                salesRepId: payload.salesRepId,
            };
            eventBus.emitEvent('order.created', eventPayload);

            // CACHE INVALIDATION (The "Magic")
            // Invalidate ALL order lists for this company so the new order appears immediately
            await this.invalidateTags([
                this.companyTag(companyId.toString(), 'orders')
            ]);

            return order;
        } catch (error) {
            await session.abortTransaction();
            logger.error('Error creating order (transaction rolled back):', error);
            throw error;
        } finally {
            session.endSession();
        }
    }

    /**
     * Update order status (Invalidates List Cache + Detail Cache)
     */
    async updateOrderStatus(args: {
        orderId: string;
        currentStatus: string;
        newStatus: string;
        currentVersion: number;
        userId: string;
        companyId: string; // Added for cache tagging
    }) {
        const { orderId, currentStatus, newStatus, currentVersion, userId, companyId } = args;

        // Static validation usage
        const { valid } = validateStatusTransition(
            currentStatus,
            newStatus,
            ORDER_STATUS_TRANSITIONS
        );

        if (!valid) {
            return {
                success: false,
                error: `Invalid status transition from '${currentStatus}' to '${newStatus}'`
            };
        }

        const statusEntry = {
            status: newStatus,
            timestamp: new Date(),
            updatedBy: new mongoose.Types.ObjectId(userId),
        };

        const updatedOrder = await Order.findOneAndUpdate(
            {
                _id: orderId,
                __v: currentVersion
            },
            {
                $set: { currentStatus: newStatus },
                $push: { statusHistory: statusEntry },
                $inc: { __v: 1 }
            },
            { new: true }
        );

        if (!updatedOrder) {
            return {
                success: false,
                error: 'Order was updated by another process. Please retry.',
                code: 'CONCURRENT_MODIFICATION'
            };
        }

        // AUTO INVALIDATION
        // 1. Invalidate lists (since status changed, filters might change)
        await this.invalidateTags([
            this.companyTag(companyId, 'orders')
        ]);

        // 2. Invalidate detail cache (if we had set it)
        await this.cache.delete(`order:${orderId}`);

        return {
            success: true,
            order: updatedOrder
        };
    }

    /**
     * Validate if an order can be deleted based on its status
     */
    canDeleteOrder(currentStatus: string): { canDelete: boolean; reason?: string } {
        const nonDeletableStatuses = ['shipped', 'delivered'];
        if (nonDeletableStatuses.includes(currentStatus)) {
            return {
                canDelete: false,
                reason: `Cannot delete order with status '${currentStatus}'`
            };
        }
        return { canDelete: true };
    }

    /**
     * Process a single CSV row into an order
     */
    async processBulkOrderRow(args: {
        row: any;
        rowIndex: number;
        companyId: mongoose.Types.ObjectId;
        session: mongoose.ClientSession;
    }): Promise<{ success: boolean; order?: any; error?: string }> {
        const { row, rowIndex, companyId, session } = args;

        try {
            const requiredFields = ['customer_name', 'customer_phone', 'address_line1', 'city', 'state', 'postal_code', 'product_name', 'quantity', 'price'];
            const missingFields = requiredFields.filter(f => !row[f]);

            if (missingFields.length > 0) {
                return {
                    success: false,
                    error: `Missing fields: ${missingFields.join(', ')}`
                };
            }

            const orderNumber = await OrderService.getUniqueOrderNumber();
            if (!orderNumber) {
                return {
                    success: false,
                    error: 'Failed to generate order number'
                };
            }

            const quantity = parseInt(row.quantity, 10);
            const price = parseFloat(row.price);
            const subtotal = quantity * price;

            const order = new Order({
                orderNumber,
                companyId,
                customerInfo: {
                    name: row.customer_name,
                    email: row.customer_email || undefined,
                    phone: row.customer_phone,
                    address: {
                        line1: row.address_line1,
                        line2: row.address_line2 || '',
                        city: row.city,
                        state: row.state,
                        country: row.country || 'India',
                        postalCode: row.postal_code,
                    },
                },
                products: [{
                    name: row.product_name,
                    sku: row.sku || '',
                    quantity,
                    price,
                    weight: row.weight ? parseFloat(row.weight) : undefined,
                }],
                paymentMethod: row.payment_method === 'cod' ? 'cod' : 'prepaid',
                paymentStatus: row.payment_method === 'cod' ? 'pending' : 'paid',
                source: 'manual',
                currentStatus: 'pending',
                totals: { subtotal, tax: 0, shipping: 0, discount: 0, total: subtotal },
                shippingDetails: { shippingCost: 0 },
            });

            await order.save({ session });

            return {
                success: true,
                order: { orderNumber, id: order._id }
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Process multiple CSV rows in a transaction
     */
    async bulkImportOrders(args: {
        rows: any[];
        companyId: mongoose.Types.ObjectId;
    }): Promise<{
        created: Array<{ orderNumber: string; id: any }>;
        errors: Array<{ row: number; error: string; data?: any }>;
    }> {
        const { rows, companyId } = args;
        const created: Array<{ orderNumber: string; id: any }> = [];
        const errors: Array<{ row: number; error: string; data?: any }> = [];

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            for (let i = 0; i < rows.length; i++) {
                const result = await this.processBulkOrderRow({
                    row: rows[i],
                    rowIndex: i,
                    companyId,
                    session
                });

                if (result.success && result.order) {
                    created.push(result.order);
                } else {
                    errors.push({
                        row: i + 1,
                        error: result.error || 'Unknown error'
                    });
                }
            }

            if (created.length === 0 && errors.length > 0) {
                await session.abortTransaction();
                throw new ValidationError('No orders imported', ErrorCode.VAL_INVALID_INPUT);
            }

            await session.commitTransaction();

            // Invalidate ALL list caches for this company after bulk import
            await this.invalidateTags([
                this.companyTag(companyId.toString(), 'orders')
            ]);

            return { created, errors };
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }
}
