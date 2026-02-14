import mongoose, { Schema } from 'mongoose';

export interface IBulkOrderImportJob {
    jobId: string;                          // BullMQ job ID
    companyId: mongoose.Types.ObjectId;     // Company ownership
    userId: mongoose.Types.ObjectId;        // User who initiated
    fileName: string;                       // Original file name
    fileSize: number;                       // File size in bytes
    totalRows: number;                      // Total rows in file
    processedRows: number;                  // Rows processed so far
    successCount: number;                   // Successfully created orders
    errorCount: number;                     // Failed rows
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
    progress: number;                       // Progress percentage (0-100)
    errors: Array<{
        row: number;
        error: string;
        data?: any;
    }>;                                     // Per-row errors
    created: Array<{
        orderNumber: string;
        id: string;
    }>;                                     // Successfully created orders
    startedAt?: Date;                       // When processing started
    completedAt?: Date;                     // When processing finished
    errorMessage?: string;                  // Overall error message (if job failed)
    metadata?: {
        batchSize?: number;
        batchesProcessed?: number;
        totalBatches?: number;
    };
    createdAt: Date;                        // Mongoose timestamps
    updatedAt: Date;                        // Mongoose timestamps
}

const BulkOrderImportJobSchema = new Schema<IBulkOrderImportJob>(
    {
        jobId: { type: String, required: true, unique: true, index: true },
        companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        fileName: { type: String, required: true },
        fileSize: { type: Number, required: true },
        totalRows: { type: Number, required: true },
        processedRows: { type: Number, default: 0 },
        successCount: { type: Number, default: 0 },
        errorCount: { type: Number, default: 0 },
        status: {
            type: String,
            enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
            default: 'pending',
            required: true,
            index: true
        },
        progress: { type: Number, default: 0, min: 0, max: 100 },
        errors: [{
            row: { type: Number, required: true },
            error: { type: String, required: true },
            data: { type: Schema.Types.Mixed }
        }],
        created: [{
            orderNumber: { type: String, required: true },
            id: { type: String, required: true }
        }],
        startedAt: { type: Date },
        completedAt: { type: Date },
        errorMessage: { type: String },
        metadata: {
            batchSize: { type: Number },
            batchesProcessed: { type: Number },
            totalBatches: { type: Number }
        }
    },
    {
        timestamps: true,
        collection: 'bulk_order_import_jobs'
    }
);

// Compound index for user queries (most recent first)
BulkOrderImportJobSchema.index({ companyId: 1, createdAt: -1 });
BulkOrderImportJobSchema.index({ userId: 1, createdAt: -1 });

// Index for finding active/pending jobs
BulkOrderImportJobSchema.index({ status: 1, createdAt: -1 });

export const BulkOrderImportJob = mongoose.model<IBulkOrderImportJob>('BulkOrderImportJob', BulkOrderImportJobSchema);
