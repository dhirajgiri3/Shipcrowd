import CarrierProfile from '../../mongoose/models/logistics/shipping/configuration/carrier-profile.model';
import logger from '../../../../shared/logger/winston.logger';

/**
 * Carrier Profiles Seeder
 * 
 * Seeds initial carrier profile data for Delhivery, Ekart, and Velocity
 */

export async function seedCarrierProfiles(): Promise<void> {
    try {
        logger.info('[CarrierProfileSeeder] Starting carrier profiles seeding...');

        const profiles = [
            {
                carrierId: 'delhivery',
                name: 'Delhivery',
                displayName: 'Delhivery Express',
                status: 'active' as const,
                dimFactors: {
                    domestic: 5000,
                    international: 5000,
                },
                weightLimits: {
                    maxWeightKg: 50,
                    maxDimensions: { length: 100, width: 100, height: 100 },
                },
                serviceability: {
                    pincodesServed: 18000,
                    statesServed: ['all'],
                    internationalCountries: [],
                },
                api: {
                    baseUrl: process.env.DELHIVERY_API_URL || 'https://track.delhivery.com/api',
                    timeout: 5000,
                    retryPolicy: {
                        maxRetries: 3,
                        backoffMs: 1000,
                    },
                },
                capabilities: {
                    liveRates: true,
                    codSupport: true,
                    volumetricWeight: true,
                    internationalShipping: false,
                    rtoSupport: true,
                },
                health: {
                    isHealthy: true,
                    consecutiveFailures: 0,
                },
            },
            {
                carrierId: 'ekart',
                name: 'Ekart Logistics',
                displayName: 'Ekart',
                status: 'active' as const,
                dimFactors: {
                    domestic: 4750, // Ekart uses a different DIM factor
                    international: 4750,
                },
                weightLimits: {
                    maxWeightKg: 50,
                    maxDimensions: { length: 100, width: 100, height: 100 },
                },
                serviceability: {
                    pincodesServed: 4000,
                    statesServed: ['all'],
                    internationalCountries: [],
                },
                api: {
                    baseUrl: process.env.EKART_API_URL || 'https://api.ekartlogistics.com',
                    timeout: 5000,
                    retryPolicy: {
                        maxRetries: 3,
                        backoffMs: 1000,
                    },
                },
                capabilities: {
                    liveRates: true,
                    codSupport: true,
                    volumetricWeight: true,
                    internationalShipping: false,
                    rtoSupport: true,
                },
                health: {
                    isHealthy: true,
                    consecutiveFailures: 0,
                },
            },
            {
                carrierId: 'velocity',
                name: 'Velocity Shipfast',
                displayName: 'Velocity',
                status: 'active' as const,
                dimFactors: {
                    domestic: 5000,
                },
                weightLimits: {
                    maxWeightKg: 50,
                    maxDimensions: { length: 100, width: 100, height: 100 },
                },
                serviceability: {
                    pincodesServed: 0, // Uses internal serviceability
                    statesServed: ['all'],
                    internationalCountries: [],
                },
                api: {
                    baseUrl: process.env.VELOCITY_API_URL || '',
                    timeout: 5000,
                    retryPolicy: {
                        maxRetries: 3,
                        backoffMs: 1000,
                    },
                },
                capabilities: {
                    liveRates: false, // Uses internal rate cards
                    codSupport: true,
                    volumetricWeight: true,
                    internationalShipping: false,
                    rtoSupport: true,
                },
                health: {
                    isHealthy: true,
                    consecutiveFailures: 0,
                },
            },
        ];

        let seededCount = 0;
        for (const profile of profiles) {
            await CarrierProfile.findOneAndUpdate(
                { carrierId: profile.carrierId },
                profile,
                { upsert: true, new: true }
            );
            seededCount++;
            logger.info(`[CarrierProfileSeeder] Seeded profile for ${profile.displayName}`);
        }

        logger.info(`[CarrierProfileSeeder] Successfully seeded ${seededCount} carrier profiles`);
    } catch (error) {
        logger.error('[CarrierProfileSeeder] Seeding failed:', error);
        throw error;
    }
}

// Execute if run directly
if (require.main === module) {
    const mongoose = require('mongoose');
    const DB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shipcrowd';

    mongoose
        .connect(DB_URI)
        .then(async () => {
            logger.info('[CarrierProfileSeeder] Connected to database');
            await seedCarrierProfiles();
            await mongoose.disconnect();
            logger.info('[CarrierProfileSeeder] Disconnected from database');
            process.exit(0);
        })
        .catch((error: Error) => {
            logger.error('[CarrierProfileSeeder] Database connection failed:', error);
            process.exit(1);
        });
}
