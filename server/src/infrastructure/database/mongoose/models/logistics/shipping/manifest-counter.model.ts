import mongoose, { Document, Schema } from 'mongoose';

/**
 * Manifest Counter Model
 * Transaction-safe sequential numbering for manifests
 * 
 * Format: MAN-YYYYMM-XXXX
 * Example: MAN-202601-0001
 * 
 * Uses MongoDB's findAndModify for atomic increments
 */

export interface IManifestCounter extends Document {
    year: number;
    month: number;
    sequence: number;
    createdAt: Date;
    updatedAt: Date;
}

const ManifestCounterSchema = new Schema<IManifestCounter>(
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

// Compound unique index ensures one counter per year-month
ManifestCounterSchema.index({ year: 1, month: 1 }, { unique: true });

const ManifestCounter = mongoose.model<IManifestCounter>(
    'ManifestCounter',
    ManifestCounterSchema
);

export default ManifestCounter;
