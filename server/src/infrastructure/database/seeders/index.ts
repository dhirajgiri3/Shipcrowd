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

// Ensure ENCRYPTION_KEY is present for mongoose-field-encryption
// If missing (e.g. no .env file), use the default dev key from .env.example
if (!process.env.ENCRYPTION_KEY) {
    console.warn('⚠️  ENCRYPTION_KEY not found in environment. Using default dev key for seeding.');
    process.env.ENCRYPTION_KEY = '02207fcc1b5ce31788490e5cebf0deafb7000b20223942900fffd2c1bbb780';
}

// Collections to clear when using --clean flag
const COLLECTIONS_TO_CLEAR = [
    'users',
    'sessions',
    'consents',
    'consenthistories',
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
    'weightdisputes',
    'codremittances',
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

    // Dynamically import seeders to ensure env vars are loaded first
    const { seedUsers } = await import('./seeders/01-users.seeder');
    const { seedCompanies } = await import('./seeders/02-companies.seeder');
    const { seedKYC } = await import('./seeders/03-kyc.seeder');
    const { seedWarehouses } = await import('./seeders/04-warehouses.seeder');
    const { seedPickLists } = await import('./seeders/05-picklists.seeder');
    const { seedInventory } = await import('./seeders/06-inventory.seeder');
    const { seedOrders } = await import('./seeders/07-orders.seeder');
    const { seedShipments } = await import('./seeders/08-shipments.seeder');
    const { seedNDREvents } = await import('./seeders/09-ndr-events.seeder');
    const { seedRTOEvents } = await import('./seeders/10-rto-events.seeder');
    const { seedWalletTransactions } = await import('./seeders/11-wallet-transactions.seeder');
    const { seedConsents } = await import('./seeders/12-consents.seeder');
    const { seedSessions } = await import('./seeders/13-sessions.seeder');
    const { seedWeightDisputes } = await import('./seeders/14-weight-disputes.seeder');
    const { seedCODRemittances } = await import('./seeders/15-cod-remittances.seeder');

    // Seeder order based on dependencies
    const seeders = [
        { name: 'Users', fn: seedUsers },
        { name: 'Companies', fn: seedCompanies },
        { name: 'KYC', fn: seedKYC },
        { name: 'Warehouses', fn: seedWarehouses },
        { name: 'Pick Lists', fn: seedPickLists },
        { name: 'Inventory', fn: seedInventory },
        { name: 'Orders', fn: seedOrders },
        { name: 'Shipments', fn: seedShipments },
        { name: 'NDR Events', fn: seedNDREvents },
        { name: 'RTO Events', fn: seedRTOEvents },
        { name: 'Wallet Transactions', fn: seedWalletTransactions },
        { name: 'Consents', fn: seedConsents },
        { name: 'Sessions', fn: seedSessions },
        { name: 'Weight Disputes', fn: seedWeightDisputes },
        { name: 'COD Remittances', fn: seedCODRemittances },
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
