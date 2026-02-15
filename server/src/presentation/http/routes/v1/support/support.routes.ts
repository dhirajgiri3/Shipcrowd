import express from 'express';
import multer from 'multer';
import asyncHandler from '../../../../../shared/utils/asyncHandler';
import supportController from '../../../controllers/support/support.controller';
import { authenticate } from '../../../middleware/auth/auth';

const router = express.Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024, files: 5 },
});

/**
 * @route POST /support/upload
 * @desc Upload attachments for support tickets (returns URLs)
 * @access Private
 */
router.post(
    '/upload',
    authenticate,
    upload.array('files', 5),
    asyncHandler(supportController.uploadAttachments)
);

/**
 * @route GET /support/tickets
 * @desc Get all tickets
 * @access Private
 */
router.get(
    '/tickets',
    authenticate,
    asyncHandler(supportController.getTickets)
);

/**
 * @route POST /support/tickets
 * @desc Create a new ticket
 * @access Private
 */
router.post(
    '/tickets',
    authenticate,
    asyncHandler(supportController.createTicket)
);

/**
 * @route GET /support/tickets/:id
 * @desc Get ticket details
 * @access Private
 */
router.get(
    '/tickets/:id',
    authenticate,
    asyncHandler(supportController.getTicketById)
);

/**
 * @route PUT /support/tickets/:id
 * @desc Update ticket details (status, priority, assignment)
 * @access Private
 */
router.put(
    '/tickets/:id',
    authenticate,
    asyncHandler(supportController.updateTicket)
);

/**
 * @route POST /support/tickets/:id/notes
 * @desc Add note or reply to ticket
 * @access Private
 */
router.post(
    '/tickets/:id/notes',
    authenticate,
    asyncHandler(supportController.addNote)
);

/**
 * @route GET /support/metrics
 * @desc Get SLA metrics for dashboard
 * @access Private
 */
router.get(
    '/metrics',
    authenticate,
    asyncHandler(supportController.getMetrics)
);

export default router;
