import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import SupportTicketService from '@/core/application/services/crm/support/SupportTicketService';
import StorageService from '@/core/application/services/storage/storage.service';
import logger from '@/shared/logger/winston.logger';
import { createAuditLog } from '@/presentation/http/middleware/system/audit-log.middleware';
import { guardChecks, requireCompanyContext } from '@/shared/helpers/controller.helpers';
import {
    sendSuccess,
    sendCreated,
    calculatePagination
} from '@/shared/utils/responseHelper';
import { ValidationError } from '@/shared/errors/app.error';

// Validation schemas
const createTicketSchema = z.object({
    subject: z.string().min(5),
    category: z.enum(['technical', 'billing', 'logistics', 'other']),
    priority: z.enum(['low', 'medium', 'high', 'critical', 'urgent'])
        .transform(val => val === 'urgent' ? 'critical' : val)
        .default('medium'),
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

/** Allowed MIME types for support ticket attachments */
const ALLOWED_ATTACHMENT_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_FILES = 5;

/**
 * Upload attachments for support tickets
 * POST /support/upload
 * Expects multipart/form-data with field "files" (array of files)
 * Returns { urls: string[] }
 */
export const uploadAttachments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req);
        requireCompanyContext(auth);
        const companyId = auth.companyId.toString();

        const files = req.files as Express.Multer.File[];
        if (!files?.length) {
            throw new ValidationError('No files uploaded', [{ field: 'files', message: 'At least one file is required' }]);
        }

        if (files.length > MAX_FILES) {
            throw new ValidationError(`Maximum ${MAX_FILES} files allowed`, [{ field: 'files', message: `You can upload up to ${MAX_FILES} files` }]);
        }

        const urls: string[] = [];
        for (const file of files) {
            if (file.size > MAX_FILE_SIZE) {
                throw new ValidationError(`File "${file.originalname}" exceeds 5MB limit`, [{ field: 'files', message: 'Max 5MB per file' }]);
            }
            if (!ALLOWED_ATTACHMENT_TYPES.includes(file.mimetype)) {
                throw new ValidationError(`File type "${file.mimetype}" not allowed for "${file.originalname}"`, [{ field: 'files', message: 'Invalid file type' }]);
            }

            const result = await StorageService.upload(file.buffer, {
                folder: `support/attachments/${companyId}`,
                contentType: file.mimetype,
                fileName: `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`,
            });
            urls.push(result.url);
        }

        sendSuccess(res, { urls }, 'Files uploaded successfully');
    } catch (error) {
        logger.error('Error uploading support attachments:', error);
        next(error);
    }
};

export const createTicket = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req);
        requireCompanyContext(auth);

        const validation = createTicketSchema.safeParse(req.body);
        if (!validation.success) {
            throw new ValidationError('Validation failed', validation.error.errors);
        }

        const ticket = await service.createTicket({
            companyId: auth.companyId.toString(),
            userId: auth.userId.toString(),
            ...validation.data
        });

        await createAuditLog(auth.userId, auth.companyId, 'create', 'support_ticket', ticket.ticketId, { message: 'Support ticket created' }, req);

        sendCreated(res, ticket, 'Support ticket created successfully');
    } catch (error) {
        logger.error('Error creating support ticket:', error);
        next(error);
    }
};

export const getTickets = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req);
        requireCompanyContext(auth);

        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));

        const result = await service.getTickets({
            companyId: auth.companyId.toString(),
            page,
            limit,
            status: req.query.status as string,
            priority: req.query.priority as string,
            category: req.query.category as string,
            assignedTo: req.query.assignedTo as string,
            relatedOrderId: req.query.relatedOrderId as string,
            search: req.query.search as string
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
        const auth = guardChecks(req);
        requireCompanyContext(auth);

        const { id } = req.params;
        const ticket = await service.getTicketById(id, auth.companyId.toString());

        sendSuccess(res, ticket, 'Ticket retrieved successfully');
    } catch (error) {
        logger.error('Error fetching ticket:', error);
        next(error);
    }
};

export const updateTicket = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req);
        requireCompanyContext(auth);

        const { id } = req.params;
        const validation = updateTicketSchema.safeParse(req.body);
        if (!validation.success) {
            throw new ValidationError('Validation failed', validation.error.errors);
        }

        const ticket = await service.updateTicket(
            id,
            auth.companyId.toString(),
            validation.data,
            auth.userId.toString()
        );

        await createAuditLog(auth.userId, auth.companyId, 'update', 'support_ticket', ticket.ticketId, { message: 'Support ticket updated', updates: validation.data }, req);

        sendSuccess(res, ticket, 'Ticket updated successfully');
    } catch (error) {
        logger.error('Error updating ticket:', error);
        next(error);
    }
};

export const addNote = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req);
        requireCompanyContext(auth);

        const { id } = req.params;
        const validation = addNoteSchema.safeParse(req.body);
        if (!validation.success) {
            throw new ValidationError('Validation failed', validation.error.errors);
        }

        const ticket = await service.addNote(
            id,
            auth.companyId.toString(),
            validation.data.message,
            auth.userId.toString(),
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
        const auth = guardChecks(req);
        requireCompanyContext(auth);

        const metrics = await service.getSLAMetrics(auth.companyId.toString());

        sendSuccess(res, metrics, 'SLA metrics retrieved successfully');
    } catch (error) {
        logger.error('Error fetching metrics:', error);
        next(error);
    }
};

export default {
    uploadAttachments,
    createTicket,
    getTickets,
    getTicketById,
    updateTicket,
    addNote,
    getMetrics
};
