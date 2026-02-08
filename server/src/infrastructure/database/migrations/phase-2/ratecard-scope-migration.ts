import RateCard from '../../mongoose/models/logistics/shipping/configuration/rate-card.model';

export class RateCardScopeMigration {
    constructor(private dryRun: boolean = false) { }

    async run() {
        console.log('--- Starting RateCard Scope Migration ---');
        console.log(`Mode: ${this.dryRun ? 'DRY RUN' : 'LIVE Execute'}`);

        const filter = {
            $or: [
                { scope: { $exists: false } },
                { scope: null }
            ]
        };

        const cursor = RateCard.find(filter).cursor();

        let processed = 0;
        let updated = 0;

        for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
            processed++;
            const scope = doc.companyId ? 'company' : 'global';
            const updates: any = { scope };

            if (!doc.companyId) {
                updates.companyId = null;
            }

            if (this.dryRun) {
                console.log(`[DryRun] Would update ratecard ${doc._id}:`, updates);
            } else {
                await RateCard.updateOne({ _id: doc._id }, { $set: updates });
            }
            updated++;

            if (processed % 100 === 0) {
                process.stdout.write(`Processed: ${processed}, Updated: ${updated}\r`);
            }
        }

        console.log(`\nMigration Complete. Total Processed: ${processed}, Updated: ${updated}`);
    }
}
