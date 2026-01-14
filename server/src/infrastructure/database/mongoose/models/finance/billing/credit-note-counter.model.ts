import mongoose, { Document, Schema } from 'mongoose';

/**
 * Credit Note Counter Model
 * Transaction-safe sequential numbering for credit notes
 * Format: CN-YYYYMM-XXXX
 */

export interface ICreditNoteCounter extends Document {
    year: number;
    month: number;
    sequence: number;
}

const CreditNoteCounterSchema = new Schema<ICreditNoteCounter>(
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

// Compound index for year-month uniqueness
CreditNoteCounterSchema.index({ year: 1, month: 1 }, { unique: true });

const CreditNoteCounter = mongoose.model<ICreditNoteCounter>('CreditNoteCounter', CreditNoteCounterSchema);
export default CreditNoteCounter;
