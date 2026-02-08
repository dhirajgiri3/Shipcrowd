/**
 * Admin Rate Card Routes
 *
 * Platform-wide rate card management routes for admins
 */

import express from 'express';
import { authenticate, csrfProtection } from '../../../middleware/auth/auth';
import adminRatecardController from '../../../controllers/admin/admin-ratecard.controller';
import asyncHandler from '../../../../../shared/utils/asyncHandler';

const router = express.Router();

/**
 * @route GET /api/v1/admin/ratecards/stats
 * @desc Get platform-wide rate card statistics
 * @access Admin, Super Admin
 */
router.get('/stats', authenticate, asyncHandler(adminRatecardController.getAdminRateCardStats));

/**
 * @route GET /api/v1/admin/ratecards/assignments
 * @desc Get rate card assignments (stub)
 * @access Admin, Super Admin
 */
router.get('/assignments', authenticate, asyncHandler(adminRatecardController.getAdminRateCardAssignments));

/**
 * @route POST /api/v1/admin/ratecards/assign
 * @desc Assign rate card (stub)
 * @access Admin, Super Admin
 */
router.post('/assign', authenticate, csrfProtection, asyncHandler(adminRatecardController.assignAdminRateCard));

/**
 * @route DELETE /api/v1/admin/ratecards/unassign/:id
 * @desc Unassign rate card (stub)
 * @access Admin, Super Admin
 */
router.delete('/unassign/:id', authenticate, csrfProtection, asyncHandler(adminRatecardController.unassignAdminRateCard));

/**
 * @route POST /api/v1/admin/ratecards/bulk-assign
 * @desc Bulk assign rate cards (stub)
 * @access Admin, Super Admin
 */
router.post('/bulk-assign', authenticate, csrfProtection, asyncHandler(adminRatecardController.bulkAssignAdminRateCards));

/**
 * @route GET /api/v1/admin/ratecards/couriers
 * @desc Get available couriers (stub)
 * @access Admin, Super Admin
 */
router.get('/couriers', authenticate, asyncHandler(adminRatecardController.getAdminRateCardCouriers));

/**
 * @route GET /api/v1/admin/ratecards
 * @desc Get all rate cards (platform-wide)
 * @access Admin, Super Admin
 */
router.get('/', authenticate, asyncHandler(adminRatecardController.getAdminRateCards));

/**
 * @route POST /api/v1/admin/ratecards
 * @desc Create rate card for any company
 * @access Admin, Super Admin
 */
router.post('/', authenticate, csrfProtection, asyncHandler(adminRatecardController.createAdminRateCard));

/**
 * @route GET /api/v1/admin/ratecards/:id
 * @desc Get rate card by ID (any company)
 * @access Admin, Super Admin
 */
router.get('/:id', authenticate, asyncHandler(adminRatecardController.getAdminRateCardById));

/**
 * @route GET /api/v1/admin/ratecards/:id/analytics
 * @desc Get rate card analytics (any company)
 * @access Admin, Super Admin
 */
router.get('/:id/analytics', authenticate, asyncHandler(adminRatecardController.getAdminRateCardAnalytics));

/**
 * @route GET /api/v1/admin/ratecards/:id/revenue-series
 * @desc Get rate card revenue time series (any company)
 * @access Admin, Super Admin
 */
router.get('/:id/revenue-series', authenticate, asyncHandler(adminRatecardController.getAdminRateCardRevenueSeries));

/**
 * @route GET /api/v1/admin/ratecards/:id/history
 * @desc Get rate card history (audit logs)
 * @access Admin, Super Admin
 */
router.get('/:id/history', authenticate, asyncHandler(adminRatecardController.getAdminRateCardHistory));

/**
 * @route PATCH /api/v1/admin/ratecards/:id
 * @desc Update rate card (any company)
 * @access Admin, Super Admin
 */
router.patch('/:id', authenticate, csrfProtection, asyncHandler(adminRatecardController.updateAdminRateCard));

/**
 * @route DELETE /api/v1/admin/ratecards/:id
 * @desc Delete rate card (any company)
 * @access Admin, Super Admin
 */
router.delete('/:id', authenticate, csrfProtection, asyncHandler(adminRatecardController.deleteAdminRateCard));

/**
 * @route POST /api/v1/admin/ratecards/:id/clone
 * @desc Clone rate card (any company)
 * @access Admin, Super Admin
 */
router.post('/:id/clone', authenticate, csrfProtection, asyncHandler(adminRatecardController.cloneAdminRateCard));

export default router;
