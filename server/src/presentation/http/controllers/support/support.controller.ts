import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { SupportTicket } from '../../../../infrastructure/database/mongoose/models';
import logger from '../../../../shared/logger/winston.logger';
import { createAuditLog } from '../../middleware/system/audit-log.middleware';
import {
    sendSuccess,
    sendPaginated,
    sendCreated,
    calculatePagination
} from '../../../../shared/utils/responseHelper';
import { AuthenticationError, ValidationError, NotFoundError } from '../../../../shared/errors/app.error';
import { ErrorCode } from '../../../../shared/errors/errorCodes';

// Validation schemas
const createTicketSchema = z.object({
    subject: z.string().min(5),
    category: z.enum(['technical', 'billing', 'logistics', 'other']),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
    description: z.string().min(10),
    attachments: z.array(z.string()).optional(),
});

const updateTicketSchema = z.object({
    status: z.enum(['open', 'in_progress', 'resolved', 'closed']).optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
});

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

        const ticket = new SupportTicket({
            ...validation.data,
            companyId,
            userId: req.user._id,
            status: 'open',
            history: [{
                action: 'created',
                actor: req.user._id,
                message: 'Ticket created',
                timestamp: new Date()
            }]
        });

        await ticket.save();

        await createAuditLog(req.user._id, companyId, 'create', 'support_ticket', ticket.ticketId, { message: 'Support ticket created' }, req);

        sendCreated(res, ticket, 'Support ticket created successfully');
    } catch (error) {
        logger.error('Error creating support ticket:', error);
        next(error);
    }
};

export const getTickets = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.user) {
            throw new AuthenticationError('Authentication required');
        }

        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
        const skip = (page - 1) * limit;

        const filter: any = { companyId: req.user.companyId };

        // Status filter
        if (req.query.status) {
            const statuses = (req.query.status as string).split(',');
            filter.status = { $in: statuses };
        }

        // Category filter
        if (req.query.category) {
            filter.category = req.query.category;
        }

        // Search
        if (req.query.search) {
            filter.$or = [
                { subject: { $regex: req.query.search, $options: 'i' } },
                { ticketId: { $regex: req.query.search, $options: 'i' } }
            ];
        }

        const [tickets, total] = await Promise.all([
            SupportTicket.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            SupportTicket.countDocuments(filter),
        ]);

        const pagination = calculatePagination(total, page, limit);

        // Return format matches TicketResponse interface in frontend: { tickets: [], pagination: {} }
        // sendPaginated usually returns { data: [], pagination: {} }
        // We'll use sendSuccess to shape it exactly as hook expects if needed, 
        // but useSupportTickets expects { tickets: ..., pagination: ... } inside `data`.
        // My sendPaginated helper returns standard structure. 
        // Frontend hook: `return data.data` where data.data is TicketResponse.
        // TicketResponse = { tickets: [], pagination: {} }
        // sendPaginated structure: { success: true, data: { items: [], pagination: {} } } usually?
        // Let's check sendPaginated helper.
        // Assuming standard response helper does the right thing. 
        // Actually, hook interface says: `TicketResponse { tickets: SupportTicket[]; pagination: ... }`
        // So I should structure specifically.

        res.status(200).json({
            success: true,
            data: {
                tickets,
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
        if (!req.user) {
            throw new AuthenticationError('Authentication required');
        }

        const { id } = req.params; // This might be _id or ticketId. Hook uses `id` param.
        // Frontend uses `ticket.ticketId` for display but `_id` for keys. 
        // `useSupportTicket(id)` calls `/support/tickets/${id}`. usually ID refers to _id.

        const ticket = await SupportTicket.findOne({
            _id: id,
            companyId: req.user.companyId
        }).lean();

        if (!ticket) {
            throw new NotFoundError('Support ticket', ErrorCode.RES_NOT_FOUND);
        }

        sendSuccess(res, ticket, 'Ticket retrieved successfully');
    } catch (error) {
        logger.error('Error fetching ticket:', error);
        next(error);
    }
};

export default {
    createTicket,
    getTickets,
    getTicketById
};
