import mongoose, { Document, Schema } from 'mongoose';
import { arrayLimit } from '../../../../../../../shared/utils/arrayValidators';

/**
 * WeightDispute Model
 * 
 * Tracks weight discrepancies between declared weight and actual carrier-scanned weight.
 * Automates dispute creation when discrepancy exceeds 5% threshold or ₹50 financial impact.
 * 
 * Business Impact: Prevents ₹20,000-50,000/month revenue loss
 * Affects: 15-20% of all shipments
 * 
 * Lifecycle:
 * 1. Carrier scans package → Detects discrepancy
 * 2. Auto-create dispute (status: pending)
 * 3. Seller submits evidence (status: under_review)
 * 4. Admin resolves OR auto-resolve after 7 days (status: resolved)
 * 5. Financial settlement via wallet
 */

export interface IWeightDispute extends Document {
    // Identification
    disputeId: string; // WD-YYYYMMDD-XXXXX (e.g., WD-20260107-AB12)
    shipmentId: mongoose.Types.ObjectId;
    orderId: mongoose.Types.ObjectId;
    companyId: mongoose.Types.ObjectId;

    // Weight Information
    declaredWeight: {
        value: number;
        unit: 'kg' | 'g';
    };
    actualWeight: {
        value: number;
        unit: 'kg' | 'g';
    };
    discrepancy: {
        value: number; // Absolute difference in kg
        percentage: number; // Percentage difference
        thresholdExceeded: boolean; // If >5%
    };

    // Dispute Lifecycle
    status:
    | 'pending' // Awaiting seller response
    | 'under_review' // Seller submitted evidence, awaiting admin review
    | 'seller_response' // Seller responded
    | 'auto_resolved' // Auto-resolved after 7 days
    | 'manual_resolved' // Admin manually resolved
    | 'closed'; // Final state
    detectedAt: Date;
    detectedBy: 'carrier_webhook' | 'system_scan';

    // Seller Evidence
    evidence?: {
        sellerPhotos?: string[]; // S3/CloudFlare URLs
        sellerDocuments?: string[]; // Bills, invoices
        submittedAt?: Date;
        notes?: string;
    };

    // Carrier Evidence
    carrierEvidence?: {
        scanPhoto?: string; // Photo from carrier weighing scale
        scanTimestamp?: Date;
        scanLocation?: string;
        carrierNotes?: string;
    };

    // Financial Impact
    financialImpact: {
        originalCharge: number; // What seller paid based on declared weight
        revisedCharge: number; // What they should pay based on actual weight
        difference: number; // Revenue adjustment amount
        chargeDirection: 'debit' | 'credit'; // Who needs to pay/get refund
    };

    // Resolution
    resolution?: {
        outcome: 'seller_favor' | 'shipcrowd_favor' | 'split' | 'waived';
        adjustedWeight?: {
            value: number;
            unit: 'kg' | 'g';
        };
        refundAmount?: number; // If seller_favor
        deductionAmount?: number; // If shipcrowd_favor
        reasonCode: string; // AUTO_RESOLVED_NO_RESPONSE, SELLER_PROVIDED_PROOF, etc.
        resolvedAt: Date;
        resolvedBy: mongoose.Types.ObjectId | 'system';
        notes: string;
    };

    // Timeline (audit trail)
    timeline: Array<{
        status: string;
        timestamp: Date;
        actor: mongoose.Types.ObjectId | 'system' | 'carrier';
        action: string;
        notes?: string;
    }>;

    // Wallet Transaction Link
    walletTransactionId?: mongoose.Types.ObjectId;

    // Metadata
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
}

// Create the WeightDispute schema
const WeightDisputeSchema = new Schema<IWeightDispute>(
    {
        disputeId: {
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
        orderId: {
            type: Schema.Types.ObjectId,
            ref: 'Order',
            required: true,
        },
        companyId: {
            type: Schema.Types.ObjectId,
            ref: 'Company',
            required: true,
            index: true,
        },
        declaredWeight: {
            value: {
                type: Number,
                required: true,
            },
            unit: {
                type: String,
                enum: ['kg', 'g'],
                default: 'kg',
            },
        },
        actualWeight: {
            value: {
                type: Number,
                required: true,
            },
            unit: {
                type: String,
                enum: ['kg', 'g'],
                default: 'kg',
            },
        },
        discrepancy: {
            value: {
                type: Number,
                required: true,
            },
            percentage: {
                type: Number,
                required: true,
            },
            thresholdExceeded: {
                type: Boolean,
                required: true,
            },
        },
        status: {
            type: String,
            enum: [
                'pending',
                'under_review',
                'seller_response',
                'auto_resolved',
                'manual_resolved',
                'closed',
            ],
            default: 'pending',
            required: true,
            index: true,
        },
        detectedAt: {
            type: Date,
            required: true,
            default: Date.now,
        },
        detectedBy: {
            type: String,
            enum: ['carrier_webhook', 'system_scan'],
            required: true,
        },
        evidence: {
            sellerPhotos: [String],
            sellerDocuments: [String],
            submittedAt: Date,
            notes: String,
        },
        carrierEvidence: {
            scanPhoto: String,
            scanTimestamp: Date,
            scanLocation: String,
            carrierNotes: String,
        },
        financialImpact: {
            originalCharge: {
                type: Number,
                required: true,
            },
            revisedCharge: {
                type: Number,
                required: true,
            },
            difference: {
                type: Number,
                required: true,
            },
            chargeDirection: {
                type: String,
                enum: ['debit', 'credit'],
                required: true,
            },
        },
        resolution: {
            outcome: {
                type: String,
                enum: ['seller_favor', 'shipcrowd_favor', 'split', 'waived'],
            },
            adjustedWeight: {
                value: Number,
                unit: {
                    type: String,
                    enum: ['kg', 'g'],
                },
            },
            refundAmount: Number,
            deductionAmount: Number,
            reasonCode: String,
            resolvedAt: Date,
            resolvedBy: {
                type: Schema.Types.Mixed, // Can be ObjectId or 'system'
            },
            notes: String,
        },
        timeline: {
            type: [
                {
                    status: {
                        type: String,
                        required: true,
                    },
                    timestamp: {
                        type: Date,
                        default: Date.now,
                    },
                    actor: {
                        type: Schema.Types.Mixed, // Can be ObjectId or 'system' or 'carrier'
                    },
                    action: {
                        type: String,
                        required: true,
                    },
                    notes: String,
                },
            ],
            validate: [
                arrayLimit(50),
                'Maximum 50 timeline entries per dispute',
            ],
        },
        walletTransactionId: {
            type: Schema.Types.ObjectId,
            ref: 'WalletTransaction',
        },
        isDeleted: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes for performance
WeightDisputeSchema.index({ companyId: 1, status: 1, createdAt: -1 }); // Company's disputes sorted by date
WeightDisputeSchema.index({ status: 1, createdAt: -1 }); // Admin view: All pending disputes
// Note: shipmentId index is already defined inline in the schema field definition
WeightDisputeSchema.index({ createdAt: -1 }); // Auto-resolve job: Old disputes
WeightDisputeSchema.index({ 'financialImpact.difference': -1 }); // High-value disputes

// Pre-save hook to ensure initial timeline entry
WeightDisputeSchema.pre('save', function (next) {
    const dispute = this;

    // If this is a new dispute, add initial timeline entry
    if (dispute.isNew && dispute.timeline.length === 0) {
        dispute.timeline.push({
            status: dispute.status,
            timestamp: new Date(),
            actor: dispute.detectedBy === 'carrier_webhook' ? 'carrier' : 'system',
            action: `Weight discrepancy detected: ${dispute.discrepancy.percentage.toFixed(1)}% difference (₹${dispute.financialImpact.difference})`,
        });
    }

    next();
});

// Create and export the model
const WeightDispute = mongoose.model<IWeightDispute>('WeightDispute', WeightDisputeSchema);
export default WeightDispute;
