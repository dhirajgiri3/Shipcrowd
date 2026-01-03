import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * WalletTransaction Model
 *
 * Tracks all wallet transactions for audit trail.
 * Every credit/debit operation creates a transaction record.
 */

export type TransactionType = 'credit' | 'debit' | 'refund' | 'adjustment';
export type TransactionReason =
    | 'rto_charge'
    | 'shipping_cost'
    | 'recharge'
    | 'refund'
    | 'cod_remittance'
    | 'adjustment'
    | 'promotional_credit'
    | 'weight_discrepancy'
    | 'other';

export interface IWalletTransaction extends Document {
    company: mongoose.Types.ObjectId;
    type: TransactionType;
    amount: number;
    balanceBefore: number;
    balanceAfter: number;
    reason: TransactionReason;
    description: string;
    reference?: {
        type: 'rto_event' | 'shipment' | 'payment' | 'order' | 'manual';
        id?: mongoose.Types.ObjectId;
        externalId?: string;
    };
    createdBy: string; // 'system' or userId
    metadata?: Record<string, any>;
    status: 'pending' | 'completed' | 'failed' | 'reversed';
    reversedBy?: mongoose.Types.ObjectId;
    reversedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

interface IWalletTransactionModel extends Model<IWalletTransaction> {
    getTransactionHistory(
        companyId: string,
        options?: {
            startDate?: Date;
            endDate?: Date;
            type?: TransactionType;
            reason?: TransactionReason;
            limit?: number;
            offset?: number;
        }
    ): Promise<{ transactions: IWalletTransaction[]; total: number }>;

    getBalanceAtDate(companyId: string, date: Date): Promise<number>;
}

const WalletTransactionSchema = new Schema<IWalletTransaction>(
    {
        company: {
            type: Schema.Types.ObjectId,
            ref: 'Company',
            required: true,
            index: true,
        },
        type: {
            type: String,
            enum: ['credit', 'debit', 'refund', 'adjustment'],
            required: true,
        },
        amount: {
            type: Number,
            required: true,
            min: [0.01, 'Transaction amount must be positive'],
        },
        balanceBefore: {
            type: Number,
            required: true,
        },
        balanceAfter: {
            type: Number,
            required: true,
        },
        reason: {
            type: String,
            enum: [
                'rto_charge',
                'shipping_cost',
                'recharge',
                'refund',
                'cod_remittance',
                'adjustment',
                'promotional_credit',
                'weight_discrepancy',
                'other',
            ],
            required: true,
        },
        description: {
            type: String,
            required: true,
            maxlength: 500,
        },
        reference: {
            type: {
                type: String,
                enum: ['rto_event', 'shipment', 'payment', 'order', 'manual'],
            },
            id: {
                type: Schema.Types.ObjectId,
            },
            externalId: String,
        },
        createdBy: {
            type: String,
            required: true,
            default: 'system',
        },
        metadata: {
            type: Schema.Types.Mixed,
        },
        status: {
            type: String,
            enum: ['pending', 'completed', 'failed', 'reversed'],
            default: 'completed',
        },
        reversedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
        reversedAt: Date,
    },
    {
        timestamps: true,
        collection: 'wallet_transactions',
    }
);

// Indexes for efficient queries
WalletTransactionSchema.index({ company: 1, createdAt: -1 });
WalletTransactionSchema.index({ company: 1, type: 1 });
WalletTransactionSchema.index({ company: 1, reason: 1 });
WalletTransactionSchema.index({ 'reference.type': 1, 'reference.id': 1 });
// Index for refund queries (Issue #22)
WalletTransactionSchema.index({ company: 1, status: 1, 'reference.id': 1 });
// Index for audit trail queries (reversed transactions)
WalletTransactionSchema.index({ reversedAt: -1 });

// Static: Get transaction history with pagination
WalletTransactionSchema.statics.getTransactionHistory = async function (
    companyId: string,
    options: {
        startDate?: Date;
        endDate?: Date;
        type?: TransactionType;
        reason?: TransactionReason;
        limit?: number;
        offset?: number;
    } = {}
): Promise<{ transactions: IWalletTransaction[]; total: number }> {
    const { startDate, endDate, type, reason, limit = 50, offset = 0 } = options;

    const filter: any = { company: companyId, status: 'completed' };

    if (startDate || endDate) {
        filter.createdAt = {};
        if (startDate) filter.createdAt.$gte = startDate;
        if (endDate) filter.createdAt.$lte = endDate;
    }

    if (type) filter.type = type;
    if (reason) filter.reason = reason;

    const [transactions, total] = await Promise.all([
        this.find(filter)
            .sort({ createdAt: -1 })
            .skip(offset)
            .limit(limit),
        this.countDocuments(filter),
    ]);

    return { transactions, total };
};

// Static: Get balance at a specific date
WalletTransactionSchema.statics.getBalanceAtDate = async function (
    companyId: string,
    date: Date
): Promise<number> {
    const lastTransaction = await this.findOne({
        company: companyId,
        createdAt: { $lte: date },
        status: 'completed',
    })
        .sort({ createdAt: -1 })
        .select('balanceAfter');

    return lastTransaction?.balanceAfter || 0;
};

const WalletTransaction = mongoose.model<IWalletTransaction, IWalletTransactionModel>(
    'WalletTransaction',
    WalletTransactionSchema
);

export default WalletTransaction;
