import mongoose, { Schema, Document } from 'mongoose';

/**
 * Courier Performance Model
 *
 * Stores historical performance metrics for intelligent rate recommendations.
 * Aggregated data used by Smart Rate Calculator to score and rank couriers.
 */

export interface ICourierPerformance extends Document {
    courierId: string; // Carrier code (e.g., 'velocity', 'delhivery')
    companyId: mongoose.Types.ObjectId;

    // Route-specific metrics
    routeMetrics: {
        originPincode: string;
        destinationPincode: string;
        zone: string;

        // Delivery performance
        avgDeliveryDays: number; // Average actual delivery time
        estimatedDeliveryDays: number; // Carrier's EDD promise
        onTimeDeliveryRate: number; // Percentage (0-100)

        // Reliability metrics
        pickupSuccessRate: number; // Percentage (0-100)
        deliverySuccessRate: number; // Percentage (0-100)
        rtoRate: number; // Return to Origin percentage (0-100)
        ndrRate: number; // Non-Delivery Report percentage (0-100)

        // Volume & recency
        totalShipments: number;
        lastUpdated: Date;
    }[];

    // City-level aggregates (broader than pincode)
    cityMetrics: {
        originCity: string;
        destinationCity: string;

        avgDeliveryDays: number;
        pickupSuccessRate: number;
        deliverySuccessRate: number;
        rtoRate: number;
        totalShipments: number;
        lastUpdated: Date;
    }[];

    // Overall performance (all routes)
    overallMetrics: {
        avgDeliveryDays: number;
        pickupSuccessRate: number;
        deliverySuccessRate: number;
        rtoRate: number;
        ndrRate: number;
        totalShipments: number;
        rating: number; // Calculated composite score (0-5)
        lastCalculated: Date;
    };

    // Performance trends
    trends: {
        deliverySpeedTrend: 'improving' | 'declining' | 'stable';
        reliabilityTrend: 'improving' | 'declining' | 'stable';
        volumeTrend: 'increasing' | 'decreasing' | 'stable';
    };

    // Methods
    getRoutePerformance(originPincode: string, destinationPincode: string): any;
    getCityPerformance(originCity: string, destinationCity: string): any;

    createdAt: Date;
    updatedAt: Date;
}

const courierPerformanceSchema = new Schema<ICourierPerformance>(
    {
        courierId: {
            type: String,
            required: true,
            index: true,
        },
        companyId: {
            type: Schema.Types.ObjectId,
            ref: 'Company',
            required: true,
            index: true,
        },

        routeMetrics: [{
            originPincode: { type: String, required: true, index: true },
            destinationPincode: { type: String, required: true, index: true },
            zone: { type: String, required: true },

            avgDeliveryDays: { type: Number, default: 0 },
            estimatedDeliveryDays: { type: Number, default: 0 },
            onTimeDeliveryRate: { type: Number, default: 0, min: 0, max: 100 },

            pickupSuccessRate: { type: Number, default: 100, min: 0, max: 100 },
            deliverySuccessRate: { type: Number, default: 100, min: 0, max: 100 },
            rtoRate: { type: Number, default: 0, min: 0, max: 100 },
            ndrRate: { type: Number, default: 0, min: 0, max: 100 },

            totalShipments: { type: Number, default: 0 },
            lastUpdated: { type: Date, default: Date.now },
        }],

        cityMetrics: [{
            originCity: { type: String, required: true },
            destinationCity: { type: String, required: true },

            avgDeliveryDays: { type: Number, default: 0 },
            pickupSuccessRate: { type: Number, default: 100, min: 0, max: 100 },
            deliverySuccessRate: { type: Number, default: 100, min: 0, max: 100 },
            rtoRate: { type: Number, default: 0, min: 0, max: 100 },
            totalShipments: { type: Number, default: 0 },
            lastUpdated: { type: Date, default: Date.now },
        }],

        overallMetrics: {
            avgDeliveryDays: { type: Number, default: 4 },
            pickupSuccessRate: { type: Number, default: 95, min: 0, max: 100 },
            deliverySuccessRate: { type: Number, default: 95, min: 0, max: 100 },
            rtoRate: { type: Number, default: 5, min: 0, max: 100 },
            ndrRate: { type: Number, default: 10, min: 0, max: 100 },
            totalShipments: { type: Number, default: 0 },
            rating: { type: Number, default: 4.0, min: 0, max: 5 },
            lastCalculated: { type: Date, default: Date.now },
        },

        trends: {
            deliverySpeedTrend: {
                type: String,
                enum: ['improving', 'declining', 'stable'],
                default: 'stable',
            },
            reliabilityTrend: {
                type: String,
                enum: ['improving', 'declining', 'stable'],
                default: 'stable',
            },
            volumeTrend: {
                type: String,
                enum: ['increasing', 'decreasing', 'stable'],
                default: 'stable',
            },
        },
    },
    {
        timestamps: true,
        collection: 'courier_performance',
    }
);

// Compound indexes for efficient lookups
courierPerformanceSchema.index({ courierId: 1, companyId: 1 });
courierPerformanceSchema.index({ 'routeMetrics.originPincode': 1, 'routeMetrics.destinationPincode': 1 });
courierPerformanceSchema.index({ 'cityMetrics.originCity': 1, 'cityMetrics.destinationCity': 1 });

// Methods
courierPerformanceSchema.methods.getRoutePerformance = function (
    originPincode: string,
    destinationPincode: string
) {
    return this.routeMetrics.find(
        (route: any) =>
            route.originPincode === originPincode &&
            route.destinationPincode === destinationPincode
    );
};

courierPerformanceSchema.methods.getCityPerformance = function (
    originCity: string,
    destinationCity: string
) {
    return this.cityMetrics.find(
        (city: any) =>
            city.originCity === originCity &&
            city.destinationCity === destinationCity
    );
};

// Static method to get or create performance record
courierPerformanceSchema.statics.getOrCreate = async function (
    courierId: string,
    companyId: string
) {
    let performance = await this.findOne({ courierId, companyId });

    if (!performance) {
        performance = await this.create({
            courierId,
            companyId,
            routeMetrics: [],
            cityMetrics: [],
            overallMetrics: {
                avgDeliveryDays: 4,
                pickupSuccessRate: 95,
                deliverySuccessRate: 95,
                rtoRate: 5,
                ndrRate: 10,
                totalShipments: 0,
                rating: 4.0,
                lastCalculated: new Date(),
            },
            trends: {
                deliverySpeedTrend: 'stable',
                reliabilityTrend: 'stable',
                volumeTrend: 'stable',
            },
        });
    }

    return performance;
};

interface ICourierPerformanceModel extends mongoose.Model<ICourierPerformance> {
    getOrCreate(courierId: string, companyId: string): Promise<ICourierPerformance>;
}

const CourierPerformance = mongoose.model<ICourierPerformance, ICourierPerformanceModel>(
    'CourierPerformance',
    courierPerformanceSchema
);

export default CourierPerformance;
