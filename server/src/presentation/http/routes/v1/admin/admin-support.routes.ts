import { Router } from 'express';
import asyncHandler from '../../../../../shared/utils/asyncHandler';
import adminSupportController from '../../../controllers/support/admin-support.controller';
import { authenticate } from '../../../middleware/auth/auth';
import { requireAccess } from '../../../middleware/auth/unified-access';

const router = Router();

// All routes require authentication and admin/super_admin access
router.use(authenticate);
router.use(requireAccess({ roles: ['admin', 'super_admin'] }));

/**
 * @route GET /api/v1/admin/support/tickets
 * @desc List all support tickets across all companies
 * @query companyId (optional) - Filter by specific company
 * @query status, priority, category, search (optional)
 * @query page, limit (pagination)
 * @access Admin only
 */
router.get('/tickets', asyncHandler(adminSupportController.getAllTickets));

/**
 * @route GET /api/v1/admin/support/tickets/:id
 * @desc Get ticket details (admin can view any ticket)
 * @access Admin only
 */
router.get('/tickets/:id', asyncHandler(adminSupportController.getTicketById));

/**
 * @route PUT /api/v1/admin/support/tickets/:id
 * @desc Update ticket details (admin can update any ticket)
 * @access Admin only
 */
router.put('/tickets/:id', asyncHandler(adminSupportController.updateTicket));

/**
 * @route POST /api/v1/admin/support/tickets/:id/notes
 * @desc Add note/reply to ticket (admin can update any ticket)
 * @access Admin only
 */
router.post('/tickets/:id/notes', asyncHandler(adminSupportController.addNote));

/**
 * @route GET /api/v1/admin/support/metrics
 * @desc Get platform-wide or company-specific SLA metrics
 * @query companyId (optional) - Get metrics for specific company, or platform-wide if omitted
 * @access Admin only
 */
router.get('/metrics', asyncHandler(adminSupportController.getMetrics));

export default router;
