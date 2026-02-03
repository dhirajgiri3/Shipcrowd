import { Request, Response, NextFunction } from 'express';
import authAnalyticsService from '../../../../core/application/services/analytics/auth-analytics.service';
import { sendSuccess } from '../../../../shared/utils/responseHelper';
import logger from '../../../../shared/logger/winston.logger';
import { AuthorizationError, ValidationError } from '../../../../shared/errors/app.error';
import { ErrorCode } from '../../../../shared/errors/errorCodes';
import { isPlatformAdmin } from '../../../../shared/utils/role-helpers';

/**
 * Authentication Analytics Controller
 * Admin-only endpoints for auth metrics and insights
 */

/**
 * Get comprehensive authentication metrics
 * @route GET /api/v1/analytics/auth
 * @access Admin only
 */
export const getAuthMetrics = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        // Only admin can view analytics
        if (!req.user || !isPlatformAdmin(req.user)) {
            throw new AuthorizationError('Admin access required', ErrorCode.AUTHZ_FORBIDDEN);
        }

        // Parse date range from query params
        const startDate = req.query.startDate as string;
        const endDate = req.query.endDate as string;

        const dateRange = {
            start: startDate
                ? new Date(startDate)
                : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Default: 30 days ago
            end: endDate ? new Date(endDate) : new Date(), // Default: now
        };

        // Validate date range
        if (dateRange.start > dateRange.end) {
            throw new ValidationError('Start date must be before end date');
        }

        // Get comprehensive metrics
        const metrics = await authAnalyticsService.getComprehensiveMetrics(dateRange);

        logger.info(`Auth metrics retrieved for admin ${req.user._id}`);

        sendSuccess(res, metrics, 'Auth metrics retrieved successfully');
    } catch (error) {
        logger.error('Error fetching auth metrics:', error);
        next(error);
    }
};

/**
 * Get login statistics
 * @route GET /api/v1/analytics/auth/logins
 * @access Admin only
 */
export const getLoginStats = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        if (!req.user || !isPlatformAdmin(req.user)) {
            throw new AuthorizationError('Admin access required', ErrorCode.AUTHZ_FORBIDDEN);
        }

        const startDate = req.query.startDate as string;
        const endDate = req.query.endDate as string;

        const dateRange = {
            start: startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            end: endDate ? new Date(endDate) : new Date(),
        };

        const stats = await authAnalyticsService.getLoginStats(dateRange);

        sendSuccess(res, { stats, dateRange }, 'Login stats retrieved successfully');
    } catch (error) {
        logger.error('Error fetching login stats:', error);
        next(error);
    }
};

/**
 * Get failed login attempts
 * @route GET /api/v1/analytics/auth/failed-logins
 * @access Admin only
 */
export const getFailedLogins = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        if (!req.user || !isPlatformAdmin(req.user)) {
            throw new AuthorizationError('Admin access required', ErrorCode.AUTHZ_FORBIDDEN);
        }

        const startDate = req.query.startDate as string;
        const endDate = req.query.endDate as string;

        const dateRange = {
            start: startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Default: 7 days
            end: endDate ? new Date(endDate) : new Date(),
        };

        const attempts = await authAnalyticsService.getFailedLoginAttempts(dateRange);

        sendSuccess(res, { attempts, dateRange }, 'Failed login attempts retrieved successfully');
    } catch (error) {
        logger.error('Error fetching failed logins:', error);
        next(error);
    }
};

/**
 * Get active sessions count
 * @route GET /api/v1/analytics/auth/sessions
 * @access Admin only
 */
export const getActiveSessions = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        if (!req.user || !isPlatformAdmin(req.user)) {
            throw new AuthorizationError('Admin access required', ErrorCode.AUTHZ_FORBIDDEN);
        }

        const sessions = await authAnalyticsService.getActiveSessionsCount();

        sendSuccess(res, sessions, 'Active sessions retrieved successfully');
    } catch (error) {
        logger.error('Error fetching active sessions:', error);
        next(error);
    }
};

/**
 * Get registration trends
 * @route GET /api/v1/analytics/auth/registrations
 * @access Admin only
 */
export const getRegistrationTrends = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        if (!req.user || !isPlatformAdmin(req.user)) {
            throw new AuthorizationError('Admin access required', ErrorCode.AUTHZ_FORBIDDEN);
        }

        const startDate = req.query.startDate as string;
        const endDate = req.query.endDate as string;

        const dateRange = {
            start: startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            end: endDate ? new Date(endDate) : new Date(),
        };

        const trends = await authAnalyticsService.getRegistrationTrends(dateRange);

        sendSuccess(res, { trends, dateRange }, 'Registration trends retrieved successfully');
    } catch (error) {
        logger.error('Error fetching registration trends:', error);
        next(error);
    }
};

/**
 * Get security incidents
 * @route GET /api/v1/analytics/auth/security-incidents
 * @access Admin only
 */
export const getSecurityIncidents = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        if (!req.user || !isPlatformAdmin(req.user)) {
            throw new AuthorizationError('Admin access required', ErrorCode.AUTHZ_FORBIDDEN);
        }

        const startDate = req.query.startDate as string;
        const endDate = req.query.endDate as string;

        const dateRange = {
            start: startDate ? new Date(startDate) : new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // Default: 14 days
            end: endDate ? new Date(endDate) : new Date(),
        };

        const incidents = await authAnalyticsService.getSecurityIncidents(dateRange);

        sendSuccess(res, { incidents, dateRange }, 'Security incidents retrieved successfully');
    } catch (error) {
        logger.error('Error fetching security incidents:', error);
        next(error);
    }
};

const authAnalyticsController = {
    getAuthMetrics,
    getLoginStats,
    getFailedLogins,
    getActiveSessions,
    getRegistrationTrends,
    getSecurityIncidents,
};

export default authAnalyticsController;
