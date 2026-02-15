import { NextFunction, Request, Response } from 'express';
import { PermissionService } from '../../../../core/application/services/auth/permission.service';
import { KYCState } from '../../../../core/domain/types/kyc-state';
import { AuditLog, User } from '../../../../infrastructure/database/mongoose/models';
import { AppError } from '../../../../shared/errors/app.error';
import logger from '../../../../shared/logger/winston.logger';
import { isPlatformAdmin } from '../../../../shared/utils/role-helpers';

/**
 * Unified Access Control Options
 */
export interface AccessOptions {
    /** Platform roles required (OR logic) */
    roles?: ('super_admin' | 'admin' | 'seller' | 'staff')[];

    /** Team roles required (OR logic) */
    teamRoles?: ('owner' | 'admin' | 'manager' | 'member' | 'viewer')[];

    /** Specific permission required */
    permission?: {
        module: string;
        action: string;
    };

    /** Requires KYC verification for current company */
    requireKYC?: boolean;

    /** 
     * Requires resource companyId to match user companyId
     * (Prevents cross-company access)
     */
    requireCompanyMatch?: boolean;

    /** Required Access Tier */
    tier?: 'explorer' | 'sandbox' | 'production'; // Using string literal as import might be tricky with path alias, keeping it simple for now
}

/**
 * Unified Access Control Middleware
 * Replaces: authorization.middleware.ts, permissions.ts, kyc.ts
 */
export const requireAccess = (options: AccessOptions = {}) => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const authReq = req as Request;
            // Get FRESH user data (to ensure latest roles/status)
            // We assume basic auth middleware has run and populated req.user._id
            if (!authReq.user) {
                throw new AppError('Authentication required', 'UNAUTHORIZED', 401);
            }

            // Optimization: If we have full user object and don't need deep permission check, use it
            // But for robustness, fetching fresh user is safer for critical checks
            const user = await User.findById(authReq.user._id);

            if (!user) {
                throw new AppError('User not found', 'UNAUTHORIZED', 401);
            }

            if (!user.isActive) {
                throw new AppError('User account is inactive', 'FORBIDDEN', 403);
            }

            // 1. Check Platform Role
            if (options.roles && options.roles.length > 0) {
                if (!options.roles.includes(user.role as any) && !isPlatformAdmin(user)) {
                    // Allow if admin override? No, strict role check
                    logAccessDenial(req, user, 'insufficient_role', { required: options.roles });
                    throw new AppError('Insufficient platform role', 'FORBIDDEN', 403);
                }
            }

            // 2. Check Team Role
            if (options.teamRoles && options.teamRoles.length > 0) {
                // Super admins and admins can bypass team role checks
                const isAdminRole = isPlatformAdmin(user);
                if (!isAdminRole) {
                    if (!user.teamRole || !options.teamRoles.includes(user.teamRole as any)) {
                        logAccessDenial(req, user, 'insufficient_team_role', { required: options.teamRoles });
                        throw new AppError('Insufficient team privileges', 'FORBIDDEN', 403);
                    }
                }
            }

            // 3. Check Company Match (Isolation)
            const isAdminRole = isPlatformAdmin(user);
            if (options.requireCompanyMatch && !isAdminRole) {
                const resourceCompanyId = req.params.companyId || req.body.companyId || req.query.companyId;

                if (resourceCompanyId && user.companyId?.toString() !== resourceCompanyId.toString()) {
                    // V5: Invalidate permissions if suspicious activity
                    // @ts-ignore - user type is not fully defined here yet
                    await PermissionService.invalidate(user._id?.toString() || '');

                    logAccessDenial(req, user, 'cross_company_access', { target: resourceCompanyId });
                    throw new AppError('Cross-company access denied', 'FORBIDDEN', 403);
                }
            }

            // 4. Check KYC
            const isAdminRoleForKYC = isPlatformAdmin(user);
            if (options.requireKYC && !isAdminRoleForKYC) {
                // Check user flag first
                if (!user.kycStatus?.isComplete && (user.kycStatus as any)?.state !== KYCState.VERIFIED) {
                    logAccessDenial(req, user, 'kyc_required');
                    throw new AppError('KYC verification required', 'KYC_REQUIRED', 403);
                }

                // Strict check: Ensure KYC exists for THIS company (Prevent Bypass)
                if (user.companyId) {
                    const { KYC } = await import('../../../../infrastructure/database/mongoose/models/index.js');
                    const kycRecord = await KYC.exists({
                        userId: user._id,
                        companyId: user.companyId,
                        state: KYCState.VERIFIED
                    });

                    if (!kycRecord) {
                        logAccessDenial(req, user, 'kyc_company_mismatch');
                        throw new AppError('KYC verification required for current company', 'KYC_REQUIRED', 403);
                    }
                }
            }

            // 5. Check Access Tier
            const isAdminRoleForTier = isPlatformAdmin(user);
            if (options.tier && !isAdminRoleForTier) {
                const tiers = ['explorer', 'sandbox', 'production'];
                const userTierIndex = tiers.indexOf(user.accessTier || 'explorer');
                const requiredTierIndex = tiers.indexOf(options.tier);

                if (userTierIndex < requiredTierIndex) {
                    logAccessDenial(req, user, 'insufficient_tier', {
                        required: options.tier,
                        current: user.accessTier
                    });

                    // Specific error message for clearer UX
                    const messages = {
                        sandbox: 'Please verify your email to access sandbox features.',
                        production: 'Please complete KYC verification to access production features.'
                    };

                    throw new AppError(
                        (messages as any)[options.tier] || `Requires ${options.tier} access tier`,
                        'TIER_RESTRICTED',
                        403
                    );
                }
            }

            // 6. Check Fine-Grained Permissions
            if (options.permission) {
                const { module, action } = options.permission;

                const isAdmin = isPlatformAdmin(user);
                if (!isAdmin) {
                    const permissionList = await PermissionService.resolve(
                        String(user._id),
                        user.companyId?.toString()
                    );
                    const permissionKeyDot = `${module}.${action}`;
                    const permissionKeyColon = `${module}:${action}`;
                    const allowed = permissionList.includes('*') ||
                        permissionList.includes(permissionKeyDot) ||
                        permissionList.includes(permissionKeyColon);

                    if (!allowed) {
                        logAccessDenial(req, user, 'insufficient_permission', { module, action });
                        throw new AppError(`Permission denied: ${module}.${action}`, 'FORBIDDEN', 403);
                    }
                }
            }

            // Access Granted
            next();
        } catch (error) {
            if (error instanceof AppError) {
                res.status(error.statusCode).json({
                    success: false,
                    error: { code: error.code, message: error.message }
                });
            } else {
                logger.error('Access control error:', error);
                res.status(500).json({ success: false, message: 'Internal server error' });
            }
        }
    };
};

/**
 * Helper to log access denials for security auditing
 */
async function logAccessDenial(req: Request, user: any, reason: string, meta: any = {}) {
    try {
        await AuditLog.create({
            userId: user._id,
            companyId: user.companyId,
            action: 'authorization_failed',
            category: 'security',
            resource: req.path,
            details: {
                reason,
                method: req.method,
                ip: req.ip,
                ...meta
            }
        });
        logger.warn(`Access denied: ${reason}`, { userId: user._id, path: req.path, ...meta });
    } catch (e) {
        logger.error('Failed to log access denial', e);
    }
}
