import { Schema, model, Document } from 'mongoose';

/**
 * Pincode Interface
 * Represents an Indian pincode with serviceability data
 */
export interface IPincode extends Document {
    pincode: string; // 6-digit code
    postOffice: string;
    district: string;
    state: string;
    city: string;
    region: 'North' | 'South' | 'East' | 'West' | 'Northeast' | 'Central';

    // Serviceability matrix (updated via courier APIs)
    serviceability: {
        delhivery: { available: boolean; lastChecked: Date };
        bluedart: { available: boolean; lastChecked: Date };
        ecom: { available: boolean; lastChecked: Date };
        dtdc: { available: boolean; lastChecked: Date };
        xpressbees: { available: boolean; lastChecked: Date };
        shadowfax: { available: boolean; lastChecked: Date };
    };

    // Coordinates for distance calculation
    coordinates?: {
        latitude: number;
        longitude: number;
    };

    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const PincodeSchema = new Schema<IPincode>(
    {
        pincode: {
            type: String,
            required: true,
            unique: true,
            index: true,
            trim: true,
            match: /^[1-9][0-9]{5}$/,
            length: 6,
        },
        postOffice: {
            type: String,
            required: true,
            trim: true,
        },
        district: {
            type: String,
            required: true,
            trim: true,
        },
        state: {
            type: String,
            required: true,
            trim: true,
        },
        city: {
            type: String,
            required: true,
            trim: true,
        },
        region: {
            type: String,
            enum: ['North', 'South', 'East', 'West', 'Northeast', 'Central'],
            required: true,
        },
        serviceability: {
            delhivery: {
                available: { type: Boolean, default: false },
                lastChecked: { type: Date, default: Date.now },
            },
            bluedart: {
                available: { type: Boolean, default: false },
                lastChecked: { type: Date, default: Date.now },
            },
            ecom: {
                available: { type: Boolean, default: false },
                lastChecked: { type: Date, default: Date.now },
            },
            dtdc: {
                available: { type: Boolean, default: false },
                lastChecked: { type: Date, default: Date.now },
            },
            xpressbees: {
                available: { type: Boolean, default: false },
                lastChecked: { type: Date, default: Date.now },
            },
            shadowfax: {
                available: { type: Boolean, default: false },
                lastChecked: { type: Date, default: Date.now },
            },
        },
        coordinates: {
            latitude: { type: Number },
            longitude: { type: Number },
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

// Indexes for faster lookups
PincodeSchema.index({ state: 1 });
PincodeSchema.index({ city: 1 });
PincodeSchema.index({ 'coordinates': '2dsphere' });

export const Pincode = model<IPincode>('Pincode', PincodeSchema);
