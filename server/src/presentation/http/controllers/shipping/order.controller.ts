import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import Order from '../../../../infrastructure/database/mongoose/models/Order';
import { AuthRequest } from '../../middleware/auth/auth';
import logger from '../../../../shared/logger/winston.logger';
import { createAuditLog } from '../../middleware/system/auditLog';
import mongoose from 'mongoose';
import csv from 'csv-parser';
import { Readable } from 'stream';
import {
    guardChecks,
    validateObjectId,
    parsePagination,
    generateOrderNumber,
    validateStatusTransition,
} from '../../../../shared/helpers/controller.helpers';
import {
    createOrderSchema,
    updateOrderSchema,
    ORDER_STATUS_TRANSITIONS,
} from '../../../../shared/validation/schemas';
import {
    sendSuccess,
    sendError,
    sendValidationError,
    sendPaginated,
    sendCreated,
    calculatePagination
} from '../../../../shared/utils/responseHelper';

const calculateTotals = (products: Array<{ price: number; quantity: number }>) => {
    const subtotal = products.reduce((sum, p) => sum + p.price * p.quantity, 0);
    return { subtotal, tax: 0, shipping: 0, discount: 0, total: subtotal };
};

const getUniqueOrderNumber = async (maxAttempts = 10): Promise<string | null> => {
    for (let i = 0; i < maxAttempts; i++) {
        const orderNumber = generateOrderNumber();
        const exists = await Order.exists({ orderNumber });
        if (!exists) return orderNumber;
    }
    return null;
};

export const createOrder = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req, res);
        if (!auth) return;

        const validation = createOrderSchema.safeParse(req.body);
        if (!validation.success) {
            const errors = validation.error.errors.map(err => ({
                code: 'VALIDATION_ERROR',
                message: err.message,
                field: err.path.join('.'),
            }));
            sendValidationError(res, errors);
            return;
        }

        const orderNumber = await getUniqueOrderNumber();
        if (!orderNumber) {
            sendError(res, 'Failed to generate unique order number', 500, 'ORDER_NUMBER_GENERATION_FAILED');
            return;
        }

        const totals = calculateTotals(validation.data.products);

        const order = new Order({
            orderNumber,
            companyId: auth.companyId,
            customerInfo: validation.data.customerInfo,
            products: validation.data.products,
            paymentMethod: validation.data.paymentMethod || 'prepaid',
            paymentStatus: validation.data.paymentMethod === 'cod' ? 'pending' : 'paid',
            source: 'manual',
            warehouseId: validation.data.warehouseId ? new mongoose.Types.ObjectId(validation.data.warehouseId) : undefined,
            currentStatus: 'pending',
            totals,
            notes: validation.data.notes,
            tags: validation.data.tags,
            shippingDetails: { shippingCost: 0 },
        });

        await order.save();
        await createAuditLog(auth.userId, auth.companyId, 'create', 'order', String(order._id), { orderNumber }, req);

        sendCreated(res, { order }, 'Order created successfully');
    } catch (error) {
        logger.error('Error creating order:', error);
        next(error);
    }
};

export const getOrders = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req, res);
        if (!auth) return;

        const { page, limit, skip } = parsePagination(req.query as any);

        const filter: Record<string, any> = { companyId: auth.companyId, isDeleted: false };

        if (req.query.status) filter.currentStatus = req.query.status;
        if (req.query.phone) filter['customerInfo.phone'] = { $regex: req.query.phone, $options: 'i' };
        if (req.query.warehouse) filter.warehouseId = new mongoose.Types.ObjectId(req.query.warehouse as string);

        if (req.query.startDate || req.query.endDate) {
            filter.createdAt = {};
            if (req.query.startDate) filter.createdAt.$gte = new Date(req.query.startDate as string);
            if (req.query.endDate) filter.createdAt.$lte = new Date(req.query.endDate as string);
        }

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
                .limit(limit)
                .lean(),
            Order.countDocuments(filter),
        ]);

        const pagination = calculatePagination(total, page, limit);
        sendPaginated(res, orders, pagination, 'Orders retrieved successfully');
    } catch (error) {
        logger.error('Error fetching orders:', error);
        next(error);
    }
};

export const getOrderById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req, res);
        if (!auth) return;

        const { orderId } = req.params;
        if (!validateObjectId(orderId, res, 'order')) return;

        const order = await Order.findOne({
            _id: orderId,
            companyId: auth.companyId,
            isDeleted: false,
        }).populate('warehouseId', 'name address').lean();

        if (!order) {
            sendError(res, 'Order not found', 404, 'ORDER_NOT_FOUND');
            return;
        }

        sendSuccess(res, { order }, 'Order retrieved successfully');
    } catch (error) {
        logger.error('Error fetching order:', error);
        next(error);
    }
};

export const updateOrder = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req, res);
        if (!auth) return;

        const { orderId } = req.params;
        if (!validateObjectId(orderId, res, 'order')) return;

        const validation = updateOrderSchema.safeParse(req.body);
        if (!validation.success) {
            const errors = validation.error.errors.map(err => ({
                code: 'VALIDATION_ERROR',
                message: err.message,
                field: err.path.join('.'),
            }));
            sendValidationError(res, errors);
            return;
        }

        const order = await Order.findOne({
            _id: orderId,
            companyId: auth.companyId,
            isDeleted: false,
        });

        if (!order) {
            sendError(res, 'Order not found', 404, 'ORDER_NOT_FOUND');
            return;
        }

        if (validation.data.currentStatus && validation.data.currentStatus !== order.currentStatus) {
            const { valid, allowedTransitions } = validateStatusTransition(
                order.currentStatus,
                validation.data.currentStatus,
                ORDER_STATUS_TRANSITIONS
            );

            if (!valid) {
                sendError(res, `Invalid status transition from '${order.currentStatus}' to '${validation.data.currentStatus}'`, 400, 'INVALID_STATUS_TRANSITION');
                return;
            }

            order.statusHistory.push({
                status: validation.data.currentStatus,
                timestamp: new Date(),
                updatedBy: new mongoose.Types.ObjectId(auth.userId),
            });
            order.currentStatus = validation.data.currentStatus;
        }

        if (validation.data.customerInfo) {
            order.customerInfo = { ...order.customerInfo, ...validation.data.customerInfo } as any;
        }
        if (validation.data.products) {
            order.products = validation.data.products;
            const totals = calculateTotals(validation.data.products);
            order.totals = { ...order.totals, ...totals };
        }
        if (validation.data.paymentStatus) order.paymentStatus = validation.data.paymentStatus;
        if (validation.data.paymentMethod) order.paymentMethod = validation.data.paymentMethod;
        if (validation.data.notes !== undefined) order.notes = validation.data.notes;
        if (validation.data.tags) order.tags = validation.data.tags;

        await order.save();
        await createAuditLog(auth.userId, auth.companyId, 'update', 'order', orderId, { changes: Object.keys(validation.data) }, req);

        sendSuccess(res, { order }, 'Order updated successfully');
    } catch (error) {
        logger.error('Error updating order:', error);
        next(error);
    }
};

export const deleteOrder = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
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
            sendError(res, 'Order not found', 404, 'ORDER_NOT_FOUND');
            return;
        }

        const nonDeletableStatuses = ['shipped', 'delivered'];
        if (nonDeletableStatuses.includes(order.currentStatus)) {
            sendError(res, `Cannot delete order with status '${order.currentStatus}'`, 400, 'CANNOT_DELETE_ORDER');
            return;
        }

        order.isDeleted = true;
        await order.save();
        await createAuditLog(auth.userId, auth.companyId, 'delete', 'order', orderId, { softDelete: true }, req);

        sendSuccess(res, null, 'Order deleted successfully');
    } catch (error) {
        logger.error('Error deleting order:', error);
        next(error);
    }
};

export const bulkImportOrders = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req, res);
        if (!auth) return;

        if (!req.file) {
            sendError(res, 'CSV file is required', 400, 'FILE_REQUIRED');
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
                        sendError(res, 'No orders imported', 400, 'IMPORT_FAILED');
                        return;
                    }

                    await session.commitTransaction();
                    await createAuditLog(auth.userId, auth.companyId, 'create', 'order', 'bulk', { imported: created.length, failed: errors.length }, req);

                    sendCreated(res, { created, errors: errors.length > 0 ? errors : undefined, imported: created.length, failed: errors.length }, `Imported ${created.length} orders`);
                } catch (error) {
                    await session.abortTransaction();
                    throw error;
                } finally {
                    session.endSession();
                }
            })
            .on('error', (error) => {
                logger.error('CSV parsing error:', error);
                sendError(res, 'Failed to parse CSV file', 400, 'CSV_PARSE_ERROR');
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
