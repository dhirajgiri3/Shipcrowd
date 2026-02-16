import { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import BookFromQuoteService from '../../../../core/application/services/shipping/book-from-quote.service';
import { OrderService } from '../../../../core/application/services/shipping/order.service';
import { ShipmentService } from '../../../../core/application/services/shipping/shipment.service';
import { Order, User } from '../../../../infrastructure/database/mongoose/models';
import { AppError, ConflictError, NotFoundError, ValidationError } from '../../../../shared/errors/app.error';
import { ErrorCode } from '../../../../shared/errors/errorCodes';
import {
    guardChecks,
    parsePagination,
    validateObjectId,
} from '../../../../shared/helpers/controller.helpers';
import logger from '../../../../shared/logger/winston.logger';
import {
    sendCreated,
    sendPaginated,
    sendSuccess,
} from '../../../../shared/utils/responseHelper';
import { bookFromQuoteSchema, updateOrderSchema } from '../../../../shared/validation/schemas';
import { createAuditLog } from '../../middleware/system/audit-log.middleware';
import { toShipmentResponseWithCompat } from './shipment.controller';

/**
 * Get all orders (Admin View)
 * Can see orders from ALL companies
 * GET /api/v1/admin/orders
 */
export const getAllOrders = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req, { requireCompany: false });
void auth;

        const { page, limit } = parsePagination(req.query as Record<string, any>);
        const sortBy = req.query.sortBy as string || 'createdAt';
        const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'desc';

        // Extract filters
        const queryParams = {
            status: req.query.status,
            search: req.query.search,
            startDate: req.query.startDate,
            endDate: req.query.endDate,
            warehouse: req.query.warehouse,
            phone: req.query.phone,
            companyId: req.query.companyId, // Admin can filter by specific company
            source: req.query.source, // Order source: manual, shopify, woocommerce, amazon, flipkart, api, bulk_import
        };

        // Admin can see all orders (pass null for companyId to service)
        const serviceCompanyId = (req.query.companyId as string) || null;

        // Use the faceted search service method
        const result = await OrderService.getInstance().listOrdersWithStats(
            serviceCompanyId,
            queryParams,
            { page, limit, sortBy, sortOrder }
        );

        sendPaginated(res, result.orders, {
            page: result.page,
            pages: result.pages,
            total: result.total,
            limit: limit,
            hasNext: result.page < result.pages,
            hasPrev: result.page > 1
        }, 'Orders retrieved successfully', {
            stats: result.stats
        });
    } catch (error) {
        logger.error('Error fetching admin orders:', error);
        next(error);
    }
};

/**
 * Get order by ID (Admin View)
 * Can view ANY order without company ownership check
 * GET /api/v1/admin/orders/:orderId
 */
export const getOrderById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req, { requireCompany: false });
void auth;

        const { orderId } = req.params;
        validateObjectId(orderId, 'order');

        const order = await Order.findOne({
            _id: orderId,
            isDeleted: false,
        })
            .populate('warehouseId', 'name address')
            .populate('companyId', 'name email phone') // Populate company for admin context
            .lean();

        if (!order) {
            throw new NotFoundError('Order', ErrorCode.RES_ORDER_NOT_FOUND);
        }

        sendSuccess(res, { order }, 'Order retrieved successfully');
    } catch (error) {
        logger.error('Error fetching admin order:', error);
        next(error);
    }
};

/**
 * Update order (Admin View)
 * Can update ANY order
 * PATCH /api/v1/admin/orders/:orderId
 */
export const updateOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req, { requireCompany: false });

        const { orderId } = req.params;
        validateObjectId(orderId, 'order');

        const validation = updateOrderSchema.safeParse(req.body);
        if (!validation.success) {
            const errors = validation.error.errors.map(err => ({
                field: err.path.join('.'),
                message: err.message,
            }));
            throw new ValidationError('Validation failed', errors);
        }

        const order = await Order.findOne({
            _id: orderId,
            isDeleted: false,
        });

        if (!order) {
            throw new NotFoundError('Order', ErrorCode.RES_ORDER_NOT_FOUND);
        }

        // Admin can override status transitions
        if (validation.data.currentStatus && validation.data.currentStatus !== order.currentStatus) {
            const result = await OrderService.getInstance().updateOrderStatus({
                orderId: String(order._id),
                currentStatus: order.currentStatus,
                newStatus: validation.data.currentStatus,
                currentVersion: order.__v,
                userId: auth.userId,
                companyId: String(order.companyId), // Use order's company for cache tagging
                isAdminOverride: true // Flag for admin override
            });

            if (!result.success) {
                throw new ValidationError(result.error || 'Status update failed');
            }
        }

        // Update other fields
        if (validation.data.customerInfo) {
            order.customerInfo = {
                ...order.customerInfo,
                ...validation.data.customerInfo
            };
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
        await createAuditLog(
            auth.userId,
            auth.companyId || 'admin',
            'update',
            'order',
            orderId,
            { changes: Object.keys(validation.data), adminUpdate: true },
            req
        );

        sendSuccess(res, { order }, 'Order updated successfully');
    } catch (error) {
        logger.error('Error updating admin order:', error);
        next(error);
    }
};

/**
 * Ship an order (Admin View)
 * Admin can ship any order on behalf of seller - standard aggregator workflow for support/ops
 * POST /api/v1/admin/orders/:orderId/ship
 */
export const shipOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req, { requireCompany: false });
        const { orderId } = req.params;
        validateObjectId(orderId, 'order');

        const validation = bookFromQuoteSchema.safeParse({
            ...req.body,
            orderId,
        });
        if (!validation.success) {
            const errors = validation.error.errors.map((err) => ({
                field: err.path.join('.'),
                message: err.message,
            }));
            throw new ValidationError('Validation failed', errors);
        }

        const order = await Order.findOne({
            _id: orderId,
            isDeleted: false,
        }).lean();

        if (!order) {
            throw new NotFoundError('Order', ErrorCode.RES_ORDER_NOT_FOUND);
        }

        const companyId = String(order.companyId);
        const companySeller = await User.findOne({
            companyId: new mongoose.Types.ObjectId(companyId),
            role: { $in: ['seller', 'staff'] },
            isDeleted: false,
        })
            .select('_id')
            .lean();

        const sellerId = companySeller?._id?.toString();
        if (!sellerId) {
            throw new AppError(
                'No seller found for order\'s company. Cannot ship on behalf.',
                ErrorCode.RES_ORDER_NOT_FOUND,
                400,
                true
            );
        }

        const result = await BookFromQuoteService.execute({
            companyId,
            sellerId,
            userId: auth.userId,
            sessionId: validation.data.sessionId,
            optionId: validation.data.optionId,
            orderId: validation.data.orderId,
            warehouseId: validation.data.warehouseId,
            instructions: validation.data.instructions,
        });

        await createAuditLog(
            auth.userId,
            companyId,
            'create',
            'shipment',
            String(result.shipment._id),
            {
                trackingNumber: result.shipment.trackingNumber,
                carrier: result.carrierSelection?.selectedCarrier,
                adminShipOnBehalf: true,
                orderId,
            },
            req
        );

        sendCreated(
            res,
            {
                ...result,
                shipment: toShipmentResponseWithCompat(result.shipment),
            },
            'Shipment created successfully (admin on behalf)'
        );
    } catch (error) {
        logger.error('Error shipping admin order:', error);
        next(error);
    }
};

/**
 * Delete an order (Admin View)
 * Admin can delete any order without company ownership check
 * DELETE /api/v1/admin/orders/:orderId
 */
export const deleteOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req, { requireCompany: false });
        const { orderId } = req.params;
        validateObjectId(orderId, 'order');

        const order = await Order.findOne({
            _id: orderId,
            isDeleted: false,
        });

        if (!order) {
            throw new NotFoundError('Order', ErrorCode.RES_ORDER_NOT_FOUND);
        }

        const { canDelete, reason } = OrderService.getInstance().canDeleteOrder(order.currentStatus);
        if (!canDelete) {
            throw new AppError(reason || 'Cannot delete order', 'CANNOT_DELETE_ORDER', 400);
        }

        const hasActive = await ShipmentService.hasActiveShipment(order._id as mongoose.Types.ObjectId);
        if (hasActive) {
            throw new ConflictError(
                'Cannot delete order: An active shipment exists. Cancel the shipment first, then delete the order.',
                ErrorCode.BIZ_SHIPMENT_EXISTS
            );
        }

        order.isDeleted = true;
        await order.save();

        const companyId = String(order.companyId);
        await OrderService.getInstance().invalidateOrderListsForCompany(companyId);
        await OrderService.getInstance().invalidateOrderDetail(orderId);

        await createAuditLog(
            auth.userId,
            auth.companyId || String(order.companyId),
            'delete',
            'order',
            orderId,
            { softDelete: true, adminDelete: true },
            req
        );

        sendSuccess(res, null, 'Order deleted successfully');
    } catch (error) {
        logger.error('Error deleting admin order:', error);
        next(error);
    }
};

export default {
    getAllOrders,
    getOrderById,
    updateOrder,
    shipOrder,
    deleteOrder,
};
