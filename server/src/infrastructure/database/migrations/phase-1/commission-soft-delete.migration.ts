import { BaseMigration, MigrationOptions } from '../base-migration';
import CommissionTransaction from '../../mongoose/models/finance/commission/commission-transaction.model';

/**
 * Migration: Add soft delete to CommissionTransaction
 */
export class CommissionSoftDeleteMigration extends BaseMigration {
    constructor(dryRun: boolean = false) {
        super({
            migrationName: '004-commission-soft-delete',
            phase: 'phase-1',
            dryRun
        });
    }

    async execute(): Promise<void> {
        const query = {
            $or: [
                { isDeleted: { $exists: false } },
                { schemaVersion: { $exists: false } }
            ]
        };

        const totalDocs = await CommissionTransaction.countDocuments(query);
        this.log(`Found ${totalDocs} CommissionTransaction documents to update.`);

        if (totalDocs === 0) {
            this.log('No documents to update. Migration complete.');
            return;
        }

        await this.processInBatches(CommissionTransaction, query, async (batch) => {
            const operations = batch.map((doc: any) => ({
                updateOne: {
                    filter: { _id: doc._id },
                    update: {
                        $set: {
                            isDeleted: false,
                            schemaVersion: 1
                        }
                    }
                }
            }));

            if (operations.length > 0) {
                await CommissionTransaction.bulkWrite(operations);
            }
        });
    }

    async rollback(): Promise<void> {
        this.log('Rolling back CommissionTransaction soft-delete fields...');

        await CommissionTransaction.updateMany(
            { schemaVersion: 1 },
            {
                $unset: {
                    isDeleted: "",
                    deletedAt: "",
                    deletedBy: "",
                    schemaVersion: ""
                }
            }
        );

        this.log('Rollback complete.');
    }
}
