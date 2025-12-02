import mongoose, { Document, Schema } from 'mongoose';

// Define the interface for Zone document
export interface IZone extends Document {
  name: string;
  companyId: mongoose.Types.ObjectId;
  postalCodes: string[];
  geographicalBoundaries?: {
    type: string;
    coordinates: number[][][];
  };
  serviceability: {
    carriers: string[];
    serviceTypes: string[];
  };
  transitTimes: Array<{
    carrier: string;
    serviceType: string;
    minDays: number;
    maxDays: number;
  }>;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Create the Zone schema
const ZoneSchema = new Schema<IZone>(
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
    postalCodes: {
      type: [String],
      required: true,
    },
    geographicalBoundaries: {
      type: {
        type: String,
        enum: ['Polygon'],
      },
      coordinates: [[[Number]]],
    },
    serviceability: {
      carriers: {
        type: [String],
        required: true,
      },
      serviceTypes: {
        type: [String],
        required: true,
      },
    },
    transitTimes: [
      {
        carrier: {
          type: String,
          required: true,
        },
        serviceType: {
          type: String,
          required: true,
        },
        minDays: {
          type: Number,
          required: true,
          min: 0,
        },
        maxDays: {
          type: Number,
          required: true,
          min: 0,
        },
      },
    ],
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
ZoneSchema.index({ companyId: 1 });
ZoneSchema.index({ postalCodes: 1 });
ZoneSchema.index({ isDeleted: 1 });

// Create and export the Zone model
const Zone = mongoose.model<IZone>('Zone', ZoneSchema);
export default Zone;
