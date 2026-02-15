import express from 'express';
import asyncHandler from '../../../../../shared/utils/asyncHandler';
import featureFlagController from '../../../controllers/admin/feature-flag.controller';
import { requireAccess } from '../../../middleware';
import { authenticate } from '../../../middleware/auth/auth';

const router = express.Router();

/**
 * @route GET /api/v1/admin/feature-flags
 * @desc List all feature flags
 * @access Admin/Super Admin only
 * @query isEnabled - Filter by enabled status
 * @query category - Filter by category
 * @query environment - Filter by environment
 */
router.get(
    '/',
    authenticate,
    requireAccess({ roles: ['super_admin', 'admin'] }),
    asyncHandler(featureFlagController.listFlags)
);

/**
 * @route GET /api/v1/admin/feature-flags/:key
 * @desc Get single feature flag
 * @access Admin/Super Admin only
 */
router.get(
    '/:key',
    authenticate,
    requireAccess({ roles: ['super_admin', 'admin'] }),
    asyncHandler(featureFlagController.getFlag)
);

/**
 * @route POST /api/v1/admin/feature-flags
 * @desc Create new feature flag
 * @access Super Admin only
 */
router.post(
    '/',
    authenticate,
    requireAccess({ roles: ['super_admin'] }),
    asyncHandler(featureFlagController.createFlag)
);

/**
 * @route PATCH /api/v1/admin/feature-flags/:key
 * @desc Update feature flag
 * @access Super Admin only
 */
router.patch(
    '/:key',
    authenticate,
    requireAccess({ roles: ['super_admin'] }),
    asyncHandler(featureFlagController.updateFlag)
);

/**
 * @route POST /api/v1/admin/feature-flags/:key/toggle
 * @desc Toggle feature flag on/off
 * @access Super Admin only
 */
router.post(
    '/:key/toggle',
    authenticate,
    requireAccess({ roles: ['super_admin'] }),
    asyncHandler(featureFlagController.toggleFlag)
);

/**
 * @route DELETE /api/v1/admin/feature-flags/:key
 * @desc Delete (archive) feature flag
 * @access Super Admin only
 */
router.delete(
    '/:key',
    authenticate,
    requireAccess({ roles: ['super_admin'] }),
    asyncHandler(featureFlagController.deleteFlag)
);

/**
 * @route POST /api/v1/admin/feature-flags/evaluate
 * @desc Evaluate feature flag for testing
 * @access Admin/Super Admin only
 */
router.post(
    '/evaluate',
    authenticate,
    requireAccess({ roles: ['super_admin', 'admin'] }),
    asyncHandler(featureFlagController.evaluateFlag)
);

/**
 * @route POST /api/v1/admin/feature-flags/clear-cache
 * @desc Clear feature flag cache
 * @access Super Admin only
 */
router.post(
    '/clear-cache',
    authenticate,
    requireAccess({ roles: ['super_admin'] }),
    asyncHandler(featureFlagController.clearCache)
);

export default router;
