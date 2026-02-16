import dotenv from 'dotenv';
import mongoose from 'mongoose';

// 1. Load Environment Variables immediately
dotenv.config();

// 2. Ensure ENCRYPTION_KEY is present (Fix for KYC model strict check)
if (!process.env.ENCRYPTION_KEY) {
    if (process.env.FIELD_ENCRYPTION_SECRET) {
        process.env.ENCRYPTION_KEY = process.env.FIELD_ENCRYPTION_SECRET;
    } else {
        // Default dev key to satisfy strict validation if not provided
        process.env.ENCRYPTION_KEY = '02207fcc1b5ce31788490e5cebf0deafb7000b20223942900fffd2c1bbb780';
    }
}

/**
 * Migration Runner
 * 
 * Executes migrations based on CLI arguments.
 * Usage: npx tsx runner.ts [migration-name] [--dry-run]
 */

async function connectDB() {
    const dbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/Shipcrowd';
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
            case 'wallet-soft-delete': {
                const { WalletSoftDeleteMigration } = await import('./phase-1/wallet-soft-delete.migration');
                await new WalletSoftDeleteMigration(dryRun).run();
                break;
            }

            case 'invoice-soft-delete': {
                const { InvoiceSoftDeleteMigration } = await import('./phase-1/invoice-soft-delete.migration');
                await new InvoiceSoftDeleteMigration(dryRun).run();
                break;
            }

            case 'payout-soft-delete': {
                const { PayoutSoftDeleteMigration } = await import('./phase-1/payout-soft-delete.migration');
                await new PayoutSoftDeleteMigration(dryRun).run();
                break;
            }

            case 'commission-soft-delete': {
                const { CommissionSoftDeleteMigration } = await import('./phase-1/commission-soft-delete.migration');
                await new CommissionSoftDeleteMigration(dryRun).run();
                break;
            }

            case 'kyc-soft-delete': {
                const { KycSoftDeleteMigration } = await import('./phase-1/kyc-soft-delete.migration');
                await new KycSoftDeleteMigration(dryRun).run();
                break;
            }

            case 'cod-enhancement': {
                const { CodEnhancementMigration } = await import('./phase-2/cod-migration');
                await new CodEnhancementMigration(dryRun).run();
                break;
            }
            case 'service-level-pricing-foundation': {
                const { ServiceLevelPricingFoundationMigration } = await import('./phase-3/service-level-pricing-foundation.migration');
                await new ServiceLevelPricingFoundationMigration(dryRun).run();
                break;
            }
            case 'service-level-pricing-index-hygiene': {
                const { ServiceLevelPricingFoundationMigration } = await import('./phase-3/service-level-pricing-foundation.migration');
                await new ServiceLevelPricingFoundationMigration(dryRun).runIndexHygieneOnly();
                break;
            }
            case 'seller-bank-account-cutover': {
                const { SellerBankAccountCutoverMigration } = await import('./bank-accounts/seller-bank-account-cutover.migration');
                await new SellerBankAccountCutoverMigration(dryRun).run();
                break;
            }
            case 'platform-courier-scope-flow': {
                const { PlatformCourierScopeAndFlowMigration } = await import('./phase-4/platform-courier-scope-and-flow.migration');
                await new PlatformCourierScopeAndFlowMigration(dryRun).run();
                break;
            }
            default:
                console.log('Available migrations:');
                console.log('  wallet-soft-delete      -- Run WalletTransaction soft delete migration');
                console.log('  invoice-soft-delete     -- Run Invoice soft delete migration');
                console.log('  payout-soft-delete      -- Run Payout soft delete migration');
                console.log('  commission-soft-delete  -- Run CommissionTransaction soft delete migration');
                console.log('  kyc-soft-delete         -- Run KYC soft delete migration');
                console.log('  cod-enhancement         -- Run COD fields backfill (totalCollection, collectionStatus)');
                console.log('  service-level-pricing-foundation -- Create/sync collections and indexes for new service-level pricing models');
                console.log('  service-level-pricing-index-hygiene -- Drop stale duplicate index names and restore canonical service-level indexes');
                console.log('  seller-bank-account-cutover -- Backfill SellerBankAccount from legacy Company bank fields and unset legacy fields');
                console.log('  platform-courier-scope-flow -- Migrate courier integration/services/rate cards to platform scope with flow/category defaults');
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
