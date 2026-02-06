import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { guardChecks, requireCompanyContext } from '@/shared/helpers/controller.helpers';
import SalesRepService from '@/core/application/services/crm/sales/SalesRepService';
import logger from '@/shared/logger/winston.logger';
import { createAuditLog } from '@/presentation/http/middleware/system/audit-log.middleware';
import {
    sendSuccess,
    sendCreated,
    calculatePagination
} from '@/shared/utils/responseHelper';
import { AuthenticationError, ValidationError } from '@/shared/errors/app.error';
import { ErrorCode } from '@/shared/errors/errorCodes';

// Validation schemas
const bankDetailsSchema = z.object({
    accountNumber: z.string().min(5),
    ifscCode: z.string().min(5),
    accountHolderName: z.string().min(2),
});

const createSalesRepSchema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    phone: z.string().min(10),
    territory: z.string().min(2),
    reportingTo: z.string().optional(),
    bankDetails: bankDetailsSchema,
    userId: z.string().optional(),
});

const updateSalesRepSchema = z.object({
    name: z.string().min(2).optional(),
    email: z.string().email().optional(),
    phone: z.string().min(10).optional(),
    territory: z.string().min(2).optional(),
    status: z.enum(['active', 'inactive']).optional(),
    availabilityStatus: z.enum(['available', 'busy', 'offline']).optional(),
    reportingTo: z.string().optional(),
    bankDetails: bankDetailsSchema.optional(),
});

const service = SalesRepService.getInstance();

export const createSalesRep = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req);
        requireCompanyContext(auth);

        const validation = createSalesRepSchema.safeParse(req.body);
        if (!validation.success) {
            throw new ValidationError('Validation failed', validation.error.errors);
        }

        const rep = await service.createSalesRep({
            companyId: auth.companyId,
            ...validation.data
        });

        await createAuditLog(auth.userId, auth.companyId, 'create', 'sales_rep', rep.id, { message: 'Sales Representative created', name: rep.name }, req);

        sendCreated(res, rep, 'Sales Representative created successfully');
    } catch (error) {
        logger.error('Error creating sales rep:', error);
        next(error);
    }
};

export const getSalesReps = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req);
        requireCompanyContext(auth);

        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));

        const result = await service.getSalesReps(auth.companyId, {
            page,
            limit,
            territory: req.query.territory as string,
            status: req.query.status as string,
        });

        const pagination = calculatePagination(result.total, page, limit);

        res.status(200).json({
            success: true,
            data: {
                reps: result.reps,
                pagination
            },
            message: 'Sales Representatives retrieved successfully'
        });
    } catch (error) {
        logger.error('Error fetching sales reps:', error);
        next(error);
    }
};

export const getSalesRepById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req);
        requireCompanyContext(auth);

        const { id } = req.params;
        // Check if user has permission to view bank details (e.g. admin or finance role)
        // For now, let's assume specific permission check is mocked or we pass a flag
        // In a real scenario, check req.user.roles or permissions
        const canViewBankDetails = true; // Placeholder for permission check

        const rep = await service.getSalesRepById(id, auth.companyId, canViewBankDetails);

        sendSuccess(res, rep, 'Sales Representative details retrieved successfully');
    } catch (error) {
        logger.error('Error fetching sales rep details:', error);
        next(error);
    }
};

export const updateSalesRep = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req);
        requireCompanyContext(auth);

        const { id } = req.params;
        const validation = updateSalesRepSchema.safeParse(req.body);
        if (!validation.success) {
            throw new ValidationError('Validation failed', validation.error.errors);
        }

        const rep = await service.updateSalesRep(
            id,
            auth.companyId,
            validation.data
        );

        await createAuditLog(auth.userId, auth.companyId, 'update', 'sales_rep', rep.id, { message: 'Sales Representative updated', updates: validation.data }, req);

        sendSuccess(res, rep, 'Sales Representative updated successfully');
    } catch (error) {
        logger.error('Error updating sales rep:', error);
        next(error);
    }
};

export const getPerformanceMetrics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req);
        requireCompanyContext(auth);

        const { id } = req.params;
        const metrics = await service.getPerformanceMetrics(id, auth.companyId);

        sendSuccess(res, metrics, 'Performance metrics retrieved successfully');
    } catch (error) {
        logger.error('Error fetching performance metrics:', error);
        next(error);
    }
};

export default {
    createSalesRep,
    getSalesReps,
    getSalesRepById,
    updateSalesRep,
    getPerformanceMetrics
};
