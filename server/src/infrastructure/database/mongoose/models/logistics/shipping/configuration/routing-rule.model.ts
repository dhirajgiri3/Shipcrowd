import mongoose, { Document, Schema } from 'mongoose';

export interface IRoutingRule extends Document {
    companyId: mongoose.Types.ObjectId;
    name: string;
    isActive: boolean;
    priority: 'price' | 'speed' | 'balanced'; // Primary sorting criteria

    // Constraints (If met, rule applies)
    conditions: {
        minWeight?: number;
        maxWeight?: number;
        paymentMode?: 'cod' | 'prepaid' | 'any';
        orderValueRanges?: Array<{ min: number; max: number }>;
        zones?: string[]; // e.g., ['Zone A', 'Zone B']
    };

    // Actions (What to do)
    actions: {
        blockedCarriers: string[]; // Carriers to exclude
        preferredCarriers: string[]; // Carriers to boost (if available)
    };

    createdAt: Date;
    updatedAt: Date;
}

const RoutingRuleSchema = new Schema<IRoutingRule>(
    {
        companyId: {
            type: Schema.Types.ObjectId,
            ref: 'Company',
            required: true,
            index: true,
        },
        name: {
            type: String,
            required: true,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        priority: {
            type: String,
            enum: ['price', 'speed', 'balanced'],
            default: 'balanced',
        },
        conditions: {
            minWeight: Number,
            maxWeight: Number,
            paymentMode: {
                type: String,
                enum: ['cod', 'prepaid', 'any'],
                default: 'any',
            },
            orderValueRanges: [
                {
                    min: Number,
                    max: Number,
                },
            ],
            zones: [String],
        },
        actions: {
            blockedCarriers: [String],
            preferredCarriers: [String],
        },
    },
    {
        timestamps: true,
    }
);

// Indexes for faster rule lookup during routing
RoutingRuleSchema.index({ companyId: 1, isActive: 1 });

const RoutingRule = mongoose.model<IRoutingRule>('RoutingRule', RoutingRuleSchema);
export default RoutingRule;
