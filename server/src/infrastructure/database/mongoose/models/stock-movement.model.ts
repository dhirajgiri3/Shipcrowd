import mongoose, { Document, Schema } from 'mongoose';

/**
 * StockMovement Model
 *
 * Tracks all inventory movements in the warehouse for audit trail and analytics.
 * Every stock change (receive, pick, transfer, adjust, etc.) creates a movement record.
 *
 * Movement Types:
 * - RECEIVE: Stock received from supplier
 * - PICK: Stock picked for an order
 * - TRANSFER: Moved between locations
 * - ADJUSTMENT: Manual stock adjustment
 * - RETURN: Customer return received
 * - DAMAGE: Stock marked as damaged
 * - DISPOSAL: Stock disposed/written off
 * - REPLENISHMENT: Stock moved to pick face
 * - CYCLE_COUNT: Adjustment from inventory count
 */

// Movement types
export type MovementType =
    | 'RECEIVE'
    | 'PICK'
    | 'TRANSFER'
    | 'ADJUSTMENT'
    | 'RETURN'
    | 'DAMAGE'
    | 'DISPOSAL'
    | 'REPLENISHMENT'
    | 'CYCLE_COUNT';

// Movement status
export type MovementStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED' | 'FAILED';

// Direction of movement
export type MovementDirection = 'IN' | 'OUT' | 'INTERNAL';

export interface IStockMovement extends Document {
    warehouseId: mongoose.Types.ObjectId;
    companyId: mongoose.Types.ObjectId;

    // Movement identification
    movementNumber: string; // e.g., "SM-2025-0001"
    type: MovementType;
    direction: MovementDirection;
    status: MovementStatus;

    // Product details
    sku: string;
    productName: string;
    barcode?: string;
    inventoryId: mongoose.Types.ObjectId;

    // Quantity
    quantity: number; // Positive for IN, negative for OUT
    previousQuantity: number; // Stock level before movement
    newQuantity: number; // Stock level after movement

    // Locations
    fromLocationId?: mongoose.Types.ObjectId;
    fromLocationCode?: string;
    toLocationId?: mongoose.Types.ObjectId;
    toLocationCode?: string;

    // References
    orderId?: mongoose.Types.ObjectId;
    orderNumber?: string;
    pickListId?: mongoose.Types.ObjectId;
    pickListNumber?: string;
    shipmentId?: mongoose.Types.ObjectId;
    purchaseOrderId?: mongoose.Types.ObjectId;
    purchaseOrderNumber?: string;
    returnId?: mongoose.Types.ObjectId;

    // Reason and notes
    reason: string;
    notes?: string;

    // Verification
    barcodeScanned: boolean;
    verifiedBy?: mongoose.Types.ObjectId;
    verifiedAt?: Date;

    // User tracking
    performedBy: mongoose.Types.ObjectId;
    performedAt: Date;
    approvedBy?: mongoose.Types.ObjectId;
    approvedAt?: Date;

    // Cost tracking (optional)
    unitCost?: number;
    totalCost?: number;
    currency: string;

    // Batch/lot tracking (optional)
    batchNumber?: string;
    lotNumber?: string;
    expiryDate?: Date;

    // Timestamps
    createdAt: Date;
    updatedAt: Date;
}

const StockMovementSchema = new Schema<IStockMovement>(
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

        // Movement identification
        movementNumber: {
            type: String,
            required: true,
            unique: true,
            uppercase: true,
        },
        type: {
            type: String,
            enum: ['RECEIVE', 'PICK', 'TRANSFER', 'ADJUSTMENT', 'RETURN', 'DAMAGE', 'DISPOSAL', 'REPLENISHMENT', 'CYCLE_COUNT'],
            required: true,
        },
        direction: {
            type: String,
            enum: ['IN', 'OUT', 'INTERNAL'],
            required: true,
        },
        status: {
            type: String,
            enum: ['PENDING', 'COMPLETED', 'CANCELLED', 'FAILED'],
            default: 'PENDING',
        },

        // Product details
        sku: {
            type: String,
            required: true,
            trim: true,
            uppercase: true,
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
        inventoryId: {
            type: Schema.Types.ObjectId,
            ref: 'Inventory',
            required: true,
        },

        // Quantity
        quantity: {
            type: Number,
            required: true,
        },
        previousQuantity: {
            type: Number,
            required: true,
        },
        newQuantity: {
            type: Number,
            required: true,
        },

        // Locations
        fromLocationId: {
            type: Schema.Types.ObjectId,
            ref: 'WarehouseLocation',
        },
        fromLocationCode: {
            type: String,
            uppercase: true,
        },
        toLocationId: {
            type: Schema.Types.ObjectId,
            ref: 'WarehouseLocation',
        },
        toLocationCode: {
            type: String,
            uppercase: true,
        },

        // References
        orderId: {
            type: Schema.Types.ObjectId,
            ref: 'Order',
        },
        orderNumber: {
            type: String,
        },
        pickListId: {
            type: Schema.Types.ObjectId,
            ref: 'PickList',
        },
        pickListNumber: {
            type: String,
        },
        shipmentId: {
            type: Schema.Types.ObjectId,
            ref: 'Shipment',
        },
        purchaseOrderId: {
            type: Schema.Types.ObjectId,
        },
        purchaseOrderNumber: {
            type: String,
        },
        returnId: {
            type: Schema.Types.ObjectId,
        },

        // Reason and notes
        reason: {
            type: String,
            required: true,
            trim: true,
        },
        notes: {
            type: String,
            trim: true,
        },

        // Verification
        barcodeScanned: {
            type: Boolean,
            default: false,
        },
        verifiedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
        verifiedAt: {
            type: Date,
        },

        // User tracking
        performedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        performedAt: {
            type: Date,
            default: Date.now,
        },
        approvedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
        approvedAt: {
            type: Date,
        },

        // Cost tracking
        unitCost: {
            type: Number,
            min: 0,
        },
        totalCost: {
            type: Number,
            min: 0,
        },
        currency: {
            type: String,
            default: 'INR',
        },

        // Batch/lot tracking
        batchNumber: {
            type: String,
            trim: true,
        },
        lotNumber: {
            type: String,
            trim: true,
        },
        expiryDate: {
            type: Date,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Virtual: Absolute quantity (for display purposes)
StockMovementSchema.virtual('absQuantity').get(function (this: IStockMovement) {
    return Math.abs(this.quantity);
});

// Indexes
StockMovementSchema.index({ movementNumber: 1 }, { unique: true });
StockMovementSchema.index({ warehouseId: 1, type: 1 });
StockMovementSchema.index({ warehouseId: 1, sku: 1 });
StockMovementSchema.index({ companyId: 1, type: 1 });
StockMovementSchema.index({ inventoryId: 1 });
StockMovementSchema.index({ orderId: 1 });
StockMovementSchema.index({ pickListId: 1 });
StockMovementSchema.index({ performedBy: 1 });
StockMovementSchema.index({ createdAt: -1 });
StockMovementSchema.index({ companyId: 1, createdAt: -1 }); // For reports

// Text index for searching
StockMovementSchema.index({ sku: 'text', productName: 'text', reason: 'text' });

// Static method to generate movement number
StockMovementSchema.statics.generateMovementNumber = async function (): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `SM-${year}-`;

    const lastMovement = await this.findOne({
        movementNumber: { $regex: `^${prefix}` },
    }).sort({ movementNumber: -1 });

    let nextNumber = 1;
    if (lastMovement) {
        const lastNumber = parseInt(lastMovement.movementNumber.split('-').pop() || '0', 10);
        nextNumber = lastNumber + 1;
    }

    return `${prefix}${nextNumber.toString().padStart(6, '0')}`;
};

// Pre-save hook to calculate total cost
StockMovementSchema.pre('save', function (next) {
    if (this.unitCost && this.quantity) {
        this.totalCost = Math.abs(this.quantity) * this.unitCost;
    }

    // Determine direction based on type if not set
    if (!this.direction) {
        const inTypes = ['RECEIVE', 'RETURN'];
        const outTypes = ['PICK', 'DAMAGE', 'DISPOSAL'];
        const internalTypes = ['TRANSFER', 'REPLENISHMENT'];

        if (inTypes.includes(this.type)) {
            this.direction = 'IN';
        } else if (outTypes.includes(this.type)) {
            this.direction = 'OUT';
        } else if (internalTypes.includes(this.type)) {
            this.direction = 'INTERNAL';
        }
    }

    next();
});

// Create and export the StockMovement model
const StockMovement = mongoose.model<IStockMovement>('StockMovement', StockMovementSchema);
export default StockMovement;
