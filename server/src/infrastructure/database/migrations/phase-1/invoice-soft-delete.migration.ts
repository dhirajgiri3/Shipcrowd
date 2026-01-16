import { BaseMigration, MigrationOptions } from '../base-migration';
import Invoice from '../../mongoose/models/finance/billing/invoice.model';

/**
 * Migration: Add soft delete to Invoice
 */
export class InvoiceSoftDeleteMigration extends BaseMigration {
    constructor(dryRun: boolean = false) {
        super({
            migrationName: '002-invoice-soft-delete',
            phase: 'phase-1',
            dryRun
        });
    }

    async execute(): Promise<void> {
        // 1. Identify documents needing update
        const query = {
            $or: [
                { isDeleted: { $exists: false } },
                { schemaVersion: { $exists: false } }
            ]
        };

        const totalDocs = await Invoice.countDocuments(query);
        this.log(`Found ${totalDocs} Invoice documents to update.`);

        if (totalDocs === 0) {
            this.log('No documents to update. Migration complete.');
            return;
        }

        // 2. Process in batches
        await this.processInBatches(Invoice, query, async (batch) => {
            // 3. Prepare bulk operations
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

            // 4. Execute bulk write
            if (operations.length > 0) {
                await Invoice.bulkWrite(operations);
            }
        });
    }

    async rollback(): Promise<void> {
        this.log('Rolling back Invoice soft-delete fields...');

        await Invoice.updateMany(
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
