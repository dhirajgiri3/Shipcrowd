import { z } from 'zod';

/**
 * Wallet Schemas
 */
export const rechargeWalletSchema = z.object({
    amount: z.number().positive('Amount must be positive').max(1000000, 'Amount cannot exceed ₹10,00,000'),
    paymentId: z.string().min(1, 'Payment ID is required'),
});

export const updateWalletThresholdSchema = z.object({
    threshold: z.number().min(0, 'Threshold must be non-negative').max(100000, 'Threshold cannot exceed ₹1,00,000'),
});

export const refundTransactionSchema = z.object({
    reason: z.string().min(10, 'Reason must be at least 10 characters').max(500, 'Reason too long'),
});

/**
 * COD Remittance Schemas
 */
export const createRemittanceSchema = z.object({
    scheduleType: z.enum(['scheduled', 'on_demand', 'manual']),
    cutoffDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
});

export const approveRemittanceSchema = z.object({
    approvalNotes: z.string().max(500).optional(),
});

export const cancelRemittanceSchema = z.object({
    reason: z.string().min(10).max(500),
});
