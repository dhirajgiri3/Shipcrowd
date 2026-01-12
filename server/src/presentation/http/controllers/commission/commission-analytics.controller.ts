/**
 * Commission Analytics Controller
 */

import { Request, Response, NextFunction } from 'express';
import { CommissionAnalyticsService } from '../../../../core/application/services/commission/index';
import { AppError, ValidationError, AuthenticationError } from '../../../../shared/errors/app.error';
import { ErrorCode } from '../../../../shared/errors/errorCodes';
import { sendSuccess } from '../../../../shared/utils/responseHelper';
import {
    analyticsDateRangeSchema,
    generateReportSchema,
    topPerformersQuerySchema,
} from '../../../../shared/validation/commission-schemas';

export class CommissionAnalyticsController {
    /**
     * Get commission metrics
     * GET /commission/analytics/metrics
     */
    static async getMetrics(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const companyId = req.user?.companyId;

            if (!companyId) {
                throw new AuthenticationError('Authentication required', ErrorCode.AUTH_REQUIRED);
            }

            const validation = analyticsDateRangeSchema.safeParse(req.query);
            if (!validation.success) {
                const errors = validation.error.errors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message,
                }));
                throw new ValidationError('Validation failed', errors);
            }

            const { startDate, endDate } = validation.data;

            const metrics = await CommissionAnalyticsService.getCommissionMetrics(
                String(companyId),
                startDate && endDate
                    ? { start: new Date(startDate), end: new Date(endDate) }
                    : undefined
            );

            sendSuccess(res, metrics, 'Commission metrics retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get top performers
     * GET /commission/analytics/top-performers
     */
    static async getTopPerformers(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const companyId = req.user?.companyId;

            if (!companyId) {
                throw new AuthenticationError('Authentication required', ErrorCode.AUTH_REQUIRED);
            }

            const validation = topPerformersQuerySchema.safeParse(req.query);
            if (!validation.success) {
                const errors = validation.error.errors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message,
                }));
                throw new ValidationError('Validation failed', errors);
            }

            const { limit, startDate, endDate } = validation.data;

            const performers = await CommissionAnalyticsService.getTopPerformers(
                String(companyId),
                limit as number,
                startDate && endDate
                    ? { start: new Date(startDate), end: new Date(endDate) }
                    : undefined
            );

            sendSuccess(res, performers, 'Top performers retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get commission trend
     * GET /commission/analytics/trend
     */
    static async getTrend(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const companyId = req.user?.companyId;

            if (!companyId) {
                throw new AuthenticationError('Authentication required', ErrorCode.AUTH_REQUIRED);
            }

            const validation = analyticsDateRangeSchema.safeParse(req.query);
            if (!validation.success) {
                const errors = validation.error.errors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message,
                }));
                throw new ValidationError('Validation failed', errors);
            }

            const { groupBy, startDate, endDate } = validation.data;

            if (!startDate || !endDate) {
                throw new ValidationError('Start date and end date are required for trend analysis');
            }

            const trend = await CommissionAnalyticsService.getCommissionTrend(
                String(companyId),
                groupBy as 'day' | 'week' | 'month',
                { start: new Date(startDate), end: new Date(endDate) }
            );

            sendSuccess(res, trend, 'Commission trend retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get sales rep dashboard
     * GET /commission/analytics/dashboard/:salesRepId
     */
    static async getSalesRepDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const companyId = req.user?.companyId;
            const { salesRepId } = req.params;

            if (!companyId) {
                throw new AuthenticationError('Authentication required', ErrorCode.AUTH_REQUIRED);
            }

            const validation = analyticsDateRangeSchema.safeParse(req.query);
            const { startDate, endDate } = validation.success ? validation.data : {};

            const dashboard = await CommissionAnalyticsService.getSalesRepDashboard(
                salesRepId,
                String(companyId),
                startDate && endDate
                    ? { start: new Date(startDate), end: new Date(endDate) }
                    : undefined
            );

            sendSuccess(res, dashboard, 'Sales rep dashboard retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get payout statistics
     * GET /commission/analytics/payout-stats
     */
    static async getPayoutStats(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const companyId = req.user?.companyId;

            if (!companyId) {
                throw new AuthenticationError('Authentication required', ErrorCode.AUTH_REQUIRED);
            }

            const validation = analyticsDateRangeSchema.safeParse(req.query);
            const { startDate, endDate } = validation.success ? validation.data : {};

            const stats = await CommissionAnalyticsService.getPayoutStats(
                String(companyId),
                startDate && endDate
                    ? { start: new Date(startDate), end: new Date(endDate) }
                    : undefined
            );

            sendSuccess(res, stats, 'Payout stats retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Generate commission report
     * POST /commission/analytics/reports
     */
    static async generateReport(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const companyId = req.user?.companyId;

            if (!companyId) {
                throw new AuthenticationError('Authentication required', ErrorCode.AUTH_REQUIRED);
            }

            const validation = generateReportSchema.safeParse(req.body);
            if (!validation.success) {
                const errors = validation.error.errors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message,
                }));
                throw new ValidationError('Validation failed', errors);
            }

            const { startDate, endDate, format } = validation.data;

            const report = await CommissionAnalyticsService.generateReport(
                String(companyId),
                { start: new Date(startDate), end: new Date(endDate) },
                format as 'csv' | 'json'
            );

            if (format === 'csv') {
                res.setHeader('Content-Type', 'text/csv');
                res.setHeader('Content-Disposition', `attachment; filename=commission-report-${Date.now()}.csv`);
                res.status(200).send(report);
            } else {
                sendSuccess(res, report, 'Commission report generated successfully');
            }
        } catch (error) {
            next(error);
        }
    }
}

export default CommissionAnalyticsController;
