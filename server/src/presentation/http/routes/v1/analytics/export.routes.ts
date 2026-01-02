/**
 * Export Routes
 *
 * Routes for exporting analytics data in various formats.
 */

import express from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../../../middleware/auth/auth.js';
import exportController from '../../../controllers/analytics/export.controller.js';
import asyncHandler from '../../../../../shared/utils/asyncHandler.js';

const router = express.Router();

// Rate limiter for export endpoints (expensive operations)
// Limit: 10 exports per 15 minutes per user/IP
const exportRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 requests per window
    message: 'Too many export requests. Please try again later.',
    standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false, // Disable `X-RateLimit-*` headers
    // Key by user _id if authenticated, otherwise by IP
    keyGenerator: (req) => {
        return (req.user?._id?.toString()) || req.ip || 'unknown';
    },
    skip: () => {
        // Skip rate limiting in test environment
        return process.env.NODE_ENV === 'test';
    }
});

/**
 * @route POST /api/v1/export/csv
 * @desc Export data to CSV format
 * @access Private
 * @rateLimit 10 requests per 15 minutes
 */
router.post('/csv', authenticate, exportRateLimiter, asyncHandler(exportController.exportToCSV));

/**
 * @route POST /api/v1/export/excel
 * @desc Export data to Excel format
 * @access Private
 * @rateLimit 10 requests per 15 minutes
 */
router.post('/excel', authenticate, exportRateLimiter, asyncHandler(exportController.exportToExcel));

/**
 * @route POST /api/v1/export/pdf
 * @desc Export data to PDF format
 * @access Private
 * @rateLimit 10 requests per 15 minutes
 */
router.post('/pdf', authenticate, exportRateLimiter, asyncHandler(exportController.exportToPDF));

export default router;
