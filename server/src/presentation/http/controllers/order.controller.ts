import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import Order from '../../../infrastructure/database/mongoose/models/Order';
import { AuthRequest } from '../middleware/auth';
import logger from '../../../shared/logger/winston.logger';
import { createAuditLog } from '../middleware/auditLog';
import mongoose from 'mongoose';
import csv from 'csv-parser';
import { Readable } from 'stream';
import {
    guardChecks,
    validateObjectId,
    parsePagination,
    buildPaginationResponse,
    generateOrderNumber,
    validateStatusTransition,
} from '../../../shared/helpers/controller.helpers';
import {
    createOrderSchema,
    updateOrderSchema,
    ORDER_STATUS_TRANSITIONS,
} from '../../../shared/validation/schemas';

/**
 * Calculate order totals from products
 */
const calculateTotals = (products: Array<{ price: number; quantity: number }>) => {
    const subtotal = products.reduce((sum, p) => sum + p.price * p.quantity, 0);
    return { subtotal, tax: 0, shipping: 0, discount: 0, total: subtotal };
};

/**
 * Generate unique order number with collision retry
 */
const getUniqueOrderNumber = async (maxAttempts = 10): Promise<string | null> => {
    for (let i = 0; i < maxAttempts; i++) {
        const orderNumber = generateOrderNumber();
        const exists = await Order.exists({ orderNumber });
        if (!exists) return orderNumber;
    }
    return null;
};

/**
 * Create a new order
 * @route POST /api/v1/orders
 */
export const createOrder = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const auth = guardChecks(req, res);
        if (!auth) return;

        const data = createOrderSchema.parse(req.body);
        const orderNumber = await getUniqueOrderNumber();

        if (!orderNumber) {
            res.status(500).json({ message: 'Failed to generate unique order number' });
            return;
        }

        const totals = calculateTotals(data.products);

        const order = new Order({
            orderNumber,
            companyId: auth.companyId,
            customerInfo: data.customerInfo,
            products: data.products,
            paymentMethod: data.paymentMethod || 'prepaid',
            paymentStatus: data.paymentMethod === 'cod' ? 'pending' : 'paid',
            source: 'manual',
            warehouseId: data.warehouseId ? new mongoose.Types.ObjectId(data.warehouseId) : undefined,
            currentStatus: 'pending',
            totals,
            notes: data.notes,
            tags: data.tags,
            shippingDetails: { shippingCost: 0 },
        });

        await order.save();
        await createAuditLog(auth.userId, auth.companyId, 'create', 'order', String(order._id), { orderNumber }, req);

        res.status(201).json({ message: 'Order created successfully', order });
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ message: 'Validation error', errors: error.errors });
            return;
        }
        logger.error('Error creating order:', error);
        next(error);
    }
};

/**
 * Get all orders for the current user's company
 * @route GET /api/v1/orders
 */
export const getOrders = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const auth = guardChecks(req, res);
        if (!auth) return;

        const { page, limit, skip } = parsePagination(req.query as any);

        // Build filter
        const filter: Record<string, any> = {
            companyId: auth.companyId,
            isDeleted: false,
        };

        // Apply filters
        if (req.query.status) filter.currentStatus = req.query.status;
        if (req.query.phone) filter['customerInfo.phone'] = { $regex: req.query.phone, $options: 'i' };
        if (req.query.warehouse) filter.warehouseId = new mongoose.Types.ObjectId(req.query.warehouse as string);

        // Date range
        if (req.query.startDate || req.query.endDate) {
            filter.createdAt = {};
            if (req.query.startDate) filter.createdAt.$gte = new Date(req.query.startDate as string);
            if (req.query.endDate) filter.createdAt.$lte = new Date(req.query.endDate as string);
        }

        // Search
        if (req.query.search) {
            const searchRegex = { $regex: req.query.search, $options: 'i' };
            filter.$or = [
                { orderNumber: searchRegex },
                { 'customerInfo.name': searchRegex },
                { 'customerInfo.phone': searchRegex },
            ];
        }

        const [orders, total] = await Promise.all([
            Order.find(filter)
                .populate('warehouseId', 'name address')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Order.countDocuments(filter),
        ]);

        res.json({
            orders,
            pagination: buildPaginationResponse(total, page, limit),
        });
    } catch (error) {
        logger.error('Error fetching orders:', error);
        next(error);
    }
};

/**
 * Get a single order by ID
 * @route GET /api/v1/orders/:orderId
 */
export const getOrderById = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const auth = guardChecks(req, res);
        if (!auth) return;

        const { orderId } = req.params;
        if (!validateObjectId(orderId, res, 'order')) return;

        const order = await Order.findOne({
            _id: orderId,
            companyId: auth.companyId,
            isDeleted: false,
        }).populate('warehouseId', 'name address');

        if (!order) {
            res.status(404).json({ message: 'Order not found' });
            return;
        }

        res.json({ order });
    } catch (error) {
        logger.error('Error fetching order:', error);
        next(error);
    }
};

/**
 * Update an order
 * @route PATCH /api/v1/orders/:orderId
 */
export const updateOrder = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const auth = guardChecks(req, res);
        if (!auth) return;

        const { orderId } = req.params;
        if (!validateObjectId(orderId, res, 'order')) return;

        const data = updateOrderSchema.parse(req.body);

        const order = await Order.findOne({
            _id: orderId,
            companyId: auth.companyId,
            isDeleted: false,
        });

        if (!order) {
            res.status(404).json({ message: 'Order not found' });
            return;
        }

        // Handle status transition
        if (data.currentStatus && data.currentStatus !== order.currentStatus) {
            const { valid, allowedTransitions } = validateStatusTransition(
                order.currentStatus,
                data.currentStatus,
                ORDER_STATUS_TRANSITIONS
            );

            if (!valid) {
                res.status(400).json({
                    message: `Invalid status transition from '${order.currentStatus}' to '${data.currentStatus}'`,
                    allowedTransitions,
                });
                return;
            }

            order.statusHistory.push({
                status: data.currentStatus,
                timestamp: new Date(),
                updatedBy: new mongoose.Types.ObjectId(auth.userId),
            });
            order.currentStatus = data.currentStatus;
        }

        // Update fields
        if (data.customerInfo) {
            order.customerInfo = { ...order.customerInfo, ...data.customerInfo } as any;
        }
        if (data.products) {
            order.products = data.products;
            const totals = calculateTotals(data.products);
            order.totals = { ...order.totals, ...totals };
        }
        if (data.paymentStatus) order.paymentStatus = data.paymentStatus;
        if (data.paymentMethod) order.paymentMethod = data.paymentMethod;
        if (data.notes !== undefined) order.notes = data.notes;
        if (data.tags) order.tags = data.tags;

        await order.save();
        await createAuditLog(auth.userId, auth.companyId, 'update', 'order', orderId, { changes: Object.keys(data) }, req);

        res.json({ message: 'Order updated successfully', order });
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ message: 'Validation error', errors: error.errors });
            return;
        }
        logger.error('Error updating order:', error);
        next(error);
    }
};

/**
 * Soft delete an order
 * @route DELETE /api/v1/orders/:orderId
 */
export const deleteOrder = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const auth = guardChecks(req, res);
        if (!auth) return;

        const { orderId } = req.params;
        if (!validateObjectId(orderId, res, 'order')) return;

        const order = await Order.findOne({
            _id: orderId,
            companyId: auth.companyId,
            isDeleted: false,
        });

        if (!order) {
            res.status(404).json({ message: 'Order not found' });
            return;
        }

        // Prevent deletion of shipped/delivered orders
        const nonDeletableStatuses = ['shipped', 'delivered'];
        if (nonDeletableStatuses.includes(order.currentStatus)) {
            res.status(400).json({
                message: `Cannot delete order with status '${order.currentStatus}'`,
            });
            return;
        }

        order.isDeleted = true;
        await order.save();
        await createAuditLog(auth.userId, auth.companyId, 'delete', 'order', orderId, { softDelete: true }, req);

        res.json({ message: 'Order deleted successfully' });
    } catch (error) {
        logger.error('Error deleting order:', error);
        next(error);
    }
};

/**
 * Bulk import orders from CSV
 * @route POST /api/v1/orders/bulk
 */
export const bulkImportOrders = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const auth = guardChecks(req, res);
        if (!auth) return;

        if (!req.file) {
            res.status(400).json({ message: 'CSV file is required' });
            return;
        }

        const rows: any[] = [];
        const created: Array<{ orderNumber: string; id: any }> = [];
        const errors: Array<{ row: number; error: string; data?: any }> = [];

        const stream = Readable.from(req.file.buffer.toString());

        stream
            .pipe(csv())
            .on('data', (row) => rows.push(row))
            .on('end', async () => {
                const session = await mongoose.startSession();
                session.startTransaction();

                try {
                    for (let i = 0; i < rows.length; i++) {
                        const row = rows[i];
                        try {
                            // Validate required fields
                            const requiredFields = ['customer_name', 'customer_phone', 'address_line1', 'city', 'state', 'postal_code', 'product_name', 'quantity', 'price'];
                            const missingFields = requiredFields.filter(f => !row[f]);

                            if (missingFields.length > 0) {
                                errors.push({ row: i + 1, error: `Missing fields: ${missingFields.join(', ')}` });
                                continue;
                            }

                            const orderNumber = await getUniqueOrderNumber();
                            if (!orderNumber) {
                                errors.push({ row: i + 1, error: 'Failed to generate order number' });
                                continue;
                            }

                            const quantity = parseInt(row.quantity, 10);
                            const price = parseFloat(row.price);
                            const subtotal = quantity * price;

                            const order = new Order({
                                orderNumber,
                                companyId: auth.companyId,
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
                            created.push({ orderNumber, id: order._id });
                        } catch (rowError) {
                            errors.push({
                                row: i + 1,
                                error: rowError instanceof Error ? rowError.message : 'Unknown error',
                            });
                        }
                    }

                    if (created.length === 0 && errors.length > 0) {
                        await session.abortTransaction();
                        res.status(400).json({ message: 'No orders imported', errors });
                        return;
                    }

                    await session.commitTransaction();
                    await createAuditLog(
                        auth.userId,
                        auth.companyId,
                        'create',
                        'order',
                        'bulk',
                        { imported: created.length, failed: errors.length },
                        req
                    );

                    res.status(201).json({
                        message: `Imported ${created.length} orders`,
                        created,
                        errors: errors.length > 0 ? errors : undefined,
                    });
                } catch (error) {
                    await session.abortTransaction();
                    throw error;
                } finally {
                    session.endSession();
                }
            })
            .on('error', (error) => {
                logger.error('CSV parsing error:', error);
                res.status(400).json({ message: 'Failed to parse CSV file' });
            });
    } catch (error) {
        logger.error('Error importing orders:', error);
        next(error);
    }
};

export default {
    createOrder,
    getOrders,
    getOrderById,
    updateOrder,
    deleteOrder,
    bulkImportOrders,
};
