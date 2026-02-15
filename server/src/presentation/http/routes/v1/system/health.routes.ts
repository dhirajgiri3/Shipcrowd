import express from 'express';
import asyncHandler from '../../../../../shared/utils/asyncHandler';
import healthController from '../../../controllers/system/health.controller';
import { requireAccess } from '../../../middleware';
import { authenticate } from '../../../middleware/auth/auth';

const router = express.Router();

/**
 * @route GET /api/v1/health
 * @desc Basic health check (lightweight, fast)
 * @access Public (for load balancers, monitoring tools)
 */
router.get('/', asyncHandler(healthController.basicHealthCheck));

/**
 * @route GET /api/v1/health/detailed
 * @desc Comprehensive health report
 * @access Admin/Super Admin only
 */
router.get(
    '/detailed',
    authenticate,
    requireAccess({ roles: ['super_admin', 'admin'] }),
    asyncHandler(healthController.detailedHealthCheck)
);

/**
 * @route GET /api/v1/health/metrics
 * @desc API metrics only
 * @access Admin/Super Admin only
 */
router.get(
    '/metrics',
    authenticate,
    requireAccess({ roles: ['super_admin', 'admin'] }),
    asyncHandler(healthController.getApiMetrics)
);

/**
 * @route GET /api/v1/health/database
 * @desc Database health check
 * @access Admin/Super Admin only
 */
router.get(
    '/database',
    authenticate,
    requireAccess({ roles: ['super_admin', 'admin'] }),
    asyncHandler(healthController.checkDatabaseHealth)
);

/**
 * @route GET /api/v1/health/services
 * @desc External services health check
 * @access Admin/Super Admin only
 */
router.get(
    '/services',
    authenticate,
    requireAccess({ roles: ['super_admin', 'admin'] }),
    asyncHandler(healthController.checkExternalServicesHealth)
);

/**
 * @route GET /api/v1/health/system
 * @desc System metrics (CPU, memory, etc.)
 * @access Admin/Super Admin only
 */
router.get(
    '/system',
    authenticate,
    requireAccess({ roles: ['super_admin', 'admin'] }),
    asyncHandler(healthController.getSystemMetrics)
);

/**
 * @route POST /api/v1/admin/health/reset-metrics
 * @desc Reset API metrics counters
 * @access Super Admin only
 */
router.post(
    '/reset-metrics',
    authenticate,
    requireAccess({ roles: ['super_admin'] }),
    asyncHandler(healthController.resetMetrics)
);

export default router;
