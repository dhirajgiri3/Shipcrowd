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

import { Request, Response } from 'express';
import { z } from 'zod';
import ReturnService from '@/core/application/services/logistics/return.service';
import { ReturnReason } from '@/infrastructure/database/mongoose/models/logistics/returns/return-order.model';
import logger from '@/shared/logger/winston.logger';
import { AppError } from '@/shared/errors/app.error';

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

            // Extract user info from auth middleware
            const companyId = req.user?.companyId || req.body.companyId;
            const customerId = req.user?._id;

            if (!companyId) {
                throw new AppError('Company ID is required', 'MISSING_COMPANY_ID', 400);
            }

            // Create return request
            const returnOrder = await ReturnService.createReturnRequest({
                ...validatedData,
                companyId,
                customerId,
            });

            logger.info('Return request created via API', {
                returnId: returnOrder.returnId,
                userId: customerId,
            });

            res.status(201).json({
                success: true,
                data: {
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
                },
                message: 'Return request created successfully. You will be notified when pickup is scheduled.',
                metadata: {
                    timestamp: new Date().toISOString(),
                },
            });
        } catch (error) {
            if (error instanceof z.ZodError) {
                res.status(400).json({
                    success: false,
                    data: null,
                    message: 'Validation failed',
                    errors: error.errors.map(e => ({
                        field: e.path.join('.'),
                        message: e.message,
                    })),
                });
            } else if (error instanceof AppError) {
                res.status(error.statusCode).json({
                    success: false,
                    data: null,
                    message: error.message,
                    code: error.code,
                });
            } else {
                logger.error('Create return request failed', {
                    error: error instanceof Error ? error.message : String(error),
                });
                res.status(500).json({
                    success: false,
                    data: null,
                    message: 'An error occurred while creating the return request',
                });
            }
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
            const companyId = req.user?.companyId || req.query.companyId as string;
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 20;
            const status = req.query.status as string;
            const returnReason = req.query.returnReason as string;

            // Build filter
            const filter: any = { companyId, isDeleted: false };
            if (status) filter.status = status;
            if (returnReason) filter.returnReason = returnReason;

            // Import model (not done at top to avoid circular dependency)
            const ReturnOrder = (await import('@/infrastructure/database/mongoose/models/logistics/returns/return-order.model')).default;

            // Fetch returns with pagination
            const [returns, total] = await Promise.all([
                ReturnOrder.find(filter)
                    .sort({ createdAt: -1 })
                    .skip((page - 1) * limit)
                    .limit(limit)
                    .select('-timeline'), // Exclude timeline for performance
                ReturnOrder.countDocuments(filter),
            ]);

            const pages = Math.ceil(total / limit);

            res.status(200).json({
                success: true,
                data: returns.map(ret => ({
                    returnId: ret.returnId,
                    orderId: ret.orderId,
                    status: ret.status,
                    returnReason: ret.returnReason,
                    refundAmount: ret.refundAmount,
                    createdAt: ret.createdAt,
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
                    sla: {
                        isBreached: ret.sla.isBreached,
                    },
                })),
                message: `Found ${total} return(s)`,
                metadata: {
                    pagination: {
                        page,
                        limit,
                        total,
                        pages,
                        hasNext: page < pages,
                        hasPrev: page > 1,
                    },
                    timestamp: new Date().toISOString(),
                },
            });
        } catch (error) {
            logger.error('List returns failed', {
                error: error instanceof Error ? error.message : String(error),
            });
            res.status(500).json({
                success: false,
                data: null,
                message: 'An error occurred while fetching returns',
            });
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

            const ReturnOrder = (await import('@/infrastructure/database/mongoose/models/logistics/returns/return-order.model')).default;
            const returnOrder = await ReturnOrder.findOne({ returnId });

            if (!returnOrder) {
                res.status(404).json({
                    success: false,
                    data: null,
                    message: 'Return not found',
                });
                return;
            }

            // Authorization check (customer can only see their own returns)
            if (req.user?.role === 'customer' && returnOrder.customerId?.toString() !== req.user._id) {
                res.status(403).json({
                    success: false,
                    data: null,
                    message: 'You do not have permission to view this return',
                });
                return;
            }

            res.status(200).json({
                success: true,
                data: {
                    returnId: returnOrder.returnId,
                    orderId: returnOrder.orderId,
                    shipmentId: returnOrder.shipmentId,
                    status: returnOrder.status,
                    returnReason: returnOrder.returnReason,
                    returnReasonText: returnOrder.returnReasonText,
                    customerComments: returnOrder.customerComments,
                    items: returnOrder.items,
                    refundAmount: returnOrder.refundAmount,
                    refundMethod: returnOrder.refundMethod,
                    pickup: returnOrder.pickup,
                    qc: returnOrder.qc,
                    refund: returnOrder.refund,
                    inventory: returnOrder.inventory,
                    sla: returnOrder.sla,
                    timeline: returnOrder.timeline.map(t => ({
                        status: t.status,
                        timestamp: t.timestamp,
                        action: t.action,
                        notes: t.notes,
                    })),
                    createdAt: returnOrder.createdAt,
                    updatedAt: returnOrder.updatedAt,
                },
                message: 'Return details retrieved successfully',
                metadata: {
                    timestamp: new Date().toISOString(),
                },
            });
        } catch (error) {
            logger.error('Get return details failed', {
                returnId: req.params.returnId,
                error: error instanceof Error ? error.message : String(error),
            });
            res.status(500).json({
                success: false,
                data: null,
                message: 'An error occurred while fetching return details',
            });
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
            const { returnId } = req.params;
            const validatedData = SchedulePickupSchema.parse(req.body);
            const performedBy = req.user?._id;

            if (!performedBy) {
                throw new AppError('User authentication required', 'UNAUTHORIZED', 401);
            }

            const returnOrder = await ReturnService.schedulePickup({
                returnId,
                scheduledDate: new Date(validatedData.scheduledDate),
                courierId: validatedData.courierId,
                performedBy,
            });

            res.status(200).json({
                success: true,
                data: {
                    returnId: returnOrder.returnId,
                    status: returnOrder.status,
                    pickup: {
                        status: returnOrder.pickup.status,
                        scheduledDate: returnOrder.pickup.scheduledDate,
                        awb: returnOrder.pickup.awb,
                        trackingUrl: returnOrder.pickup.trackingUrl,
                    },
                },
                message: 'Pickup scheduled successfully',
                metadata: {
                    timestamp: new Date().toISOString(),
                },
            });
        } catch (error) {
            if (error instanceof z.ZodError) {
                res.status(400).json({
                    success: false,
                    data: null,
                    message: 'Validation failed',
                    errors: error.errors,
                });
            } else if (error instanceof AppError) {
                res.status(error.statusCode).json({
                    success: false,
                    data: null,
                    message: error.message,
                });
            } else {
                logger.error('Schedule pickup failed', {
                    returnId: req.params.returnId,
                    error: error instanceof Error ? error.message : String(error),
                });
                res.status(500).json({
                    success: false,
                    data: null,
                    message: 'An error occurred while scheduling pickup',
                });
            }
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
            const { returnId } = req.params;
            const validatedData = RecordQCResultSchema.parse(req.body);
            const assignedTo = req.user?._id;

            if (!assignedTo) {
                throw new AppError('User authentication required', 'UNAUTHORIZED', 401);
            }

            const returnOrder = await ReturnService.recordQCResult({
                returnId,
                ...validatedData,
                assignedTo,
            });

            res.status(200).json({
                success: true,
                data: {
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
                },
                message: `QC ${validatedData.result}: ${validatedData.result === 'approved' ? 'Refund will be processed automatically' : 'Return rejected'}`,
                metadata: {
                    timestamp: new Date().toISOString(),
                },
            });
        } catch (error) {
            if (error instanceof z.ZodError) {
                res.status(400).json({
                    success: false,
                    data: null,
                    message: 'Validation failed',
                    errors: error.errors,
                });
            } else if (error instanceof AppError) {
                res.status(error.statusCode).json({
                    success: false,
                    data: null,
                    message: error.message,
                });
            } else {
                logger.error('Record QC result failed', {
                    returnId: req.params.returnId,
                    error: error instanceof Error ? error.message : String(error),
                });
                res.status(500).json({
                    success: false,
                    data: null,
                    message: 'An error occurred while recording QC result',
                });
            }
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

            res.status(200).json({
                success: true,
                data: {
                    returnId: returnOrder.returnId,
                    status: returnOrder.status,
                    refund: {
                        status: returnOrder.refund.status,
                        transactionId: returnOrder.refund.transactionId,
                        amount: returnOrder.calculateActualRefund(),
                        completedAt: returnOrder.refund.completedAt,
                    },
                },
                message: 'Refund processed successfully',
                metadata: {
                    timestamp: new Date().toISOString(),
                },
            });
        } catch (error) {
            if (error instanceof AppError) {
                res.status(error.statusCode).json({
                    success: false,
                    data: null,
                    message: error.message,
                });
            } else {
                logger.error('Process refund failed', {
                    returnId: req.params.returnId,
                    error: error instanceof Error ? error.message : String(error),
                });
                res.status(500).json({
                    success: false,
                    data: null,
                    message: 'An error occurred while processing refund',
                });
            }
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
            const { returnId } = req.params;
            const { reason } = req.body;
            const cancelledBy = req.user?._id;

            if (!cancelledBy) {
                throw new AppError('User authentication required', 'UNAUTHORIZED', 401);
            }

            if (!reason || reason.trim().length === 0) {
                throw new AppError('Cancellation reason is required', 'MISSING_REASON', 400);
            }

            const returnOrder = await ReturnService.cancelReturn(returnId, cancelledBy, reason);

            res.status(200).json({
                success: true,
                data: {
                    returnId: returnOrder.returnId,
                    status: returnOrder.status,
                    cancelledAt: returnOrder.cancelledAt,
                },
                message: 'Return cancelled successfully',
                metadata: {
                    timestamp: new Date().toISOString(),
                },
            });
        } catch (error) {
            if (error instanceof AppError) {
                res.status(error.statusCode).json({
                    success: false,
                    data: null,
                    message: error.message,
                });
            } else {
                logger.error('Cancel return failed', {
                    returnId: req.params.returnId,
                    error: error instanceof Error ? error.message : String(error),
                });
                res.status(500).json({
                    success: false,
                    data: null,
                    message: 'An error occurred while cancelling return',
                });
            }
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
            const companyId = req.user?.companyId || req.query.companyId as string;
            const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
            const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

            if (!companyId) {
                throw new AppError('Company ID is required', 'MISSING_COMPANY_ID', 400);
            }

            const dateRange = startDate && endDate ? { start: startDate, end: endDate } : undefined;
            const stats = await ReturnService.getReturnStats(companyId, dateRange);

            res.status(200).json({
                success: true,
                data: stats,
                message: 'Return statistics retrieved successfully',
                metadata: {
                    dateRange,
                    timestamp: new Date().toISOString(),
                },
            });
        } catch (error) {
            if (error instanceof AppError) {
                res.status(error.statusCode).json({
                    success: false,
                    data: null,
                    message: error.message,
                });
            } else {
                logger.error('Get return stats failed', {
                    error: error instanceof Error ? error.message : String(error),
                });
                res.status(500).json({
                    success: false,
                    data: null,
                    message: 'An error occurred while fetching return statistics',
                });
            }
        }
    }
}
