/**
 * Database Seeding Entry Point
 * 
 * Main orchestrator for the database seeding process.
 * Runs seeders in dependency order and provides progress logging.
 * 
 * Usage:
 *   npm run seed:full           # Seed without clearing
 *   npm run seed:clean          # Clear and seed
 *   npx tsx src/infrastructure/database/seeders/index.ts --clean
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { logger, createTimer, formatDuration } from './utils/logger.utils';

// Load environment variables
dotenv.config();

// Import seeders in dependency order
import { seedUsers } from './seeders/01-users.seeder';
import { seedCompanies } from './seeders/02-companies.seeder';
import { seedKYC } from './seeders/03-kyc.seeder';
import { seedWarehouses } from './seeders/04-warehouses.seeder';
import { seedInventory } from './seeders/06-inventory.seeder';
import { seedOrders } from './seeders/07-orders.seeder';
import { seedShipments } from './seeders/08-shipments.seeder';
import { seedNDREvents } from './seeders/09-ndr-events.seeder';
import { seedRTOEvents } from './seeders/10-rto-events.seeder';
import { seedWalletTransactions } from './seeders/11-wallet-transactions.seeder';
import { seedSessions } from './seeders/13-sessions.seeder';

// Collections to clear when using --clean flag
const COLLECTIONS_TO_CLEAR = [
    'users',
    'sessions',
    'companies',
    'kycs',
    'warehouses',
    'inventories',
    'orders',
    'shipments',
    'ndrevents',
    'rtoevents',
    'wallettransactions',
    'picklists',
];

/**
 * Parse command line arguments
 */
function parseArgs(): { clean: boolean; help: boolean } {
    const args = process.argv.slice(2);
    return {
        clean: args.includes('--clean') || args.includes('-c'),
        help: args.includes('--help') || args.includes('-h'),
    };
}

/**
 * Print help message
 */
function printHelp(): void {
    console.log(`
ShipCrowd Database Seeder

Usage:
  npx tsx src/infrastructure/database/seeders/index.ts [options]

Options:
  --clean, -c    Clear all collections before seeding
  --help, -h     Show this help message

NPM Scripts:
  npm run seed:full    Seed without clearing existing data
  npm run seed:clean   Clear all data and reseed

Environment Variables:
  MONGODB_URI    MongoDB connection string (default: mongodb://localhost:27017/shipcrowd)
  DEBUG          Set to 'true' for verbose logging
  `);
}

/**
 * Connect to MongoDB
 */
async function connectDatabase(): Promise<void> {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/shipcrowd';

    logger.info(`Connecting to MongoDB: ${mongoUri.split('@').pop() || mongoUri.split('/').pop()}`);

    await mongoose.connect(mongoUri);

    logger.success('Connected to MongoDB');
}

/**
 * Clear all seeded collections
 */
async function clearCollections(): Promise<void> {
    logger.phase('Clearing Existing Data');

    const db = mongoose.connection.db;
    if (!db) {
        throw new Error('Database connection not established');
    }

    for (const collectionName of COLLECTIONS_TO_CLEAR) {
        try {
            const collection = db.collection(collectionName);
            const count = await collection.countDocuments();

            if (count > 0) {
                await collection.deleteMany({});
                logger.info(`Cleared ${count} documents from ${collectionName}`);
            }
        } catch (error) {
            // Collection might not exist, that's OK
            logger.debug(`Collection ${collectionName} not found or already empty`);
        }
    }

    logger.success('All collections cleared');
}

/**
 * Run all seeders in order
 */
async function runSeeders(): Promise<void> {
    logger.phase('Running Seeders');

    // Seeder order based on dependencies
    const seeders = [
        { name: 'Users', fn: seedUsers },
        { name: 'Companies', fn: seedCompanies },
        { name: 'KYC', fn: seedKYC },
        { name: 'Warehouses', fn: seedWarehouses },
        { name: 'Inventory', fn: seedInventory },
        { name: 'Orders', fn: seedOrders },
        { name: 'Shipments', fn: seedShipments },
        { name: 'NDR Events', fn: seedNDREvents },
        { name: 'RTO Events', fn: seedRTOEvents },
        { name: 'Wallet Transactions', fn: seedWalletTransactions },
        { name: 'Sessions', fn: seedSessions },
    ];

    for (const seeder of seeders) {
        const timer = createTimer();
        try {
            await seeder.fn();
        } catch (error) {
            logger.error(`Seeder "${seeder.name}" failed:`, error);
            throw error;
        }
    }
}

/**
 * Print final summary
 */
async function printSummary(): Promise<void> {
    logger.phase('Seeding Summary');

    const db = mongoose.connection.db;
    if (!db) return;

    const counts: Record<string, number> = {};

    for (const collectionName of COLLECTIONS_TO_CLEAR) {
        try {
            const collection = db.collection(collectionName);
            counts[collectionName] = await collection.countDocuments();
        } catch (error) {
            counts[collectionName] = 0;
        }
    }

    logger.table(counts);
}

/**
 * Main seeding function
 */
async function main(): Promise<void> {
    const args = parseArgs();

    if (args.help) {
        printHelp();
        process.exit(0);
    }

    const globalTimer = createTimer();

    logger.header('🌱 ShipCrowd Database Seeder');

    logger.info(`Mode: ${args.clean ? 'Clean + Seed' : 'Seed Only'}`);
    logger.info(`Started at: ${new Date().toLocaleString()}`);
    logger.divider();

    try {
        // Connect to database
        await connectDatabase();

        // Clear if requested
        if (args.clean) {
            await clearCollections();
        }

        // Run all seeders
        await runSeeders();

        // Print summary
        await printSummary();

        // Log completion
        logger.divider();
        logger.success(`🎉 Seeding completed successfully in ${globalTimer.format()}`);
        logger.memory();

    } catch (error) {
        logger.error('Seeding failed:', error);
        process.exit(1);
    } finally {
        // Disconnect from database
        await mongoose.disconnect();
        logger.info('Disconnected from MongoDB');
    }
}

// Run the seeder
main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
