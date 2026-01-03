import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import Order from '../../../../infrastructure/database/mongoose/models/order.model';
import { AuthRequest } from '../../middleware/auth/auth';
import logger from '../../../../shared/logger/winston.logger';
import { createAuditLog } from '../../middleware/system/audit-log.middleware';
import mongoose from 'mongoose';
import csv from 'csv-parser';
import { Readable } from 'stream';
import {
    guardChecks,
    validateObjectId,
    parsePagination,
} from '../../../../shared/helpers/controller.helpers';
import {
    createOrderSchema,
    updateOrderSchema,
} from '../../../../shared/validation/schemas';
import {
    sendSuccess,
    sendError,
    sendValidationError,
    sendPaginated,
    sendCreated,
    calculatePagination
} from '../../../../shared/utils/responseHelper';
import { OrderService } from '../../../../core/application/services/shipping/order.service';

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

        const order = await OrderService.createOrder({
            companyId: new mongoose.Types.ObjectId(auth.companyId),
            userId: auth.userId,
            payload: validation.data
        });

        await createAuditLog(auth.userId, auth.companyId, 'create', 'order', String(order._id), { orderNumber: order.orderNumber }, req);

        sendCreated(res, { order }, 'Order created successfully');
    } catch (error) {
        if (error instanceof Error && error.message === 'Failed to generate unique order number') {
            sendError(res, 'Failed to generate unique order number', 500, 'ORDER_NUMBER_GENERATION_FAILED');
            return;
        }
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
            const result = await OrderService.updateOrderStatus({
                orderId: String(order._id),
                currentStatus: order.currentStatus,
                newStatus: validation.data.currentStatus,
                currentVersion: order.__v,
                userId: auth.userId
            });

            if (!result.success) {
                if (result.code === 'CONCURRENT_MODIFICATION') {
                    sendError(res, result.error!, 409, result.code);
                } else {
                    sendError(res, result.error!, 400, 'INVALID_STATUS_TRANSITION');
                }
                return;
            }
        }

        if (validation.data.customerInfo) {
            order.customerInfo = { ...order.customerInfo, ...validation.data.customerInfo } as any;
        }
        if (validation.data.products) {
            order.products = validation.data.products;
            const totals = OrderService.calculateTotals(validation.data.products);
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

        const { canDelete, reason } = OrderService.canDeleteOrder(order.currentStatus);
        if (!canDelete) {
            sendError(res, reason!, 400, 'CANNOT_DELETE_ORDER');
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

        const stream = Readable.from(req.file.buffer.toString());

        stream
            .pipe(csv())
            .on('data', (row) => rows.push(row))
            .on('end', async () => {
                try {
                    const result = await OrderService.bulkImportOrders({
                        rows,
                        companyId: new mongoose.Types.ObjectId(auth.companyId)
                    });

                    await createAuditLog(auth.userId, auth.companyId, 'create', 'order', 'bulk', { imported: result.created.length, failed: result.errors.length }, req);

                    sendCreated(res, {
                        created: result.created,
                        errors: result.errors.length > 0 ? result.errors : undefined,
                        imported: result.created.length,
                        failed: result.errors.length
                    }, `Imported ${result.created.length} orders`);
                } catch (error) {
                    if (error instanceof Error && error.message === 'No orders imported') {
                        sendError(res, 'No orders imported', 400, 'IMPORT_FAILED');
                        return;
                    }
                    throw error;
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
