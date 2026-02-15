import Payout from '../../mongoose/models/finance/payouts/payout.model';
import { BaseMigration } from '../base-migration';

/**
 * Migration: Add soft delete to Payout
 */
export class PayoutSoftDeleteMigration extends BaseMigration {
    constructor(dryRun: boolean = false) {
        super({
            migrationName: '003-payout-soft-delete',
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

        const totalDocs = await Payout.countDocuments(query);
        this.log(`Found ${totalDocs} Payout documents to update.`);

        if (totalDocs === 0) {
            this.log('No documents to update. Migration complete.');
            return;
        }

        await this.processInBatches(Payout, query, async (batch) => {
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
                await Payout.bulkWrite(operations);
            }
        });
    }

    async rollback(): Promise<void> {
        this.log('Rolling back Payout soft-delete fields...');

        await Payout.updateMany(
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
