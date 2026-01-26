import express from 'express';
import { authenticate } from '../../../middleware/auth/auth';
import { csrfProtection } from '../../../middleware';
import scheduledReportController from '../../../controllers/analytics/scheduled-report.controller';
import asyncHandler from '../../../../../shared/utils/asyncHandler';

const router = express.Router();

/**
 * @route GET /api/v1/reports/scheduled
 * @desc List all scheduled reports
 * @access Private
 * @query reportType - Filter by report type
 * @query isActive - Filter by status
 * @query frequency - Filter by schedule frequency
 */
router.get(
    '/scheduled',
    authenticate,
    asyncHandler(scheduledReportController.listScheduledReports)
);

/**
 * @route GET /api/v1/reports/scheduled/:id
 * @desc Get single scheduled report
 * @access Private
 */
router.get(
    '/scheduled/:id',
    authenticate,
    asyncHandler(scheduledReportController.getScheduledReport)
);

/**
 * @route POST /api/v1/reports/scheduled
 * @desc Create new scheduled report
 * @access Private
 */
router.post(
    '/scheduled',
    authenticate,
    csrfProtection,
    asyncHandler(scheduledReportController.createScheduledReport)
);

/**
 * @route PATCH /api/v1/reports/scheduled/:id
 * @desc Update scheduled report
 * @access Private
 */
router.patch(
    '/scheduled/:id',
    authenticate,
    csrfProtection,
    asyncHandler(scheduledReportController.updateScheduledReport)
);

/**
 * @route DELETE /api/v1/reports/scheduled/:id
 * @desc Delete scheduled report
 * @access Private
 */
router.delete(
    '/scheduled/:id',
    authenticate,
    csrfProtection,
    asyncHandler(scheduledReportController.deleteScheduledReport)
);

/**
 * @route POST /api/v1/reports/scheduled/:id/execute
 * @desc Execute report immediately (manual trigger)
 * @access Private
 */
router.post(
    '/scheduled/:id/execute',
    authenticate,
    csrfProtection,
    asyncHandler(scheduledReportController.executeReportNow)
);

/**
 * @route POST /api/v1/reports/scheduled/:id/pause
 * @desc Pause scheduled report
 * @access Private
 */
router.post(
    '/scheduled/:id/pause',
    authenticate,
    csrfProtection,
    asyncHandler(scheduledReportController.pauseReport)
);

/**
 * @route POST /api/v1/reports/scheduled/:id/resume
 * @desc Resume scheduled report
 * @access Private
 */
router.post(
    '/scheduled/:id/resume',
    authenticate,
    csrfProtection,
    asyncHandler(scheduledReportController.resumeReport)
);

export default router;
