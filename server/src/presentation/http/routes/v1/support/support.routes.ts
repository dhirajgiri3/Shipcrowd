import express from 'express';
import { authenticate } from '../../../middleware/auth/auth';
import supportController from '../../../controllers/support/support.controller';
import asyncHandler from '../../../../../shared/utils/asyncHandler';

const router = express.Router();

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

export default router;
