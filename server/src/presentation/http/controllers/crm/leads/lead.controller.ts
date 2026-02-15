import { LeadService } from '@/core/application/services/crm/leads/lead.service';
import { ValidationError } from '@/shared/errors';
import { guardChecks, requireCompanyContext } from '@/shared/helpers/controller.helpers';
import logger from '@/shared/logger/winston.logger';
import { calculatePagination, sendCreated, sendSuccess } from '@/shared/utils/responseHelper';
import { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';

const leadService = new LeadService(); // Assuming service doesn't have getInstance yet, will check service next

const createLeadSchema = z.object({
    name: z.string().min(2),
    email: z.string().email().optional(),
    phone: z.string().min(10),
    companyName: z.string().optional(),
    source: z.enum(['website', 'referral', 'cold-call', 'event', 'social-media', 'other']).optional(),
    territory: z.string().optional(),
    salesRepresentative: z.string().optional(),
    notes: z.string().optional(),
});

export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req);
        requireCompanyContext(auth);

        const validation = createLeadSchema.safeParse(req.body);
        if (!validation.success) {
            throw new ValidationError('Validation failed', validation.error.errors);
        }

        const leadData: any = {
            company: new mongoose.Types.ObjectId(auth.companyId),
            ...validation.data
        };

        if (validation.data.salesRepresentative) {
            leadData.salesRepresentative = new mongoose.Types.ObjectId(validation.data.salesRepresentative);
        }

        const lead = await leadService.createLead(leadData);

        sendCreated(res, lead, 'Lead created successfully');
    } catch (error) {
        logger.error('Error creating lead:', error);
        next(error);
    }
};

export const findAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req);
        requireCompanyContext(auth);

        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));

        const result = await leadService.getLeads(
            { ...req.query, company: auth.companyId },
            page,
            limit
        );

        const pagination = calculatePagination(result.total, page, limit);

        res.status(200).json({
            success: true,
            data: {
                leads: result.leads,
                pagination
            },
            message: 'Leads retrieved successfully'
        });
    } catch (error) {
        logger.error('Error fetching leads:', error);
        next(error);
    }
};

export const update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params;
        if (!id) throw new ValidationError('Lead ID is required');

        const lead = await leadService.updateLead(id, req.body);
        sendSuccess(res, lead, 'Lead updated successfully');
    } catch (error) {
        logger.error('Error updating lead:', error);
        next(error);
    }
};

export const convert = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params;
        const { orderId } = req.body;

        if (!id || !orderId) throw new ValidationError('Lead ID and Order ID are required');

        const lead = await leadService.convertLead(id, orderId);
        sendSuccess(res, lead, 'Lead converted successfully');
    } catch (error) {
        logger.error('Error converting lead:', error);
        next(error);
    }
};

export const getFunnelMetrics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { days } = req.query;
        const dateFrom = days ? new Date(Date.now() - parseInt(days as string) * 24 * 60 * 60 * 1000) : undefined;

        const metrics = await leadService.getFunnelMetrics(dateFrom);
        sendSuccess(res, metrics, 'Funnel metrics retrieved successfully');
    } catch (error) {
        logger.error('Error fetching funnel metrics:', error);
        next(error);
    }
};

export default {
    create,
    findAll,
    update,
    convert,
    getFunnelMetrics
};
