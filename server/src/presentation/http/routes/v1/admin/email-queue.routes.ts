import express from 'express';
import { authenticate } from '../../../middleware/auth/auth';
import { requireAccess } from '../../../middleware/index';
import * as emailQueueController from '../../../controllers/admin/email-queue.controller';

const router = express.Router();

/**
 * Email Queue Management Routes (Admin Only)
 */

/**
 * @route GET /admin/email-queue/stats
 * @desc Get email queue statistics
 * @access Private (Admin)
 */
router.get(
    '/stats',
    authenticate,
    requireAccess({ roles: ['admin'] }),
    emailQueueController.getEmailQueueStats
);

/**
 * @route GET /admin/email-queue/failed
 * @desc Get failed emails
 * @access Private (Admin)
 */
router.get(
    '/failed',
    authenticate,
    requireAccess({ roles: ['admin'] }),
    emailQueueController.getFailedEmails
);

/**
 * @route GET /admin/email-queue/recent
 * @desc Get recent email jobs
 * @access Private (Admin)
 */
router.get(
    '/recent',
    authenticate,
    requireAccess({ roles: ['admin'] }),
    emailQueueController.getRecentJobs
);

/**
 * @route POST /admin/email-queue/retry/:jobId
 * @desc Retry a failed email
 * @access Private (Admin)
 */
router.post(
    '/retry/:jobId',
    authenticate,
    requireAccess({ roles: ['admin'] }),
    emailQueueController.retryFailedEmail
);

/**
 * @route POST /admin/email-queue/retry-all
 * @desc Retry all failed emails
 * @access Private (Admin)
 */
router.post(
    '/retry-all',
    authenticate,
    requireAccess({ roles: ['admin'] }),
    emailQueueController.retryAllFailedEmails
);

/**
 * @route DELETE /admin/email-queue/:jobId
 * @desc Delete a failed email job
 * @access Private (Admin)
 */
router.delete(
    '/:jobId',
    authenticate,
    requireAccess({ roles: ['admin'] }),
    emailQueueController.deleteFailedEmail
);

/**
 * @route POST /admin/email-queue/clean
 * @desc Clean completed jobs from queue
 * @access Private (Admin)
 */
router.post(
    '/clean',
    authenticate,
    requireAccess({ roles: ['admin'] }),
    emailQueueController.cleanCompletedJobs
);

export default router;
