import mongoose, { Document, Schema } from 'mongoose';
import { arrayLimit } from '../../../../../../../shared/utils/arrayValidators';

// Define the interface for RateCard document
export interface IRateCard extends Document {
  name: string;
  companyId: mongoose.Types.ObjectId;
  baseRates: Array<{
    carrier: string;
    serviceType: string;
    basePrice: number;
    minWeight: number;
    maxWeight: number;
  }>;
  weightRules: Array<{
    minWeight: number;
    maxWeight: number;
    pricePerKg: number;
    carrier?: string;
    serviceType?: string;
  }>;
  zoneRules: Array<{
    zoneId: mongoose.Types.ObjectId;
    carrier: string;
    serviceType: string;
    additionalPrice: number;
    transitDays?: number;
  }>;
  customerOverrides: Array<{
    customerId?: mongoose.Types.ObjectId;
    customerGroup?: string;
    discountPercentage?: number;
    flatDiscount?: number;
    carrier?: string;
    serviceType?: string;
  }>;
  // Surcharges & Minimums
  minimumCall?: number; // Minimum chargeable amount (e.g. 40)
  fuelSurcharge?: number; // %age (e.g. 30)
  fuelSurchargeBase?: 'freight' | 'freight_cod'; // Base for fuel calculation
  remoteAreaEnabled?: boolean; // Safety flag
  remoteAreaSurcharge?: number; // Flat fee (e.g. 50)
  codSurcharges?: Array<{
    min: number;
    max: number;
    value: number;
    type: 'flat' | 'percentage';
  }>;
  zoneMultipliers?: Record<string, number>; // Zone-based rate multipliers (e.g., zoneA: 0.85)
  effectiveDates: {
    startDate: Date;
    endDate?: Date;
  };
  status: 'draft' | 'active' | 'inactive' | 'expired';
  version: number;
  previousVersionId?: mongoose.Types.ObjectId;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Create the RateCard schema
const RateCardSchema = new Schema<IRateCard>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    baseRates: {
      type: [
        {
          carrier: {
            type: String,
            required: true,
          },
          serviceType: {
            type: String,
            required: true,
          },
          basePrice: {
            type: Number,
            required: true,
            min: 0,
          },
          minWeight: {
            type: Number,
            required: true,
            min: 0,
          },
          maxWeight: {
            type: Number,
            required: true,
            min: 0,
          },
        },
      ],
      validate: [
        arrayLimit(1000),
        'Maximum 1,000 base rates (supports complex pricing with many carriers)',
      ],
    },
    weightRules: {
      type: [
        {
          minWeight: {
            type: Number,
            required: true,
            min: 0,
          },
          maxWeight: {
            type: Number,
            required: true,
            min: 0,
          },
          pricePerKg: {
            type: Number,
            required: true,
            min: 0,
          },
          carrier: String,
          serviceType: String,
        },
      ],
      validate: [
        arrayLimit(1000),
        'Maximum 1,000 weight rules (supports multiple weight slabs)',
      ],
    },
    zoneRules: {
      type: [
        {
          zoneId: {
            type: Schema.Types.ObjectId,
            ref: 'Zone',
            required: true,
          },
          carrier: {
            type: String,
            required: true,
          },
          serviceType: {
            type: String,
            required: true,
          },
          additionalPrice: {
            type: Number,
            required: true,
          },
          transitDays: Number,
        },
      ],
      validate: [
        arrayLimit(1000),
        'Maximum 1,000 zone rules (supports zone-specific pricing)',
      ],
    },
    customerOverrides: {
      type: [
        {
          customerId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
          },
          customerGroup: String,
          discountPercentage: {
            type: Number,
            min: 0,
            max: 100,
          },
          flatDiscount: {
            type: Number,
            min: 0,
          },
          carrier: String,
          serviceType: String,
        },
      ],
      validate: [
        arrayLimit(500),
        'Maximum 500 customer overrides (supports customer-specific discounts)',
      ],
    },
    // Surcharges & Minimums
    minimumCall: { type: Number, min: 0, default: 0 },
    fuelSurcharge: { type: Number, min: 0, default: 0 }, // percentage
    fuelSurchargeBase: {
      type: String,
      enum: ['freight', 'freight_cod'],
      default: 'freight'
    },
    remoteAreaEnabled: { type: Boolean, default: false },
    remoteAreaSurcharge: { type: Number, min: 0, default: 0 },
    codSurcharges: {
      type: [{
        min: { type: Number, required: true },
        max: { type: Number, required: true },
        value: { type: Number, required: true },
        type: { type: String, enum: ['flat', 'percentage'], required: true }
      }],
      validate: [arrayLimit(20), 'Max 20 COD slabs']
    },
    zoneMultipliers: {
      type: Map,
      of: Number,
      default: {},
    },
    effectiveDates: {
      startDate: {
        type: Date,
        required: true,
        default: Date.now,
      },
      endDate: Date,
    },
    status: {
      type: String,
      enum: ['draft', 'active', 'inactive', 'expired'],
      default: 'draft',
    },
    version: {
      type: Number,
      default: 1,
    },
    previousVersionId: {
      type: Schema.Types.ObjectId,
      ref: 'RateCard',
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Validation helper
const validateWeightSlabs = (rules: Array<{ minWeight: number; maxWeight: number }>): boolean => {
  if (!rules || rules.length <= 1) return true;
  // Sort by minWeight
  const sorted = [...rules].sort((a, b) => a.minWeight - b.minWeight);
  for (let i = 1; i < sorted.length; i++) {
    // If current min < previous max, it overlaps
    // e.g. [0-2], [1.5-3] -> 1.5 < 2 -> Fail
    if (sorted[i].minWeight < sorted[i - 1].maxWeight) {
      return false;
    }
  }
  return true;
};

RateCardSchema.pre('save', function (next) {
  if (this.weightRules && !validateWeightSlabs(this.weightRules)) {
    next(new Error('Weight slabs cannot overlap'));
  } else {
    next();
  }
});


// Validate on Update operations as well
RateCardSchema.pre(['findOneAndUpdate', 'updateOne'], function (next) {
  const update = this.getUpdate() as any;
  // Check if weightRules are being modified (direct set or via $set)
  const weightRules = update.weightRules || (update.$set && update.$set.weightRules);

  if (weightRules && !validateWeightSlabs(weightRules)) {
    next(new Error('Weight slabs cannot overlap'));
  } else {
    next();
  }
});

// Create indexes
// name index is already created by unique: true
RateCardSchema.index({ companyId: 1 });
RateCardSchema.index({ 'effectiveDates.startDate': 1, 'effectiveDates.endDate': 1 });
RateCardSchema.index({ status: 1 });
RateCardSchema.index({ isDeleted: 1 });

// Compound indexes for common query patterns
RateCardSchema.index({ companyId: 1, status: 1 }); // Active rate cards
RateCardSchema.index({ companyId: 1, isDeleted: 1 }); // Rate card listing

// Create and export the RateCard model
const RateCard = mongoose.model<IRateCard>('RateCard', RateCardSchema);
export default RateCard;
