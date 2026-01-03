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
import { sendValidationError } from '../../../../shared/utils/responseHelper';
import {
    createSalesRepSchema,
    updateSalesRepSchema,
    listSalesRepsQuerySchema,
    assignTerritorySchema,
    idParamSchema,
} from '../../../../shared/validation/commission-schemas';
import logger from '../../../../shared/logger/winston.logger';

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
                const errors = validation.error.errors.map(err => ({
                    code: 'VALIDATION_ERROR',
                    message: err.message,
                    field: err.path.join('.'),
                }));
                sendValidationError(res, errors);
                return;
            }

            const salesRep = await SalesRepresentativeService.createSalesRep(
                validation.data,
                String(userId),
                String(companyId)
            );

            res.status(201).json({
                success: true,
                message: 'Sales representative created successfully',
                data: salesRep,
            });
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
                const errors = validation.error.errors.map(err => ({
                    code: 'VALIDATION_ERROR',
                    message: err.message,
                    field: err.path.join('.'),
                }));
                sendValidationError(res, errors);
                return;
            }

            const { page, limit, status, role, territory, sortBy, sortOrder } = validation.data;

            const result = await SalesRepresentativeService.listSalesReps(
                String(companyId),
                { status, role, territory },
                { page, limit, sortBy, sortOrder }
            );

            res.status(200).json({
                success: true,
                data: result.data,
                pagination: {
                    page: result.page,
                    limit: result.limit,
                    total: result.total,
                    totalPages: result.totalPages,
                },
            });
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

            res.status(200).json({
                success: true,
                data: salesRep,
            });
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
                const errors = validation.error.errors.map(err => ({
                    code: 'VALIDATION_ERROR',
                    message: err.message,
                    field: err.path.join('.'),
                }));
                sendValidationError(res, errors);
                return;
            }

            const salesRep = await SalesRepresentativeService.updateSalesRep(
                id,
                validation.data,
                String(userId),
                String(companyId)
            );

            res.status(200).json({
                success: true,
                message: 'Sales representative updated successfully',
                data: salesRep,
            });
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

            res.status(200).json({
                success: true,
                message: 'Sales representative deactivated successfully',
            });
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

            res.status(200).json({
                success: true,
                data: {
                    employeeId: salesRep.employeeId,
                    performanceMetrics: salesRep.performanceMetrics,
                    kpiTargets: salesRep.kpiTargets,
                },
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
                const errors = validation.error.errors.map(err => ({
                    code: 'VALIDATION_ERROR',
                    message: err.message,
                    field: err.path.join('.'),
                }));
                sendValidationError(res, errors);
                return;
            }

            const salesRep = await SalesRepresentativeService.assignTerritory(
                id,
                validation.data.territories,
                String(userId),
                String(companyId)
            );

            res.status(200).json({
                success: true,
                message: 'Territories assigned successfully',
                data: {
                    employeeId: salesRep.employeeId,
                    territory: salesRep.territory,
                },
            });
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

            res.status(200).json({
                success: true,
                message: 'Performance metrics refreshed successfully',
            });
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

            res.status(200).json({
                success: true,
                data: team,
                count: team.length,
            });
        } catch (error) {
            next(error);
        }
    }
}

export default SalesRepresentativeController;
