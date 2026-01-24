import { Request, Response, NextFunction } from 'express';
import { requirePermission } from '../../src/presentation/http/middleware/auth/require-permission.middleware';
import { PermissionService } from '../../src/core/application/services/auth/permission.service';
import logger from '../../src/shared/logger/winston.logger';
import { AuditLog } from '../../src/infrastructure/database/mongoose/models';

// Mocks
jest.mock('../../src/core/application/services/auth/permission.service');
jest.mock('../../src/shared/logger/winston.logger');
jest.mock('../../src/infrastructure/database/mongoose/models', () => ({
    AuditLog: {
        create: jest.fn()
    }
}));
jest.mock('ioredis', () => require('ioredis-mock'));

describe('Middleware: requirePermission (Log-Only Mode)', () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let next: jest.Mock;
    const ORIGINAL_ENV = process.env;
    // Instantiate redis mock to flush it
    const redis = new (require('ioredis-mock'))();

    beforeEach(async () => {
        jest.clearAllMocks();
        await redis.flushall(); // Ensure clean slate
        process.env = { ...ORIGINAL_ENV }; // Reset env

        req = {
            user: { _id: 'user123', companyId: 'comp456' } as any,
            params: {},
            body: {},
            query: {},
            path: '/test/resource',
            method: 'POST',
            ip: '127.0.0.1',
            get: jest.fn().mockReturnValue('jest-agent')
        };

        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        // @ts-ignore
        res.status.mockName('res.status');
        // @ts-ignore
        res.json.mockName('res.json');

        next = jest.fn();
    });

    afterAll(() => {
        process.env = ORIGINAL_ENV;
    });

    it('should BLOCK request when permission missing and RBAC_LOG_ONLY=false', async () => {
        process.env.RBAC_LOG_ONLY = 'false';

        // Mock permission service to return empty permissions
        (PermissionService.resolve as jest.Mock).mockResolvedValue(['other.permission']);
        (PermissionService.getCacheKey as jest.Mock).mockReturnValue('key');

        const middleware = requirePermission('required.permission');
        await middleware(req as Request, res as Response, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(next).not.toHaveBeenCalled();
        expect(AuditLog.create).toHaveBeenCalledWith(expect.objectContaining({
            action: 'authorization_failed'
        }));
    });

    it('should ALLOW request when permission missing and RBAC_LOG_ONLY=true', async () => {
        process.env.RBAC_LOG_ONLY = 'true';

        // Mock permission service to return empty permissions
        (PermissionService.resolve as jest.Mock).mockResolvedValue(['other.permission']);
        (PermissionService.getCacheKey as jest.Mock).mockReturnValue('key');

        const middleware = requirePermission('required.permission');
        await middleware(req as Request, res as Response, next);

        // Should NOT block
        expect(res.status).not.toHaveBeenCalledWith(403);
        // Should call next()
        expect(next).toHaveBeenCalled();

        // Should log warning
        expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('[RBAC-DRY-RUN]'));

        // Should log specific audit action
        expect(AuditLog.create).toHaveBeenCalledWith(expect.objectContaining({
            action: 'dry_run_denial'
        }));
    });

    it('should ALLOW request when permission is present (regardless of mode)', async () => {
        process.env.RBAC_LOG_ONLY = 'false';

        (PermissionService.resolve as jest.Mock).mockResolvedValue(['required.permission']);
        (PermissionService.getCacheKey as jest.Mock).mockReturnValue('key');

        const middleware = requirePermission('required.permission');
        await middleware(req as Request, res as Response, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
    });
});
