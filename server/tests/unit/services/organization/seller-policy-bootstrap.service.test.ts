import mongoose from 'mongoose';

jest.mock('../../../../src/infrastructure/database/mongoose/models', () => ({
    Company: {
        findOne: jest.fn(),
    },
    User: {
        countDocuments: jest.fn(),
        find: jest.fn(),
    },
    SellerCourierPolicy: {
        bulkWrite: jest.fn(),
    },
}));

import sellerPolicyBootstrapService from '../../../../src/core/application/services/organization/seller-policy-bootstrap.service';
import {
Company,
SellerCourierPolicy,
User,
} from '../../../../src/infrastructure/database/mongoose/models';

const COMPANY_ID = new mongoose.Types.ObjectId().toString();
const USER_ID = new mongoose.Types.ObjectId().toString();

describe('seller-policy-bootstrap.service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('counts active seller users for a company', async () => {
        (User.countDocuments as jest.Mock).mockResolvedValue(42);

        const count = await sellerPolicyBootstrapService.countActiveSellers(COMPANY_ID);

        expect(count).toBe(42);
        expect(User.countDocuments).toHaveBeenCalledWith(
            expect.objectContaining({
                role: 'seller',
                isActive: true,
                isDeleted: false,
            })
        );
    });

    it('throws for invalid company id', async () => {
        await expect(
            sellerPolicyBootstrapService.countActiveSellers('invalid-id')
        ).rejects.toMatchObject({
            code: 'VAL_INVALID_INPUT',
        });
    });

    it('returns empty result when no active sellers exist', async () => {
        (Company.findOne as jest.Mock).mockReturnValue({
            select: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue({ _id: COMPANY_ID }),
            }),
        });

        (User.find as jest.Mock).mockReturnValue({
            select: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue([]),
            }),
        });

        const result = await sellerPolicyBootstrapService.bootstrapForCompany(
            COMPANY_ID,
            USER_ID
        );

        expect(result).toEqual({
            companyId: COMPANY_ID,
            totalSellers: 0,
            created: 0,
            skipped: 0,
            errors: [],
        });
        expect(SellerCourierPolicy.bulkWrite).not.toHaveBeenCalled();
    });

    it('creates missing policies and skips existing ones via upsert counts', async () => {
        const seller1 = { _id: new mongoose.Types.ObjectId() };
        const seller2 = { _id: new mongoose.Types.ObjectId() };

        (Company.findOne as jest.Mock).mockReturnValue({
            select: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue({ _id: COMPANY_ID }),
            }),
        });

        (User.find as jest.Mock).mockReturnValue({
            select: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue([seller1, seller2]),
            }),
        });

        (SellerCourierPolicy.bulkWrite as jest.Mock).mockResolvedValue({
            upsertedCount: 1,
        });

        const result = await sellerPolicyBootstrapService.bootstrapForCompany(
            COMPANY_ID,
            USER_ID,
            { preserveExisting: true }
        );

        expect(result.totalSellers).toBe(2);
        expect(result.created).toBe(1);
        expect(result.skipped).toBe(1);
        expect(SellerCourierPolicy.bulkWrite).toHaveBeenCalledTimes(1);
    });

    it('throws when company does not exist', async () => {
        (Company.findOne as jest.Mock).mockReturnValue({
            select: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue(null),
            }),
        });

        await expect(
            sellerPolicyBootstrapService.bootstrapForCompany(COMPANY_ID, USER_ID)
        ).rejects.toMatchObject({
            code: 'RES_COMPANY_NOT_FOUND',
        });
    });
});
