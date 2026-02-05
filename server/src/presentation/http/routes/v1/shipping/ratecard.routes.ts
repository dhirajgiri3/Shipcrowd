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
 * @route GET /api/v1/ratecards/select-preview
 * @desc Preview rate card selection logic
 * @access Private
 */
router.get('/select-preview', authenticate, asyncHandler(ratecardController.previewRateCardSelection));

/**
 * @route POST /api/v1/ratecards/simulate
 * @desc Simulate rate card changes
 * @access Private
 */
router.post('/simulate', authenticate, asyncHandler(ratecardController.simulateRateCardChange));

/**
 * @route GET /api/v1/ratecards/applicable
 * @desc Get all applicable rate cards for a date
 * @access Private
 */
router.get('/applicable', authenticate, asyncHandler(ratecardController.getApplicableRateCards));

/**
 * @route POST /api/v1/ratecards/preview
 * @desc Preview shipping price (Admin)
 * @access Private
 */
router.post('/preview', authenticate, asyncHandler(ratecardController.previewPrice));

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
router.delete('/:id', authenticate, csrfProtection, asyncHandler(ratecardController.deleteRateCard));
router.post('/:id/clone', authenticate, csrfProtection, asyncHandler(ratecardController.cloneRateCard));

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
// Configure multer for memory storage
import multer from 'multer';
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

/**
 * @route POST /api/v1/ratecards/import
 * @desc Import rate cards from CSV/Excel
 * @access Private
 */
router.post('/import', authenticate, csrfProtection, upload.single('file'), asyncHandler(ratecardController.importRateCards));

router.post('/bulk-update', authenticate, csrfProtection, asyncHandler(ratecardController.bulkUpdateRateCards));

export default router;
