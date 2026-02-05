import 'dotenv/config';
import { Courier } from '../../mongoose/models';
import { CARRIERS } from '../data/carrier-data';
import logger from '../../../../shared/logger/winston.logger';
import mongoose from 'mongoose';

/**
 * Seeder to populate the dynamic Couriers collection from static Carrier Data.
 * This enables the 'Courier' database model to replace the hardcoded 'CARRIERS' logic.
 */
export const seedCouriers = async () => {
    try {
        const carriersList = Object.values(CARRIERS);
        logger.info(`[Seeder] Seeding ${carriersList.length} couriers...`);

        for (const carrier of carriersList) {
            await Courier.findOneAndUpdate(
                { name: carrier.name }, // atomic find by name
                {
                    name: carrier.name,
                    displayName: carrier.displayName,
                    serviceTypes: carrier.serviceTypes.map(s => s.toLowerCase()),
                    regions: carrier.metroCoverage ? ['Pan India', 'Metro'] : ['Pan India'],
                    isActive: true,
                    isApiIntegrated: carrier.isIntegrated,
                    codEnabled: carrier.codLimit > 0,
                    pickupEnabled: carrier.capabilities ? carrier.capabilities.pickupScheduling : true, // Use capability or default
                    trackingEnabled: true,
                },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );
        }

        logger.info('[Seeder] Couriers seeded successfully');
    } catch (error) {
        logger.error('[Seeder] Failed to seed couriers:', error);
        throw error;
    }
};

// Auto-run if executed directly
if (require.main === module) {
    const run = async () => {
        try {
            await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/Shipcrowd');
            await seedCouriers();
            await mongoose.disconnect();
        } catch (error) {
            console.error('Error running seeder:', error);
            process.exit(1);
        }
    };
    run();
}
