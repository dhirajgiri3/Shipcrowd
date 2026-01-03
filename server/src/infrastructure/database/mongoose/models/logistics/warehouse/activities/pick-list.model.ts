import mongoose, { Document, Schema } from 'mongoose';

/**
 * PickList Model
 *
 * Represents a picking list for order fulfillment.
 * A pick list contains multiple items from one or more orders that need to be picked.
 *
 * Picking Strategies:
 * - BATCH: Multiple orders picked together for efficiency
 * - WAVE: Time-based waves for scheduled pickups
 * - DISCRETE: One order at a time (simple but less efficient)
 * - ZONE: Items grouped by warehouse zone
 */

// Picking strategies
export type PickingStrategy = 'BATCH' | 'WAVE' | 'DISCRETE' | 'ZONE';

// Pick list status
export type PickListStatus = 'PENDING' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'PARTIAL';

// Pick item status
export type PickItemStatus = 'PENDING' | 'PICKED' | 'SHORT_PICK' | 'NOT_FOUND' | 'DAMAGED' | 'SKIPPED';

// Priority levels
export type PriorityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

// Pick list item interface
export interface IPickListItem {
    _id?: mongoose.Types.ObjectId;
    orderId: mongoose.Types.ObjectId;
    orderItemId: mongoose.Types.ObjectId;
    orderNumber: string;

    // Product details
    sku: string;
    productName: string;
    barcode?: string;

    // Location
    locationId: mongoose.Types.ObjectId;
    locationCode: string;
    zone: string;
    aisle: string;

    // Quantity
    quantityRequired: number;
    quantityPicked: number;
    quantityShort: number;

    // Status
    status: PickItemStatus;

    // Verification
    barcodeScanned: boolean;
    scannedBarcode?: string;
    scannedAt?: Date;

    // Picker notes
    notes?: string;
    reason?: string; // For short picks or not found

    // Sequence in pick path
    sequence: number;
}

export interface IPickList extends Document {
    warehouseId: mongoose.Types.ObjectId;
    companyId: mongoose.Types.ObjectId;
    pickListNumber: string; // e.g., "PL-2025-0001"

    // Orders in this pick list
    orders: mongoose.Types.ObjectId[];
    shipments: mongoose.Types.ObjectId[];
    orderCount: number;

    // Pick items
    items: IPickListItem[];
    totalItems: number;
    pickedItems: number;

    // Status workflow
    status: PickListStatus;

    // Assignment
    assignedTo?: mongoose.Types.ObjectId;
    assignedAt?: Date;
    assignedBy?: mongoose.Types.ObjectId;

    // Picking configuration
    pickingStrategy: PickingStrategy;
    priority: PriorityLevel;

    // Timing
    estimatedPickTime: number; // minutes
    actualPickTime?: number;
    scheduledAt?: Date;
    startedAt?: Date;
    completedAt?: Date;

    // Verification
    requiresVerification: boolean;
    verifiedBy?: mongoose.Types.ObjectId;
    verifiedAt?: Date;
    verificationStatus?: 'PENDING' | 'PASSED' | 'FAILED';

    // Notes and exceptions
    notes?: string;
    pickerNotes?: string;
    exceptions: string[];

    // Metrics
    accuracy?: number; // Percentage of items picked correctly
    efficiency?: number; // Items per hour

    // Timestamps
    createdAt: Date;
    updatedAt: Date;
}

const PickListItemSchema = new Schema<IPickListItem>(
    {
        orderId: {
            type: Schema.Types.ObjectId,
            ref: 'Order',
            required: true,
        },
        orderItemId: {
            type: Schema.Types.ObjectId,
            required: true,
        },
        orderNumber: {
            type: String,
            required: true,
        },

        // Product details
        sku: {
            type: String,
            required: true,
            trim: true,
        },
        productName: {
            type: String,
            required: true,
            trim: true,
        },
        barcode: {
            type: String,
            trim: true,
        },

        // Location
        locationId: {
            type: Schema.Types.ObjectId,
            ref: 'WarehouseLocation',
            required: true,
        },
        locationCode: {
            type: String,
            required: true,
            uppercase: true,
        },
        zone: {
            type: String,
            required: true,
            uppercase: true,
        },
        aisle: {
            type: String,
            required: true,
            uppercase: true,
        },

        // Quantity
        quantityRequired: {
            type: Number,
            required: true,
            min: 1,
        },
        quantityPicked: {
            type: Number,
            default: 0,
            min: 0,
        },
        quantityShort: {
            type: Number,
            default: 0,
            min: 0,
        },

        // Status
        status: {
            type: String,
            enum: ['PENDING', 'PICKED', 'SHORT_PICK', 'NOT_FOUND', 'DAMAGED', 'SKIPPED'],
            default: 'PENDING',
        },

        // Verification
        barcodeScanned: {
            type: Boolean,
            default: false,
        },
        scannedBarcode: {
            type: String,
        },
        scannedAt: {
            type: Date,
        },

        // Notes
        notes: {
            type: String,
            trim: true,
        },
        reason: {
            type: String,
            trim: true,
        },

        // Sequence
        sequence: {
            type: Number,
            default: 0,
        },
    },
    { _id: true }
);

const PickListSchema = new Schema<IPickList>(
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
        pickListNumber: {
            type: String,
            required: true,
            unique: true,
            uppercase: true,
        },

        // Orders and shipments
        orders: [{
            type: Schema.Types.ObjectId,
            ref: 'Order',
        }],
        shipments: [{
            type: Schema.Types.ObjectId,
            ref: 'Shipment',
        }],
        orderCount: {
            type: Number,
            default: 0,
        },

        // Items
        items: [PickListItemSchema],
        totalItems: {
            type: Number,
            default: 0,
        },
        pickedItems: {
            type: Number,
            default: 0,
        },

        // Status
        status: {
            type: String,
            enum: ['PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'PARTIAL'],
            default: 'PENDING',
        },

        // Assignment
        assignedTo: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
        assignedAt: {
            type: Date,
        },
        assignedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },

        // Configuration
        pickingStrategy: {
            type: String,
            enum: ['BATCH', 'WAVE', 'DISCRETE', 'ZONE'],
            default: 'BATCH',
        },
        priority: {
            type: String,
            enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
            default: 'MEDIUM',
        },

        // Timing
        estimatedPickTime: {
            type: Number,
            default: 0,
        },
        actualPickTime: {
            type: Number,
        },
        scheduledAt: {
            type: Date,
        },
        startedAt: {
            type: Date,
        },
        completedAt: {
            type: Date,
        },

        // Verification
        requiresVerification: {
            type: Boolean,
            default: true,
        },
        verifiedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
        verifiedAt: {
            type: Date,
        },
        verificationStatus: {
            type: String,
            enum: ['PENDING', 'PASSED', 'FAILED'],
        },

        // Notes and exceptions
        notes: {
            type: String,
            trim: true,
        },
        pickerNotes: {
            type: String,
            trim: true,
        },
        exceptions: [{
            type: String,
        }],

        // Metrics
        accuracy: {
            type: Number,
            min: 0,
            max: 100,
        },
        efficiency: {
            type: Number,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Virtual: Completion percentage
PickListSchema.virtual('completionPercent').get(function (this: IPickList) {
    if (this.totalItems === 0) return 0;
    return Math.round((this.pickedItems / this.totalItems) * 100);
});

// Virtual: Is overdue
PickListSchema.virtual('isOverdue').get(function (this: IPickList) {
    if (!this.scheduledAt || this.status === 'COMPLETED' || this.status === 'CANCELLED') {
        return false;
    }
    return new Date() > this.scheduledAt;
});

// Indexes
PickListSchema.index({ warehouseId: 1, status: 1 });
PickListSchema.index({ assignedTo: 1, status: 1 });
PickListSchema.index({ companyId: 1, status: 1 });
PickListSchema.index({ createdAt: -1 });
PickListSchema.index({ priority: 1, scheduledAt: 1 });

// Pre-save hook to update counts
PickListSchema.pre('save', function (next) {
    // Update order count
    this.orderCount = this.orders.length;

    // Update item counts
    this.totalItems = this.items.length;
    this.pickedItems = this.items.filter(
        (item) => item.status === 'PICKED'
    ).length;

    // Calculate accuracy if completed
    if (this.status === 'COMPLETED' && this.totalItems > 0) {
        const successfulPicks = this.items.filter(
            (item) => item.status === 'PICKED' && item.quantityPicked === item.quantityRequired
        ).length;
        this.accuracy = Math.round((successfulPicks / this.totalItems) * 100);
    }

    // Calculate actual pick time if completed
    if (this.status === 'COMPLETED' && this.startedAt && this.completedAt) {
        this.actualPickTime = Math.round(
            (this.completedAt.getTime() - this.startedAt.getTime()) / 60000
        ); // Convert ms to minutes
    }

    next();
});

// Static method to generate pick list number
PickListSchema.statics.generatePickListNumber = async function (): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `PL-${year}-`;

    // Find the last pick list number for this year
    const lastPickList = await this.findOne({
        pickListNumber: { $regex: `^${prefix}` },
    }).sort({ pickListNumber: -1 });

    let nextNumber = 1;
    if (lastPickList) {
        const lastNumber = parseInt(lastPickList.pickListNumber.split('-').pop() || '0', 10);
        nextNumber = lastNumber + 1;
    }

    return `${prefix}${nextNumber.toString().padStart(5, '0')}`;
};

// Create and export the PickList model
const PickList = mongoose.model<IPickList>('PickList', PickListSchema);
export default PickList;
