/**
 * Commission Analytics Controller
 */

import { Request, Response, NextFunction } from 'express';
import { CommissionAnalyticsService } from '../../../../core/application/services/commission/index';
import { AppError } from '../../../../shared/errors/index';
import { sendValidationError } from '../../../../shared/utils/responseHelper';
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
                throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
            }

            const validation = analyticsDateRangeSchema.safeParse(req.query);
            if (!validation.success) {
                const errors = validation.error.errors.map(err => ({
                    code: 'VALIDATION_ERROR',
                    message: err.message,
                    field: err.path.join('.'),
                }));
                sendValidationError(res, errors);
                return;
            }

            const { startDate, endDate } = validation.data;

            const metrics = await CommissionAnalyticsService.getCommissionMetrics(
                String(companyId),
                startDate && endDate
                    ? { start: new Date(startDate), end: new Date(endDate) }
                    : undefined
            );

            res.status(200).json({
                success: true,
                data: metrics,
            });
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
                throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
            }

            const validation = topPerformersQuerySchema.safeParse(req.query);
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

            const performers = await CommissionAnalyticsService.getTopPerformers(
                String(companyId),
                limit as number,
                startDate && endDate
                    ? { start: new Date(startDate), end: new Date(endDate) }
                    : undefined
            );

            res.status(200).json({
                success: true,
                data: performers,
            });
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
                throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
            }

            const validation = analyticsDateRangeSchema.safeParse(req.query);
            if (!validation.success) {
                const errors = validation.error.errors.map(err => ({
                    code: 'VALIDATION_ERROR',
                    message: err.message,
                    field: err.path.join('.'),
                }));
                sendValidationError(res, errors);
                return;
            }

            const { groupBy, startDate, endDate } = validation.data;

            if (!startDate || !endDate) {
                throw new AppError('Start date and end date are required for trend analysis', 'BAD_REQUEST', 400);
            }

            const trend = await CommissionAnalyticsService.getCommissionTrend(
                String(companyId),
                groupBy as 'day' | 'week' | 'month',
                { start: new Date(startDate), end: new Date(endDate) }
            );

            res.status(200).json({
                success: true,
                data: trend,
            });
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
                throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
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

            res.status(200).json({
                success: true,
                data: dashboard,
            });
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
                throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
            }

            const validation = analyticsDateRangeSchema.safeParse(req.query);
            const { startDate, endDate } = validation.success ? validation.data : {};

            const stats = await CommissionAnalyticsService.getPayoutStats(
                String(companyId),
                startDate && endDate
                    ? { start: new Date(startDate), end: new Date(endDate) }
                    : undefined
            );

            res.status(200).json({
                success: true,
                data: stats,
            });
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
                throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
            }

            const validation = generateReportSchema.safeParse(req.body);
            if (!validation.success) {
                const errors = validation.error.errors.map(err => ({
                    code: 'VALIDATION_ERROR',
                    message: err.message,
                    field: err.path.join('.'),
                }));
                sendValidationError(res, errors);
                return;
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
                res.status(200).json({
                    success: true,
                    data: report,
                });
            }
        } catch (error) {
            next(error);
        }
    }
}

export default CommissionAnalyticsController;
