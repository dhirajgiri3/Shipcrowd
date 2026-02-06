import mongoose, { Document, Schema } from 'mongoose';
import { arrayLimit } from '../../../../../shared/utils/arrayValidators';

/**
 * COD Discrepancy Model
 *
 * Tracks mismatches between expected COD amount (from order) and actual collected amount.
 * Handles missing shipments in remittance, duplicate entries, and timing mismatches.
 */

export interface ICODDiscrepancy extends Document {
    discrepancyNumber: string; // "CODD-YYYY-XXXX"
    shipmentId: mongoose.Types.ObjectId;
    awb: string;
    companyId: mongoose.Types.ObjectId;
    carrier: string;

    // Core discrepancy data
    amounts: {
        expected: {
            cod: number;
            charges: number;
            total: number;
        };
        actual: {
            collected: number;
            reported: number; // From MIS/Courier API
            source: 'webhook' | 'api' | 'mis' | 'manual';
        };
        difference: number; // actual - expected
        percentage: number;
    };

    // Classification
    type:
    | 'amount_mismatch'
    | 'missing_shipment'
    | 'duplicate_entry'
    | 'timing_issue'
    | 'payment_method_mismatch'
    | 'partial_collection'
    | 'overpayment';

    severity: 'minor' | 'medium' | 'major' | 'critical';

    // Status tracking
    status:
    | 'detected'
    | 'under_review'
    | 'courier_queried'
    | 'resolved'
    | 'accepted'
    | 'disputed'
    | 'timeout'
    | 'escalated';

    // Evidence & Investigation
    evidence: Array<{
        type: 'pod_photo' | 'payment_receipt' | 'courier_email' | 'other';
        url: string;
        uploadedAt: Date;
        uploadedBy: string;
    }>;

    investigation?: {
        assignedTo?: mongoose.Types.ObjectId;
        notes?: string;
        courierResponse?: {
            received: boolean;
            response?: string;
            timestamp?: Date;
            ticketId?: string;
        };
    };

    // Resolution
    resolution?: {
        method: 'auto_accept' | 'courier_adjustment' | 'merchant_writeoff' | 'split_difference';
        adjustedAmount?: number;
        resolvedAt?: Date;
        resolvedBy?: string; // 'system' or userId
        remarks?: string;
    };

    timeline: Array<{
        status: string;
        timestamp: Date;
        notes?: string;
        updatedBy?: string; // 'system' or userId
    }>;

    autoResolveAt?: Date; // 7 days from creation
    createdAt: Date;
    updatedAt: Date;
}

const CODDiscrepancySchema = new Schema<ICODDiscrepancy>(
    {
        discrepancyNumber: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        shipmentId: {
            type: Schema.Types.ObjectId,
            ref: 'Shipment',
            required: true,
            index: true,
        },
        awb: {
            type: String,
            required: true,
            index: true,
        },
        companyId: {
            type: Schema.Types.ObjectId,
            ref: 'Company',
            required: true,
            index: true,
        },
        carrier: {
            type: String,
            required: true,
        },
        amounts: {
            expected: {
                cod: { type: Number, required: true },
                charges: { type: Number, default: 0 },
                total: { type: Number, required: true },
            },
            actual: {
                collected: { type: Number, required: true },
                reported: { type: Number, required: true },
                source: {
                    type: String,
                    enum: ['webhook', 'api', 'mis', 'manual'],
                    required: true,
                },
            },
            difference: { type: Number, required: true },
            percentage: { type: Number, required: true },
        },
        type: {
            type: String,
            enum: [
                'amount_mismatch',
                'missing_shipment',
                'duplicate_entry',
                'timing_issue',
                'payment_method_mismatch',
                'partial_collection',
                'overpayment',
            ],
            required: true,
            index: true,
        },
        severity: {
            type: String,
            enum: ['minor', 'medium', 'major', 'critical'],
            default: 'medium',
            index: true,
        },
        status: {
            type: String,
            enum: [
                'detected',
                'under_review',
                'courier_queried',
                'resolved',
                'accepted',
                'disputed',
                'timeout',
                'escalated',
            ],
            default: 'detected',
            index: true,
        },
        evidence: {
            type: [
                {
                    type: {
                        type: String,
                        enum: ['pod_photo', 'payment_receipt', 'courier_email', 'other'],
                    },
                    url: String,
                    uploadedAt: { type: Date, default: Date.now },
                    uploadedBy: String,
                },
            ],
            validate: [arrayLimit(20), 'Maximum 20 evidence files allowed'],
        },
        investigation: {
            assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
            notes: String,
            courierResponse: {
                received: { type: Boolean, default: false },
                response: String,
                timestamp: Date,
                ticketId: String,
            },
        },
        resolution: {
            method: {
                type: String,
                enum: ['auto_accept', 'courier_adjustment', 'merchant_writeoff', 'split_difference'],
            },
            adjustedAmount: Number,
            resolvedAt: Date,
            resolvedBy: String,
            remarks: String,
        },
        timeline: {
            type: [
                {
                    status: String,
                    timestamp: { type: Date, default: Date.now },
                    notes: String,
                    updatedBy: String,
                },
            ],
            validate: [arrayLimit(50), 'Maximum 50 timeline entries'],
        },
        autoResolveAt: {
            type: Date,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes for common queries
CODDiscrepancySchema.index({ companyId: 1, status: 1 }); // Dashboard view
CODDiscrepancySchema.index({ companyId: 1, type: 1 }); // Analytics by type
CODDiscrepancySchema.index({ companyId: 1, createdAt: -1 }); // Recent disputes
CODDiscrepancySchema.index({ autoResolveAt: 1 }, { expireAfterSeconds: 0 }); // Allow TTL if we want auto-cleanup (or just query it)

const CODDiscrepancy = mongoose.model<ICODDiscrepancy>('CODDiscrepancy', CODDiscrepancySchema);
export default CODDiscrepancy;
