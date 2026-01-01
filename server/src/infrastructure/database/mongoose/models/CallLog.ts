import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * CallLog Model
 *
 * Tracks automated call attempts and outcomes for NDR resolution.
 */

export interface IIVRResponse {
    option: number;
    timestamp: Date;
    optionText?: string;
}

export interface ICallLog extends Document {
    ndrEvent: mongoose.Types.ObjectId;
    shipment: mongoose.Types.ObjectId;
    customer: {
        name: string;
        phone: string;
    };
    callSid: string;
    callProvider: 'exotel' | 'twilio' | 'other';
    status: 'initiated' | 'ringing' | 'answered' | 'busy' | 'no_answer' | 'failed' | 'completed';
    direction: 'outbound' | 'inbound';
    duration: number;
    recordingUrl?: string;
    ivrResponses: IIVRResponse[];
    callbackScheduled: boolean;
    callbackTime?: Date;
    errorMessage?: string;
    metadata?: Record<string, any>;
    company: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

interface ICallLogModel extends Model<ICallLog> {
    getCallsForNDR(ndrEventId: string): Promise<ICallLog[]>;
    getRecentCalls(companyId: string, limit: number): Promise<ICallLog[]>;
}

const IVRResponseSchema = new Schema<IIVRResponse>(
    {
        option: { type: Number, required: true },
        timestamp: { type: Date, default: Date.now },
        optionText: { type: String },
    },
    { _id: false }
);

const CallLogSchema = new Schema<ICallLog>(
    {
        ndrEvent: {
            type: Schema.Types.ObjectId,
            ref: 'NDREvent',
            required: true,
            index: true,
        },
        shipment: {
            type: Schema.Types.ObjectId,
            ref: 'Shipment',
            required: true,
            index: true,
        },
        customer: {
            name: { type: String, required: true },
            phone: { type: String, required: true },
        },
        callSid: {
            type: String,
            required: true,
            unique: true,
        },
        callProvider: {
            type: String,
            enum: ['exotel', 'twilio', 'other'],
            default: 'exotel',
        },
        status: {
            type: String,
            enum: ['initiated', 'ringing', 'answered', 'busy', 'no_answer', 'failed', 'completed'],
            default: 'initiated',
            index: true,
        },
        direction: {
            type: String,
            enum: ['outbound', 'inbound'],
            default: 'outbound',
        },
        duration: {
            type: Number,
            default: 0,
        },
        recordingUrl: {
            type: String,
        },
        ivrResponses: {
            type: [IVRResponseSchema],
            default: [],
        },
        callbackScheduled: {
            type: Boolean,
            default: false,
        },
        callbackTime: {
            type: Date,
        },
        errorMessage: {
            type: String,
        },
        metadata: {
            type: Schema.Types.Mixed,
        },
        company: {
            type: Schema.Types.ObjectId,
            ref: 'Company',
            required: true,
            index: true,
        },
    },
    {
        timestamps: true,
        collection: 'call_logs',
    }
);

// Indexes
CallLogSchema.index({ company: 1, createdAt: -1 });
CallLogSchema.index({ ndrEvent: 1, createdAt: -1 });

// Static: Get calls for an NDR event
CallLogSchema.statics.getCallsForNDR = async function (
    ndrEventId: string
): Promise<ICallLog[]> {
    return this.find({ ndrEvent: ndrEventId }).sort({ createdAt: -1 });
};

// Static: Get recent calls for a company
CallLogSchema.statics.getRecentCalls = async function (
    companyId: string,
    limit: number = 50
): Promise<ICallLog[]> {
    return this.find({ company: companyId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('ndrEvent shipment');
};

const CallLog = mongoose.model<ICallLog, ICallLogModel>('CallLog', CallLogSchema);

export default CallLog;
