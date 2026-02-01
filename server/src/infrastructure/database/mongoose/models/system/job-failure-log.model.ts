import mongoose, { Schema, Document } from 'mongoose';

export interface IJobFailureLog extends Document {
    jobId: string;
    queueName: string;
    jobName: string;
    data: any;
    error: string;
    stackTrace?: string;
    attemptsMade: number;
    failedAt: Date;
    status: 'open' | 'resolved' | 'ignored';
    resolutionNotes?: string;
    resolvedBy?: mongoose.Types.ObjectId;
    resolvedAt?: Date;
}

const JobFailureLogSchema = new Schema<IJobFailureLog>(
    {
        jobId: { type: String, required: true, index: true },
        queueName: { type: String, required: true, index: true },
        jobName: { type: String, required: true },
        data: { type: Schema.Types.Mixed },
        error: { type: String, required: true },
        stackTrace: { type: String },
        attemptsMade: { type: Number, default: 0 },
        failedAt: { type: Date, default: Date.now, index: true },
        status: {
            type: String,
            enum: ['open', 'resolved', 'ignored'],
            default: 'open',
            index: true
        },
        resolutionNotes: { type: String },
        resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        resolvedAt: { type: Date }
    },
    {
        timestamps: true,
        collection: 'job_failure_logs'
    }
);

// Index for finding recent failures
JobFailureLogSchema.index({ failedAt: -1 });

export default mongoose.model<IJobFailureLog>('JobFailureLog', JobFailureLogSchema);
