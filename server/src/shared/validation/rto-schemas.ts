/**
 * RTO (Return To Origin) Validation Schemas
 * Zod schemas for RTO-related API endpoints
 */

import { z } from 'zod';

// ============================================================================
// RTO Enums and Types
// ============================================================================

export const rtoReasonSchema = z.enum([
    'ndr_unresolved',
    'customer_cancellation',
    'qc_failure',
    'damaged_in_transit',
    'incorrect_product',
    'other',
]);

export type RTOReason = z.infer<typeof rtoReasonSchema>;

export const rtoStatusSchema = z.enum([
    'initiated',
    'in_transit',
    'delivered_to_warehouse',
    'qc_pending',
    'qc_completed',
    'restocked',
    'disposed',
    'refurbishing',
    'claim_filed',
]);

export type RTOStatus = z.infer<typeof rtoStatusSchema>;

export const dispositionActionSchema = z.enum(['restock', 'refurb', 'dispose', 'claim']);
export type DispositionAction = z.infer<typeof dispositionActionSchema>;

export const executeDispositionSchema = z.object({
    action: dispositionActionSchema,
    notes: z.string().max(500).optional(),
});
export type ExecuteDispositionInput = z.infer<typeof executeDispositionSchema>;

export const rtoTriggeredBySchema = z.enum([
    'auto',
    'manual',
    'system',
    'customer_request',
]);

export type RTOTriggeredBy = z.infer<typeof rtoTriggeredBySchema>;

// ============================================================================
// Query Schemas
// ============================================================================

export const listRTOEventsQuerySchema = z.object({
    page: z.string().optional().transform(val => Math.max(1, parseInt(val || '1', 10))),
    limit: z.string().optional().transform(val => Math.max(1, Math.min(100, parseInt(val || '20', 10)))),
    returnStatus: rtoStatusSchema.optional(),
    rtoReason: rtoReasonSchema.optional(),
    warehouseId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid warehouse ID format').optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    sortBy: z.enum(['triggeredAt', 'expectedReturnDate', 'actualReturnDate']).optional().default('triggeredAt'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type ListRTOEventsQuery = z.infer<typeof listRTOEventsQuerySchema>;

export const getRTOStatsQuerySchema = z.object({
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    warehouseId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
    rtoReason: rtoReasonSchema.optional(),
});

export type GetRTOStatsQuery = z.infer<typeof getRTOStatsQuerySchema>;

export const getPendingRTOsQuerySchema = z.object({
    warehouseId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
    daysUntilReturn: z.string().optional().transform(val => parseInt(val || '7', 10)),
});

export type GetPendingRTOsQuery = z.infer<typeof getPendingRTOsQuerySchema>;

// ============================================================================
// Request Body Schemas
// ============================================================================

export const triggerManualRTOSchema = z.object({
    shipmentId: z.string()
        .min(1, 'Shipment ID is required')
        .regex(/^[a-f\d]{24}$/i, 'Invalid shipment ID format'),
    reason: rtoReasonSchema,
    notes: z.string()
        .max(1000, 'Notes cannot exceed 1000 characters')
        .optional(),
    warehouseId: z.string()
        .regex(/^[a-f\d]{24}$/i, 'Invalid warehouse ID format')
        .optional(),
    expectedReturnDate: z.string()
        .refine(val => !isNaN(Date.parse(val)), 'Invalid date format')
        .optional(),
});

export type TriggerManualRTOInput = z.infer<typeof triggerManualRTOSchema>;

export const updateRTOStatusSchema = z.object({
    returnStatus: rtoStatusSchema,
    notes: z.string()
        .max(1000, 'Notes cannot exceed 1000 characters')
        .optional(),
    actualReturnDate: z.string()
        .refine(val => !isNaN(Date.parse(val)), 'Invalid date format')
        .optional(),
    reverseAwb: z.string()
        .min(5, 'Reverse AWB must be at least 5 characters')
        .max(50, 'Reverse AWB cannot exceed 50 characters')
        .optional(),
});

export type UpdateRTOStatusInput = z.infer<typeof updateRTOStatusSchema>;

export const qcPhotoSchema = z.object({
    url: z.string().url('Invalid image URL'),
    label: z.string().max(100).optional(),
});

export const qcResultSchema = z.object({
    passed: z.boolean(),
    remarks: z.string()
        .min(5, 'QC remarks must be at least 5 characters')
        .max(500, 'QC remarks cannot exceed 500 characters'),
    images: z.array(z.string().url('Invalid image URL'))
        .max(20, 'Cannot upload more than 20 QC images')
        .optional(),
    inspectedBy: z.string()
        .min(1, 'Inspector name is required')
        .max(100, 'Inspector name cannot exceed 100 characters')
        .optional(),
    damageSeverity: z.enum(['none', 'minor', 'moderate', 'severe', 'total_loss']).optional(),
    restockable: z.boolean().optional(),
    condition: z.string().max(1000).optional(),
    damageTypes: z.array(z.string().max(80)).max(20).optional(),
    photos: z.array(qcPhotoSchema).max(20).optional(),
});

export type QCResultInput = z.infer<typeof qcResultSchema>;

export const recordQCResultSchema = z.object({
    qcResult: qcResultSchema,
    nextAction: z.enum(['restock', 'dispose', 'return_to_vendor', 'repair']).optional(),
});

export type RecordQCResultInput = z.infer<typeof recordQCResultSchema>;

// ============================================================================
// RTO Charge Schemas
// ============================================================================

export const calculateRTOChargesSchema = z.object({
    shipmentId: z.string()
        .regex(/^[a-f\d]{24}$/i, 'Invalid shipment ID format'),
    warehouseId: z.string()
        .regex(/^[a-f\d]{24}$/i, 'Invalid warehouse ID format')
        .optional(),
    weight: z.number()
        .min(0, 'Weight cannot be negative')
        .max(100000, 'Weight cannot exceed 100kg')
        .optional(),
    distance: z.number()
        .min(0, 'Distance cannot be negative')
        .optional(),
});

export type CalculateRTOChargesInput = z.infer<typeof calculateRTOChargesSchema>;

// ============================================================================
// Warehouse Notification Schemas
// ============================================================================

export const warehouseNotificationSchema = z.object({
    warehouseId: z.string()
        .regex(/^[a-f\d]{24}$/i, 'Invalid warehouse ID format'),
    rtoEventId: z.string()
        .regex(/^[a-f\d]{24}$/i, 'Invalid RTO event ID format'),
    expectedReturnDate: z.string()
        .refine(val => !isNaN(Date.parse(val)), 'Invalid date format'),
    notificationChannels: z.array(z.enum(['email', 'whatsapp', 'sms']))
        .min(1, 'At least one notification channel is required')
        .max(10, 'Cannot exceed 10 notification channels'),
    message: z.string()
        .max(500, 'Message cannot exceed 500 characters')
        .optional(),
});

export type WarehouseNotificationInput = z.infer<typeof warehouseNotificationSchema>;

// ============================================================================
// RTO Bulk Operations
// ============================================================================

export const bulkUpdateRTOStatusSchema = z.object({
    rtoEventIds: z.array(z.string().regex(/^[a-f\d]{24}$/i))
        .min(1, 'At least one RTO event ID is required')
        .max(100, 'Cannot update more than 100 RTO events at once'),
    returnStatus: rtoStatusSchema,
    notes: z.string().max(1000).optional(),
});

export type BulkUpdateRTOStatusInput = z.infer<typeof bulkUpdateRTOStatusSchema>;

export const bulkQCSchema = z.object({
    qcResults: z.array(z.object({
        rtoEventId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid RTO event ID format'),
        qcResult: qcResultSchema,
    }))
        .min(1, 'At least one QC result is required')
        .max(50, 'Cannot process more than 50 QC results at once'),
});

export type BulkQCInput = z.infer<typeof bulkQCSchema>;

// ============================================================================
// Validation Helper Functions
// ============================================================================

/**
 * Validate RTO reason is a valid enum value
 */
export function isValidRTOReason(reason: string): reason is RTOReason {
    return rtoReasonSchema.safeParse(reason).success;
}

/**
 * Validate RTO status is a valid enum value
 */
export function isValidRTOStatus(status: string): status is RTOStatus {
    return rtoStatusSchema.safeParse(status).success;
}

/**
 * Validate RTO status transition is allowed
 */
const RTO_STATUS_TRANSITIONS: Record<RTOStatus, RTOStatus[]> = {
    initiated: ['in_transit', 'delivered_to_warehouse'],
    in_transit: ['delivered_to_warehouse'],
    delivered_to_warehouse: ['qc_pending'],
    qc_pending: ['qc_completed'],
    qc_completed: ['restocked', 'disposed', 'refurbishing', 'claim_filed'],
    restocked: [],
    disposed: [],
    refurbishing: [],
    claim_filed: [],
};

export function isValidRTOStatusTransition(
    currentStatus: RTOStatus,
    newStatus: RTOStatus
): boolean {
    const allowedTransitions = RTO_STATUS_TRANSITIONS[currentStatus] || [];
    return allowedTransitions.includes(newStatus);
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

/**
 * Validate expected return date is in the future
 */
export function validateExpectedReturnDate(dateString: string): boolean {
    const date = new Date(dateString);

    if (isNaN(date.getTime())) {
        return false;
    }

    return date > new Date();
}

/**
 * Validate QC images array doesn't exceed limit
 */
export function validateQCImages(images?: string[]): boolean {
    if (!images) return true;
    return images.length <= 20 && images.every(img => {
        try {
            new URL(img);
            return true;
        } catch {
            return false;
        }
    });
}

/**
 * Validate RTO charges calculation parameters
 */
export function validateRTOChargesParams(
    weight?: number,
    distance?: number
): boolean {
    if (weight !== undefined && (weight < 0 || weight > 100000)) {
        return false;
    }

    if (distance !== undefined && distance < 0) {
        return false;
    }

    return true;
}
