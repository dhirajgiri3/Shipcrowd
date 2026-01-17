import { BaseMigration, MigrationOptions } from '../base-migration';
import WalletTransaction from '../../mongoose/models/finance/wallets/wallet-transaction.model';

/**
 * Migration: Add soft delete to WalletTransaction
 * 
 * This migration adds soft delete functionality to the WalletTransaction model.
 */

export class WalletSoftDeleteMigration extends BaseMigration {
    constructor(dryRun: boolean = false) {
        super({
            migrationName: 'wallet-soft-delete',
            phase: 'phase-1',
            batchSize: 500,
            dryRun
        });
    }

    protected async executeMigration(): Promise<void> {
        const progress = await this.getProgress();
        let lastId = progress?.lastProcessedId;
        let processedCount = progress?.processedDocuments || 0;

        console.log('📊 Counting total documents...');
        const totalCount = await WalletTransaction.countDocuments({
            isDeleted: { $exists: false }
        });

        await this.updateProgress({ totalDocuments: totalCount });
        console.log(`   Total documents to migrate: ${totalCount}`);

        while (true) {
            // Build query
            const query: any = { isDeleted: { $exists: false } };
            if (lastId) {
                query._id = { $gt: lastId };
            }

            // Fetch batch
            const batch = await WalletTransaction.find(query)
                .sort({ _id: 1 })
                .limit(this.batchSize)
                .lean();

            if (batch.length === 0) {
                console.log('✅ No more documents to process');
                break;
            }

            console.log(`\n📦 Processing batch: ${processedCount + 1} - ${processedCount + batch.length}`);

            if (!this.dryRun) {
                // Perform actual update
                const ids = batch.map((doc: any) => doc._id);
                await WalletTransaction.updateMany(
                    { _id: { $in: ids } },
                    {
                        $set: {
                            isDeleted: false,
                            schemaVersion: 2 // Increment version after migration
                        }
                    }
                );
            } else {
                console.log(`   [DRY RUN] Would update ${batch.length} documents`);
            }

            // Update progress
            lastId = batch[batch.length - 1]._id;
            processedCount += batch.length;

            await this.updateProgress({
                lastProcessedId: lastId,
                processedDocuments: processedCount
            });

            const percentage = Math.round((processedCount / totalCount) * 100);
            console.log(`   Progress: ${processedCount}/${totalCount} (${percentage}%)`);

            // Small delay to avoid overwhelming the database
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        console.log(`\n✅ Migration completed: ${processedCount} documents processed`);
    }
}

// CLI execution
if (require.main === module) {
    const dryRun = process.argv.includes('--dry-run');

    const migration = new WalletSoftDeleteMigration(dryRun);
    migration.run()
        .then(() => {
            console.log('Migration finished successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Migration failed:', error);
            process.exit(1);
        });
}
