import mongoose from 'mongoose';
import Zone from '../../../../infrastructure/database/mongoose/models/logistics/shipping/configuration/zone.model';
import logger from '../../../../shared/logger/winston.logger';
import sellerPolicyBootstrapService from './seller-policy-bootstrap.service';

/**
 * Company Onboarding Service
 *
 * Automatically sets up new companies with:
 * - 5 standard zones (A-E) following BlueShip's zone logic
 * - Seller policy bootstrap for active sellers
 *
 * This ensures every company can start shipping immediately without legacy pricing-card dependencies.
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
     * Complete onboarding setup for a new company
     * Called automatically after company creation
     */
    async setupNewCompany(companyId: mongoose.Types.ObjectId): Promise<void> {
        try {
            logger.info(`[CompanyOnboarding] Starting onboarding for company ${companyId}`);

            // Step 1: Create 5 standard zones
            await this.createDefaultZones(companyId);

            // Step 2: Bootstrap seller courier policies for active sellers.
            // For newly created companies this is typically zero and remains safe/idempotent.
            await sellerPolicyBootstrapService.bootstrapForCompany(
                companyId.toString(),
                companyId.toString(),
                { preserveExisting: true }
            );

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
