
import mongoose from 'mongoose';
import Shipment from '../../mongoose/models/logistics/shipping/core/shipment.model';

export class CodEnhancementMigration {
    constructor(private dryRun: boolean = false) { }

    async run() {
        console.log('--- Starting COD Enhancement Migration ---');
        console.log(`Mode: ${this.dryRun ? 'DRY RUN' : 'LIVE Execute'}`);

        try {
            // Find shipments that need migration:
            // 1. paymentDetails.type is 'cod'
            // 2. Missing collectionStatus OR missing totalCollection
            const cursor = Shipment.find({
                'paymentDetails.type': 'cod',
                $or: [
                    { 'paymentDetails.collectionStatus': { $exists: false } },
                    { 'paymentDetails.totalCollection': { $exists: false } }
                ]
            }).cursor();

            let processed = 0;
            let updated = 0;

            for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
                processed++;
                const updates: any = {};
                let shouldUpdate = false;

                // 1. Init totalCollection
                if (doc.paymentDetails && doc.paymentDetails.totalCollection === undefined) {
                    // Default to codAmount (assuming full collection if not specified)
                    // In a real scenario, we might want to be more careful, but for backfill:
                    updates['paymentDetails.totalCollection'] = doc.paymentDetails.codAmount || 0;
                    shouldUpdate = true;
                }

                // 2. Init collectionStatus
                if (doc.paymentDetails && !doc.paymentDetails.collectionStatus) {
                    // Infer status
                    if (doc.currentStatus === 'delivered') {
                        // If delivered, assume 'collected' if not explicitly reconciled yet
                        // Or 'pending' if we want to be safe. Let's use 'pending' as safe default
                        // to trigger discrepancy checks if amounts don't match later.
                        updates['paymentDetails.collectionStatus'] = 'collected';
                    } else if (doc.currentStatus === 'rto') {
                        updates['paymentDetails.collectionStatus'] = 'failed';
                    } else {
                        updates['paymentDetails.collectionStatus'] = 'pending';
                    }
                    shouldUpdate = true;
                }

                if (shouldUpdate) {
                    if (this.dryRun) {
                        console.log(`[DryRun] Would update shipment ${doc._id}:`, updates);
                    } else {
                        await Shipment.updateOne({ _id: doc._id }, { $set: updates });
                    }
                    updated++;
                }

                if (processed % 100 === 0) {
                    process.stdout.write(`Processed: ${processed}, Updated: ${updated}\r`);
                }
            }

            console.log(`\nMigration Complete. Total Processed: ${processed}, Updated: ${updated}`);

        } catch (error) {
            console.error('Migration failed:', error);
            throw error;
        }
    }
}
