import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * RTOEvent Model
 *
 * Tracks Return To Origin events.
 */

export interface IQCPhoto {
    url: string;
    label?: string;
}

export interface IQCResult {
    passed: boolean;
    remarks?: string;
    images?: string[];
    inspectedBy?: string;
    inspectedAt?: Date;
    condition?: string;
    damageTypes?: string[];
    photos?: IQCPhoto[];
}

export type RTODispositionAction = 'restock' | 'refurb' | 'dispose' | 'claim';

export interface IRTODisposition {
    action: RTODispositionAction;
    decidedAt: Date;
    decidedBy: string;
    automated: boolean;
    reason?: string;
    notes?: string;
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
    returnStatus: 'initiated' | 'in_transit' | 'delivered_to_warehouse' | 'qc_pending' | 'qc_completed' | 'restocked' | 'disposed' | 'refurbishing' | 'claim_filed';
    qcResult?: IQCResult;
    disposition?: IRTODisposition;
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
    getByShipment(shipmentId: string): Promise<IRTOEvent | null>;
}

const QCPhotoSchema = new Schema<IQCPhoto>(
    { url: { type: String, required: true }, label: { type: String } },
    { _id: false }
);

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
        condition: { type: String, maxlength: 1000 },
        damageTypes: {
            type: [String],
            default: [],
            validate: {
                validator: function (v: string[]) {
                    return v.length <= 20;
                },
                message: 'damageTypes cannot exceed 20 items'
            }
        },
        photos: {
            type: [QCPhotoSchema],
            default: [],
            validate: {
                validator: function (v: IQCPhoto[]) {
                    return v.length <= 20;
                },
                message: 'QC photos array cannot exceed 20 items'
            }
        },
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
            enum: ['initiated', 'in_transit', 'delivered_to_warehouse', 'qc_pending', 'qc_completed', 'restocked', 'disposed', 'refurbishing', 'claim_filed'],
            default: 'initiated',
            index: true,
        },
        qcResult: {
            type: QCResultSchema,
        },
        disposition: {
            type: new Schema<IRTODisposition>(
                {
                    action: { type: String, enum: ['restock', 'refurb', 'dispose', 'claim'], required: true },
                    decidedAt: { type: Date, required: true },
                    decidedBy: { type: String, required: true },
                    automated: { type: Boolean, default: false },
                    reason: { type: String },
                    notes: { type: String, maxlength: 500 },
                },
                { _id: false }
            ),
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
            // Issue #34: Validate metadata size (10KB max)
            validate: {
                validator: function (v: any) {
                    if (!v) return true;
                    const size = JSON.stringify(v).length;
                    return size <= 10240; // 10KB limit
                },
                message: 'Metadata size exceeds 10KB limit',
            },
        },
    },
    {
        timestamps: true,
        collection: 'rto_events',
    }
);

// State transition validation (Issue #10)
const RTO_STATUS_TRANSITIONS: Record<string, string[]> = {
    initiated: ['in_transit', 'delivered_to_warehouse'],
    in_transit: ['delivered_to_warehouse'],
    delivered_to_warehouse: ['qc_pending'],
    qc_pending: ['qc_completed'],
    qc_completed: ['restocked', 'disposed', 'refurbishing', 'claim_filed'],
    restocked: [],
    disposed: [],
    refurbishing: ['restocked', 'disposed'],
    claim_filed: ['restocked', 'disposed'],
};

// Helper method to validate state transitions
RTOEventSchema.methods.canTransitionTo = function (newStatus: string): boolean {
    const currentStatus = this.returnStatus;
    const allowedTransitions = RTO_STATUS_TRANSITIONS[currentStatus] || [];
    return allowedTransitions.includes(newStatus);
};

// Indexes
RTOEventSchema.index({ company: 1, returnStatus: 1 });
RTOEventSchema.index({ company: 1, triggeredAt: -1 });
RTOEventSchema.index({ warehouse: 1, returnStatus: 1 });

// CRITICAL: Unique partial index to prevent duplicate RTOs (Issue #4)
// Prevents multiple active RTOs for same shipment at database level
RTOEventSchema.index(
    { shipment: 1 },
    {
        unique: true,
        partialFilterExpression: {
            returnStatus: {
                $in: ['initiated', 'in_transit', 'delivered_to_warehouse', 'qc_pending', 'qc_completed', 'refurbishing', 'claim_filed']
            }
        },
        name: 'unique_active_rto_per_shipment'
    }
);

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
    // STATE TRANSITION VALIDATION (Issue #10)
    if (!this.canTransitionTo(status)) {
        throw new Error(
            `Invalid state transition from '${this.returnStatus}' to '${status}'. ` +
            `Allowed transitions: ${RTO_STATUS_TRANSITIONS[this.returnStatus]?.join(', ') || 'none'}`
        );
    }

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
