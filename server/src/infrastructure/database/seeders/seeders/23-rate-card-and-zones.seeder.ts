/**
 * Rate Cards and Zones Seeder (Refactored)
 *
 * Generates shipping zones and rate cards using the NEW simplified zonePricing model.
 * This seeder creates production-ready rate cards that match BlueShip's battle-tested approach.
 *
 * Changes from old seeder:
 * - Uses NEW zonePricing field (BlueShip-style per-zone pricing)
 * - Standardized zoneBType (state | distance)
 * - Fixed COD configuration (codPercentage, codMinimumCharge)
 * - Proper minimumFare usage
 * - Cleaner zone definitions
 */

import mongoose from 'mongoose';
import RateCard from '../../mongoose/models/logistics/shipping/configuration/rate-card.model';
import Zone from '../../mongoose/models/logistics/shipping/configuration/zone.model';
import Company from '../../mongoose/models/organization/core/company.model';
import { logger, createTimer } from '../utils/logger.utils';
import { selectRandom } from '../utils/random.utils';
import { CARRIERS } from '../data/carrier-data';
import dotenv from 'dotenv';

// ============================================================================
// ZONE DEFINITIONS
// ============================================================================

const STANDARD_ZONE_DEFINITIONS = [
    {
        code: 'zoneA',
        name: 'Zone A - Within City',
        description: 'Same city delivery - fastest service',
        states: ['Delhi', 'Maharashtra', 'Karnataka', 'Telangana'],
        basePrice: 30,
        additionalPricePerKg: 15,
        transitDays: { min: 1, max: 2 },
        postalCodePrefixes: ['11', '40', '56', '50']
    },
    {
        code: 'zoneB',
        name: 'Zone B - Within State',
        description: 'Same state or nearby (<500km)',
        states: ['Uttar Pradesh', 'Gujarat', 'Rajasthan', 'Punjab', 'Haryana'],
        basePrice: 40,
        additionalPricePerKg: 20,
        transitDays: { min: 2, max: 3 },
        postalCodePrefixes: ['20', '38', '30', '14', '12']
    },
    {
        code: 'zoneC',
        name: 'Zone C - Metro to Metro',
        description: 'Between major metro cities',
        states: ['Tamil Nadu', 'West Bengal', 'Madhya Pradesh'],
        basePrice: 50,
        additionalPricePerKg: 25,
        transitDays: { min: 3, max: 4 },
        postalCodePrefixes: ['60', '70', '46']
    },
    {
        code: 'zoneD',
        name: 'Zone D - Rest of India',
        description: 'Tier 2/3 cities and remote areas',
        states: ['Himachal Pradesh', 'Uttarakhand', 'Bihar', 'Odisha'],
        basePrice: 65,
        additionalPricePerKg: 30,
        transitDays: { min: 4, max: 6 },
        postalCodePrefixes: ['17', '24', '80', '75']
    },
    {
        code: 'zoneE',
        name: 'Zone E - Special Regions',
        description: 'J&K, Northeast, Islands - extended transit',
        states: ['Jammu & Kashmir', 'Assam', 'Meghalaya', 'Andaman & Nicobar'],
        basePrice: 90,
        additionalPricePerKg: 45,
        transitDays: { min: 5, max: 10 },
        postalCodePrefixes: ['19', '78', '74', '79']
    }
];

// ============================================================================
// RATE CARD TEMPLATES (Using Simplified Pricing)
// ============================================================================

interface RateCardTemplate {
    key: string;
    label: string;
    category: string;
    shipmentType: 'forward' | 'reverse';
    status: 'draft' | 'active' | 'inactive';
    priority: number;

    // Zone Pricing (per zone configuration)
    zonePricing: {
        zoneA: { baseWeight: number; basePrice: number; additionalPricePerKg: number };
        zoneB: { baseWeight: number; basePrice: number; additionalPricePerKg: number };
        zoneC: { baseWeight: number; basePrice: number; additionalPricePerKg: number };
        zoneD: { baseWeight: number; basePrice: number; additionalPricePerKg: number };
        zoneE: { baseWeight: number; basePrice: number; additionalPricePerKg: number };
    };

    // Surcharges
    codPercentage: number; // Stored as whole number (2.0 = 2%)
    codMinimumCharge: number;
    // Optional advanced COD slabs (overrides percentage)
    codSurcharges?: Array<{ min: number; max: number; value: number; type: 'flat' | 'percentage' }>;
    fuelSurcharge: number;
    minimumFare: number;
    minimumFareCalculatedOn: 'freight' | 'freight_overhead';
    zoneBType: 'state' | 'distance';

    // Special features
    remoteAreaEnabled: boolean;
    remoteAreaSurcharge: number;
    isSpecialPromotion: boolean;
    isLocked: boolean;
}

const RATECARD_TEMPLATES: RateCardTemplate[] = [
    {
        key: 'economy',
        label: 'Economy',
        category: 'economy',
        shipmentType: 'forward',
        status: 'active',
        priority: 1,
        zonePricing: {
            zoneA: { baseWeight: 0.5, basePrice: 25, additionalPricePerKg: 12 },
            zoneB: { baseWeight: 0.5, basePrice: 32, additionalPricePerKg: 16 },
            zoneC: { baseWeight: 0.5, basePrice: 40, additionalPricePerKg: 20 },
            zoneD: { baseWeight: 0.5, basePrice: 52, additionalPricePerKg: 26 },
            zoneE: { baseWeight: 0.5, basePrice: 72, additionalPricePerKg: 36 }
        },
        codPercentage: 1.5,
        codMinimumCharge: 20,
        fuelSurcharge: 5,
        minimumFare: 30,
        minimumFareCalculatedOn: 'freight',
        zoneBType: 'state',
        remoteAreaEnabled: false,
        remoteAreaSurcharge: 0,
        isSpecialPromotion: false,
        isLocked: false
    },
    {
        key: 'standard',
        label: 'Standard',
        category: 'standard',
        shipmentType: 'forward',
        status: 'active',
        priority: 2,
        zonePricing: {
            zoneA: { baseWeight: 0.5, basePrice: 30, additionalPricePerKg: 15 },
            zoneB: { baseWeight: 0.5, basePrice: 40, additionalPricePerKg: 20 },
            zoneC: { baseWeight: 0.5, basePrice: 50, additionalPricePerKg: 25 },
            zoneD: { baseWeight: 0.5, basePrice: 65, additionalPricePerKg: 30 },
            zoneE: { baseWeight: 0.5, basePrice: 90, additionalPricePerKg: 45 }
        },
        codPercentage: 2.0,
        codMinimumCharge: 25,
        fuelSurcharge: 8,
        minimumFare: 35,
        minimumFareCalculatedOn: 'freight_overhead',
        zoneBType: 'state',
        remoteAreaEnabled: false,
        remoteAreaSurcharge: 0,
        isSpecialPromotion: false,
        isLocked: false
    },
    {
        key: 'express',
        label: 'Express',
        category: 'premium',
        shipmentType: 'forward',
        status: 'active',
        priority: 3,
        zonePricing: {
            zoneA: { baseWeight: 0.5, basePrice: 42, additionalPricePerKg: 21 },
            zoneB: { baseWeight: 0.5, basePrice: 55, additionalPricePerKg: 28 },
            zoneC: { baseWeight: 0.5, basePrice: 68, additionalPricePerKg: 34 },
            zoneD: { baseWeight: 0.5, basePrice: 88, additionalPricePerKg: 44 },
            zoneE: { baseWeight: 0.5, basePrice: 120, additionalPricePerKg: 60 }
        },
        codPercentage: 2.5,
        codMinimumCharge: 30,
        fuelSurcharge: 12,
        minimumFare: 45,
        minimumFareCalculatedOn: 'freight_overhead',
        zoneBType: 'state',
        remoteAreaEnabled: false,
        remoteAreaSurcharge: 0,
        isSpecialPromotion: false,
        isLocked: false
    },
    {
        key: 'metro',
        label: 'Metro Sprint',
        category: 'metro',
        shipmentType: 'forward',
        status: 'active',
        priority: 2,
        zonePricing: {
            zoneA: { baseWeight: 0.5, basePrice: 28, additionalPricePerKg: 14 },
            zoneB: { baseWeight: 0.5, basePrice: 38, additionalPricePerKg: 19 },
            zoneC: { baseWeight: 0.5, basePrice: 46, additionalPricePerKg: 23 }, // Optimized for metro-to-metro
            zoneD: { baseWeight: 0.5, basePrice: 62, additionalPricePerKg: 31 },
            zoneE: { baseWeight: 0.5, basePrice: 85, additionalPricePerKg: 42 }
        },
        codPercentage: 1.8,
        codMinimumCharge: 20,
        fuelSurcharge: 6,
        minimumFare: 32,
        minimumFareCalculatedOn: 'freight_overhead',
        zoneBType: 'state',
        remoteAreaEnabled: false,
        remoteAreaSurcharge: 0,
        isSpecialPromotion: false,
        isLocked: false
    },
    {
        key: 'heavy',
        label: 'Heavy Freight',
        category: 'heavy',
        shipmentType: 'forward',
        status: 'active',
        priority: 4,
        zonePricing: {
            zoneA: { baseWeight: 1.0, basePrice: 50, additionalPricePerKg: 18 }, // Higher base weight for heavy items
            zoneB: { baseWeight: 1.0, basePrice: 70, additionalPricePerKg: 25 },
            zoneC: { baseWeight: 1.0, basePrice: 90, additionalPricePerKg: 32 },
            zoneD: { baseWeight: 1.0, basePrice: 115, additionalPricePerKg: 40 },
            zoneE: { baseWeight: 1.0, basePrice: 160, additionalPricePerKg: 55 }
        },
        codPercentage: 2.0,
        codMinimumCharge: 35,
        fuelSurcharge: 15,
        minimumFare: 60,
        minimumFareCalculatedOn: 'freight_overhead',
        zoneBType: 'state',
        remoteAreaEnabled: false,
        remoteAreaSurcharge: 0,
        isSpecialPromotion: false,
        isLocked: false
    },
    {
        key: 'reverse',
        label: 'Reverse Logistics',
        category: 'reverse',
        shipmentType: 'reverse',
        status: 'active',
        priority: 2,
        zonePricing: {
            zoneA: { baseWeight: 0.5, basePrice: 35, additionalPricePerKg: 18 },
            zoneB: { baseWeight: 0.5, basePrice: 45, additionalPricePerKg: 23 },
            zoneC: { baseWeight: 0.5, basePrice: 58, additionalPricePerKg: 29 },
            zoneD: { baseWeight: 0.5, basePrice: 75, additionalPricePerKg: 38 },
            zoneE: { baseWeight: 0.5, basePrice: 105, additionalPricePerKg: 52 }
        },
        codPercentage: 2.0,
        codMinimumCharge: 25,
        fuelSurcharge: 10,
        minimumFare: 40,
        minimumFareCalculatedOn: 'freight_overhead',
        zoneBType: 'state',
        remoteAreaEnabled: false,
        remoteAreaSurcharge: 0,
        isSpecialPromotion: false,
        isLocked: false
    },
    {
        key: 'cod-saver',
        label: 'COD Saver',
        category: 'cod',
        shipmentType: 'forward',
        status: 'active',
        priority: 2,
        zonePricing: {
            zoneA: { baseWeight: 0.5, basePrice: 32, additionalPricePerKg: 16 },
            zoneB: { baseWeight: 0.5, basePrice: 42, additionalPricePerKg: 21 },
            zoneC: { baseWeight: 0.5, basePrice: 52, additionalPricePerKg: 26 },
            zoneD: { baseWeight: 0.5, basePrice: 68, additionalPricePerKg: 34 },
            zoneE: { baseWeight: 0.5, basePrice: 95, additionalPricePerKg: 48 }
        },
        codPercentage: 1.2, // Lower COD charges - that's the point!
        codMinimumCharge: 15,
        fuelSurcharge: 9,
        minimumFare: 35,
        minimumFareCalculatedOn: 'freight_overhead',
        zoneBType: 'state',
        remoteAreaEnabled: false,
        remoteAreaSurcharge: 0,
        isSpecialPromotion: false,
        isLocked: false
    },
    {
        key: 'remote',
        label: 'Remote Access',
        category: 'remote',
        shipmentType: 'forward',
        status: 'active',
        priority: 4,
        zonePricing: {
            zoneA: { baseWeight: 0.5, basePrice: 35, additionalPricePerKg: 18 },
            zoneB: { baseWeight: 0.5, basePrice: 48, additionalPricePerKg: 24 },
            zoneC: { baseWeight: 0.5, basePrice: 62, additionalPricePerKg: 31 },
            zoneD: { baseWeight: 0.5, basePrice: 85, additionalPricePerKg: 42 },
            zoneE: { baseWeight: 0.5, basePrice: 125, additionalPricePerKg: 62 } // Premium for remote zones
        },
        codPercentage: 2.8,
        codMinimumCharge: 40,
        fuelSurcharge: 14,
        minimumFare: 55,
        minimumFareCalculatedOn: 'freight_overhead',
        zoneBType: 'distance', // Uses distance-based zone B calculation
        remoteAreaEnabled: true,
        remoteAreaSurcharge: 45,
        isSpecialPromotion: false,
        isLocked: false
    },
    {
        key: 'seasonal',
        label: 'Festive Peak',
        category: 'promotion',
        shipmentType: 'forward',
        status: 'active',
        priority: 5, // Highest priority
        zonePricing: {
            zoneA: { baseWeight: 0.5, basePrice: 38, additionalPricePerKg: 19 },
            zoneB: { baseWeight: 0.5, basePrice: 52, additionalPricePerKg: 26 },
            zoneC: { baseWeight: 0.5, basePrice: 65, additionalPricePerKg: 32 },
            zoneD: { baseWeight: 0.5, basePrice: 85, additionalPricePerKg: 42 },
            zoneE: { baseWeight: 0.5, basePrice: 115, additionalPricePerKg: 58 }
        },
        codPercentage: 2.6,
        codMinimumCharge: 35,
        fuelSurcharge: 18, // Higher fuel during peak season
        minimumFare: 50,
        minimumFareCalculatedOn: 'freight_overhead',
        zoneBType: 'state',
        remoteAreaEnabled: false,
        remoteAreaSurcharge: 0,
        isSpecialPromotion: true, // Time-bound promotional card
        isLocked: false
    },
    {
        key: 'enterprise',
        label: 'Enterprise',
        category: 'enterprise',
        shipmentType: 'forward',
        status: 'active',
        priority: 4,
        zonePricing: {
            zoneA: { baseWeight: 0.5, basePrice: 28, additionalPricePerKg: 14 }, // Discounted for volume
            zoneB: { baseWeight: 0.5, basePrice: 38, additionalPricePerKg: 19 },
            zoneC: { baseWeight: 0.5, basePrice: 48, additionalPricePerKg: 24 },
            zoneD: { baseWeight: 0.5, basePrice: 62, additionalPricePerKg: 31 },
            zoneE: { baseWeight: 0.5, basePrice: 88, additionalPricePerKg: 44 }
        },
        codPercentage: 2.2,
        codMinimumCharge: 30,
        fuelSurcharge: 10,
        minimumFare: 48,
        minimumFareCalculatedOn: 'freight_overhead',
        zoneBType: 'state',
        remoteAreaEnabled: false,
        remoteAreaSurcharge: 0,
        isSpecialPromotion: false,
        isLocked: true, // Locked to prevent accidental modification
        // Enterprise uses advanced slabs instead of flat percentage
        codSurcharges: [
            { min: 0, max: 2000, value: 30, type: 'flat' },
            { min: 2001, max: 100000, value: 1.5, type: 'percentage' }
        ]
    }
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generatePostalCodes(prefixes: string[], count: number = 50): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
        const prefix = selectRandom(prefixes);
        const suffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        codes.push(`${prefix}${suffix}`);
    }
    return codes;
}

function getServiceTypesForCarrier(carrierId: string): string[] {
    const carrier = CARRIERS[carrierId as keyof typeof CARRIERS];
    if (!carrier) return ['standard'];

    const normalized = carrier.serviceTypes.map(s => s.trim().toLowerCase());
    if (normalized.includes('standard') && normalized.includes('express')) {
        return ['standard', 'express'];
    }
    if (normalized.length >= 2) return [normalized[0], normalized[1]];
    return [normalized[0] || 'standard'];
}

// ============================================================================
// MAIN SEEDER
// ============================================================================

export async function seedRateCardsAndZones(): Promise<void> {
    const timer = createTimer();
    logger.step(23, 'Seeding Rate Cards & Zones (NEW Simplified Model)');

    try {
        // Clear existing data (safe in dev environment)
        await Zone.deleteMany({});
        await RateCard.deleteMany({});
        logger.info('✓ Cleared existing zones and rate cards');

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
            const createdRateCards: Array<{ template: RateCardTemplate; rateCardId: mongoose.Types.ObjectId }> = [];

            // ================================================================
            // CREATE ZONES
            // ================================================================
            for (const zoneDef of STANDARD_ZONE_DEFINITIONS) {
                const zone = new Zone({
                    name: `${zoneDef.name} - ${company.name}`,
                    companyId: company._id,
                    zoneType: 'standard',
                    standardZoneCode: zoneDef.code,
                    description: zoneDef.description,
                    postalCodes: generatePostalCodes(zoneDef.postalCodePrefixes),
                    serviceability: {
                        carriers: carrierIds,
                        serviceTypes: ['standard', 'express']
                    },
                    transitTimes: carrierIds.flatMap(carrier => {
                        const serviceTypes = getServiceTypesForCarrier(carrier);
                        return serviceTypes.map(serviceType => ({
                            carrier,
                            serviceType,
                            minDays: zoneDef.transitDays.min,
                            maxDays: zoneDef.transitDays.max
                        }));
                    })
                });

                await zone.save();
                companyZones.push(zone);
                totalZones++;
            }

            // ================================================================
            // CREATE RATE CARDS (Using NEW Simplified Model)
            // ================================================================
            for (const template of RATECARD_TEMPLATES) {
                const rateCard = new RateCard({
                    name: `${template.label} - ${company.name || company._id.toString().slice(-6)}`,
                    companyId: company._id,
                    rateCardCategory: template.category,
                    shipmentType: template.shipmentType,
                    status: template.status,

                    // NEW: Simplified zone pricing (BlueShip-style)
                    zonePricing: template.zonePricing,

                    // Surcharges (FIXED fields)
                    gst: 18,
                    codPercentage: template.codPercentage,
                    codMinimumCharge: template.codMinimumCharge,
                    fuelSurcharge: template.fuelSurcharge,
                    fuelSurchargeBase: 'freight',
                    minimumFare: template.minimumFare,
                    minimumFareCalculatedOn: template.minimumFareCalculatedOn,
                    zoneBType: template.zoneBType,

                    // Remote area settings
                    remoteAreaEnabled: template.remoteAreaEnabled,
                    remoteAreaSurcharge: template.remoteAreaSurcharge,

                    // COD surcharge slabs (optional advanced feature - uses template if present)
                    codSurcharges: template.codSurcharges || [],

                    // Effective dates
                    effectiveDates: {
                        startDate: new Date(),
                        endDate: template.isSpecialPromotion
                            ? new Date(new Date().setMonth(new Date().getMonth() + 3)) // 3 months for promotions
                            : new Date(new Date().setFullYear(new Date().getFullYear() + 1)) // 1 year for regular
                    },

                    // Versioning & metadata
                    version: 'v2', // Mark as new simplified model
                    versionNumber: 1,
                    priority: template.priority,
                    isSpecialPromotion: template.isSpecialPromotion,
                    isLocked: template.isLocked,

                    // Customer overrides (enterprise only)
                    customerOverrides: template.key === 'enterprise'
                        ? [
                            { customerGroup: 'vip', discountPercentage: 7.5 },
                            { customerGroup: 'enterprise', flatDiscount: 20 }
                        ]
                        : [],

                    isDeleted: false
                });

                await rateCard.save();
                createdRateCards.push({ template, rateCardId: rateCard._id as any });
                totalRateCards++;
            }

            // ================================================================
            // ASSIGN DEFAULT RATE CARD TO COMPANY
            // ================================================================
            const defaultTemplateKeyOrder = ['standard', 'enterprise', 'economy', 'express'];
            const selected =
                defaultTemplateKeyOrder
                    .map((key) => createdRateCards.find((rc) => rc.template.key === key))
                    .find(Boolean) ||
                createdRateCards.find((rc) => rc.template.status === 'active') ||
                createdRateCards[0];

            if (selected) {
                await Company.updateOne(
                    { _id: company._id },
                    { $set: { 'settings.defaultRateCardId': selected.rateCardId } }
                );
            }

            logger.info(`✓ Created ${companyZones.length} zones and ${RATECARD_TEMPLATES.length} rate cards for ${company.name || company._id}`);
        }

        logger.complete('Rate Cards & Zones', totalRateCards + totalZones, timer.elapsed());
        logger.table({
            'Companies Processed': companies.length,
            'Zones Created': totalZones,
            'Rate Cards Created': totalRateCards,
            'Pricing Model': 'Simplified (zonePricing)'
        });

    } catch (error) {
        logger.error('Failed to seed rate cards and zones:', error);
        throw error;
    }
}

// ============================================================================
// STANDALONE EXECUTION
// ============================================================================

if (require.main === module) {
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
            logger.success('✅ Seeding completed successfully with NEW simplified model!');
            return mongoose.disconnect();
        })
        .catch((error) => {
            logger.error('Seeding failed:', error);
            process.exit(1);
        });
}
