import mongoose from 'mongoose';
import Zone from '../../../../infrastructure/database/mongoose/models/logistics/shipping/configuration/zone.model';
import RateCard from '../../../../infrastructure/database/mongoose/models/logistics/shipping/configuration/rate-card.model';
import Company from '../../../../infrastructure/database/mongoose/models/organization/core/company.model';
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
            const zonePricing = {
                zoneA: { baseWeight: 0.5, basePrice: 30, additionalPricePerKg: 15 },
                zoneB: { baseWeight: 0.5, basePrice: 40, additionalPricePerKg: 20 },
                zoneC: { baseWeight: 0.5, basePrice: 50, additionalPricePerKg: 25 },
                zoneD: { baseWeight: 0.5, basePrice: 65, additionalPricePerKg: 30 },
                zoneE: { baseWeight: 0.5, basePrice: 90, additionalPricePerKg: 45 }
            };

            // Create the rate card
            const rateCard = new RateCard({
                name: `Standard Rates - ${companyId.toString().substring(0, 8)}`,
                companyId,
                zonePricing,
                effectiveDates: {
                    startDate: new Date()
                },
                status: 'active',
                version: 'v2',
                versionNumber: 1,
                zoneBType: 'state',
                minimumFare: 35,
                minimumFareCalculatedOn: 'freight_overhead',
                codPercentage: 2.0,
                codMinimumCharge: 25,
                fuelSurcharge: 8,
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
