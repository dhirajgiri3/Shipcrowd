/**
 * RTO Controller
 *
 * Handles RTO management endpoints.
 */

import { Request, Response, NextFunction } from 'express';
import RTOEvent from '../../../../infrastructure/database/mongoose/models/RTOEvent';
import RTOService from '../../../../core/application/services/rto/RTOService';
import NDRAnalyticsService from '../../../../core/application/services/ndr/NDRAnalyticsService';
import { AppError } from '../../../../shared/errors';
import { sendValidationError } from '../../../../shared/utils/responseHelper';
import {
    listRTOEventsQuerySchema,
    triggerManualRTOSchema,
    updateRTOStatusSchema,
    recordQCResultSchema,
    getRTOStatsQuerySchema,
    getPendingRTOsQuerySchema,
} from '../../../../shared/validation/rto-schemas';

export class RTOController {
    /**
     * List RTO events
     * GET /rto/events
     */
    static async listRTOEvents(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const companyId = req.user?.companyId;
            if (!companyId) {
                throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
            }

            // Validate query parameters
            const validation = listRTOEventsQuerySchema.safeParse(req.query);
            if (!validation.success) {
                const errors = validation.error.errors.map(err => ({
                    code: 'VALIDATION_ERROR',
                    message: err.message,
                    field: err.path.join('.'),
                }));
                sendValidationError(res, errors);
                return;
            }

            const {
                returnStatus,
                rtoReason,
                warehouseId,
                page,
                limit,
                sortBy,
                sortOrder,
            } = validation.data;

            const filter: any = { company: companyId };

            if (returnStatus) {
                filter.returnStatus = returnStatus;
            }

            if (rtoReason) {
                filter.rtoReason = rtoReason;
            }

            if (warehouseId) {
                filter.warehouse = warehouseId;
            }

            const skip = (page - 1) * limit;

            const [events, total] = await Promise.all([
                RTOEvent.find(filter)
                    .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
                    .skip(skip)
                    .limit(limit)
                    .populate('shipment order warehouse'),
                RTOEvent.countDocuments(filter),
            ]);

            res.status(200).json({
                success: true,
                data: events,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit),
                },
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get RTO event by ID
     * GET /rto/events/:id
     */
    static async getRTOEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            const companyId = req.user?.companyId;

            const rtoEvent = await RTOEvent.findOne({ _id: id, company: companyId })
                .populate('shipment order warehouse ndrEvent');

            if (!rtoEvent) {
                throw new AppError('RTO event not found', 'NOT_FOUND', 404);
            }

            res.status(200).json({
                success: true,
                data: rtoEvent,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Trigger RTO manually
     * POST /rto/trigger
     */
    static async triggerRTO(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const userId = req.user?._id;
            const companyId = req.user?.companyId;

            // Validate request body
            const validation = triggerManualRTOSchema.safeParse(req.body);
            if (!validation.success) {
                const errors = validation.error.errors.map(err => ({
                    code: 'VALIDATION_ERROR',
                    message: err.message,
                    field: err.path.join('.'),
                }));
                sendValidationError(res, errors);
                return;
            }

            const { shipmentId, reason, notes, warehouseId, expectedReturnDate } = validation.data;

            const result = await RTOService.triggerRTO(
                shipmentId,
                reason,
                undefined, // ndrEventId
                'manual',
                userId
            );

            if (!result.success) {
                throw new AppError(result.error || 'Failed to trigger RTO', 'RTO_ERROR', 400);
            }

            res.status(200).json({
                success: true,
                data: {
                    rtoEventId: result.rtoEventId,
                    reverseAwb: result.reverseAwb,
                },
                message: 'RTO triggered successfully',
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Update RTO status
     * PATCH /rto/events/:id/status
     */
    static async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            const companyId = req.user?.companyId;

            // Validate request body
            const validation = updateRTOStatusSchema.safeParse(req.body);
            if (!validation.success) {
                const errors = validation.error.errors.map(err => ({
                    code: 'VALIDATION_ERROR',
                    message: err.message,
                    field: err.path.join('.'),
                }));
                sendValidationError(res, errors);
                return;
            }

            const { returnStatus, notes, actualReturnDate, reverseAwb } = validation.data;

            // Verify ownership
            const rtoEvent = await RTOEvent.findOne({ _id: id, company: companyId });
            if (!rtoEvent) {
                throw new AppError('RTO event not found', 'NOT_FOUND', 404);
            }

            await RTOService.updateRTOStatus(id, returnStatus, {
                notes,
                actualReturnDate,
                reverseAwb,
            });

            res.status(200).json({
                success: true,
                message: 'RTO status updated',
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Record QC result
     * POST /rto/events/:id/qc
     */
    static async recordQC(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            const userId = req.user?._id;
            const companyId = req.user?.companyId;

            // Validate request body
            const validation = recordQCResultSchema.safeParse(req.body);
            if (!validation.success) {
                const errors = validation.error.errors.map(err => ({
                    code: 'VALIDATION_ERROR',
                    message: err.message,
                    field: err.path.join('.'),
                }));
                sendValidationError(res, errors);
                return;
            }

            const { qcResult, nextAction } = validation.data;

            // Verify ownership
            const rtoEvent = await RTOEvent.findOne({ _id: id, company: companyId });
            if (!rtoEvent) {
                throw new AppError('RTO event not found', 'NOT_FOUND', 404);
            }

            await RTOService.recordQCResult(id, {
                ...qcResult,
                inspectedBy: qcResult.inspectedBy || userId || 'system',
            });

            res.status(200).json({
                success: true,
                message: 'QC result recorded',
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get RTO statistics
     * GET /rto/analytics/stats
     */
    static async getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const companyId = req.user?.companyId;
            if (!companyId) {
                throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
            }

            // Validate query parameters
            const validation = getRTOStatsQuerySchema.safeParse(req.query);
            if (!validation.success) {
                const errors = validation.error.errors.map(err => ({
                    code: 'VALIDATION_ERROR',
                    message: err.message,
                    field: err.path.join('.'),
                }));
                sendValidationError(res, errors);
                return;
            }

            const { startDate, endDate, warehouseId, rtoReason } = validation.data;

            let dateRange;
            if (startDate && endDate) {
                dateRange = {
                    start: new Date(startDate),
                    end: new Date(endDate),
                };
            }

            const stats = await NDRAnalyticsService.getRTOStats(companyId, dateRange);

            res.status(200).json({
                success: true,
                data: stats,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get pending RTOs
     * GET /rto/pending
     */
    static async getPendingRTOs(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const companyId = req.user?.companyId;
            if (!companyId) {
                throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
            }

            // Validate query parameters
            const validation = getPendingRTOsQuerySchema.safeParse(req.query);
            if (!validation.success) {
                const errors = validation.error.errors.map(err => ({
                    code: 'VALIDATION_ERROR',
                    message: err.message,
                    field: err.path.join('.'),
                }));
                sendValidationError(res, errors);
                return;
            }

            const { warehouseId, daysUntilReturn } = validation.data;

            const pendingRTOs = await RTOEvent.getPendingRTOs(companyId);

            res.status(200).json({
                success: true,
                data: pendingRTOs,
            });
        } catch (error) {
            next(error);
        }
    }
}

export default RTOController;
