/**
 * Commission Rule
 * 
 * Purpose: Commission Rule Service
 * 
 * DEPENDENCIES:
 * - Error Handling, Logger
 * 
 * TESTING:
 * Unit Tests: tests/unit/services/.../{filename}.test.ts
 * Coverage: TBD
 * 
 * NOTE: This service needs comprehensive documentation.
 * See SERVICE_TEMPLATE.md for documentation standards.
 */

import mongoose from 'mongoose';
import {
AuditLog,
CommissionRule,
ICommissionRule,
Order,
RuleType
} from '../../../../infrastructure/database/mongoose/models';
import { AppError } from '../../../../shared/errors/index';
import logger from '../../../../shared/logger/winston.logger';

// DTOs and types
export interface CreateRuleDTO {
    name: string;
    ruleType: RuleType;
    isActive?: boolean;
    priority?: number;
    applicableProducts?: string[];
    applicableCategories?: string[];
    conditions?: {
        minOrderValue?: number;
        maxOrderValue?: number;
        specificCustomers?: string[];
        orderStatuses?: string[];
    };
    percentageRate?: number;
    flatAmount?: number;
    tiers?: Array<{ minValue: number; maxValue: number; rate: number }>;
    productRates?: Record<string, number>;
    effectiveFrom: string | Date;
    effectiveTo?: string | Date;
}

export interface UpdateRuleDTO extends Partial<CreateRuleDTO> { }

export interface ListRulesFilters {
    ruleType?: RuleType;
    isActive?: boolean;
    effectiveFrom?: Date;
    effectiveTo?: Date;
}

export interface PaginationParams {
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface TestRuleResult {
    isApplicable: boolean;
    calculatedAmount: number;
    breakdown: {
        ruleType: RuleType;
        baseValue: number;
        rate: number;
        result: number;
    };
}

export interface TestOrderDTO {
    orderValue: number;
    products?: Array<{
        productId: string;
        price: number;
        quantity: number;
        category?: string;
    }>;
    customerId?: string;
    orderStatus?: string;
}

export default class CommissionRuleService {
    /**
     * Create a new commission rule
     */
    static async createRule(
        ruleData: CreateRuleDTO,
        userId: string,
        companyId: string
    ): Promise<ICommissionRule> {
        try {
            // Check for existing rule with same name
            const existingRule = await CommissionRule.findOne({
                company: new mongoose.Types.ObjectId(companyId),
                name: ruleData.name,
            });

            if (existingRule) {
                throw new AppError('A rule with this name already exists', 'BIZ_CONFLICT', 400);
            }

            // Check for overlapping priority (warn only)
            const existingPriorityRules = await CommissionRule.find({
                company: new mongoose.Types.ObjectId(companyId),
                isActive: true,
                priority: ruleData.priority || 1,
            });

            if (existingPriorityRules.length > 0) {
                logger.warn(`Priority conflict: rule with priority ${ruleData.priority} already exists for company ${companyId}`);
            }

            // Create the rule
            const rule = await CommissionRule.create({
                ...ruleData,
                company: new mongoose.Types.ObjectId(companyId),
                createdBy: new mongoose.Types.ObjectId(userId),
                effectiveFrom: new Date(ruleData.effectiveFrom),
                effectiveTo: ruleData.effectiveTo ? new Date(ruleData.effectiveTo) : undefined,
                applicableProducts: ruleData.applicableProducts?.map(id => new mongoose.Types.ObjectId(id)),
                conditions: ruleData.conditions
                    ? {
                        ...ruleData.conditions,
                        specificCustomers: ruleData.conditions.specificCustomers?.map(
                            id => new mongoose.Types.ObjectId(id)
                        ),
                    }
                    : undefined,
            });

            // Create audit log
            await AuditLog.create({
                userId: new mongoose.Types.ObjectId(userId),
                action: 'commission_rule.created',
                resource: 'CommissionRule',
                resourceId: rule._id,
                company: new mongoose.Types.ObjectId(companyId),
                details: {
                    ruleName: rule.name,
                    ruleType: rule.ruleType,
                    priority: rule.priority,
                },
            });

            logger.info(`Commission rule created: ${rule.name} (${rule._id}) by user ${userId}`);

            return rule;
        } catch (error) {
            logger.error('Error creating commission rule:', error);
            throw error;
        }
    }

    /**
     * Update an existing commission rule
     */
    static async updateRule(
        ruleId: string,
        updates: UpdateRuleDTO,
        userId: string,
        companyId: string
    ): Promise<ICommissionRule> {
        try {
            // Find and verify ownership
            const rule = await CommissionRule.findOne({
                _id: new mongoose.Types.ObjectId(ruleId),
                company: new mongoose.Types.ObjectId(companyId),
            });

            if (!rule) {
                throw new AppError('Commission rule not found', 'NOT_FOUND', 404);
            }

            // Check name uniqueness if changing name
            if (updates.name && updates.name !== rule.name) {
                const existingRule = await CommissionRule.findOne({
                    company: new mongoose.Types.ObjectId(companyId),
                    name: updates.name,
                    _id: { $ne: new mongoose.Types.ObjectId(ruleId) },
                });

                if (existingRule) {
                    throw new AppError('A rule with this name already exists', 'BIZ_CONFLICT', 400);
                }
            }

            // Apply updates
            const updateFields: any = { ...updates };

            if (updates.effectiveFrom) {
                updateFields.effectiveFrom = new Date(updates.effectiveFrom);
            }
            if (updates.effectiveTo) {
                updateFields.effectiveTo = new Date(updates.effectiveTo);
            }
            if (updates.applicableProducts) {
                updateFields.applicableProducts = updates.applicableProducts.map(
                    id => new mongoose.Types.ObjectId(id)
                );
            }

            Object.assign(rule, updateFields);
            await rule.save();

            // Create audit log
            await AuditLog.create({
                userId: new mongoose.Types.ObjectId(userId),
                action: 'commission_rule.updated',
                resource: 'CommissionRule',
                resourceId: rule._id,
                company: new mongoose.Types.ObjectId(companyId),
                changes: updates,
            });

            logger.info(`Commission rule updated: ${rule.name} (${rule._id}) by user ${userId}`);

            return rule;
        } catch (error) {
            logger.error('Error updating commission rule:', error);
            throw error;
        }
    }

    /**
     * Delete (soft delete) a commission rule
     */
    static async deleteRule(
        ruleId: string,
        userId: string,
        companyId: string
    ): Promise<void> {
        try {
            const rule = await CommissionRule.findOne({
                _id: new mongoose.Types.ObjectId(ruleId),
                company: new mongoose.Types.ObjectId(companyId),
            });

            if (!rule) {
                throw new AppError('Commission rule not found', 'NOT_FOUND', 404);
            }

            // Check for pending transactions using this rule
            const CommissionTransaction = mongoose.model('CommissionTransaction');
            const pendingCount = await CommissionTransaction.countDocuments({
                commissionRule: new mongoose.Types.ObjectId(ruleId),
                status: 'pending',
            });

            if (pendingCount > 0) {
                throw new AppError(
                    `Cannot delete rule: ${pendingCount} pending transactions use this rule`,
                    'BAD_REQUEST',
                    400
                );
            }

            // Soft delete
            rule.isActive = false;
            await rule.save();

            // Create audit log
            await AuditLog.create({
                userId: new mongoose.Types.ObjectId(userId),
                action: 'commission_rule.deleted',
                resource: 'CommissionRule',
                resourceId: rule._id,
                company: new mongoose.Types.ObjectId(companyId),
                details: { ruleName: rule.name },
            });

            logger.info(`Commission rule soft deleted: ${rule.name} (${rule._id}) by user ${userId}`);
        } catch (error) {
            logger.error('Error deleting commission rule:', error);
            throw error;
        }
    }

    /**
     * Get a single commission rule by ID
     */
    static async getRule(
        ruleId: string,
        companyId: string
    ): Promise<ICommissionRule> {
        try {
            const rule = await CommissionRule.findOne({
                _id: new mongoose.Types.ObjectId(ruleId),
                company: new mongoose.Types.ObjectId(companyId),
            }).populate('createdBy', 'name email');

            if (!rule) {
                throw new AppError('Commission rule not found', 'NOT_FOUND', 404);
            }

            return rule;
        } catch (error) {
            logger.error('Error getting commission rule:', error);
            throw error;
        }
    }

    /**
     * List commission rules with pagination and filters
     */
    static async listRules(
        companyId: string,
        filters: ListRulesFilters,
        pagination: PaginationParams
    ): Promise<PaginatedResult<ICommissionRule>> {
        try {
            const query: any = {
                company: new mongoose.Types.ObjectId(companyId),
            };

            // Apply filters
            if (filters.ruleType) {
                query.ruleType = filters.ruleType;
            }
            if (filters.isActive !== undefined) {
                query.isActive = filters.isActive;
            }
            if (filters.effectiveFrom) {
                query.effectiveFrom = { $gte: filters.effectiveFrom };
            }
            if (filters.effectiveTo) {
                query.effectiveTo = { $lte: filters.effectiveTo };
            }

            // Build sort
            const sortField = pagination.sortBy || 'priority';
            const sortOrder = pagination.sortOrder === 'asc' ? 1 : -1;
            const sort: any = { [sortField]: sortOrder };

            // Add secondary sort by createdAt for consistency
            if (sortField !== 'createdAt') {
                sort.createdAt = -1;
            }

            // Execute query with pagination
            const [rules, total] = await Promise.all([
                CommissionRule.find(query)
                    .sort(sort)
                    .skip((pagination.page - 1) * pagination.limit)
                    .limit(pagination.limit)
                    .populate('createdBy', 'name email')
                    .lean(),
                CommissionRule.countDocuments(query),
            ]);

            return {
                data: rules as ICommissionRule[],
                total,
                page: pagination.page,
                limit: pagination.limit,
                totalPages: Math.ceil(total / pagination.limit),
            };
        } catch (error) {
            logger.error('Error listing commission rules:', error);
            throw error;
        }
    }

    /**
     * Find applicable rules for an order
     */
    static async findApplicableRules(
        orderId: string,
        companyId: string
    ): Promise<ICommissionRule[]> {
        try {
            // Fetch the order
            const order = await Order.findOne({
                _id: new mongoose.Types.ObjectId(orderId),
                companyId: new mongoose.Types.ObjectId(companyId),
            });

            if (!order) {
                throw new AppError('Order not found', 'NOT_FOUND', 404);
            }

            // Get all active rules for the company
            const now = new Date();
            const rules = await CommissionRule.find({
                company: new mongoose.Types.ObjectId(companyId),
                isActive: true,
                effectiveFrom: { $lte: now },
                $or: [
                    { effectiveTo: null },
                    { effectiveTo: undefined },
                    { effectiveTo: { $gte: now } },
                ],
            }).sort({ priority: -1 });

            // Filter by applicability
            const applicableRules = rules.filter(rule => rule.isApplicable(order));

            logger.debug(`Found ${applicableRules.length} applicable rules for order ${orderId}`);

            return applicableRules;
        } catch (error) {
            logger.error('Error finding applicable rules:', error);
            throw error;
        }
    }

    /**
     * Test a rule with sample order data (simulation without persisting)
     */
    static async testRule(
        ruleId: string,
        testOrderData: TestOrderDTO,
        companyId: string
    ): Promise<TestRuleResult> {
        try {
            const rule = await this.getRule(ruleId, companyId);

            // Create mock order object
            const mockOrder = {
                _id: new mongoose.Types.ObjectId(),
                totals: { total: testOrderData.orderValue },
                totalAmount: testOrderData.orderValue,
                products: testOrderData.products || [],
                customerId: testOrderData.customerId
                    ? new mongoose.Types.ObjectId(testOrderData.customerId)
                    : undefined,
                currentStatus: testOrderData.orderStatus || 'pending',
            };

            const isApplicable = rule.isApplicable(mockOrder);
            let calculatedAmount = 0;

            if (isApplicable) {
                try {
                    calculatedAmount = rule.calculateCommission(testOrderData.orderValue, mockOrder);
                } catch (calcError: any) {
                    logger.warn(`Calculation error during rule test: ${calcError.message}`);
                }
            }

            return {
                isApplicable,
                calculatedAmount,
                breakdown: {
                    ruleType: rule.ruleType,
                    baseValue: testOrderData.orderValue,
                    rate: rule.percentageRate || rule.flatAmount || 0,
                    result: calculatedAmount,
                },
            };
        } catch (error) {
            logger.error('Error testing commission rule:', error);
            throw error;
        }
    }

    /**
     * Clone an existing rule
     */
    static async cloneRule(
        ruleId: string,
        newName: string,
        userId: string,
        companyId: string
    ): Promise<ICommissionRule> {
        try {
            const originalRule = await this.getRule(ruleId, companyId);

            const cloneData: CreateRuleDTO = {
                name: newName,
                ruleType: originalRule.ruleType,
                isActive: false, // Clone as inactive by default
                priority: originalRule.priority,
                applicableProducts: originalRule.applicableProducts?.map(id => id.toString()),
                applicableCategories: originalRule.applicableCategories,
                conditions: originalRule.conditions
                    ? {
                        ...originalRule.conditions,
                        specificCustomers: originalRule.conditions.specificCustomers?.map(id =>
                            id.toString()
                        ),
                    }
                    : undefined,
                percentageRate: originalRule.percentageRate,
                flatAmount: originalRule.flatAmount,
                tiers: originalRule.tiers,
                effectiveFrom: originalRule.effectiveFrom,
                effectiveTo: originalRule.effectiveTo,
            };

            return this.createRule(cloneData, userId, companyId);
        } catch (error) {
            logger.error('Error cloning commission rule:', error);
            throw error;
        }
    }
}
