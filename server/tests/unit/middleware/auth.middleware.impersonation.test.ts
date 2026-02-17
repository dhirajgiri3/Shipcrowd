import { NextFunction, Request, Response } from 'express';
import ImpersonationService from '../../../src/core/application/services/admin/impersonation.service';
import { User } from '../../../src/infrastructure/database/mongoose/models';
import Company from '../../../src/infrastructure/database/mongoose/models/organization/core/company.model';
import { authenticate } from '../../../src/presentation/http/middleware/auth/auth';
import { getAccessTokenFromRequest } from '../../../src/shared/helpers/auth-cookies';
import { verifyAccessToken } from '../../../src/shared/helpers/jwt';

jest.mock('../../../src/shared/helpers/auth-cookies', () => ({
  getAccessTokenFromRequest: jest.fn(),
}));

jest.mock('../../../src/shared/helpers/jwt', () => ({
  verifyAccessToken: jest.fn(),
}));

jest.mock('../../../src/core/application/services/admin/impersonation.service', () => ({
  __esModule: true,
  default: {
    verifySession: jest.fn(),
  },
}));

jest.mock('../../../src/infrastructure/database/mongoose/models', () => ({
  User: {
    findById: jest.fn(),
  },
}));

jest.mock(
  '../../../src/infrastructure/database/mongoose/models/organization/core/company.model',
  () => ({
    __esModule: true,
    default: {
      findById: jest.fn(),
    },
  })
);

jest.mock('../../../src/shared/logger/winston.logger', () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
}));

describe('authenticate middleware impersonation enforcement', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = { headers: {}, cookies: {} } as any;
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  it('returns 401 when impersonation session is invalid', async () => {
    (getAccessTokenFromRequest as jest.Mock).mockReturnValue('token');
    (verifyAccessToken as jest.Mock).mockResolvedValue({
      userId: 'user_1',
      role: 'seller',
      impersonation: {
        sessionId: 'sess_1',
        adminUserId: 'admin_1',
        sessionToken: 'stale_token',
      },
    });
    (ImpersonationService.verifySession as jest.Mock).mockResolvedValue({
      valid: false,
      reason: 'Session expired',
    });

    await authenticate(req as Request, res as Response, next);

    expect(ImpersonationService.verifySession).toHaveBeenCalledWith('stale_token');
    expect(User.findById).not.toHaveBeenCalled();
    expect(res.status as jest.Mock).toHaveBeenCalledWith(401);
    expect(res.json as jest.Mock).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'IMPERSONATION_SESSION_INVALID',
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('continues auth flow when impersonation session is valid', async () => {
    (getAccessTokenFromRequest as jest.Mock).mockReturnValue('token');
    (verifyAccessToken as jest.Mock).mockResolvedValue({
      userId: 'user_2',
      role: 'seller',
      impersonation: {
        sessionId: 'sess_2',
        adminUserId: 'admin_2',
        sessionToken: 'active_token',
      },
    });
    (ImpersonationService.verifySession as jest.Mock).mockResolvedValue({
      valid: true,
      session: { id: 'sess_2' },
    });

    (User.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: { toString: () => 'user_2' },
          role: 'seller',
          companyId: undefined,
          isEmailVerified: true,
          kycStatus: { isComplete: true, state: 'verified' },
          teamRole: 'owner',
          teamStatus: 'active',
          isSuspended: false,
          isBanned: false,
        }),
      }),
    });

    (Company.findById as jest.Mock).mockResolvedValue(null);

    await authenticate(req as Request, res as Response, next);

    expect(ImpersonationService.verifySession).toHaveBeenCalledWith('active_token');
    expect(User.findById).toHaveBeenCalledWith('user_2');
    expect(next).toHaveBeenCalled();
  });
});

