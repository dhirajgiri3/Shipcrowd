import express from 'express';
import { authenticate, csrfProtection } from '../../../middleware/auth/auth';
import ratecardController from '../../../controllers/shipping/ratecard.controller';
import asyncHandler from '../../../../../shared/utils/asyncHandler';

const router = express.Router();

/**
 * @route POST /api/v1/ratecards
 * @desc Create a new rate card
 * @access Private
 */
router.post('/', authenticate, csrfProtection, asyncHandler(ratecardController.createRateCard));

/**
 * @route GET /api/v1/ratecards
 * @desc Get all rate cards
 * @access Private
 */
router.get('/', authenticate, asyncHandler(ratecardController.getRateCards));

/**
 * @route POST /api/v1/ratecards/calculate
 * @desc Calculate shipping rate
 * @access Private
 */
router.post('/calculate', authenticate, asyncHandler(ratecardController.calculateRate));

/**
 * @route POST /api/v1/ratecards/compare
 * @desc Compare rates across all carriers
 * @access Private
 */
router.post('/compare', authenticate, asyncHandler(ratecardController.compareCarrierRates));

/**
 * @route POST /api/v1/ratecards/smart-calculate
 * @desc Smart rate calculation with AI-powered recommendations
 * @access Private
 */
router.post('/smart-calculate', authenticate, asyncHandler(ratecardController.calculateSmartRates));

/**
 * @route GET /api/v1/ratecards/:id
 * @desc Get a rate card by ID
 * @access Private
 */
router.get('/:id', authenticate, asyncHandler(ratecardController.getRateCardById));

/**
 * @route PATCH /api/v1/ratecards/:id
 * @desc Update a rate card
 * @access Private
 */
router.patch('/:id', authenticate, csrfProtection, asyncHandler(ratecardController.updateRateCard));

/**
 * @route GET /api/v1/ratecards/:id/analytics
 * @desc Get rate card usage analytics
 * @access Private
 */
router.get('/:id/analytics', authenticate, asyncHandler(ratecardController.getRateCardAnalytics));

/**
 * @route GET /api/v1/ratecards/:id/revenue-series
 * @desc Get rate card revenue time series
 * @access Private
 */
router.get('/:id/revenue-series', authenticate, asyncHandler(ratecardController.getRateCardRevenueSeries));

/**
 * @route GET /api/v1/ratecards/export
 * @desc Export all rate cards to CSV
 * @access Private
 */
router.get('/export', authenticate, asyncHandler(ratecardController.exportRateCards));

/**
 * @route POST /api/v1/ratecards/bulk-update
 * @desc Bulk update rate cards (activate/deactivate/adjust prices)
 * @access Private
 */
router.post('/bulk-update', authenticate, csrfProtection, asyncHandler(ratecardController.bulkUpdateRateCards));

export default router;
