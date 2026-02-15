/**
 * Auth Analytics
 * 
 * Purpose: Authentication Analytics Service
 * 
 * DEPENDENCIES:
 * - Database Models, Logger
 * 
 * TESTING:
 * Unit Tests: tests/unit/services/.../{filename}.test.ts
 * Coverage: TBD
 * 
 * NOTE: This service needs comprehensive documentation.
 * See SERVICE_TEMPLATE.md for documentation standards.
 */

import { AuditLog, Session, User } from '../../../../infrastructure/database/mongoose/models';
import logger from '../../../../shared/logger/winston.logger';

/**
 * Authentication Analytics Service
 * Provides aggregated metrics and insights for auth-related events
 */

export interface DateRange {
    start: Date;
    end: Date;
}

export interface LoginStats {
    date: string;
    action: string;
    count: number;
}

export interface FailedLoginAttempt {
    date: string;
    reason: string;
    count: number;
    uniqueIps: string[];
}

export interface ActiveSessionStats {
    total: number;
    byDevice: Array<{ _id: string; count: number }>;
}

export interface RegistrationTrend {
    date: string;
    role: string;
    emailVerified: boolean;
    count: number;
}

export interface SecurityIncident {
    date: string;
    action: string;
    count: number;
}

export class AuthAnalyticsService {
    /**
     * Get login/logout statistics for date range
     */
    async getLoginStats(dateRange: DateRange): Promise<LoginStats[]> {
        try {
            const stats = await AuditLog.aggregate([
                {
                    $match: {
                        action: { $in: ['login', 'logout'] },
                        timestamp: { $gte: dateRange.start, $lte: dateRange.end },
                    },
                },
                {
                    $group: {
                        _id: {
                            date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
                            action: '$action',
                        },
                        count: { $sum: 1 },
                    },
                },
                {
                    $sort: { '_id.date': 1 },
                },
                {
                    $project: {
                        _id: 0,
                        date: '$_id.date',
                        action: '$_id.action',
                        count: 1,
                    },
                },
            ]);

            logger.info(`Retrieved login stats for ${stats.length} days`);
            return stats;
        } catch (error) {
            logger.error('Error fetching login stats:', error);
            throw error;
        }
    }

    /**
     * Get failed login attempts with IP tracking
     */
    async getFailedLoginAttempts(dateRange: DateRange): Promise<FailedLoginAttempt[]> {
        try {
            const attempts = await AuditLog.aggregate([
                {
                    $match: {
                        action: 'login',
                        'metadata.success': false,
                        timestamp: { $gte: dateRange.start, $lte: dateRange.end },
                    },
                },
                {
                    $group: {
                        _id: {
                            date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
                            reason: '$metadata.reason',
                        },
                        count: { $sum: 1 },
                        uniqueIps: { $addToSet: '$ip' },
                    },
                },
                {
                    $sort: { '_id.date': 1 },
                },
                {
                    $project: {
                        _id: 0,
                        date: '$_id.date',
                        reason: '$_id.reason',
                        count: 1,
                        uniqueIps: 1,
                    },
                },
            ]);

            logger.info(`Retrieved ${attempts.length} failed login attempt records`);
            return attempts;
        } catch (error) {
            logger.error('Error fetching failed login attempts:', error);
            throw error;
        }
    }

    /**
     * Get active sessions count and breakdown by device type
     */
    async getActiveSessionsCount(): Promise<ActiveSessionStats> {
        try {
            const total = await Session.countDocuments({
                expiresAt: { $gt: new Date() },
            });

            const byDevice = await Session.aggregate([
                {
                    $match: { expiresAt: { $gt: new Date() } },
                },
                {
                    $group: {
                        _id: '$deviceInfo.type',
                        count: { $sum: 1 },
                    },
                },
                {
                    $sort: { count: -1 },
                },
            ]);

            logger.info(`Active sessions: ${total} total, ${byDevice.length} device types`);
            return { total, byDevice };
        } catch (error) {
            logger.error('Error fetching active sessions:', error);
            throw error;
        }
    }

    /**
     * Get user registration trends
     */
    async getRegistrationTrends(dateRange: DateRange): Promise<RegistrationTrend[]> {
        try {
            const trends = await User.aggregate([
                {
                    $match: {
                        createdAt: { $gte: dateRange.start, $lte: dateRange.end },
                    },
                },
                {
                    $group: {
                        _id: {
                            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                            role: '$role',
                            emailVerified: '$isEmailVerified',
                        },
                        count: { $sum: 1 },
                    },
                },
                {
                    $sort: { '_id.date': 1 },
                },
                {
                    $project: {
                        _id: 0,
                        date: '$_id.date',
                        role: '$_id.role',
                        emailVerified: '$_id.emailVerified',
                        count: 1,
                    },
                },
            ]);

            logger.info(`Retrieved registration trends for ${trends.length} data points`);
            return trends;
        } catch (error) {
            logger.error('Error fetching registration trends:', error);
            throw error;
        }
    }

    /**
     * Get security incidents (account locks, session revocations, password changes)
     */
    async getSecurityIncidents(dateRange: DateRange): Promise<SecurityIncident[]> {
        try {
            const incidents = await AuditLog.aggregate([
                {
                    $match: {
                        action: { $in: ['account_lock', 'account_unlock', 'session_revoke', 'password_change'] },
                        timestamp: { $gte: dateRange.start, $lte: dateRange.end },
                    },
                },
                {
                    $group: {
                        _id: {
                            date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
                            action: '$action',
                        },
                        count: { $sum: 1 },
                    },
                },
                {
                    $sort: { '_id.date': 1 },
                },
                {
                    $project: {
                        _id: 0,
                        date: '$_id.date',
                        action: '$_id.action',
                        count: 1,
                    },
                },
            ]);

            logger.info(`Retrieved ${incidents.length} security incident records`);
            return incidents;
        } catch (error) {
            logger.error('Error fetching security incidents:', error);
            throw error;
        }
    }

    /**
     * Get comprehensive auth metrics for dashboard
     */
    async getComprehensiveMetrics(dateRange: DateRange) {
        try {
            const [loginStats, failedLogins, activeSessions, registrations, securityIncidents] = await Promise.all([
                this.getLoginStats(dateRange),
                this.getFailedLoginAttempts(dateRange),
                this.getActiveSessionsCount(),
                this.getRegistrationTrends(dateRange),
                this.getSecurityIncidents(dateRange),
            ]);

            return {
                loginStats,
                failedLogins,
                activeSessions,
                registrations,
                securityIncidents,
                dateRange,
            };
        } catch (error) {
            logger.error('Error fetching comprehensive metrics:', error);
            throw error;
        }
    }
}

export default new AuthAnalyticsService();
