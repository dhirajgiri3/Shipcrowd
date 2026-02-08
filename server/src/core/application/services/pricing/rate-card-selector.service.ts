
import mongoose from 'mongoose';
import { RateCard, Company } from '../../../../infrastructure/database/mongoose/models';
import { AppError, NotFoundError } from '../../../../shared/errors/app.error';
import logger from '../../../../shared/logger/winston.logger';

export interface RateCardSelectionInput {
    companyId: string;
    customerId?: string;
    customerGroup?: string;
    effectiveDate?: Date;
    carrier?: string;
    serviceType?: string;
    shipmentType?: 'forward' | 'reverse';
    rateCardCategory?: string;
}

export interface RateCardSelectionResult {
    rateCardId: string;
    rateCardName: string;
    selectionReason: 'customer_override' | 'group_override' | 'time_bound' | 'default';
    metadata: {
        effectiveFrom: Date;
        effectiveTo?: Date;
        priority: number;
    };
}

export class RateCardSelectorService {

    /**
     * Select the most appropriate rate card based on priority
     * Priority:
     * 1. Customer-Specific Override
     * 2. Customer Group Override
     * 3. Time-Bound Special (Highest Priority)
     * 4. Default Company Rate Card
     */
    static async selectRateCard(input: RateCardSelectionInput): Promise<RateCardSelectionResult> {
        const { companyId, customerId, customerGroup, shipmentType, rateCardCategory } = input;
        const effectiveDate = input.effectiveDate || new Date();

        // Build base filters that apply to ALL queries
        const baseFiltersCompany: any = {
            companyId,
            status: 'active',
            isDeleted: false, // CRITICAL: Never select deleted cards
            'effectiveDates.startDate': { $lte: effectiveDate },
            $or: [
                { 'effectiveDates.endDate': { $exists: false } },
                { 'effectiveDates.endDate': { $gte: effectiveDate } }
            ]
        };

        const baseFiltersAny: any = {
            status: 'active',
            isDeleted: false,
            'effectiveDates.startDate': { $lte: effectiveDate },
            $or: [
                { 'effectiveDates.endDate': { $exists: false } },
                { 'effectiveDates.endDate': { $gte: effectiveDate } }
            ]
        };

        // Add optional filters if provided
        if (shipmentType) {
            baseFiltersCompany.$and = baseFiltersCompany.$and || [];
            baseFiltersCompany.$and.push({
                $or: [
                    { shipmentType },
                    { shipmentType: { $exists: false } }, // Allow cards without shipmentType (generic)
                ]
            });
            baseFiltersAny.$and = baseFiltersAny.$and || [];
            baseFiltersAny.$and.push({
                $or: [
                    { shipmentType },
                    { shipmentType: { $exists: false } },
                ]
            });
        }

        if (rateCardCategory) {
            baseFiltersCompany.$and = baseFiltersCompany.$and || [];
            baseFiltersCompany.$and.push({
                $or: [
                    { rateCardCategory },
                    { rateCardCategory: { $exists: false } }, // Allow cards without category (generic)
                ]
            });
            baseFiltersAny.$and = baseFiltersAny.$and || [];
            baseFiltersAny.$and.push({
                $or: [
                    { rateCardCategory },
                    { rateCardCategory: { $exists: false } },
                ]
            });
        }

        // 1. Check for Customer-Specific Override
        if (customerId) {
            const customerOverride = await RateCard.findOne({
                ...baseFiltersCompany,
                'customerOverrides.customerId': customerId,
            }).sort({ priority: -1 }).lean();

            if (customerOverride) {
                return this.formatResult(customerOverride, 'customer_override');
            }
        }

        // 2. Check for Customer Group Override
        if (customerGroup) {
            const groupOverride = await RateCard.findOne({
                ...baseFiltersCompany,
                'customerOverrides.customerGroup': customerGroup,
            }).sort({ priority: -1 }).lean();

            if (groupOverride) {
                return this.formatResult(groupOverride, 'group_override');
            }
        }

        // 3. Time-Bound / Special Promotion (Highest Priority)
        const specialCard = await RateCard.findOne({
            ...baseFiltersCompany,
            isSpecialPromotion: true,
        }).sort({ priority: -1 }).lean();

        if (specialCard) {
            return this.formatResult(specialCard, 'time_bound');
        }

        // 4. Default Company Rate Card
        const company = await Company.findById(companyId).lean();
        if (company?.settings?.defaultRateCardId) {
            const defaultCard = await RateCard.findOne({
                _id: company.settings.defaultRateCardId,
                ...baseFiltersAny
            }).lean();

            if (defaultCard) {
                return this.formatResult(defaultCard, 'default');
            }
        }

        // Fallback: Find ANY active rate card matching filters (safeguard)
        const fallbackCard = await RateCard.findOne(baseFiltersCompany)
            .sort({ priority: -1, createdAt: -1 })
            .lean();

        if (fallbackCard) {
            return this.formatResult(fallbackCard, 'default');
        }

        const globalFallback = await RateCard.findOne({
            ...baseFiltersAny,
            companyId: null
        }).sort({ priority: -1, createdAt: -1 }).lean();

        if (globalFallback) {
            return this.formatResult(globalFallback, 'default');
        }

        throw new NotFoundError(`No applicable rate card found for company ${companyId} with filters: shipmentType=${shipmentType}, category=${rateCardCategory}`);
    }

    private static formatResult(rateCard: any, reason: RateCardSelectionResult['selectionReason']): RateCardSelectionResult {
        return {
            rateCardId: rateCard._id.toString(),
            rateCardName: rateCard.name,
            selectionReason: reason,
            metadata: {
                effectiveFrom: rateCard.effectiveDates.startDate,
                effectiveTo: rateCard.effectiveDates.endDate,
                priority: rateCard.priority || 0
            }
        };
    }
}
