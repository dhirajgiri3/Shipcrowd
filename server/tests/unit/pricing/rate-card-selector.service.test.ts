
import { describe, it, expect, beforeEach, jest, afterAll } from '@jest/globals';
import { RateCardSelectorService, RateCardSelectionInput } from '../../../src/core/application/services/pricing/rate-card-selector.service';
import { NotFoundError } from '../../../src/shared/errors/app.error';
import mongoose from 'mongoose';

// Mock the models - use jest.fn() directly in the factory
jest.mock('../../../src/infrastructure/database/mongoose/models', () => ({
    RateCard: {
        findOne: jest.fn(),
        findById: jest.fn()
    },
    Company: {
        findById: jest.fn()
    }
}));

// Import after mocking
import { RateCard, Company } from '../../../src/infrastructure/database/mongoose/models';

describe('RateCardSelectorService', () => {
    const mockCompanyId = new mongoose.Types.ObjectId().toString();
    const mockDate = new Date('2023-10-01T12:00:00Z');

    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers().setSystemTime(mockDate);
    });

    afterAll(() => {
        jest.useRealTimers();
    });

    describe('selectRateCard', () => {
        const baseInput: RateCardSelectionInput = {
            companyId: mockCompanyId,
            effectiveDate: mockDate
        };

        it('should prioritize customer-specific override', async () => {
            const customerId = 'cust_123';
            const mockCard = {
                _id: 'card_customer',
                name: 'Customer Card',
                priority: 1,
                effectiveDates: { startDate: new Date('2023-01-01') }
            };

            (RateCard.findOne as jest.Mock<any>).mockReturnValue({
                sort: jest.fn().mockResolvedValue(mockCard)
            });

            const result = await RateCardSelectorService.selectRateCard({ ...baseInput, customerId });

            expect(result.rateCardId).toBe('card_customer');
            expect(result.selectionReason).toBe('customer_override');
        });

        it('should prioritize customer group override if no specific customer match', async () => {
            const customerGroup = 'vip';
            const mockCard = {
                _id: 'card_group',
                name: 'Group Card',
                priority: 1,
                effectiveDates: { startDate: new Date('2023-01-01') }
            };

            // First call (customer override) returns null - no customerId provided
            // Second call (group override) returns mockCard
            (RateCard.findOne as jest.Mock<any>)
                .mockReturnValueOnce({ sort: jest.fn().mockResolvedValue(mockCard) });

            const result = await RateCardSelectorService.selectRateCard({ ...baseInput, customerGroup });

            expect(result.rateCardId).toBe('card_group');
            expect(result.selectionReason).toBe('group_override');
        });

        it('should prioritize high-priority special promotion card', async () => {
            const mockCard = {
                _id: 'card_promo',
                name: 'Promo Card',
                priority: 10,
                isSpecialPromotion: true,
                effectiveDates: { startDate: new Date('2023-01-01') }
            };

            // No customer/group overrides (no customerId or customerGroup provided), but special promo exists
            (RateCard.findOne as jest.Mock<any>)
                .mockReturnValueOnce({ sort: jest.fn().mockResolvedValue(mockCard) });

            const result = await RateCardSelectorService.selectRateCard(baseInput);

            expect(result.rateCardId).toBe('card_promo');
            expect(result.selectionReason).toBe('time_bound');
        });

        it('should fallback to default card from company settings', async () => {
            const defaultCardId = 'card_default';
            const mockCard = {
                _id: defaultCardId,
                name: 'Default Card',
                priority: 0,
                status: 'active',
                effectiveDates: { startDate: new Date('2023-01-01') }
            };

            // No overrides or special cards
            (RateCard.findOne as jest.Mock<any>)
                .mockReturnValueOnce({ sort: jest.fn().mockResolvedValue(null) })
                .mockReturnValueOnce({ sort: jest.fn().mockResolvedValue(null) })
                .mockReturnValueOnce({ sort: jest.fn().mockResolvedValue(null) })
                .mockResolvedValueOnce(mockCard);

            (RateCard.findById as jest.Mock<any>).mockResolvedValue(mockCard);

            (Company.findById as jest.Mock<any>).mockResolvedValue({
                settings: { defaultRateCardId: defaultCardId }
            });

            const result = await RateCardSelectorService.selectRateCard(baseInput);

            expect(result.rateCardId).toBe(defaultCardId);
            expect(result.selectionReason).toBe('default');
        });

        it('should throw NotFoundError if no applicable rate cards found', async () => {
            // All queries return null
            (RateCard.findOne as jest.Mock<any>).mockReturnValue({ sort: jest.fn().mockResolvedValue(null) });
            (Company.findById as jest.Mock<any>).mockResolvedValue({ settings: {} });

            await expect(RateCardSelectorService.selectRateCard(baseInput))
                .rejects
                .toThrow(NotFoundError);
        });
    });
});
