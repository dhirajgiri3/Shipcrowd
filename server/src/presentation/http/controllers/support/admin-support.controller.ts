import { NextFunction, Request, Response } from 'express';
import SupportTicketService from '@/core/application/services/crm/support/SupportTicketService';
import { guardChecks, requirePlatformAdmin } from '@/shared/helpers/controller.helpers';
import { ValidationError } from '@/shared/errors/app.error';
import logger from '@/shared/logger/winston.logger';
import { calculatePagination, sendSuccess } from '@/shared/utils/responseHelper';
import { z } from 'zod';

const service = SupportTicketService.getInstance();

const updateTicketSchema = z.object({
    status: z.enum(['open', 'in_progress', 'resolved', 'closed']).optional(),
    priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    assignedTo: z.string().optional(),
    slaBreached: z.boolean().optional(),
});

const addNoteSchema = z.object({
    message: z.string().min(1),
    type: z.enum(['internal_note', 'reply']).default('internal_note'),
});

/**
 * Admin Support Controller
 * Platform-wide support ticket management for admins/super_admins.
 * Admins can view and manage tickets across all companies.
 */

/**
 * GET /api/v1/admin/support/tickets
 * List all support tickets across all companies (Admin only)
 * Query params:
 * - companyId (optional): Filter by specific company
 * - status, priority, category, search (optional)
 * - page, limit (pagination)
 */
export const getAllTickets = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req, { requireCompany: false });
        requirePlatformAdmin(auth);

        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));

        const filters: any = {};
        if (req.query.companyId) filters.companyId = req.query.companyId;
        if (req.query.status) filters.status = req.query.status;
        if (req.query.priority) filters.priority = req.query.priority;
        if (req.query.category) filters.category = req.query.category;
        if (req.query.search) filters.search = req.query.search;

        // Admin can see tickets across all companies
        const result = await service.getTicketsAdmin({
            ...filters,
            page,
            limit,
        });

        const pagination = calculatePagination(result.total, page, limit);

        res.status(200).json({
            success: true,
            data: {
                tickets: result.tickets,
                pagination
            },
            message: 'Tickets retrieved successfully'
        });

    } catch (error) {
        logger.error('Error fetching admin tickets:', error);
        next(error);
    }
};

/**
 * GET /api/v1/admin/support/tickets/:id
 * Get ticket details (Admin can view ANY ticket)
 */
export const getTicketById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req, { requireCompany: false });
        requirePlatformAdmin(auth);

        const { id } = req.params;
        const ticket = await service.getTicketByIdAdmin(id);

        sendSuccess(res, ticket, 'Ticket retrieved successfully');
    } catch (error) {
        logger.error('Error fetching admin ticket:', error);
        next(error);
    }
};

/**
 * GET /api/v1/admin/support/metrics
 * Get platform-wide or company-specific SLA metrics (Admin only)
 * Query params:
 * - companyId (optional): Get metrics for specific company, or platform-wide if omitted
 */
export const getMetrics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req, { requireCompany: false });
        requirePlatformAdmin(auth);

        const companyId = req.query.companyId as string | undefined;
        const metrics = await service.getSLAMetricsAdmin(companyId);

        sendSuccess(res, metrics, 'SLA metrics retrieved successfully');
    } catch (error) {
        logger.error('Error fetching admin metrics:', error);
        next(error);
    }
};

/**
 * PUT /api/v1/admin/support/tickets/:id
 * Update any ticket (Admin only). Optional companyId query/body can scope the mutation.
 */
export const updateTicket = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req, { requireCompany: false });
        requirePlatformAdmin(auth);

        const validation = updateTicketSchema.safeParse(req.body);
        if (!validation.success) {
            throw new ValidationError('Validation failed', validation.error.errors);
        }

        const companyId =
            (typeof req.query.companyId === 'string' ? req.query.companyId : undefined)
            || (typeof req.body?.companyId === 'string' ? req.body.companyId : undefined);

        const ticket = await service.updateTicketAdmin(
            req.params.id,
            validation.data,
            auth.userId,
            companyId
        );

        sendSuccess(res, ticket, 'Ticket updated successfully');
    } catch (error) {
        logger.error('Error updating admin ticket:', error);
        next(error);
    }
};

/**
 * POST /api/v1/admin/support/tickets/:id/notes
 * Add note/reply on any ticket (Admin only). Optional companyId query/body can scope the mutation.
 */
export const addNote = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req, { requireCompany: false });
        requirePlatformAdmin(auth);

        const validation = addNoteSchema.safeParse(req.body);
        if (!validation.success) {
            throw new ValidationError('Validation failed', validation.error.errors);
        }

        const companyId =
            (typeof req.query.companyId === 'string' ? req.query.companyId : undefined)
            || (typeof req.body?.companyId === 'string' ? req.body.companyId : undefined);

        const ticket = await service.addNoteAdmin(
            req.params.id,
            validation.data.message,
            auth.userId,
            validation.data.type,
            companyId
        );

        sendSuccess(res, ticket, 'Note added successfully');
    } catch (error) {
        logger.error('Error adding admin ticket note:', error);
        next(error);
    }
};

export default {
    getAllTickets,
    getTicketById,
    getMetrics,
    updateTicket,
    addNote,
};
