import mongoose, { Document, Schema } from 'mongoose';

/**
 * TourCompletion Model
 * Tracks user interaction with product tours
 */

export interface ITourCompletion extends Document {
    _id: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    companyId: mongoose.Types.ObjectId;
    tourId: mongoose.Types.ObjectId; // Reference to ProductTour
    tourIdentifier: string; // String ID for easier querying

    status: 'started' | 'completed' | 'skipped' | 'dismissed';
    currentStepIndex: number;

    startedAt: Date;
    completedAt?: Date;
    lastInteractionAt: Date;

    createdAt: Date;
    updatedAt: Date;
}

const TourCompletionSchema = new Schema<ITourCompletion>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },
        companyId: {
            type: Schema.Types.ObjectId,
            ref: 'Company',
            required: true,
            index: true
        },
        tourId: {
            type: Schema.Types.ObjectId,
            ref: 'ProductTour',
            required: true
        },
        tourIdentifier: {
            type: String,
            required: true,
            index: true
        },
        status: {
            type: String,
            enum: ['started', 'completed', 'skipped', 'dismissed'],
            default: 'started'
        },
        currentStepIndex: {
            type: Number,
            default: 0
        },
        startedAt: {
            type: Date,
            default: Date.now
        },
        completedAt: Date,
        lastInteractionAt: {
            type: Date,
            default: Date.now
        }
    },
    {
        timestamps: true
    }
);

// Indexes
TourCompletionSchema.index({ userId: 1, tourIdentifier: 1 }, { unique: true });

const TourCompletion = mongoose.model<ITourCompletion>('TourCompletion', TourCompletionSchema);

export default TourCompletion;
