/**
 * Service-Level Pricing Seeder
 *
 * Seeds the new architecture entities for development:
 * - CourierService
 * - ServiceRateCard (cost + sell)
 * - SellerCourierPolicy (default per seller)
 *
 * Scope: Velocity, Delhivery, Ekart
 */

import mongoose from 'mongoose';
import {
    Company,
    CourierService,
    Integration,
    SellerCourierPolicy,
    ServiceRateCard,
    User,
} from '../../mongoose/models';
import { logger, createTimer } from '../utils/logger.utils';

type ProviderKey = 'velocity' | 'delhivery' | 'ekart';
type ZoneKey = 'zoneA' | 'zoneB' | 'zoneC' | 'zoneD' | 'zoneE';

interface ServiceTemplate {
    provider: ProviderKey;
    integrationProvider: string;
    serviceCode: string;
    displayName: string;
    serviceType: 'surface' | 'express' | 'air' | 'standard';
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
    sellMarkupMultiplier: number;
}

const ZONES: ZoneKey[] = ['zoneA', 'zoneB', 'zoneC', 'zoneD', 'zoneE'];

const SERVICE_TEMPLATES: ServiceTemplate[] = [
    {
        provider: 'velocity',
        integrationProvider: 'velocity-shipfast',
        serviceCode: 'VEL_SURFACE_05KG',
        displayName: 'Velocity Surface 0.5 KG',
        serviceType: 'surface',
        constraints: {
            minWeightKg: 0,
            maxWeightKg: 20,
            maxCodValue: 50000,
            maxPrepaidValue: 200000,
            paymentModes: ['cod', 'prepaid'],
        },
        sla: { eddMinDays: 3, eddMaxDays: 6 },
        costBasePerZoneHalfKg: {
            zoneA: 48,
            zoneB: 56,
            zoneC: 64,
            zoneD: 74,
            zoneE: 88,
        },
        sellMarkupMultiplier: 1.18,
    },
    {
        provider: 'velocity',
        integrationProvider: 'velocity-shipfast',
        serviceCode: 'VEL_EXPRESS_05KG',
        displayName: 'Velocity Express 0.5 KG',
        serviceType: 'express',
        constraints: {
            minWeightKg: 0,
            maxWeightKg: 10,
            maxCodValue: 50000,
            maxPrepaidValue: 200000,
            paymentModes: ['cod', 'prepaid'],
        },
        sla: { eddMinDays: 1, eddMaxDays: 3 },
        costBasePerZoneHalfKg: {
            zoneA: 72,
            zoneB: 82,
            zoneC: 94,
            zoneD: 108,
            zoneE: 124,
        },
        sellMarkupMultiplier: 1.2,
    },
    {
        provider: 'delhivery',
        integrationProvider: 'delhivery',
        serviceCode: 'DLV_SURFACE_05KG',
        displayName: 'Delhivery Surface 0.5 KG',
        serviceType: 'surface',
        constraints: {
            minWeightKg: 0,
            maxWeightKg: 25,
            maxCodValue: 50000,
            maxPrepaidValue: 250000,
            paymentModes: ['cod', 'prepaid'],
        },
        sla: { eddMinDays: 2, eddMaxDays: 5 },
        costBasePerZoneHalfKg: {
            zoneA: 50,
            zoneB: 58,
            zoneC: 66,
            zoneD: 78,
            zoneE: 92,
        },
        sellMarkupMultiplier: 1.17,
    },
    {
        provider: 'delhivery',
        integrationProvider: 'delhivery',
        serviceCode: 'DLV_AIR_05KG',
        displayName: 'Delhivery Air 0.5 KG',
        serviceType: 'air',
        constraints: {
            minWeightKg: 0,
            maxWeightKg: 10,
            maxCodValue: 50000,
            maxPrepaidValue: 250000,
            paymentModes: ['cod', 'prepaid'],
        },
        sla: { eddMinDays: 1, eddMaxDays: 2 },
        costBasePerZoneHalfKg: {
            zoneA: 78,
            zoneB: 90,
            zoneC: 102,
            zoneD: 120,
            zoneE: 136,
        },
        sellMarkupMultiplier: 1.19,
    },
    {
        provider: 'ekart',
        integrationProvider: 'ekart',
        serviceCode: 'EKT_SURFACE_05KG',
        displayName: 'Ekart Surface 0.5 KG',
        serviceType: 'surface',
        constraints: {
            minWeightKg: 0,
            maxWeightKg: 20,
            maxCodValue: 50000,
            maxPrepaidValue: 200000,
            paymentModes: ['cod', 'prepaid'],
        },
        sla: { eddMinDays: 2, eddMaxDays: 5 },
        costBasePerZoneHalfKg: {
            zoneA: 46,
            zoneB: 54,
            zoneC: 62,
            zoneD: 74,
            zoneE: 90,
        },
        sellMarkupMultiplier: 1.16,
    },
];

function round2(value: number): number {
    return Number(value.toFixed(2));
}

function buildZoneRules(baseHalfKg: Record<ZoneKey, number>, multiplier = 1): any[] {
    const slabFactors = {
        slab05: 1,
        slab1: 1.5,
        slab2: 2.25,
        slab5: 3.8,
        extraPerKg: 0.75,
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
                percentage: 55,
                minCharge: 30,
            },
        };
    });
}

async function ensureCourierIntegration(
    companyId: mongoose.Types.ObjectId,
    provider: string
): Promise<mongoose.Types.ObjectId> {
    const existing = await Integration.findOne({
        companyId,
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
        companyId,
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
    logger.step(30, 'Seeding Service-Level Pricing (CourierService, ServiceRateCard, SellerPolicy)');

    try {
        let companies = await Company.find({
            status: 'approved',
            isDeleted: false,
        })
            .select('_id')
            .lean();

        if (!companies.length) {
            logger.warn('No approved companies found. Falling back to all non-deleted companies for dev seeding.');
            companies = await Company.find({ isDeleted: false }).select('_id').lean();
        }

        if (!companies.length) {
            logger.warn('No companies found. Skipping service-level pricing seeder.');
            return;
        }

        let serviceCount = 0;
        let rateCardCount = 0;
        let policyCount = 0;

        for (const company of companies as any[]) {
            const companyId = company._id as mongoose.Types.ObjectId;

            for (const template of SERVICE_TEMPLATES) {
                const integrationId = await ensureCourierIntegration(companyId, template.integrationProvider);

                const courierService = await CourierService.findOneAndUpdate(
                    {
                        companyId,
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
                            zoneSupport: ['zoneA', 'zoneB', 'zoneC', 'zoneD', 'zoneE'],
                            source: 'manual',
                            isDeleted: false,
                        },
                    },
                    { upsert: true, new: true, setDefaultsOnInsert: true }
                );

                serviceCount += 1;

                const now = new Date();
                const baseRateCardPayload = {
                    companyId,
                    serviceId: courierService._id,
                    currency: 'INR',
                    effectiveDates: { startDate: now },
                    status: 'active',
                    calculation: {
                        weightBasis: 'max',
                        roundingUnitKg: 0.5,
                        roundingMode: 'ceil',
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
                    { companyId, serviceId: courierService._id, cardType: 'cost', isDeleted: false },
                    {
                        $set: {
                            ...baseRateCardPayload,
                            cardType: 'cost',
                            sourceMode: template.provider === 'velocity' ? 'TABLE' : 'HYBRID',
                            zoneRules: buildZoneRules(template.costBasePerZoneHalfKg, 1),
                        },
                    },
                    { upsert: true, new: true, setDefaultsOnInsert: true }
                );
                rateCardCount += 1;

                await ServiceRateCard.findOneAndUpdate(
                    { companyId, serviceId: courierService._id, cardType: 'sell', isDeleted: false },
                    {
                        $set: {
                            ...baseRateCardPayload,
                            cardType: 'sell',
                            sourceMode: 'TABLE',
                            zoneRules: buildZoneRules(
                                template.costBasePerZoneHalfKg,
                                template.sellMarkupMultiplier
                            ),
                        },
                    },
                    { upsert: true, new: true, setDefaultsOnInsert: true }
                );
                rateCardCount += 1;
            }

            const seller = await User.findOne({
                role: 'seller',
                companyId,
                isDeleted: false,
            })
                .select('_id')
                .lean();

            if (seller?._id) {
                await SellerCourierPolicy.findOneAndUpdate(
                    {
                        companyId,
                        sellerId: seller._id,
                    },
                    {
                        $set: {
                            allowedProviders: [],
                            allowedServiceIds: [],
                            blockedProviders: [],
                            blockedServiceIds: [],
                            selectionMode: 'manual_with_recommendation',
                            autoPriority: 'balanced',
                            balancedDeltaPercent: 5,
                            isActive: true,
                            metadata: {
                                notes: 'Seeded default seller policy for service-level pricing',
                            },
                        },
                    },
                    { upsert: true, new: true, setDefaultsOnInsert: true }
                );
                policyCount += 1;
            }
        }

        logger.complete('service-level pricing entities', serviceCount + rateCardCount + policyCount, timer.elapsed());
        logger.table({
            Companies: companies.length,
            CourierServices: serviceCount,
            ServiceRateCards: rateCardCount,
            SellerPolicies: policyCount,
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
