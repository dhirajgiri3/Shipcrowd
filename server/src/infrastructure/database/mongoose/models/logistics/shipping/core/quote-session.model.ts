import mongoose, { Document, Schema } from 'mongoose';

export interface IQuoteSession extends Document {
    companyId: mongoose.Types.ObjectId;
    sellerId: mongoose.Types.ObjectId;
    input: {
        fromPincode: string;
        toPincode: string;
        weight: number;
        dimensions: {
            length: number;
            width: number;
            height: number;
        };
        paymentMode: 'cod' | 'prepaid';
        orderValue: number;
        shipmentType: 'forward' | 'reverse';
    };
    options: Array<{
        optionId: string;
        provider: 'velocity' | 'delhivery' | 'ekart';
        serviceId?: mongoose.Types.ObjectId;
        serviceName: string;
        chargeableWeight: number;
        zone?: string;
        quotedAmount: number;
        costAmount: number;
        estimatedMargin: number;
        estimatedMarginPercent: number;
        eta?: {
            minDays?: number;
            maxDays?: number;
            estimatedDeliveryDate?: Date;
        };
        pricingSource: 'live' | 'table' | 'hybrid';
        confidence: 'high' | 'medium' | 'low';
        rankScore?: number;
        tags?: string[];
    }>;
    recommendation?: string;
    selectedOptionId?: string;
    providerTimeouts?: Record<string, boolean>;
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

const QuoteSessionSchema = new Schema<IQuoteSession>(
    {
        companyId: {
            type: Schema.Types.ObjectId,
            ref: 'Company',
            required: true,
            index: true,
        },
        sellerId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        input: {
            fromPincode: { type: String, required: true, trim: true },
            toPincode: { type: String, required: true, trim: true },
            weight: { type: Number, required: true, min: 0 },
            dimensions: {
                length: { type: Number, required: true, min: 0 },
                width: { type: Number, required: true, min: 0 },
                height: { type: Number, required: true, min: 0 },
            },
            paymentMode: {
                type: String,
                enum: ['cod', 'prepaid'],
                required: true,
            },
            orderValue: { type: Number, required: true, min: 0 },
            shipmentType: {
                type: String,
                enum: ['forward', 'reverse'],
                default: 'forward',
            },
        },
        options: [
            {
                optionId: { type: String, required: true },
                provider: {
                    type: String,
                    enum: ['velocity', 'delhivery', 'ekart'],
                    required: true,
                },
                serviceId: {
                    type: Schema.Types.ObjectId,
                    ref: 'CourierService',
                },
                serviceName: { type: String, required: true },
                chargeableWeight: { type: Number, min: 0, required: true },
                zone: String,
                quotedAmount: { type: Number, min: 0, required: true },
                costAmount: { type: Number, min: 0, required: true },
                estimatedMargin: { type: Number, required: true },
                estimatedMarginPercent: { type: Number, required: true },
                eta: {
                    minDays: { type: Number, min: 0 },
                    maxDays: { type: Number, min: 0 },
                    estimatedDeliveryDate: Date,
                },
                pricingSource: {
                    type: String,
                    enum: ['live', 'table', 'hybrid'],
                    default: 'table',
                },
                confidence: {
                    type: String,
                    enum: ['high', 'medium', 'low'],
                    default: 'medium',
                },
                rankScore: Number,
                tags: [String],
            },
        ],
        recommendation: String,
        selectedOptionId: String,
        providerTimeouts: {
            type: Schema.Types.Mixed,
            default: {},
        },
        expiresAt: {
            type: Date,
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

QuoteSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
QuoteSessionSchema.index({ companyId: 1, sellerId: 1, createdAt: -1 });
QuoteSessionSchema.index({ companyId: 1, recommendation: 1 });

const QuoteSession = mongoose.model<IQuoteSession>('QuoteSession', QuoteSessionSchema);
export default QuoteSession;
