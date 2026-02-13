/**
 * NDR Controller
 *
 * Handles NDR management and analytics endpoints.
 */

import { Request, Response, NextFunction } from 'express';
import { NDREvent, NDRWorkflow, Order, Shipment } from '../../../../infrastructure/database/mongoose/models';
import { ValidationError, NotFoundError } from '../../../../shared/errors/app.error';
import { ErrorCode } from '../../../../shared/errors/errorCodes';
import { sendSuccess } from '../../../../shared/utils/responseHelper';
import NDRResolutionService from '../../../../core/application/services/ndr/ndr-resolution.service';
import NDRAnalyticsService from '../../../../core/application/services/ndr/ndr-analytics.service';
import { NDRDataTransformerService } from '../../../../core/application/services/ndr/ndr-data-transformer.service';
import { guardChecks, requireCompanyContext } from '../../../../shared/helpers/controller.helpers';
import {
    listNDREventsQuerySchema,
    resolveNDRSchema,
    takeNDRActionSchema,
    escalateNDRSchema,
    getNDRAnalyticsQuerySchema,
    getNDRTrendsQuerySchema,
    getTopNDRReasonsQuerySchema,
} from '../../../../shared/validation/ndr-schemas';
import mongoose from 'mongoose';
import logger from '../../../../shared/logger/winston.logger';

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');


export class NDRController {
    /**
     * List NDR events
     * GET /ndr/events
     */
    static async listNDREvents(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const auth = guardChecks(req);
            requireCompanyContext(auth);
            const companyId = auth.companyId;

            // Validate query parameters
            const validation = listNDREventsQuerySchema.safeParse(req.query);
            if (!validation.success) {
                const errors = validation.error.errors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message,
                }));
                throw new ValidationError('Validation failed', errors);
            }

            const {
                status,
                ndrType,
                search,
                startDate,
                endDate,
                page,
                limit,
                sortBy,
                sortOrder,
            } = validation.data;

            const companyObjectId = new mongoose.Types.ObjectId(companyId);
            const filter: any = { company: companyObjectId };

            logger.info('NDR listNDREvents - Query Debug', {
                companyId,
                companyIdType: typeof companyId,
                objectId: companyObjectId,
                filter,
                status,
                ndrType,
                search,
                startDate,
                endDate,
            });

            // Map frontend status values to backend queries
            if (status) {
                switch (status) {
                    case 'open':
                        filter.status = 'detected';
                        break;
                    case 'in_progress':
                    case 'customer_action':
                        filter.status = 'in_resolution';
                        break;
                    case 'rto':
                        filter.status = 'rto_triggered';
                        break;
                    case 'action_required':
                        // Action required includes both detected and in_resolution
                        filter.status = { $in: ['detected', 'in_resolution'] };
                        break;
                    case 'reattempt_scheduled':
                        filter.status = 'in_resolution';
                        break;
                    case 'converted_to_rto':
                        filter.status = 'rto_triggered';
                        break;
                    default:
                        filter.status = status;
                }
            }

            if (ndrType) {
                filter.ndrType = ndrType;
            }

            if (startDate || endDate) {
                filter.detectedAt = {};
                if (startDate) {
                    filter.detectedAt.$gte = new Date(startDate);
                }
                if (endDate) {
                    filter.detectedAt.$lte = new Date(endDate);
                }
            }

            if (search) {
                const searchRegex = new RegExp(escapeRegex(search), 'i');
                const searchClauses: any[] = [
                    { awb: searchRegex },
                    { ndrReason: searchRegex },
                    { ndrReasonClassified: searchRegex },
                ];

                if (mongoose.isValidObjectId(search)) {
                    const searchObjectId = new mongoose.Types.ObjectId(search);
                    searchClauses.push(
                        { _id: searchObjectId },
                        { shipment: searchObjectId },
                        { order: searchObjectId }
                    );
                }

                const [shipmentMatches, orderMatches] = await Promise.all([
                    Shipment.find({
                        companyId: companyObjectId,
                        trackingNumber: searchRegex,
                    })
                        .select('_id')
                        .limit(200)
                        .lean(),
                    Order.find({
                        companyId: companyObjectId,
                        $or: [
                            { orderNumber: searchRegex },
                            { 'customerInfo.name': searchRegex },
                            { 'customerInfo.phone': searchRegex },
                        ],
                    })
                        .select('_id')
                        .limit(200)
                        .lean(),
                ]);

                if (shipmentMatches.length > 0) {
                    searchClauses.push({ shipment: { $in: shipmentMatches.map((row: any) => row._id) } });
                }

                if (orderMatches.length > 0) {
                    searchClauses.push({ order: { $in: orderMatches.map((row: any) => row._id) } });
                }

                filter.$or = searchClauses;
            }

            const skip = (page - 1) * limit;

            const [events, total] = await Promise.all([
                NDREvent.find(filter)
                    .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
                    .skip(skip)
                    .limit(limit)
                    .populate('shipment order')
                    .lean(),
                NDREvent.countDocuments(filter),
            ]);

            // Transform events to match frontend expectations
            const transformedCases = NDRDataTransformerService.transformNDREvents(events);

            sendSuccess(res, {
                cases: transformedCases, // ✅ Changed from 'data' to 'cases'
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit), // ✅ Changed from 'pages' to 'totalPages'
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
            const auth = guardChecks(req);
            requireCompanyContext(auth);
            const { id } = req.params;
            const companyId = auth.companyId;

            const ndrEvent = await NDREvent.findOne({ _id: id, company: new mongoose.Types.ObjectId(companyId) })
                .populate('shipment order')
                .lean();

            if (!ndrEvent) {
                throw new NotFoundError('NDR event', ErrorCode.RES_NOT_FOUND);
            }

            // Transform single event
            const transformedCase = NDRDataTransformerService.transformNDREvent(ndrEvent);

            sendSuccess(res, transformedCase); // ✅ Return transformed data directly
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
            const auth = guardChecks(req);
            requireCompanyContext(auth);
            const { id } = req.params;
            const userId = auth.userId;
            const companyId = auth.companyId;

            // Validate request body
            const validation = resolveNDRSchema.safeParse(req.body);
            if (!validation.success) {
                const errors = validation.error.errors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message,
                }));
                throw new ValidationError('Validation failed', errors);
            }

            const { resolution, notes, resolutionMethod } = validation.data;

            // Verify ownership
            const ndrEvent = await NDREvent.findOne({ _id: id, company: new mongoose.Types.ObjectId(companyId) });
            if (!ndrEvent) {
                throw new NotFoundError('NDR event', ErrorCode.RES_NOT_FOUND);
            }

            // Issue #15: Now passing all validated fields to service
            await NDRResolutionService.resolveNDR(id, resolution, userId || 'system', notes);

            sendSuccess(res, null, 'NDR resolved successfully');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Take an action on NDR (seller/admin initiated)
     * POST /ndr/events/:id/action
     */
    static async takeAction(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const auth = guardChecks(req);
            requireCompanyContext(auth);
            const { id } = req.params;
            const userId = auth.userId || 'system';
            const companyObjectId = new mongoose.Types.ObjectId(auth.companyId);

            const validation = takeNDRActionSchema.safeParse(req.body);
            if (!validation.success) {
                const errors = validation.error.errors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message,
                }));
                throw new ValidationError('Validation failed', errors);
            }

            const ownership = await NDREvent.findOne({ _id: id, company: companyObjectId }).select('_id');
            if (!ownership) {
                throw new NotFoundError('NDR event', ErrorCode.RES_NOT_FOUND);
            }

            const {
                action,
                notes,
                newAddress,
                newDeliveryDate,
                communicationChannel,
            } = validation.data;

            await NDRResolutionService.takeAction(id, action, userId, {
                notes,
                newAddress,
                newDeliveryDate,
                communicationChannel,
            });

            const updated = await NDREvent.findOne({ _id: id, company: companyObjectId })
                .populate('shipment order')
                .lean();

            if (!updated) {
                throw new NotFoundError('NDR event', ErrorCode.RES_NOT_FOUND);
            }

            const transformedCase = NDRDataTransformerService.transformNDREvent(updated);
            sendSuccess(res, transformedCase, 'NDR action executed successfully');
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
            const auth = guardChecks(req);
            requireCompanyContext(auth);
            const { id } = req.params;

            // Validate request body
            const validation = escalateNDRSchema.safeParse(req.body);
            if (!validation.success) {
                const errors = validation.error.errors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message,
                }));
                throw new ValidationError('Validation failed', errors);
            }

            const { reason, escalateTo, priority, notes } = validation.data;

            // Verify ownership
            const ndrEvent = await NDREvent.findOne({ _id: id, company: new mongoose.Types.ObjectId(auth.companyId) });
            if (!ndrEvent) {
                throw new NotFoundError('NDR event', ErrorCode.RES_NOT_FOUND);
            }

            // Issue #15: Now passing all validated fields to service
            await NDRResolutionService.escalateNDR(id, reason, priority, escalateTo);

            sendSuccess(res, null, 'NDR escalated successfully');
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
            const auth = guardChecks(req);
            requireCompanyContext(auth);
            const { id } = req.params;
            const companyId = auth.companyId;

            const ndrEvent = await NDREvent.findOne({ _id: id, company: new mongoose.Types.ObjectId(companyId) });
            if (!ndrEvent) {
                throw new NotFoundError('NDR event', ErrorCode.RES_NOT_FOUND);
            }

            await NDRResolutionService.executeResolutionWorkflow(id);

            sendSuccess(res, null, 'Workflow triggered');
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
            const auth = guardChecks(req);
            requireCompanyContext(auth);
            const companyId = auth.companyId;

            // Validate query parameters
            const validation = getNDRAnalyticsQuerySchema.safeParse(req.query);
            if (!validation.success) {
                const errors = validation.error.errors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message,
                }));
                throw new ValidationError('Validation failed', errors);
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

            sendSuccess(res, { data: stats });
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
            const auth = guardChecks(req);
            requireCompanyContext(auth);
            const companyId = auth.companyId;

            const byType = await NDRAnalyticsService.getNDRByType(companyId);

            sendSuccess(res, { data: byType });
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
            const auth = guardChecks(req);
            requireCompanyContext(auth);
            const companyId = auth.companyId;

            // Validate query parameters
            const validation = getNDRTrendsQuerySchema.safeParse(req.query);
            if (!validation.success) {
                const errors = validation.error.errors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message,
                }));
                throw new ValidationError('Validation failed', errors);
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

            sendSuccess(res, { data: trends });
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
            const auth = guardChecks(req);
            requireCompanyContext(auth);
            const companyId = auth.companyId;

            const rates = await NDRAnalyticsService.getResolutionRates(companyId);

            sendSuccess(res, { data: rates });
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
            const auth = guardChecks(req);
            requireCompanyContext(auth);
            const companyId = auth.companyId;

            // Validate query parameters
            const validation = getTopNDRReasonsQuerySchema.safeParse(req.query);
            if (!validation.success) {
                const errors = validation.error.errors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message,
                }));
                throw new ValidationError('Validation failed', errors);
            }

            const { limit, startDate, endDate } = validation.data;

            const reasons = await NDRAnalyticsService.getTopNDRReasons(
                companyId,
                limit
            );

            sendSuccess(res, { data: reasons });
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
            const auth = guardChecks(req);
            requireCompanyContext(auth);
            const companyId = auth.companyId;

            const dashboard = await NDRAnalyticsService.getDashboardSummary(companyId);

            sendSuccess(res, { data: dashboard });
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

            sendSuccess(res, null, 'Default workflows seeded');
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
            const auth = guardChecks(req);
            requireCompanyContext(auth);
            const companyId = auth.companyId;

            const workflows = await NDRWorkflow.find({
                $or: [{ isDefault: true }, { company: new mongoose.Types.ObjectId(companyId) }],
                isActive: true,
            });

            sendSuccess(res, { data: workflows });
        } catch (error) {
            next(error);
        }
    }
}

export default NDRController;
