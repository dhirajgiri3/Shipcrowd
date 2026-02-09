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
     * List Orders with Stats (Faceted Search)
     * 
     * Efficiently fetches:
     * 1. Paginated order list (filtered & sorted)
     * 2. Status counts (based on current filters, for tabs)
     * 3. Total count (for pagination)
     * 
     * All in a single DB round-trip.
     */
    async listOrdersWithStats(companyId: string | null, queryParams: any, pagination: { page: number; limit: number; sortBy?: string; sortOrder?: 'asc' | 'desc' }) {
        const { page, limit, sortBy = 'createdAt', sortOrder = 'desc' } = pagination;

        // 1. Build Match Stage (Base Filters)
        const matchStage: any = {
            isDeleted: false
        };

        if (companyId) {
            matchStage.companyId = new mongoose.Types.ObjectId(companyId);
        }

        // Text Search
        if (queryParams.search) {
            const searchRegex = { $regex: queryParams.search, $options: 'i' };
            matchStage.$or = [
                { orderNumber: searchRegex },
                { 'customerInfo.name': searchRegex },
                { 'customerInfo.phone': searchRegex },
                { 'products.name': searchRegex }
            ];
        }

        // Date Range (endDate as date-only YYYY-MM-DD is treated as end-of-day for inclusive range)
        if (queryParams.startDate || queryParams.endDate) {
            matchStage.createdAt = {};
            if (queryParams.startDate) matchStage.createdAt.$gte = new Date(queryParams.startDate);
            if (queryParams.endDate) {
                const endRaw = String(queryParams.endDate).trim();
                const endD = new Date(queryParams.endDate);
                if (/^\d{4}-\d{2}-\d{2}$/.test(endRaw)) {
                    endD.setUTCHours(23, 59, 59, 999);
                }
                matchStage.createdAt.$lte = endD;
            }
        }

        // Warehouse Filter
        if (queryParams.warehouse) {
            matchStage.warehouseId = new mongoose.Types.ObjectId(queryParams.warehouse);
        }

        // 2. Build Sort Stage
        // Map frontend sort keys to DB paths
        const sortMapping: Record<string, string> = {
            'orderNumber': 'orderNumber',
            'createdAt': 'createdAt',
            'customer': 'customerInfo.name',
            'amount': 'totals.total',
            'status': 'currentStatus',
            'items': 'products.length' // Approximate, or sum quantity
        };
        const dbSortKey = sortMapping[sortBy] || 'createdAt';
        const sortStage: any = { [dbSortKey]: sortOrder === 'asc' ? 1 : -1 };

        // 3. Status Filter (Only applies to the 'orders' facet, NOT the 'stats' facet)
        // We want stats to show counts for ALL statuses given the current search/date filters
        const statusMatch = queryParams.status && queryParams.status !== 'all'
            ? { currentStatus: queryParams.status }
            : {};

        // 4. Aggregation Pipeline
        const pipeline = [
            { $match: matchStage },
            {
                $facet: {
                    // Facet 1: The Paginated List
                    orders: [
                        { $match: statusMatch }, // Apply status filter only here
                        { $sort: sortStage },
                        { $skip: (page - 1) * limit },
                        { $limit: limit },
                        // Populate equivalent (using $lookup would be expensive, usually better to secondary fetch or simple lookup)
                        // For simplicity/performance in aggregation, we often stick to what's in the doc or do simple lookups.
                        // But Mongoose `lean()` + `populate()` is easier. 
                        // Since we are using aggregate, we must manual lookup if we need joined data.
                        // Order model has `warehouseId` ref.
                        {
                            $lookup: {
                                from: 'warehouses', // collection name
                                localField: 'warehouseId',
                                foreignField: '_id',
                                as: 'warehouse'
                            }
                        },
                        { $unwind: { path: '$warehouse', preserveNullAndEmptyArrays: true } },
                        // Project only needed fields if necessary, or keep all
                    ],
                    // Facet 2: Status Counts (for Tabs)
                    stats: [
                        { $group: { _id: '$currentStatus', count: { $sum: 1 } } }
                    ],
                    // Facet 3: Total Count (for Pagination of the list)
                    total: [
                        { $match: statusMatch },
                        { $count: 'count' }
                    ]
                }
            }
        ];

        // 5. Execute
        const [result] = await Order.aggregate(pipeline);

        // 6. Format Result
        const orders = result.orders.map((o: any) => ({
            ...o,
            warehouseId: o.warehouse, // mapping back to match populate structure roughly
            id: o._id
        }));

        const total = result.total[0]?.count || 0;

        const stats: Record<string, number> = {};
        result.stats.forEach((s: any) => {
            stats[s._id] = s.count;
        });

        // Ensure all statuses have a key
        const allStatuses = ['new', 'ready', 'shipped', 'delivered', 'rto', 'cancelled', 'pending'];
        allStatuses.forEach(s => {
            if (!stats[s]) stats[s] = 0;
        });

        return {
            orders,
            total,
            stats,
            page,
            pages: Math.ceil(total / limit)
        };
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
            riskInfo?: any;
            validationInfo?: any;
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
                riskInfo: payload.riskInfo,
                validationInfo: payload.validationInfo,
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
        isAdminOverride?: boolean; // Added for admin override
    }) {
        const { orderId, currentStatus, newStatus, currentVersion, userId, companyId, isAdminOverride } = args;

        // Static validation usage
        // specific admin logic: if admin override is true, bypass validation or use relaxed rules
        let isValidTransition = true;
        let validationError = '';

        if (!isAdminOverride) {
            const { valid } = validateStatusTransition(
                currentStatus,
                newStatus,
                ORDER_STATUS_TRANSITIONS
            );
            if (!valid) {
                isValidTransition = false;
                validationError = `Invalid status transition from '${currentStatus}' to '${newStatus}'`;
            }
        }

        if (!isValidTransition) {
            return {
                success: false,
                error: validationError
            };
        }

        const statusEntry: any = {
            status: newStatus,
            timestamp: new Date(),
            updatedBy: new mongoose.Types.ObjectId(userId),
        };

        if (isAdminOverride) {
            statusEntry.notes = 'Admin Override';
        }

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

        // Normalize keys (aliases)
        const normalizedRow = {
            customer_name: row.customer_name || row.customer,
            customer_phone: row.customer_phone || row.phone,
            address_line1: row.address_line1 || row.address,
            address_line2: row.address_line2,
            city: row.city,
            state: row.state,
            postal_code: row.postal_code || row.pincode,
            country: row.country,
            product_name: row.product_name || row.product,
            sku: row.sku,
            quantity: row.quantity,
            price: row.price,
            weight: row.weight,
            payment_method: row.payment_method || row.payment_mode || 'prepaid',
            payment_status: row.payment_status,
            current_status: row.current_status || row.status || row.order_status,
            status: row.status,
            order_status: row.order_status
        };

        try {
            const requiredFields = ['customer_name', 'customer_phone', 'address_line1', 'city', 'state', 'postal_code', 'product_name', 'quantity', 'price'];
            const missingFields = requiredFields.filter(f => !normalizedRow[f as keyof typeof normalizedRow]);

            if (missingFields.length > 0) {
                return {
                    success: false,
                    error: `Missing fields: ${missingFields.join(', ')}`
                };
            }

            // Validate formats
            if (!/^\d{10}$/.test(String(normalizedRow.customer_phone))) {
                return { success: false, error: 'Invalid phone number' };
            }
            if (!/^\d{6}$/.test(String(normalizedRow.postal_code))) {
                return { success: false, error: 'Invalid postal code' };
            }

            const orderNumber = await OrderService.getUniqueOrderNumber();
            if (!orderNumber) {
                return {
                    success: false,
                    error: 'Failed to generate order number'
                };
            }

            const quantity = parseInt(String(normalizedRow.quantity), 10);
            const price = parseFloat(String(normalizedRow.price));
            const subtotal = quantity * price;

            // Validate Status
            let currentStatus = 'pending';
            if (normalizedRow.current_status || normalizedRow.status || normalizedRow.order_status) {
                const statusInput = (normalizedRow.current_status || normalizedRow.status || normalizedRow.order_status).toLowerCase();
                const allowedStatuses = ['new', 'pending', 'ready', 'shipped', 'delivered', 'cancelled', 'rto'];
                if (allowedStatuses.includes(statusInput)) {
                    currentStatus = statusInput;
                }
            }

            const order = new Order({
                orderNumber,
                companyId,
                customerInfo: {
                    name: normalizedRow.customer_name,
                    email: row.customer_email || row.email || undefined,
                    phone: normalizedRow.customer_phone,
                    address: {
                        line1: normalizedRow.address_line1,
                        line2: normalizedRow.address_line2 || '',
                        city: normalizedRow.city,
                        state: normalizedRow.state,
                        country: normalizedRow.country || 'India',
                        postalCode: normalizedRow.postal_code,
                    },
                },
                products: [{
                    name: normalizedRow.product_name,
                    sku: normalizedRow.sku || '',
                    quantity,
                    price,
                    weight: normalizedRow.weight ? parseFloat(String(normalizedRow.weight)) : undefined,
                }],
                paymentMethod: normalizedRow.payment_method === 'cod' ? 'cod' : 'prepaid',
                paymentStatus: normalizedRow.payment_status || (normalizedRow.payment_method === 'cod' ? 'pending' : 'paid'),
                source: 'manual',
                currentStatus,
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
        let transactionCommitted = false;

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
                throw new ValidationError('No orders imported', ErrorCode.VAL_INVALID_INPUT);
            }

            await session.commitTransaction();
            transactionCommitted = true;

            // Invalidate ALL list caches for this company after bulk import
            try {
                await this.invalidateTags([
                    this.companyTag(companyId.toString(), 'orders')
                ]);
            } catch (err: any) {
                logger.warn('Failed to invalidate cache after bulk import', { error: err.message });
            }

            const result = { created, errors };
            return result;
        } catch (error: any) {
            logger.error('Bulk Import Transaction Error', { error: error.message, stack: error.stack });
            if (session.inTransaction()) {
                await session.abortTransaction();
            }
            throw error;
        } finally {
            session.endSession();
        }
    }

    /**
     * Clone an existing order with optional modifications
     * Useful for: Quick order duplication, correction of wrong orders, reordering
     */
    async cloneOrder(args: {
        orderId: string;
        companyId: string;
        modifications?: {
            customerInfo?: any;
            products?: any[];
            paymentMethod?: string;
            warehouseId?: string;
            notes?: string;
        };
    }) {
        const { orderId, companyId, modifications } = args;
        const session = await mongoose.startSession();

        try {
            session.startTransaction();

            // Fetch original order
            const originalOrder = await Order.findOne({
                _id: orderId,
                companyId: new mongoose.Types.ObjectId(companyId)
            }).lean();

            if (!originalOrder) {
                throw new AppError('Order not found or access denied', ErrorCode.RES_NOT_FOUND, 404);
            }

            // Generate new order number
            const newOrderNumber = await OrderService.getUniqueOrderNumber();
            if (!newOrderNumber) {
                throw new AppError('Failed to generate unique order number', ErrorCode.SYS_INTERNAL_ERROR, 500);
            }

            // Merge original order data with modifications
            const customerInfo = modifications?.customerInfo || originalOrder.customerInfo;
            const products = modifications?.products || originalOrder.products;
            const paymentMethod = modifications?.paymentMethod || originalOrder.paymentMethod;
            const warehouseId = modifications?.warehouseId || originalOrder.warehouseId;
            const notes = modifications?.notes || `Cloned from ${originalOrder.orderNumber}${modifications?.notes ? ': ' + modifications.notes : ''}`;

            // Recalculate totals based on products
            const totals = await OrderService.calculateTotals(products);

            // Create cloned order
            const clonedOrder = new Order({
                orderNumber: newOrderNumber,
                companyId: new mongoose.Types.ObjectId(companyId),
                customerInfo,
                products,
                paymentMethod,
                paymentStatus: paymentMethod === 'cod' ? 'pending' : 'paid',
                source: 'cloned',
                warehouseId: warehouseId ? new mongoose.Types.ObjectId(warehouseId as string) : undefined,
                currentStatus: 'pending',
                totals,
                notes,
                tags: [...(originalOrder.tags || []), 'cloned'],
                shippingDetails: { shippingCost: 0 },
            });

            await clonedOrder.save({ session });
            await session.commitTransaction();

            // Emit event
            const eventPayload: OrderEventPayload = {
                orderId: (clonedOrder._id as any).toString(),
                companyId: companyId,
                orderNumber: clonedOrder.orderNumber,
            };
            eventBus.emitEvent('order.created', eventPayload);

            // Invalidate cache
            await this.invalidateTags([
                this.companyTag(companyId, 'orders')
            ]);

            return {
                success: true,
                clonedOrder,
                originalOrderNumber: originalOrder.orderNumber
            };
        } catch (error) {
            await session.abortTransaction();
            logger.error('Error cloning order (transaction rolled back):', error);
            throw error;
        } finally {
            session.endSession();
        }
    }

    /**
     * Split a single order into multiple orders
     * Useful for: Partial shipments, inventory constraints, different warehouse fulfillment
     */
    async splitOrder(args: {
        orderId: string;
        companyId: string;
        splits: Array<{
            products: Array<{ sku?: string; name: string; quantity: number }>;
            warehouseId?: string;
            notes?: string;
        }>;
    }) {
        const { orderId, companyId, splits } = args;
        const session = await mongoose.startSession();

        try {
            session.startTransaction();

            // Fetch original order
            const originalOrder = await Order.findOne({
                _id: orderId,
                companyId: new mongoose.Types.ObjectId(companyId)
            });

            if (!originalOrder) {
                throw new AppError('Order not found or access denied', ErrorCode.RES_NOT_FOUND, 404);
            }

            // Validate order can be split (must be pending)
            if (originalOrder.currentStatus !== 'pending') {
                throw new ValidationError(
                    `Cannot split order with status '${originalOrder.currentStatus}'. Only pending orders can be split.`,
                    ErrorCode.VAL_INVALID_INPUT
                );
            }

            // Validate splits don't exceed original quantities
            const originalProductMap = new Map(
                originalOrder.products.map(p => [p.sku || p.name, p.quantity])
            );

            const splitProductTotals = new Map<string, number>();
            for (const split of splits) {
                for (const product of split.products) {
                    const key = product.sku || product.name;
                    const current = splitProductTotals.get(key) || 0;
                    splitProductTotals.set(key, current + product.quantity);
                }
            }

            // Check if split quantities match original
            for (const [key, splitTotal] of splitProductTotals.entries()) {
                const originalQty = originalProductMap.get(key);
                if (!originalQty) {
                    throw new ValidationError(
                        `Product '${key}' not found in original order`,
                        ErrorCode.VAL_INVALID_INPUT
                    );
                }
                if (splitTotal > originalQty) {
                    throw new ValidationError(
                        `Split total for '${key}' (${splitTotal}) exceeds original quantity (${originalQty})`,
                        ErrorCode.VAL_INVALID_INPUT
                    );
                }
            }

            // Create split orders
            const splitOrders: any[] = [];
            for (let i = 0; i < splits.length; i++) {
                const split = splits[i];
                const newOrderNumber = await OrderService.getUniqueOrderNumber();
                if (!newOrderNumber) {
                    throw new AppError('Failed to generate unique order number', ErrorCode.SYS_INTERNAL_ERROR, 500);
                }

                // Map split products to full product data
                const splitProducts = split.products.map(sp => {
                    const originalProduct = originalOrder.products.find(
                        op => (op.sku || op.name) === (sp.sku || sp.name)
                    );
                    if (!originalProduct) {
                        throw new ValidationError(
                            `Product '${sp.sku || sp.name}' not found in original order`,
                            ErrorCode.VAL_INVALID_INPUT
                        );
                    }
                    return {
                        name: sp.name,
                        sku: sp.sku || originalProduct.sku,
                        quantity: sp.quantity,
                        price: originalProduct.price,
                        weight: originalProduct.weight,
                    };
                });

                // Calculate totals for this split
                const totals = await OrderService.calculateTotals(splitProducts);

                const splitOrder = new Order({
                    orderNumber: newOrderNumber,
                    companyId: new mongoose.Types.ObjectId(companyId),
                    customerInfo: originalOrder.customerInfo,
                    products: splitProducts,
                    paymentMethod: originalOrder.paymentMethod,
                    paymentStatus: originalOrder.paymentStatus,
                    source: 'split',
                    warehouseId: split.warehouseId
                        ? new mongoose.Types.ObjectId(split.warehouseId)
                        : originalOrder.warehouseId,
                    currentStatus: 'pending',
                    totals,
                    notes: `Split ${i + 1}/${splits.length} from ${originalOrder.orderNumber}${split.notes ? ': ' + split.notes : ''}`,
                    tags: [...(originalOrder.tags || []), 'split'],
                    shippingDetails: { shippingCost: 0 },
                });

                await splitOrder.save({ session });
                splitOrders.push(splitOrder);

                // Emit event for each split order
                const eventPayload: OrderEventPayload = {
                    orderId: (splitOrder._id as any).toString(),
                    companyId: companyId,
                    orderNumber: splitOrder.orderNumber,
                };
                eventBus.emitEvent('order.created', eventPayload);
            }

            // Cancel original order
            originalOrder.currentStatus = 'cancelled';
            originalOrder.statusHistory.push({
                status: 'cancelled',
                timestamp: new Date(),
                notes: `Order split into ${splits.length} orders: ${splitOrders.map(o => o.orderNumber).join(', ')}`
            } as any);
            await originalOrder.save({ session });

            await session.commitTransaction();

            // Invalidate cache
            await this.invalidateTags([
                this.companyTag(companyId, 'orders')
            ]);

            return {
                success: true,
                originalOrderNumber: originalOrder.orderNumber,
                splitOrders: splitOrders.map(o => ({
                    orderNumber: o.orderNumber,
                    id: o._id,
                    products: o.products,
                    totals: o.totals
                }))
            };
        } catch (error) {
            await session.abortTransaction();
            logger.error('Error splitting order (transaction rolled back):', error);
            throw error;
        } finally {
            session.endSession();
        }
    }

    /**
     * Merge multiple orders into a single order
     * Useful for: Combining orders for same customer, bulk shipping optimization
     */
    async mergeOrders(args: {
        orderIds: string[];
        companyId: string;
        mergeOptions?: {
            warehouseId?: string;
            paymentMethod?: string;
            notes?: string;
        };
    }) {
        const { orderIds, companyId, mergeOptions } = args;
        const session = await mongoose.startSession();

        try {
            session.startTransaction();

            // Validate minimum 2 orders
            if (orderIds.length < 2) {
                throw new ValidationError(
                    'At least 2 orders are required for merging',
                    ErrorCode.VAL_INVALID_INPUT
                );
            }

            // Fetch all orders
            const orders = await Order.find({
                _id: { $in: orderIds.map(id => new mongoose.Types.ObjectId(id)) },
                companyId: new mongoose.Types.ObjectId(companyId)
            });

            if (orders.length !== orderIds.length) {
                throw new AppError('Some orders not found or access denied', ErrorCode.RES_NOT_FOUND, 404);
            }

            // Validate all orders are pending
            const nonPendingOrders = orders.filter(o => o.currentStatus !== 'pending');
            if (nonPendingOrders.length > 0) {
                throw new ValidationError(
                    `Cannot merge orders. These orders are not pending: ${nonPendingOrders.map(o => o.orderNumber).join(', ')}`,
                    ErrorCode.VAL_INVALID_INPUT
                );
            }

            // Validate all orders have same customer (by phone or email)
            const firstCustomer = orders[0].customerInfo;
            const mismatchedOrders = orders.filter(o =>
                o.customerInfo.phone !== firstCustomer.phone &&
                o.customerInfo.email !== firstCustomer.email
            );
            if (mismatchedOrders.length > 0) {
                throw new ValidationError(
                    'Cannot merge orders from different customers',
                    ErrorCode.VAL_INVALID_INPUT
                );
            }

            // Merge products from all orders
            const allProducts: any[] = [];
            for (const order of orders) {
                allProducts.push(...order.products);
            }

            // Consolidate duplicate products (same SKU)
            const productMap = new Map<string, any>();
            for (const product of allProducts) {
                const key = product.sku || product.name;
                if (productMap.has(key)) {
                    const existing = productMap.get(key);
                    existing.quantity += product.quantity;
                } else {
                    productMap.set(key, { ...product });
                }
            }

            const mergedProducts = Array.from(productMap.values());

            // Calculate totals
            const totals = await OrderService.calculateTotals(mergedProducts);

            // Determine payment method (prefer COD if any order is COD)
            const paymentMethod = mergeOptions?.paymentMethod ||
                (orders.some(o => o.paymentMethod === 'cod') ? 'cod' : 'prepaid');

            // Generate new order number
            const newOrderNumber = await OrderService.getUniqueOrderNumber();
            if (!newOrderNumber) {
                throw new AppError('Failed to generate unique order number', ErrorCode.SYS_INTERNAL_ERROR, 500);
            }

            // Create merged order
            const mergedOrder = new Order({
                orderNumber: newOrderNumber,
                companyId: new mongoose.Types.ObjectId(companyId),
                customerInfo: firstCustomer,
                products: mergedProducts,
                paymentMethod,
                paymentStatus: paymentMethod === 'cod' ? 'pending' : 'paid',
                source: 'merged',
                warehouseId: mergeOptions?.warehouseId
                    ? new mongoose.Types.ObjectId(mergeOptions.warehouseId)
                    : orders[0].warehouseId,
                currentStatus: 'pending',
                totals,
                notes: `Merged from orders: ${orders.map(o => o.orderNumber).join(', ')}${mergeOptions?.notes ? '. ' + mergeOptions.notes : ''}`,
                tags: ['merged'],
                shippingDetails: { shippingCost: 0 },
            });

            await mergedOrder.save({ session });

            // Cancel all original orders
            for (const order of orders) {
                order.currentStatus = 'cancelled';
                order.statusHistory.push({
                    status: 'cancelled',
                    timestamp: new Date(),
                    notes: `Merged into order ${mergedOrder.orderNumber}`
                } as any);
                await order.save({ session });
            }

            await session.commitTransaction();

            // Emit event
            const eventPayload: OrderEventPayload = {
                orderId: (mergedOrder._id as any).toString(),
                companyId: companyId,
                orderNumber: mergedOrder.orderNumber,
            };
            eventBus.emitEvent('order.created', eventPayload);

            // Invalidate cache
            await this.invalidateTags([
                this.companyTag(companyId, 'orders')
            ]);

            return {
                success: true,
                mergedOrder: {
                    orderNumber: mergedOrder.orderNumber,
                    id: mergedOrder._id,
                    products: mergedOrder.products,
                    totals: mergedOrder.totals
                },
                cancelledOrders: orders.map(o => o.orderNumber)
            };
        } catch (error) {
            await session.abortTransaction();
            logger.error('Error merging orders (transaction rolled back):', error);
            throw error;
        } finally {
            session.endSession();
        }
    }
}
