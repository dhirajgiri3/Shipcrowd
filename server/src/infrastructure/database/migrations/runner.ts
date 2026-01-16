import mongoose from 'mongoose';
import { WalletSoftDeleteMigration } from './phase-1/wallet-soft-delete.migration';

/**
 * Migration Runner
 * 
 * Executes migrations based on CLI arguments.
 * Usage: npx tsx runner.ts [migration-name] [--dry-run]
 */

async function connectDB() {
    const dbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/shipcrowd';
    await mongoose.connect(dbUri);
    console.log('✓ Connected to MongoDB');
}

async function main() {
    const args = process.argv.slice(2);
    const command = args[0];
    const dryRun = args.includes('--dry-run');

    try {
        await connectDB();

        switch (command) {
            case 'wallet-soft-delete':
                await new WalletSoftDeleteMigration(dryRun).run();
                break;

            default:
                console.log('Available migrations:');
                console.log('  wallet-soft-delete  -- Run WalletTransaction soft delete migration');
                console.log('\nOptions:');
                console.log('  --dry-run           -- Simulate migration without writes');
                break;
        }

        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('Migration execution failed:', error);
        await mongoose.disconnect();
        process.exit(1);
    }
}

main();
