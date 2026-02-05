import mongoose, { Document, Schema } from 'mongoose';

/**
 * Early COD Enrollment Model
 *
 * Manages merchant enrollment in the Early COD Program (T+1, T+2, T+3 remittance).
 * Tracks eligibility, current tier, and fees.
 */

export interface IEarlyCODEnrollment extends Document {
    companyId: mongoose.Types.ObjectId;
    tier: 'T+1' | 'T+2' | 'T+3';
    fee: number; // Percentage (e.g. 0.03 for 3%)

    eligibility: {
        qualified: boolean;
        monthlyVolume: number;
        rtoRate: number;      // 0.0 to 1.0
        disputeRate: number;  // 0.0 to 1.0
        vintage: number;      // Days active on platform
        lastCheckedAt: Date;
        disqualificationReason?: string;
    };

    status: 'active' | 'suspended' | 'cancelled' | 'pending_approval';
    enrolledAt: Date;
    suspendedAt?: Date;
    suspensionReason?: string;
    cancelledAt?: Date;

    // Usage stats for this enrollment
    usage: {
        totalBatches: number;
        totalAmountRemitted: number;
        totalFeesPaid: number;
        lastBatchAt?: Date;
    };

    // Optional override for remittance bank details
    bankDetails?: {
        accountNumber: string;
        ifsc: string;
        beneficiaryName: string;
    };

    createdAt: Date;
    updatedAt: Date;
}

const EarlyCODEnrollmentSchema = new Schema<IEarlyCODEnrollment>(
    {
        companyId: {
            type: Schema.Types.ObjectId,
            ref: 'Company',
            required: true,
            unique: true, // One active enrollment per company
            index: true,
        },
        tier: {
            type: String,
            enum: ['T+1', 'T+2', 'T+3'],
            required: true,
        },
        fee: {
            type: Number,
            required: true,
            min: 0,
            max: 0.1, // Max 10% fee
        },
        eligibility: {
            qualified: { type: Boolean, required: true },
            monthlyVolume: { type: Number, default: 0 },
            rtoRate: { type: Number, default: 0 },
            disputeRate: { type: Number, default: 0 },
            vintage: { type: Number, default: 0 },
            lastCheckedAt: { type: Date, default: Date.now },
            disqualificationReason: String,
        },
        status: {
            type: String,
            enum: ['active', 'suspended', 'cancelled', 'pending_approval'],
            default: 'pending_approval',
            index: true,
        },
        enrolledAt: Date,
        suspendedAt: Date,
        suspensionReason: String,
        cancelledAt: Date,
        usage: {
            totalBatches: { type: Number, default: 0 },
            totalAmountRemitted: { type: Number, default: 0 },
            totalFeesPaid: { type: Number, default: 0 },
            lastBatchAt: Date,
        },
        bankDetails: {
            accountNumber: String,
            ifsc: String,
            beneficiaryName: String,
        },
    },
    {
        timestamps: true,
    }
);

const EarlyCODEnrollment = mongoose.model<IEarlyCODEnrollment>('EarlyCODEnrollment', EarlyCODEnrollmentSchema);
export default EarlyCODEnrollment;
