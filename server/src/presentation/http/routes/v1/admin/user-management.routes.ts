/**
 * User Management Routes
 *
 * Super admin routes for managing platform users.
 * All routes require super_admin role.
 */

import { Router } from 'express';
import userManagementController from '../../../controllers/admin/user-management.controller';
import { authenticate } from '../../../middleware/auth/auth';
import { requireAccess } from '../../../middleware/auth/unified-access';
import { asyncHandler } from '../../../../../shared/helpers/controller.helpers';

const router = Router();

/**
 * @route   GET /api/v1/admin/users
 * @desc    List all platform users with filters
 * @access  Super Admin only
 * @query   role - Filter by role (all | super_admin | admin | seller | staff)
 * @query   search - Search by name or email
 * @query   page - Page number (default: 1)
 * @query   limit - Items per page (default: 20, max: 100)
 */
router.get(
    '/',
    authenticate,
    requireAccess({ roles: ['super_admin', 'admin'] }),
    asyncHandler(userManagementController.listUsers)
);

/**
 * @route   GET /api/v1/admin/users/:id
 * @desc    Get detailed user information
 * @access  Super Admin only
 */
router.get(
    '/:id',
    authenticate,
    requireAccess({ roles: ['super_admin', 'admin'] }),
    asyncHandler(userManagementController.getUserDetails)
);

/**
 * @route   POST /api/v1/admin/users/:id/promote
 * @desc    Promote seller to admin (retains company for dual role)
 * @access  Super Admin only
 * @body    reason - Optional reason for promotion
 */
router.post(
    '/:id/promote',
    authenticate,
    requireAccess({ roles: ['super_admin'] }),
    asyncHandler(userManagementController.promoteUser)
);

/**
 * @route   POST /api/v1/admin/users/:id/demote
 * @desc    Demote admin to seller (retains company)
 * @access  Super Admin only
 * @body    reason - Optional reason for demotion
 */
router.post(
    '/:id/demote',
    authenticate,
    requireAccess({ roles: ['super_admin'] }),
    asyncHandler(userManagementController.demoteUser)
);

// Impersonate user (Super Admin only)
router.post(
    '/:id/impersonate',
    authenticate,
    requireAccess({ roles: ['super_admin'] }), // Using roles instead of tier for super admin actions
    asyncHandler(userManagementController.impersonateUser)
);

/**
 * @route   POST /api/v1/admin/users/:id/suspend
 * @desc    Suspend a user account
 * @access  Super Admin only
 * @body    reason - Suspension reason (required, min 10 chars)
 * @body    duration - Optional duration in days
 */
router.post(
    '/:id/suspend',
    authenticate,
    requireAccess({ roles: ['super_admin', 'admin'] }),
    asyncHandler(userManagementController.suspendUser)
);

/**
 * @route   POST /api/v1/admin/users/:id/unsuspend
 * @desc    Unsuspend a user account
 * @access  Super Admin only
 * @body    reason - Optional reason for unsuspension
 */
router.post(
    '/:id/unsuspend',
    authenticate,
    requireAccess({ roles: ['super_admin', 'admin'] }),
    asyncHandler(userManagementController.unsuspendUser)
);

/**
 * @route   POST /api/v1/admin/users/:id/ban
 * @desc    Permanently ban a user account
 * @access  Super Admin only
 * @body    reason - Ban reason (required, min 10 chars)
 */
router.post(
    '/:id/ban',
    authenticate,
    requireAccess({ roles: ['super_admin'] }),
    asyncHandler(userManagementController.banUser)
);

/**
 * @route   POST /api/v1/admin/users/:id/unban
 * @desc    Unban a user account
 * @access  Super Admin only
 * @body    reason - Optional reason for unbanning
 */
router.post(
    '/:id/unban',
    authenticate,
    requireAccess({ roles: ['super_admin'] }),
    asyncHandler(userManagementController.unbanUser)
);

export default router;
