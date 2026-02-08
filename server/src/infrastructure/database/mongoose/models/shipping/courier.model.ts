import mongoose, { Schema, Document } from 'mongoose';

export interface ICourier extends Document {
    name: string; // Internal ID (e.g., 'velocity', 'delhivery')
    displayName: string; // Display name (e.g., 'Velocity Shipfast')
    logo?: string;
    website?: string;

    // Service Configuration
    serviceTypes: string[]; // ['surface', 'express', 'air']
    regions: string[]; // ['Pan India', 'Metro']

    // Status
    isActive: boolean;
    isApiIntegrated: boolean;

    // Operational limits
    codEnabled: boolean;
    pickupEnabled: boolean;
    trackingEnabled: boolean;
    codLimit: number;
    weightLimit: number;

    // Meta
    createdAt: Date;
    updatedAt: Date;
}

const courierSchema = new Schema<ICourier>(
    {
        name: { type: String, required: true, unique: true, lowercase: true, trim: true },
        displayName: { type: String, required: true },
        logo: { type: String },
        website: { type: String },

        serviceTypes: [{ type: String, trim: true }],
        regions: [{ type: String }],

        isActive: { type: Boolean, default: true },
        isApiIntegrated: { type: Boolean, default: false },

        codEnabled: { type: Boolean, default: true },
        pickupEnabled: { type: Boolean, default: true },
        trackingEnabled: { type: Boolean, default: true },

        codLimit: { type: Number, default: 50000 },
        weightLimit: { type: Number, default: 50 },
    },
    {
        timestamps: true,
        collection: 'couriers'
    }
);

// Indexes
courierSchema.index({ isActive: 1 });
// courierSchema.index({ name: 1 }); // Already indexed by unique: true

const Courier = mongoose.model<ICourier>('Courier', courierSchema);

export default Courier;
