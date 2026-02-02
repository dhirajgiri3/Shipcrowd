import mongoose, { Schema, Document } from 'mongoose';

export interface ISyncLog extends Document {
    companyId: string;
    storeId: string;
    integrationType: 'SHOPIFY' | 'WOOCOMMERCE' | 'AMAZON' | 'FLIPKART';
    syncType: 'ORDER' | 'INVENTORY' | 'PRODUCT';
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
    completeSyncWithErrors(stats: { itemsSynced: number; itemsFailed: number; syncErrors: any[] }): Promise<void>;
}

const SyncLogSchema: Schema = new Schema({
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    storeId: { type: Schema.Types.ObjectId, required: true },
    integrationType: {
        type: String,
        enum: ['SHOPIFY', 'WOOCOMMERCE', 'AMAZON', 'FLIPKART'],
        required: true
    },
    syncType: {
        type: String,
        enum: ['ORDER', 'INVENTORY', 'PRODUCT'],
        default: 'ORDER'
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


// Method: Complete sync with errors
SyncLogSchema.methods.completeSyncWithErrors = async function (stats: {
    itemsSynced: number;
    itemsFailed: number;
    syncErrors: any[];
}): Promise<void> {
    this.status = stats.itemsFailed > 0
        ? (stats.itemsSynced > 0 ? 'PARTIAL_SUCCESS' : 'FAILED')
        : 'SUCCESS';

    this.completedAt = new Date();
    this.durationMs = this.completedAt.getTime() - this.startedAt.getTime();

    // Map stats based on sync type (assuming inventory maps to productsProcessed for now or create generic itemsProcessed)
    // The previous code mapped to ordersProcessed/Success/Failed. 
    // Since this is generic, we might need generic fields or mapping.
    // For INVENTORY sync, let's map to productsProcessed

    if (this.syncType === 'INVENTORY' || this.syncType === 'PRODUCT') {
        this.productsProccessed = stats.itemsSynced + stats.itemsFailed;
        // We don't have separate productSuccess/Failed fields in schema yet, 
        // so we just track total processed. 
        // Or we should add them? 
        // For now, let's rely on the details for specifics.
    } else {
        this.ordersProcessed = stats.itemsSynced + stats.itemsFailed;
        this.ordersSuccess = stats.itemsSynced;
        this.ordersFailed = stats.itemsFailed;
    }

    if (stats.syncErrors && stats.syncErrors.length > 0) {
        this.details = {
            ...this.details,
            errors: stats.syncErrors,
            message: `${stats.itemsFailed} items failed to sync`
        };
    } else {
        this.details = {
            ...this.details,
            message: 'Sync completed successfully'
        };
    }

    await this.save();
};

// Indexes for faster querying
SyncLogSchema.index({ companyId: 1, storeId: 1, createdAt: -1 });
SyncLogSchema.index({ storeId: 1, status: 1 });

export const SyncLog = mongoose.model<ISyncLog>('SyncLog', SyncLogSchema);
