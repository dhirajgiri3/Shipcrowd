import mongoose, { Document, Schema } from 'mongoose';

export interface ICallLog extends Document {
    companyId: mongoose.Types.ObjectId;
    salesRepId: mongoose.Types.ObjectId;
    shipmentId: string; // Ref to Shipment ID (string based usually)
    ndrEventId?: mongoose.Types.ObjectId; // Optional link to NDR Event
    direction: 'outbound' | 'inbound';
    status: 'pending' | 'scheduled' | 'draining' | 'completed' | 'failed';
    outcome: 'connected' | 'busy' | 'wrong_number' | 'no_answer' | 'delivered' | 'rto_request' | 'reattempt_request';
    scheduledAt?: Date;
    startedAt?: Date;
    endedAt?: Date;
    duration?: number; // In seconds
    recordingUrl?: string;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}

const CallLogSchema = new Schema<ICallLog>(
    {
        companyId: {
            type: Schema.Types.ObjectId,
            ref: 'Company',
            required: true,
            index: true,
        },
        salesRepId: {
            type: Schema.Types.ObjectId,
            ref: 'SalesRepresentative',
            required: true,
            index: true,
        },
        shipmentId: {
            type: String,
            required: true,
            index: true,
        },
        ndrEventId: {
            type: Schema.Types.ObjectId,
            ref: 'NDREvent', // To be verified
            index: true,
        },
        direction: {
            type: String,
            enum: ['outbound', 'inbound'],
            default: 'outbound',
        },
        status: {
            type: String,
            enum: ['pending', 'scheduled', 'draining', 'completed', 'failed'],
            default: 'pending',
            index: true,
        },
        outcome: {
            type: String,
            enum: ['connected', 'busy', 'wrong_number', 'no_answer', 'delivered', 'rto_request', 'reattempt_request', null],
            default: null,
        },
        scheduledAt: { type: Date, index: true },
        startedAt: { type: Date },
        endedAt: { type: Date },
        duration: { type: Number },
        recordingUrl: { type: String },
        notes: { type: String },
    },
    {
        timestamps: true,
    }
);

// Index for getting pending calls for a rep
CallLogSchema.index({ salesRepId: 1, status: 1, scheduledAt: 1 });

const CallLog = mongoose.models.CallLog || mongoose.model<ICallLog>('CallLog', CallLogSchema);
export default CallLog;
