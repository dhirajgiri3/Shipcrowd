import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../../../shared/errors/app.error';
import { AuditLog } from '../../../../infrastructure/database/mongoose/models';
import logger from '../../../../shared/logger/winston.logger';
import { PermissionService } from '../../../../core/application/services/auth/permission.service';

interface RequirePermissionOptions {
    /**
     * Skip cache and always check DB (for sensitive operations like billing)
     */
    skipCache?: boolean;

    /**
     * Where to extract companyId from request
     */
    companyIdSource?: 'params' | 'body' | 'query';
}

/**
 * requirePermission Middleware - V5 RBAC
 * 
 * Checks if the authenticated user has a specific permission.
 * 
 * Usage:
 *   router.post('/orders', requirePermission('orders.create'), createOrder);
 *   router.post('/refunds', requirePermission('wallet.refund_approve', { skipCache: true }), approveRefund);
 */
export const requirePermission = (
    permission: string,
    options: RequirePermissionOptions = {}
) => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            if (!req.user) {
                throw new AppError('Authentication required', 'UNAUTHORIZED', 401);
            }

            // Extract companyId from request
            const companyId = (
                req.params.companyId ||
                req.body.companyId ||
                req.query.companyId
            ) as string | undefined;

            let permissions: string[];

            // Skip cache for sensitive operations (billing, refunds)
            if (options.skipCache) {
                permissions = await PermissionService.resolve(req.user._id, companyId);
            } else {
                // PermissionService handles caching + invalidation
                permissions = await PermissionService.resolve(req.user._id, companyId);
            }

            // Check permission
            if (!permissions.includes(permission)) {
                // PHASE 1: Log-Only Enforcement (Dry Run)
                // If RBAC_LOG_ONLY is true, we verify logic but DO NOT block
                const isLogOnly = process.env.RBAC_LOG_ONLY === 'true';

                if (isLogOnly) {
                    logger.warn(`[RBAC-DRY-RUN] Access would be DENIED for user ${req.user._id} on ${permission}`);
                    // Log to audit for analysis
                    await logAccessDenial(req, permission, companyId, true);
                    return next(); // ALLOW access
                }

                // Strict Enforcement
                await logAccessDenial(req, permission, companyId, false);
                res.status(403).json({
                    success: false,
                    error: {
                        code: 'FORBIDDEN',
                        message: `Missing permission: ${permission}`
                    }
                });
                return;
            }

            // Permission granted
            next();
        } catch (error) {
            if (error instanceof AppError) {
                res.status(error.statusCode).json({
                    success: false,
                    error: { code: error.code, message: error.message }
                });
            } else {
                logger.error('Permission check error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error'
                });
            }
        }
    };
};

/**
 * Helper: requireBillingPermission
 * 
 * Always skips cache for billing operations (safety-critical)
 */
export const requireBillingPermission = (permission: string) =>
    requirePermission(permission, { skipCache: true });

/**
 * Log access denial for audit
 */
async function logAccessDenial(
    req: Request,
    permission: string,
    companyId: string | undefined,
    isDryRun: boolean = false
) {
    try {
        await AuditLog.create({
            userId: req.user!._id,
            companyId: companyId || req.user!.companyId,
            action: isDryRun ? 'dry_run_denial' : 'authorization_failed',
            category: 'security',
            resource: req.path,
            details: {
                permission,
                method: req.method,
                ip: req.ip,
                userAgent: req.get('user-agent')
            }
        });
    } catch (error) {
        logger.error('Failed to log access denial', { error });
    }
}

/**
 * Export middleware
 */
export default {
    requirePermission,
    requireBillingPermission
};
