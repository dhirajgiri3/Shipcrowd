import express from 'express';
import { authenticate } from '../../../middleware/auth/auth';
import { requireAccess } from '../../../middleware/auth/unified-access';
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
router.get(
  '/',
  authenticate,
  requireAccess({ roles: ['admin', 'super_admin'] }),
  authAnalyticsController.getAuthMetrics
);

/**
 * @route GET /analytics/auth/logins
 * @desc Get login statistics for date range
 * @access Admin only
 */
router.get(
  '/logins',
  authenticate,
  requireAccess({ roles: ['admin', 'super_admin'] }),
  authAnalyticsController.getLoginStats
);

/**
 * @route GET /analytics/auth/failed-logins
 * @desc Get failed login attempts with IP tracking
 * @access Admin only
 */
router.get(
  '/failed-logins',
  authenticate,
  requireAccess({ roles: ['admin', 'super_admin'] }),
  authAnalyticsController.getFailedLogins
);

/**
 * @route GET /analytics/auth/sessions
 * @desc Get active sessions count by device type
 * @access Admin only
 */
router.get(
  '/sessions',
  authenticate,
  requireAccess({ roles: ['admin', 'super_admin'] }),
  authAnalyticsController.getActiveSessions
);

/**
 * @route GET /analytics/auth/registrations
 * @desc Get user registration trends
 * @access Admin only
 */
router.get(
  '/registrations',
  authenticate,
  requireAccess({ roles: ['admin', 'super_admin'] }),
  authAnalyticsController.getRegistrationTrends
);

/**
 * @route GET /analytics/auth/security-incidents
 * @desc Get security incidents (locks, unlocks, revocations, password changes)
 * @access Admin only
 */
router.get(
  '/security-incidents',
  authenticate,
  requireAccess({ roles: ['admin', 'super_admin'] }),
  authAnalyticsController.getSecurityIncidents
);

export default router;
