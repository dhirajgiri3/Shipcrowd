import mongoose, { Document, Schema } from 'mongoose';

/**
 * Reconciliation Report Model
 * 
 * Stores the results of automated reconciliation processes between
 * internal COD Remittances and external courier reports (e.g., Velocity).
 */

export interface IReconciliationReport extends Document {
    companyId: mongoose.Types.ObjectId;
    type: 'cod_remittance' | 'wallet' | 'invoice';
    status: 'draft' | 'processing' | 'completed' | 'failed';

    // Period covered
    period: {
        start: Date;
        end: Date;
    };

    // File Details (if applicable)
    sourceFile?: {
        url: string;
        name: string;
        uploadedAt: Date;
    };

    // Summary Statistics
    summary: {
        totalRecords: number;
        matchedCount: number;
        mismatchCount: number;
        notFoundCount: number;
        totalAmount: number;
        discrepancyAmount: number;
    };

    // Detailed Discrepancies (capped or referenced)
    discrepancies: Array<{
        referenceId: string; // e.g., AWB or Transaction ID
        description: string;
        systemAmount: number;
        externalAmount: number;
        status: 'pending' | 'resolved' | 'ignored';
        resolutionNotes?: string;
    }>;

    generatedAt: Date;
    generatedBy: string | 'system';
}

const ReconciliationReportSchema = new Schema<IReconciliationReport>({
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    type: {
        type: String,
        enum: ['cod_remittance', 'wallet', 'invoice'],
        required: true
    },
    status: {
        type: String,
        enum: ['draft', 'processing', 'completed', 'failed'],
        default: 'draft'
    },
    period: {
        start: { type: Date, required: true },
        end: { type: Date, required: true }
    },
    sourceFile: {
        url: String,
        name: String,
        uploadedAt: Date
    },
    summary: {
        totalRecords: { type: Number, default: 0 },
        matchedCount: { type: Number, default: 0 },
        mismatchCount: { type: Number, default: 0 },
        notFoundCount: { type: Number, default: 0 },
        totalAmount: { type: Number, default: 0 },
        discrepancyAmount: { type: Number, default: 0 }
    },
    discrepancies: [{
        referenceId: { type: String, required: true },
        description: String,
        systemAmount: Number,
        externalAmount: Number,
        status: {
            type: String,
            enum: ['pending', 'resolved', 'ignored'],
            default: 'pending'
        },
        resolutionNotes: String
    }],
    generatedAt: { type: Date, default: Date.now },
    generatedBy: { type: String, default: 'system' }
}, {
    timestamps: true
});

// Indexes
ReconciliationReportSchema.index({ companyId: 1, type: 1, createdAt: -1 });
ReconciliationReportSchema.index({ generatedAt: -1 });

export default mongoose.model<IReconciliationReport>('ReconciliationReport', ReconciliationReportSchema);
