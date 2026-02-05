import mongoose, { Document, Schema } from 'mongoose';

/**
 * CarrierProfile Interface
 * 
 * Centralized carrier configuration and metadata including DIM factors,
 * weight limits, serviceability, API configuration, and health tracking
 */
export interface ICarrierProfile extends Document {
    carrierId: string; // 'delhivery', 'ekart', 'velocity'
    name: string;
    displayName: string;
    status: 'active' | 'inactive' | 'maintenance';

    // DIM factors by context
    dimFactors: {
        domestic: number;
        international?: number;
        heavy?: number;
    };

    // Weight/dimension limits
    weightLimits: {
        maxWeightKg: number;
        maxDimensions: { length: number; width: number; height: number };
    };

    // Serviceability (high-level)
    serviceability: {
        pincodesServed: number;
        statesServed: string[];
        internationalCountries?: string[];
    };

    // API configuration
    api: {
        baseUrl: string;
        timeout: number; // ms
        retryPolicy: {
            maxRetries: number;
            backoffMs: number;
        };
    };

    // Capabilities
    capabilities: {
        liveRates: boolean;
        codSupport: boolean;
        volumetricWeight: boolean;
        internationalShipping?: boolean;
        rtoSupport?: boolean;
    };

    // Health tracking
    health: {
        isHealthy: boolean;
        lastHealthCheck?: Date;
        consecutiveFailures: number;
    };

    createdAt: Date;
    updatedAt: Date;
}

const CarrierProfileSchema = new Schema<ICarrierProfile>(
    {
        carrierId: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        name: {
            type: String,
            required: true,
        },
        displayName: {
            type: String,
            required: true,
        },
        status: {
            type: String,
            enum: ['active', 'inactive', 'maintenance'],
            default: 'active',
        },
        dimFactors: {
            domestic: { type: Number, required: true, default: 5000 },
            international: { type: Number },
            heavy: { type: Number },
        },
        weightLimits: {
            maxWeightKg: { type: Number, default: 50 },
            maxDimensions: {
                length: { type: Number, default: 100 },
                width: { type: Number, default: 100 },
                height: { type: Number, default: 100 },
            },
        },
        serviceability: {
            pincodesServed: { type: Number, default: 0 },
            statesServed: { type: [String], default: [] },
            internationalCountries: { type: [String], default: [] },
        },
        api: {
            baseUrl: String,
            timeout: { type: Number, default: 5000 },
            retryPolicy: {
                maxRetries: { type: Number, default: 3 },
                backoffMs: { type: Number, default: 1000 },
            },
        },
        capabilities: {
            liveRates: { type: Boolean, default: false },
            codSupport: { type: Boolean, default: true },
            volumetricWeight: { type: Boolean, default: true },
            internationalShipping: { type: Boolean, default: false },
            rtoSupport: { type: Boolean, default: true },
        },
        health: {
            isHealthy: { type: Boolean, default: true },
            lastHealthCheck: Date,
            consecutiveFailures: { type: Number, default: 0 },
        },
    },
    { timestamps: true }
);

// Indexes
CarrierProfileSchema.index({ status: 1 });
CarrierProfileSchema.index({ 'health.isHealthy': 1 });
CarrierProfileSchema.index({ carrierId: 1, status: 1 });

// Helper method: Get DIM factor for a shipment type
CarrierProfileSchema.methods.getDimFactor = function (type: 'domestic' | 'international' | 'heavy' = 'domestic'): number {
    return this.dimFactors[type] || this.dimFactors.domestic || 5000;
};

// Helper method: Check if carrier can handle weight/dimensions
CarrierProfileSchema.methods.canHandle = function (weight: number, dimensions?: { length: number; width: number; height: number }): boolean {
    if (weight > this.weightLimits.maxWeightKg) {
        return false;
    }

    if (dimensions) {
        const limits = this.weightLimits.maxDimensions;
        if (dimensions.length > limits.length ||
            dimensions.width > limits.width ||
            dimensions.height > limits.height) {
            return false;
        }
    }

    return true;
};

// Static method: Get active carriers
CarrierProfileSchema.statics.getActiveCarriers = async function (): Promise<ICarrierProfile[]> {
    return this.find({ status: 'active', 'health.isHealthy': true }).lean();
};

// Static method: Get carrier by ID
CarrierProfileSchema.statics.getByCarrierId = async function (carrierId: string): Promise<ICarrierProfile | null> {
    return this.findOne({ carrierId: carrierId.toLowerCase() }).lean();
};

const CarrierProfile = mongoose.model<ICarrierProfile>('CarrierProfile', CarrierProfileSchema);
export default CarrierProfile;
