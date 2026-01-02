/**
 * NDR Controller
 *
 * Handles NDR management and analytics endpoints.
 */

import { Request, Response, NextFunction } from 'express';
import NDREvent from '../../../../infrastructure/database/mongoose/models/NDREvent';
import NDRWorkflow from '../../../../infrastructure/database/mongoose/models/NDRWorkflow';
import NDRDetectionService from '../../../../core/application/services/ndr/NDRDetectionService';
import NDRClassificationService from '../../../../core/application/services/ndr/NDRClassificationService';
import NDRResolutionService from '../../../../core/application/services/ndr/NDRResolutionService';
import NDRAnalyticsService from '../../../../core/application/services/ndr/NDRAnalyticsService';
import { AppError } from '../../../../shared/errors';
import { sendValidationError } from '../../../../shared/utils/responseHelper';
import {
    listNDREventsQuerySchema,
    resolveNDRSchema,
    escalateNDRSchema,
    getNDRAnalyticsQuerySchema,
    getNDRTrendsQuerySchema,
    getTopNDRReasonsQuerySchema,
} from '../../../../shared/validation/ndr-schemas';
import winston from 'winston';

export class NDRController {
    /**
     * List NDR events
     * GET /ndr/events
     */
    static async listNDREvents(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const companyId = req.user?.companyId;
            if (!companyId) {
                throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
            }

            // Validate query parameters
            const validation = listNDREventsQuerySchema.safeParse(req.query);
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
                status,
                ndrType,
                page,
                limit,
                sortBy,
                sortOrder,
            } = validation.data;

            const filter: any = { company: companyId };

            if (status) {
                filter.status = status;
            }

            if (ndrType) {
                filter.ndrType = ndrType;
            }

            const skip = (page - 1) * limit;

            const [events, total] = await Promise.all([
                NDREvent.find(filter)
                    .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
                    .skip(skip)
                    .limit(limit)
                    .populate('shipment order'),
                NDREvent.countDocuments(filter),
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
     * Get NDR event by ID
     * GET /ndr/events/:id
     */
    static async getNDREvent(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            const companyId = req.user?.companyId;

            const ndrEvent = await NDREvent.findOne({ _id: id, company: companyId })
                .populate('shipment order');

            if (!ndrEvent) {
                throw new AppError('NDR event not found', 'NOT_FOUND', 404);
            }

            res.status(200).json({
                success: true,
                data: ndrEvent,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Manually resolve NDR
     * POST /ndr/events/:id/resolve
     */
    static async resolveNDR(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            const userId = req.user?._id;
            const companyId = req.user?.companyId;

            // Validate request body
            const validation = resolveNDRSchema.safeParse(req.body);
            if (!validation.success) {
                const errors = validation.error.errors.map(err => ({
                    code: 'VALIDATION_ERROR',
                    message: err.message,
                    field: err.path.join('.'),
                }));
                sendValidationError(res, errors);
                return;
            }

            const { resolution, notes, resolutionMethod } = validation.data;

            // Verify ownership
            const ndrEvent = await NDREvent.findOne({ _id: id, company: companyId });
            if (!ndrEvent) {
                throw new AppError('NDR event not found', 'NOT_FOUND', 404);
            }

            // Issue #15: Now passing all validated fields to service
            await NDRResolutionService.resolveNDR(id, resolution, userId || 'system', notes);

            res.status(200).json({
                success: true,
                message: 'NDR resolved successfully',
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Escalate NDR
     * POST /ndr/events/:id/escalate
     */
    static async escalateNDR(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            const companyId = req.user?.companyId;

            // Validate request body
            const validation = escalateNDRSchema.safeParse(req.body);
            if (!validation.success) {
                const errors = validation.error.errors.map(err => ({
                    code: 'VALIDATION_ERROR',
                    message: err.message,
                    field: err.path.join('.'),
                }));
                sendValidationError(res, errors);
                return;
            }

            const { reason, escalateTo, priority, notes } = validation.data;

            // Verify ownership
            const ndrEvent = await NDREvent.findOne({ _id: id, company: companyId });
            if (!ndrEvent) {
                throw new AppError('NDR event not found', 'NOT_FOUND', 404);
            }

            // Issue #15: Now passing all validated fields to service
            await NDRResolutionService.escalateNDR(id, reason, priority, escalateTo);

            res.status(200).json({
                success: true,
                message: 'NDR escalated successfully',
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Trigger workflow for NDR
     * POST /ndr/events/:id/trigger-workflow
     */
    static async triggerWorkflow(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            const companyId = req.user?.companyId;

            const ndrEvent = await NDREvent.findOne({ _id: id, company: companyId });
            if (!ndrEvent) {
                throw new AppError('NDR event not found', 'NOT_FOUND', 404);
            }

            await NDRResolutionService.executeResolutionWorkflow(id);

            res.status(200).json({
                success: true,
                message: 'Workflow triggered',
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get NDR statistics
     * GET /ndr/analytics/stats
     */
    static async getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const companyId = req.user?.companyId;
            if (!companyId) {
                throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
            }

            // Validate query parameters
            const validation = getNDRAnalyticsQuerySchema.safeParse(req.query);
            if (!validation.success) {
                const errors = validation.error.errors.map(err => ({
                    code: 'VALIDATION_ERROR',
                    message: err.message,
                    field: err.path.join('.'),
                }));
                sendValidationError(res, errors);
                return;
            }

            const { startDate, endDate, ndrType } = validation.data;

            let dateRange;
            if (startDate && endDate) {
                dateRange = {
                    start: new Date(startDate),
                    end: new Date(endDate),
                };
            }

            const stats = await NDRAnalyticsService.getNDRStats(companyId, dateRange);

            res.status(200).json({
                success: true,
                data: stats,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get NDR breakdown by type
     * GET /ndr/analytics/by-type
     */
    static async getByType(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const companyId = req.user?.companyId;
            if (!companyId) {
                throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
            }

            const byType = await NDRAnalyticsService.getNDRByType(companyId);

            res.status(200).json({
                success: true,
                data: byType,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get NDR trends
     * GET /ndr/analytics/trends
     */
    static async getTrends(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const companyId = req.user?.companyId;
            if (!companyId) {
                throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
            }

            // Validate query parameters
            const validation = getNDRTrendsQuerySchema.safeParse(req.query);
            if (!validation.success) {
                const errors = validation.error.errors.map(err => ({
                    code: 'VALIDATION_ERROR',
                    message: err.message,
                    field: err.path.join('.'),
                }));
                sendValidationError(res, errors);
                return;
            }

            const { startDate, endDate, groupBy } = validation.data;

            const dateRange = {
                start: startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                end: endDate ? new Date(endDate) : new Date(),
            };

            const trends = await NDRAnalyticsService.getNDRTrends(
                companyId,
                dateRange,
                groupBy
            );

            res.status(200).json({
                success: true,
                data: trends,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get resolution rates by action
     * GET /ndr/analytics/resolution-rates
     */
    static async getResolutionRates(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const companyId = req.user?.companyId;
            if (!companyId) {
                throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
            }

            const rates = await NDRAnalyticsService.getResolutionRates(companyId);

            res.status(200).json({
                success: true,
                data: rates,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get top NDR reasons
     * GET /ndr/analytics/top-reasons
     */
    static async getTopReasons(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const companyId = req.user?.companyId;
            if (!companyId) {
                throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
            }

            // Validate query parameters
            const validation = getTopNDRReasonsQuerySchema.safeParse(req.query);
            if (!validation.success) {
                const errors = validation.error.errors.map(err => ({
                    code: 'VALIDATION_ERROR',
                    message: err.message,
                    field: err.path.join('.'),
                }));
                sendValidationError(res, errors);
                return;
            }

            const { limit, startDate, endDate } = validation.data;

            const reasons = await NDRAnalyticsService.getTopNDRReasons(
                companyId,
                limit
            );

            res.status(200).json({
                success: true,
                data: reasons,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get dashboard summary
     * GET /ndr/dashboard
     */
    static async getDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const companyId = req.user?.companyId;
            if (!companyId) {
                throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
            }

            const dashboard = await NDRAnalyticsService.getDashboardSummary(companyId);

            res.status(200).json({
                success: true,
                data: dashboard,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Seed default workflows
     * POST /ndr/workflows/seed
     */
    static async seedWorkflows(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            await NDRWorkflow.seedDefaultWorkflows();

            res.status(200).json({
                success: true,
                message: 'Default workflows seeded',
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get workflows
     * GET /ndr/workflows
     */
    static async getWorkflows(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const companyId = req.user?.companyId;

            const workflows = await NDRWorkflow.find({
                $or: [{ isDefault: true }, { company: companyId }],
                isActive: true,
            });

            res.status(200).json({
                success: true,
                data: workflows,
            });
        } catch (error) {
            next(error);
        }
    }
}

export default NDRController;
