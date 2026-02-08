/**
 * Admin Rate Card Routes
 *
 * Platform-wide rate card management routes for admins
 */

import express from 'express';
import { authenticate, csrfProtection } from '../../../middleware/auth/auth';
import { requireAccess } from '../../../middleware';
import adminRatecardController from '../../../controllers/admin/admin-ratecard.controller';
import asyncHandler from '../../../../../shared/utils/asyncHandler';
import multer from 'multer';

const router = express.Router();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

router.use(authenticate, requireAccess({ roles: ['admin'] }));

/**
 * @route GET /api/v1/admin/ratecards/stats
 * @desc Get platform-wide rate card statistics
 * @access Admin, Super Admin
 */
router.get('/stats', asyncHandler(adminRatecardController.getAdminRateCardStats));

/**
 * @route GET /api/v1/admin/ratecards/assignments
 * @desc Get rate card assignments (stub)
 * @access Admin, Super Admin
 */
router.get('/assignments', asyncHandler(adminRatecardController.getAdminRateCardAssignments));

/**
 * @route POST /api/v1/admin/ratecards/assign
 * @desc Assign rate card (stub)
 * @access Admin, Super Admin
 */
router.post('/assign', csrfProtection, asyncHandler(adminRatecardController.assignAdminRateCard));

/**
 * @route DELETE /api/v1/admin/ratecards/unassign/:id
 * @desc Unassign rate card (stub)
 * @access Admin, Super Admin
 */
router.delete('/unassign/:id', csrfProtection, asyncHandler(adminRatecardController.unassignAdminRateCard));

/**
 * @route POST /api/v1/admin/ratecards/bulk-assign
 * @desc Bulk assign rate cards (stub)
 * @access Admin, Super Admin
 */
router.post('/bulk-assign', csrfProtection, asyncHandler(adminRatecardController.bulkAssignAdminRateCards));

/**
 * @route GET /api/v1/admin/ratecards/couriers
 * @desc Get available couriers (stub)
 * @access Admin, Super Admin
 */
router.get('/couriers', asyncHandler(adminRatecardController.getAdminRateCardCouriers));

/**
 * @route GET /api/v1/admin/ratecards/export
 * @desc Export rate cards to CSV (admin, scoped by company)
 * @access Admin, Super Admin
 */
router.get('/export', asyncHandler(adminRatecardController.exportAdminRateCards));

/**
 * @route POST /api/v1/admin/ratecards/import
 * @desc Import rate cards from CSV/Excel (admin, scoped by company)
 * @access Admin, Super Admin
 */
router.post('/import', csrfProtection, upload.single('file'), asyncHandler(adminRatecardController.importAdminRateCards));

/**
 * @route POST /api/v1/admin/ratecards/bulk-update
 * @desc Bulk update rate cards (admin, scoped by company)
 * @access Admin, Super Admin
 */
router.post('/bulk-update', csrfProtection, asyncHandler(adminRatecardController.bulkUpdateAdminRateCards));

/**
 * @route GET /api/v1/admin/ratecards
 * @desc Get all rate cards (platform-wide)
 * @access Admin, Super Admin
 */
router.get('/', asyncHandler(adminRatecardController.getAdminRateCards));

/**
 * @route POST /api/v1/admin/ratecards
 * @desc Create rate card for any company
 * @access Admin, Super Admin
 */
router.post('/', csrfProtection, asyncHandler(adminRatecardController.createAdminRateCard));

/**
 * @route GET /api/v1/admin/ratecards/:id
 * @desc Get rate card by ID (any company)
 * @access Admin, Super Admin
 */
router.get('/:id', asyncHandler(adminRatecardController.getAdminRateCardById));

/**
 * @route GET /api/v1/admin/ratecards/:id/analytics
 * @desc Get rate card analytics (any company)
 * @access Admin, Super Admin
 */
router.get('/:id/analytics', asyncHandler(adminRatecardController.getAdminRateCardAnalytics));

/**
 * @route GET /api/v1/admin/ratecards/:id/revenue-series
 * @desc Get rate card revenue time series (any company)
 * @access Admin, Super Admin
 */
router.get('/:id/revenue-series', asyncHandler(adminRatecardController.getAdminRateCardRevenueSeries));

/**
 * @route GET /api/v1/admin/ratecards/:id/history
 * @desc Get rate card history (audit logs)
 * @access Admin, Super Admin
 */
router.get('/:id/history', asyncHandler(adminRatecardController.getAdminRateCardHistory));

/**
 * @route PATCH /api/v1/admin/ratecards/:id
 * @desc Update rate card (any company)
 * @access Admin, Super Admin
 */
router.patch('/:id', csrfProtection, asyncHandler(adminRatecardController.updateAdminRateCard));

/**
 * @route DELETE /api/v1/admin/ratecards/:id
 * @desc Delete rate card (any company)
 * @access Admin, Super Admin
 */
router.delete('/:id', csrfProtection, asyncHandler(adminRatecardController.deleteAdminRateCard));

/**
 * @route POST /api/v1/admin/ratecards/:id/clone
 * @desc Clone rate card (any company)
 * @access Admin, Super Admin
 */
router.post('/:id/clone', csrfProtection, asyncHandler(adminRatecardController.cloneAdminRateCard));

export default router;
