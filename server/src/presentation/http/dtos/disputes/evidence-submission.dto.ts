/**
 * Evidence Submission DTOs
 * 
 * Used for capturing weight evidence at:
 * 1. Packing Station (pre-shipment)
 * 2. Dispute Submission (post-dispute)
 * 
 * Using Zod for validation (consistent with project standards)
 */

import { z } from 'zod';

/**
 * Dimensions Schema
 */
export const DimensionsSchema = z.object({
    length: z.number().min(1).max(200), // in cm
    width: z.number().min(1).max(200),  // in cm
    height: z.number().min(1).max(200), // in cm
    unit: z.enum(['cm', 'inch']).optional()
});

export type DimensionsDto = z.infer<typeof DimensionsSchema>;

/**
 * Packing Station Evidence Schema
 * Captured before shipment handover to courier
 */
export const PackingStationEvidenceSchema = z.object({
    shipmentId: z.string(),
    actualWeight: z.number().min(0.001).max(100),
    weightUnit: z.enum(['kg', 'g']),
    dimensions: DimensionsSchema.optional(),
    photos: z.array(z.string().url()).min(1, { message: 'At least one photo is required' }), // S3 URLs
    notes: z.string().optional(),
    packedBy: z.string(), // User ID or station ID
    location: z.string().optional() // Warehouse location/station
});

export type PackingStationEvidenceDto = z.infer<typeof PackingStationEvidenceSchema>;

/**
 * Seller Dispute Evidence Submission Schema
 * Submitted after dispute is created by carrier
 */
export const SellerEvidenceSubmissionSchema = z.object({
    disputeId: z.string(),
    photos: z.array(z.string().url()).min(1, {
        message: 'At least one photo is required showing weight on scale'
    }), // Photos showing package on scale with AWB visible
    documents: z.array(z.string().url()).optional(), // Additional documents
    explanation: z.string(), // Seller's explanation of discrepancy
    declaredDimensions: DimensionsSchema.optional() // Seller's measured dimensions
});

export type SellerEvidenceSubmissionDto = z.infer<typeof SellerEvidenceSubmissionSchema>;

/**
 * Admin Dispute Resolution Schema
 * Admin manually reviews and resolves dispute
 */
export const AdminResolveDisputeSchema = z.object({
    outcome: z.enum(['seller_favor', 'carrier_favor', 'split', 'waived']),
    adjustedWeight: z.number().min(0).optional(), // Final agreed weight in kg
    refundAmount: z.number().min(0).optional(), // Amount to refund seller
    deductionAmount: z.number().min(0).optional(), // Amount to deduct from seller
    reasonCode: z.enum([
        'PHOTO_EVIDENCE_CLEAR',
        'CARRIER_ADMITTED_ERROR',
        'WEIGHT_WITHIN_TOLERANCE',
        'SELLER_HISTORY_GOOD',
        'CARRIER_SCANNER_FAULTY',
        'GOODWILL_WAIVER',
        'SPLIT_DIFFERENCE',
        'INSUFFICIENT_EVIDENCE',
        'SELLER_PATTERN_FRAUD',
        'TIMEOUT_AUTO_ACCEPT'
    ]),
    notes: z.string(), // Admin's resolution notes
    internalNotes: z.string().optional() // Not visible to seller
});

export type AdminResolveDisputeDto = z.infer<typeof AdminResolveDisputeSchema>;

/**
 * Bulk Dispute Operations Schema
 * Admin batch operations on multiple disputes
 */
export const BulkDisputeActionSchema = z.object({
    disputeIds: z.array(z.string()).min(1),
    action: z.enum(['approve_seller', 'approve_carrier', 'request_evidence', 'escalate', 'waive']),
    notes: z.string().optional()
});

export type BulkDisputeActionDto = z.infer<typeof BulkDisputeActionSchema>;

/**
 * Photo Upload Request Schema
 * For S3 pre-signed URL generation
 */
export const PhotoUploadRequestSchema = z.object({
    fileName: z.string(),
    contentType: z.enum(['image/jpeg', 'image/png', 'image/jpg', 'image/webp']),
    fileSize: z.number().min(1).max(10 * 1024 * 1024), // Max 10MB
    category: z.enum(['packing_station', 'dispute_evidence', 'carrier_evidence'])
});

export type PhotoUploadRequestDto = z.infer<typeof PhotoUploadRequestSchema>;
