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
    rtoReason: 'ndr_unresolved' | 'customer_cancellation' | 'qc_failure' | 'refused' | 'damaged_in_transit' | 'incorrect_product' | 'other';
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
        remarks: { type: String, maxlength: 2000 },
        images: {
            type: [String],
            default: [],
            validate: {
                validator: function (v: string[]) {
                    return v.length <= 20; // Prevent DoS via massive image arrays
                },
                message: 'QC images array cannot exceed 20 items'
            }
        },
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
            enum: ['ndr_unresolved', 'customer_cancellation', 'qc_failure', 'refused', 'damaged_in_transit', 'incorrect_product', 'other'],
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

// Methods with optimistic locking
RTOEventSchema.methods.updateReturnStatus = async function (
    status: string,
    metadata?: Record<string, any>
) {
    const currentVersion = this.__v;
    const updateData: any = {
        returnStatus: status,
        $inc: { __v: 1 }
    };

    if (status === 'delivered_to_warehouse') {
        updateData.actualReturnDate = new Date();
    }

    if (metadata) {
        updateData.metadata = { ...this.metadata, ...metadata };
    }

    const result = await this.model('RTOEvent').findOneAndUpdate(
        { _id: this._id, __v: currentVersion },
        updateData,
        { new: true }
    );

    if (!result) {
        throw new Error('Document was modified by another process. Please reload and try again.');
    }

    // Update current instance
    this.returnStatus = result.returnStatus;
    this.actualReturnDate = result.actualReturnDate;
    this.metadata = result.metadata;
    this.__v = result.__v;
    return this;
};

RTOEventSchema.methods.recordQC = async function (result: IQCResult) {
    const currentVersion = this.__v;
    const updateResult = await this.model('RTOEvent').findOneAndUpdate(
        { _id: this._id, __v: currentVersion },
        {
            qcResult: result,
            returnStatus: 'qc_completed',
            $inc: { __v: 1 }
        },
        { new: true }
    );

    if (!updateResult) {
        throw new Error('Document was modified by another process. Please reload and try again.');
    }

    this.qcResult = updateResult.qcResult;
    this.returnStatus = updateResult.returnStatus;
    this.__v = updateResult.__v;
    return this;
};

const RTOEvent = mongoose.model<IRTOEvent, IRTOEventModel>('RTOEvent', RTOEventSchema);

export default RTOEvent;
