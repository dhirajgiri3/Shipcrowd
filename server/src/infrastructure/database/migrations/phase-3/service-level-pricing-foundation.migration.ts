import CarrierBillingRecord from '../../mongoose/models/finance/reconciliation/carrier-billing-record.model';
import PricingVarianceCase from '../../mongoose/models/finance/reconciliation/pricing-variance-case.model';
import CourierService from '../../mongoose/models/logistics/shipping/configuration/courier-service.model';
import SellerCourierPolicy from '../../mongoose/models/logistics/shipping/configuration/seller-courier-policy.model';
import ServiceRateCard from '../../mongoose/models/logistics/shipping/configuration/service-rate-card.model';
import QuoteSession from '../../mongoose/models/logistics/shipping/core/quote-session.model';
import Shipment from '../../mongoose/models/logistics/shipping/core/shipment.model';

type MigrationModel = {
    modelName: string;
    createCollection: () => Promise<any>;
    syncIndexes: () => Promise<any>;
};

export class ServiceLevelPricingFoundationMigration {
    constructor(private dryRun: boolean = false) { }

    async run() {
        console.log('--- Starting Service-Level Pricing Foundation Migration ---');
        console.log(`Mode: ${this.dryRun ? 'DRY RUN' : 'LIVE Execute'}`);

        const models: MigrationModel[] = [
            CourierService,
            ServiceRateCard,
            SellerCourierPolicy,
            QuoteSession,
            CarrierBillingRecord,
            PricingVarianceCase,
            Shipment, // Syncs newly added quoteSession index
        ];

        for (const model of models) {
            if (this.dryRun) {
                console.log(`[DryRun] Would ensure collection and indexes for ${model.modelName}`);
                continue;
            }

            try {
                await model.createCollection();
                console.log(`Created collection: ${model.modelName}`);
            } catch (error: any) {
                if (error?.codeName !== 'NamespaceExists') {
                    throw error;
                }
                console.log(`Collection exists: ${model.modelName}`);
            }

            await model.syncIndexes();
            console.log(`Indexes synced: ${model.modelName}`);
        }

        console.log('Service-Level Pricing Foundation Migration completed.');
    }
}
