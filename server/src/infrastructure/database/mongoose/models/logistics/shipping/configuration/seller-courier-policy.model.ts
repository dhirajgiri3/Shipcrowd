import mongoose, { Document, Schema } from 'mongoose';

export interface ISellerCourierPolicy extends Document {
    companyId: mongoose.Types.ObjectId;
    sellerId: mongoose.Types.ObjectId;
    allowedProviders: Array<'velocity' | 'delhivery' | 'ekart'>;
    allowedServiceIds: mongoose.Types.ObjectId[];
    blockedProviders: Array<'velocity' | 'delhivery' | 'ekart'>;
    blockedServiceIds: mongoose.Types.ObjectId[];
    rateCardType: 'default' | 'custom';
    rateCardCategory: 'default' | 'basic' | 'standard' | 'advanced' | 'custom';
    selectionMode: 'manual_with_recommendation' | 'manual_only' | 'auto';
    autoPriority: 'price' | 'speed' | 'balanced';
    balancedDeltaPercent: number;
    isActive: boolean;
    metadata?: {
        notes?: string;
        lastEvaluatedAt?: Date;
        updatedBy?: mongoose.Types.ObjectId;
    };
    createdAt: Date;
    updatedAt: Date;
}

const SellerCourierPolicySchema = new Schema<ISellerCourierPolicy>(
    {
        companyId: {
            type: Schema.Types.ObjectId,
            ref: 'Company',
            required: true,
        },
        sellerId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        allowedProviders: [
            {
                type: String,
                enum: ['velocity', 'delhivery', 'ekart'],
            },
        ],
        allowedServiceIds: [
            {
                type: Schema.Types.ObjectId,
                ref: 'CourierService',
            },
        ],
        blockedProviders: [
            {
                type: String,
                enum: ['velocity', 'delhivery', 'ekart'],
            },
        ],
        blockedServiceIds: [
            {
                type: Schema.Types.ObjectId,
                ref: 'CourierService',
            },
        ],
        rateCardType: {
            type: String,
            enum: ['default', 'custom'],
            default: 'default',
        },
        rateCardCategory: {
            type: String,
            enum: ['default', 'basic', 'standard', 'advanced', 'custom'],
            default: 'default',
        },
        selectionMode: {
            type: String,
            enum: ['manual_with_recommendation', 'manual_only', 'auto'],
            default: 'manual_with_recommendation',
        },
        autoPriority: {
            type: String,
            enum: ['price', 'speed', 'balanced'],
            default: 'balanced',
        },
        balancedDeltaPercent: {
            type: Number,
            min: 0,
            max: 100,
            default: 5,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        metadata: {
            notes: String,
            lastEvaluatedAt: Date,
            updatedBy: {
                type: Schema.Types.ObjectId,
                ref: 'User',
            },
        },
    },
    {
        timestamps: true,
    }
);

SellerCourierPolicySchema.index(
    { companyId: 1, sellerId: 1 },
    { unique: true, name: 'uidx_seller_courier_policy_company_seller' }
);
SellerCourierPolicySchema.index(
    { companyId: 1, isActive: 1 },
    { name: 'idx_seller_courier_policy_company_active' }
);

const SellerCourierPolicy = mongoose.model<ISellerCourierPolicy>('SellerCourierPolicy', SellerCourierPolicySchema);
export default SellerCourierPolicy;
