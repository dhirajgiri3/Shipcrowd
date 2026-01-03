import mongoose, { Document, Schema, Model } from 'mongoose';

/**
 * Commission Rule Model
 * 
 * Supports 5 rule types for flexible commission calculation:
 * - percentage: Apply percentage of order value
 * - flat: Fixed amount per order
 * - tiered: Different rates based on order value ranges
 * - product-based: Different rates per product
 * - revenue-share: Percentage of profit (order value - cost)
 */

// Rule type enum
export type RuleType = 'percentage' | 'flat' | 'tiered' | 'product-based' | 'revenue-share';

// Tier interface for tiered rules
export interface ITier {
    minValue: number;
    maxValue: number;
    rate: number;
}

// Conditions for rule applicability
export interface IRuleConditions {
    minOrderValue?: number;
    maxOrderValue?: number;
    specificCustomers?: mongoose.Types.ObjectId[];
    orderStatuses?: string[];
}

// Commission Rule interface
export interface ICommissionRule extends Document {
    name: string;
    company: mongoose.Types.ObjectId;
    ruleType: RuleType;
    isActive: boolean;
    priority: number;
    applicableProducts?: mongoose.Types.ObjectId[];
    applicableCategories?: string[];
    conditions?: IRuleConditions;
    percentageRate?: number;
    flatAmount?: number;
    tiers?: ITier[];
    productRates?: Map<string, number>;
    effectiveFrom: Date;
    effectiveTo?: Date;
    createdBy: mongoose.Types.ObjectId;
    metadata?: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;

    // Instance methods
    isApplicable(order: any): boolean;
    calculateCommission(orderValue: number, order?: any): number;
}

// Static methods interface
export interface ICommissionRuleModel extends Model<ICommissionRule> {
    findActiveRules(companyId: string, filters?: Record<string, unknown>): Promise<ICommissionRule[]>;
    findByPriority(companyId: string, limit?: number): Promise<ICommissionRule[]>;
}

// Tier sub-schema
const TierSchema = new Schema<ITier>(
    {
        minValue: { type: Number, required: true, min: 0 },
        maxValue: { type: Number, required: true, min: 0 },
        rate: { type: Number, required: true, min: 0, max: 100 },
    },
    { _id: false }
);

// Conditions sub-schema
const ConditionsSchema = new Schema<IRuleConditions>(
    {
        minOrderValue: { type: Number, min: 0 },
        maxOrderValue: { type: Number, min: 0 },
        specificCustomers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
        orderStatuses: [{ type: String }],
    },
    { _id: false }
);

// Main CommissionRule schema
const CommissionRuleSchema = new Schema<ICommissionRule, ICommissionRuleModel>(
    {
        name: {
            type: String,
            required: [true, 'Rule name is required'],
            trim: true,
            minlength: [3, 'Rule name must be at least 3 characters'],
            maxlength: [100, 'Rule name cannot exceed 100 characters'],
        },
        company: {
            type: Schema.Types.ObjectId,
            ref: 'Company',
            required: [true, 'Company is required'],
            index: true,
        },
        ruleType: {
            type: String,
            enum: {
                values: ['percentage', 'flat', 'tiered', 'product-based', 'revenue-share'],
                message: '{VALUE} is not a valid rule type',
            },
            required: [true, 'Rule type is required'],
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        priority: {
            type: Number,
            required: true,
            default: 1,
            min: [1, 'Priority must be at least 1'],
            max: [1000, 'Priority cannot exceed 1000'],
        },
        applicableProducts: [
            {
                type: Schema.Types.ObjectId,
                ref: 'Product',
            },
        ],
        applicableCategories: [{ type: String, trim: true }],
        conditions: ConditionsSchema,
        percentageRate: {
            type: Number,
            min: [0, 'Percentage rate cannot be negative'],
            max: [100, 'Percentage rate cannot exceed 100'],
        },
        flatAmount: {
            type: Number,
            min: [0, 'Flat amount cannot be negative'],
        },
        tiers: [TierSchema],
        productRates: {
            type: Map,
            of: Number,
        },
        effectiveFrom: {
            type: Date,
            required: [true, 'Effective from date is required'],
        },
        effectiveTo: {
            type: Date,
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Created by is required'],
        },
        metadata: {
            type: Schema.Types.Mixed,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// ============================================================================
// INDEXES
// ============================================================================

// Main query pattern: active rules by priority
CommissionRuleSchema.index({ company: 1, isActive: 1, priority: -1 });

// Filter by rule type
CommissionRuleSchema.index({ company: 1, ruleType: 1 });

// Date range queries
CommissionRuleSchema.index({ effectiveFrom: 1, effectiveTo: 1 });

// Audit queries
CommissionRuleSchema.index({ createdBy: 1 });

// Unique name per company
CommissionRuleSchema.index({ company: 1, name: 1 }, { unique: true });

// ============================================================================
// INSTANCE METHODS
// ============================================================================

/**
 * Check if this rule is applicable to the given order
 */
CommissionRuleSchema.methods.isApplicable = function (order: any): boolean {
    const now = new Date();

    // Check date validity
    if (this.effectiveFrom > now) return false;
    if (this.effectiveTo && this.effectiveTo < now) return false;

    // Check if rule is active
    if (!this.isActive) return false;

    // Check conditions
    if (this.conditions) {
        const { minOrderValue, maxOrderValue, specificCustomers, orderStatuses } = this.conditions;

        // Order value conditions
        const orderTotal = order?.totals?.total || order?.totalAmount || 0;
        if (minOrderValue !== undefined && orderTotal < minOrderValue) return false;
        if (maxOrderValue !== undefined && orderTotal > maxOrderValue) return false;

        // Specific customers
        if (specificCustomers && specificCustomers.length > 0) {
            const customerId = order?.customerId?.toString() || order?.customerInfo?.customerId?.toString();
            const customerIds = specificCustomers.map((id: mongoose.Types.ObjectId) => id.toString());
            if (!customerIds.includes(customerId)) return false;
        }

        // Order status
        if (orderStatuses && orderStatuses.length > 0) {
            const orderStatus = order?.currentStatus || order?.status;
            if (!orderStatuses.includes(orderStatus)) return false;
        }
    }

    // Check applicable products
    if (this.applicableProducts && this.applicableProducts.length > 0) {
        const orderProductIds = (order?.products || []).map((p: any) => p._id?.toString() || p.productId?.toString());
        const applicableIds = this.applicableProducts.map((id: mongoose.Types.ObjectId) => id.toString());
        const hasApplicableProduct = orderProductIds.some((id: string) => applicableIds.includes(id));
        if (!hasApplicableProduct) return false;
    }

    // Check applicable categories
    if (this.applicableCategories && this.applicableCategories.length > 0) {
        const orderCategories = (order?.products || []).flatMap((p: any) => p.categories || [p.category]).filter(Boolean);
        const hasApplicableCategory = orderCategories.some((cat: string) => this.applicableCategories!.includes(cat));
        if (!hasApplicableCategory) return false;
    }

    return true;
};

/**
 * Calculate commission amount based on rule type
 */
CommissionRuleSchema.methods.calculateCommission = function (orderValue: number, order?: any): number {
    if (orderValue <= 0) return 0;

    let commission = 0;

    switch (this.ruleType) {
        case 'percentage':
            if (this.percentageRate === undefined) {
                throw new Error('Percentage rate is required for percentage rule type');
            }
            commission = orderValue * (this.percentageRate / 100);
            break;

        case 'flat':
            if (this.flatAmount === undefined) {
                throw new Error('Flat amount is required for flat rule type');
            }
            commission = this.flatAmount;
            break;

        case 'tiered':
            if (!this.tiers || this.tiers.length === 0) {
                throw new Error('Tiers are required for tiered rule type');
            }
            // Find the matching tier
            const matchingTier = this.tiers.find(
                (tier: ITier) => orderValue >= tier.minValue && orderValue <= tier.maxValue
            );
            if (matchingTier) {
                commission = orderValue * (matchingTier.rate / 100);
            }
            break;

        case 'product-based':
            if (!this.productRates || this.productRates.size === 0) {
                throw new Error('Product rates are required for product-based rule type');
            }
            if (!order?.products) {
                throw new Error('Order products are required for product-based calculation');
            }
            // Sum commission for each product
            for (const product of order.products) {
                const productId = product._id?.toString() || product.productId?.toString() || product.sku;
                const rate = this.productRates.get(productId);
                if (rate !== undefined) {
                    const productValue = (product.price || 0) * (product.quantity || 1);
                    commission += productValue * (rate / 100);
                }
            }
            break;

        case 'revenue-share':
            if (this.percentageRate === undefined) {
                throw new Error('Percentage rate is required for revenue-share rule type');
            }
            // Calculate profit = order value - cost
            const cost = order?.cost || order?.totals?.cost || 0;
            const profit = orderValue - cost;
            commission = profit > 0 ? profit * (this.percentageRate / 100) : 0;
            break;

        default:
            throw new Error(`Unknown rule type: ${this.ruleType}`);
    }

    // Round to 2 decimal places
    return Math.round(commission * 100) / 100;
};

// ============================================================================
// STATIC METHODS
// ============================================================================

/**
 * Find all active rules for a company
 */
CommissionRuleSchema.statics.findActiveRules = async function (
    companyId: string,
    filters: Record<string, unknown> = {}
): Promise<ICommissionRule[]> {
    const now = new Date();

    const query: Record<string, unknown> = {
        company: new mongoose.Types.ObjectId(companyId),
        isActive: true,
        effectiveFrom: { $lte: now },
        $or: [
            { effectiveTo: null },
            { effectiveTo: undefined },
            { effectiveTo: { $gte: now } },
        ],
        ...filters,
    };

    return this.find(query).sort({ priority: -1 }).lean() as unknown as ICommissionRule[];
};

/**
 * Find rules by priority
 */
CommissionRuleSchema.statics.findByPriority = async function (
    companyId: string,
    limit: number = 10
): Promise<ICommissionRule[]> {
    return this.find({
        company: new mongoose.Types.ObjectId(companyId),
        isActive: true,
    })
        .sort({ priority: -1 })
        .limit(limit)
        .lean() as unknown as ICommissionRule[];
};

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Pre-save validation hook
 */
CommissionRuleSchema.pre('save', function (next) {
    // Validate rule type specific fields
    switch (this.ruleType) {
        case 'percentage':
        case 'revenue-share':
            if (this.percentageRate === undefined || this.percentageRate === null) {
                return next(new Error(`Percentage rate is required for ${this.ruleType} rule type`));
            }
            break;
        case 'flat':
            if (this.flatAmount === undefined || this.flatAmount === null) {
                return next(new Error('Flat amount is required for flat rule type'));
            }
            break;
        case 'tiered':
            if (!this.tiers || this.tiers.length === 0) {
                return next(new Error('Tiers are required for tiered rule type'));
            }
            // Validate non-overlapping tiers
            const sortedTiers = [...this.tiers].sort((a, b) => a.minValue - b.minValue);
            for (let i = 1; i < sortedTiers.length; i++) {
                if (sortedTiers[i].minValue <= sortedTiers[i - 1].maxValue) {
                    return next(new Error('Tiers cannot overlap'));
                }
            }
            break;
    }

    // Validate date range
    if (this.effectiveTo && this.effectiveFrom >= this.effectiveTo) {
        return next(new Error('Effective to date must be after effective from date'));
    }

    next();
});

// Create and export the model
const CommissionRule = mongoose.model<ICommissionRule, ICommissionRuleModel>(
    'CommissionRule',
    CommissionRuleSchema
);

export default CommissionRule;
