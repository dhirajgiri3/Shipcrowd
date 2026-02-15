import KYC from '../../mongoose/models/organization/core/kyc.model';
import { BaseMigration } from '../base-migration';

/**
 * Migration: Add soft delete to KYC
 */
export class KycSoftDeleteMigration extends BaseMigration {
    constructor(dryRun: boolean = false) {
        super({
            migrationName: '005-kyc-soft-delete',
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

        const totalDocs = await KYC.countDocuments(query);
        this.log(`Found ${totalDocs} KYC documents to update.`);

        if (totalDocs === 0) {
            this.log('No documents to update. Migration complete.');
            return;
        }

        await this.processInBatches(KYC, query, async (batch) => {
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
                await KYC.bulkWrite(operations);
            }
        });
    }

    async rollback(): Promise<void> {
        this.log('Rolling back KYC soft-delete fields...');

        await KYC.updateMany(
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
