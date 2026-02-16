import mongoose from 'mongoose';
import CourierProviderRegistry from '../../../../core/application/services/courier/courier-provider-registry';
import Integration from '../../mongoose/models/system/integrations/integration.model';
import CourierService from '../../mongoose/models/logistics/shipping/configuration/courier-service.model';
import ServiceRateCard from '../../mongoose/models/logistics/shipping/configuration/service-rate-card.model';
import SellerCourierPolicy from '../../mongoose/models/logistics/shipping/configuration/seller-courier-policy.model';

type DryRunSummary = {
    updatedIntegrations: number;
    archivedIntegrations: number;
    updatedServices: number;
    archivedServices: number;
    remappedRateCards: number;
    remappedPolicies: number;
    updatedRateCards: number;
    updatedPolicies: number;
};

export class PlatformCourierScopeAndFlowMigration {
    constructor(private dryRun: boolean = false) {}

    async run(): Promise<void> {
        console.log('--- Starting Platform Courier Scope + Flow Migration ---');
        console.log(`Mode: ${this.dryRun ? 'DRY RUN' : 'LIVE Execute'}`);

        const canonicalServiceMap = await this.resolveDuplicateCourierServices();

        const summary: DryRunSummary = {
            updatedIntegrations: 0,
            archivedIntegrations: 0,
            updatedServices: 0,
            archivedServices: 0,
            remappedRateCards: 0,
            remappedPolicies: 0,
            updatedRateCards: 0,
            updatedPolicies: 0,
        };

        summary.updatedIntegrations = await this.migrateIntegrations();
        summary.archivedIntegrations = await this.archiveDuplicateIntegrations();
        summary.remappedRateCards = await this.remapServiceRateCards(canonicalServiceMap);
        summary.remappedPolicies = await this.remapSellerPolicies(canonicalServiceMap);
        summary.archivedServices = await this.archiveNonCanonicalServices(canonicalServiceMap);
        summary.updatedServices = await this.migrateCourierServices(canonicalServiceMap);
        summary.updatedRateCards = await this.migrateServiceRateCards();
        summary.updatedPolicies = await this.migrateSellerPolicies();

        console.log('Migration summary:', summary);
        console.log('Platform Courier Scope + Flow Migration completed.');
    }

    private async resolveDuplicateCourierServices(): Promise<Map<string, mongoose.Types.ObjectId>> {
        const duplicates = await CourierService.aggregate([
            { $match: { isDeleted: false } },
            { $group: { _id: '$serviceCode', count: { $sum: 1 }, ids: { $push: '$_id' } } },
            { $match: { count: { $gt: 1 } } },
        ]);

        const mapping = new Map<string, mongoose.Types.ObjectId>();
        if (!duplicates.length) return mapping;

        for (const group of duplicates) {
            const services = await CourierService.find({
                _id: { $in: group.ids },
            })
                .sort({ status: -1, updatedAt: -1, createdAt: -1 })
                .lean();

            const canonical = services[0]?._id as mongoose.Types.ObjectId | undefined;
            if (!canonical) continue;

            for (const service of services.slice(1)) {
                mapping.set(String(service._id), canonical);
            }
        }

        console.log(
            `Detected ${duplicates.length} duplicated serviceCode groups; ${mapping.size} records will be remapped/archived`
        );
        return mapping;
    }

    private async migrateIntegrations(): Promise<number> {
        const integrations = await Integration.find({
            type: 'courier',
            isDeleted: false,
        }).lean();

        let updated = 0;
        const bulkOps: any[] = [];

        for (const integration of integrations) {
            const provider =
                CourierProviderRegistry.toCanonical(String(integration.provider || '')) ||
                String(integration.provider || '').toLowerCase();
            bulkOps.push({
                updateOne: {
                    filter: { _id: integration._id },
                    update: {
                        $set: {
                            provider,
                            companyId: null,
                        },
                    },
                },
            });
        }

        if (this.dryRun) {
            console.log(`[DryRun] Would migrate ${bulkOps.length} courier integrations to platform scope`);
            return bulkOps.length;
        }

        if (bulkOps.length) {
            const result = await Integration.bulkWrite(bulkOps, { ordered: false });
            updated = Number(result.modifiedCount || 0);
        }
        return updated;
    }

    private async archiveDuplicateIntegrations(): Promise<number> {
        const integrations = await Integration.find({
            type: 'courier',
            isDeleted: false,
            companyId: null,
        })
            .sort({ updatedAt: -1 })
            .lean();

        const keeperByProvider = new Set<string>();
        const archiveIds: mongoose.Types.ObjectId[] = [];

        for (const integration of integrations) {
            const provider = String(integration.provider || '').toLowerCase();
            if (!keeperByProvider.has(provider)) {
                keeperByProvider.add(provider);
                continue;
            }
            archiveIds.push(integration._id as mongoose.Types.ObjectId);
        }

        if (this.dryRun) {
            console.log(`[DryRun] Would archive ${archiveIds.length} duplicate courier integrations`);
            return archiveIds.length;
        }

        if (!archiveIds.length) return 0;

        const result = await Integration.updateMany(
            { _id: { $in: archiveIds } },
            {
                $set: {
                    isDeleted: true,
                    'metadata.migrationArchivedAt': new Date(),
                },
            }
        );
        return Number(result.modifiedCount || 0);
    }

    private async remapServiceRateCards(
        canonicalServiceMap: Map<string, mongoose.Types.ObjectId>
    ): Promise<number> {
        if (!canonicalServiceMap.size) return 0;

        let updated = 0;
        for (const [oldId, canonicalId] of canonicalServiceMap.entries()) {
            if (this.dryRun) {
                const count = await ServiceRateCard.countDocuments({
                    serviceId: new mongoose.Types.ObjectId(oldId),
                });
                updated += count;
                continue;
            }

            const result = await ServiceRateCard.updateMany(
                { serviceId: new mongoose.Types.ObjectId(oldId) },
                { $set: { serviceId: canonicalId } }
            );
            updated += Number(result.modifiedCount || 0);
        }

        if (this.dryRun) {
            console.log(`[DryRun] Would remap ${updated} service rate cards to canonical service IDs`);
        }

        return updated;
    }

    private async remapSellerPolicies(
        canonicalServiceMap: Map<string, mongoose.Types.ObjectId>
    ): Promise<number> {
        if (!canonicalServiceMap.size) return 0;

        const policies = await SellerCourierPolicy.find({}).lean();
        let updated = 0;
        const bulkOps: any[] = [];

        const remapIds = (ids: mongoose.Types.ObjectId[] = []): mongoose.Types.ObjectId[] => {
            const remapped = ids.map((id) => canonicalServiceMap.get(String(id)) || id);
            const dedup = new Map(remapped.map((id) => [String(id), id]));
            return Array.from(dedup.values());
        };

        for (const policy of policies) {
            const currentAllowed = (policy.allowedServiceIds || []).map(String).sort();
            const currentBlocked = (policy.blockedServiceIds || []).map(String).sort();
            const nextAllowed = remapIds(policy.allowedServiceIds as mongoose.Types.ObjectId[]);
            const nextBlocked = remapIds(policy.blockedServiceIds as mongoose.Types.ObjectId[]);

            const changed =
                JSON.stringify(currentAllowed) !== JSON.stringify(nextAllowed.map(String).sort()) ||
                JSON.stringify(currentBlocked) !== JSON.stringify(nextBlocked.map(String).sort());

            if (!changed) continue;

            updated += 1;
            bulkOps.push({
                updateOne: {
                    filter: { _id: policy._id },
                    update: {
                        $set: {
                            allowedServiceIds: nextAllowed,
                            blockedServiceIds: nextBlocked,
                        },
                    },
                },
            });
        }

        if (this.dryRun) {
            console.log(`[DryRun] Would remap service references in ${updated} seller policies`);
            return updated;
        }

        if (bulkOps.length) {
            await SellerCourierPolicy.bulkWrite(bulkOps, { ordered: false });
        }

        return updated;
    }

    private async archiveNonCanonicalServices(
        canonicalServiceMap: Map<string, mongoose.Types.ObjectId>
    ): Promise<number> {
        if (!canonicalServiceMap.size) return 0;

        const duplicateIds = Array.from(canonicalServiceMap.keys()).map(
            (id) => new mongoose.Types.ObjectId(id)
        );

        if (this.dryRun) {
            console.log(`[DryRun] Would archive ${duplicateIds.length} non-canonical courier services`);
            return duplicateIds.length;
        }

        const result = await CourierService.updateMany(
            { _id: { $in: duplicateIds } },
            {
                $set: {
                    isDeleted: true,
                    status: 'inactive',
                    'metadata.migrationArchivedAt': new Date(),
                },
            }
        );

        return Number(result.modifiedCount || 0);
    }

    private async migrateCourierServices(
        canonicalServiceMap: Map<string, mongoose.Types.ObjectId>
    ): Promise<number> {
        const duplicateIds = Array.from(canonicalServiceMap.keys()).map(
            (id) => new mongoose.Types.ObjectId(id)
        );
        const baseQuery: Record<string, any> = {
            isDeleted: false,
            companyId: { $ne: null },
        };
        const query = duplicateIds.length
            ? {
                  ...baseQuery,
                  _id: { $nin: duplicateIds },
              }
            : baseQuery;

        if (this.dryRun) {
            const count = await CourierService.countDocuments(query);
            console.log(`[DryRun] Would migrate ${count} canonical courier services to platform scope and set flowType`);
            return count;
        }

        const result = await CourierService.updateMany(
            query,
            {
                $set: {
                    companyId: null,
                    flowType: 'forward',
                },
            }
        );
        return Number(result.modifiedCount || 0);
    }

    private async migrateServiceRateCards(): Promise<number> {
        if (this.dryRun) {
            const count = await ServiceRateCard.countDocuments({});
            console.log(`[DryRun] Would migrate ${count} service rate cards to platform scope + flow/category`);
            return count;
        }

        const result = await ServiceRateCard.updateMany(
            {},
            [
                {
                    $set: {
                        companyId: null,
                        flowType: { $ifNull: ['$flowType', 'forward'] },
                        category: {
                            $ifNull: [
                                '$category',
                                {
                                    $cond: [
                                        { $eq: ['$cardType', 'sell'] },
                                        'default',
                                        'default',
                                    ],
                                },
                            ],
                        },
                    },
                },
            ]
        );
        return Number(result.modifiedCount || 0);
    }

    private async migrateSellerPolicies(): Promise<number> {
        if (this.dryRun) {
            const count = await SellerCourierPolicy.countDocuments({});
            console.log(`[DryRun] Would backfill ${count} seller courier policies with rateCardType/category`);
            return count;
        }

        const result = await SellerCourierPolicy.updateMany(
            {},
            {
                $set: {
                    rateCardType: 'default',
                    rateCardCategory: 'default',
                },
            }
        );
        return Number(result.modifiedCount || 0);
    }
}
