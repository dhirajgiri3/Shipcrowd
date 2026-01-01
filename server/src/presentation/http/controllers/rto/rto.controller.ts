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

            const {
                status,
                reason,
                page = '1',
                limit = '20',
                sortBy = 'triggeredAt',
                sortOrder = 'desc',
            } = req.query;

            const filter: any = { company: companyId };

            if (status) {
                filter.returnStatus = status;
            }

            if (reason) {
                filter.rtoReason = reason;
            }

            const pageNum = parseInt(page as string, 10);
            const limitNum = parseInt(limit as string, 10);
            const skip = (pageNum - 1) * limitNum;

            const [events, total] = await Promise.all([
                RTOEvent.find(filter)
                    .sort({ [sortBy as string]: sortOrder === 'asc' ? 1 : -1 })
                    .skip(skip)
                    .limit(limitNum)
                    .populate('shipment order warehouse'),
                RTOEvent.countDocuments(filter),
            ]);

            res.status(200).json({
                success: true,
                data: events,
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total,
                    pages: Math.ceil(total / limitNum),
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
            const { shipmentId, reason, ndrEventId } = req.body;
            const userId = req.user?._id;
            const companyId = req.user?.companyId;

            if (!shipmentId) {
                throw new AppError('Shipment ID required', 'VALIDATION_ERROR', 400);
            }

            const result = await RTOService.triggerRTO(
                shipmentId,
                reason || 'other',
                ndrEventId,
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
            const { status, metadata } = req.body;
            const companyId = req.user?.companyId;

            // Verify ownership
            const rtoEvent = await RTOEvent.findOne({ _id: id, company: companyId });
            if (!rtoEvent) {
                throw new AppError('RTO event not found', 'NOT_FOUND', 404);
            }

            await RTOService.updateRTOStatus(id, status, metadata);

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
            const { passed, remarks, images } = req.body;
            const userId = req.user?._id;
            const companyId = req.user?.companyId;

            // Verify ownership
            const rtoEvent = await RTOEvent.findOne({ _id: id, company: companyId });
            if (!rtoEvent) {
                throw new AppError('RTO event not found', 'NOT_FOUND', 404);
            }

            if (typeof passed !== 'boolean') {
                throw new AppError('QC result (passed) required', 'VALIDATION_ERROR', 400);
            }

            await RTOService.recordQCResult(id, {
                passed,
                remarks,
                images,
                inspectedBy: userId || 'system',
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

            const { startDate, endDate } = req.query;

            let dateRange;
            if (startDate && endDate) {
                dateRange = {
                    start: new Date(startDate as string),
                    end: new Date(endDate as string),
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
