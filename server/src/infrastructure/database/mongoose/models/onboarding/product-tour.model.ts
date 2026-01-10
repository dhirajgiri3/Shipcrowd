import mongoose, { Document, Schema } from 'mongoose';

/**
 * ProductTour Model
 * Definitions for interactive product walkthroughs
 */

export interface ITourStep {
    target: string;        // CSS selector or element ID
    title: string;
    description: string;
    placement: 'top' | 'bottom' | 'left' | 'right' | 'center';
    ctaText?: string;
    ctaAction?: string;    // URL or action handler
    image?: string;
    video?: string;
}

export interface IProductTour extends Document {
    _id: mongoose.Types.ObjectId;
    tourId: string;        // Unique string ID for reference
    name: string;
    description: string;
    targetRoles: string[]; // admin, seller, staff
    triggerType: 'auto' | 'manual' | 'milestone';
    triggerCondition?: string; // e.g., 'first_visit', 'kyc_pending'

    steps: ITourStep[];
    completionReward: number; // Points awarded for completion
    isActive: boolean;
    version: string;

    createdAt: Date;
    updatedAt: Date;
}

const TourStepSchema = new Schema<ITourStep>({
    target: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    placement: {
        type: String,
        enum: ['top', 'bottom', 'left', 'right', 'center'],
        default: 'bottom'
    },
    ctaText: String,
    ctaAction: String,
    image: String,
    video: String
}, { _id: false });

const ProductTourSchema = new Schema<IProductTour>(
    {
        tourId: {
            type: String,
            required: true,
            unique: true,
            index: true
        },
        name: {
            type: String,
            required: true
        },
        description: String,
        targetRoles: {
            type: [String],
            default: ['seller']
        },
        triggerType: {
            type: String,
            enum: ['auto', 'manual', 'milestone'],
            default: 'manual'
        },
        triggerCondition: String,

        steps: [TourStepSchema],

        completionReward: {
            type: Number,
            default: 0
        },
        isActive: {
            type: Boolean,
            default: true
        },
        version: {
            type: String,
            default: '1.0'
        }
    },
    {
        timestamps: true
    }
);

const ProductTour = mongoose.model<IProductTour>('ProductTour', ProductTourSchema);

export default ProductTour;
