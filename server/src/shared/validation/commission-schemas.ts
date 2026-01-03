/**
 * Commission System Validation Schemas
 * 
 * Zod schemas for validating commission-related API requests:
 * - Commission Rules
 * - Sales Representatives
 * - Commission Transactions (Day 2)
 * - Payouts (Day 3)
 * - Analytics (Day 4)
 */

import { z } from 'zod';

// ============================================================================
// COMMON HELPERS
// ============================================================================

const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ObjectId format');

const paginationSchema = z.object({
    page: z.string().optional().transform(val => Math.max(1, parseInt(val || '1', 10))),
    limit: z.string().optional().transform(val => Math.min(100, Math.max(1, parseInt(val || '20', 10)))),
});

const dateRangeObject = z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
});

const dateRangeSchema = dateRangeObject.refine(data => {
    if (data.startDate && data.endDate) {
        return new Date(data.startDate) <= new Date(data.endDate);
    }
    return true;
}, { message: 'Start date must be before or equal to end date' });

// ============================================================================
// ENUMS
// ============================================================================

export const ruleTypeSchema = z.enum([
    'percentage',
    'flat',
    'tiered',
    'product-based',
    'revenue-share',
]);
export type RuleType = z.infer<typeof ruleTypeSchema>;

export const salesRepRoleSchema = z.enum(['rep', 'team-lead', 'manager', 'director']);
export type SalesRepRole = z.infer<typeof salesRepRoleSchema>;

export const salesRepStatusSchema = z.enum(['active', 'inactive', 'suspended']);
export type SalesRepStatus = z.infer<typeof salesRepStatusSchema>;

export const transactionStatusSchema = z.enum([
    'pending',
    'approved',
    'rejected',
    'paid',
    'cancelled',
]);
export type TransactionStatus = z.infer<typeof transactionStatusSchema>;

export const adjustmentTypeSchema = z.enum(['bonus', 'penalty', 'correction', 'dispute', 'other']);
export type AdjustmentType = z.infer<typeof adjustmentTypeSchema>;

export const payoutStatusSchema = z.enum(['pending', 'processing', 'completed', 'failed', 'cancelled']);
export type PayoutStatus = z.infer<typeof payoutStatusSchema>;

// ============================================================================
// COMMISSION RULE SCHEMAS
// ============================================================================

export const tierSchema = z.object({
    minValue: z.number().min(0, 'Min value must be non-negative'),
    maxValue: z.number().min(0, 'Max value must be non-negative'),
    rate: z.number().min(0, 'Rate must be non-negative').max(100, 'Rate cannot exceed 100%'),
}).refine(data => data.maxValue > data.minValue, {
    message: 'Max value must be greater than min value',
});

export const conditionsSchema = z.object({
    minOrderValue: z.number().min(0).optional(),
    maxOrderValue: z.number().min(0).optional(),
    specificCustomers: z.array(objectIdSchema).optional(),
    orderStatuses: z.array(z.string()).optional(),
}).refine(data => {
    if (data.minOrderValue !== undefined && data.maxOrderValue !== undefined) {
        return data.maxOrderValue >= data.minOrderValue;
    }
    return true;
}, { message: 'Max order value must be >= min order value' });

export const createCommissionRuleSchema = z.object({
    name: z.string()
        .min(3, 'Rule name must be at least 3 characters')
        .max(100, 'Rule name cannot exceed 100 characters')
        .trim(),
    ruleType: ruleTypeSchema,
    isActive: z.boolean().optional().default(true),
    priority: z.number()
        .int('Priority must be an integer')
        .min(1, 'Priority must be at least 1')
        .max(1000, 'Priority cannot exceed 1000')
        .default(1),
    applicableProducts: z.array(objectIdSchema).optional(),
    applicableCategories: z.array(z.string().trim()).optional(),
    conditions: conditionsSchema.optional(),

    // Rule type-specific fields
    percentageRate: z.number()
        .min(0, 'Percentage rate cannot be negative')
        .max(100, 'Percentage rate cannot exceed 100%')
        .optional(),
    flatAmount: z.number()
        .min(0, 'Flat amount cannot be negative')
        .optional(),
    tiers: z.array(tierSchema).optional(),
    productRates: z.record(z.string(), z.number().min(0).max(100)).optional(),

    // Validity period
    effectiveFrom: z.string().datetime('Invalid date format'),
    effectiveTo: z.string().datetime('Invalid date format').optional(),
})
    .refine(data => {
        // Percentage rate required for percentage/revenue-share
        if (data.ruleType === 'percentage' || data.ruleType === 'revenue-share') {
            return data.percentageRate !== undefined;
        }
        return true;
    }, { message: 'Percentage rate is required for percentage/revenue-share rules' })
    .refine(data => {
        // Flat amount required for flat
        if (data.ruleType === 'flat') {
            return data.flatAmount !== undefined;
        }
        return true;
    }, { message: 'Flat amount is required for flat rules' })
    .refine(data => {
        // Tiers required for tiered
        if (data.ruleType === 'tiered') {
            return data.tiers !== undefined && data.tiers.length > 0;
        }
        return true;
    }, { message: 'At least one tier is required for tiered rules' })
    .refine(data => {
        // Effective date validation
        if (data.effectiveTo) {
            return new Date(data.effectiveTo) > new Date(data.effectiveFrom);
        }
        return true;
    }, { message: 'Effective end date must be after start date' });

export type CreateCommissionRuleInput = z.infer<typeof createCommissionRuleSchema>;

export const updateCommissionRuleSchema = createCommissionRuleSchema.partial();
export type UpdateCommissionRuleInput = z.infer<typeof updateCommissionRuleSchema>;

export const listRulesQuerySchema = paginationSchema.extend({
    ruleType: ruleTypeSchema.optional(),
    isActive: z.string().optional().transform(val => val === 'true'),
    effectiveFrom: z.string().datetime().optional(),
    effectiveTo: z.string().datetime().optional(),
    sortBy: z.enum(['priority', 'createdAt', 'name']).optional().default('priority'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export const testRuleSchema = z.object({
    orderValue: z.number().min(0, 'Order value must be non-negative'),
    products: z.array(z.object({
        productId: z.string(),
        price: z.number().min(0),
        quantity: z.number().int().min(1),
        category: z.string().optional(),
    })).optional(),
    customerId: objectIdSchema.optional(),
    orderStatus: z.string().optional(),
});

// ============================================================================
// SALES REPRESENTATIVE SCHEMAS
// ============================================================================

export const bankDetailsSchema = z.object({
    accountNumber: z.string()
        .min(8, 'Account number must be at least 8 digits')
        .max(20, 'Account number cannot exceed 20 digits'),
    ifscCode: z.string()
        .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC code format (e.g., SBIN0001234)')
        .transform(val => val.toUpperCase()),
    accountHolderName: z.string()
        .min(2, 'Account holder name must be at least 2 characters')
        .max(100, 'Account holder name cannot exceed 100 characters')
        .trim(),
    bankName: z.string()
        .min(2, 'Bank name must be at least 2 characters')
        .max(100, 'Bank name cannot exceed 100 characters')
        .trim(),
    panNumber: z.string()
        .regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, 'Invalid PAN format (e.g., ABCDE1234F)')
        .transform(val => val.toUpperCase())
        .optional(),
});

export const kpiTargetsSchema = z.object({
    monthlyRevenue: z.number().min(0).optional(),
    monthlyOrders: z.number().int().min(0).optional(),
    conversionRate: z.number().min(0).max(100).optional(),
});

export const createSalesRepSchema = z.object({
    // User association - either existing user or create new
    userId: objectIdSchema.optional(),
    email: z.string().email('Invalid email format').optional(),
    name: z.string().min(2).max(100).trim().optional(),
    phone: z.string().min(10).max(15).optional(),

    // Sales rep fields
    employeeId: z.string()
        .min(1, 'Employee ID is required')
        .max(50, 'Employee ID cannot exceed 50 characters')
        .trim(),
    role: salesRepRoleSchema.default('rep'),
    territory: z.array(z.string().trim())
        .min(1, 'At least one territory is required')
        .max(50, 'Cannot have more than 50 territories'),
    reportingTo: objectIdSchema.optional(),
    commissionRules: z.array(objectIdSchema).optional(),
    kpiTargets: kpiTargetsSchema.optional(),
    bankDetails: bankDetailsSchema,
}).refine(data => data.userId || (data.email && data.name), {
    message: 'Either userId or (email + name) must be provided',
});

export type CreateSalesRepInput = z.infer<typeof createSalesRepSchema>;

export const updateSalesRepSchema = z.object({
    role: salesRepRoleSchema.optional(),
    territory: z.array(z.string().trim()).optional(),
    reportingTo: objectIdSchema.nullable().optional(),
    commissionRules: z.array(objectIdSchema).optional(),
    status: salesRepStatusSchema.optional(),
    kpiTargets: kpiTargetsSchema.optional(),
    bankDetails: bankDetailsSchema.optional(),
});

export type UpdateSalesRepInput = z.infer<typeof updateSalesRepSchema>;

export const listSalesRepsQuerySchema = paginationSchema.extend({
    status: salesRepStatusSchema.optional(),
    role: salesRepRoleSchema.optional(),
    territory: z.string().optional(),
    sortBy: z.enum(['onboardingDate', 'employeeId', 'totalCommission']).optional().default('onboardingDate'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export const assignTerritorySchema = z.object({
    territories: z.array(z.string().min(1).max(100).trim())
        .min(1, 'At least one territory is required')
        .max(50, 'Cannot assign more than 50 territories'),
});

// ============================================================================
// COMMISSION TRANSACTION SCHEMAS (Day 2)
// ============================================================================

export const approveTransactionSchema = z.object({
    notes: z.string().max(500, 'Notes cannot exceed 500 characters').optional(),
});

export const rejectTransactionSchema = z.object({
    reason: z.string()
        .min(10, 'Reason must be at least 10 characters')
        .max(500, 'Reason cannot exceed 500 characters'),
});

export const bulkApproveSchema = z.object({
    transactionIds: z.array(objectIdSchema)
        .min(1, 'At least one transaction ID is required')
        .max(100, 'Cannot bulk approve more than 100 transactions'),
});

export const bulkRejectSchema = z.object({
    transactionIds: z.array(objectIdSchema)
        .min(1, 'At least one transaction ID is required')
        .max(100, 'Cannot bulk reject more than 100 transactions'),
    reason: z.string()
        .min(10, 'Reason must be at least 10 characters')
        .max(500, 'Reason cannot exceed 500 characters'),
});

export const addAdjustmentSchema = z.object({
    amount: z.number({ required_error: 'Amount is required' }),
    reason: z.string()
        .min(5, 'Reason must be at least 5 characters')
        .max(500, 'Reason cannot exceed 500 characters'),
    adjustmentType: adjustmentTypeSchema.optional().default('other'),
});

export const listTransactionsQuerySchema = paginationSchema.merge(dateRangeObject).extend({
    status: transactionStatusSchema.optional(),
    salesRepId: objectIdSchema.optional(),
    ruleId: objectIdSchema.optional(),
    sortBy: z.enum(['createdAt', 'finalAmount', 'status']).optional().default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export const bulkCalculateSchema = z.object({
    orderIds: z.array(objectIdSchema)
        .min(1, 'At least one order ID is required')
        .max(1000, 'Cannot bulk calculate more than 1000 orders'),
    salesRepId: objectIdSchema,
});

// ============================================================================
// PAYOUT SCHEMAS (Day 3)
// ============================================================================

export const initiatePayoutSchema = z.object({
    salesRepId: objectIdSchema,
    transactionIds: z.array(objectIdSchema)
        .min(1, 'At least one transaction is required'),
});

export const processBatchPayoutsSchema = z.object({
    minThreshold: z.number().min(0).optional().default(100),
    filters: z.object({
        salesRepIds: z.array(objectIdSchema).optional(),
        territorys: z.array(z.string()).optional(),
    }).optional(),
});

export const reconcilePayoutsSchema = dateRangeSchema;

export const listPayoutsQuerySchema = paginationSchema.merge(dateRangeObject).extend({
    status: payoutStatusSchema.optional(),
    salesRepId: objectIdSchema.optional(),
    sortBy: z.enum(['payoutDate', 'netAmount', 'status']).optional().default('payoutDate'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

// ============================================================================
// ANALYTICS SCHEMAS (Day 4)
// ============================================================================

export const analyticsDateRangeSchema = z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    groupBy: z.enum(['day', 'week', 'month']).optional().default('day'),
});

export const generateReportSchema = z.object({
    startDate: z.string().datetime('Start date is required'),
    endDate: z.string().datetime('End date is required'),
    format: z.enum(['csv', 'excel', 'pdf']).default('csv'),
    includeDetails: z.boolean().optional().default(true),
}).refine(data => new Date(data.endDate) > new Date(data.startDate), {
    message: 'End date must be after start date',
});

export const topPerformersQuerySchema = paginationSchema.merge(dateRangeObject).extend({
    limit: z.string().optional().transform(val => Math.min(50, Math.max(1, parseInt(val || '10', 10)))),
});

// ============================================================================
// PARAM SCHEMAS
// ============================================================================

export const idParamSchema = z.object({
    id: objectIdSchema,
});

export const orderIdParamSchema = z.object({
    orderId: objectIdSchema,
});

export const salesRepIdParamSchema = z.object({
    salesRepId: objectIdSchema,
});
