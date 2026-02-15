import mongoose, { Document, Model, Schema } from 'mongoose';

/**
 * Commission Adjustment Model
 * 
 * Tracks adjustments made to commission transactions:
 * - Bonuses for exceptional performance
 * - Penalties for issues
 * - Corrections for calculation errors
 * - Dispute resolutions
 */

// Adjustment types
export type AdjustmentType = 'bonus' | 'penalty' | 'correction' | 'dispute' | 'other';
export type AdjustmentStatus = 'pending' | 'approved' | 'rejected';

// Commission Adjustment interface
export interface ICommissionAdjustment extends Document {
    commissionTransaction: mongoose.Types.ObjectId;
    company: mongoose.Types.ObjectId;
    amount: number;
    reason: string;
    adjustmentType: AdjustmentType;
    adjustedBy: mongoose.Types.ObjectId;
    approvedBy?: mongoose.Types.ObjectId;
    approvedAt?: Date;
    rejectedBy?: mongoose.Types.ObjectId;
    rejectedAt?: Date;
    rejectionReason?: string;
    status: AdjustmentStatus;
    metadata?: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
}

// Static methods interface
export interface ICommissionAdjustmentModel extends Model<ICommissionAdjustment> {
    findByTransaction(transactionId: string): Promise<ICommissionAdjustment[]>;
    getTotalAdjustment(transactionId: string): Promise<number>;
}

// Main CommissionAdjustment schema
const CommissionAdjustmentSchema = new Schema<ICommissionAdjustment, ICommissionAdjustmentModel>(
    {
        commissionTransaction: {
            type: Schema.Types.ObjectId,
            ref: 'CommissionTransaction',
            required: [true, 'Commission transaction is required'],
            index: true,
        },
        company: {
            type: Schema.Types.ObjectId,
            ref: 'Company',
            required: [true, 'Company is required'],
            index: true,
        },
        amount: {
            type: Number,
            required: [true, 'Amount is required'],
            // Can be positive (bonus) or negative (penalty)
        },
        reason: {
            type: String,
            required: [true, 'Reason is required'],
            trim: true,
            minlength: [5, 'Reason must be at least 5 characters'],
            maxlength: [500, 'Reason cannot exceed 500 characters'],
        },
        adjustmentType: {
            type: String,
            enum: {
                values: ['bonus', 'penalty', 'correction', 'dispute', 'other'],
                message: '{VALUE} is not a valid adjustment type',
            },
            required: [true, 'Adjustment type is required'],
        },
        adjustedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Adjusted by is required'],
        },
        approvedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
        approvedAt: {
            type: Date,
        },
        rejectedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
        rejectedAt: {
            type: Date,
        },
        rejectionReason: {
            type: String,
            trim: true,
            maxlength: [500, 'Rejection reason cannot exceed 500 characters'],
        },
        status: {
            type: String,
            enum: {
                values: ['pending', 'approved', 'rejected'],
                message: '{VALUE} is not a valid status',
            },
            default: 'pending',
        },
        metadata: {
            type: Schema.Types.Mixed,
        },
    },
    {
        timestamps: true,
    }
);

// ============================================================================
// INDEXES
// ============================================================================

// Transaction lookup

// Company + status filtering
CommissionAdjustmentSchema.index({ company: 1, status: 1 });

// Adjusted by lookup
CommissionAdjustmentSchema.index({ adjustedBy: 1 });

// Type filtering
CommissionAdjustmentSchema.index({ company: 1, adjustmentType: 1 });

// ============================================================================
// STATIC METHODS
// ============================================================================

/**
 * Find all adjustments for a transaction
 */
CommissionAdjustmentSchema.statics.findByTransaction = async function (
    transactionId: string
): Promise<ICommissionAdjustment[]> {
    return this.find({
        commissionTransaction: new mongoose.Types.ObjectId(transactionId),
    })
        .populate('adjustedBy', 'name email')
        .populate('approvedBy', 'name email')
        .sort({ createdAt: -1 })
        .lean();
};

/**
 * Calculate total adjustment amount for a transaction
 */
CommissionAdjustmentSchema.statics.getTotalAdjustment = async function (
    transactionId: string
): Promise<number> {
    const result = await this.aggregate([
        {
            $match: {
                commissionTransaction: new mongoose.Types.ObjectId(transactionId),
                status: 'approved',
            },
        },
        {
            $group: {
                _id: null,
                total: { $sum: '$amount' },
            },
        },
    ]);

    return result[0]?.total || 0;
};

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Pre-save hook for validation
 */
CommissionAdjustmentSchema.pre('save', function (next) {
    // Auto-set approvedAt/rejectedAt timestamps
    if (this.isModified('status')) {
        if (this.status === 'approved' && !this.approvedAt) {
            this.approvedAt = new Date();
        }
        if (this.status === 'rejected' && !this.rejectedAt) {
            this.rejectedAt = new Date();
        }
    }

    // Validate penalty amounts are negative
    if (this.adjustmentType === 'penalty' && this.amount > 0) {
        this.amount = -Math.abs(this.amount);
    }

    next();
});

// Create and export the model
const CommissionAdjustment = mongoose.model<ICommissionAdjustment, ICommissionAdjustmentModel>(
    'CommissionAdjustment',
    CommissionAdjustmentSchema
);

export default CommissionAdjustment;
