import mongoose, { Document, Schema } from 'mongoose';

export interface IPreventionEvent extends Document {
    companyId: mongoose.Types.ObjectId;
    orderId?: mongoose.Types.ObjectId;
    eventType: 'address_validation' | 'phone_verification' | 'risk_scoring' | 'cod_verification';
    action: 'blocked' | 'flagged' | 'passed';
    reason?: string;
    metadata?: any;
    createdAt: Date;
}

const PreventionEventSchema = new Schema<IPreventionEvent>(
    {
        companyId: {
            type: Schema.Types.ObjectId,
            ref: 'Company',
            required: true,
            index: true,
        },
        orderId: {
            type: Schema.Types.ObjectId,
            ref: 'Order',
            index: true,
        },
        eventType: {
            type: String,
            enum: ['address_validation', 'phone_verification', 'risk_scoring', 'cod_verification'],
            required: true,
            index: true,
        },
        action: {
            type: String,
            enum: ['blocked', 'flagged', 'passed'],
            required: true,
        },
        reason: {
            type: String,
        },
        metadata: {
            type: Schema.Types.Mixed,
        },
    },
    {
        timestamps: { createdAt: true, updatedAt: false }, // Only createdAt is needed
    }
);

// Indexes for analytics
PreventionEventSchema.index({ companyId: 1, eventType: 1, createdAt: -1 });
PreventionEventSchema.index({ companyId: 1, action: 1, createdAt: -1 });

const PreventionEvent = mongoose.model<IPreventionEvent>('PreventionEvent', PreventionEventSchema);
export default PreventionEvent;
