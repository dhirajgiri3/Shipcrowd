import { Request, Response, NextFunction } from 'express';
import { AuthenticationError, ValidationError } from '../../../../shared/errors/app.error';
import { ErrorCode } from '../../../../shared/errors/errorCodes';
import { sendSuccess } from '../../../../shared/utils/responseHelper';
import NDRAnalyticsService from '../../../../core/application/services/ndr/ndr-analytics.service';
import { z } from 'zod';

export class NDRAnalyticsController {

    /**
     * Get Customer Self-Service Metrics
     * GET /ndr/analytics/self-service
     */
    static async getSelfServiceMetrics(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const companyId = req.user?.companyId;
            if (!companyId) {
                throw new AuthenticationError('Unauthorized', ErrorCode.AUTH_REQUIRED);
            }

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
            const dateRange = (startDate && endDate) ? { start: new Date(startDate), end: new Date(endDate) } : undefined;

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
            const companyId = req.user?.companyId;
            if (!companyId) throw new AuthenticationError('Unauthorized');

            const schema = z.object({
                startDate: z.string().optional(),
                endDate: z.string().optional(),
            });
            const validation = schema.safeParse(req.query);
            if (!validation.success) throw new ValidationError('Invalid query parameters');

            const { startDate, endDate } = validation.data;
            const dateRange = (startDate && endDate) ? { start: new Date(startDate), end: new Date(endDate) } : undefined;

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
            const companyId = req.user?.companyId;
            if (!companyId) throw new AuthenticationError('Unauthorized');

            const schema = z.object({
                startDate: z.string().optional(),
                endDate: z.string().optional(),
            });
            const validation = schema.safeParse(req.query);
            if (!validation.success) throw new ValidationError('Invalid query parameters');

            const { startDate, endDate } = validation.data;
            const dateRange = (startDate && endDate) ? { start: new Date(startDate), end: new Date(endDate) } : undefined;

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
            const companyId = req.user?.companyId;
            if (!companyId) throw new AuthenticationError('Unauthorized');

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
