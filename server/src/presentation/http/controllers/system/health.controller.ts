import { NextFunction, Request, Response } from 'express';
import ServiceLevelPricingMetricsService from '../../../../core/application/services/metrics/service-level-pricing-metrics.service';
import SystemHealthService from '../../../../core/application/services/system/system-health.service';
import logger from '../../../../shared/logger/winston.logger';
import { sendSuccess } from '../../../../shared/utils/responseHelper';

/**
 * System Health Controller
 * Endpoints for monitoring application health
 */

/**
 * GET /api/v1/health
 * Basic health check (lightweight, fast)
 * Public endpoint for load balancers and monitoring tools
 */
export const basicHealthCheck = async (_req: Request, res: Response, _next: NextFunction): Promise<void> => {
    try {
        const healthCheck = await SystemHealthService.basicHealthCheck();

        if (healthCheck.status === 'unhealthy') {
            res.status(503).json({
                success: false,
                code: 'SERVICE_UNAVAILABLE',
                message: healthCheck.message,
                data: healthCheck,
            });
            return;
        }

        res.status(200).json({
            success: true,
            message: healthCheck.message,
            data: healthCheck,
        });
    } catch (error) {
        logger.error('Basic health check error:', error);
        res.status(503).json({
            success: false,
            code: 'HEALTH_CHECK_FAILED',
            message: 'Health check failed',
            data: {
                error: error instanceof Error ? error.message : 'Unknown error',
            },
        });
    }
};

/**
 * GET /api/v1/health/detailed
 * Comprehensive health report
 * Admin-only endpoint
 */
export const detailedHealthCheck = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const healthReport = await SystemHealthService.getHealthReport();

        if (healthReport.overall === 'unhealthy') {
            res.status(503).json({
                success: false,
                code: 'SERVICE_DEGRADED',
                message: 'System health is degraded or unhealthy',
                data: healthReport,
            });
            return;
        }

        sendSuccess(res, healthReport, 'Detailed health report retrieved successfully');
    } catch (error) {
        logger.error('Detailed health check error:', error);
        next(error);
    }
};

/**
 * GET /api/v1/health/metrics
 * API metrics only
 * Admin-only endpoint
 */
export const getApiMetrics = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const metrics = SystemHealthService.getApiMetrics();
        const serviceLevelPricing = ServiceLevelPricingMetricsService.getSnapshot();

        sendSuccess(res, { metrics, serviceLevelPricing }, 'API metrics retrieved successfully');
    } catch (error) {
        logger.error('API metrics error:', error);
        next(error);
    }
};

/**
 * GET /api/v1/health/database
 * Database health check
 * Admin-only endpoint
 */
export const checkDatabaseHealth = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const healthReport = await SystemHealthService.getHealthReport();

        if (healthReport.database.status === 'unhealthy') {
            res.status(503).json({
                success: false,
                code: 'DATABASE_UNHEALTHY',
                message: 'Database is unhealthy',
                data: { database: healthReport.database },
            });
            return;
        }

        sendSuccess(res, { database: healthReport.database }, 'Database health check completed');
    } catch (error) {
        logger.error('Database health check error:', error);
        next(error);
    }
};

/**
 * GET /api/v1/health/services
 * External services health check
 * Admin-only endpoint
 */
export const checkExternalServicesHealth = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const healthReport = await SystemHealthService.getHealthReport();

        const unhealthyServices = healthReport.externalServices.filter((s) => s.status === 'unhealthy');

        if (unhealthyServices.length > 0) {
            logger.warn('Unhealthy external services detected', {
                services: unhealthyServices.map((s) => s.name),
            });
        }

        sendSuccess(
            res,
            {
                services: healthReport.externalServices,
                summary: {
                    total: healthReport.externalServices.length,
                    healthy: healthReport.externalServices.filter((s) => s.status === 'healthy').length,
                    degraded: healthReport.externalServices.filter((s) => s.status === 'degraded').length,
                    unhealthy: unhealthyServices.length,
                },
            },
            'External services health check completed'
        );
    } catch (error) {
        logger.error('External services health check error:', error);
        next(error);
    }
};

/**
 * GET /api/v1/health/system
 * System metrics (CPU, memory, etc.)
 * Admin-only endpoint
 */
export const getSystemMetrics = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const healthReport = await SystemHealthService.getHealthReport();

        sendSuccess(res, { systemMetrics: healthReport.systemMetrics }, 'System metrics retrieved successfully');
    } catch (error) {
        logger.error('System metrics error:', error);
        next(error);
    }
};

/**
 * POST /api/v1/admin/health/reset-metrics
 * Reset API metrics counters
 * Super Admin only
 */
export const resetMetrics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        SystemHealthService.resetMetrics();
        ServiceLevelPricingMetricsService.reset();

        logger.info('API metrics reset', {
            userId: req.user?._id,
        });

        sendSuccess(res, null, 'API metrics reset successfully');
    } catch (error) {
        logger.error('Reset metrics error:', error);
        next(error);
    }
};

export default {
    basicHealthCheck,
    detailedHealthCheck,
    getApiMetrics,
    checkDatabaseHealth,
    checkExternalServicesHealth,
    getSystemMetrics,
    resetMetrics,
};
