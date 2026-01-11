import mongoose, { Document, Schema } from 'mongoose';

/**
 * OnboardingProgress Model
 * Tracks user's progress through onboarding milestones
 */

export interface IOnboardingStep {
    completed: boolean;
    completedAt?: Date;
    skipped?: boolean;
}

export interface IOnboardingProgress extends Document {
    _id: mongoose.Types.ObjectId;
    companyId?: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;

    steps: {
        emailVerified: IOnboardingStep;
        kycSubmitted: IOnboardingStep;
        kycApproved: IOnboardingStep;
        // ✅ FEATURE 6: New Onboarding Steps
        billingSetup: IOnboardingStep;
        courierPreferencesSet: IOnboardingStep;
        warehouseCreated: IOnboardingStep;
        testShipmentCreated: IOnboardingStep;

        // ✅ FEATURE 6.1: Missing Critical Steps
        returnAddressConfigured: IOnboardingStep;
        packagingPreferencesSet: IOnboardingStep;
        rateCardAgreed: IOnboardingStep;
        platformTourCompleted: IOnboardingStep;

        // End new steps
        // End new steps
        firstOrderCreated: IOnboardingStep;
        walletRecharged: IOnboardingStep;
        demoDataCleared: IOnboardingStep;
    };

    completionPercentage: number;
    currentStep: string;
    isComplete: boolean;

    // Metadata
    startedAt: Date;
    completedAt?: Date;
    lastUpdatedAt: Date;

    createdAt: Date;
    updatedAt: Date;

    // Methods
    calculateProgress(): number;
    getCurrentStep(): string;
}

const OnboardingStepSchema = new Schema<IOnboardingStep>({
    completed: {
        type: Boolean,
        default: false
    },
    completedAt: Date,
    skipped: {
        type: Boolean,
        default: false
    }
}, { _id: false });

const OnboardingProgressSchema = new Schema<IOnboardingProgress>(
    {
        companyId: {
            type: Schema.Types.ObjectId,
            ref: 'Company',
            required: false,
            index: true
        },
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },
        steps: {
            emailVerified: {
                type: OnboardingStepSchema,
                default: () => ({ completed: false })
            },
            kycSubmitted: {
                type: OnboardingStepSchema,
                default: () => ({ completed: false })
            },
            kycApproved: {
                type: OnboardingStepSchema,
                default: () => ({ completed: false })
            },
            // ✅ FEATURE 6: New Steps Schema
            billingSetup: {
                type: OnboardingStepSchema,
                default: () => ({ completed: false })
            },
            courierPreferencesSet: {
                type: OnboardingStepSchema,
                default: () => ({ completed: false })
            },
            warehouseCreated: {
                type: OnboardingStepSchema,
                default: () => ({ completed: false })
            },
            // ✅ FEATURE 6.1: Missing Critical Steps
            returnAddressConfigured: {
                type: OnboardingStepSchema,
                default: () => ({ completed: false })
            },
            packagingPreferencesSet: {
                type: OnboardingStepSchema,
                default: () => ({ completed: false })
            },
            rateCardAgreed: {
                type: OnboardingStepSchema,
                default: () => ({ completed: false })
            },
            platformTourCompleted: {
                type: OnboardingStepSchema,
                default: () => ({ completed: false })
            },
            testShipmentCreated: {
                type: OnboardingStepSchema,
                default: () => ({ completed: false })
            },
            firstOrderCreated: {
                type: OnboardingStepSchema,
                default: () => ({ completed: false })
            },
            walletRecharged: {
                type: OnboardingStepSchema,
                default: () => ({ completed: false })
            },
            demoDataCleared: {
                type: OnboardingStepSchema,
                default: () => ({ completed: false })
            }
        },
        completionPercentage: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        },
        currentStep: {
            type: String,
            default: 'Verify Email'
        },
        isComplete: {
            type: Boolean,
            default: false
        },
        startedAt: {
            type: Date,
            default: Date.now
        },
        completedAt: Date,
        lastUpdatedAt: {
            type: Date,
            default: Date.now
        }
    },
    {
        timestamps: true
    }
);

// Indexes
OnboardingProgressSchema.index({ companyId: 1, userId: 1 }, { unique: true });
OnboardingProgressSchema.index({ completionPercentage: 1 });
OnboardingProgressSchema.index({ isComplete: 1 });

// Methods
OnboardingProgressSchema.methods.calculateProgress = function (): number {
    const stepWeights = {
        emailVerified: 5, // Reduced from 10
        kycSubmitted: 10,
        kycApproved: 15,
        billingSetup: 10,
        courierPreferencesSet: 10,
        warehouseCreated: 5, // Reduced from 10
        testShipmentCreated: 5, // Reduced from 10
        firstOrderCreated: 15,
        walletRecharged: 5,
        demoDataCleared: 0, // Made truly optional (0 points) but tracked

        // New Steps
        returnAddressConfigured: 5,
        packagingPreferencesSet: 5,
        rateCardAgreed: 5,
        platformTourCompleted: 5
    };

    let totalProgress = 0;

    Object.keys(stepWeights).forEach(stepKey => {
        if (this.steps[stepKey as keyof typeof this.steps]?.completed) {
            totalProgress += stepWeights[stepKey as keyof typeof stepWeights];
        }
    });

    return Math.min(totalProgress, 100);
};

OnboardingProgressSchema.methods.getCurrentStep = function (): string {
    if (!this.steps.emailVerified.completed) return 'Verify Email';
    if (!this.steps.kycSubmitted.completed) return 'Submit KYC Documents';
    if (!this.steps.kycApproved.completed) return 'Awaiting KYC Approval';

    // New Steps Logic
    if (!this.steps.billingSetup.completed) return 'Setup Billing';
    if (!this.steps.rateCardAgreed.completed) return 'Accept Rate Card';
    if (!this.steps.returnAddressConfigured.completed) return 'Setup Return Address';
    if (!this.steps.courierPreferencesSet.completed) return 'Configure Couriers';
    if (!this.steps.packagingPreferencesSet.completed) return 'Setup Packaging';
    if (!this.steps.warehouseCreated.completed) return 'Add Pickup Location';

    if (!this.steps.platformTourCompleted.completed) return 'Take Platform Tour';
    if (!this.steps.testShipmentCreated.completed) return 'Create Test Shipment';

    if (!this.steps.firstOrderCreated.completed) return 'Create First Order';
    if (!this.steps.walletRecharged.completed) return 'Recharge Wallet (Optional)';

    return 'Onboarding Complete! 🎉';
};

// Pre-save hook to update calculated fields
OnboardingProgressSchema.pre('save', function (next) {
    this.completionPercentage = this.calculateProgress();
    this.currentStep = this.getCurrentStep();
    this.isComplete = this.completionPercentage === 100;
    this.lastUpdatedAt = new Date();

    if (this.isComplete && !this.completedAt) {
        this.completedAt = new Date();
    }

    next();
});

const OnboardingProgress = mongoose.model<IOnboardingProgress>(
    'OnboardingProgress',
    OnboardingProgressSchema
);

export default OnboardingProgress;
