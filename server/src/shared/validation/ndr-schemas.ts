/**
 * NDR (Non-Delivery Report) Validation Schemas
 * Zod schemas for NDR-related API endpoints
 */

import { z } from 'zod';

// ============================================================================
// NDR Enums and Types
// ============================================================================

export const ndrTypeSchema = z.enum([
    'address_issue',
    'customer_unavailable',
    'refused',
    'payment_issue',
    'other',
]);

export type NDRType = z.infer<typeof ndrTypeSchema>;

export const ndrStatusSchema = z.enum([
    'detected',
    'in_resolution',
    'resolved',
    'escalated',
    'rto_triggered',
]);

export type NDRStatus = z.infer<typeof ndrStatusSchema>;

export const ndrActionTypeSchema = z.enum([
    'call_customer',
    'send_whatsapp',
    'send_email',
    'send_sms',
    'update_address',
    'request_reattempt',
    'trigger_rto',
]);

export type NDRActionType = z.infer<typeof ndrActionTypeSchema>;

export const ndrClassificationSourceSchema = z.enum([
    'openai',
    'keyword',
    'manual',
]);

export type NDRClassificationSource = z.infer<typeof ndrClassificationSourceSchema>;

// ============================================================================
// Query Schemas
// ============================================================================

export const listNDREventsQuerySchema = z.object({
    page: z.string().optional().transform(val => Math.max(1, parseInt(val || '1', 10))),
    limit: z.string().optional().transform(val => Math.max(1, Math.min(100, parseInt(val || '20', 10)))),
    status: ndrStatusSchema.optional(),
    ndrType: ndrTypeSchema.optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    sortBy: z.enum(['detectedAt', 'resolutionDeadline', 'createdAt']).optional().default('detectedAt'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type ListNDREventsQuery = z.infer<typeof listNDREventsQuerySchema>;

export const getNDRAnalyticsQuerySchema = z.object({
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    ndrType: ndrTypeSchema.optional(),
});

export type GetNDRAnalyticsQuery = z.infer<typeof getNDRAnalyticsQuerySchema>;

export const getNDRTrendsQuerySchema = z.object({
    groupBy: z.enum(['day', 'week', 'month']).optional().default('day'),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
});

export type GetNDRTrendsQuery = z.infer<typeof getNDRTrendsQuerySchema>;

export const getTopNDRReasonsQuerySchema = z.object({
    limit: z.string().optional().transform(val => Math.max(1, Math.min(50, parseInt(val || '10', 10)))),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
});

export type GetTopNDRReasonsQuery = z.infer<typeof getTopNDRReasonsQuerySchema>;

// ============================================================================
// Request Body Schemas
// ============================================================================

export const resolveNDRSchema = z.object({
    resolution: z.string()
        .min(10, 'Resolution details must be at least 10 characters')
        .max(500, 'Resolution details cannot exceed 500 characters'),
    notes: z.string()
        .max(1000, 'Notes cannot exceed 1000 characters')
        .optional(),
    resolutionMethod: z.string()
        .min(3, 'Resolution method is required')
        .max(100)
        .optional(),
});

export type ResolveNDRInput = z.infer<typeof resolveNDRSchema>;

export const escalateNDRSchema = z.object({
    reason: z.string()
        .min(10, 'Escalation reason must be at least 10 characters')
        .max(500, 'Escalation reason cannot exceed 500 characters'),
    escalateTo: z.string()
        .min(3, 'Escalation recipient is required')
        .max(100)
        .optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional().default('medium'),
    notes: z.string().max(1000).optional(),
});

export type EscalateNDRInput = z.infer<typeof escalateNDRSchema>;

export const classifyNDRSchema = z.object({
    ndrReason: z.string()
        .min(1, 'NDR reason is required')
        .max(500, 'NDR reason cannot exceed 500 characters'),
    courierRemarks: z.string().max(1000).optional(),
    useAI: z.boolean().optional().default(true),
});

export type ClassifyNDRInput = z.infer<typeof classifyNDRSchema>;

export const triggerWorkflowSchema = z.object({
    ndrEventId: z.string()
        .min(1, 'NDR event ID is required')
        .regex(/^[a-f\d]{24}$/i, 'Invalid NDR event ID format'),
    skipActions: z.array(ndrActionTypeSchema).optional(),
    immediateExecution: z.boolean().optional().default(false),
});

export type TriggerWorkflowInput = z.infer<typeof triggerWorkflowSchema>;

// ============================================================================
// Workflow Configuration Schemas
// ============================================================================

export const workflowActionConfigSchema = z.object({
    sequence: z.number()
        .int('Sequence must be an integer')
        .min(1, 'Sequence must be at least 1')
        .max(50, 'Sequence cannot exceed 50'),
    actionType: ndrActionTypeSchema,
    delayMinutes: z.number()
        .int('Delay must be an integer')
        .min(0, 'Delay cannot be negative')
        .max(10080, 'Delay cannot exceed 7 days (10080 minutes)'),
    autoExecute: z.boolean(),
    actionConfig: z.record(z.unknown()).optional(),
});

export type WorkflowActionConfig = z.infer<typeof workflowActionConfigSchema>;

export const escalationRulesSchema = z.object({
    afterHours: z.number()
        .int()
        .min(1, 'Escalation time must be at least 1 hour')
        .max(168, 'Escalation time cannot exceed 7 days (168 hours)'),
    escalateTo: z.string().min(1, 'Escalation recipient is required'),
    notifyVia: z.array(z.enum(['email', 'whatsapp', 'sms']))
        .min(1, 'At least one notification channel is required')
        .max(10, 'Cannot exceed 10 notification channels'),
});

export type EscalationRules = z.infer<typeof escalationRulesSchema>;

export const rtoTriggerConditionsSchema = z.object({
    maxAttempts: z.number()
        .int()
        .min(1, 'Max attempts must be at least 1')
        .max(10, 'Max attempts cannot exceed 10'),
    maxHours: z.number()
        .int()
        .min(1, 'Max hours must be at least 1')
        .max(168, 'Max hours cannot exceed 7 days (168 hours)'),
    autoTrigger: z.boolean(),
});

export type RTOTriggerConditions = z.infer<typeof rtoTriggerConditionsSchema>;

export const createNDRWorkflowSchema = z.object({
    ndrType: ndrTypeSchema,
    name: z.string()
        .min(3, 'Workflow name must be at least 3 characters')
        .max(100, 'Workflow name cannot exceed 100 characters')
        .optional(),
    isDefault: z.boolean().optional().default(false),
    actions: z.array(workflowActionConfigSchema)
        .min(1, 'At least one action is required')
        .max(50, 'Cannot exceed 50 actions per workflow'),
    escalationRules: escalationRulesSchema.optional(),
    rtoTriggerConditions: rtoTriggerConditionsSchema,
});

export type CreateNDRWorkflowInput = z.infer<typeof createNDRWorkflowSchema>;

export const updateNDRWorkflowSchema = createNDRWorkflowSchema.partial();

export type UpdateNDRWorkflowInput = z.infer<typeof updateNDRWorkflowSchema>;

// ============================================================================
// Public Address Update Schemas
// ============================================================================

export const addressUpdateSchema = z.object({
    line1: z.string()
        .min(5, 'Address line 1 must be at least 5 characters')
        .max(200, 'Address line 1 cannot exceed 200 characters'),
    line2: z.string()
        .max(200, 'Address line 2 cannot exceed 200 characters')
        .optional(),
    city: z.string()
        .min(2, 'City must be at least 2 characters')
        .max(100, 'City cannot exceed 100 characters'),
    state: z.string()
        .min(2, 'State must be at least 2 characters')
        .max(100, 'State cannot exceed 100 characters'),
    country: z.string()
        .min(2)
        .max(100)
        .default('India'),
    postalCode: z.string()
        .min(5, 'Postal code must be at least 5 characters')
        .max(10, 'Postal code cannot exceed 10 characters')
        .regex(/^[0-9]{6}$/, 'Invalid Indian PIN code format'),
    landmark: z.string()
        .max(200, 'Landmark cannot exceed 200 characters')
        .optional(),
});

export type AddressUpdateInput = z.infer<typeof addressUpdateSchema>;

export const publicAddressUpdateSchema = z.object({
    newAddress: addressUpdateSchema,
    customerPhone: z.string()
        .min(10, 'Phone number must be at least 10 digits')
        .max(15, 'Phone number cannot exceed 15 digits')
        .optional(),
    customerName: z.string()
        .min(2, 'Customer name must be at least 2 characters')
        .max(100, 'Customer name cannot exceed 100 characters')
        .optional(),
    notes: z.string()
        .max(500, 'Notes cannot exceed 500 characters')
        .optional(),
});

export type PublicAddressUpdateInput = z.infer<typeof publicAddressUpdateSchema>;

// ============================================================================
// Validation Helper Functions
// ============================================================================

/**
 * Validate NDR type is a valid enum value
 */
export function isValidNDRType(type: string): type is NDRType {
    return ndrTypeSchema.safeParse(type).success;
}

/**
 * Validate NDR status is a valid enum value
 */
export function isValidNDRStatus(status: string): status is NDRStatus {
    return ndrStatusSchema.safeParse(status).success;
}

/**
 * Validate action type is a valid enum value
 */
export function isValidNDRActionType(actionType: string): actionType is NDRActionType {
    return ndrActionTypeSchema.safeParse(actionType).success;
}

/**
 * Validate workflow actions have unique sequence numbers
 */
export function validateActionSequences(actions: WorkflowActionConfig[]): boolean {
    const sequences = actions.map(a => a.sequence);
    const uniqueSequences = new Set(sequences);
    return sequences.length === uniqueSequences.size;
}

/**
 * Validate date range (startDate <= endDate)
 */
export function validateDateRange(startDate?: string, endDate?: string): boolean {
    if (!startDate || !endDate) return true;

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return false;
    }

    return start <= end;
}
