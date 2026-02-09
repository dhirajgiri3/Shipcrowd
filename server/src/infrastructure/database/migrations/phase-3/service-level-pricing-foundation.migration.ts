import mongoose from 'mongoose';
import CarrierBillingRecord from '../../mongoose/models/finance/reconciliation/carrier-billing-record.model';
import PricingVarianceCase from '../../mongoose/models/finance/reconciliation/pricing-variance-case.model';
import CourierService from '../../mongoose/models/logistics/shipping/configuration/courier-service.model';
import SellerCourierPolicy from '../../mongoose/models/logistics/shipping/configuration/seller-courier-policy.model';
import ServiceRateCard from '../../mongoose/models/logistics/shipping/configuration/service-rate-card.model';
import QuoteSession from '../../mongoose/models/logistics/shipping/core/quote-session.model';
import Shipment from '../../mongoose/models/logistics/shipping/core/shipment.model';

type MigrationModel = mongoose.Model<any>;

type CanonicalIndexDefinition = {
    name: string;
    key: Record<string, 1 | -1>;
    options?: mongoose.IndexOptions;
};

export class ServiceLevelPricingFoundationMigration {
    constructor(private dryRun: boolean = false) {}

    private readonly models: MigrationModel[] = [
        CourierService,
        ServiceRateCard,
        SellerCourierPolicy,
        QuoteSession,
        CarrierBillingRecord,
        PricingVarianceCase,
        Shipment,
    ];

    private readonly canonicalIndexesByCollection: Record<
        string,
        CanonicalIndexDefinition[]
    > = {
        courierservices: [
            {
                name: 'idx_courier_service_company_provider_status',
                key: { companyId: 1, provider: 1, status: 1 },
            },
            {
                name: 'uidx_courier_service_company_service_code',
                key: { companyId: 1, serviceCode: 1 },
                options: { unique: true },
            },
            {
                name: 'idx_courier_service_integration_provider_service',
                key: { integrationId: 1, providerServiceId: 1 },
            },
            {
                name: 'idx_courier_service_company_deleted_created_at',
                key: { companyId: 1, isDeleted: 1, createdAt: -1 },
            },
        ],
        serviceratecards: [
            {
                name: 'idx_service_rate_card_company_service_type_status',
                key: { companyId: 1, serviceId: 1, cardType: 1, status: 1 },
            },
            {
                name: 'idx_service_rate_card_company_card_type_start_date',
                key: { companyId: 1, cardType: 1, 'effectiveDates.startDate': 1 },
            },
            {
                name: 'idx_service_rate_card_company_deleted_created_at',
                key: { companyId: 1, isDeleted: 1, createdAt: -1 },
            },
        ],
        sellercourierpolicies: [
            {
                name: 'uidx_seller_courier_policy_company_seller',
                key: { companyId: 1, sellerId: 1 },
                options: { unique: true },
            },
            {
                name: 'idx_seller_courier_policy_company_active',
                key: { companyId: 1, isActive: 1 },
            },
        ],
        quotesessions: [
            {
                name: 'idx_quote_session_ttl_expires_at',
                key: { expiresAt: 1 },
                options: { expireAfterSeconds: 0 },
            },
            {
                name: 'idx_quote_session_company_seller_created_at',
                key: { companyId: 1, sellerId: 1, createdAt: -1 },
            },
            {
                name: 'idx_quote_session_company_recommendation',
                key: { companyId: 1, recommendation: 1 },
            },
        ],
        carrierbillingrecords: [
            {
                name: 'idx_carrier_billing_company_awb_provider',
                key: { companyId: 1, awb: 1, provider: 1 },
            },
            {
                name: 'idx_carrier_billing_company_shipment',
                key: { companyId: 1, shipmentId: 1 },
            },
            {
                name: 'idx_carrier_billing_company_billed_at_desc',
                key: { companyId: 1, billedAt: -1 },
            },
            {
                name: 'idx_carrier_billing_company_source_billed_at',
                key: { companyId: 1, source: 1, billedAt: -1 },
            },
        ],
        pricingvariancecases: [
            {
                name: 'idx_pricing_variance_company_status_created_at',
                key: { companyId: 1, status: 1, createdAt: -1 },
            },
            {
                name: 'idx_pricing_variance_shipment_id',
                key: { shipmentId: 1 },
            },
            {
                name: 'idx_pricing_variance_company_provider_awb',
                key: { companyId: 1, provider: 1, awb: 1 },
            },
            {
                name: 'uidx_pricing_variance_company_billing_record',
                key: { companyId: 1, billingRecordId: 1 },
                options: { unique: true, sparse: true },
            },
        ],
        shipments: [
            {
                name: 'pricingDetails.selectedQuote.quoteSessionId_1',
                key: { 'pricingDetails.selectedQuote.quoteSessionId': 1 },
            },
        ],
    };

    async run(): Promise<void> {
        console.log('--- Starting Service-Level Pricing Foundation Migration ---');
        console.log(`Mode: ${this.dryRun ? 'DRY RUN' : 'LIVE Execute'}`);

        for (const model of this.models) {
            if (this.dryRun) {
                console.log(
                    `[DryRun] Would ensure collection and sync indexes for ${model.modelName}`
                );
                continue;
            }

            await this.ensureCollection(model);
            await this.normalizeIndexes(model);
            await model.syncIndexes();
            console.log(`Indexes synced: ${model.modelName}`);
        }

        console.log('Service-Level Pricing Foundation Migration completed.');
    }

    async runIndexHygieneOnly(): Promise<void> {
        console.log(
            '--- Starting Service-Level Pricing Index Hygiene Migration ---'
        );
        console.log(`Mode: ${this.dryRun ? 'DRY RUN' : 'LIVE Execute'}`);

        for (const model of this.models) {
            if (this.dryRun) {
                console.log(
                    `[DryRun] Would normalize duplicate/stale indexes for ${model.modelName}`
                );
                continue;
            }
            await this.ensureCollection(model);
            await this.normalizeIndexes(model);
        }

        console.log('Service-Level Pricing Index Hygiene completed.');
    }

    private async ensureCollection(model: MigrationModel): Promise<void> {
        try {
            await model.createCollection();
            console.log(`Created collection: ${model.modelName}`);
        } catch (error: any) {
            if (error?.codeName !== 'NamespaceExists') {
                throw error;
            }
            console.log(`Collection exists: ${model.modelName}`);
        }
    }

    private async normalizeIndexes(model: MigrationModel): Promise<void> {
        const collectionName = model.collection.collectionName;
        const canonicalIndexes =
            this.canonicalIndexesByCollection[collectionName] || [];

        if (!canonicalIndexes.length) {
            return;
        }

        const existingIndexes = await model.collection.indexes();
        const canonicalByKey = new Map(
            canonicalIndexes.map((index) => [JSON.stringify(index.key), index])
        );

        for (const existing of existingIndexes) {
            const existingName = typeof existing.name === 'string' ? existing.name : '';
            if (!existingName || existingName === '_id_') {
                continue;
            }

            const keySignature = JSON.stringify(existing.key);
            const canonical = canonicalByKey.get(keySignature);

            if (canonical && existingName !== canonical.name) {
                await model.collection.dropIndex(existingName);
                console.log(
                    `Dropped stale index "${existingName}" on ${collectionName} (canonical: "${canonical.name}")`
                );
            }
        }

        for (const canonical of canonicalIndexes) {
            const stillExists = (await model.collection.indexes()).some(
                (index) => index.name === canonical.name
            );

            if (stillExists) {
                continue;
            }

            const createOptions: mongoose.mongo.CreateIndexesOptions = {
                background: true,
                name: canonical.name,
            };
            if (canonical.options?.unique !== undefined) {
                createOptions.unique = Boolean(canonical.options.unique);
            }
            if (canonical.options?.sparse !== undefined) {
                createOptions.sparse = Boolean(canonical.options.sparse);
            }
            if (canonical.options?.expireAfterSeconds !== undefined) {
                createOptions.expireAfterSeconds = canonical.options.expireAfterSeconds;
            }
            if (canonical.options?.partialFilterExpression) {
                createOptions.partialFilterExpression =
                    canonical.options.partialFilterExpression as Record<string, unknown>;
            }

            await model.collection.createIndex(canonical.key, createOptions);
            console.log(
                `Created canonical index "${canonical.name}" on ${collectionName}`
            );
        }
    }
}
