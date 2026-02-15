import { Request, Response, NextFunction } from 'express';
import { guardChecks, requireCompanyContext } from '../../../../shared/helpers/controller.helpers';
import { ValidationError } from '../../../../shared/errors/app.error';
import { sendSuccess } from '../../../../shared/utils/responseHelper';
import NDRAnalyticsService from '../../../../core/application/services/ndr/ndr-analytics.service';
import { z } from 'zod';
import { parseQueryDateRange } from '../../../../shared/utils/dateRange';
import { isPlatformAdmin } from '../../../../shared/utils/role-helpers';
import mongoose from 'mongoose';

export class NDRAnalyticsController {

    /**
     * Get NDR Stats/Metrics
     * GET /ndr/analytics/stats
     */
    static async getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const auth = guardChecks(req, { requireCompany: false });
            const isAdmin = isPlatformAdmin(req.user ?? {});
            const requestedCompanyId = typeof req.query.companyId === 'string' ? req.query.companyId : undefined;
            if (!isAdmin) {
                requireCompanyContext(auth);
            } else if (requestedCompanyId && !mongoose.isValidObjectId(requestedCompanyId)) {
                throw new ValidationError('Invalid query parameters');
            }
            const companyId = isAdmin ? requestedCompanyId : auth.companyId;

            const schema = z.object({
                startDate: z.string().optional(),
                endDate: z.string().optional(),
                companyId: z.string().optional(),
            });

            const validation = schema.safeParse(req.query);
            if (!validation.success) {
                throw new ValidationError('Invalid query parameters');
            }

            const { startDate, endDate } = validation.data;
            const parsedRange = parseQueryDateRange(startDate, endDate);
            const dateRange = (parsedRange.startDate && parsedRange.endDate)
                ? { start: parsedRange.startDate, end: parsedRange.endDate }
                : undefined;

            const stats = await NDRAnalyticsService.getNDRStats(companyId, dateRange);

            // Transform to match frontend NDRMetrics interface
            const metrics = {
                total: stats.total,
                open: stats.detected || 0,
                inProgress: stats.inResolution || 0,
                resolved: stats.resolved,
                escalated: stats.escalated,
                convertedToRTO: stats.rtoTriggered,
                slaBreach: stats.slaBreach || 0,
                resolutionRate: stats.resolutionRate,
                averageResolutionTime: stats.avgResolutionTime
            };

            sendSuccess(res, metrics);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get Customer Self-Service Metrics
     * GET /ndr/analytics/self-service
     */
    static async getSelfServiceMetrics(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const auth = guardChecks(req);
            requireCompanyContext(auth);
            const companyId = auth.companyId;

            // Simple validation for date range query params
            const schema = z.object({
                startDate: z.string().optional(),
                endDate: z.string().optional(),
            });

            const validation = schema.safeParse(req.query);
            if (!validation.success) {
                throw new ValidationError('Invalid query parameters');
            }

            const { startDate, endDate } = validation.data;
            const parsedRange = parseQueryDateRange(startDate, endDate);
            const dateRange = (parsedRange.startDate && parsedRange.endDate)
                ? { start: parsedRange.startDate, end: parsedRange.endDate }
                : undefined;

            const metrics = await NDRAnalyticsService.getCustomerSelfServiceMetrics(companyId, dateRange);
            sendSuccess(res, { data: metrics });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get Prevention Layer Metrics
     * GET /ndr/analytics/prevention
     */
    static async getPreventionMetrics(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const auth = guardChecks(req);
            requireCompanyContext(auth);
            const companyId = auth.companyId;

            const schema = z.object({
                startDate: z.string().optional(),
                endDate: z.string().optional(),
            });
            const validation = schema.safeParse(req.query);
            if (!validation.success) throw new ValidationError('Invalid query parameters');

            const { startDate, endDate } = validation.data;
            const parsedRange = parseQueryDateRange(startDate, endDate);
            const dateRange = (parsedRange.startDate && parsedRange.endDate)
                ? { start: parsedRange.startDate, end: parsedRange.endDate }
                : undefined;

            const metrics = await NDRAnalyticsService.getPreventionLayerMetrics(companyId, dateRange);
            sendSuccess(res, { data: metrics });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get ROI Metrics
     * GET /ndr/analytics/roi
     */
    static async getROIMetrics(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const auth = guardChecks(req);
            requireCompanyContext(auth);
            const companyId = auth.companyId;

            const schema = z.object({
                startDate: z.string().optional(),
                endDate: z.string().optional(),
            });
            const validation = schema.safeParse(req.query);
            if (!validation.success) throw new ValidationError('Invalid query parameters');

            const { startDate, endDate } = validation.data;
            const parsedRange = parseQueryDateRange(startDate, endDate);
            const dateRange = (parsedRange.startDate && parsedRange.endDate)
                ? { start: parsedRange.startDate, end: parsedRange.endDate }
                : undefined;

            const metrics = await NDRAnalyticsService.getROIMetrics(companyId, dateRange);
            sendSuccess(res, { data: metrics });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get Weekly Trends
     * GET /ndr/analytics/weekly-trends
     */
    static async getWeeklyTrends(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const auth = guardChecks(req);
            requireCompanyContext(auth);
            const companyId = auth.companyId;

            const schema = z.object({
                weeks: z.string().optional().transform(val => val ? parseInt(val, 10) : 4),
            });

            const validation = schema.safeParse(req.query);
            if (!validation.success) throw new ValidationError('Invalid query parameters');

            const { weeks } = validation.data;
            const data = await NDRAnalyticsService.getWeeklyTrendAnalysis(companyId, weeks);
            sendSuccess(res, { data });
        } catch (error) {
            next(error);
        }
    }
}

export default NDRAnalyticsController;
