import mongoose, { Document, Schema } from 'mongoose';

/**
 * Feature Flag Model
 * Enables safe feature rollouts, A/B testing, and dynamic configuration
 */
export interface IFeatureFlag extends Document {
    key: string; // Unique identifier (e.g., 'smart_rate_calculator')
    name: string; // Human-readable name
    description: string;
    isEnabled: boolean; // Global on/off switch
    type: 'boolean' | 'percentage' | 'list' | 'json'; // Flag type
    value?: any; // Default value for non-boolean flags

    // Targeting rules
    rules: Array<{
        id: string;
        name: string;
        enabled: boolean;
        conditions: Array<{
            attribute: 'userId' | 'companyId' | 'role' | 'email' | 'custom';
            operator: 'equals' | 'not_equals' | 'contains' | 'in' | 'not_in' | 'greater_than' | 'less_than';
            value: any;
        }>;
        value: any; // Value to return if conditions match
    }>;

    // Percentage rollout (for gradual releases)
    rolloutPercentage?: number; // 0-100
    rolloutAttribute?: 'userId' | 'companyId'; // Which attribute to hash for percentage

    // Environment-specific
    environments?: {
        development?: boolean;
        sandbox?: boolean;
        production?: boolean;
    };

    // Metadata
    category?: 'feature' | 'experiment' | 'ops' | 'billing';
    tags?: string[];
    createdBy: mongoose.Types.ObjectId;
    updatedBy?: mongoose.Types.ObjectId;

    // Audit
    evaluationCount?: number;
    lastEvaluatedAt?: Date;

    // Lifecycle
    startDate?: Date; // When to enable
    endDate?: Date; // When to disable
    isArchived: boolean;

    createdAt: Date;
    updatedAt: Date;
}

const FeatureFlagSchema = new Schema<IFeatureFlag>(
    {
        key: {
            type: String,
            required: true,
            unique: true,
            index: true,
            trim: true,
            lowercase: true,
        },
        name: {
            type: String,
            required: true,
        },
        description: {
            type: String,
            required: true,
        },
        isEnabled: {
            type: Boolean,
            default: false,
            index: true,
        },
        type: {
            type: String,
            enum: ['boolean', 'percentage', 'list', 'json'],
            default: 'boolean',
        },
        value: Schema.Types.Mixed,
        rules: [
            {
                id: {
                    type: String,
                    required: true,
                },
                name: String,
                enabled: {
                    type: Boolean,
                    default: true,
                },
                conditions: [
                    {
                        attribute: {
                            type: String,
                            enum: ['userId', 'companyId', 'role', 'email', 'custom'],
                            required: true,
                        },
                        operator: {
                            type: String,
                            enum: ['equals', 'not_equals', 'contains', 'in', 'not_in', 'greater_than', 'less_than'],
                            required: true,
                        },
                        value: Schema.Types.Mixed,
                    },
                ],
                value: Schema.Types.Mixed,
            },
        ],
        rolloutPercentage: {
            type: Number,
            min: 0,
            max: 100,
        },
        rolloutAttribute: {
            type: String,
            enum: ['userId', 'companyId'],
        },
        environments: {
            development: Boolean,
            sandbox: Boolean,
            production: Boolean,
        },
        category: {
            type: String,
            enum: ['feature', 'experiment', 'ops', 'billing'],
            default: 'feature',
        },
        tags: [String],
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        updatedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
        evaluationCount: {
            type: Number,
            default: 0,
        },
        lastEvaluatedAt: Date,
        startDate: Date,
        endDate: Date,
        isArchived: {
            type: Boolean,
            default: false,
            index: true,
        },
    },
    {
        timestamps: true,
    }
);

// Compound indexes for efficient queries
FeatureFlagSchema.index({ isEnabled: 1, isArchived: 1 });
FeatureFlagSchema.index({ category: 1, isEnabled: 1 });
FeatureFlagSchema.index({ 'environments.production': 1, isEnabled: 1 });

const FeatureFlag = mongoose.model<IFeatureFlag>('FeatureFlag', FeatureFlagSchema);

export default FeatureFlag;
