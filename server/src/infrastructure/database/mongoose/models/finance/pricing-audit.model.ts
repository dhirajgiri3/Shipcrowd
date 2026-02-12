import mongoose, { Schema, Document } from 'mongoose';

export interface IPricingAudit extends Document {
    requestId: string;
    companyId: mongoose.Types.ObjectId;
    input: any;
    resolvedZone: string;
    zoneSource: string;
    rateCardId?: mongoose.Types.ObjectId;
    breakdown: any;
    price: number;
    pricingVersion: string;
    metadata?: any;
    note?: string;
    createdAt: Date;
}

const PricingAuditSchema = new Schema(
    {
        requestId: {
            type: String,
            required: true,
            index: true
        },
        companyId: {
            type: Schema.Types.ObjectId,
            ref: 'Company',
            required: true,
            index: true
        },
        input: {
            type: Schema.Types.Mixed,
            required: true
        },
        resolvedZone: {
            type: String,
            required: true
        },
        zoneSource: {
            type: String,
            required: true
        },
        rateCardId: {
            type: Schema.Types.ObjectId
        },
        breakdown: {
            type: Schema.Types.Mixed
        },
        price: {
            type: Number,
            required: true
        },
        pricingVersion: {
            type: String
        },
        metadata: {
            type: Schema.Types.Mixed
        },
        note: {
            type: String
        }
    },
    {
        timestamps: { createdAt: true, updatedAt: false } // Only createdAt
    }
);

// Indexes
PricingAuditSchema.index({ companyId: 1, createdAt: -1 }); // For querying by company recent
PricingAuditSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 }); // 90 Days TTL

const PricingAudit = mongoose.model<IPricingAudit>('PricingAudit', PricingAuditSchema);
export default PricingAudit;
