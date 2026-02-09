import mongoose, { Document, Schema } from 'mongoose';

export interface ICarrierBillingRecord extends Document {
    companyId: mongoose.Types.ObjectId;
    shipmentId?: mongoose.Types.ObjectId;
    provider: 'velocity' | 'delhivery' | 'ekart';
    awb: string;
    invoiceRef?: string;
    remittanceRef?: string;
    billedComponents: {
        freight?: number;
        cod?: number;
        fuel?: number;
        rto?: number;
        reversePickup?: number;
        qc?: number;
        taxes?: number;
        misc?: number;
    };
    billedTotal: number;
    currency: 'INR';
    source: 'api' | 'webhook' | 'mis' | 'manual';
    billedAt: Date;
    metadata?: {
        rawProviderPayload?: any;
        importedBy?: mongoose.Types.ObjectId;
        importedAt?: Date;
        notes?: string;
    };
    createdAt: Date;
    updatedAt: Date;
}

const CarrierBillingRecordSchema = new Schema<ICarrierBillingRecord>(
    {
        companyId: {
            type: Schema.Types.ObjectId,
            ref: 'Company',
            required: true,
            index: true,
        },
        shipmentId: {
            type: Schema.Types.ObjectId,
            ref: 'Shipment',
        },
        provider: {
            type: String,
            enum: ['velocity', 'delhivery', 'ekart'],
            required: true,
            index: true,
        },
        awb: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        invoiceRef: {
            type: String,
            trim: true,
        },
        remittanceRef: {
            type: String,
            trim: true,
        },
        billedComponents: {
            freight: { type: Number, min: 0, default: 0 },
            cod: { type: Number, min: 0, default: 0 },
            fuel: { type: Number, min: 0, default: 0 },
            rto: { type: Number, min: 0, default: 0 },
            reversePickup: { type: Number, min: 0, default: 0 },
            qc: { type: Number, min: 0, default: 0 },
            taxes: { type: Number, min: 0, default: 0 },
            misc: { type: Number, min: 0, default: 0 },
        },
        billedTotal: {
            type: Number,
            required: true,
            min: 0,
        },
        currency: {
            type: String,
            enum: ['INR'],
            default: 'INR',
        },
        source: {
            type: String,
            enum: ['api', 'webhook', 'mis', 'manual'],
            required: true,
            index: true,
        },
        billedAt: {
            type: Date,
            required: true,
            index: true,
        },
        metadata: {
            rawProviderPayload: Schema.Types.Mixed,
            importedBy: {
                type: Schema.Types.ObjectId,
                ref: 'User',
            },
            importedAt: Date,
            notes: String,
        },
    },
    {
        timestamps: true,
    }
);

CarrierBillingRecordSchema.index({ companyId: 1, awb: 1, provider: 1 });
CarrierBillingRecordSchema.index({ companyId: 1, shipmentId: 1 });
CarrierBillingRecordSchema.index({ companyId: 1, billedAt: -1 });

const CarrierBillingRecord = mongoose.model<ICarrierBillingRecord>('CarrierBillingRecord', CarrierBillingRecordSchema);
export default CarrierBillingRecord;
