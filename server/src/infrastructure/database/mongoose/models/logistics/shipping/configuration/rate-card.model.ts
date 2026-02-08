import mongoose, { Document, Schema } from 'mongoose';
import { arrayLimit } from '../../../../../../../shared/utils/arrayValidators';

// Define the interface for RateCard document
export interface IRateCard extends Document {
  name: string;
  companyId: mongoose.Types.ObjectId;
  rateCardCategory?: string;
  shipmentType?: 'forward' | 'reverse';
  gst?: number;
  minimumFare?: number;
  minimumFareCalculatedOn?: 'freight' | 'freight_overhead';
  zoneBType?: 'state' | 'region';
  codPercentage?: number;
  codMinimumCharge?: number;
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
  version: string; // Legacy string version (keep for backward compatibility)
  versionNumber: number; // Sequential: 1, 2, 3...
  previousVersionId?: mongoose.Types.ObjectId; // Legacy field (keep for backward compatibility)
  parentVersionId?: mongoose.Types.ObjectId; // Reference to previous version
  approvedBy?: mongoose.Types.ObjectId; // Who approved this version
  approvedAt?: Date; // When approved
  changeReason?: string; // Why this version was created
  deprecatedAt?: Date; // When this version was replaced
  priority?: number; // Selection priority (higher = more important)
  isSpecialPromotion?: boolean; // Flag for time-bound cards
  isLocked: boolean; // Prevents accidental overwrites
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;

  // Static method for creating new versions
  createNewVersion?: (
    existingCardId: string,
    changes: Partial<IRateCard>,
    userId: string,
    reason: string
  ) => Promise<IRateCard>;
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
    rateCardCategory: {
      type: String,
      default: '',
    },
    shipmentType: {
      type: String,
      enum: ['forward', 'reverse'],
    },
    gst: {
      type: Number,
      min: 0,
    },
    minimumFare: {
      type: Number,
      min: 0,
    },
    minimumFareCalculatedOn: {
      type: String,
      enum: ['freight', 'freight_overhead'],
    },
    zoneBType: {
      type: String,
      enum: ['state', 'region'],
    },
    codPercentage: {
      type: Number,
      min: 0,
    },
    codMinimumCharge: {
      type: Number,
      min: 0,
    },
    baseRates: {
      type: [
        {
          carrier: {
            type: String,
            required: false,
          },
          serviceType: {
            type: String,
            required: false,
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
            required: false,
          },
          serviceType: {
            type: String,
            required: false,
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
      type: String,
      default: 'v1', // Legacy field
    },
    versionNumber: {
      type: Number,
      default: 1,
      min: 1,
    },
    previousVersionId: {
      type: Schema.Types.ObjectId,
      ref: 'RateCard', // Legacy field
    },
    parentVersionId: {
      type: Schema.Types.ObjectId,
      ref: 'RateCard',
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: Date,
    changeReason: {
      type: String,
      maxLength: 500,
    },
    deprecatedAt: Date,
    priority: { type: Number, default: 0 },
    isSpecialPromotion: { type: Boolean, default: false },
    isLocked: {
      type: Boolean,
      default: false,
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
const validateWeightSlabs = (rules: Array<{ minWeight: number; maxWeight: number; carrier?: string; serviceType?: string }>): boolean => {
  if (!rules || rules.length <= 1) return true;

  const groups = new Map<string, typeof rules>();

  // Use dynamic import for services/utils to avoid circular deps if any (though Service is safe here)
  // But for simple normalization we can inline or assume the Service is redundant if we just want lowercasing.
  // Actually, let's use the Service as planned. 
  // Since we can't easily import a class inside a function without async, 
  // and this is a sync validator, we will duplicate the simple normalization logic here 
  // OR rely on the import at top of file (added in next step).
  // For now, let's implement the logic directly to be safe and dependency-free in the model.

  const normalize = (s?: string) => (s || '').trim().toLowerCase();

  for (const rule of rules) {
    // Group by carrier + serviceType (default to 'any' for legacy)
    const carrier = normalize(rule.carrier) || 'any';
    const service = normalize(rule.serviceType) || 'any';
    const key = `${carrier}:${service}`;

    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(rule);
  }

  for (const [key, groupRules] of groups) {
    // Sort by minWeight
    const sorted = [...groupRules].sort((a, b) => a.minWeight - b.minWeight);
    for (let i = 1; i < sorted.length; i++) {
      // If current min < previous max, it overlaps
      // e.g. [0-2], [1.5-3] -> 1.5 < 2 -> Fail
      if (sorted[i].minWeight < sorted[i - 1].maxWeight) {
        // Overlap detected in specific group
        return false;
      }
    }
  }
  return true;
};

RateCardSchema.pre('save', function (next) {
  let error: Error | null = null;

  if (this.weightRules && !validateWeightSlabs(this.weightRules)) {
    error = new Error('Weight Rules slabs cannot overlap within the same carrier/service type');
  }

  // Also validate Base Rates
  if (!error && this.baseRates && !validateWeightSlabs(this.baseRates)) {
    error = new Error('Base Rate slabs cannot overlap within the same carrier/service type');
  }

  if (error) next(error);
  else next();
});


// Validate on Update operations as well
RateCardSchema.pre(['findOneAndUpdate', 'updateOne'], function (next) {
  const update = this.getUpdate() as any;
  // Check if weightRules are being modified (direct set or via $set)
  const weightRules = update.weightRules || (update.$set && update.$set.weightRules);
  const baseRates = update.baseRates || (update.$set && update.$set.baseRates);

  if (weightRules && !validateWeightSlabs(weightRules)) {
    next(new Error('Weight Rules slabs cannot overlap within the same carrier/service type'));
    return;
  }

  if (baseRates && !validateWeightSlabs(baseRates)) {
    next(new Error('Base Rate slabs cannot overlap within the same carrier/service type'));
    return;
  }

  next();
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
RateCardSchema.index({ companyId: 1, name: 1, versionNumber: -1 }); // Versioning queries

// Selection priority index
RateCardSchema.index({ companyId: 1, status: 1, 'effectiveDates.startDate': 1, priority: -1 });

// Customer-specific selection index
RateCardSchema.index({ companyId: 1, 'customerOverrides.customerId': 1, status: 1 });
RateCardSchema.index({ companyId: 1, 'customerOverrides.customerGroup': 1, status: 1 });

// Static method: Create new version of a rate card
RateCardSchema.statics.createNewVersion = async function (
  existingCardId: string,
  changes: Partial<IRateCard>,
  userId: string,
  reason: string
): Promise<IRateCard> {
  const existingCard = await this.findById(existingCardId);
  if (!existingCard) {
    throw new Error('Rate card not found');
  }

  // Create new version
  const newVersion = new this({
    ...existingCard.toObject(),
    _id: new mongoose.Types.ObjectId(),
    versionNumber: existingCard.versionNumber + 1,
    parentVersionId: existingCard._id,
    approvedBy: userId,
    approvedAt: undefined, // Will be set upon approval
    changeReason: reason,
    status: 'draft', // New version starts as draft
    deprecatedAt: undefined,
    isLocked: false,
    ...changes,
  });

  await newVersion.save();

  // Mark old version as deprecated
  existingCard.deprecatedAt = new Date();
  existingCard.status = 'expired';
  await existingCard.save();

  return newVersion;
};

// Create and export the RateCard model
const RateCard = mongoose.model<IRateCard>('RateCard', RateCardSchema);
export default RateCard;
