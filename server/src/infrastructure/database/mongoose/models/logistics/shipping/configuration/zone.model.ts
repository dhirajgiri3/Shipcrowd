import mongoose, { Document, Schema } from 'mongoose';
import { arrayLimit } from '../../../../../../../shared/utils/arrayValidators';

// Define the interface for Zone document
export interface IZone extends Document {
  name: string;
  companyId: mongoose.Types.ObjectId;
  postalCodes: string[];
  zoneType?: 'standard' | 'custom'; // Hybrid zones: standard (A-E) or custom
  standardZoneCode?: 'zoneA' | 'zoneB' | 'zoneC' | 'zoneD' | 'zoneE'; // For standard zones
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
      validate: [
        arrayLimit(10000),
        'Maximum 10,000 postal codes per zone (allows national zones while preventing index bloat)',
      ],
    },
    zoneType: {
      type: String,
      enum: ['standard', 'custom'],
      default: 'custom',
    },
    standardZoneCode: {
      type: String,
      enum: ['zoneA', 'zoneB', 'zoneC', 'zoneD', 'zoneE'],
      required: false,
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
    transitTimes: {
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
      validate: [
        arrayLimit(100),
        'Maximum 100 transit time entries (reasonable limit for carrier/service combinations)',
      ],
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
ZoneSchema.index({ companyId: 1 });
ZoneSchema.index({ postalCodes: 1 });
ZoneSchema.index({ isDeleted: 1 });

// Compound indexes for common query patterns
ZoneSchema.index({ companyId: 1, name: 1 }); // Zone lookup by company
ZoneSchema.index({ companyId: 1, isDeleted: 1 }); // Active zones listing
ZoneSchema.index({ companyId: 1, zoneType: 1, standardZoneCode: 1 }); // Standard zone lookup

// Geospatial index for location-based queries
ZoneSchema.index({ geographicalBoundaries: '2dsphere' }, { sparse: true }); // Geo queries for zone matching

// Create and export the Zone model
const Zone = mongoose.model<IZone>('Zone', ZoneSchema);
export default Zone;
