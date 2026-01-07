/**
 * Commission Calculation Service
 * 
 * Core service for calculating commissions based on order events:
 * - order.created → calculate commission
 * - order.cancelled → cancel commission
 * - order.updated → recalculate commission
 * - rto.completed → handle RTO adjustments
 * 
 * BUSINESS RULES:
 * ===============
 * 1. Idempotency Protection
 *    - Condition: Duplicate event within 5 minutes
 *    - Action: Skip processing, return null
 *    - Reason: Prevent duplicate commission calculations
 * 
 * 2. Rule Priority
 *    - Condition: Multiple applicable rules
 *    - Action: Use first matching rule (highest priority)
 *    - Reason: Deterministic commission calculation
 * 
 * 3. Status-Based Recalculation
 *    - Condition: Recalculate request
 *    - Action: Only allow if status is 'pending'
 *    - Reason: Prevent modification of approved/paid commissions
 * 
 * 4. RTO Handling
 *    - Condition: RTO completed event
 *    - Action: Cancel all pending commissions for order
 *    - Reason: No commission for returned orders
 * 
 * 5. Audit Trail
 *    - Condition: Every commission operation
 *    - Action: Create audit log entry
 *    - Reason: Compliance and dispute resolution
 * 
 * ERROR HANDLING:
 * ==============
 * Expected Errors:
 * - AppError (404): Order not found
 * - AppError (404): Sales representative not found
 * - AppError (404): Commission rule not found
 * - Null Return: No applicable rule found (warning logged)
 * 
 * Recovery Strategy:
 * - Not Found Errors: Throw to caller, log error
 * - No Applicable Rule: Return null, log warning
 * - Duplicate Event: Skip silently, return null
 * - Bulk Failures: Continue processing, collect errors
 * 
 * DEPENDENCIES:
 * ============
 * Internal:
 * - CommissionTransaction Model: Store calculations
 * - CommissionRule Model: Rule evaluation
 * - SalesRepresentative Model: Rep lookup
 * - Order Model: Order data
 * - AuditLog Model: Audit trail
 * - Logger: Winston for structured logging
 * 
 * Used By:
 * - Order Event Handlers: Auto-calculate on order events
 * - Commission Approval Service: Bulk calculations
 * - Admin Dashboard: Manual recalculations
 * 
 * PERFORMANCE:
 * ===========
 * - Calculation Time: <100ms per order (rule evaluation + DB write)
 * - Bulk Processing: Sequential (no parallelization to prevent race conditions)
 * - Idempotency Cache: In-memory Map with 5-minute TTL
 * - Query Optimization: Uses indexes on order, salesRep, status
 * 
 * TESTING:
 * =======
 * Unit Tests: tests/unit/services/commission/commission-calculation.test.ts
 * Coverage: TBD
 * 
 * Critical Test Cases:
 * - Idempotency (duplicate events)
 * - Rule priority (multiple applicable rules)
 * - Status validation (recalculate pending only)
 * - RTO cancellation
 * - Bulk processing with partial failures
 * - No applicable rule handling
 * 
 * Business Impact:
 * - Revenue sharing with sales team
 * - Incentive program accuracy
 * - Must maintain 100% accuracy for trust
 */

import mongoose from 'mongoose';
import {
    CommissionTransaction,
    ICommissionTransaction,
    CommissionRule,
    SalesRepresentative,
    Order,
    AuditLog
} from '../../../../infrastructure/database/mongoose/models';
import logger from '../../../../shared/logger/winston.logger';
import { AppError } from '../../../../shared/errors/index';

// Event types
export type OrderEvent = 'order.created' | 'order.cancelled' | 'order.updated';
export type RTOEvent = 'rto.completed';
export type CommissionEvent = OrderEvent | RTOEvent;

// DTOs
export interface CalculateCommissionDTO {
    orderId: string;
    salesRepId: string;
    eventType: CommissionEvent;
}

export interface BulkCalculateDTO {
    orderIds: string[];
}

export interface RecalculateResult {
    success: number;
    failed: number;
    errors: Array<{ orderId: string; error: string }>;
}

// Idempotency tracking
const processedEvents = new Map<string, number>();
const EVENT_TTL = 5 * 60 * 1000; // 5 minutes

export default class CommissionCalculationService {
    /**
     * Calculate commission for an order
     */
    static async calculateCommission(
        data: CalculateCommissionDTO,
        companyId: string
    ): Promise<ICommissionTransaction | null> {
        try {
            const { orderId, salesRepId, eventType } = data;

            // Idempotency check
            const eventKey = `${orderId}:${salesRepId}:${eventType}`;
            if (processedEvents.has(eventKey)) {
                logger.debug(`Duplicate event detected: ${eventKey}`);
                return null;
            }

            // Check if transaction already exists
            const existing = await CommissionTransaction.findByOrderAndSalesRep(orderId, salesRepId);
            if (existing) {
                logger.info(`Commission already calculated for order ${orderId}, sales rep ${salesRepId}`);
                return existing;
            }

            // Fetch order
            const order = await Order.findOne({
                _id: new mongoose.Types.ObjectId(orderId),
                companyId: new mongoose.Types.ObjectId(companyId),
            });

            if (!order) {
                throw new AppError('Order not found', 'NOT_FOUND', 404);
            }

            // Fetch sales rep
            const salesRep = await SalesRepresentative.findOne({
                _id: new mongoose.Types.ObjectId(salesRepId),
                company: new mongoose.Types.ObjectId(companyId),
                status: 'active',
            }).populate('commissionRules');

            if (!salesRep) {
                throw new AppError('Active sales representative not found', 'NOT_FOUND', 404);
            }

            // Find applicable commission rule
            let applicableRule = null;

            // First, check assigned rules
            if (salesRep.commissionRules && salesRep.commissionRules.length > 0) {
                for (const ruleId of salesRep.commissionRules) {
                    const rule = await CommissionRule.findById(ruleId);
                    if (rule && rule.isApplicable(order)) {
                        applicableRule = rule;
                        break;
                    }
                }
            }

            // If no assigned rule, find from all active rules
            if (!applicableRule) {
                const rules = await CommissionRule.findActiveRules(String(companyId));
                for (const rule of rules) {
                    if (rule.isApplicable(order)) {
                        applicableRule = rule;
                        break; // Use highest priority rule
                    }
                }
            }

            if (!applicableRule) {
                logger.warn(`No applicable commission rule found for order ${orderId}`);
                return null;
            }

            // Calculate commission
            const orderValue = order.totals.total;
            const calculatedAmount = applicableRule.calculateCommission(orderValue, order);

            // Create transaction
            const transaction = await CommissionTransaction.create({
                company: new mongoose.Types.ObjectId(companyId),
                salesRepresentative: new mongoose.Types.ObjectId(salesRepId),
                order: new mongoose.Types.ObjectId(orderId),
                commissionRule: applicableRule._id,
                calculatedAmount,
                finalAmount: calculatedAmount,
                status: 'pending',
                metadata: {
                    orderValue,
                    ruleType: applicableRule.ruleType,
                    eventType,
                },
            });

            // Create audit log
            await AuditLog.create({
                userId: new mongoose.Types.ObjectId(salesRepId),
                action: 'commission.calculated',
                resource: 'CommissionTransaction',
                resourceId: transaction._id,
                company: new mongoose.Types.ObjectId(companyId),
                details: {
                    orderId,
                    calculatedAmount,
                    ruleId: applicableRule._id,
                },
            });

            // Mark event as processed
            processedEvents.set(eventKey, Date.now());
            setTimeout(() => processedEvents.delete(eventKey), EVENT_TTL);

            logger.info(
                `Commission calculated: ${calculatedAmount} for order ${orderId}, rep ${salesRepId}`
            );

            return transaction;
        } catch (error) {
            logger.error('Error calculating commission:', error);
            throw error;
        }
    }

    /**
     * Cancel a commission transaction
     */
    static async cancelCommission(
        orderId: string,
        companyId: string
    ): Promise<void> {
        try {
            const transactions = await CommissionTransaction.find({
                order: new mongoose.Types.ObjectId(orderId),
                company: new mongoose.Types.ObjectId(companyId),
                status: 'pending',
            });

            for (const transaction of transactions) {
                transaction.status = 'cancelled';
                await transaction.save();

                logger.info(`Commission cancelled for order ${orderId}, transaction ${transaction._id}`);
            }

            // Create audit log
            if (transactions.length > 0) {
                await AuditLog.create({
                    userId: 'system',
                    action: 'commission.cancelled',
                    resource: 'CommissionTransaction',
                    company: new mongoose.Types.ObjectId(companyId),
                    details: {
                        orderId,
                        count: transactions.length,
                    },
                });
            }
        } catch (error) {
            logger.error('Error cancelling commission:', error);
            throw error;
        }
    }

    /**
     * Recalculate commission for an order (on order update)
     */
    static async recalculateCommission(
        orderId: string,
        salesRepId: string,
        companyId: string
    ): Promise<ICommissionTransaction | null> {
        try {
            // Find existing transaction
            const existing = await CommissionTransaction.findByOrderAndSalesRep(orderId, salesRepId);

            if (!existing) {
                logger.warn(`No existing commission for order ${orderId}, creating new`);
                return this.calculateCommission(
                    { orderId, salesRepId, eventType: 'order.updated' },
                    companyId
                );
            }

            // Only recalculate if pending
            if (existing.status !== 'pending') {
                logger.warn(`Cannot recalculate commission with status ${existing.status}`);
                return existing;
            }

            // Fetch updated order
            const order = await Order.findById(orderId);
            if (!order) {
                throw new AppError('Order not found', 'NOT_FOUND', 404);
            }

            // Fetch rule
            const rule = await CommissionRule.findById(existing.commissionRule);
            if (!rule) {
                throw new AppError('Commission rule not found', 'NOT_FOUND', 404);
            }

            // Recalculate
            const orderValue = order.totals.total;
            const newCalculatedAmount = rule.calculateCommission(orderValue, order);

            // Update transaction
            existing.calculatedAmount = newCalculatedAmount;
            existing.finalAmount = newCalculatedAmount;
            if (existing.metadata) {
                existing.metadata.orderValue = orderValue;
            }
            await existing.save();

            logger.info(
                `Commission recalculated: ${newCalculatedAmount} for order ${orderId}, transaction ${existing._id}`
            );

            return existing;
        } catch (error) {
            logger.error('Error recalculating commission:', error);
            throw error;
        }
    }

    /**
     * Bulk calculate commissions for multiple orders
     */
    static async bulkCalculate(
        orderIds: string[],
        salesRepId: string,
        companyId: string
    ): Promise<RecalculateResult> {
        const result: RecalculateResult = {
            success: 0,
            failed: 0,
            errors: [],
        };

        for (const orderId of orderIds) {
            try {
                await this.calculateCommission(
                    { orderId, salesRepId, eventType: 'order.created' },
                    companyId
                );
                result.success++;
            } catch (error: any) {
                result.failed++;
                result.errors.push({
                    orderId,
                    error: error.message || 'Unknown error',
                });
                logger.error(`Bulk calculate failed for order ${orderId}:`, error);
            }
        }

        return result;
    }

    /**
     * Get commission transaction details
     */
    static async getTransaction(
        transactionId: string,
        companyId: string
    ): Promise<ICommissionTransaction> {
        const transaction = await CommissionTransaction.findOne({
            _id: new mongoose.Types.ObjectId(transactionId),
            company: new mongoose.Types.ObjectId(companyId),
        })
            .populate('salesRepresentative', 'employeeId user')
            .populate('order', 'orderNumber totals')
            .populate('commissionRule', 'name ruleType')
            .populate('adjustments');

        if (!transaction) {
            throw new AppError('Commission transaction not found', 'NOT_FOUND', 404);
        }

        return transaction;
    }

    /**
     * List transactions with filters
     */
    static async listTransactions(
        companyId: string,
        filters: {
            status?: string;
            salesRepId?: string;
            startDate?: Date;
            endDate?: Date;
        },
        pagination: { page: number; limit: number }
    ): Promise<{ data: ICommissionTransaction[]; total: number }> {
        const query: any = {
            company: new mongoose.Types.ObjectId(companyId),
        };

        if (filters.status) query.status = filters.status;
        if (filters.salesRepId) {
            query.salesRepresentative = new mongoose.Types.ObjectId(filters.salesRepId);
        }
        if (filters.startDate || filters.endDate) {
            query.calculatedAt = {};
            if (filters.startDate) query.calculatedAt.$gte = filters.startDate;
            if (filters.endDate) query.calculatedAt.$lte = filters.endDate;
        }

        const [data, total] = await Promise.all([
            CommissionTransaction.find(query)
                .populate('salesRepresentative', 'employeeId user')
                .populate('order', 'orderNumber totals')
                .populate('commissionRule', 'name ruleType')
                .skip((pagination.page - 1) * pagination.limit)
                .limit(pagination.limit)
                .sort({ calculatedAt: -1 })
                .lean(),
            CommissionTransaction.countDocuments(query),
        ]);

        return { data: data as ICommissionTransaction[], total };
    }

    /**
     * Event handler for order.created
     */
    static async handleOrderCreated(orderId: string, companyId: string): Promise<void> {
        try {
            // Find order with assigned sales rep
            const order = await Order.findOne({
                _id: new mongoose.Types.ObjectId(orderId),
                companyId: new mongoose.Types.ObjectId(companyId),
            });

            if (!order) return;

            // Check if order has salesRepresentative field
            const salesRepId = (order as any).salesRepresentative?.toString();
            if (!salesRepId) {
                logger.debug(`Order ${orderId} has no assigned sales representative`);
                return;
            }

            await this.calculateCommission(
                { orderId, salesRepId, eventType: 'order.created' },
                companyId
            );
        } catch (error) {
            logger.error('Error handling order.created event:', error);
        }
    }

    /**
     * Event handler for order.cancelled
     */
    static async handleOrderCancelled(orderId: string, companyId: string): Promise<void> {
        try {
            await this.cancelCommission(orderId, companyId);
        } catch (error) {
            logger.error('Error handling order.cancelled event:', error);
        }
    }

    /**
     * Event handler for order.updated
     */
    static async handleOrderUpdated(orderId: string, companyId: string): Promise<void> {
        try {
            const order = await Order.findOne({
                _id: new mongoose.Types.ObjectId(orderId),
                companyId: new mongoose.Types.ObjectId(companyId),
            });

            if (!order) return;

            const salesRepId = (order as any).salesRepresentative?.toString();
            if (!salesRepId) return;

            await this.recalculateCommission(orderId, salesRepId, companyId);
        } catch (error) {
            logger.error('Error handling order.updated event:', error);
        }
    }

    /**
     * Event handler for rto.completed
     */
    static async handleRTOCompleted(orderId: string, companyId: string): Promise<void> {
        try {
            // Cancel pending commissions for RTO orders
            await this.cancelCommission(orderId, companyId);
            logger.info(`Commission cancelled due to RTO for order ${orderId}`);
        } catch (error) {
            logger.error('Error handling rto.completed event:', error);
        }
    }
}
