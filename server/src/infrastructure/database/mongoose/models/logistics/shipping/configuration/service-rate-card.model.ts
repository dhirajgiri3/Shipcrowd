import mongoose, { Document, Schema } from 'mongoose';

export interface IServiceRateCard extends Document {
    companyId: mongoose.Types.ObjectId;
    serviceId: mongoose.Types.ObjectId;
    cardType: 'cost' | 'sell';
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
    metadata?: {
        version: number;
        importedFrom?: string;
        importedAt?: Date;
        approvedBy?: mongoose.Types.ObjectId;
        approvedAt?: Date;
    };
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const ServiceRateCardSchema = new Schema<IServiceRateCard>(
    {
        companyId: {
            type: Schema.Types.ObjectId,
            ref: 'Company',
            required: true,
        },
        serviceId: {
            type: Schema.Types.ObjectId,
            ref: 'CourierService',
            required: true,
        },
        cardType: {
            type: String,
            enum: ['cost', 'sell'],
            required: true,
        },
        sourceMode: {
            type: String,
            enum: ['LIVE_API', 'TABLE', 'HYBRID'],
            default: 'TABLE',
        },
        currency: {
            type: String,
            enum: ['INR'],
            default: 'INR',
        },
        effectiveDates: {
            startDate: {
                type: Date,
                required: true,
            },
            endDate: Date,
        },
        status: {
            type: String,
            enum: ['draft', 'active', 'inactive'],
            default: 'draft',
        },
        calculation: {
            weightBasis: {
                type: String,
                enum: ['actual', 'volumetric', 'max'],
                default: 'max',
            },
            roundingUnitKg: {
                type: Number,
                min: 0.1,
                default: 0.5,
            },
            roundingMode: {
                type: String,
                enum: ['ceil', 'floor', 'nearest'],
                default: 'ceil',
            },
            dimDivisor: {
                type: Number,
                min: 1,
                default: 5000,
            },
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
                    type: {
                        type: String,
                        enum: ['percentage', 'flat', 'slab'],
                    },
                    basis: {
                        type: String,
                        enum: ['orderValue', 'codAmount'],
                        default: 'orderValue',
                    },
                    percentage: { type: Number, min: 0 },
                    minCharge: { type: Number, min: 0 },
                    maxCharge: { type: Number, min: 0 },
                    slabs: [
                        {
                            min: { type: Number, min: 0, required: true },
                            max: { type: Number, min: 0, required: true },
                            value: { type: Number, min: 0, required: true },
                            type: {
                                type: String,
                                enum: ['flat', 'percentage'],
                                required: true,
                            },
                        },
                    ],
                },
                fuelSurcharge: {
                    percentage: { type: Number, min: 0, default: 0 },
                    base: { type: String, enum: ['freight', 'freight_cod'], default: 'freight' },
                },
                rtoRule: {
                    type: {
                        type: String,
                        enum: ['flat', 'percentage', 'forward_mirror'],
                        default: 'percentage',
                    },
                    amount: { type: Number, min: 0 },
                    percentage: { type: Number, min: 0, default: 0 },
                    minCharge: { type: Number, min: 0, default: 0 },
                    maxCharge: { type: Number, min: 0 },
                },
            },
        ],
        metadata: {
            version: { type: Number, default: 1, min: 1 },
            importedFrom: String,
            importedAt: Date,
            approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
            approvedAt: Date,
        },
        isDeleted: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

ServiceRateCardSchema.index(
    { companyId: 1, serviceId: 1, cardType: 1, status: 1 },
    { name: 'idx_service_rate_card_company_service_type_status' }
);
ServiceRateCardSchema.index(
    { companyId: 1, cardType: 1, 'effectiveDates.startDate': 1 },
    { name: 'idx_service_rate_card_company_card_type_start_date' }
);
ServiceRateCardSchema.index(
    { companyId: 1, isDeleted: 1, createdAt: -1 },
    { name: 'idx_service_rate_card_company_deleted_created_at' }
);

const ServiceRateCard = mongoose.model<IServiceRateCard>('ServiceRateCard', ServiceRateCardSchema);
export default ServiceRateCard;
