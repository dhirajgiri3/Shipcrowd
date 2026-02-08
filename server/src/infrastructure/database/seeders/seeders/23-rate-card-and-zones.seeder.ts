/**
 * Rate Cards and Zones Seeder
 * 
 * Generates shipping zones and rate cards for companies.
 */

import mongoose from 'mongoose';
import RateCard from '../../mongoose/models/logistics/shipping/configuration/rate-card.model';
import Zone from '../../mongoose/models/logistics/shipping/configuration/zone.model';
import Company from '../../mongoose/models/organization/core/company.model';
import { logger, createTimer } from '../utils/logger.utils';
import { selectRandom } from '../utils/random.utils';
import { CARRIERS } from '../data/carrier-data';

const STANDARD_ZONE_DEFINITIONS = [
    {
        code: 'zoneA',
        name: 'Zone A - Metro',
        states: ['Delhi', 'Maharashtra', 'Karnataka', 'Telangana'],
        basePrice: 40,
        transitDays: { min: 1, max: 2 },
        postalCodePrefixes: ['11', '40', '56', '50']
    },
    {
        code: 'zoneB',
        name: 'Zone B - Tier 1',
        states: ['Uttar Pradesh', 'Gujarat', 'Rajasthan', 'Punjab'],
        basePrice: 55,
        transitDays: { min: 2, max: 3 },
        postalCodePrefixes: ['20', '38', '30', '14']
    },
    {
        code: 'zoneC',
        name: 'Zone C - Tier 2',
        states: ['Himachal Pradesh', 'Haryana', 'Uttarakhand', 'Bihar'],
        basePrice: 75,
        transitDays: { min: 3, max: 5 },
        postalCodePrefixes: ['17', '13', '24', '80']
    },
    {
        code: 'zoneD',
        name: 'Zone D - Remote',
        states: ['Assam', 'Meghalaya', 'Manipur', 'Tripura'],
        basePrice: 105,
        transitDays: { min: 4, max: 7 },
        postalCodePrefixes: ['78', '79']
    },
    {
        code: 'zoneE',
        name: 'Zone E - Ultra Remote',
        states: ['Jammu & Kashmir', 'Ladakh', 'Andaman & Nicobar', 'Sikkim'],
        basePrice: 140,
        transitDays: { min: 5, max: 8 },
        postalCodePrefixes: ['19', '18', '74', '70']
    }
];

const CUSTOM_ZONE_DEFINITIONS = [
    {
        name: 'Zone X - Hyperlocal',
        baseMultiplier: 1.15,
        transitDays: { min: 0, max: 1 },
        postalCodePrefixes: ['110', '400', '560']
    },
    {
        name: 'Zone Y - Remote Islands',
        baseMultiplier: 2.6,
        transitDays: { min: 6, max: 10 },
        postalCodePrefixes: ['744', '799', '682']
    }
];

const ZONE_MULTIPLIERS: Record<string, number> = {
    zoneA: 1.0,
    zoneB: 1.35,
    zoneC: 1.75,
    zoneD: 2.2,
    zoneE: 2.8
};

const RATECARD_TEMPLATES = [
    { key: 'standard', label: 'Standard', category: 'standard', shipmentType: 'forward', status: 'active', basePrice: 40, fuelSurcharge: 8, minimumFare: 35, codPercentage: 2.0, codMinimumCharge: 25, priority: 2 },
    { key: 'express', label: 'Express', category: 'premium', shipmentType: 'forward', status: 'active', basePrice: 55, fuelSurcharge: 12, minimumFare: 45, codPercentage: 2.5, codMinimumCharge: 30, priority: 3 },
    { key: 'economy', label: 'Economy', category: 'economy', shipmentType: 'forward', status: 'active', basePrice: 32, fuelSurcharge: 5, minimumFare: 30, codPercentage: 1.5, codMinimumCharge: 20, priority: 1 },
    { key: 'metro', label: 'Metro Sprint', category: 'metro', shipmentType: 'forward', status: 'active', basePrice: 38, fuelSurcharge: 6, minimumFare: 32, codPercentage: 1.8, codMinimumCharge: 20, priority: 2 },
    { key: 'heavy', label: 'Heavy Freight', category: 'heavy', shipmentType: 'forward', status: 'active', basePrice: 70, fuelSurcharge: 15, minimumFare: 60, codPercentage: 2.0, codMinimumCharge: 35, priority: 4 },
    { key: 'reverse', label: 'Reverse Logistics', category: 'reverse', shipmentType: 'reverse', status: 'active', basePrice: 45, fuelSurcharge: 10, minimumFare: 40, codPercentage: 2.0, codMinimumCharge: 25, priority: 2 },
    { key: 'cod-saver', label: 'COD Saver', category: 'cod', shipmentType: 'forward', status: 'active', basePrice: 42, fuelSurcharge: 9, minimumFare: 35, codPercentage: 1.2, codMinimumCharge: 15, priority: 2 },
    { key: 'remote', label: 'Remote Access', category: 'remote', shipmentType: 'forward', status: 'active', basePrice: 65, fuelSurcharge: 14, minimumFare: 55, codPercentage: 2.8, codMinimumCharge: 40, priority: 4 },
    { key: 'seasonal', label: 'Festive Peak', category: 'promotion', shipmentType: 'forward', status: 'active', basePrice: 58, fuelSurcharge: 18, minimumFare: 50, codPercentage: 2.6, codMinimumCharge: 35, priority: 5 },
    { key: 'enterprise', label: 'Enterprise', category: 'enterprise', shipmentType: 'forward', status: 'active', basePrice: 52, fuelSurcharge: 10, minimumFare: 48, codPercentage: 2.2, codMinimumCharge: 30, priority: 4 },
] as const;

function generatePostalCodes(prefixes: string[], count: number = 50): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
        const prefix = selectRandom(prefixes);
        const suffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        codes.push(`${prefix}${suffix}`);
    }
    return codes;
}

function normalizeServiceTypes(serviceTypes: string[]): string[] {
    return serviceTypes.map(service => service.trim().toLowerCase());
}

function getServiceTypesForCarrier(carrierId: string): string[] {
    const carrier = CARRIERS[carrierId as keyof typeof CARRIERS];
    const normalized = normalizeServiceTypes(carrier.serviceTypes);
    if (normalized.includes('standard') && normalized.includes('express')) {
        return ['standard', 'express'];
    }
    if (normalized.length >= 2) return [normalized[0], normalized[1]];
    return [normalized[0] || 'standard'];
}

function buildBaseRates(carrierIds: string[], basePrice: number) {
    const serviceMultipliers: Record<string, number> = {
        standard: 1.0,
        express: 1.35,
        economy: 0.85,
        priority: 1.6,
        surface: 0.95,
    };

    return carrierIds.flatMap((carrierId) => {
        const serviceTypes = getServiceTypesForCarrier(carrierId);
        return serviceTypes.map((serviceType) => {
            const multiplier = serviceMultipliers[serviceType] ?? 1.0;
            return {
                carrier: carrierId,
                serviceType,
                basePrice: Math.round(basePrice * multiplier),
                minWeight: 0,
                maxWeight: 0.5
            };
        });
    });
}

function buildWeightRules(baseRates: Array<{ carrier: string; serviceType: string; basePrice: number }>) {
    return baseRates.flatMap((rate) => ([
        {
            minWeight: 0.5,
            maxWeight: 10,
            pricePerKg: Math.round(rate.basePrice * 0.7),
            carrier: rate.carrier,
            serviceType: rate.serviceType
        },
        {
            minWeight: 10,
            maxWeight: 50,
            pricePerKg: Math.round(rate.basePrice * 0.55),
            carrier: rate.carrier,
            serviceType: rate.serviceType
        }
    ]));
}

function buildZoneRules(
    zones: any[],
    baseRates: Array<{ carrier: string; serviceType: string; basePrice: number }>,
    customZoneMultipliers: Map<string, number>
) {
    return zones.flatMap((zone) => {
        const zoneMultiplier = zone.standardZoneCode
            ? (ZONE_MULTIPLIERS[zone.standardZoneCode] || 1.0)
            : (customZoneMultipliers.get(zone._id.toString()) || 1.0);
        return baseRates.map((rate) => {
            const transitTime = zone.transitTimes?.find((entry: any) =>
                entry.carrier === rate.carrier && entry.serviceType === rate.serviceType
            );
            return {
                zoneId: zone._id,
                carrier: rate.carrier,
                serviceType: rate.serviceType,
                additionalPrice: Math.round(rate.basePrice * (zoneMultiplier - 1)),
                transitDays: transitTime?.maxDays || 3
            };
        });
    });
}

export async function seedRateCardsAndZones(): Promise<void> {
    const timer = createTimer();
    logger.step(23, 'Seeding Rate Cards & Zones');

    try {
        // Clear existing zones and rate cards to prevent duplicate key errors
        await Zone.deleteMany({});
        await RateCard.deleteMany({});

        const companies = await Company.find({ status: 'approved' }).lean();

        if (companies.length === 0) {
            logger.warn('No approved companies found. Skipping rate card seeding.');
            return;
        }

        const carrierIds = Object.keys(CARRIERS);
        let totalZones = 0;
        let totalRateCards = 0;

        for (const company of companies) {
            const companyZones: any[] = [];
            const customZoneMultipliers = new Map<string, number>();

            // Create Zones
            for (const zoneDef of STANDARD_ZONE_DEFINITIONS) {
                const zone = new Zone({
                    name: `${zoneDef.name} - ${company._id.toString()}`,
                    companyId: company._id,
                    zoneType: 'standard',
                    standardZoneCode: zoneDef.code,
                    postalCodes: generatePostalCodes(zoneDef.postalCodePrefixes),
                    serviceability: {
                        carriers: carrierIds,
                        serviceTypes: ['standard', 'express']
                    },
                    transitTimes: carrierIds.flatMap(carrier => ([
                        { carrier, serviceType: 'standard', minDays: zoneDef.transitDays.min, maxDays: zoneDef.transitDays.max },
                        { carrier, serviceType: 'express', minDays: Math.max(1, zoneDef.transitDays.min - 1), maxDays: Math.max(1, zoneDef.transitDays.max - 1) }
                    ]))
                });

                await zone.save();
                companyZones.push(zone);
                totalZones++;
            }

            // Create Custom Zones for edge-case coverage
            for (const zoneDef of CUSTOM_ZONE_DEFINITIONS) {
                const zone = new Zone({
                    name: `${zoneDef.name} - ${company._id.toString()}`,
                    companyId: company._id,
                    zoneType: 'custom',
                    postalCodes: generatePostalCodes(zoneDef.postalCodePrefixes, 30),
                    serviceability: {
                        carriers: carrierIds,
                        serviceTypes: ['standard', 'express']
                    },
                    transitTimes: carrierIds.flatMap(carrier => ([
                        { carrier, serviceType: 'standard', minDays: zoneDef.transitDays.min, maxDays: zoneDef.transitDays.max },
                        { carrier, serviceType: 'express', minDays: Math.max(1, zoneDef.transitDays.min), maxDays: Math.max(1, zoneDef.transitDays.max - 1) }
                    ]))
                });

                await zone.save();
                companyZones.push(zone);
                customZoneMultipliers.set(zone._id.toString(), zoneDef.baseMultiplier);
                totalZones++;
            }

            // Create 10 rate cards per company (complete coverage)
            for (const template of RATECARD_TEMPLATES) {
                const selectedCarriers = carrierIds.slice(0, 4);
                const baseRates = buildBaseRates(selectedCarriers, template.basePrice);
                const weightRules = buildWeightRules(baseRates);
                const zoneRules = buildZoneRules(companyZones, baseRates, customZoneMultipliers);

                const rateCard = new RateCard({
                    name: `${template.label} Rates - ${company._id.toString()}`,
                    companyId: company._id,
                    rateCardCategory: template.category,
                    shipmentType: template.shipmentType,
                    status: template.status,
                    gst: 18,
                    minimumFare: template.minimumFare,
                    minimumFareCalculatedOn: template.key === 'economy' ? 'freight' : 'freight_overhead',
                    zoneBType: template.key === 'remote' ? 'region' : 'state',
                    codPercentage: template.codPercentage,
                    codMinimumCharge: template.codMinimumCharge,
                    minimumCall: template.minimumFare,
                    fuelSurcharge: template.fuelSurcharge,
                    fuelSurchargeBase: 'freight',
                    remoteAreaEnabled: template.key === 'remote',
                    remoteAreaSurcharge: template.key === 'remote' ? 45 : 0,
                    codSurcharges: [
                        { min: 0, max: 2000, value: 30, type: 'flat' },
                        { min: 2000, max: 100000, value: 1.0, type: 'percentage' }
                    ],
                    baseRates,
                    weightRules,
                    zoneRules,
                    zoneMultipliers: ZONE_MULTIPLIERS,
                    effectiveDates: {
                        startDate: new Date(),
                        endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1))
                    },
                    version: 'v1',
                    versionNumber: 1,
                    priority: template.priority,
                    isSpecialPromotion: template.key === 'seasonal',
                    isLocked: template.key === 'enterprise',
                    customerOverrides: template.key === 'enterprise'
                        ? [
                            { customerGroup: 'vip', discountPercentage: 7.5 },
                            { customerGroup: 'enterprise', flatDiscount: 20 }
                        ]
                        : [],
                    isDeleted: false
                });

                await rateCard.save();
                totalRateCards++;
            }
        }

        logger.complete('Rate Cards & Zones', totalRateCards + totalZones, timer.elapsed());
        logger.table({
            'Companies Processed': companies.length,
            'Zones Created': totalZones,
            'Rate Cards Created': totalRateCards
        });

    } catch (error) {
        logger.error('Failed to seed rate cards and zones:', error);
        throw error;
    }
}

// Standalone execution support
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    dotenv.config();

    // Ensure ENCRYPTION_KEY is present
    if (!process.env.ENCRYPTION_KEY) {
        console.warn('⚠️  ENCRYPTION_KEY not found in environment. Using default dev key for seeding.');
        process.env.ENCRYPTION_KEY = '02207fcc1b5ce31788490e5cebf0deafb7000b20223942900fffd2c1bbb780';
    }

    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/Shipcrowd';

    mongoose.connect(mongoUri)
        .then(() => {
            logger.info('Connected to MongoDB');
            return seedRateCardsAndZones();
        })
        .then(() => {
            logger.success('Seeding completed successfully');
            return mongoose.disconnect();
        })
        .catch((error) => {
            logger.error('Seeding failed:', error);
            process.exit(1);
        });
}
