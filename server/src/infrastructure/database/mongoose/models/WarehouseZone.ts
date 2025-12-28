import mongoose, { Document, Schema } from 'mongoose';

/**
 * WarehouseZone Model
 *
 * Represents specific zones within a warehouse facility.
 * Zones divide the warehouse into functional areas (storage, picking, packing, etc.)
 *
 * Location Hierarchy: Warehouse → Zone → Location (Aisle/Rack/Shelf/Bin)
 */

// Zone types for different warehouse operations
export type ZoneType = 'STORAGE' | 'PICKING' | 'PACKING' | 'RECEIVING' | 'DISPATCH' | 'RETURNS' | 'QUALITY_CHECK';

// Temperature classifications for climate control
export type TemperatureType = 'AMBIENT' | 'COLD' | 'FROZEN';

export interface IWarehouseZone extends Document {
    warehouseId: mongoose.Types.ObjectId;
    name: string;
    code: string; // Zone code (e.g., "A", "B", "COLD-01")
    type: ZoneType;

    // Location grid configuration
    aisles: number; // Number of aisles in this zone
    racksPerAisle: number;
    shelvesPerRack: number;
    binsPerShelf: number;

    // Environmental conditions
    temperature: TemperatureType;
    isClimateControlled: boolean;
    temperatureMin?: number; // Celsius
    temperatureMax?: number;

    // Access control
    requiresAuthorization: boolean;
    authorizedRoles: string[]; // e.g., ['WAREHOUSE_MANAGER', 'PICKER']

    // Capacity tracking
    totalLocations: number;
    occupiedLocations: number;
    utilizationPercent: number; // Virtual

    // Zone characteristics
    isHighVelocity: boolean; // Fast-moving items zone
    isHazardous: boolean; // Hazardous materials zone
    isFragile: boolean; // Fragile items zone
    maxWeight: number; // Max weight per location in kg

    // Status
    isActive: boolean;
    isDeleted: boolean;

    // Timestamps
    createdAt: Date;
    updatedAt: Date;
}

const WarehouseZoneSchema = new Schema<IWarehouseZone>(
    {
        warehouseId: {
            type: Schema.Types.ObjectId,
            ref: 'Warehouse',
            required: true,
            index: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        code: {
            type: String,
            required: true,
            uppercase: true,
            trim: true,
        },
        type: {
            type: String,
            enum: ['STORAGE', 'PICKING', 'PACKING', 'RECEIVING', 'DISPATCH', 'RETURNS', 'QUALITY_CHECK'],
            required: true,
            default: 'STORAGE',
        },

        // Location grid configuration
        aisles: {
            type: Number,
            default: 1,
            min: 1,
        },
        racksPerAisle: {
            type: Number,
            default: 1,
            min: 1,
        },
        shelvesPerRack: {
            type: Number,
            default: 1,
            min: 1,
        },
        binsPerShelf: {
            type: Number,
            default: 1,
            min: 1,
        },

        // Environmental conditions
        temperature: {
            type: String,
            enum: ['AMBIENT', 'COLD', 'FROZEN'],
            default: 'AMBIENT',
        },
        isClimateControlled: {
            type: Boolean,
            default: false,
        },
        temperatureMin: {
            type: Number,
        },
        temperatureMax: {
            type: Number,
        },

        // Access control
        requiresAuthorization: {
            type: Boolean,
            default: false,
        },
        authorizedRoles: [{
            type: String,
            trim: true,
        }],

        // Capacity tracking
        totalLocations: {
            type: Number,
            default: 0,
        },
        occupiedLocations: {
            type: Number,
            default: 0,
        },

        // Zone characteristics
        isHighVelocity: {
            type: Boolean,
            default: false,
        },
        isHazardous: {
            type: Boolean,
            default: false,
        },
        isFragile: {
            type: Boolean,
            default: false,
        },
        maxWeight: {
            type: Number,
            default: 100, // kg
        },

        // Status
        isActive: {
            type: Boolean,
            default: true,
        },
        isDeleted: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Virtual for utilization percentage
WarehouseZoneSchema.virtual('utilizationPercent').get(function (this: IWarehouseZone) {
    if (this.totalLocations === 0) return 0;
    return Math.round((this.occupiedLocations / this.totalLocations) * 100);
});

// Virtual for total capacity (locations)
WarehouseZoneSchema.virtual('totalCapacity').get(function (this: IWarehouseZone) {
    return this.aisles * this.racksPerAisle * this.shelvesPerRack * this.binsPerShelf;
});

// Indexes
// Unique zone code per warehouse
WarehouseZoneSchema.index({ warehouseId: 1, code: 1 }, { unique: true });

// Query optimization indexes
WarehouseZoneSchema.index({ warehouseId: 1, type: 1 });
WarehouseZoneSchema.index({ warehouseId: 1, isActive: 1 });
WarehouseZoneSchema.index({ isHighVelocity: 1 });
WarehouseZoneSchema.index({ temperature: 1 });

// Pre-save hook to calculate total locations
WarehouseZoneSchema.pre('save', function (next) {
    if (this.isModified('aisles') || this.isModified('racksPerAisle') ||
        this.isModified('shelvesPerRack') || this.isModified('binsPerShelf')) {
        this.totalLocations = this.aisles * this.racksPerAisle * this.shelvesPerRack * this.binsPerShelf;
    }
    next();
});

// Create and export the WarehouseZone model
const WarehouseZone = mongoose.model<IWarehouseZone>('WarehouseZone', WarehouseZoneSchema);
export default WarehouseZone;
