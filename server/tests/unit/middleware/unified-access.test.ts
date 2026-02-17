import { NextFunction, Request, Response } from 'express';
import { AccessTier } from '../../../src/core/domain/types/access-tier';
import { KYCState } from '../../../src/core/domain/types/kyc-state';
import { requireAccess } from '../../../src/presentation/http/middleware/auth/unified-access';

// 1. Mock External Dependencies (Access Tier)
const mockDetermineUserTier = jest.fn();
jest.mock('../../../src/presentation/http/middleware/auth/access-tier.middleware', () => ({
    determineUserTier: (user: any) => mockDetermineUserTier(user)
}));

// Mock Database Models
const mockFindOne = jest.fn();
jest.mock('../../../src/infrastructure/database/mongoose/models', () => ({
    User: {},
    KYC: {
        findOne: jest.fn(() => ({
            select: jest.fn(() => mockFindOne())
        }))
    }
}));

// Mock Logger (Inline to avoid hoisting issues)
jest.mock('../../../src/shared/logger/winston.logger', () => ({
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn()
}));

describe('Unified Access Middleware', () => {
    let req: Partial<Request>;
    let res: Response;
    let next: NextFunction;

    beforeEach(() => {
        req = {};
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        } as any;
        next = jest.fn();
        jest.clearAllMocks();
    });

    // --- 1. Authentication ---
    test('should 401 if not authenticated', async () => {
        await requireAccess({})(req as Request, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
    });

    // --- 2. Platform Roles ---
    test('should 403 if platform role does not match', async () => {
        req.user = { role: 'user' } as any;
        await requireAccess({ roles: ['admin'] })(req as Request, res, next);
        expect(res.status).toHaveBeenCalledWith(403);
    });

    test('should pass if platform role matches', async () => {
        req.user = { role: 'admin' } as any;
        await requireAccess({ roles: ['admin'] })(req as Request, res, next);
        expect(next).toHaveBeenCalled();
    });

    // --- 3. Access Tier ---
    test('should 403 if tier is insufficient (Sandbox user accessing Production)', async () => {
        req.user = { role: 'user' } as any;
        mockDetermineUserTier.mockReturnValue(AccessTier.SANDBOX); // User is Sandbox

        await requireAccess({ tier: AccessTier.PRODUCTION })(req as Request, res, next);
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'INSUFFICIENT_ACCESS_TIER' }));
    });

    test('should pass if tier is sufficient', async () => {
        req.user = { role: 'user' } as any;
        mockDetermineUserTier.mockReturnValue(AccessTier.PRODUCTION); // User is Production

        await requireAccess({ tier: AccessTier.PRODUCTION, kyc: false })(req as Request, res, next);
        expect(next).toHaveBeenCalled();
    });

    // --- 4. KYC Check ---
    test('should 403 if KYC required but incomplete', async () => {
        req.user = { role: 'user', kycStatus: { isComplete: false, state: KYCState.DRAFT } } as any;
        mockDetermineUserTier.mockReturnValue(AccessTier.SANDBOX);

        await requireAccess({ kyc: true })(req as Request, res, next);
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'KYC_REQUIRED' }));
    });

    test('should pass if KYC is complete', async () => {
        req.user = { _id: 'user-123', role: 'seller', kycStatus: { isComplete: true, state: KYCState.VERIFIED } } as any;

        await requireAccess({ kyc: true })(req as Request, res, next);
        expect(next).toHaveBeenCalled();
    });

    // --- 5. Team Role ---
    test('should 403 if team role invalid', async () => {
        req.user = { role: 'user', teamRole: 'viewer' } as any;

        await requireAccess({ teamRoles: ['admin', 'manager'] })(req as Request, res, next);
        expect(res.status).toHaveBeenCalledWith(403);
    });

    // --- 6. Company Match ---
    test('should 403 if company mismatch (params)', async () => {
        req.user = { role: 'user', companyId: '123' } as any;
        req.params = { companyId: '456' };

        await requireAccess({ companyMatch: true })(req as Request, res, next);
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'COMPANY_MISMATCH' }));
    });

    test('should pass if company matches', async () => {
        req.user = { role: 'user', companyId: '123' } as any;
        req.params = { companyId: '123' };

        await requireAccess({ companyMatch: true })(req as Request, res, next);
        expect(next).toHaveBeenCalled();
    });
});
