import mongoose from 'mongoose';
import Zone from '../../../../infrastructure/database/mongoose/models/logistics/shipping/configuration/zone.model';
import RateCard from '../../../../infrastructure/database/mongoose/models/logistics/shipping/configuration/rate-card.model';
import Company from '../../../../infrastructure/database/mongoose/models/organization/core/company.model';
import { CARRIERS } from '../../../../infrastructure/database/seeders/data/carrier-data';
import logger from '../../../../shared/logger/winston.logger';

/**
 * Company Onboarding Service
 *
 * Automatically sets up new companies with:
 * - 5 standard zones (A-E) following BlueShip's zone logic
 * - Default "Standard Rates" rate card with basic pricing
 * - Auto-assignment of rate card to company
 *
 * This ensures every company can start shipping immediately without manual setup.
 */
export class CompanyOnboardingService {
    private static instance: CompanyOnboardingService;

    private constructor() {}

    public static getInstance(): CompanyOnboardingService {
        if (!CompanyOnboardingService.instance) {
            CompanyOnboardingService.instance = new CompanyOnboardingService();
        }
        return CompanyOnboardingService.instance;
    }

    /**
     * Create 5 standard zones for a company (Hybrid Zone System)
     * These zones use dynamic calculation via PincodeLookupService,
     * so postal codes array is empty (calculated at runtime)
     */
    async createDefaultZones(companyId: mongoose.Types.ObjectId): Promise<void> {
        try {
            const standardZones = [
                {
                    name: `Zone A - Metro (${companyId.toString().substring(0, 8)})`,
                    companyId,
                    zoneType: 'standard' as const,
                    standardZoneCode: 'zoneA' as const,
                    postalCodes: [], // Dynamically calculated (same city)
                    serviceability: {
                        carriers: ['All Carriers'],
                        serviceTypes: ['All Services']
                    },
                    transitTimes: [{
                        carrier: 'all',
                        serviceType: 'all',
                        minDays: 1,
                        maxDays: 2
                    }],
                    isDeleted: false
                },
                {
                    name: `Zone B - Tier 1 (${companyId.toString().substring(0, 8)})`,
                    companyId,
                    zoneType: 'standard' as const,
                    standardZoneCode: 'zoneB' as const,
                    postalCodes: [], // Dynamically calculated (same state)
                    serviceability: {
                        carriers: ['All Carriers'],
                        serviceTypes: ['All Services']
                    },
                    transitTimes: [{
                        carrier: 'all',
                        serviceType: 'all',
                        minDays: 2,
                        maxDays: 3
                    }],
                    isDeleted: false
                },
                {
                    name: `Zone C - Tier 2 (${companyId.toString().substring(0, 8)})`,
                    companyId,
                    zoneType: 'standard' as const,
                    standardZoneCode: 'zoneC' as const,
                    postalCodes: [], // Dynamically calculated (metro to metro)
                    serviceability: {
                        carriers: ['All Carriers'],
                        serviceTypes: ['All Services']
                    },
                    transitTimes: [{
                        carrier: 'all',
                        serviceType: 'all',
                        minDays: 3,
                        maxDays: 5
                    }],
                    isDeleted: false
                },
                {
                    name: `Zone D - Rest of India (${companyId.toString().substring(0, 8)})`,
                    companyId,
                    zoneType: 'standard' as const,
                    standardZoneCode: 'zoneD' as const,
                    postalCodes: [], // Dynamically calculated (rest of India)
                    serviceability: {
                        carriers: ['All Carriers'],
                        serviceTypes: ['All Services']
                    },
                    transitTimes: [{
                        carrier: 'all',
                        serviceType: 'all',
                        minDays: 5,
                        maxDays: 7
                    }],
                    isDeleted: false
                },
                {
                    name: `Zone E - Special (J&K/NE) (${companyId.toString().substring(0, 8)})`,
                    companyId,
                    zoneType: 'standard' as const,
                    standardZoneCode: 'zoneE' as const,
                    postalCodes: [], // Dynamically calculated (J&K/Northeast)
                    serviceability: {
                        carriers: ['All Carriers'],
                        serviceTypes: ['All Services']
                    },
                    transitTimes: [{
                        carrier: 'all',
                        serviceType: 'all',
                        minDays: 7,
                        maxDays: 10
                    }],
                    isDeleted: false
                }
            ];

            await Zone.insertMany(standardZones);
            logger.info(`[CompanyOnboarding] Created 5 standard zones for company ${companyId}`);
        } catch (error) {
            logger.error(`[CompanyOnboarding] Failed to create zones for company ${companyId}:`, error);
            throw error;
        }
    }

    /**
     * Create default "Standard Rates" rate card for a company
     * Includes basic pricing for all carriers with zone-based rates
     */
    async createDefaultRateCard(companyId: mongoose.Types.ObjectId): Promise<mongoose.Types.ObjectId> {
        try {
            // Get all carriers from static CARRIERS data
            const carriersList = Object.values(CARRIERS);

            // Create base rates for each carrier (first service type only for simplicity)
            const baseRates = carriersList.map(carrier => ({
                carrier: carrier.displayName,
                serviceType: carrier.serviceTypes[0], // Use first service (usually 'Standard')
                basePrice: 40, // Zone A base price
                minWeight: 0,
                maxWeight: 0.5 // Up to 500g
            }));

            // Create weight rules (progressive pricing)
            const weightRules = carriersList.flatMap(carrier => [
                {
                    minWeight: 0.5,
                    maxWeight: 10,
                    pricePerKg: 30, // ₹30/kg for 0.5-10kg
                    carrier: carrier.displayName,
                    serviceType: carrier.serviceTypes[0]
                },
                {
                    minWeight: 10,
                    maxWeight: 50,
                    pricePerKg: 25, // ₹25/kg for 10-50kg (bulk discount)
                    carrier: carrier.displayName,
                    serviceType: carrier.serviceTypes[0]
                }
            ]);

            // Get the 5 standard zones we just created
            const zones = await Zone.find({
                companyId,
                zoneType: 'standard',
                isDeleted: false
            }).lean();

            // Create zone rules with zone multipliers (A cheapest, E most expensive)
            const zoneMultipliers: Record<string, number> = {
                zoneA: 1.0,   // Base rate (₹40)
                zoneB: 1.5,   // 50% more (₹60)
                zoneC: 2.25,  // 125% more (₹90)
                zoneD: 3.75,  // 275% more (₹150)
                zoneE: 5.0    // 400% more (₹200)
            };

            const zoneRules = zones.flatMap(zone =>
                carriersList.map(carrier => ({
                    zoneId: zone._id,
                    carrier: carrier.displayName,
                    serviceType: carrier.serviceTypes[0],
                    additionalPrice: zone.standardZoneCode ?
                        (40 * (zoneMultipliers[zone.standardZoneCode] - 1)) : 0,
                    transitDays: zone.transitTimes[0]?.maxDays || 3
                }))
            );

            // Create the rate card
            const rateCard = new RateCard({
                name: `Standard Rates - ${companyId.toString().substring(0, 8)}`,
                companyId,
                baseRates,
                weightRules,
                zoneRules,
                zoneMultipliers,
                effectiveDates: {
                    startDate: new Date()
                },
                status: 'active',
                version: 1,
                isDeleted: false
            });

            await rateCard.save();
            logger.info(`[CompanyOnboarding] Created default rate card ${rateCard._id} for company ${companyId}`);

            return rateCard._id as mongoose.Types.ObjectId;
        } catch (error) {
            logger.error(`[CompanyOnboarding] Failed to create rate card for company ${companyId}:`, error);
            throw error;
        }
    }

    /**
     * Auto-assign the default rate card to the company
     */
    async assignRateCardToCompany(
        companyId: mongoose.Types.ObjectId,
        rateCardId: mongoose.Types.ObjectId
    ): Promise<void> {
        try {
            await Company.findByIdAndUpdate(
                companyId,
                {
                    $set: {
                        'settings.defaultRateCardId': rateCardId
                    }
                },
                { new: true }
            );

            logger.info(`[CompanyOnboarding] Assigned rate card ${rateCardId} to company ${companyId}`);
        } catch (error) {
            logger.error(`[CompanyOnboarding] Failed to assign rate card to company ${companyId}:`, error);
            throw error;
        }
    }

    /**
     * Complete onboarding setup for a new company
     * Called automatically after company creation
     */
    async setupNewCompany(companyId: mongoose.Types.ObjectId): Promise<void> {
        try {
            logger.info(`[CompanyOnboarding] Starting onboarding for company ${companyId}`);

            // Step 1: Create 5 standard zones
            await this.createDefaultZones(companyId);

            // Step 2: Create default rate card
            const rateCardId = await this.createDefaultRateCard(companyId);

            // Step 3: Assign rate card to company
            await this.assignRateCardToCompany(companyId, rateCardId);

            logger.info(`[CompanyOnboarding] Completed onboarding for company ${companyId}`);
        } catch (error) {
            logger.error(`[CompanyOnboarding] Onboarding failed for company ${companyId}:`, error);
            // Don't throw - let company creation succeed even if onboarding fails
            // This prevents blocking company creation if zones/rates setup fails
        }
    }
}

// Export singleton instance
export default CompanyOnboardingService.getInstance();
