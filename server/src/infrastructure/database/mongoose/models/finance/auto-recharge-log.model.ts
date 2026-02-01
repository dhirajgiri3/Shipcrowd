import mongoose, { Schema, Document } from 'mongoose';

export interface IAutoRechargeLog extends Document {
    companyId: mongoose.Types.ObjectId;
    amount: number;
    status: 'pending' | 'success' | 'failed' | 'cancelled';
    idempotencyKey: string;
    paymentId?: string;
    razorpayOrderId?: string;
    failureReason?: string;
    retriedCount: number;
    triggeredAt: Date;
    completedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const AutoRechargeLogSchema = new Schema<IAutoRechargeLog>(
    {
        companyId: {
            type: Schema.Types.ObjectId,
            ref: 'Company',
            required: true,
            index: true
        },
        amount: {
            type: Number,
            required: true,
            min: 0
        },
        status: {
            type: String,
            enum: ['pending', 'success', 'failed', 'cancelled'],
            required: true,
            default: 'pending',
            index: true
        },
        idempotencyKey: {
            type: String,
            required: true,
            unique: true,
            index: true
        },
        paymentId: {
            type: String,
            trim: true
        },
        razorpayOrderId: {
            type: String,
            trim: true
        },
        failureReason: {
            type: String
        },
        retriedCount: {
            type: Number,
            default: 0
        },
        triggeredAt: {
            type: Date,
            default: Date.now,
            index: true
        },
        completedAt: {
            type: Date
        }
    },
    {
        timestamps: true,
        collection: 'auto_recharge_logs' // Explicit collection name
    }
);

// Indexes for common admin queries
AutoRechargeLogSchema.index({ companyId: 1, status: 1 });
AutoRechargeLogSchema.index({ createdAt: -1 }); // Recently logs

export const AutoRechargeLog = mongoose.model<IAutoRechargeLog>('AutoRechargeLog', AutoRechargeLogSchema);
