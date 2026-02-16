import mongoose, { Document, Schema } from 'mongoose';

export interface ISellerRateCard extends Document {
    companyId: mongoose.Types.ObjectId;
    sellerId: mongoose.Types.ObjectId;
    serviceId: mongoose.Types.ObjectId;
    cardType: 'sell';
    flowType: 'forward' | 'reverse';
    category: 'custom';
    sourceMode: 'LIVE_API' | 'TABLE' | 'HYBRID';
    currency: 'INR';
    effectiveDates: {
        startDate: Date;
        endDate?: Date;
    };
    status: 'draft' | 'active' | 'inactive';
    calculation: {
        weightBasis: 'actual' | 'volumetric' | 'max';
        roundingUnitKg: number;
        roundingMode: 'ceil' | 'floor' | 'nearest';
        dimDivisor: number;
    };
    zoneRules: Array<{
        zoneKey: string;
        slabs: Array<{
            minKg: number;
            maxKg: number;
            charge: number;
        }>;
        additionalPerKg?: number;
        codRule?: {
            type: 'percentage' | 'flat' | 'slab';
            basis?: 'orderValue' | 'codAmount';
            percentage?: number;
            minCharge?: number;
            maxCharge?: number;
            slabs?: Array<{
                min: number;
                max: number;
                value: number;
                type: 'flat' | 'percentage';
            }>;
        };
        fuelSurcharge?: {
            percentage?: number;
            base?: 'freight' | 'freight_cod';
        };
        rtoRule?: {
            type?: 'flat' | 'percentage' | 'forward_mirror';
            amount?: number;
            percentage?: number;
            minCharge?: number;
            maxCharge?: number;
        };
    }>;
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const SellerRateCardSchema = new Schema<ISellerRateCard>(
    {
        companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
        sellerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        serviceId: { type: Schema.Types.ObjectId, ref: 'CourierService', required: true },
        cardType: { type: String, enum: ['sell'], default: 'sell', required: true },
        flowType: { type: String, enum: ['forward', 'reverse'], default: 'forward', required: true },
        category: { type: String, enum: ['custom'], default: 'custom', required: true },
        sourceMode: { type: String, enum: ['LIVE_API', 'TABLE', 'HYBRID'], default: 'TABLE' },
        currency: { type: String, enum: ['INR'], default: 'INR' },
        effectiveDates: {
            startDate: { type: Date, required: true },
            endDate: Date,
        },
        status: { type: String, enum: ['draft', 'active', 'inactive'], default: 'draft' },
        calculation: {
            weightBasis: { type: String, enum: ['actual', 'volumetric', 'max'], default: 'max' },
            roundingUnitKg: { type: Number, min: 0.1, default: 0.5 },
            roundingMode: { type: String, enum: ['ceil', 'floor', 'nearest'], default: 'ceil' },
            dimDivisor: { type: Number, min: 1, default: 5000 },
        },
        zoneRules: [
            {
                zoneKey: { type: String, required: true, trim: true },
                slabs: [
                    {
                        minKg: { type: Number, min: 0, required: true },
                        maxKg: { type: Number, min: 0, required: true },
                        charge: { type: Number, min: 0, required: true },
                    },
                ],
                additionalPerKg: { type: Number, min: 0, default: 0 },
                codRule: {
                    type: { type: String, enum: ['percentage', 'flat', 'slab'] },
                    basis: { type: String, enum: ['orderValue', 'codAmount'], default: 'orderValue' },
                    percentage: { type: Number, min: 0 },
                    minCharge: { type: Number, min: 0 },
                    maxCharge: { type: Number, min: 0 },
                    slabs: [
                        {
                            min: { type: Number, min: 0, required: true },
                            max: { type: Number, min: 0, required: true },
                            value: { type: Number, min: 0, required: true },
                            type: { type: String, enum: ['flat', 'percentage'], required: true },
                        },
                    ],
                },
                fuelSurcharge: {
                    percentage: { type: Number, min: 0, default: 0 },
                    base: { type: String, enum: ['freight', 'freight_cod'], default: 'freight' },
                },
                rtoRule: {
                    type: { type: String, enum: ['flat', 'percentage', 'forward_mirror'], default: 'percentage' },
                    amount: { type: Number, min: 0 },
                    percentage: { type: Number, min: 0, default: 0 },
                    minCharge: { type: Number, min: 0, default: 0 },
                    maxCharge: { type: Number, min: 0 },
                },
            },
        ],
        isDeleted: { type: Boolean, default: false },
    },
    { timestamps: true }
);

SellerRateCardSchema.index(
    { companyId: 1, sellerId: 1, serviceId: 1, flowType: 1, status: 1 },
    { name: 'idx_seller_rate_card_company_seller_service_flow_status' }
);

const SellerRateCard = mongoose.model<ISellerRateCard>('SellerRateCard', SellerRateCardSchema);
export default SellerRateCard;
