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
    'ndr_events',  // Fixed: was 'ndrevents'
    'rto_events',  // Fixed: was 'rtoevents'
    'wallet_transactions',  // Fixed: was 'wallettransactions'
    'picklists',
    'weight_disputes',  // Fixed: was 'weightdisputes'
    'cod_remittances',  // Fixed: was 'codremittances'
    // New collections from Phase 2 seeders
    'team_invitations',  // Fixed: was 'teaminvitations'
    'team_permissions',  // Fixed: was 'teampermissions'
    'team_activities',  // Fixed: was 'teamactivities'
    'sales_representatives',  // Fixed: was 'salesrepresentatives'
    'leads',
    'call_logs',  // Fixed: was 'calllogs'
    'commission_rules',  // Fixed: was 'commissionrules'
    'commission_transactions',  // Fixed: was 'commissiontransactions'
    'commission_adjustments',  // Fixed: was 'commissionadjustments'
    'coupons',
    'warehouse_zones',  // Fixed: was 'warehousezones'
    'warehouse_locations',  // Fixed: was 'warehouselocations'
    'packing_stations',  // Fixed: was 'packingstations'
    // Marketplace stores (Note: These use camelCase in MongoDB, not snake_case)
    'shopifystores',  // Actual MongoDB collection name
    'woocommercestores',  // Actual MongoDB collection name
    'amazonstores',  // Actual MongoDB collection name
    'flipkartstores',  // Actual MongoDB collection name
    // Integrations
    'integrations',
    'couriers', // New collection
    // Phase 3 collections
    'ratecards',  // Correct Mongoose pluralization
    'zones',
    'shopify_sync_logs',  // Fixed: was 'shopifysynclogs'
    'woocommerce_sync_logs',  // Fixed: was 'woocommercesynclogs'
    'amazon_sync_logs',  // Fixed: was 'amazonsynclogs'
    'flipkart_sync_logs',  // Fixed: was 'flipkartsynclogs'
    'shopify_product_mappings',  // Fixed: was 'shopifyproductmappings'
    'woocommerce_product_mappings',  // Fixed: was 'woocommerceproductmappings'
    'amazon_product_mappings',  // Fixed: was 'amazonproductmappings'
    'flipkart_product_mappings',  // Fixed: was 'flipkartproductmappings'
    'audit_logs',  // Fixed: was 'auditlogs'
    'payouts',
    'pincodes', // Phase 2: Address Validation
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
Shipcrowd Database Seeder

Usage:
  npx tsx src/infrastructure/database/seeders/index.ts [options]

Options:
  --clean, -c    Clear all collections before seeding
  --help, -h     Show this help message

NPM Scripts:
  npm run seed:full    Seed without clearing existing data
  npm run seed:clean   Clear all data and reseed

Environment Variables:
  MONGODB_URI    MongoDB connection string (default: mongodb://localhost:27017/Shipcrowd)
  DEBUG          Set to 'true' for verbose logging
  `);
}

/**
 * Connect to MongoDB
 */
async function connectDatabase(): Promise<void> {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/Shipcrowd';

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
    const { seedUsers } = await import('./seeders/01-users.seeder.js');
    const { seedCompanies } = await import('./seeders/02-companies.seeder.js');
    const { seedKYC } = await import('./seeders/03-kyc.seeder.js');
    const { seedWarehouses } = await import('./seeders/04-warehouses.seeder.js');
    const { seedPickLists } = await import('./seeders/05-picklists.seeder.js');
    const { seedInventory } = await import('./seeders/06-inventory.seeder.js');
    const { seedOrders } = await import('./seeders/07-orders.seeder.js');
    const { seedShipments } = await import('./seeders/08-shipments.seeder.js');
    const { seedNDREvents } = await import('./seeders/09-ndr-events.seeder.js');
    const { seedRTOEvents } = await import('./seeders/10-rto-events.seeder.js');
    const { seedWalletTransactions } = await import('./seeders/11-wallet-transactions.seeder.js');
    const { seedConsents } = await import('./seeders/12-consents.seeder.js');
    const { seedSessions } = await import('./seeders/13-sessions.seeder.js');
    const { seedWeightDisputes } = await import('./seeders/14-weight-disputes.seeder.js');
    const { seedCODRemittances } = await import('./seeders/15-cod-remittances.seeder.js');
    // New Phase 2 seeders
    const { seedTeams } = await import('./seeders/16-teams.seeder.js');
    const { seedSalesCRM } = await import('./seeders/17-sales-crm.seeder.js');
    const { seedCommissions } = await import('./seeders/18-commissions.seeder.js');
    const { seedCoupons } = await import('./seeders/19-coupons.seeder.js');
    const { seedWarehouseConfig } = await import('./seeders/20-warehouse-config.seeder.js');
    const { seedMarketplaceStores } = await import('./seeders/21-marketplace-stores.seeder.js');
    const { seedIntegrations } = await import('./seeders/22-integrations.seeder.js');
    // Phase 3 seeders
    const { seedRateCardsAndZones } = await import('./seeders/23-rate-card-and-zones.seeder.js');
    const { seedMarketplaceSyncLogs } = await import('./seeders/24-marketplace-sync-logs.seeder.js');
    const { seedMarketplaceProductMappings } = await import('./seeders/25-marketplace-product-mappings.seeder.js');
    const { seedAuditLogs } = await import('./seeders/26-audit-logs.seeder.js');
    const { seedPayouts } = await import('./seeders/27-payouts.seeder.js');
    const { seedPincodes } = await import('./seeders/28-pincodes.seeder.js');
    const { seedCouriers } = await import('./seeders/29-couriers.seeder.js');

    // Seeder order based on dependencies
    const seeders = [
        { name: 'Users', fn: seedUsers },
        { name: 'Companies', fn: seedCompanies },
        { name: 'KYC', fn: seedKYC },
        { name: 'Warehouses', fn: seedWarehouses },
        { name: 'Inventory', fn: seedInventory },
        { name: 'Rate Cards & Zones', fn: seedRateCardsAndZones },
        { name: 'Orders', fn: seedOrders },
        { name: 'Pick Lists', fn: seedPickLists },
        { name: 'Shipments', fn: seedShipments },
        { name: 'NDR Events', fn: seedNDREvents },
        { name: 'RTO Events', fn: seedRTOEvents },
        { name: 'Wallet Transactions', fn: seedWalletTransactions },
        { name: 'Consents', fn: seedConsents },
        { name: 'Sessions', fn: seedSessions },
        { name: 'Weight Disputes', fn: seedWeightDisputes },
        { name: 'COD Remittances', fn: seedCODRemittances },
        // New Phase 2 seeders
        { name: 'Teams', fn: seedTeams },
        { name: 'Sales & CRM', fn: seedSalesCRM },
        { name: 'Commissions', fn: seedCommissions },
        { name: 'Coupons', fn: seedCoupons },
        { name: 'Warehouse Config', fn: seedWarehouseConfig },
        { name: 'Marketplace Stores', fn: seedMarketplaceStores },
        { name: 'Integrations', fn: seedIntegrations },
        { name: 'Marketplace Sync Logs', fn: seedMarketplaceSyncLogs },
        { name: 'Product Mappings', fn: seedMarketplaceProductMappings },
        { name: 'Audit Logs', fn: seedAuditLogs },
        { name: 'Commission Payouts', fn: seedPayouts },
        { name: 'Pincodes', fn: seedPincodes },
        { name: 'Couriers', fn: seedCouriers },
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

    logger.header('🌱 Shipcrowd Database Seeder');

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
