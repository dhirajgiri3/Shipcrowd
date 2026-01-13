/**
 * Commission Rule Controller
 * 
 * Handles HTTP endpoints for commission rule management:
 * - CRUD operations
 * - Rule testing
 * - Finding applicable rules
 */

import { Request, Response, NextFunction } from 'express';
import CommissionRuleService from '../../../../core/application/services/commission/commission-rule.service';
import { AppError } from '../../../../shared/errors/index';
import { ValidationError } from '../../../../shared/errors/app.error';
import {
    createCommissionRuleSchema,
    updateCommissionRuleSchema,
    listRulesQuerySchema,
    testRuleSchema,
    idParamSchema,
    orderIdParamSchema,
} from '../../../../shared/validation/commission-schemas';
import logger from '../../../../shared/logger/winston.logger';
import { sendSuccess, sendCreated, sendPaginated, calculatePagination } from '../../../../shared/utils/responseHelper';

export class CommissionRuleController {
    /**
     * Create a new commission rule
     * POST /commission/rules
     * Auth: admin, manager
     */
    static async createRule(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const companyId = req.user?.companyId;
            const userId = req.user?._id;

            if (!companyId || !userId) {
                throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
            }

            // Validate request body
            const validation = createCommissionRuleSchema.safeParse(req.body);
            if (!validation.success) {
                const details = validation.error.errors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message,
                }));
                throw new ValidationError('Validation failed', details);
            }

            const rule = await CommissionRuleService.createRule(
                validation.data,
                String(userId),
                String(companyId)
            );

            sendCreated(res, rule, 'Commission rule created successfully');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get all commission rules
     * GET /commission/rules
     * Auth: authenticated
     */
    static async listRules(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const companyId = req.user?.companyId;

            if (!companyId) {
                throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
            }

            // Validate query parameters
            const validation = listRulesQuerySchema.safeParse(req.query);
            if (!validation.success) {
                const details = validation.error.errors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message,
                }));
                throw new ValidationError('Validation failed', details);
            }

            const { page, limit, ruleType, isActive, effectiveFrom, effectiveTo, sortBy, sortOrder } =
                validation.data;

            const result = await CommissionRuleService.listRules(
                String(companyId),
                {
                    ruleType,
                    isActive,
                    effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : undefined,
                    effectiveTo: effectiveTo ? new Date(effectiveTo) : undefined,
                },
                { page, limit, sortBy, sortOrder }
            );

            const pagination = calculatePagination(result.total, result.page, result.limit);
            sendPaginated(res, result.data, pagination);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get a single commission rule
     * GET /commission/rules/:id
     * Auth: authenticated
     */
    static async getRule(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const companyId = req.user?.companyId;
            const { id } = req.params;

            if (!companyId) {
                throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
            }

            // Validate ID param
            const paramValidation = idParamSchema.safeParse({ id });
            if (!paramValidation.success) {
                throw new AppError('Invalid rule ID', 'BAD_REQUEST', 400);
            }

            const rule = await CommissionRuleService.getRule(id, String(companyId));

            sendSuccess(res, rule);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Update a commission rule
     * PUT /commission/rules/:id
     * Auth: admin, manager
     */
    static async updateRule(req: Request, res: Response, next: NextFunction): Promise<void> {
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
                throw new AppError('Invalid rule ID', 'BAD_REQUEST', 400);
            }

            const validation = updateCommissionRuleSchema.safeParse(req.body);
            if (!validation.success) {
                const details = validation.error.errors.map((err: any) => ({
                    field: err.path.join('.'),
                    message: err.message,
                }));
                throw new ValidationError('Validation failed', details);
            }

            const rule = await CommissionRuleService.updateRule(
                id,
                validation.data,
                String(userId),
                String(companyId)
            );

            sendSuccess(res, rule, 'Commission rule updated successfully');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Delete a commission rule (soft delete)
     * DELETE /commission/rules/:id
     * Auth: admin
     */
    static async deleteRule(req: Request, res: Response, next: NextFunction): Promise<void> {
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
                throw new AppError('Invalid rule ID', 'BAD_REQUEST', 400);
            }

            await CommissionRuleService.deleteRule(id, String(userId), String(companyId));

            sendSuccess(res, null, 'Commission rule deleted successfully');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Test a commission rule with sample order data
     * POST /commission/rules/:id/test
     * Auth: admin, manager
     */
    static async testRule(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const companyId = req.user?.companyId;
            const { id } = req.params;

            if (!companyId) {
                throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
            }

            // Validate ID param
            const paramValidation = idParamSchema.safeParse({ id });
            if (!paramValidation.success) {
                throw new AppError('Invalid rule ID', 'BAD_REQUEST', 400);
            }

            // Validate test data
            const validation = testRuleSchema.safeParse(req.body);
            if (!validation.success) {
                const details = validation.error.errors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message,
                }));
                throw new ValidationError('Validation failed', details);
            }

            const result = await CommissionRuleService.testRule(id, validation.data, String(companyId));

            sendSuccess(res, result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Find applicable rules for an order
     * GET /commission/rules/applicable/:orderId
     * Auth: authenticated
     */
    static async findApplicableRules(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const companyId = req.user?.companyId;
            const { orderId } = req.params;

            if (!companyId) {
                throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
            }

            // Validate order ID param
            const paramValidation = orderIdParamSchema.safeParse({ orderId });
            if (!paramValidation.success) {
                throw new AppError('Invalid order ID', 'BAD_REQUEST', 400);
            }

            const rules = await CommissionRuleService.findApplicableRules(orderId, String(companyId));

            sendSuccess(res, {
                rules,
                count: rules.length,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Clone a commission rule
     * POST /commission/rules/:id/clone
     * Auth: admin, manager
     */
    static async cloneRule(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const companyId = req.user?.companyId;
            const userId = req.user?._id;
            const { id } = req.params;
            const { name } = req.body;

            if (!companyId || !userId) {
                throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
            }

            if (!name || typeof name !== 'string' || name.length < 3) {
                throw new AppError('New rule name is required (min 3 characters)', 'BAD_REQUEST', 400);
            }

            const rule = await CommissionRuleService.cloneRule(
                id,
                name,
                String(userId),
                String(companyId)
            );

            sendCreated(res, rule, 'Commission rule cloned successfully');
        } catch (error) {
            next(error);
        }
    }
}

export default CommissionRuleController;
