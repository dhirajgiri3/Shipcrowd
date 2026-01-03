import mongoose, { Document, Schema, Model } from 'mongoose';

/**
 * Payout Model
 * 
 * Manages commission payouts to sales representatives via Razorpay
 * Status workflow: pending → processing → completed/failed
 */

export type PayoutStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface IPayout extends Document {
    payoutId: string;
    company: mongoose.Types.ObjectId;
    salesRepresentative: mongoose.Types.ObjectId;
    commissionTransactions: mongoose.Types.ObjectId[];
    totalAmount: number;
    tdsDeducted: number;
    netAmount: number;
    status: PayoutStatus;
    razorpay: {
        payoutId?: string;
        fundAccountId?: string;
        contactId?: string;
        status?: string;
        utr?: string;
        failureReason?: string;
    };
    payoutDate: Date;
    processedAt?: Date;
    failedAt?: Date;
    cancelledAt?: Date;
    retryCount: number;
    metadata?: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;

    // Instance methods
    markCompleted(razorpayData: { payoutId: string; utr: string; status: string }): Promise<void>;
    markFailed(reason: string): Promise<void>;
    retry(): Promise<void>;
}

export interface IPayoutModel extends Model<IPayout> {
    findPendingPayouts(companyId: string): Promise<IPayout[]>;
    aggregateByRep(companyId: string, dateRange?: { start: Date; end: Date }): Promise<any[]>;
    findByRazorpayPayoutId(razorpayPayoutId: string): Promise<IPayout | null>;
}

const PayoutSchema = new Schema<IPayout, IPayoutModel>(
    {
        payoutId: {
            type: String,
            required: [true, 'Payout ID is required'],
            unique: true,
            index: true,
        },
        company: {
            type: Schema.Types.ObjectId,
            ref: 'Company',
            required: [true, 'Company is required'],
            index: true,
        },
        salesRepresentative: {
            type: Schema.Types.ObjectId,
            ref: 'SalesRepresentative',
            required: [true, 'Sales representative is required'],
            index: true,
        },
        commissionTransactions: [
            {
                type: Schema.Types.ObjectId,
                ref: 'CommissionTransaction',
            },
        ],
        totalAmount: {
            type: Number,
            required: [true, 'Total amount is required'],
            min: [0, 'Total amount cannot be negative'],
        },
        tdsDeducted: {
            type: Number,
            default: 0,
            min: [0, 'TDS cannot be negative'],
        },
        netAmount: {
            type: Number,
            required: [true, 'Net amount is required'],
            min: [0, 'Net amount cannot be negative'],
        },
        status: {
            type: String,
            enum: {
                values: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
                message: '{VALUE} is not a valid payout status',
            },
            default: 'pending',
            index: true,
        },
        razorpay: {
            payoutId: {
                type: String,
                sparse: true,
            },
            fundAccountId: String,
            contactId: String,
            status: String,
            utr: String,
            failureReason: String,
        },
        payoutDate: {
            type: Date,
            default: Date.now,
            index: true,
        },
        processedAt: Date,
        failedAt: Date,
        cancelledAt: Date,
        retryCount: {
            type: Number,
            default: 0,
            min: 0,
        },
        metadata: Schema.Types.Mixed,
    },
    {
        timestamps: true,
    }
);

// ============================================================================
// INDEXES
// ============================================================================

PayoutSchema.index({ company: 1, status: 1 });
PayoutSchema.index({ salesRepresentative: 1, status: 1 });
PayoutSchema.index({ 'razorpay.payoutId': 1 }, { unique: true, sparse: true });
PayoutSchema.index({ payoutDate: -1 });
PayoutSchema.index({ status: 1, payoutDate: -1 });

// ============================================================================
// INSTANCE METHODS
// ============================================================================

/**
 * Mark payout as completed
 */
PayoutSchema.methods.markCompleted = async function (razorpayData: {
    payoutId: string;
    utr: string;
    status: string;
}): Promise<void> {
    this.status = 'completed';
    this.processedAt = new Date();
    this.razorpay.payoutId = razorpayData.payoutId;
    this.razorpay.utr = razorpayData.utr;
    this.razorpay.status = razorpayData.status;
    await this.save();
};

/**
 * Mark payout as failed
 */
PayoutSchema.methods.markFailed = async function (reason: string): Promise<void> {
    this.status = 'failed';
    this.failedAt = new Date();
    this.razorpay.failureReason = reason;
    this.retryCount++;
    await this.save();
};

/**
 * Retry failed payout
 */
PayoutSchema.methods.retry = async function (): Promise<void> {
    if (this.status !== 'failed') {
        throw new Error('Only failed payouts can be retried');
    }
    if (this.retryCount >= 3) {
        throw new Error('Maximum retry attempts (3) exceeded');
    }
    this.status = 'pending';
    this.failedAt = undefined;
    await this.save();
};

// ============================================================================
// STATIC METHODS
// ============================================================================

/**
 * Find all pending payouts for a company
 */
PayoutSchema.statics.findPendingPayouts = async function (
    companyId: string
): Promise<IPayout[]> {
    return this.find({
        company: new mongoose.Types.ObjectId(companyId),
        status: 'pending',
    })
        .populate('salesRepresentative', 'employeeId user bankDetails')
        .populate('commissionTransactions', 'order finalAmount')
        .sort({ payoutDate: 1 });
};

/**
 * Aggregate payouts by sales representative
 */
PayoutSchema.statics.aggregateByRep = async function (
    companyId: string,
    dateRange?: { start: Date; end: Date }
): Promise<any[]> {
    const match: any = {
        company: new mongoose.Types.ObjectId(companyId),
        status: 'completed',
    };

    if (dateRange) {
        match.payoutDate = {
            $gte: dateRange.start,
            $lte: dateRange.end,
        };
    }

    return this.aggregate([
        { $match: match },
        {
            $group: {
                _id: '$salesRepresentative',
                totalPaid: { $sum: '$netAmount' },
                payoutCount: { $sum: 1 },
                avgPayout: { $avg: '$netAmount' },
            },
        },
        {
            $lookup: {
                from: 'salesrepresentatives',
                localField: '_id',
                foreignField: '_id',
                as: 'salesRep',
            },
        },
        { $unwind: '$salesRep' },
        { $sort: { totalPaid: -1 } },
    ]);
};

/**
 * Find payout by Razorpay payout ID
 */
PayoutSchema.statics.findByRazorpayPayoutId = async function (
    razorpayPayoutId: string
): Promise<IPayout | null> {
    return this.findOne({ 'razorpay.payoutId': razorpayPayoutId });
};

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Pre-save hook for payout ID generation
 */
PayoutSchema.pre('save', function (next) {
    if (this.isNew && !this.payoutId) {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 7);
        this.payoutId = `PO-${timestamp}-${random}`.toUpperCase();
    }
    next();
});

/**
 * Pre-save hook for status transition validation
 */
PayoutSchema.pre('save', function (next) {
    if (this.isModified('status')) {
        const validTransitions: Record<PayoutStatus, PayoutStatus[]> = {
            pending: ['processing', 'cancelled'],
            processing: ['completed', 'failed'],
            completed: [],
            failed: ['pending'], // For retries
            cancelled: [],
        };

        const original = this.get('status', null, { getters: false }) as PayoutStatus;
        if (original && !validTransitions[original]?.includes(this.status)) {
            return next(new Error(`Invalid status transition from ${original} to ${this.status}`));
        }
    }
    next();
});

const Payout = mongoose.model<IPayout, IPayoutModel>('Payout', PayoutSchema);

export default Payout;
