import express from 'express';
import asyncHandler from '../../../../../shared/utils/asyncHandler';
import impersonationController from '../../../controllers/admin/impersonation.controller';
import { requireAccess } from '../../../middleware';
import { authenticate } from '../../../middleware/auth/auth';

const router = express.Router();

/**
 * @route POST /api/v1/admin/impersonation/start
 * @desc Start impersonation session (admin only)
 * @access Private (Admin/Super Admin only)
 */
router.post(
    '/start',
    authenticate,
    requireAccess({ roles: ['super_admin', 'admin'] }),
    asyncHandler(impersonationController.startImpersonation)
);

/**
 * @route POST /api/v1/admin/impersonation/end
 * @desc End impersonation session
 * @access Private (Admin/Super Admin only)
 */
router.post(
    '/end',
    authenticate,
    requireAccess({ roles: ['super_admin', 'admin'] }),
    asyncHandler(impersonationController.endImpersonation)
);

/**
 * @route GET /api/v1/admin/impersonation/active
 * @desc Get active impersonation sessions for current admin
 * @access Private (Admin/Super Admin only)
 */
router.get(
    '/active',
    authenticate,
    requireAccess({ roles: ['super_admin', 'admin'] }),
    asyncHandler(impersonationController.getActiveSessions)
);

/**
 * @route GET /api/v1/admin/impersonation/history
 * @desc Get impersonation history
 * @access Private (Admin/Super Admin only)
 */
router.get(
    '/history',
    authenticate,
    requireAccess({ roles: ['super_admin', 'admin'] }),
    asyncHandler(impersonationController.getImpersonationHistory)
);

/**
 * @route POST /api/v1/admin/impersonation/end-all
 * @desc End all active impersonation sessions for current admin
 * @access Private (Admin/Super Admin only)
 */
router.post(
    '/end-all',
    authenticate,
    requireAccess({ roles: ['super_admin', 'admin'] }),
    asyncHandler(impersonationController.endAllSessions)
);

export default router;
