/**
 * TEMPLATE: Authorization Middleware Fix
 * 
 * Use this template to add authorization to controllers that are missing it.
 * 
 * WHEN TO USE:
 * - Controller endpoint allows any authenticated user (security gap)
 * - Need role-based access (admin, seller, staff)
 * - Need team role restrictions (owner, manager, member)
 * - Need company isolation (prevent cross-company access)
 */

import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '@/types/express';
import { AppError } from '@/shared/errors/AppError';
import { createAuditLog } from '@/services/audit/audit.service';

// ============================================
// STEP 1: Define Authorization Options
// ============================================

export interface AuthorizationOptions {
    roles?: ('admin' | 'seller' | 'staff')[];
    teamRoles?: ('owner' | 'admin' | 'manager' | 'member' | 'viewer')[];
    requireCompanyMatch?: boolean;
}

// ============================================
// STEP 2: Create Authorization Middleware
// ============================================

export const authorize = (options: AuthorizationOptions) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        const authReq = req as AuthRequest;
        const user = authReq.user;

        if (!user) {
            throw new AppError('Authentication required', 'UNAUTHORIZED', 401);
        }

        // Check platform role (admin, seller, staff)
        if (options.roles && !options.roles.includes(user.role)) {
            await createAuditLog(
                user._id,
                user.companyId,
                'authorization_failed',
                'security',
                null,
                {
                    resource: req.path,
                    requiredRoles: options.roles,
                    userRole: user.role,
                },
                req
            );

            throw new AppError('Insufficient permissions', 'FORBIDDEN', 403);
        }

        // Check team role (owner, admin, manager, member, viewer)
        if (options.teamRoles && !options.teamRoles.includes(user.teamRole)) {
            await createAuditLog(
                user._id,
                user.companyId,
                'authorization_failed',
                'security',
                null,
                {
                    resource: req.path,
                    requiredTeamRoles: options.teamRoles,
                    userTeamRole: user.teamRole,
                },
                req
            );

            throw new AppError('Insufficient team permissions', 'FORBIDDEN', 403);
        }

        // Check company match (prevent cross-company access)
        if (options.requireCompanyMatch) {
            const resourceCompanyId = req.params.companyId || req.body.companyId;

            if (resourceCompanyId && resourceCompanyId !== user.companyId.toString()) {
                await createAuditLog(
                    user._id,
                    user.companyId,
                    'unauthorized_company_access_attempt',
                    'security',
                    null,
                    {
                        attemptedCompanyId: resourceCompanyId,
                        userCompanyId: user.companyId,
                    },
                    req
                );

                throw new AppError(
                    'Cannot access other company resources',
                    'FORBIDDEN',
                    403
                );
            }
        }

        next();
    };
};

// ============================================
// STEP 3: Convenience Helpers
// ============================================

export const requireAdmin = () => authorize({ roles: ['admin'] });
export const requireSeller = () => authorize({ roles: ['seller'] });
export const requireStaff = () => authorize({ roles: ['staff'] });
export const requireOwner = () => authorize({ teamRoles: ['owner'] });
export const requireManager = () => authorize({ teamRoles: ['owner', 'admin', 'manager'] });

// ============================================
// STEP 4: Apply to Routes
// ============================================

/**
 * EXAMPLE USAGE IN CONTROLLER:
 * 
 * import { requireAdmin, authorize } from '@/middleware/authorization.middleware';
 * 
 * // Admin only
 * router.patch('/:id/resolve',
 *     authenticate,
 *     requireAdmin(), // ← Add this
 *     validateRequest(resolveDisputeSchema),
 *     controller.resolveDispute
 * );
 * 
 * // Team role check
 * router.post('/invite',
 *     authenticate,
 *     authorize({ teamRoles: ['owner', 'admin'] }), // ← Only owner or admin
 *     validateRequest(inviteSchema),
 *     controller.inviteTeamMember
 * );
 * 
 * // Company isolation
 * router.get('/:companyId/orders',
 *     authenticate,
 *     authorize({
 *         roles: ['seller'],
 *         requireCompanyMatch: true // ← Prevent cross-company access
 *     }),
 *     controller.getOrders
 * );
 */

/**
 * CHECKLIST AFTER APPLYING:
 * 
 * [ ] Imported authorize middleware in controller
 * [ ] Added appropriate authorization to all routes
 * [ ] Tested: non-admin cannot access admin endpoints (403)
 * [ ] Tested: seller cannot access other company data (403)
 * [ ] Tested: audit logs created for failed auth attempts
 * [ ] Added integration tests for authorization
 */
