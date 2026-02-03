import { Document, Schema, model, Types } from 'mongoose';

/**
 * Failed Webhook Model
 * Audit log for failed webhooks + manual replay support
 */
export interface IFailedWebhook extends Document {
    source: string; // e.g., 'velocity', 'razorpay'
    eventType: string; // e.g., 'SHIPMENT_STATUS_UPDATE', 'payout_processed'
    payload: any;
    headers: any;
    error: string;
    retryCount: number;
    status: 'failed' | 'completed';
    createdAt: Date;
    updatedAt: Date;
}

const FailedWebhookSchema = new Schema<IFailedWebhook>(
    {
        source: { type: String, required: true, index: true },
        eventType: { type: String, required: true },
        payload: { type: Schema.Types.Mixed, required: true },
        headers: { type: Schema.Types.Mixed },
        error: { type: String },
        retryCount: { type: Number, default: 0 },
        status: {
            type: String,
            enum: ['failed', 'completed'],
            default: 'failed',
            index: true
        }
    },
    { timestamps: true }
);

// Index for admin dashboard queries
FailedWebhookSchema.index({ status: 1, createdAt: -1 });

export const FailedWebhook = model<IFailedWebhook>('FailedWebhook', FailedWebhookSchema);
