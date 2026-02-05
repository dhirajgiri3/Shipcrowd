
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
        const { companyId, customerId, customerGroup } = input;
        const effectiveDate = input.effectiveDate || new Date();

        // 1. Check for Customer-Specific Override
        if (customerId) {
            const customerOverride = await RateCard.findOne({
                companyId,
                'customerOverrides.customerId': customerId,
                status: 'active',
                'effectiveDates.startDate': { $lte: effectiveDate },
                $or: [
                    { 'effectiveDates.endDate': { $exists: false } },
                    { 'effectiveDates.endDate': { $gte: effectiveDate } }
                ]
            }).sort({ priority: -1 });

            if (customerOverride) {
                return this.formatResult(customerOverride, 'customer_override');
            }
        }

        // 2. Check for Customer Group Override
        if (customerGroup) {
            const groupOverride = await RateCard.findOne({
                companyId,
                'customerOverrides.customerGroup': customerGroup,
                status: 'active',
                'effectiveDates.startDate': { $lte: effectiveDate },
                $or: [
                    { 'effectiveDates.endDate': { $exists: false } },
                    { 'effectiveDates.endDate': { $gte: effectiveDate } }
                ]
            }).sort({ priority: -1 });

            if (groupOverride) {
                return this.formatResult(groupOverride, 'group_override');
            }
        }

        // 3. Time-Bound / Special Promotion (Highest Priority)
        // Find all active cards that are NOT default, and pick the highest priority one
        // Need to identify "Special" cards. Assuming 'isSpecialPromotion' flag or high priority > 0
        const specialCard = await RateCard.findOne({
            companyId,
            status: 'active',
            isSpecialPromotion: true,
            'effectiveDates.startDate': { $lte: effectiveDate },
            $or: [
                { 'effectiveDates.endDate': { $exists: false } },
                { 'effectiveDates.endDate': { $gte: effectiveDate } }
            ]
        }).sort({ priority: -1 });

        if (specialCard) {
            return this.formatResult(specialCard, 'time_bound');
        }

        // 4. Default Company Rate Card
        const company = await Company.findById(companyId);
        if (company?.settings?.defaultRateCardId) {
            const defaultCard = await RateCard.findById(company.settings.defaultRateCardId);
            if (defaultCard && defaultCard.status === 'active') { // Ensure default is still active
                return this.formatResult(defaultCard, 'default');
            }
        }

        // Fallback: Find ANY active rate card (safeguard)
        const fallbackCard = await RateCard.findOne({
            companyId,
            status: 'active'
        }).sort({ priority: -1, createdAt: -1 });

        if (fallbackCard) {
            return this.formatResult(fallbackCard, 'default');
        }

        throw new NotFoundError('No applicable rate card found configuration');
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
