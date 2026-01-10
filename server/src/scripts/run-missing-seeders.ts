/**
 * Partial Seeder - Run Missing Seeders Only
 * 
 * This script runs only the seeders that failed to complete in the previous run.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { logger, createTimer } from '../infrastructure/database/seeders/utils/logger.utils';

// Load environment variables
dotenv.config();

// Ensure ENCRYPTION_KEY is present
if (!process.env.ENCRYPTION_KEY) {
    console.warn('⚠️  ENCRYPTION_KEY not found in environment. Using default dev key for seeding.');
    process.env.ENCRYPTION_KEY = '02207fcc1b5ce31788490e5cebf0deafb7000b20223942900fffd2c1bbb780';
}

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shipcrowd';

async function runMissingSeeders() {
    logger.header('🔧 Running Missing Seeders');

    try {
        // Connect to database
        logger.info('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        logger.success('Connected to MongoDB');

        // Dynamically import missing seeders
        const { seedSalesCRM } = await import('../infrastructure/database/seeders/seeders/17-sales-crm.seeder.js');
        const { seedCommissions } = await import('../infrastructure/database/seeders/seeders/18-commissions.seeder.js');
        const { seedCoupons } = await import('../infrastructure/database/seeders/seeders/19-coupons.seeder.js');
        const { seedMarketplaceStores } = await import('../infrastructure/database/seeders/seeders/21-marketplace-stores.seeder.js');
        const { seedIntegrations } = await import('../infrastructure/database/seeders/seeders/22-integrations.seeder.js');
        const { seedMarketplaceSyncLogs } = await import('../infrastructure/database/seeders/seeders/24-marketplace-sync-logs.seeder.js');
        const { seedMarketplaceProductMappings } = await import('../infrastructure/database/seeders/seeders/25-marketplace-product-mappings.seeder.js');
        const { seedPayouts } = await import('../infrastructure/database/seeders/seeders/27-payouts.seeder.js');

        // Run each seeder
        const seeders = [
            { name: 'Sales \u0026 CRM', fn: seedSalesCRM },
            { name: 'Commissions', fn: seedCommissions },
            { name: 'Coupons', fn: seedCoupons },
            { name: 'Marketplace Stores', fn: seedMarketplaceStores },
            { name: 'Integrations', fn: seedIntegrations },
            { name: 'Marketplace Sync Logs', fn: seedMarketplaceSyncLogs },
            { name: 'Product Mappings', fn: seedMarketplaceProductMappings },
            { name: 'Payouts', fn: seedPayouts },
        ];

        for (const seeder of seeders) {
            const timer = createTimer();
            try {
                console.log(`\n🌱 Running: ${seeder.name}...`);
                await seeder.fn();
            } catch (error) {
                logger.error(`Seeder "${seeder.name}" failed:`, error);
                // Continue with other seeders even if one fails
            }
        }

        logger.success('\n✅ Missing seeders completed!');

    } catch (error) {
        logger.error('Fatal error:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        logger.info('Disconnected from MongoDB');
    }
}

runMissingSeeders();
