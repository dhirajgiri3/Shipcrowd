import mongoose, { Schema, Document } from 'mongoose';

export interface ISyncLog extends Document {
    companyId: string;
    storeId: string;
    integrationType: 'SHOPIFY' | 'WOOCOMMERCE' | 'AMAZON' | 'FLIPKART';
    triggerType: 'MANUAL' | 'SCHEDULED' | 'WEBHOOK';
    status: 'IN_PROGRESS' | 'SUCCESS' | 'PARTIAL_SUCCESS' | 'FAILED';
    startedAt: Date;
    completedAt?: Date;
    durationMs?: number;
    ordersProcessed: number;
    ordersSuccess: number;
    ordersFailed: number;
    productsProccessed: number; // Intentional typo matching existing codebase if any, otherwise 'productsProcessed'
    details: {
        message?: string;
        errors?: any[];
        warnings?: any[];
    };
}

const SyncLogSchema: Schema = new Schema({
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    storeId: { type: Schema.Types.ObjectId, required: true },
    integrationType: {
        type: String,
        enum: ['SHOPIFY', 'WOOCOMMERCE', 'AMAZON', 'FLIPKART'],
        required: true
    },
    triggerType: {
        type: String,
        enum: ['MANUAL', 'SCHEDULED', 'WEBHOOK'],
        default: 'MANUAL'
    },
    status: {
        type: String,
        enum: ['IN_PROGRESS', 'SUCCESS', 'PARTIAL_SUCCESS', 'FAILED'],
        default: 'IN_PROGRESS'
    },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
    durationMs: { type: Number },
    ordersProcessed: { type: Number, default: 0 },
    ordersSuccess: { type: Number, default: 0 },
    ordersFailed: { type: Number, default: 0 },
    productsProccessed: { type: Number, default: 0 },
    details: {
        message: String,
        errors: [Schema.Types.Mixed],
        warnings: [Schema.Types.Mixed]
    }
}, {
    timestamps: true
});

// Indexes for faster querying
SyncLogSchema.index({ companyId: 1, storeId: 1, createdAt: -1 });
SyncLogSchema.index({ storeId: 1, status: 1 });

export const SyncLog = mongoose.model<ISyncLog>('SyncLog', SyncLogSchema);
