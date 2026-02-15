import mongoose, { Document, Schema } from 'mongoose';

/**
 * Migration Progress Model
 * 
 * Tracks migration execution progress for resumability.
 * Records last processed document ID and statistics.
 */

export interface IMigrationProgress extends Document {
    migrationName: string;
    phase: string; // e.g., 'phase-1', 'phase-2'
    status: 'pending' | 'running' | 'completed' | 'failed' | 'rolled_back';
    startedAt?: Date;
    completedAt?: Date;
    lastProcessedId?: mongoose.Types.ObjectId;
    totalDocuments: number;
    processedDocuments: number;
    failedDocuments: number;
    skippedDocuments: number;
    batchSize: number;
    dryRun: boolean;
    error?: string;
    metadata?: Record<string, any>;
}

const MigrationProgressSchema = new Schema<IMigrationProgress>({
    migrationName: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    phase: {
        type: String,
        required: true,
        index: true
    },
    status: {
        type: String,
        enum: ['pending', 'running', 'completed', 'failed', 'rolled_back'],
        default: 'pending',
        required: true,
        index: true
    },
    startedAt: Date,
    completedAt: Date,
    lastProcessedId: {
        type: Schema.Types.ObjectId
    },
    totalDocuments: {
        type: Number,
        default: 0,
        min: 0
    },
    processedDocuments: {
        type: Number,
        default: 0,
        min: 0
    },
    failedDocuments: {
        type: Number,
        default: 0,
        min: 0
    },
    skippedDocuments: {
        type: Number,
        default: 0,
        min: 0
    },
    batchSize: {
        type: Number,
        default: 500,
        min: 1
    },
    dryRun: {
        type: Boolean,
        default: false
    },
    error: String,
    metadata: Schema.Types.Mixed
}, {
    timestamps: true,
    collection: 'migration_progress'
});

// Compound index for querying migrations by phase and status
MigrationProgressSchema.index({ phase: 1, status: 1, createdAt: -1 });

// Virtual for progress percentage
MigrationProgressSchema.virtual('progressPercentage').get(function () {
    if (this.totalDocuments === 0) return 0;
    return Math.round((this.processedDocuments / this.totalDocuments) * 100);
});

const MigrationProgress = mongoose.model<IMigrationProgress>('MigrationProgress', MigrationProgressSchema);

export default MigrationProgress;
