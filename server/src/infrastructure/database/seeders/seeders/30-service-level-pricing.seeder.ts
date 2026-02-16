/**
 * Service-Level Pricing Seeder
 *
 * Seeds the platform-scoped courier pricing architecture:
 * - Platform CourierService (100+)
 * - Platform ServiceRateCard (cost + sell categories)
 * - SellerCourierPolicy defaults for category/type
 */

import mongoose from 'mongoose';
import {
    CourierService,
    Integration,
    SellerCourierPolicy,
    ServiceRateCard,
    User,
} from '../../mongoose/models';
import { createTimer, logger } from '../utils/logger.utils';

type ProviderKey = 'velocity' | 'delhivery' | 'ekart';
type ZoneKey = 'zoneA' | 'zoneB' | 'zoneC' | 'zoneD' | 'zoneE';
type ServiceType = 'surface' | 'express' | 'air' | 'standard';
type RateCardCategory = 'default' | 'basic' | 'standard' | 'advanced' | 'custom';

const ZONES: ZoneKey[] = ['zoneA', 'zoneB', 'zoneC', 'zoneD', 'zoneE'];
const WEIGHT_BUCKETS = [0.5, 1, 2, 3, 5, 7.5, 10, 15, 20];
const SERVICE_TYPES: ServiceType[] = ['surface', 'express', 'air', 'standard'];
const SELL_CATEGORIES: RateCardCategory[] = ['default', 'basic', 'standard', 'advanced', 'custom'];

const PROVIDER_CONFIG: Record<
    ProviderKey,
    {
        displayName: string;
        baseZoneHalfKg: Record<ZoneKey, number>;
        defaultPaymentModes: Array<'cod' | 'prepaid'>;
        serviceTypeBoost: Record<ServiceType, number>;
        slaByServiceType: Record<ServiceType, { eddMinDays: number; eddMaxDays: number }>;
    }
> = {
    velocity: {
        displayName: 'Velocity',
        baseZoneHalfKg: { zoneA: 44, zoneB: 50, zoneC: 58, zoneD: 66, zoneE: 76 },
        defaultPaymentModes: ['cod', 'prepaid'],
        serviceTypeBoost: { surface: 1, express: 1.22, air: 1.35, standard: 1.08 },
        slaByServiceType: {
            surface: { eddMinDays: 3, eddMaxDays: 6 },
            express: { eddMinDays: 1, eddMaxDays: 3 },
            air: { eddMinDays: 1, eddMaxDays: 2 },
            standard: { eddMinDays: 2, eddMaxDays: 5 },
        },
    },
    delhivery: {
        displayName: 'Delhivery',
        baseZoneHalfKg: { zoneA: 46, zoneB: 53, zoneC: 61, zoneD: 70, zoneE: 81 },
        defaultPaymentModes: ['cod', 'prepaid'],
        serviceTypeBoost: { surface: 1, express: 1.2, air: 1.33, standard: 1.1 },
        slaByServiceType: {
            surface: { eddMinDays: 2, eddMaxDays: 5 },
            express: { eddMinDays: 1, eddMaxDays: 3 },
            air: { eddMinDays: 1, eddMaxDays: 2 },
            standard: { eddMinDays: 2, eddMaxDays: 4 },
        },
    },
    ekart: {
        displayName: 'Ekart Logistics',
        baseZoneHalfKg: { zoneA: 43, zoneB: 49, zoneC: 56, zoneD: 65, zoneE: 77 },
        defaultPaymentModes: ['cod', 'prepaid'],
        serviceTypeBoost: { surface: 1, express: 1.18, air: 1.28, standard: 1.07 },
        slaByServiceType: {
            surface: { eddMinDays: 2, eddMaxDays: 5 },
            express: { eddMinDays: 1, eddMaxDays: 3 },
            air: { eddMinDays: 1, eddMaxDays: 2 },
            standard: { eddMinDays: 2, eddMaxDays: 4 },
        },
    },
};

const CATEGORY_MULTIPLIERS: Record<RateCardCategory, number> = {
    default: 1.18,
    basic: 1.14,
    standard: 1.1,
    advanced: 1.06,
    custom: 1.02,
};

interface ServiceTemplate {
    provider: ProviderKey;
    serviceCode: string;
    displayName: string;
    serviceType: ServiceType;
    constraints: {
        minWeightKg: number;
        maxWeightKg: number;
        maxCodValue: number;
        maxPrepaidValue: number;
        paymentModes: Array<'cod' | 'prepaid'>;
    };
    sla: {
        eddMinDays: number;
        eddMaxDays: number;
    };
    costBasePerZoneHalfKg: Record<ZoneKey, number>;
}

function round2(value: number): number {
    return Number(value.toFixed(2));
}

function formatWeightToken(weight: number): string {
    return weight.toString().replace('.', '_');
}

function toServiceCode(provider: ProviderKey, serviceType: ServiceType, maxWeightKg: number): string {
    const providerCode = provider.slice(0, 3).toUpperCase();
    const typeCode = serviceType.slice(0, 3).toUpperCase();
    return `${providerCode}_${typeCode}_${formatWeightToken(maxWeightKg)}KG`;
}

function buildServiceTemplates(): ServiceTemplate[] {
    const templates: ServiceTemplate[] = [];

    for (const provider of Object.keys(PROVIDER_CONFIG) as ProviderKey[]) {
        const config = PROVIDER_CONFIG[provider];

        for (const serviceType of SERVICE_TYPES) {
            for (const maxWeightKg of WEIGHT_BUCKETS) {
                const serviceBoost = config.serviceTypeBoost[serviceType];
                const weightBoost = 1 + Math.log2(maxWeightKg + 1) * 0.065;
                const costBasePerZoneHalfKg: Record<ZoneKey, number> = {
                    zoneA: round2(config.baseZoneHalfKg.zoneA * serviceBoost * weightBoost),
                    zoneB: round2(config.baseZoneHalfKg.zoneB * serviceBoost * weightBoost),
                    zoneC: round2(config.baseZoneHalfKg.zoneC * serviceBoost * weightBoost),
                    zoneD: round2(config.baseZoneHalfKg.zoneD * serviceBoost * weightBoost),
                    zoneE: round2(config.baseZoneHalfKg.zoneE * serviceBoost * weightBoost),
                };

                templates.push({
                    provider,
                    serviceCode: toServiceCode(provider, serviceType, maxWeightKg),
                    displayName: `${config.displayName} ${serviceType.toUpperCase()} ${maxWeightKg} KG`,
                    serviceType,
                    constraints: {
                        minWeightKg: 0,
                        maxWeightKg,
                        maxCodValue: 50000,
                        maxPrepaidValue: 300000,
                        paymentModes: config.defaultPaymentModes,
                    },
                    sla: config.slaByServiceType[serviceType],
                    costBasePerZoneHalfKg,
                });
            }
        }
    }

    return templates;
}

function buildZoneRules(baseHalfKg: Record<ZoneKey, number>, multiplier = 1): any[] {
    const slabFactors = {
        slab05: 1,
        slab1: 1.55,
        slab2: 2.3,
        slab5: 3.9,
        extraPerKg: 0.76,
    };

    return ZONES.map((zoneKey) => {
        const base = baseHalfKg[zoneKey] * multiplier;
        return {
            zoneKey,
            slabs: [
                { minKg: 0, maxKg: 0.5, charge: round2(base * slabFactors.slab05) },
                { minKg: 0.5, maxKg: 1, charge: round2(base * slabFactors.slab1) },
                { minKg: 1, maxKg: 2, charge: round2(base * slabFactors.slab2) },
                { minKg: 2, maxKg: 5, charge: round2(base * slabFactors.slab5) },
            ],
            additionalPerKg: round2(base * slabFactors.extraPerKg),
            codRule: {
                type: 'percentage',
                percentage: 2,
                minCharge: 25,
                maxCharge: 120,
            },
            fuelSurcharge: {
                percentage: 0,
                base: 'freight',
            },
            rtoRule: {
                type: 'percentage',
                percentage: 55,
                minCharge: 30,
            },
        };
    });
}

async function verifyPlatformServiceLevelIntegrity(
    canonicalServices: Array<{ _id: mongoose.Types.ObjectId; serviceCode: string }>
): Promise<void> {
    for (const service of canonicalServices) {
        const activeCostCard = await ServiceRateCard.exists({
            companyId: null,
            serviceId: service._id,
            cardType: 'cost',
            flowType: 'forward',
            category: 'default',
            status: 'active',
            isDeleted: false,
        });

        if (!activeCostCard) {
            throw new Error(`Missing active forward cost rate card for service ${service.serviceCode}`);
        }

        for (const category of SELL_CATEGORIES) {
            const activeSellCard = await ServiceRateCard.exists({
                companyId: null,
                serviceId: service._id,
                cardType: 'sell',
                flowType: 'forward',
                category,
                status: 'active',
                isDeleted: false,
            });

            if (!activeSellCard) {
                throw new Error(`Missing active forward sell ${category} rate card for service ${service.serviceCode}`);
            }
        }
    }
}

async function archiveDuplicatePlatformServices(
    serviceCode: string,
    canonicalServiceId: mongoose.Types.ObjectId
): Promise<void> {
    await CourierService.updateMany(
        {
            companyId: null,
            serviceCode,
            _id: { $ne: canonicalServiceId },
            isDeleted: false,
        },
        {
            $set: {
                isDeleted: true,
                status: 'inactive',
            },
        }
    );
}

async function ensureCourierIntegration(provider: ProviderKey): Promise<mongoose.Types.ObjectId> {
    const existing = await Integration.findOne({
        companyId: null,
        type: 'courier',
        provider,
        isDeleted: false,
    }).lean();

    if (existing) {
        await Integration.updateOne(
            { _id: existing._id },
            {
                $set: {
                    'settings.isActive': true,
                },
            }
        );
        return existing._id as mongoose.Types.ObjectId;
    }

    const created = await Integration.create({
        companyId: null,
        type: 'courier',
        provider,
        credentials: {
            apiKey: `dev-${provider}-key`,
            apiSecret: `dev-${provider}-secret`,
        },
        settings: {
            isActive: true,
            isPrimary: false,
        },
        metadata: {
            lastSyncAt: new Date(),
        },
        isDeleted: false,
    });

    return created._id as mongoose.Types.ObjectId;
}

export async function seedServiceLevelPricing(): Promise<void> {
    const timer = createTimer();
    logger.step(
        30,
        'Seeding Service-Level Pricing (100+ Platform CourierService, Category-Aware ServiceRateCards, SellerPolicy defaults)'
    );

    try {
        const templates = buildServiceTemplates();
        const integrationIds = {
            velocity: await ensureCourierIntegration('velocity'),
            delhivery: await ensureCourierIntegration('delhivery'),
            ekart: await ensureCourierIntegration('ekart'),
        } as const;

        let serviceCount = 0;
        let rateCardCount = 0;
        let policyCount = 0;
        const canonicalServices: Array<{ _id: mongoose.Types.ObjectId; serviceCode: string }> = [];

        for (const template of templates) {
            const integrationId = integrationIds[template.provider];

            const courierService = await CourierService.findOneAndUpdate(
                {
                    companyId: null,
                    serviceCode: template.serviceCode,
                },
                {
                    $set: {
                        provider: template.provider,
                        integrationId,
                        displayName: template.displayName,
                        serviceType: template.serviceType,
                        status: 'active',
                        constraints: template.constraints,
                        sla: template.sla,
                        zoneSupport: ['A', 'B', 'C', 'D', 'E'],
                        source: 'manual',
                        flowType: 'forward',
                        isDeleted: false,
                    },
                },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );
            const serviceId = courierService._id as mongoose.Types.ObjectId;
            await archiveDuplicatePlatformServices(template.serviceCode, serviceId);
            canonicalServices.push({ _id: serviceId, serviceCode: template.serviceCode });

            serviceCount += 1;

            const now = new Date();
            const baseRateCardPayload = {
                companyId: null,
                serviceId,
                currency: 'INR',
                flowType: 'forward' as const,
                effectiveDates: { startDate: now },
                status: 'active' as const,
                calculation: {
                    weightBasis: 'max' as const,
                    roundingUnitKg: 0.5,
                    roundingMode: 'ceil' as const,
                    dimDivisor: 5000,
                },
                metadata: {
                    version: 1,
                    importedFrom: 'dev-seed',
                    importedAt: now,
                },
                isDeleted: false,
            };

            await ServiceRateCard.findOneAndUpdate(
                {
                    companyId: null,
                    serviceId,
                    cardType: 'cost',
                    flowType: 'forward',
                    category: 'default',
                    isDeleted: false,
                },
                {
                    $set: {
                        ...baseRateCardPayload,
                        cardType: 'cost',
                        category: 'default',
                        sourceMode: template.provider === 'velocity' ? 'TABLE' : 'HYBRID',
                        zoneRules: buildZoneRules(template.costBasePerZoneHalfKg, 1),
                    },
                },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );
            rateCardCount += 1;

            for (const category of SELL_CATEGORIES) {
                await ServiceRateCard.findOneAndUpdate(
                    {
                    companyId: null,
                    serviceId,
                        cardType: 'sell',
                        flowType: 'forward',
                        category,
                        isDeleted: false,
                    },
                    {
                        $set: {
                            ...baseRateCardPayload,
                            cardType: 'sell',
                            category,
                            sourceMode: 'TABLE',
                            zoneRules: buildZoneRules(
                                template.costBasePerZoneHalfKg,
                                CATEGORY_MULTIPLIERS[category]
                            ),
                        },
                    },
                    { upsert: true, new: true, setDefaultsOnInsert: true }
                );
                rateCardCount += 1;
            }
        }

        const sellers = await User.find({
            role: 'seller',
            isDeleted: false,
            companyId: { $exists: true, $ne: null },
        })
            .select('_id companyId')
            .lean<Array<{ _id: mongoose.Types.ObjectId; companyId: mongoose.Types.ObjectId }>>();

        for (const seller of sellers) {
            await SellerCourierPolicy.findOneAndUpdate(
                {
                    companyId: seller.companyId,
                    sellerId: seller._id,
                },
                {
                    $setOnInsert: {
                        allowedProviders: [],
                        allowedServiceIds: [],
                        blockedProviders: [],
                        blockedServiceIds: [],
                        selectionMode: 'manual_with_recommendation',
                        autoPriority: 'balanced',
                        balancedDeltaPercent: 5,
                        isActive: true,
                        rateCardType: 'default',
                        rateCardCategory: 'default',
                        metadata: {
                            notes: 'Seeded default seller policy for service-level pricing',
                        },
                    },
                },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );
            policyCount += 1;
        }

        await SellerCourierPolicy.updateMany(
            { $or: [{ rateCardType: { $exists: false } }, { rateCardType: null }, { rateCardType: '' }] },
            { $set: { rateCardType: 'default' } }
        );
        await SellerCourierPolicy.updateMany(
            { $or: [{ rateCardCategory: { $exists: false } }, { rateCardCategory: null }, { rateCardCategory: '' }] },
            { $set: { rateCardCategory: 'default' } }
        );

        await verifyPlatformServiceLevelIntegrity(canonicalServices);

        logger.complete('service-level pricing entities', serviceCount + rateCardCount + policyCount, timer.elapsed());
        logger.table({
            Scope: 'platform',
            Sellers: sellers.length,
            CourierServices: serviceCount,
            ServiceRateCards: rateCardCount,
            SellerPolicies: policyCount,
            SellCategories: SELL_CATEGORIES.length,
        });
    } catch (error) {
        logger.error('Failed to seed service-level pricing:', error);
        throw error;
    }
}

if (require.main === module) {
    const run = async () => {
        try {
            await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/Shipcrowd');
            await seedServiceLevelPricing();
            await mongoose.disconnect();
        } catch (error) {
            console.error('Error running service-level pricing seeder:', error);
            process.exit(1);
        }
    };
    run();
}
