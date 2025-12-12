import mongoose, { Document, Schema } from 'mongoose';

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
    baseRates: [
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
    weightRules: [
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
    zoneRules: [
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
    customerOverrides: [
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
    effectiveDates: {
      startDate: {
        type: Date,
        required: true,
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

// Create indexes
// name index is already created by unique: true
RateCardSchema.index({ companyId: 1 });
RateCardSchema.index({ 'effectiveDates.startDate': 1, 'effectiveDates.endDate': 1 });
RateCardSchema.index({ status: 1 });
RateCardSchema.index({ isDeleted: 1 });

// Create and export the RateCard model
const RateCard = mongoose.model<IRateCard>('RateCard', RateCardSchema);
export default RateCard;
