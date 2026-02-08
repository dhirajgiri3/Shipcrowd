import mongoose, { Document, Schema } from 'mongoose';
import { arrayLimit } from '../../../../../../../shared/utils/arrayValidators';

// Define the interface for RateCard document
export interface IRateCard extends Document {
  name: string;
  companyId?: mongoose.Types.ObjectId;
  scope?: 'global' | 'company';
  rateCardCategory?: string;
  shipmentType?: 'forward' | 'reverse';
  gst?: number;
  minimumFare?: number;
  minimumFareCalculatedOn?: 'freight' | 'freight_overhead';
  zoneBType?: 'state' | 'distance';
  codPercentage?: number;
  codMinimumCharge?: number;
  // Zone-based pricing (BlueShip-style)
  zonePricing?: {
    zoneA?: { baseWeight: number; basePrice: number; additionalPricePerKg: number };
    zoneB?: { baseWeight: number; basePrice: number; additionalPricePerKg: number };
    zoneC?: { baseWeight: number; basePrice: number; additionalPricePerKg: number };
    zoneD?: { baseWeight: number; basePrice: number; additionalPricePerKg: number };
    zoneE?: { baseWeight: number; basePrice: number; additionalPricePerKg: number };
  };
  customerOverrides: Array<{
    customerId?: mongoose.Types.ObjectId;
    customerGroup?: string;
    discountPercentage?: number;
    flatDiscount?: number;
    carrier?: string;
    serviceType?: string;
  }>;
  // Surcharges & Minimums
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
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: false,
    },
    scope: {
      type: String,
      enum: ['global', 'company'],
      default: 'company',
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
      enum: ['state', 'distance'],
    },
    codPercentage: {
      type: Number,
      min: 0,
    },
    codMinimumCharge: {
      type: Number,
      min: 0,
    },
    // NEW: BlueShip-style zone pricing
    zonePricing: {
      type: {
        zoneA: {
          baseWeight: { type: Number, min: 0 },
          basePrice: { type: Number, min: 0 },
          additionalPricePerKg: { type: Number, min: 0 }
        },
        zoneB: {
          baseWeight: { type: Number, min: 0 },
          basePrice: { type: Number, min: 0 },
          additionalPricePerKg: { type: Number, min: 0 }
        },
        zoneC: {
          baseWeight: { type: Number, min: 0 },
          basePrice: { type: Number, min: 0 },
          additionalPricePerKg: { type: Number, min: 0 }
        },
        zoneD: {
          baseWeight: { type: Number, min: 0 },
          basePrice: { type: Number, min: 0 },
          additionalPricePerKg: { type: Number, min: 0 }
        },
        zoneE: {
          baseWeight: { type: Number, min: 0 },
          basePrice: { type: Number, min: 0 },
          additionalPricePerKg: { type: Number, min: 0 }
        }
      },
      required: true
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

// Create indexes
RateCardSchema.index({ companyId: 1 });
RateCardSchema.index({ 'effectiveDates.startDate': 1, 'effectiveDates.endDate': 1 });
RateCardSchema.index({ status: 1 });
RateCardSchema.index({ isDeleted: 1 });
RateCardSchema.index({ companyId: 1, name: 1 }, { unique: true });

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
