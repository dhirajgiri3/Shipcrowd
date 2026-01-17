import mongoose, { Document, Schema, Model } from 'mongoose';

/**
 * Commission Transaction Model
 * 
 * Tracks all commission calculations with approval workflow:
 * pending → approved → rejected → paid
 * 
 * Uses optimistic locking (version field) to prevent race conditions
 */

// Status types
export type TransactionStatus = 'pending' | 'approved' | 'rejected' | 'paid' | 'cancelled';

// Commission Transaction interface
export interface ICommissionTransaction extends Document {
    company: mongoose.Types.ObjectId;
    salesRepresentative: mongoose.Types.ObjectId;
    order: mongoose.Types.ObjectId;
    commissionRule: mongoose.Types.ObjectId;
    calculatedAmount: number;
    adjustments: mongoose.Types.ObjectId[];
    finalAmount: number;
    status: TransactionStatus;
    calculatedAt: Date;
    approvedBy?: mongoose.Types.ObjectId;
    approvedAt?: Date;
    rejectedBy?: mongoose.Types.ObjectId;
    rejectedAt?: Date;
    rejectionReason?: string;
    paidAt?: Date;
    payoutBatch?: mongoose.Types.ObjectId;
    version: number;
    metadata?: {
        orderValue?: number;
        ruleType?: string;
        eventType?: string;
        [key: string]: unknown;
    };
    createdAt: Date;
    updatedAt: Date;

    // Soft delete fields
    isDeleted: boolean;
    deletedAt?: Date;
    deletedBy?: mongoose.Types.ObjectId;
    schemaVersion: number;
}

// Static methods interface
export interface ICommissionTransactionModel extends Model<ICommissionTransaction> {
    findPendingForSalesRep(salesRepId: string, companyId: string): Promise<ICommissionTransaction[]>;
    getTotalCommissionBySalesRep(salesRepId: string, status?: TransactionStatus): Promise<number>;
    findByOrderAndSalesRep(orderId: string, salesRepId: string): Promise<ICommissionTransaction | null>;
}

// Main CommissionTransaction schema
const CommissionTransactionSchema = new Schema<ICommissionTransaction, ICommissionTransactionModel>(
    {
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
        order: {
            type: Schema.Types.ObjectId,
            ref: 'Order',
            required: [true, 'Order is required'],
            index: true,
        },
        commissionRule: {
            type: Schema.Types.ObjectId,
            ref: 'CommissionRule',
            required: [true, 'Commission rule is required'],
        },
        calculatedAmount: {
            type: Number,
            required: [true, 'Calculated amount is required'],
            min: [0, 'Calculated amount cannot be negative'],
        },
        adjustments: [
            {
                type: Schema.Types.ObjectId,
                ref: 'CommissionAdjustment',
            },
        ],
        finalAmount: {
            type: Number,
            required: [true, 'Final amount is required'],
            min: [0, 'Final amount cannot be negative'],
        },
        status: {
            type: String,
            enum: {
                values: ['pending', 'approved', 'rejected', 'paid', 'cancelled'],
                message: '{VALUE} is not a valid status',
            },
            default: 'pending',
            index: true,
        },
        calculatedAt: {
            type: Date,
            default: Date.now,
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
        paidAt: {
            type: Date,
        },
        payoutBatch: {
            type: Schema.Types.ObjectId,
            ref: 'Payout',
        },
        version: {
            type: Number,
            default: 0,
        },
        metadata: {
            type: Schema.Types.Mixed,
        },

        // Soft delete fields
        isDeleted: {
            type: Boolean,
            default: false,
            index: true
        },
        deletedAt: Date,
        deletedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        },
        schemaVersion: {
            type: Number,
            default: 1,
            index: true
        }
    },
    {
        timestamps: true,
        optimisticConcurrency: true, // Enables __v versioning
    }
);

// Pre-find hook to exclude deleted documents by default
CommissionTransactionSchema.pre(/^find/, function (this: mongoose.Query<any, any>, next) {
    if ((this as any)._conditions.isDeleted === undefined) {
        this.where({ isDeleted: false });
    }
    next();
});

// ============================================================================
// INDEXES
// ============================================================================

// Company + status filtering
CommissionTransactionSchema.index({ company: 1, status: 1 });

// Sales rep + status
CommissionTransactionSchema.index({ salesRepresentative: 1, status: 1 });

// Order lookup

// Compound for unique constraint (one transaction per order-salesRep pair)
CommissionTransactionSchema.index({ order: 1, salesRepresentative: 1 }, { unique: true });

// Date-based queries
CommissionTransactionSchema.index({ calculatedAt: -1 });
CommissionTransactionSchema.index({ approvedAt: -1 });
CommissionTransactionSchema.index({ paidAt: -1 });

// Payout batch lookup
CommissionTransactionSchema.index({ payoutBatch: 1 });

// Analytics queries
CommissionTransactionSchema.index({ company: 1, salesRepresentative: 1, status: 1 });

// ============================================================================
// STATIC METHODS
// ============================================================================

/**
 * Find all pending transactions for a sales rep
 */
CommissionTransactionSchema.statics.findPendingForSalesRep = async function (
    salesRepId: string,
    companyId: string
): Promise<ICommissionTransaction[]> {
    return this.find({
        salesRepresentative: new mongoose.Types.ObjectId(salesRepId),
        company: new mongoose.Types.ObjectId(companyId),
        status: 'pending',
    })
        .populate('order', 'orderNumber totals')
        .populate('commissionRule', 'name ruleType')
        .sort({ calculatedAt: -1 })
        .lean();
};

/**
 * Calculate total commission for a sales rep by status
 */
CommissionTransactionSchema.statics.getTotalCommissionBySalesRep = async function (
    salesRepId: string,
    status?: TransactionStatus
): Promise<number> {
    const match: any = {
        salesRepresentative: new mongoose.Types.ObjectId(salesRepId),
    };

    if (status) {
        match.status = status;
    } else {
        // Default: sum approved + paid
        match.status = { $in: ['approved', 'paid'] };
    }

    const result = await this.aggregate([
        { $match: match },
        {
            $group: {
                _id: null,
                total: { $sum: '$finalAmount' },
            },
        },
    ]);

    return result[0]?.total || 0;
};

/**
 * Find transaction by order and sales rep (for idempotency)
 */
CommissionTransactionSchema.statics.findByOrderAndSalesRep = async function (
    orderId: string,
    salesRepId: string
): Promise<ICommissionTransaction | null> {
    return this.findOne({
        order: new mongoose.Types.ObjectId(orderId),
        salesRepresentative: new mongoose.Types.ObjectId(salesRepId),
    });
};

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Pre-save hook for status transitions
 */
CommissionTransactionSchema.pre('save', function (next) {
    // Auto-set timestamps based on status changes
    if (this.isModified('status')) {
        const now = new Date();

        switch (this.status) {
            case 'approved':
                if (!this.approvedAt) this.approvedAt = now;
                break;
            case 'rejected':
                if (!this.rejectedAt) this.rejectedAt = now;
                break;
            case 'paid':
                if (!this.paidAt) this.paidAt = now;
                break;
        }

        // Validate status transitions
        const validTransitions: Record<TransactionStatus, TransactionStatus[]> = {
            pending: ['approved', 'rejected', 'cancelled'],
            approved: ['paid', 'cancelled'],
            rejected: [], // Terminal state
            paid: [], // Terminal state
            cancelled: [], // Terminal state
        };

        const original = this.get('status', null, { getters: false }) as TransactionStatus;
        if (original && !validTransitions[original]?.includes(this.status)) {
            return next(new Error(`Invalid status transition from ${original} to ${this.status}`));
        }
    }

    // Recalculate final amount if adjustments are modified
    if (this.isModified('adjustments') && this.adjustments.length > 0) {
        // This will be recalculated by the service layer
        // Just ensure it's not less than 0
        if (this.finalAmount < 0) {
            this.finalAmount = 0;
        }
    }

    next();
});

/**
 * Post-save hook for cache invalidation
 */
CommissionTransactionSchema.post('save', async function () {
    // Invalidate sales rep performance metrics cache
    const SalesRepresentative = mongoose.model('SalesRepresentative');
    const salesRep = await SalesRepresentative.findById(this.salesRepresentative);
    if (salesRep) {
        // Update performance metrics asynchronously
        salesRep.updatePerformanceMetrics().catch((err: Error) => {
            console.error('Error updating performance metrics:', err);
        });
    }
});

// Create and export the model
const CommissionTransaction = mongoose.model<ICommissionTransaction, ICommissionTransactionModel>(
    'CommissionTransaction',
    CommissionTransactionSchema
);

export default CommissionTransaction;
