/**
 * Migration: Initialize Rate Card System V2
 * 
 * 1. Backfill RateCards with defaults: version='v1', minimumCall=0, fuelSurcharge=0, isLocked=false
 * 2. Seed SystemConfiguration: metro_cities
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import RateCard from '../../infrastructure/database/mongoose/models/logistics/shipping/configuration/rate-card.model';
import SystemConfiguration from '../../infrastructure/database/mongoose/models/configuration/system-configuration.model';

// Load env
// Load env
const envPath = path.join(process.cwd(), '.env'); // Assumes running from project root or server root
console.log(`Loading env from: ${envPath}`);
const res = dotenv.config({ path: envPath });
if (res.error) {
    // Try server/.env if root/.env fails (common in monorepos or nested structures)
    const serverEnvPath = path.join(process.cwd(), 'server', '.env');
    console.log(`Retrying env from: ${serverEnvPath}`);
    dotenv.config({ path: serverEnvPath });
}

// Ensure MONGO_URI is available or fall back (optional, but good for safety)
const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

if (!MONGO_URI) {
    console.error('❌ MONGODB_URI nor MONGO_URI found in environment variables.');
    // process.exit(1); 
}

const METRO_CITIES = [
    'NEW DELHI', 'DELHI', 'MUMBAI', 'KOLKATA', 'CHENNAI',
    'BENGALURU', 'BANGALORE', 'HYDERABAD', 'PUNE', 'AHMEDABAD',
    'GURGAON', 'GURUGRAM', 'NOIDA', 'FARIDABAD', 'GHAZIABAD'
];

async function migrate() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        if (!MONGO_URI) {
            throw new Error('MONGODB_URI is not defined');
        }
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected.');

        // 1. Backfill RateCards
        console.log('📦 Backfilling RateCards...');
        const result = await RateCard.updateMany(
            {
                $or: [
                    { version: { $exists: false } },
                    { version: { $type: 'number' } } // Convert legacy numbers
                ]
            },
            {
                $set: {
                    version: 'v1',
                    minimumCall: 0,
                    fuelSurcharge: 0,
                    fuelSurchargeBase: 'freight',
                    codSurcharges: [],
                    isLocked: false,
                    remoteAreaEnabled: false,
                    remoteAreaSurcharge: 0
                }
            }
        );
        console.log(`✅ Backfilled ${result.modifiedCount} RateCards.`);

        // 2. Seed SystemConfiguration
        console.log('⚙️  Seeding SystemConfiguration...');

        // Metro Cities
        await SystemConfiguration.updateOne(
            { key: 'metro_cities' },
            {
                $setOnInsert: {
                    value: METRO_CITIES,
                    description: 'List of Metro cities for Zone C calculation',
                    isActive: true,
                    meta: {
                        source: 'migration_script',
                        version: 'v1',
                        updatedAt: new Date()
                    }
                }
            },
            { upsert: true }
        );
        console.log('✅ Seeded metro_cities.');

        // Allowed Zones by Provider
        await SystemConfiguration.updateOne(
            { key: 'allowed_zones_by_provider' },
            {
                $setOnInsert: {
                    value: {
                        velocity: ['zoneA', 'zoneB', 'zoneC', 'zoneD', 'zoneE']
                        // Add others as needed
                    },
                    description: 'Map of allowed zone codes per provider',
                    isActive: true,
                    meta: {
                        source: 'migration_script',
                        version: 'v1',
                        updatedAt: new Date()
                    }
                }
            },
            { upsert: true }
        );
        console.log('✅ Seeded allowed_zones_by_provider.');

        console.log('🎉 Migration Complete.');
        process.exit(0);

    } catch (error) {
        console.error('❌ Migration Failed:', error);
        process.exit(1);
    }
}

migrate();
