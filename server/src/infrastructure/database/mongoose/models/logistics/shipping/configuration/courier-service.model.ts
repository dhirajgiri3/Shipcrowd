import mongoose, { Document, Schema } from 'mongoose';

export interface ICourierService extends Document {
    companyId: mongoose.Types.ObjectId;
    provider: 'velocity' | 'delhivery' | 'ekart';
    integrationId: mongoose.Types.ObjectId;
    serviceCode: string;
    providerServiceId?: string;
    displayName: string;
    serviceType: 'surface' | 'express' | 'air' | 'standard';
    status: 'active' | 'inactive' | 'hidden';
    constraints: {
        minWeightKg?: number;
        maxWeightKg?: number;
        maxCodValue?: number;
        maxPrepaidValue?: number;
        maxDimensions?: {
            length?: number;
            width?: number;
            height?: number;
        };
        paymentModes?: Array<'cod' | 'prepaid' | 'pickup' | 'repl'>;
    };
    sla: {
        eddMinDays?: number;
        eddMaxDays?: number;
    };
    zoneSupport: string[];
    rating?: number;
    source: 'manual' | 'synced';
    metadata?: {
        notes?: string;
        syncedAt?: Date;
        syncedBy?: mongoose.Types.ObjectId;
    };
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const CourierServiceSchema = new Schema<ICourierService>(
    {
        companyId: {
            type: Schema.Types.ObjectId,
            ref: 'Company',
            required: true,
            index: true,
        },
        provider: {
            type: String,
            enum: ['velocity', 'delhivery', 'ekart'],
            required: true,
            index: true,
        },
        integrationId: {
            type: Schema.Types.ObjectId,
            ref: 'Integration',
            required: true,
            index: true,
        },
        serviceCode: {
            type: String,
            required: true,
            trim: true,
            uppercase: true,
        },
        providerServiceId: {
            type: String,
            trim: true,
        },
        displayName: {
            type: String,
            required: true,
            trim: true,
        },
        serviceType: {
            type: String,
            enum: ['surface', 'express', 'air', 'standard'],
            required: true,
            index: true,
        },
        status: {
            type: String,
            enum: ['active', 'inactive', 'hidden'],
            default: 'active',
            index: true,
        },
        constraints: {
            minWeightKg: {
                type: Number,
                min: 0,
            },
            maxWeightKg: {
                type: Number,
                min: 0,
            },
            maxCodValue: {
                type: Number,
                min: 0,
            },
            maxPrepaidValue: {
                type: Number,
                min: 0,
            },
            maxDimensions: {
                length: { type: Number, min: 0 },
                width: { type: Number, min: 0 },
                height: { type: Number, min: 0 },
            },
            paymentModes: [
                {
                    type: String,
                    enum: ['cod', 'prepaid', 'pickup', 'repl'],
                },
            ],
        },
        sla: {
            eddMinDays: {
                type: Number,
                min: 0,
            },
            eddMaxDays: {
                type: Number,
                min: 0,
            },
        },
        zoneSupport: {
            type: [String],
            default: [],
        },
        rating: {
            type: Number,
            min: 0,
            max: 5,
            default: 0,
        },
        source: {
            type: String,
            enum: ['manual', 'synced'],
            default: 'manual',
        },
        metadata: {
            notes: String,
            syncedAt: Date,
            syncedBy: {
                type: Schema.Types.ObjectId,
                ref: 'User',
            },
        },
        isDeleted: {
            type: Boolean,
            default: false,
            index: true,
        },
    },
    {
        timestamps: true,
    }
);

CourierServiceSchema.index({ companyId: 1, provider: 1, status: 1 });
CourierServiceSchema.index({ companyId: 1, serviceCode: 1 }, { unique: true });
CourierServiceSchema.index({ integrationId: 1, providerServiceId: 1 });
CourierServiceSchema.index({ companyId: 1, isDeleted: 1, createdAt: -1 });

const CourierService = mongoose.model<ICourierService>('CourierService', CourierServiceSchema);
export default CourierService;
