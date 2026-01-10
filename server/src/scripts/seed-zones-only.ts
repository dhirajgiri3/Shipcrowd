/**
 * Seed Shipping Zones Only
 * 
 * This script seeds only the shipping zones that were missing from the previous run.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { logger } from '../infrastructure/database/seeders/utils/logger.utils';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shipcrowd';

async function seedZonesOnly() {
    logger.header('🌱 Seeding Shipping Zones');

    try {
        // Connect to database
        logger.info('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        logger.success('Connected to MongoDB');

        // Dynamically import seeder
        const { seedRateCardsAndZones } = await import('../infrastructure/database/seeders/seeders/23-rate-card-and-zones.seeder.js');

        // Run seeder
        console.log('\n🌱 Running Rate Cards & Zones seeder...');
        await seedRateCardsAndZones();

        // Check results
        const Zone = (await import('../infrastructure/database/mongoose/models/logistics/shipping/configuration/zone.model.js')).default;
        const zoneCount = await Zone.countDocuments();

        logger.success(`\n✅ Zones seeded! Total zones: ${zoneCount}`);

    } catch (error) {
        logger.error('Fatal error:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        logger.info('Disconnected from MongoDB');
    }
}

seedZonesOnly();
