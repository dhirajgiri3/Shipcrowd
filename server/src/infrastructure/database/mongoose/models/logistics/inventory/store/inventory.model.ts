import mongoose, { Document, Schema } from 'mongoose';

/**
 * Inventory Model
 *
 * Tracks inventory levels for SKUs across warehouses.
 * This is the aggregate view of stock, while WarehouseLocation tracks physical placement.
 *
 * Quantity Types:
 * - onHand: Total physical stock
 * - available: Can be sold/allocated (onHand - reserved - damaged)
 * - reserved: Allocated to orders not yet picked
 * - inTransfer: Moving between locations/warehouses
 * - damaged: Damaged goods awaiting disposition
 */

// Inventory status
export type InventoryStatus = 'ACTIVE' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'DISCONTINUED';

// Replenishment status
export type ReplenishmentStatus = 'NONE' | 'SUGGESTED' | 'ORDERED' | 'IN_TRANSIT' | 'RECEIVED';

export interface IInventory extends Document {
    warehouseId: mongoose.Types.ObjectId;
    companyId: mongoose.Types.ObjectId;

    // Product identification
    sku: string;
    productId?: mongoose.Types.ObjectId;
    productName: string;
    barcode?: string;
    category?: string;

    // Quantity tracking
    onHand: number; // Total physical stock
    available: number; // Available for sale (virtual)
    reserved: number; // Reserved for orders
    inTransfer: number; // In transit between locations
    damaged: number; // Damaged goods

    // Incoming stock
    onOrder: number; // Ordered but not received
    expectedDate?: Date;

    // Stock thresholds
    reorderPoint: number; // Trigger replenishment when available falls below
    reorderQuantity: number; // Quantity to order
    safetyStock: number; // Minimum stock level
    maxStock: number; // Maximum stock capacity

    // Location references
    locations: Array<{
        locationId: mongoose.Types.ObjectId;
        locationCode: string;
        quantity: number;
        isPickFace: boolean;
    }>;

    // Status
    status: InventoryStatus;
    isActive: boolean;

    // Replenishment
    replenishmentStatus: ReplenishmentStatus;
    lastReplenishmentDate?: Date;
    nextReplenishmentDate?: Date;

    // Costing (optional)
    unitCost?: number;
    totalValue?: number;
    currency: string;

    // Tracking
    lastReceivedDate?: Date;
    lastPickedDate?: Date;
    lastCountedDate?: Date;
    lastMovementDate?: Date;

    // Metrics
    daysOfStock?: number; // Based on average daily sales
    turnoverRate?: number; // How often stock turns over

    // Timestamps
    createdAt: Date;
    updatedAt: Date;
}

const InventorySchema = new Schema<IInventory>(
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

        // Product identification
        sku: {
            type: String,
            required: true,
            trim: true,
            uppercase: true,
        },
        productId: {
            type: Schema.Types.ObjectId,
            ref: 'Product',
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
        category: {
            type: String,
            trim: true,
        },

        // Quantity tracking
        onHand: {
            type: Number,
            default: 0,
            min: 0,
        },
        reserved: {
            type: Number,
            default: 0,
            min: 0,
        },
        inTransfer: {
            type: Number,
            default: 0,
            min: 0,
        },
        damaged: {
            type: Number,
            default: 0,
            min: 0,
        },

        // Incoming stock
        onOrder: {
            type: Number,
            default: 0,
            min: 0,
        },
        expectedDate: {
            type: Date,
        },

        // Stock thresholds
        reorderPoint: {
            type: Number,
            default: 10,
            min: 0,
        },
        reorderQuantity: {
            type: Number,
            default: 50,
            min: 0,
        },
        safetyStock: {
            type: Number,
            default: 5,
            min: 0,
        },
        maxStock: {
            type: Number,
            default: 1000,
            min: 0,
        },

        // Location references
        locations: [{
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
            quantity: {
                type: Number,
                required: true,
                min: 0,
            },
            isPickFace: {
                type: Boolean,
                default: false,
            },
        }],

        // Status
        status: {
            type: String,
            enum: ['ACTIVE', 'LOW_STOCK', 'OUT_OF_STOCK', 'DISCONTINUED'],
            default: 'ACTIVE',
        },
        isActive: {
            type: Boolean,
            default: true,
        },

        // Replenishment
        replenishmentStatus: {
            type: String,
            enum: ['NONE', 'SUGGESTED', 'ORDERED', 'IN_TRANSIT', 'RECEIVED'],
            default: 'NONE',
        },
        lastReplenishmentDate: {
            type: Date,
        },
        nextReplenishmentDate: {
            type: Date,
        },

        // Costing
        unitCost: {
            type: Number,
            min: 0,
        },
        totalValue: {
            type: Number,
            min: 0,
        },
        currency: {
            type: String,
            default: 'INR',
        },

        // Tracking
        lastReceivedDate: {
            type: Date,
        },
        lastPickedDate: {
            type: Date,
        },
        lastCountedDate: {
            type: Date,
        },
        lastMovementDate: {
            type: Date,
        },

        // Metrics
        daysOfStock: {
            type: Number,
        },
        turnoverRate: {
            type: Number,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Virtual: Available stock (onHand - reserved - damaged)
InventorySchema.virtual('available').get(function (this: IInventory) {
    return Math.max(0, this.onHand - this.reserved - this.damaged);
});

// Virtual: Is low stock
InventorySchema.virtual('isLowStock').get(function (this: IInventory) {
    const available = this.onHand - this.reserved - this.damaged;
    return available <= this.reorderPoint;
});

// Virtual: Is out of stock
InventorySchema.virtual('isOutOfStock').get(function (this: IInventory) {
    const available = this.onHand - this.reserved - this.damaged;
    return available <= 0;
});

// Virtual: Needs replenishment
InventorySchema.virtual('needsReplenishment').get(function (this: IInventory) {
    const available = this.onHand - this.reserved - this.damaged;
    return available <= this.reorderPoint && this.replenishmentStatus === 'NONE';
});

// Indexes
// Unique SKU per warehouse
InventorySchema.index({ warehouseId: 1, sku: 1 }, { unique: true });

// Query optimization
InventorySchema.index({ companyId: 1, sku: 1 });
InventorySchema.index({ status: 1 });
InventorySchema.index({ companyId: 1, status: 1 });
InventorySchema.index({ warehouseId: 1, status: 1 });
InventorySchema.index({ 'locations.locationId': 1 });
InventorySchema.index({ barcode: 1 });

// Low stock alert query
InventorySchema.index({ companyId: 1, isActive: 1, onHand: 1, reorderPoint: 1 });

// Pre-save hook to update status and calculate values
InventorySchema.pre('save', function (next) {
    const available = this.onHand - this.reserved - this.damaged;

    // Update status based on stock levels
    if (!this.isActive || this.status === 'DISCONTINUED') {
        // Keep discontinued status
    } else if (available <= 0) {
        this.status = 'OUT_OF_STOCK';
    } else if (available <= this.reorderPoint) {
        this.status = 'LOW_STOCK';
    } else {
        this.status = 'ACTIVE';
    }

    // Calculate total value
    if (this.unitCost) {
        this.totalValue = this.onHand * this.unitCost;
    }

    // Update last movement date
    if (this.isModified('onHand') || this.isModified('reserved') || this.isModified('inTransfer')) {
        this.lastMovementDate = new Date();
    }

    next();
});

// Create and export the Inventory model
const Inventory = mongoose.model<IInventory>('Inventory', InventorySchema);
export default Inventory;
