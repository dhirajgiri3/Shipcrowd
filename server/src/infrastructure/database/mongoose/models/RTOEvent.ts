import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * RTOEvent Model
 *
 * Tracks Return To Origin events.
 */

export interface IQCResult {
    passed: boolean;
    remarks?: string;
    images?: string[];
    inspectedBy?: string;
    inspectedAt?: Date;
}

export interface IRTOEvent extends Document {
    shipment: mongoose.Types.ObjectId;
    order: mongoose.Types.ObjectId;
    reverseShipment?: mongoose.Types.ObjectId;
    reverseAwb?: string;
    rtoReason: 'ndr_unresolved' | 'customer_cancellation' | 'qc_failure' | 'refused' | 'other';
    ndrEvent?: mongoose.Types.ObjectId;
    triggeredBy: 'auto' | 'manual';
    triggeredByUser?: string;
    triggeredAt: Date;
    rtoCharges: number;
    chargesDeducted: boolean;
    chargesDeductedAt?: Date;
    warehouse: mongoose.Types.ObjectId;
    expectedReturnDate?: Date;
    actualReturnDate?: Date;
    returnStatus: 'initiated' | 'in_transit' | 'delivered_to_warehouse' | 'qc_pending' | 'qc_completed' | 'restocked' | 'disposed';
    qcResult?: IQCResult;
    company: mongoose.Types.ObjectId;
    customerNotified: boolean;
    warehouseNotified: boolean;
    metadata?: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
    // Methods
    updateReturnStatus(status: string, metadata?: Record<string, any>): Promise<IRTOEvent>;
    recordQC(result: IQCResult): Promise<IRTOEvent>;
}

interface IRTOEventModel extends Model<IRTOEvent> {
    getPendingRTOs(companyId: string): Promise<IRTOEvent[]>;
    getByShipment(shipmentId: string): Promise<IRTOEvent | null>;
}

const QCResultSchema = new Schema<IQCResult>(
    {
        passed: { type: Boolean, required: true },
        remarks: { type: String },
        images: { type: [String], default: [] },
        inspectedBy: { type: String },
        inspectedAt: { type: Date },
    },
    { _id: false }
);

const RTOEventSchema = new Schema<IRTOEvent>(
    {
        shipment: {
            type: Schema.Types.ObjectId,
            ref: 'Shipment',
            required: true,
            index: true,
        },
        order: {
            type: Schema.Types.ObjectId,
            ref: 'Order',
            required: true,
            index: true,
        },
        reverseShipment: {
            type: Schema.Types.ObjectId,
            ref: 'Shipment',
        },
        reverseAwb: {
            type: String,
        },
        rtoReason: {
            type: String,
            enum: ['ndr_unresolved', 'customer_cancellation', 'qc_failure', 'refused', 'other'],
            required: true,
            index: true,
        },
        ndrEvent: {
            type: Schema.Types.ObjectId,
            ref: 'NDREvent',
        },
        triggeredBy: {
            type: String,
            enum: ['auto', 'manual'],
            required: true,
        },
        triggeredByUser: {
            type: String,
        },
        triggeredAt: {
            type: Date,
            default: Date.now,
            index: true,
        },
        rtoCharges: {
            type: Number,
            default: 0,
        },
        chargesDeducted: {
            type: Boolean,
            default: false,
        },
        chargesDeductedAt: {
            type: Date,
        },
        warehouse: {
            type: Schema.Types.ObjectId,
            ref: 'Warehouse',
            required: true,
        },
        expectedReturnDate: {
            type: Date,
        },
        actualReturnDate: {
            type: Date,
        },
        returnStatus: {
            type: String,
            enum: ['initiated', 'in_transit', 'delivered_to_warehouse', 'qc_pending', 'qc_completed', 'restocked', 'disposed'],
            default: 'initiated',
            index: true,
        },
        qcResult: {
            type: QCResultSchema,
        },
        company: {
            type: Schema.Types.ObjectId,
            ref: 'Company',
            required: true,
            index: true,
        },
        customerNotified: {
            type: Boolean,
            default: false,
        },
        warehouseNotified: {
            type: Boolean,
            default: false,
        },
        metadata: {
            type: Schema.Types.Mixed,
        },
    },
    {
        timestamps: true,
        collection: 'rto_events',
    }
);

// Indexes
RTOEventSchema.index({ company: 1, returnStatus: 1 });
RTOEventSchema.index({ company: 1, triggeredAt: -1 });
RTOEventSchema.index({ warehouse: 1, returnStatus: 1 });

// Static: Get pending RTOs for company
RTOEventSchema.statics.getPendingRTOs = async function (
    companyId: string
): Promise<IRTOEvent[]> {
    return this.find({
        company: companyId,
        returnStatus: { $in: ['initiated', 'in_transit', 'qc_pending'] },
    })
        .sort({ triggeredAt: -1 })
        .populate('shipment order warehouse');
};

// Static: Get RTO by shipment
RTOEventSchema.statics.getByShipment = async function (
    shipmentId: string
): Promise<IRTOEvent | null> {
    return this.findOne({ shipment: shipmentId }).populate('shipment order ndrEvent');
};

// Methods
RTOEventSchema.methods.updateReturnStatus = function (
    status: string,
    metadata?: Record<string, any>
) {
    this.returnStatus = status;
    if (status === 'delivered_to_warehouse') {
        this.actualReturnDate = new Date();
    }
    if (metadata) {
        this.metadata = { ...this.metadata, ...metadata };
    }
    return this.save();
};

RTOEventSchema.methods.recordQC = function (result: IQCResult) {
    this.qcResult = result;
    this.returnStatus = 'qc_completed';
    return this.save();
};

const RTOEvent = mongoose.model<IRTOEvent, IRTOEventModel>('RTOEvent', RTOEventSchema);

export default RTOEvent;
