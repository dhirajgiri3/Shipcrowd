import { NextFunction, Request, Response } from 'express';
import { OrderService } from '../../../../core/application/services/shipping/order.service';
import { Order } from '../../../../infrastructure/database/mongoose/models';
import { NotFoundError, ValidationError } from '../../../../shared/errors/app.error';
import { ErrorCode } from '../../../../shared/errors/errorCodes';
import {
guardChecks,
parsePagination,
validateObjectId,
} from '../../../../shared/helpers/controller.helpers';
import logger from '../../../../shared/logger/winston.logger';
import {
sendPaginated,
sendSuccess
} from '../../../../shared/utils/responseHelper';
import { updateOrderSchema } from '../../../../shared/validation/schemas';
import { createAuditLog } from '../../middleware/system/audit-log.middleware';

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

export default {
    getAllOrders,
    getOrderById,
    updateOrder,
};
