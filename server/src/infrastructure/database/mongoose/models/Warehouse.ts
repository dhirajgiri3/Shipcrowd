import mongoose, { Document, Schema } from 'mongoose';

// Define the interface for Warehouse document
export interface IWarehouse extends Document {
  name: string;
  companyId: mongoose.Types.ObjectId;
  address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  contactInfo: {
    name: string;
    phone: string;
    email?: string;
    alternatePhone?: string;
  };
  operatingHours?: {
    monday: { open: string | null; close: string | null };
    tuesday: { open: string | null; close: string | null };
    wednesday: { open: string | null; close: string | null };
    thursday: { open: string | null; close: string | null };
    friday: { open: string | null; close: string | null };
    saturday: { open: string | null; close: string | null };
    sunday: { open: string | null; close: string | null };
  };
  isActive: boolean;
  isDefault: boolean;
  isDeleted: boolean;
  carrierDetails?: {
    velocityWarehouseId?: string;
    delhiveryWarehouseId?: string;
    dtdcWarehouseId?: string;
    xpressbeesWarehouseId?: string;
    lastSyncedAt?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Create the Warehouse schema
const WarehouseSchema = new Schema<IWarehouse>(
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
    address: {
      line1: {
        type: String,
        required: true,
      },
      line2: String,
      city: {
        type: String,
        required: true,
      },
      state: {
        type: String,
        required: true,
      },
      country: {
        type: String,
        required: true,
        default: 'India',
      },
      postalCode: {
        type: String,
        required: true,
      },
      coordinates: {
        latitude: Number,
        longitude: Number,
      },
    },
    contactInfo: {
      name: {
        type: String,
        required: true,
      },
      phone: {
        type: String,
        required: true,
      },
      email: String,
      alternatePhone: String,
    },
    operatingHours: {
      monday: { open: String, close: String },
      tuesday: { open: String, close: String },
      wednesday: { open: String, close: String },
      thursday: { open: String, close: String },
      friday: { open: String, close: String },
      saturday: { open: String, close: String },
      sunday: { open: String, close: String },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    carrierDetails: {
      velocityWarehouseId: String,
      delhiveryWarehouseId: String,
      dtdcWarehouseId: String,
      xpressbeesWarehouseId: String,
      lastSyncedAt: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes
// name index is already created by unique: true
WarehouseSchema.index({ companyId: 1 });
WarehouseSchema.index({ 'address.postalCode': 1 });
WarehouseSchema.index({ isActive: 1 });
WarehouseSchema.index({ isDefault: 1 });
WarehouseSchema.index({ isDeleted: 1 });

// Compound indexes for common query patterns
WarehouseSchema.index({ companyId: 1, isActive: 1 }); // Active warehouses listing
WarehouseSchema.index({ companyId: 1, isDeleted: 1 }); // Warehouse listing

// Create and export the Warehouse model
const Warehouse = mongoose.model<IWarehouse>('Warehouse', WarehouseSchema);
export default Warehouse;
