import express from 'express';
import { authenticate } from '../../../middleware/auth/auth';
import authAnalyticsController from '../../../controllers/analytics/auth-analytics.controller';

const router = express.Router();

/**
 * Auth Analytics Routes
 * Admin-only analytics endpoints for authentication metrics
 * All routes require admin authentication
 */

/**
 * @route GET /analytics/auth
 * @desc Get comprehensive auth metrics (logins, sessions, registrations, incidents)
 * @access Admin only
 */
router.get('/', authenticate, authAnalyticsController.getAuthMetrics);

/**
 * @route GET /analytics/auth/logins
 * @desc Get login statistics for date range
 * @access Admin only
 */
router.get('/logins', authenticate, authAnalyticsController.getLoginStats);

/**
 * @route GET /analytics/auth/failed-logins
 * @desc Get failed login attempts with IP tracking
 * @access Admin only
 */
router.get('/failed-logins', authenticate, authAnalyticsController.getFailedLogins);

/**
 * @route GET /analytics/auth/sessions
 * @desc Get active sessions count by device type
 * @access Admin only
 */
router.get('/sessions', authenticate, authAnalyticsController.getActiveSessions);

/**
 * @route GET /analytics/auth/registrations
 * @desc Get user registration trends
 * @access Admin only
 */
router.get('/registrations', authenticate, authAnalyticsController.getRegistrationTrends);

/**
 * @route GET /analytics/auth/security-incidents
 * @desc Get security incidents (locks, unlocks, revocations, password changes)
 * @access Admin only
 */
router.get('/security-incidents', authenticate, authAnalyticsController.getSecurityIncidents);

export default router;
