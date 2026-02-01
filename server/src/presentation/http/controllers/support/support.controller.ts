import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import SupportTicketService from '@/core/application/services/crm/support/SupportTicketService';
import logger from '@/shared/logger/winston.logger';
import { createAuditLog } from '@/presentation/http/middleware/system/audit-log.middleware';
import {
    sendSuccess,
    sendCreated,
    calculatePagination
} from '@/shared/utils/responseHelper';
import { AuthenticationError, ValidationError, NotFoundError } from '@/shared/errors/app.error';
import { ErrorCode } from '@/shared/errors/errorCodes';

// Validation schemas
const createTicketSchema = z.object({
    subject: z.string().min(5),
    category: z.enum(['technical', 'billing', 'logistics', 'other']),
    priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
    description: z.string().min(10),
    attachments: z.array(z.string()).optional(),
    relatedOrderId: z.string().optional(),
    relatedNDREventId: z.string().optional(),
});

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

const service = SupportTicketService.getInstance();

export const createTicket = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.user) {
            throw new AuthenticationError('Authentication required');
        }

        const companyId = req.user.companyId;
        if (!companyId) {
            throw new AuthenticationError('No company ID provided', ErrorCode.AUTH_REQUIRED);
        }

        const validation = createTicketSchema.safeParse(req.body);
        if (!validation.success) {
            throw new ValidationError('Validation failed', validation.error.errors);
        }

        const ticket = await service.createTicket({
            companyId: companyId.toString(),
            userId: req.user._id.toString(),
            ...validation.data
        });

        await createAuditLog(req.user._id, companyId, 'create', 'support_ticket', ticket.ticketId, { message: 'Support ticket created' }, req);

        sendCreated(res, ticket, 'Support ticket created successfully');
    } catch (error) {
        logger.error('Error creating support ticket:', error);
        next(error);
    }
};

export const getTickets = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.user || !req.user.companyId) {
            throw new AuthenticationError('Authentication required');
        }

        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));

        const result = await service.getTickets({
            companyId: req.user.companyId.toString(),
            page,
            limit,
            status: req.query.status as string,
            priority: req.query.priority as string,
            category: req.query.category as string,
            assignedTo: req.query.assignedTo as string,
            relatedOrderId: req.query.relatedOrderId as string
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
        logger.error('Error fetching tickets:', error);
        next(error);
    }
};

export const getTicketById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.user || !req.user.companyId) {
            throw new AuthenticationError('Authentication required');
        }

        const { id } = req.params;
        const ticket = await service.getTicketById(id, req.user.companyId.toString());

        sendSuccess(res, ticket, 'Ticket retrieved successfully');
    } catch (error) {
        logger.error('Error fetching ticket:', error);
        next(error);
    }
};

export const updateTicket = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.user || !req.user.companyId) {
            throw new AuthenticationError('Authentication required');
        }

        const { id } = req.params;
        const validation = updateTicketSchema.safeParse(req.body);
        if (!validation.success) {
            throw new ValidationError('Validation failed', validation.error.errors);
        }

        const ticket = await service.updateTicket(
            id,
            req.user.companyId.toString(),
            validation.data,
            req.user._id.toString()
        );

        await createAuditLog(req.user._id, req.user.companyId, 'update', 'support_ticket', ticket.ticketId, { message: 'Support ticket updated', updates: validation.data }, req);

        sendSuccess(res, ticket, 'Ticket updated successfully');
    } catch (error) {
        logger.error('Error updating ticket:', error);
        next(error);
    }
};

export const addNote = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.user || !req.user.companyId) {
            throw new AuthenticationError('Authentication required');
        }

        const { id } = req.params;
        const validation = addNoteSchema.safeParse(req.body);
        if (!validation.success) {
            throw new ValidationError('Validation failed', validation.error.errors);
        }

        const ticket = await service.addNote(
            id,
            req.user.companyId.toString(),
            validation.data.message,
            req.user._id.toString(),
            validation.data.type as 'internal_note' | 'reply'
        );

        sendSuccess(res, ticket, 'Note added successfully');
    } catch (error) {
        logger.error('Error adding note:', error);
        next(error);
    }
};

export const getMetrics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.user || !req.user.companyId) {
            throw new AuthenticationError('Authentication required');
        }

        const metrics = await service.getSLAMetrics(req.user.companyId.toString());

        sendSuccess(res, metrics, 'SLA metrics retrieved successfully');
    } catch (error) {
        logger.error('Error fetching metrics:', error);
        next(error);
    }
};

export default {
    createTicket,
    getTickets,
    getTicketById,
    updateTicket,
    addNote,
    getMetrics
};
