/**
 * Export Routes
 * 
 * Routes for exporting analytics data in various formats.
 */

import express from 'express';
import { authenticate } from '../../../middleware/auth/auth.js';
import exportController from '../../../controllers/analytics/export.controller.js';
import asyncHandler from '../../../../../shared/utils/asyncHandler.js';

const router = express.Router();

/**
 * @route POST /api/v1/export/csv
 * @desc Export data to CSV format
 * @access Private
 */
router.post('/csv', authenticate, asyncHandler(exportController.exportToCSV));

/**
 * @route POST /api/v1/export/excel
 * @desc Export data to Excel format
 * @access Private
 */
router.post('/excel', authenticate, asyncHandler(exportController.exportToExcel));

/**
 * @route POST /api/v1/export/pdf
 * @desc Export data to PDF format
 * @access Private
 */
router.post('/pdf', authenticate, asyncHandler(exportController.exportToPDF));

export default router;
