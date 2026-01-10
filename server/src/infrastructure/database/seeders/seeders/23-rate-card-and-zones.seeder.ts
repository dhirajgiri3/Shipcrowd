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

const ZONE_DEFINITIONS = [
    {
        name: "Zone A - Metro",
        states: ["Delhi", "Maharashtra", "Karnataka", "Telangana"],
        basePrice: 40,
        transitDays: { min: 1, max: 2 },
        postalCodePrefixes: ['11', '40', '56', '50']
    },
    {
        name: "Zone B - Tier 1",
        states: ["Uttar Pradesh", "Gujarat", "Rajasthan", "Punjab"],
        basePrice: 60,
        transitDays: { min: 2, max: 3 },
        postalCodePrefixes: ['20', '38', '30', '14']
    },
    {
        name: "Zone C - Tier 2",
        states: ["Himachal Pradesh", "Haryana", "Uttarakhand"],
        basePrice: 90,
        transitDays: { min: 3, max: 5 },
        postalCodePrefixes: ['17', '13', '24']
    },
    {
        name: "Zone D - Remote",
        states: ["Assam", "Meghalaya", "Manipur", "Tripura"],
        basePrice: 150,
        transitDays: { min: 5, max: 8 },
        postalCodePrefixes: ['78', '79']
    }
];

function generatePostalCodes(prefixes: string[], count: number = 50): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
        const prefix = selectRandom(prefixes);
        const suffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        codes.push(`${prefix}${suffix}`);
    }
    return codes;
}

export async function seedRateCardsAndZones(): Promise<void> {
    const timer = createTimer();
    logger.step(23, 'Seeding Rate Cards & Zones');

    try {
        const companies = await Company.find({ status: 'approved' }).lean();

        if (companies.length === 0) {
            logger.warn('No approved companies found. Skipping rate card seeding.');
            return;
        }

        const carriers = ['Delhivery', 'BlueDart', 'XpressBees', 'EcomExpress'];
        let totalZones = 0;
        let totalRateCards = 0;

        for (const company of companies) {
            const companyZones: any[] = [];
            const zoneRules: any[] = [];

            // Create Zones
            for (const zoneDef of ZONE_DEFINITIONS) {
                const zone = new Zone({
                    name: `${zoneDef.name} - ${company.name} - ${company._id.toString().substring(0, 4)}`,
                    companyId: company._id,
                    postalCodes: generatePostalCodes(zoneDef.postalCodePrefixes),
                    serviceability: {
                        carriers: carriers,
                        serviceTypes: ['Standard', 'Express', 'Air']
                    },
                    transitTimes: carriers.flatMap(carrier => [
                        { carrier, serviceType: 'Standard', minDays: zoneDef.transitDays.min, maxDays: zoneDef.transitDays.max },
                        { carrier, serviceType: 'Express', minDays: Math.max(1, zoneDef.transitDays.min - 1), maxDays: Math.max(1, zoneDef.transitDays.max - 1) },
                        { carrier, serviceType: 'Air', minDays: 1, maxDays: 2 }
                    ])
                });

                await zone.save();
                companyZones.push(zone);
                totalZones++;

                // Prepare rule for this zone
                for (const carrier of carriers) {
                    zoneRules.push({
                        zoneId: zone._id,
                        carrier,
                        serviceType: 'Standard',
                        additionalPrice: zoneDef.basePrice / 5,
                        transitDays: zoneDef.transitDays.max
                    });
                    zoneRules.push({
                        zoneId: zone._id,
                        carrier,
                        serviceType: 'Express',
                        additionalPrice: (zoneDef.basePrice / 5) * 1.5,
                        transitDays: Math.max(1, zoneDef.transitDays.max - 1)
                    });
                }
            }

            // Create Rate Card
            const rateCard = new RateCard({
                name: `Standard Rates - ${company.name} - ${company._id.toString().substring(0, 4)}`,
                companyId: company._id,
                status: 'active',
                effectiveDates: {
                    startDate: new Date(),
                    endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1))
                },
                baseRates: carriers.flatMap(carrier => [
                    { carrier, serviceType: 'Standard', basePrice: 40, minWeight: 0, maxWeight: 5 },
                    { carrier, serviceType: 'Express', basePrice: 60, minWeight: 0, maxWeight: 5 },
                    { carrier, serviceType: 'Air', basePrice: 80, minWeight: 0, maxWeight: 5 }
                ]),
                weightRules: [
                    { minWeight: 0, maxWeight: 0.5, pricePerKg: 0, carrier: 'Delhivery', serviceType: 'Standard' },
                    { minWeight: 0.5, maxWeight: 50, pricePerKg: 20, carrier: 'Delhivery', serviceType: 'Standard' },
                    // Generic fallback logic would be handled by engine, but seeding specific examples
                    ...carriers.flatMap(c => [
                        { minWeight: 0.5, maxWeight: 50, pricePerKg: 25, carrier: c, serviceType: 'Express' },
                        { minWeight: 0.5, maxWeight: 50, pricePerKg: 35, carrier: c, serviceType: 'Air' }
                    ])
                ],
                zoneRules: zoneRules
            });

            await rateCard.save();
            totalRateCards++;
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
