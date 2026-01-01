import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * NDREvent Model
 *
 * Tracks Non-Delivery Report events from courier tracking updates.
 *
 * NDR Types:
 * - address_issue: Wrong/incomplete address, house locked
 * - customer_unavailable: Customer not available, phone switched off
 * - refused: Customer refused delivery
 * - payment_issue: COD not accepted, payment declined
 * - other: Any other reason
 */

export interface INDRResolutionAction {
    action: string;
    actionType: 'call_customer' | 'send_whatsapp' | 'send_email' | 'update_address' | 'request_reattempt' | 'trigger_rto' | 'manual';
    takenAt: Date;
    takenBy: string;
    result: 'success' | 'failed' | 'pending' | 'skipped';
    metadata?: Record<string, any>;
}

export interface INDREvent extends Document {
    shipment: mongoose.Types.ObjectId;
    awb: string;
    ndrReason: string;
    ndrReasonClassified?: string;
    ndrType: 'address_issue' | 'customer_unavailable' | 'refused' | 'payment_issue' | 'other';
    detectedAt: Date;
    courierRemarks?: string;
    attemptNumber: number;
    status: 'detected' | 'in_resolution' | 'resolved' | 'escalated' | 'rto_triggered';
    resolutionActions: INDRResolutionAction[];
    customerContacted: boolean;
    customerResponse?: string;
    resolutionDeadline: Date;
    resolvedAt?: Date;
    resolvedBy?: string;
    resolutionMethod?: string;
    autoRtoTriggered: boolean;
    company: mongoose.Types.ObjectId;
    order: mongoose.Types.ObjectId;
    classificationConfidence?: number;
    classificationSource: 'openai' | 'keyword' | 'manual';
    createdAt: Date;
    updatedAt: Date;
    // Methods
    addResolutionAction(action: INDRResolutionAction): Promise<INDREvent>;
    markResolved(resolvedBy: string, method: string): Promise<INDREvent>;
    escalate(): Promise<INDREvent>;
    triggerRTO(): Promise<INDREvent>;
}

interface INDREventModel extends Model<INDREvent> {
    createNDREvent(data: Partial<INDREvent>): Promise<INDREvent>;
    getPendingNDRs(companyId: string): Promise<INDREvent[]>;
    getExpiredNDRs(): Promise<INDREvent[]>;
}

const ResolutionActionSchema = new Schema<INDRResolutionAction>(
    {
        action: { type: String, required: true },
        actionType: {
            type: String,
            enum: ['call_customer', 'send_whatsapp', 'send_email', 'update_address', 'request_reattempt', 'trigger_rto', 'manual'],
            required: true,
        },
        takenAt: { type: Date, default: Date.now },
        takenBy: { type: String, required: true },
        result: {
            type: String,
            enum: ['success', 'failed', 'pending', 'skipped'],
            default: 'pending',
        },
        metadata: { type: Schema.Types.Mixed },
    },
    { _id: false }
);

const NDREventSchema = new Schema<INDREvent>(
    {
        shipment: {
            type: Schema.Types.ObjectId,
            ref: 'Shipment',
            required: true,
            index: true,
        },
        awb: {
            type: String,
            required: true,
            index: true,
        },
        ndrReason: {
            type: String,
            required: true,
        },
        ndrReasonClassified: {
            type: String,
        },
        ndrType: {
            type: String,
            enum: ['address_issue', 'customer_unavailable', 'refused', 'payment_issue', 'other'],
            default: 'other',
            index: true,
        },
        detectedAt: {
            type: Date,
            default: Date.now,
            index: true,
        },
        courierRemarks: {
            type: String,
        },
        attemptNumber: {
            type: Number,
            default: 1,
        },
        status: {
            type: String,
            enum: ['detected', 'in_resolution', 'resolved', 'escalated', 'rto_triggered'],
            default: 'detected',
            index: true,
        },
        resolutionActions: {
            type: [ResolutionActionSchema],
            default: [],
        },
        customerContacted: {
            type: Boolean,
            default: false,
        },
        customerResponse: {
            type: String,
        },
        resolutionDeadline: {
            type: Date,
            required: true,
            index: true,
        },
        resolvedAt: {
            type: Date,
        },
        resolvedBy: {
            type: String,
        },
        resolutionMethod: {
            type: String,
        },
        autoRtoTriggered: {
            type: Boolean,
            default: false,
        },
        company: {
            type: Schema.Types.ObjectId,
            ref: 'Company',
            required: true,
            index: true,
        },
        order: {
            type: Schema.Types.ObjectId,
            ref: 'Order',
            required: true,
            index: true,
        },
        classificationConfidence: {
            type: Number,
            min: 0,
            max: 100,
        },
        classificationSource: {
            type: String,
            enum: ['openai', 'keyword', 'manual'],
            default: 'keyword',
        },
    },
    {
        timestamps: true,
        collection: 'ndr_events',
    }
);

// Indexes
NDREventSchema.index({ company: 1, status: 1 });
NDREventSchema.index({ company: 1, detectedAt: -1 });
NDREventSchema.index({ resolutionDeadline: 1, status: 1 });
NDREventSchema.index({ awb: 1, detectedAt: -1 });

// Static: Create NDR event with auto-calculated deadline
NDREventSchema.statics.createNDREvent = async function (
    data: Partial<INDREvent>
): Promise<INDREvent> {
    // Calculate 48-hour resolution deadline
    const resolutionDeadline = data.resolutionDeadline || new Date(Date.now() + 48 * 60 * 60 * 1000);

    return this.create({
        ...data,
        resolutionDeadline,
        detectedAt: data.detectedAt || new Date(),
    });
};

// Static: Get pending NDRs for a company
NDREventSchema.statics.getPendingNDRs = async function (
    companyId: string
): Promise<INDREvent[]> {
    return this.find({
        company: companyId,
        status: { $in: ['detected', 'in_resolution'] },
    })
        .sort({ detectedAt: -1 })
        .populate('shipment order');
};

// Static: Get NDRs past deadline that haven't triggered RTO
NDREventSchema.statics.getExpiredNDRs = async function (): Promise<INDREvent[]> {
    return this.find({
        status: { $in: ['detected', 'in_resolution'] },
        resolutionDeadline: { $lt: new Date() },
        autoRtoTriggered: false,
    }).populate('shipment order');
};

// Methods
NDREventSchema.methods.addResolutionAction = function (action: INDRResolutionAction) {
    this.resolutionActions.push(action);
    return this.save();
};

NDREventSchema.methods.markResolved = function (
    resolvedBy: string,
    method: string
) {
    this.status = 'resolved';
    this.resolvedAt = new Date();
    this.resolvedBy = resolvedBy;
    this.resolutionMethod = method;
    return this.save();
};

NDREventSchema.methods.escalate = function () {
    this.status = 'escalated';
    return this.save();
};

NDREventSchema.methods.triggerRTO = function () {
    this.status = 'rto_triggered';
    this.autoRtoTriggered = true;
    return this.save();
};

const NDREvent = mongoose.model<INDREvent, INDREventModel>('NDREvent', NDREventSchema);

export default NDREvent;
