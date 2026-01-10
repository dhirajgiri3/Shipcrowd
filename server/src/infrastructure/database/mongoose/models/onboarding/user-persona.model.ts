import mongoose, { Document, Schema } from 'mongoose';

/**
 * UserPersona Model
 * Stores user survey responses for personalized onboarding
 */

export type IndustryType =
    | 'fashion'
    | 'electronics'
    | 'food'
    | 'books'
    | 'cosmetics'
    | 'home_decor'
    | 'sports'
    | 'other';

export type MonthlyVolumeType =
    | 'under_100'
    | '100_to_1000'
    | '1000_to_5000'
    | 'over_5000';

export type ExperienceLevelType =
    | 'new_to_ecommerce'
    | 'beginner'
    | 'intermediate'
    | 'experienced';

export type PrimaryGoalType =
    | 'save_money'
    | 'scale_fast'
    | 'better_tracking'
    | 'reduce_rto'
    | 'automate_operations';

export interface IUserPersona extends Document {
    _id: mongoose.Types.ObjectId;
    companyId: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;

    // Survey responses
    industry: IndustryType;
    monthlyVolume: MonthlyVolumeType;
    experienceLevel: ExperienceLevelType;
    primaryGoal: PrimaryGoalType;

    // Additional context
    hasExistingEcommerce: boolean;
    platforms: string[]; // Shopify, WooCommerce, etc.

    // Personalization results
    recommendedFeatures: string[];
    customOnboardingPath: string[];
    priorityFeatures: string[];

    // Survey metadata
    surveyCompletedAt: Date;
    surveyVersion: string;

    createdAt: Date;
    updatedAt: Date;

    // Methods
    generateRecommendations(): void;
}

const UserPersonaSchema = new Schema<IUserPersona>(
    {
        companyId: {
            type: Schema.Types.ObjectId,
            ref: 'Company',
            required: true,
            index: true
        },
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },
        industry: {
            type: String,
            enum: ['fashion', 'electronics', 'food', 'books', 'cosmetics', 'home_decor', 'sports', 'other'],
            required: true
        },
        monthlyVolume: {
            type: String,
            enum: ['under_100', '100_to_1000', '1000_to_5000', 'over_5000'],
            required: true
        },
        experienceLevel: {
            type: String,
            enum: ['new_to_ecommerce', 'beginner', 'intermediate', 'experienced'],
            required: true
        },
        primaryGoal: {
            type: String,
            enum: ['save_money', 'scale_fast', 'better_tracking', 'reduce_rto', 'automate_operations'],
            required: true
        },
        hasExistingEcommerce: {
            type: Boolean,
            default: false
        },
        platforms: {
            type: [String],
            default: []
        },
        recommendedFeatures: {
            type: [String],
            default: []
        },
        customOnboardingPath: {
            type: [String],
            default: []
        },
        priorityFeatures: {
            type: [String],
            default: []
        },
        surveyCompletedAt: {
            type: Date,
            required: true,
            default: Date.now
        },
        surveyVersion: {
            type: String,
            default: '1.0'
        }
    },
    {
        timestamps: true
    }
);

// Indexes
UserPersonaSchema.index({ companyId: 1, userId: 1 }, { unique: true });
UserPersonaSchema.index({ industry: 1 });
UserPersonaSchema.index({ monthlyVolume: 1 });

// Methods
UserPersonaSchema.methods.generateRecommendations = function (): void {
    const recommendations: string[] = [];
    const onboardingPath: string[] = [];
    const priorityFeatures: string[] = [];

    // Industry-specific recommendations
    switch (this.industry) {
        case 'fashion':
            recommendations.push('Zone-Based Pricing', 'COD Verification', 'NDR Automation', 'RTO Prevention');
            priorityFeatures.push('cod_remittance', 'ndr_management', 'rto_tracking');
            break;
        case 'electronics':
            recommendations.push('Weight Dispute Management', 'Insurance Coverage', 'Premium Tracking');
            priorityFeatures.push('weight_disputes', 'insurance', 'tracking_api');
            break;
        case 'food':
            recommendations.push('Express Delivery', 'Temperature Tracking', 'Special Handling');
            priorityFeatures.push('express_shipping', 'sla_management');
            break;
        case 'books':
            recommendations.push('Bulk Upload', 'Lightweight Zones', 'Cash on Delivery');
            priorityFeatures.push('bulk_operations', 'cod_remittance');
            break;
        default:
            recommendations.push('Rate Calculator', 'Order Management', 'Basic Tracking');
    }

    // Volume-based recommendations
    switch (this.monthlyVolume) {
        case 'over_5000':
            recommendations.push('API Integration', 'Webhook Automation', 'Dedicated Account Manager');
            onboardingPath.push('api_setup', 'webhook_config', 'bulk_testing');
            break;
        case '1000_to_5000':
            recommendations.push('CSV Bulk Upload', 'Automated Workflows', 'Analytics Dashboard');
            onboardingPath.push('bulk_upload', 'automation_setup', 'analytics');
            break;
        case '100_to_1000':
            recommendations.push('E-commerce Integration', 'Order Automation', 'Team Collaboration');
            onboardingPath.push('integration_setup', 'team_invite');
            break;
        case 'under_100':
            recommendations.push('Manual Order Creation', 'Basic Tracking', 'Support Chat');
            onboardingPath.push('single_order', 'tracking_basics');
            break;
    }

    // Experience-based recommendations
    if (this.experienceLevel === 'new_to_ecommerce') {
        onboardingPath.unshift('welcome_video', 'platform_tour', 'create_demo_order');
        recommendations.push('Video Tutorials', 'Guided Tours', 'Live Support');
    } else if (this.experienceLevel === 'experienced') {
        onboardingPath.unshift('api_quickstart', 'advanced_features');
        recommendations.push('API Documentation', 'Advanced Analytics', 'Custom Workflows');
    }

    // Goal-based recommendations
    switch (this.primaryGoal) {
        case 'save_money':
            priorityFeatures.push('rate_comparison', 'zone_optimization', 'bulk_discounts');
            recommendations.push('Rate Calculator', 'Zone Optimization', 'Volume Discounts');
            break;
        case 'scale_fast':
            priorityFeatures.push('api_integration', 'automation', 'bulk_operations');
            recommendations.push('API Integration', 'Workflow Automation', 'Team Management');
            break;
        case 'better_tracking':
            priorityFeatures.push('tracking_api', 'webhooks', 'notifications');
            recommendations.push('Real-time Tracking', 'WhatsApp Notifications', 'Webhook Integration');
            break;
        case 'reduce_rto':
            priorityFeatures.push('ndr_automation', 'cod_verification', 'address_validation');
            recommendations.push('NDR Automation', 'COD Verification', 'Address Validation');
            break;
        case 'automate_operations':
            priorityFeatures.push('webhooks', 'api_integration', 'automated_manifest');
            recommendations.push('Webhook Automation', 'API Integration', 'Auto Manifest');
            break;
    }

    this.recommendedFeatures = [...new Set(recommendations)];
    this.customOnboardingPath = [...new Set(onboardingPath)];
    this.priorityFeatures = [...new Set(priorityFeatures)];
};

// Pre-save hook
UserPersonaSchema.pre('save', function (next) {
    if (this.isNew || this.isModified('industry') || this.isModified('monthlyVolume') || this.isModified('experienceLevel') || this.isModified('primaryGoal')) {
        this.generateRecommendations();
    }
    next();
});

const UserPersona = mongoose.model<IUserPersona>('UserPersona', UserPersonaSchema);

export default UserPersona;
