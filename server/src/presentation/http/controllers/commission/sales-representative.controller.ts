/**
 * Sales Representative Controller
 * 
 * Handles HTTP endpoints for sales representative management:
 * - CRUD operations
 * - Performance metrics
 * - Territory management
 * - Team hierarchy
 */

import { Request, Response, NextFunction } from 'express';
import SalesRepresentativeService from '../../../../core/application/services/commission/sales-representative.service';
import { AppError } from '../../../../shared/errors/index';
import { ValidationError } from '../../../../shared/errors/app.error';
import {
    createSalesRepSchema,
    updateSalesRepSchema,
    listSalesRepsQuerySchema,
    assignTerritorySchema,
    idParamSchema,
} from '../../../../shared/validation/commission-schemas';
import logger from '../../../../shared/logger/winston.logger';
import { sendSuccess, sendCreated, sendPaginated, calculatePagination } from '../../../../shared/utils/responseHelper';

export class SalesRepresentativeController {
    /**
     * Create a new sales representative
     * POST /commission/sales-reps
     * Auth: admin, manager
     */
    static async createSalesRep(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const companyId = req.user?.companyId;
            const userId = req.user?._id;

            if (!companyId || !userId) {
                throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
            }

            // Validate request body
            const validation = createSalesRepSchema.safeParse(req.body);
            if (!validation.success) {
                const details = validation.error.errors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message,
                }));
                throw new ValidationError('Validation failed', details);
            }

            const salesRep = await SalesRepresentativeService.createSalesRep(
                validation.data,
                String(userId),
                String(companyId)
            );

            sendCreated(res, salesRep, 'Sales representative created successfully');
        } catch (error) {
            next(error);
        }
    }

    /**
     * List sales representatives
     * GET /commission/sales-reps
     * Auth: authenticated
     */
    static async listSalesReps(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const companyId = req.user?.companyId;

            if (!companyId) {
                throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
            }

            // Validate query parameters
            const validation = listSalesRepsQuerySchema.safeParse(req.query);
            if (!validation.success) {
                const details = validation.error.errors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message,
                }));
                throw new ValidationError('Validation failed', details);
            }

            const { page, limit, status, role, territory, sortBy, sortOrder } = validation.data;

            const result = await SalesRepresentativeService.listSalesReps(
                String(companyId),
                { status, role, territory },
                { page, limit, sortBy, sortOrder }
            );

            const pagination = calculatePagination(result.total, result.page, result.limit);
            sendPaginated(res, result.data, pagination);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get a sales representative by ID
     * GET /commission/sales-reps/:id
     * Auth: authenticated (self or manager)
     */
    static async getSalesRep(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const companyId = req.user?.companyId;
            const userId = req.user?._id;
            const userRole = req.user?.role;
            const { id } = req.params;

            if (!companyId) {
                throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
            }

            // Validate ID param
            const paramValidation = idParamSchema.safeParse({ id });
            if (!paramValidation.success) {
                throw new AppError('Invalid sales rep ID', 'BAD_REQUEST', 400);
            }

            // Check if requesting bank details
            const includeBankDetails =
                req.query.includeBankDetails === 'true' &&
                (userRole === 'admin' || userRole === 'manager');

            const salesRep = await SalesRepresentativeService.getSalesRep(
                id,
                String(companyId),
                includeBankDetails
            );

            sendSuccess(res, salesRep);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Update a sales representative
     * PUT /commission/sales-reps/:id
     * Auth: admin, manager (self with limited fields)
     */
    static async updateSalesRep(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const companyId = req.user?.companyId;
            const userId = req.user?._id;
            const { id } = req.params;

            if (!companyId || !userId) {
                throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
            }

            // Validate ID param
            const paramValidation = idParamSchema.safeParse({ id });
            if (!paramValidation.success) {
                throw new AppError('Invalid sales rep ID', 'BAD_REQUEST', 400);
            }

            // Validate request body
            const validation = updateSalesRepSchema.safeParse(req.body);
            if (!validation.success) {
                const details = validation.error.errors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message,
                }));
                throw new ValidationError('Validation failed', details);
            }

            const salesRep = await SalesRepresentativeService.updateSalesRep(
                id,
                validation.data,
                String(userId),
                String(companyId)
            );

            sendSuccess(res, salesRep, 'Sales representative updated successfully');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Delete (deactivate) a sales representative
     * DELETE /commission/sales-reps/:id
     * Auth: admin
     */
    static async deleteSalesRep(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const companyId = req.user?.companyId;
            const userId = req.user?._id;
            const { id } = req.params;

            if (!companyId || !userId) {
                throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
            }

            // Validate ID param
            const paramValidation = idParamSchema.safeParse({ id });
            if (!paramValidation.success) {
                throw new AppError('Invalid sales rep ID', 'BAD_REQUEST', 400);
            }

            await SalesRepresentativeService.deleteSalesRep(id, String(userId), String(companyId));

            sendSuccess(res, null, 'Sales representative deactivated successfully');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get performance metrics for a sales representative
     * GET /commission/sales-reps/:id/performance
     * Auth: authenticated (self)
     */
    static async getPerformance(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const companyId = req.user?.companyId;
            const { id } = req.params;

            if (!companyId) {
                throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
            }

            // Validate ID param
            const paramValidation = idParamSchema.safeParse({ id });
            if (!paramValidation.success) {
                throw new AppError('Invalid sales rep ID', 'BAD_REQUEST', 400);
            }

            const salesRep = await SalesRepresentativeService.getSalesRep(id, String(companyId));

            sendSuccess(res, {
                employeeId: salesRep.employeeId,
                performanceMetrics: salesRep.performanceMetrics,
                kpiTargets: salesRep.kpiTargets,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Assign territories to a sales representative
     * PUT /commission/sales-reps/:id/territory
     * Auth: admin, manager
     */
    static async assignTerritory(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const companyId = req.user?.companyId;
            const userId = req.user?._id;
            const { id } = req.params;

            if (!companyId || !userId) {
                throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
            }

            // Validate ID param
            const paramValidation = idParamSchema.safeParse({ id });
            if (!paramValidation.success) {
                throw new AppError('Invalid sales rep ID', 'BAD_REQUEST', 400);
            }

            // Validate request body
            const validation = assignTerritorySchema.safeParse(req.body);
            if (!validation.success) {
                const details = validation.error.errors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message,
                }));
                throw new ValidationError('Validation failed', details);
            }

            const salesRep = await SalesRepresentativeService.assignTerritory(
                id,
                validation.data.territories,
                String(userId),
                String(companyId)
            );

            sendSuccess(res, {
                employeeId: salesRep.employeeId,
                territory: salesRep.territory,
            }, 'Territories assigned successfully');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Refresh cached performance metrics
     * POST /commission/sales-reps/:id/refresh-metrics
     * Auth: admin, manager
     */
    static async refreshMetrics(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const companyId = req.user?.companyId;
            const { id } = req.params;

            if (!companyId) {
                throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
            }

            // Validate ID param
            const paramValidation = idParamSchema.safeParse({ id });
            if (!paramValidation.success) {
                throw new AppError('Invalid sales rep ID', 'BAD_REQUEST', 400);
            }

            await SalesRepresentativeService.updatePerformanceMetrics(id, String(companyId));

            sendSuccess(res, null, 'Performance metrics refreshed successfully');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get team hierarchy for a manager
     * GET /commission/sales-reps/:id/team
     * Auth: admin, manager
     */
    static async getTeam(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const companyId = req.user?.companyId;
            const { id } = req.params;

            if (!companyId) {
                throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
            }

            // Validate ID param
            const paramValidation = idParamSchema.safeParse({ id });
            if (!paramValidation.success) {
                throw new AppError('Invalid sales rep ID', 'BAD_REQUEST', 400);
            }

            const team = await SalesRepresentativeService.getTeamHierarchy(id, String(companyId));

            sendSuccess(res, {
                team,
                count: team.length,
            });
        } catch (error) {
            next(error);
        }
    }
}

export default SalesRepresentativeController;
