/**
 * Return Controller
 * 
 * RESTful API endpoints for returns management.
 * Designed for beautiful, intuitive frontend integration.
 * 
 * Response Format (Consistent across all endpoints):
 * {
 *   success: boolean,
 *   data: T | null,
 *   message: string,
 *   metadata?: {
 *     pagination?: { page, limit, total, pages },
 *     timestamp: ISO string
 *   }
 * }
 */

import ReturnService from '@/core/application/services/logistics/return.service';
import { Order, Shipment } from '@/infrastructure/database/mongoose/models';
import ReturnOrder, { ReturnReason } from '@/infrastructure/database/mongoose/models/logistics/returns/return-order.model';
import { AppError, normalizeError } from '@/shared/errors/app.error';
import { guardChecks, requireCompanyContext } from '@/shared/helpers/controller.helpers';
import logger from '@/shared/logger/winston.logger';
import { calculatePagination, sendCreated, sendPaginated, sendSuccess } from '@/shared/utils/responseHelper';
import { Request, Response } from 'express';
import { z } from 'zod';

/**
 * Zod validation schemas for type-safe request validation
 */
const CreateReturnRequestSchema = z.object({
    orderId: z.string().min(1, 'Order ID is required'),
    shipmentId: z.string().min(1, 'Shipment ID is required'),
    returnReason: z.nativeEnum(ReturnReason),
    returnReasonText: z.string().max(500).optional(),
    customerComments: z.string().max(1000).optional(),
    items: z.array(z.object({
        productId: z.string(),
        productName: z.string(),
        sku: z.string().optional(),
        quantity: z.number().min(1),
        unitPrice: z.number().min(0),
    })).min(1, 'At least one item is required'),
    refundMethod: z.enum(['wallet', 'original_payment', 'bank_transfer']).optional(),
});

const SchedulePickupSchema = z.object({
    scheduledDate: z.string().datetime(),
    courierId: z.string().min(1),
});

const RecordQCResultSchema = z.object({
    result: z.enum(['approved', 'rejected', 'partial']),
    itemsAccepted: z.number().min(0),
    itemsRejected: z.number().min(0),
    rejectionReason: z.string().optional(),
    photos: z.array(z.string().url()).max(20).optional(),
    notes: z.string().max(1000).optional(),
});

const ListReturnsQuerySchema = z.object({
    page: z.string().optional().transform((v) => Math.max(1, parseInt(v || '1', 10))),
    limit: z.string().optional().transform((v) => Math.max(1, Math.min(100, parseInt(v || '20', 10)))),
    status: z.string().optional(),
    sellerReviewStatus: z.enum(['pending', 'approved', 'rejected']).optional(),
    returnReason: z.string().optional(),
    search: z.string().trim().min(1).max(120).optional(),
    companyId: z.string().optional(),
});

const ReviewReturnSchema = z.object({
    decision: z.enum(['approved', 'rejected']),
    reason: z.string().max(500).optional(),
});

export default class ReturnController {
    /**
     * POST /api/v1/returns
     * Create a new return request
     * 
     * Access: Customer, Seller
     */
    static async createReturnRequest(req: Request, res: Response): Promise<void> {
        try {
            // Validate request body
            const validatedData = CreateReturnRequestSchema.parse(req.body);

            const auth = guardChecks(req);
            requireCompanyContext(auth);

            // Create return request
            const returnOrder = await ReturnService.createReturnRequest({
                ...validatedData,
                companyId: auth.companyId,
                customerId: auth.userId,
            });

            logger.info('Return request created via API', {
                returnId: returnOrder.returnId,
                userId: auth.userId,
            });

            sendCreated(res, {
                returnId: returnOrder.returnId,
                status: returnOrder.status,
                refundAmount: returnOrder.refundAmount,
                sla: {
                    pickupDeadline: returnOrder.sla.pickupDeadline,
                },
                tracking: {
                    status: returnOrder.status,
                    currentStep: 1,
                    totalSteps: 5,
                    steps: [
                        { name: 'Request Created', completed: true },
                        { name: 'Pickup Scheduled', completed: false },
                        { name: 'In Transit', completed: false },
                        { name: 'Quality Check', completed: false },
                        { name: 'Refund Processed', completed: false },
                    ],
                },
            }, 'Return request created successfully. You will be notified when pickup is scheduled.');
        } catch (error) {
            if (error instanceof z.ZodError) {
                const appError = new AppError('Validation failed', 'VALIDATION_ERROR', 400);
void appError;
                res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: error.errors.map(e => ({
                        field: e.path.join('.'),
                        message: e.message
                    }))
                });
                return;
            }
            const appError = normalizeError(error);
            res.status(appError.statusCode).json(appError.toJSON());
        }
    }

    /**
     * GET /api/v1/returns
     * List all returns with pagination and filters
     * 
     * Access: Seller, Warehouse Staff, Admin
     */
    static async listReturns(req: Request, res: Response): Promise<void> {
        try {
            const auth = guardChecks(req);
            const validated = ListReturnsQuerySchema.parse(req.query);
            const requestedCompanyId = validated.companyId;
            const companyId = (req.user?.role === 'admin' && requestedCompanyId) ? requestedCompanyId : auth.companyId;
            requireCompanyContext({ companyId });
            const { page, limit, status, sellerReviewStatus, returnReason, search } = validated;

            // Build filter
            const filter: any = { companyId, isDeleted: { $ne: true } };
            if (status) filter.status = status;
            if (sellerReviewStatus) filter['sellerReview.status'] = sellerReviewStatus;
            if (returnReason) filter.returnReason = returnReason;

            if (search) {
                const searchRegex = new RegExp(search, 'i');
                const [matchingOrders, matchingShipments] = await Promise.all([
                    Order.find({
                        companyId,
                        isDeleted: { $ne: true },
                        $or: [
                            { orderNumber: { $regex: searchRegex } },
                            { 'customerInfo.name': { $regex: searchRegex } },
                            { 'customerInfo.phone': { $regex: searchRegex } },
                        ],
                    }).select('_id').lean(),
                    Shipment.find({
                        companyId,
                        isDeleted: { $ne: true },
                        $or: [
                            { trackingNumber: { $regex: searchRegex } },
                            { 'deliveryDetails.recipientName': { $regex: searchRegex } },
                            { 'deliveryDetails.recipientPhone': { $regex: searchRegex } },
                        ],
                    }).select('_id').lean(),
                ]);

                filter.$or = [
                    { returnId: { $regex: searchRegex } },
                    { orderId: { $in: matchingOrders.map((o: any) => o._id) } },
                    { shipmentId: { $in: matchingShipments.map((s: any) => s._id) } },
                ];
            }

            // Fetch returns with pagination
            const [returns, total] = await Promise.all([
                ReturnOrder.find(filter)
                    .populate('orderId', 'orderNumber totals customerInfo source')
                    .populate('shipmentId', 'trackingNumber deliveryDetails')
                    .sort({ createdAt: -1 })
                    .skip((page - 1) * limit)
                    .limit(limit)
                    .select('-timeline'),
                ReturnOrder.countDocuments(filter),
            ]);

            const pagination = calculatePagination(total, page, limit);

            sendPaginated(res, returns.map((ret: any) => {
                const order = ret.orderId && typeof ret.orderId === 'object' ? ret.orderId : null;
                const shipment = ret.shipmentId && typeof ret.shipmentId === 'object' ? ret.shipmentId : null;
                const refundDetails = {
                    method: ret.refundMethod || 'wallet',
                    amount: ret.refundAmount || 0,
                    totalRefund: ret.refundAmount || 0,
                    initiatedAt: ret.refund?.initiatedAt,
                    completedAt: ret.refund?.completedAt,
                    transactionId: ret.refund?.transactionId,
                };

                return {
                _id: String(ret._id),
                returnId: ret.returnId,
                orderId: order
                    ? {
                        _id: String(order._id),
                        orderNumber: order.orderNumber,
                        totalAmount: order?.totals?.total || 0,
                        source: order?.source,
                    }
                    : String(ret.orderId),
                shipmentId: shipment
                    ? {
                        _id: String(shipment._id),
                        trackingNumber: shipment.trackingNumber,
                        carrier: shipment.carrier,
                    }
                    : String(ret.shipmentId),
                customerName: shipment?.deliveryDetails?.recipientName || order?.customerInfo?.name || 'Customer',
                customerPhone: shipment?.deliveryDetails?.recipientPhone || order?.customerInfo?.phone || '',
                customerEmail: shipment?.deliveryDetails?.recipientEmail || order?.customerInfo?.email || '',
                status: ret.status,
                sellerReview: ret.sellerReview || { status: 'pending' },
                primaryReason: ret.returnReason,
                returnReason: ret.returnReason,
                estimatedRefund: ret.refundAmount,
                refundAmount: ret.refundAmount,
                createdAt: ret.createdAt,
                requestedAt: ret.createdAt,
                pickup: {
                    status: ret.pickup.status,
                    scheduledDate: ret.pickup.scheduledDate,
                    awb: ret.pickup.awb,
                },
                qc: {
                    status: ret.qc.status,
                    result: ret.qc.result,
                },
                refund: {
                    status: ret.refund.status,
                },
                refundDetails,
                sla: {
                    isBreached: ret.sla.isBreached,
                },
                items: ret.items,
                timeline: [],
                companyId: String(ret.companyId),
                refundEligible: !!ret.isEligibleForRefund?.(),
                pickupAddress: shipment?.deliveryDetails?.address?.line1 || '',
                customerNotes: ret.customerComments,
            };
            }), pagination, `Found ${total} return(s)`);
        } catch (error) {
            const appError = normalizeError(error);
            res.status(appError.statusCode).json(appError.toJSON());
        }
    }

    /**
     * GET /api/v1/returns/:returnId
     * Get detailed return information
     * 
     * Access: Customer (own returns), Seller, Warehouse, Admin
     */
    static async getReturnDetails(req: Request, res: Response): Promise<void> {
        try {
            const { returnId } = req.params;
            const query = z.string().regex(/^[a-f\d]{24}$/i).safeParse(returnId).success
                ? { $or: [{ returnId }, { _id: returnId }], isDeleted: { $ne: true } }
                : { returnId, isDeleted: { $ne: true } };

            const returnOrder = await ReturnOrder.findOne(query)
                .populate('orderId', 'orderNumber totals customerInfo source')
                .populate('shipmentId', 'trackingNumber carrier deliveryDetails');

            if (!returnOrder) {
                throw new AppError('Return not found', 'RETURN_NOT_FOUND', 404);
            }

            // Authorization check (customer can only see their own returns)
            const auth = guardChecks(req);
            if (req.user?.role === 'customer' && returnOrder.customerId?.toString() !== auth.userId) {
                throw new AppError('You do not have permission to view this return', 'FORBIDDEN', 403);
            }
            if (req.user?.role !== 'admin' && returnOrder.companyId?.toString() !== auth.companyId) {
                throw new AppError('You do not have permission to view this return', 'FORBIDDEN', 403);
            }

            const order = returnOrder.orderId && typeof returnOrder.orderId === 'object' ? returnOrder.orderId as any : null;
            const shipment = returnOrder.shipmentId && typeof returnOrder.shipmentId === 'object'
                ? returnOrder.shipmentId as any
                : null;
            const qualityCheck = returnOrder.qc?.completedAt
                ? {
                    performedBy: String(returnOrder.qc.assignedTo || 'system'),
                    performedAt: returnOrder.qc.completedAt.toISOString(),
                    status: returnOrder.qc.status === 'passed' ? 'pass' : returnOrder.qc.status === 'failed' ? 'fail' : 'partial_pass',
                    items: [],
                    overallNotes: returnOrder.qc.notes || '',
                    refundAmount: returnOrder.calculateActualRefund(),
                    restockable: returnOrder.qc.status === 'passed',
                }
                : undefined;

            sendSuccess(res, {
                _id: String(returnOrder._id),
                returnId: returnOrder.returnId,
                orderId: order
                    ? { _id: String(order._id), orderNumber: order.orderNumber, totalAmount: order?.totals?.total || 0 }
                    : String(returnOrder.orderId),
                shipmentId: shipment
                    ? { _id: String(shipment._id), trackingNumber: shipment.trackingNumber, carrier: shipment.carrier }
                    : String(returnOrder.shipmentId),
                companyId: String(returnOrder.companyId),
                customerName: shipment?.deliveryDetails?.recipientName || order?.customerInfo?.name || 'Customer',
                customerEmail: shipment?.deliveryDetails?.recipientEmail || order?.customerInfo?.email || '',
                customerPhone: shipment?.deliveryDetails?.recipientPhone || order?.customerInfo?.phone || '',
                status: returnOrder.status,
                sellerReview: returnOrder.sellerReview || { status: 'pending' },
                primaryReason: returnOrder.returnReason,
                returnReason: returnOrder.returnReason,
                returnReasonText: returnOrder.returnReasonText,
                customerComments: returnOrder.customerComments,
                customerNotes: returnOrder.customerComments,
                items: returnOrder.items.map((item: any) => ({
                    ...item.toObject?.() || item,
                    returnQuantity: item.quantity,
                    sellingPrice: item.unitPrice,
                    returnReason: returnOrder.returnReason,
                })),
                refundAmount: returnOrder.refundAmount,
                refundMethod: returnOrder.refundMethod,
                pickup: returnOrder.pickup,
                qc: returnOrder.qc,
                qualityCheck,
                refund: returnOrder.refund,
                refundDetails: {
                    method: returnOrder.refundMethod,
                    amount: returnOrder.refundAmount,
                    shippingRefund: 0,
                    deductions: {},
                    totalRefund: returnOrder.refundAmount,
                    initiatedAt: returnOrder.refund?.initiatedAt,
                    completedAt: returnOrder.refund?.completedAt,
                    transactionId: returnOrder.refund?.transactionId,
                },
                inventory: returnOrder.inventory,
                sla: returnOrder.sla,
                refundEligible: returnOrder.isEligibleForRefund(),
                estimatedRefund: returnOrder.refundAmount,
                pickupAddress: shipment?.deliveryDetails?.address?.line1 || '',
                pickupScheduledAt: returnOrder.pickup?.scheduledDate,
                pickupTrackingNumber: returnOrder.pickup?.awb,
                requestedAt: returnOrder.createdAt,
                timeline: returnOrder.timeline.map((t: any) => ({
                    status: t.status,
                    timestamp: t.timestamp,
                    actor: t.actor,
                    action: t.action,
                    notes: t.notes,
                })),
                createdAt: returnOrder.createdAt,
                updatedAt: returnOrder.updatedAt,
            }, 'Return details retrieved successfully');
        } catch (error) {
            const appError = normalizeError(error);
            res.status(appError.statusCode).json(appError.toJSON());
        }
    }

    /**
     * POST /api/v1/returns/:returnId/pickup
     * Schedule pickup for return
     * 
     * Access: Warehouse Staff, Admin
     */
    static async schedulePickup(req: Request, res: Response): Promise<void> {
        try {
            const auth = guardChecks(req);
            const { returnId } = req.params;
            const validatedData = SchedulePickupSchema.parse(req.body);

            const returnOrder = await ReturnService.schedulePickup({
                returnId,
                scheduledDate: new Date(validatedData.scheduledDate),
                courierId: validatedData.courierId,
                performedBy: auth.userId,
            });

            sendSuccess(res, {
                returnId: returnOrder.returnId,
                status: returnOrder.status,
                pickup: {
                    status: returnOrder.pickup.status,
                    scheduledDate: returnOrder.pickup.scheduledDate,
                    awb: returnOrder.pickup.awb,
                    trackingUrl: returnOrder.pickup.trackingUrl,
                },
            }, 'Pickup scheduled successfully');
        } catch (error) {
            if (error instanceof z.ZodError) {
                res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: error.errors
                });
                return;
            }
            const appError = normalizeError(error);
            res.status(appError.statusCode).json(appError.toJSON());
        }
    }

    /**
     * POST /api/v1/returns/:returnId/qc
     * Record QC results
     * 
     * Access: Warehouse QC Staff, Admin
     */
    static async recordQCResult(req: Request, res: Response): Promise<void> {
        try {
            const auth = guardChecks(req);
            const { returnId } = req.params;
            const validatedData = RecordQCResultSchema.parse(req.body);

            const returnOrder = await ReturnService.recordQCResult({
                returnId,
                ...validatedData,
                assignedTo: auth.userId,
            });

            sendSuccess(res, {
                returnId: returnOrder.returnId,
                status: returnOrder.status,
                qc: {
                    status: returnOrder.qc.status,
                    result: returnOrder.qc.result,
                    itemsAccepted: returnOrder.qc.itemsAccepted,
                    itemsRejected: returnOrder.qc.itemsRejected,
                    completedAt: returnOrder.qc.completedAt,
                },
                refund: {
                    status: returnOrder.refund.status,
                    estimatedAmount: returnOrder.calculateActualRefund(),
                },
            }, `QC ${validatedData.result}: ${validatedData.result === 'approved' ? 'Refund will be processed automatically' : 'Return rejected'}`);
        } catch (error) {
            if (error instanceof z.ZodError) {
                res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: error.errors
                });
                return;
            }
            const appError = normalizeError(error);
            res.status(appError.statusCode).json(appError.toJSON());
        }
    }

    /**
     * POST /api/v1/returns/:returnId/refund
     * Manually trigger refund processing (admin only)
     * 
     * Access: Admin
     */
    static async processRefund(req: Request, res: Response): Promise<void> {
        try {
            const { returnId } = req.params;

            const returnOrder = await ReturnService.processRefund(returnId);

            sendSuccess(res, {
                returnId: returnOrder.returnId,
                status: returnOrder.status,
                refund: {
                    status: returnOrder.refund.status,
                    transactionId: returnOrder.refund.transactionId,
                    amount: returnOrder.calculateActualRefund(),
                    completedAt: returnOrder.refund.completedAt,
                },
            }, 'Refund processed successfully');
        } catch (error) {
            const appError = normalizeError(error);
            res.status(appError.statusCode).json(appError.toJSON());
        }
    }

    /**
     * POST /api/v1/returns/:returnId/cancel
     * Cancel a return request
     * 
     * Access: Customer (own returns), Admin
     */
    static async cancelReturn(req: Request, res: Response): Promise<void> {
        try {
            const auth = guardChecks(req);
            const { returnId } = req.params;
            const { reason } = req.body;

            if (!reason || reason.trim().length === 0) {
                throw new AppError('Cancellation reason is required', 'MISSING_REASON', 400);
            }

            const returnOrder = await ReturnService.cancelReturn(returnId, auth.userId, reason);

            sendSuccess(res, {
                _id: String(returnOrder._id),
                returnId: returnOrder.returnId,
                status: returnOrder.status,
                cancelledAt: returnOrder.cancelledAt,
            }, 'Return cancelled successfully');
        } catch (error) {
            const appError = normalizeError(error);
            res.status(appError.statusCode).json(appError.toJSON());
        }
    }

    /**
     * PATCH /api/v1/returns/:returnId/review
     * Seller triage decision for requested returns.
     */
    static async reviewReturnRequest(req: Request, res: Response): Promise<void> {
        try {
            const auth = guardChecks(req);
            requireCompanyContext(auth);
            const { returnId } = req.params;
            const { decision, reason } = ReviewReturnSchema.parse(req.body);

            if (decision === 'rejected' && !reason?.trim()) {
                throw new AppError('Rejection reason is required', 'VALIDATION_ERROR', 400);
            }

            const updated = await ReturnService.reviewReturnRequest(returnId, decision, auth.userId, auth.companyId, reason);

            sendSuccess(res, {
                _id: String(updated._id),
                returnId: updated.returnId,
                status: updated.status,
                sellerReview: updated.sellerReview,
                updatedAt: updated.updatedAt,
            }, `Return ${decision} successfully`);
        } catch (error) {
            if (error instanceof z.ZodError) {
                res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: error.errors,
                });
                return;
            }
            const appError = normalizeError(error);
            res.status(appError.statusCode).json(appError.toJSON());
        }
    }

    /**
     * GET /api/v1/returns/stats
     * Get return analytics and statistics
     * 
     * Access: Seller, Admin
     */
    static async getReturnStats(req: Request, res: Response): Promise<void> {
        try {
            const auth = guardChecks(req);
            const requestedCompanyId = req.query.companyId as string | undefined;
            const companyId = (req.user?.role === 'admin' && requestedCompanyId) ? requestedCompanyId : auth.companyId;
            requireCompanyContext({ companyId });
            const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
            const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

            const dateRange = startDate && endDate ? { start: startDate, end: endDate } : undefined;
            const stats = await ReturnService.getReturnStats(companyId, dateRange);

            sendSuccess(res, stats, 'Return statistics retrieved successfully');
        } catch (error) {
            const appError = normalizeError(error);
            res.status(appError.statusCode).json(appError.toJSON());
        }
    }
}
