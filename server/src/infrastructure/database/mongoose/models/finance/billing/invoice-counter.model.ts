import mongoose, { Document, Schema } from 'mongoose';

/**
 * Invoice Counter Model
 * Transaction-safe sequential invoice numbering per month
 * Pattern: INV-YYYYMM-XXXX (e.g., INV-202601-0001)
 */

export interface IInvoiceCounter extends Document {
    year: number;
    month: number;
    sequence: number;
    createdAt: Date;
    updatedAt: Date;
}

const InvoiceCounterSchema = new Schema<IInvoiceCounter>(
    {
        year: {
            type: Number,
            required: true,
        },
        month: {
            type: Number,
            required: true,
            min: 1,
            max: 12,
        },
        sequence: {
            type: Number,
            required: true,
            default: 0,
        },
    },
    {
        timestamps: true,
    }
);

// Compound unique index for year + month
InvoiceCounterSchema.index({ year: 1, month: 1 }, { unique: true });

const InvoiceCounter = mongoose.model<IInvoiceCounter>('InvoiceCounter', InvoiceCounterSchema);
export default InvoiceCounter;
