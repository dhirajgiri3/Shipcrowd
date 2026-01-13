import mongoose, { Document, Schema } from 'mongoose';

/**
 * Invoice IRN Log Model
 * Audit trail for all IRN (Invoice Reference Number) API interactions with GSTN IRP
 * Tracks generation, cancellation, and status check requests for compliance and debugging
 */

export interface IInvoiceIRNLog extends Document {
    invoiceId: mongoose.Types.ObjectId;
    action: 'generate' | 'cancel' | 'get_status';

    requestPayload: Record<string, any>; // Full request sent to GSTN
    responsePayload?: Record<string, any>; // Response received from GSTN

    status: 'success' | 'failed';
    errorCode?: string; // GSTN error code (e.g., "2150", "2151")
    errorMessage?: string; // Human-readable error message

    attemptNumber: number; // Retry attempt number (1 for first attempt)
    responseTimeMs: number; // API response time in milliseconds

    createdAt: Date;
}

const InvoiceIRNLogSchema = new Schema<IInvoiceIRNLog>(
    {
        invoiceId: {
            type: Schema.Types.ObjectId,
            ref: 'Invoice',
            required: true,
            index: true,
        },
        action: {
            type: String,
            enum: ['generate', 'cancel', 'get_status'],
            required: true,
        },
        requestPayload: {
            type: Schema.Types.Mixed,
            required: true,
        },
        responsePayload: {
            type: Schema.Types.Mixed,
        },
        status: {
            type: String,
            enum: ['success', 'failed'],
            required: true,
            index: true,
        },
        errorCode: String,
        errorMessage: String,
        attemptNumber: {
            type: Number,
            required: true,
            default: 1,
            min: 1,
        },
        responseTimeMs: {
            type: Number,
            required: true,
            min: 0,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes for efficient querying
InvoiceIRNLogSchema.index({ invoiceId: 1, createdAt: -1 });
InvoiceIRNLogSchema.index({ status: 1, createdAt: -1 });
InvoiceIRNLogSchema.index({ action: 1, status: 1 });

const InvoiceIRNLog = mongoose.model<IInvoiceIRNLog>('InvoiceIRNLog', InvoiceIRNLogSchema);
export default InvoiceIRNLog;
