import mongoose, { Document, Schema } from 'mongoose';

/**
 * PackingStation Model
 *
 * Represents packing stations in the warehouse where picked items are packed for shipment.
 * Each station can handle specific order types and has configured equipment.
 */

// Station types
export type StationType = 'STANDARD' | 'FRAGILE' | 'OVERSIZED' | 'EXPRESS' | 'MULTI_ITEM';

// Station status
export type StationStatus = 'AVAILABLE' | 'OCCUPIED' | 'OFFLINE' | 'MAINTENANCE';

// Current packing session
export interface IPackingSession {
    pickListId: mongoose.Types.ObjectId;
    orderId: mongoose.Types.ObjectId;
    orderNumber: string;
    startedAt: Date;
    status: 'IN_PROGRESS' | 'WEIGHING' | 'LABELING' | 'COMPLETED';
    items: Array<{
        sku: string;
        productName: string;
        quantity: number;
        packed: number;
    }>;
}

// Package being created
export interface IPackage {
    _id?: mongoose.Types.ObjectId;
    packageNumber: number;
    weight: number; // kg
    dimensions: {
        length: number;
        width: number;
        height: number;
    };
    items: Array<{
        sku: string;
        quantity: number;
    }>;
    boxType?: string;
    isFragile: boolean;
    requiresInsurance: boolean;
}

export interface IPackingStation extends Document {
    warehouseId: mongoose.Types.ObjectId;
    companyId: mongoose.Types.ObjectId;

    // Station identification
    stationCode: string; // e.g., "PS-001"
    name: string;
    type: StationType;

    // Location within warehouse
    zoneId?: mongoose.Types.ObjectId;
    locationDescription: string;

    // Status
    status: StationStatus;
    isActive: boolean;

    // Current assignment
    assignedTo?: mongoose.Types.ObjectId;
    assignedAt?: Date;

    // Current session
    currentSession?: IPackingSession;

    // Packages in progress
    packages: IPackage[];

    // Equipment/capabilities
    hasScale: boolean;
    hasScanner: boolean;
    hasPrinter: boolean;
    hasLabelPrinter: boolean;

    // Scale configuration
    scaleMaxWeight: number; // kg
    scaleMinWeight: number; // kg
    scalePrecision: number; // decimal places

    // Supported box sizes
    supportedBoxSizes: string[];

    // Performance tracking
    ordersPackedToday: number;
    ordersPackedTotal: number;
    averagePackTime: number; // minutes
    lastPackedAt?: Date;

    // Timestamps
    createdAt: Date;
    updatedAt: Date;
}

const PackingSessionSchema = new Schema<IPackingSession>(
    {
        pickListId: {
            type: Schema.Types.ObjectId,
            ref: 'PickList',
        },
        orderId: {
            type: Schema.Types.ObjectId,
            ref: 'Order',
        },
        orderNumber: {
            type: String,
        },
        startedAt: {
            type: Date,
            default: Date.now,
        },
        status: {
            type: String,
            enum: ['IN_PROGRESS', 'WEIGHING', 'LABELING', 'COMPLETED'],
            default: 'IN_PROGRESS',
        },
        items: [{
            sku: String,
            productName: String,
            quantity: Number,
            packed: { type: Number, default: 0 },
        }],
    },
    { _id: false }
);

const PackageSchema = new Schema<IPackage>(
    {
        packageNumber: {
            type: Number,
            required: true,
        },
        weight: {
            type: Number,
            required: true,
            min: 0,
        },
        dimensions: {
            length: { type: Number, required: true, min: 0 },
            width: { type: Number, required: true, min: 0 },
            height: { type: Number, required: true, min: 0 },
        },
        items: [{
            sku: { type: String, required: true },
            quantity: { type: Number, required: true, min: 1 },
        }],
        boxType: {
            type: String,
        },
        isFragile: {
            type: Boolean,
            default: false,
        },
        requiresInsurance: {
            type: Boolean,
            default: false,
        },
    },
    { _id: true }
);

const PackingStationSchema = new Schema<IPackingStation>(
    {
        warehouseId: {
            type: Schema.Types.ObjectId,
            ref: 'Warehouse',
            required: true,
            index: true,
        },
        companyId: {
            type: Schema.Types.ObjectId,
            ref: 'Company',
            required: true,
            index: true,
        },

        // Station identification
        stationCode: {
            type: String,
            required: true,
            uppercase: true,
            trim: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        type: {
            type: String,
            enum: ['STANDARD', 'FRAGILE', 'OVERSIZED', 'EXPRESS', 'MULTI_ITEM'],
            default: 'STANDARD',
        },

        // Location
        zoneId: {
            type: Schema.Types.ObjectId,
            ref: 'WarehouseZone',
        },
        locationDescription: {
            type: String,
            trim: true,
        },

        // Status
        status: {
            type: String,
            enum: ['AVAILABLE', 'OCCUPIED', 'OFFLINE', 'MAINTENANCE'],
            default: 'AVAILABLE',
        },
        isActive: {
            type: Boolean,
            default: true,
        },

        // Assignment
        assignedTo: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
        assignedAt: {
            type: Date,
        },

        // Current session
        currentSession: PackingSessionSchema,

        // Packages
        packages: [PackageSchema],

        // Equipment
        hasScale: {
            type: Boolean,
            default: true,
        },
        hasScanner: {
            type: Boolean,
            default: true,
        },
        hasPrinter: {
            type: Boolean,
            default: true,
        },
        hasLabelPrinter: {
            type: Boolean,
            default: true,
        },

        // Scale configuration
        scaleMaxWeight: {
            type: Number,
            default: 50, // kg
        },
        scaleMinWeight: {
            type: Number,
            default: 0.01, // kg (10 grams)
        },
        scalePrecision: {
            type: Number,
            default: 2, // decimal places
        },

        // Supported box sizes
        supportedBoxSizes: [{
            type: String,
        }],

        // Performance
        ordersPackedToday: {
            type: Number,
            default: 0,
        },
        ordersPackedTotal: {
            type: Number,
            default: 0,
        },
        averagePackTime: {
            type: Number,
            default: 0,
        },
        lastPackedAt: {
            type: Date,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Virtual: Is station busy
PackingStationSchema.virtual('isBusy').get(function (this: IPackingStation) {
    return this.status === 'OCCUPIED' && this.currentSession != null;
});

// Virtual: Total package count in current session
PackingStationSchema.virtual('currentPackageCount').get(function (this: IPackingStation) {
    return this.packages.length;
});

// Indexes
PackingStationSchema.index({ warehouseId: 1, stationCode: 1 }, { unique: true });
PackingStationSchema.index({ warehouseId: 1, status: 1 });
PackingStationSchema.index({ assignedTo: 1, status: 1 });
PackingStationSchema.index({ type: 1, status: 1 });

// Pre-save: Update status based on session
PackingStationSchema.pre('save', function (next) {
    if (this.currentSession) {
        this.status = 'OCCUPIED';
    } else if (this.isActive && this.status === 'OCCUPIED') {
        this.status = 'AVAILABLE';
    }
    next();
});

// Create and export the PackingStation model
const PackingStation = mongoose.model<IPackingStation>('PackingStation', PackingStationSchema);
export default PackingStation;
