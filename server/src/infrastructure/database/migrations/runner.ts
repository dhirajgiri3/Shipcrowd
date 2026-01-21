import mongoose from 'mongoose';
import { WalletSoftDeleteMigration } from './phase-1/wallet-soft-delete.migration';
import { InvoiceSoftDeleteMigration } from './phase-1/invoice-soft-delete.migration';
import { PayoutSoftDeleteMigration } from './phase-1/payout-soft-delete.migration';
import { CommissionSoftDeleteMigration } from './phase-1/commission-soft-delete.migration';
import { KycSoftDeleteMigration } from './phase-1/kyc-soft-delete.migration';

/**
 * Migration Runner
 * 
 * Executes migrations based on CLI arguments.
 * Usage: npx tsx runner.ts [migration-name] [--dry-run]
 */

async function connectDB() {
    const dbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/Helix';
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

            case 'invoice-soft-delete':
                await new InvoiceSoftDeleteMigration(dryRun).run();
                break;

            case 'payout-soft-delete':
                await new PayoutSoftDeleteMigration(dryRun).run();
                break;

            case 'commission-soft-delete':
                await new CommissionSoftDeleteMigration(dryRun).run();
                break;

            case 'kyc-soft-delete':
                await new KycSoftDeleteMigration(dryRun).run();
                break;

            default:
                console.log('Available migrations:');
                console.log('  wallet-soft-delete      -- Run WalletTransaction soft delete migration');
                console.log('  invoice-soft-delete     -- Run Invoice soft delete migration');
                console.log('  payout-soft-delete      -- Run Payout soft delete migration');
                console.log('  commission-soft-delete  -- Run CommissionTransaction soft delete migration');
                console.log('  kyc-soft-delete         -- Run KYC soft delete migration');
                console.log('\nOptions:');
                console.log('  --dry-run               -- Simulate migration without writes');
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
