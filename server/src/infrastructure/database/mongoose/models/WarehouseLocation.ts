import mongoose, { Document, Schema } from 'mongoose';

/**
 * WarehouseLocation Model
 *
 * Represents individual storage locations (bins) within a warehouse zone.
 * Each location has a unique code following the pattern: Zone-Aisle-Rack-Shelf-Bin
 *
 * Example: "A-01-03-02-05" = Zone A, Aisle 01, Rack 03, Shelf 02, Bin 05
 */

// Location types
export type LocationType = 'BIN' | 'RACK' | 'FLOOR' | 'PALLET' | 'BULK';

// Location status
export type LocationStatus = 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'BLOCKED' | 'MAINTENANCE';

export interface IWarehouseLocation extends Document {
    zoneId: mongoose.Types.ObjectId;
    warehouseId: mongoose.Types.ObjectId;

    // Location coordinates
    locationCode: string; // e.g., "A-01-03-02-05" (Zone-Aisle-Rack-Shelf-Bin)
    aisle: string;
    rack: string;
    shelf: string;
    bin: string;

    // Location type and status
    type: LocationType;
    status: LocationStatus;

    // Capacity constraints
    maxWeight: number; // kg
    maxVolume: number; // cubic centimeters
    currentWeight: number;
    currentVolume: number;

    // Current inventory
    currentSKU?: string;
    currentStock: number;
    productId?: mongoose.Types.ObjectId;

    // Restrictions
    isDedicated: boolean; // Dedicated to specific SKU
    dedicatedSKU?: string;
    allowMixedSKUs: boolean;

    // Picking optimization
    isPickFace: boolean; // High-velocity pick location (front of rack)
    pickPriority: number; // 1 = highest priority, lower is better
    pickSequence: number; // Order in pick path

    // Location flags
    isActive: boolean;
    isBlocked: boolean;
    blockReason?: string;
    blockedAt?: Date;
    blockedBy?: mongoose.Types.ObjectId;

    // Last activity
    lastPickedAt?: Date;
    lastReplenishedAt?: Date;
    lastCountedAt?: Date;

    // Timestamps
    createdAt: Date;
    updatedAt: Date;
}

const WarehouseLocationSchema = new Schema<IWarehouseLocation>(
    {
        zoneId: {
            type: Schema.Types.ObjectId,
            ref: 'WarehouseZone',
            required: true,
            index: true,
        },
        warehouseId: {
            type: Schema.Types.ObjectId,
            ref: 'Warehouse',
            required: true,
            index: true,
        },

        // Location coordinates
        locationCode: {
            type: String,
            required: true,
            uppercase: true,
            trim: true,
        },
        aisle: {
            type: String,
            required: true,
            uppercase: true,
            trim: true,
        },
        rack: {
            type: String,
            required: true,
            uppercase: true,
            trim: true,
        },
        shelf: {
            type: String,
            required: true,
            uppercase: true,
            trim: true,
        },
        bin: {
            type: String,
            required: true,
            uppercase: true,
            trim: true,
        },

        // Location type and status
        type: {
            type: String,
            enum: ['BIN', 'RACK', 'FLOOR', 'PALLET', 'BULK'],
            default: 'BIN',
        },
        status: {
            type: String,
            enum: ['AVAILABLE', 'OCCUPIED', 'RESERVED', 'BLOCKED', 'MAINTENANCE'],
            default: 'AVAILABLE',
        },

        // Capacity constraints
        maxWeight: {
            type: Number,
            required: true,
            default: 50, // 50 kg default
        },
        maxVolume: {
            type: Number,
            required: true,
            default: 100000, // 100,000 cubic cm = 0.1 cubic meter
        },
        currentWeight: {
            type: Number,
            default: 0,
        },
        currentVolume: {
            type: Number,
            default: 0,
        },

        // Current inventory
        currentSKU: {
            type: String,
            trim: true,
        },
        currentStock: {
            type: Number,
            default: 0,
            min: 0,
        },
        productId: {
            type: Schema.Types.ObjectId,
            ref: 'Product',
        },

        // Restrictions
        isDedicated: {
            type: Boolean,
            default: false,
        },
        dedicatedSKU: {
            type: String,
            trim: true,
        },
        allowMixedSKUs: {
            type: Boolean,
            default: false,
        },

        // Picking optimization
        isPickFace: {
            type: Boolean,
            default: false,
        },
        pickPriority: {
            type: Number,
            default: 5,
            min: 1,
            max: 10,
        },
        pickSequence: {
            type: Number,
            default: 0,
        },

        // Location flags
        isActive: {
            type: Boolean,
            default: true,
        },
        isBlocked: {
            type: Boolean,
            default: false,
        },
        blockReason: {
            type: String,
            trim: true,
        },
        blockedAt: {
            type: Date,
        },
        blockedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },

        // Last activity tracking
        lastPickedAt: {
            type: Date,
        },
        lastReplenishedAt: {
            type: Date,
        },
        lastCountedAt: {
            type: Date,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Virtual: Is location empty
WarehouseLocationSchema.virtual('isEmpty').get(function (this: IWarehouseLocation) {
    return this.currentStock === 0;
});

// Virtual: Weight utilization percentage
WarehouseLocationSchema.virtual('weightUtilization').get(function (this: IWarehouseLocation) {
    if (this.maxWeight === 0) return 0;
    return Math.round((this.currentWeight / this.maxWeight) * 100);
});

// Virtual: Volume utilization percentage
WarehouseLocationSchema.virtual('volumeUtilization').get(function (this: IWarehouseLocation) {
    if (this.maxVolume === 0) return 0;
    return Math.round((this.currentVolume / this.maxVolume) * 100);
});

// Indexes
// Unique location code per warehouse
WarehouseLocationSchema.index({ warehouseId: 1, locationCode: 1 }, { unique: true });

// Query optimization indexes
WarehouseLocationSchema.index({ zoneId: 1, status: 1 });
WarehouseLocationSchema.index({ warehouseId: 1, status: 1 });
WarehouseLocationSchema.index({ currentSKU: 1, status: 1 });
WarehouseLocationSchema.index({ isPickFace: 1, pickPriority: 1 });
WarehouseLocationSchema.index({ warehouseId: 1, isActive: 1, status: 1 });

// For finding available locations for a SKU
WarehouseLocationSchema.index({ warehouseId: 1, dedicatedSKU: 1, status: 1 });

// Pre-save hook to update status based on stock
WarehouseLocationSchema.pre('save', function (next) {
    // Update status based on current stock
    if (this.isModified('currentStock')) {
        if (this.currentStock > 0) {
            this.status = 'OCCUPIED';
        } else if (!this.isBlocked && this.isActive) {
            this.status = 'AVAILABLE';
        }
    }

    // If blocked, ensure status reflects it
    if (this.isBlocked) {
        this.status = 'BLOCKED';
    }

    next();
});

// Create and export the WarehouseLocation model
const WarehouseLocation = mongoose.model<IWarehouseLocation>('WarehouseLocation', WarehouseLocationSchema);
export default WarehouseLocation;
