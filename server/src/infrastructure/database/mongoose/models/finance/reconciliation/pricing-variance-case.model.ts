import mongoose, { Document, Schema } from 'mongoose';

export interface IPricingVarianceCase extends Document {
    companyId: mongoose.Types.ObjectId;
    shipmentId?: mongoose.Types.ObjectId;
    billingRecordId?: mongoose.Types.ObjectId;
    awb: string;
    provider: 'velocity' | 'delhivery' | 'ekart';
    expectedCost: number;
    billedCost: number;
    varianceAmount: number;
    variancePercent: number;
    thresholdPercent: number;
    breakdown?: {
        freightVariance?: number;
        codVariance?: number;
        fuelVariance?: number;
        rtoVariance?: number;
        otherVariance?: number;
    };
    status: 'open' | 'under_review' | 'resolved' | 'waived';
    resolution?: {
        outcome?: string;
        adjustedCost?: number;
        refundAmount?: number;
        resolvedBy?: mongoose.Types.ObjectId;
        resolvedAt?: Date;
        notes?: string;
    };
    metadata?: {
        source?: 'system' | 'manual';
        caseOwner?: mongoose.Types.ObjectId;
    };
    createdAt: Date;
    updatedAt: Date;
}

const PricingVarianceCaseSchema = new Schema<IPricingVarianceCase>(
    {
        companyId: {
            type: Schema.Types.ObjectId,
            ref: 'Company',
            required: true,
            index: true,
        },
        shipmentId: {
            type: Schema.Types.ObjectId,
            ref: 'Shipment',
            index: true,
        },
        billingRecordId: {
            type: Schema.Types.ObjectId,
            ref: 'CarrierBillingRecord',
        },
        awb: {
            type: String,
            required: true,
            trim: true,
        },
        provider: {
            type: String,
            enum: ['velocity', 'delhivery', 'ekart'],
            required: true,
            index: true,
        },
        expectedCost: {
            type: Number,
            required: true,
            min: 0,
        },
        billedCost: {
            type: Number,
            required: true,
            min: 0,
        },
        varianceAmount: {
            type: Number,
            required: true,
        },
        variancePercent: {
            type: Number,
            required: true,
        },
        thresholdPercent: {
            type: Number,
            default: 5,
            min: 0,
        },
        breakdown: {
            freightVariance: Number,
            codVariance: Number,
            fuelVariance: Number,
            rtoVariance: Number,
            otherVariance: Number,
        },
        status: {
            type: String,
            enum: ['open', 'under_review', 'resolved', 'waived'],
            default: 'open',
            index: true,
        },
        resolution: {
            outcome: String,
            adjustedCost: Number,
            refundAmount: Number,
            resolvedBy: {
                type: Schema.Types.ObjectId,
                ref: 'User',
            },
            resolvedAt: Date,
            notes: String,
        },
        metadata: {
            source: {
                type: String,
                enum: ['system', 'manual'],
                default: 'system',
            },
            caseOwner: {
                type: Schema.Types.ObjectId,
                ref: 'User',
            },
        },
    },
    {
        timestamps: true,
    }
);

PricingVarianceCaseSchema.index({ companyId: 1, status: 1, createdAt: -1 });
PricingVarianceCaseSchema.index({ shipmentId: 1 });
PricingVarianceCaseSchema.index({ companyId: 1, provider: 1, awb: 1 });

const PricingVarianceCase = mongoose.model<IPricingVarianceCase>('PricingVarianceCase', PricingVarianceCaseSchema);
export default PricingVarianceCase;
