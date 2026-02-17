import ImpersonationService from '@/core/application/services/admin/impersonation.service';
import { getImpersonationHistory } from '@/presentation/http/controllers/admin/impersonation.controller';
import { ErrorCode } from '@/shared/errors/errorCodes';
import { guardChecks, parsePagination } from '@/shared/helpers/controller.helpers';
import { calculatePagination, sendPaginated } from '@/shared/utils/responseHelper';

describe('impersonation.controller getImpersonationHistory', () => {
    const res: any = {};
    const next = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        (parsePagination as jest.Mock).mockReturnValue({ page: 1, limit: 20, skip: 0 });
        (calculatePagination as jest.Mock).mockReturnValue({
            page: 1,
            limit: 20,
            total: 1,
            totalPages: 1,
            hasNextPage: false,
            hasPrevPage: false,
        });
    });

    it('returns forbidden when non-super-admin requests another admin history', async () => {
        const req: any = {
            query: {
                adminUserId: 'admin-other',
            },
        };

        (guardChecks as jest.Mock).mockReturnValue({
            userId: 'admin-self',
            isSuperAdmin: false,
        });

        await getImpersonationHistory(req, res, next);

        expect(ImpersonationService.getImpersonationHistory).not.toHaveBeenCalled();
        expect(next).toHaveBeenCalledTimes(1);
        const err = (next as jest.Mock).mock.calls[0][0];
        expect(err.code).toBe(ErrorCode.AUTHZ_FORBIDDEN);
    });

    it('forces non-super-admin history to own adminUserId', async () => {
        const req: any = {
            query: {},
        };

        (guardChecks as jest.Mock).mockReturnValue({
            userId: 'admin-self',
            isSuperAdmin: false,
        });

        (ImpersonationService.getImpersonationHistory as jest.Mock).mockResolvedValue({
            sessions: [{ id: 's1' }],
            total: 1,
        });

        await getImpersonationHistory(req, res, next);

        expect(ImpersonationService.getImpersonationHistory).toHaveBeenCalledWith({
            targetUserId: undefined,
            adminUserId: 'admin-self',
            limit: 20,
            skip: 0,
        });
        expect(sendPaginated).toHaveBeenCalled();
        expect(next).not.toHaveBeenCalled();
    });

    it('allows super-admin to query another admin history', async () => {
        const req: any = {
            query: {
                adminUserId: 'admin-other',
                targetUserId: 'seller-1',
            },
        };

        (guardChecks as jest.Mock).mockReturnValue({
            userId: 'super-1',
            isSuperAdmin: true,
        });

        (ImpersonationService.getImpersonationHistory as jest.Mock).mockResolvedValue({
            sessions: [{ id: 's2' }],
            total: 1,
        });

        await getImpersonationHistory(req, res, next);

        expect(ImpersonationService.getImpersonationHistory).toHaveBeenCalledWith({
            targetUserId: 'seller-1',
            adminUserId: 'admin-other',
            limit: 20,
            skip: 0,
        });
        expect(sendPaginated).toHaveBeenCalled();
        expect(next).not.toHaveBeenCalled();
    });
});

jest.mock('@/core/application/services/admin/impersonation.service', () => ({
    __esModule: true,
    default: {
        getImpersonationHistory: jest.fn(),
    },
}));

jest.mock('@/shared/helpers/controller.helpers', () => ({
    guardChecks: jest.fn(),
    parsePagination: jest.fn(),
}));

jest.mock('@/shared/utils/responseHelper', () => ({
    calculatePagination: jest.fn(),
    sendPaginated: jest.fn(),
    sendSuccess: jest.fn(),
    sendCreated: jest.fn(),
}));

jest.mock('@/shared/logger/winston.logger', () => ({
    error: jest.fn(),
}));
