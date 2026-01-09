import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';

import { AppError } from '../../../../shared/errors/app.error';
import logger from '../../../../shared/logger/winston.logger';
import { AuditLog } from '../../../../infrastructure/database/mongoose/models';

/**
 * Authorization Middleware - Role-Based Access Control
 * 
 * Provides simple role-based authorization for controllers.
 * Complements the existing permissions.ts module/action-based system.
 * 
 * Usage:
 * - requireAdmin() - Only platform admins
 * - requireSeller() - Only sellers
 * - requireOwner() - Only company/team owners
 * - requireManager() - Owners, admins, or managers
 * - authorize({ roles, teamRoles, requireCompanyMatch }) - Custom config
 */

export interface AuthorizationOptions {
    /**
     * Platform roles required (admin, seller, staff)
     */
    roles?: ('admin' | 'seller' | 'staff')[];

    /**
     * Team roles required (owner, admin, manager, member, viewer)
     */
    teamRoles?: ('owner' | 'admin' | 'manager' | 'member' | 'viewer')[];

    /**
     * If true, verifies user can only access their own company's resources
     * Checks companyId in params or body matches user's companyId
     */
    requireCompanyMatch?: boolean;
}

/**
 * Main authorization middleware
 */
export const authorize = (options: AuthorizationOptions = {}) => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const authReq = req as Request;
            const user = authReq.user;

            // Check authentication
            if (!user) {
                throw new AppError('Authentication required', 'UNAUTHORIZED', 401);
            }

            // Check platform role
            if (options.roles && options.roles.length > 0) {
                if (!options.roles.includes(user.role as any)) {
                    // Log failed authorization attempt
                    await AuditLog.create({
                        userId: user._id,
                        companyId: user.companyId,
                        action: 'authorization_failed',
                        category: 'security',
                        resource: null,
                        details: {
                            resource: req.path,
                            method: req.method,
                            requiredRoles: options.roles,
                            userRole: user.role,
                            ip: req.ip,
                        },
                    });

                    logger.warn('Authorization failed - insufficient role', {
                        userId: user._id,
                        userRole: user.role,
                        requiredRoles: options.roles,
                        path: req.path,
                    });

                    throw new AppError(
                        'Insufficient permissions - required role not met',
                        'FORBIDDEN',
                        403
                    );
                }
            }

            // Check team role
            if (options.teamRoles && options.teamRoles.length > 0) {
                if (!user.teamRole || !options.teamRoles.includes(user.teamRole as any)) {
                    // Log failed authorization attempt
                    await AuditLog.create({
                        userId: user._id,
                        companyId: user.companyId,
                        action: 'authorization_failed',
                        category: 'security',
                        resource: null,
                        details: {
                            resource: req.path,
                            method: req.method,
                            requiredTeamRoles: options.teamRoles,
                            userTeamRole: user.teamRole,
                            ip: req.ip,
                        },
                    });

                    logger.warn('Authorization failed - insufficient team role', {
                        userId: user._id,
                        userTeamRole: user.teamRole,
                        requiredTeamRoles: options.teamRoles,
                        path: req.path,
                    });

                    throw new AppError(
                        'Insufficient team permissions - required team role not met',
                        'FORBIDDEN',
                        403
                    );
                }
            }

            // Check company isolation (prevent cross-company access)
            if (options.requireCompanyMatch && user.role !== 'admin') {
                const resourceCompanyId =
                    req.params.companyId ||
                    req.body.companyId ||
                    req.query.companyId;

                if (resourceCompanyId && resourceCompanyId !== user.companyId?.toString()) {
                    // Log unauthorized cross-company access attempt
                    await AuditLog.create({
                        userId: user._id,
                        companyId: user.companyId,
                        action: 'unauthorized_company_access_attempt',
                        category: 'security',
                        resource: null,
                        details: {
                            attemptedCompanyId: resourceCompanyId,
                            userCompanyId: user.companyId?.toString(),
                            resource: req.path,
                            method: req.method,
                            ip: req.ip,
                        },
                    });

                    logger.error('Unauthorized cross-company access attempt', {
                        userId: user._id,
                        userCompanyId: user.companyId,
                        attemptedCompanyId: resourceCompanyId,
                        path: req.path,
                    });

                    throw new AppError(
                        'Cannot access resources from other companies',
                        'FORBIDDEN',
                        403
                    );
                }
            }

            // Authorization successful
            next();
        } catch (error) {
            if (error instanceof AppError) {
                res.status(error.statusCode).json({
                    success: false,
                    error: {
                        code: error.code,
                        message: error.message,
                    },
                });
                return;
            }

            logger.error('Authorization middleware error', {
                error: error instanceof Error ? error.message : error,
                path: req.path,
            });

            res.status(500).json({
                success: false,
                error: {
                    code: 'INTERNAL_ERROR',
                    message: 'Internal server error during authorization',
                },
            });
        }
    };
};

/**
 * Convenience helper: Require platform admin role
 * Usage: router.get('/admin/users', authenticate, requireAdmin(), controller.getUsers)
 */
export const requireAdmin = () => authorize({ roles: ['admin'] });

/**
 * Convenience helper: Require seller role
 * Usage: router.get('/orders', authenticate, requireSeller(), controller.getOrders)
 */
export const requireSeller = () => authorize({ roles: ['seller'] });

/**
 * Convenience helper: Require staff role
 * Usage: router.get('/warehouse/tasks', authenticate, requireStaff(), controller.getTasks)
 */
export const requireStaff = () => authorize({ roles: ['staff'] });

/**
 * Convenience helper: Require owner team role
 * Usage: router.delete('/team/:id', authenticate, requireOwner(), controller.removeTeamMember)
 */
export const requireOwner = () => authorize({ teamRoles: ['owner'] });

/**
 * Convenience helper: Require owner or admin team role
 * Usage: router.post('/team/invite', authenticate, requireOwnerOrAdmin(), controller.inviteTeamMember)
 */
export const requireOwnerOrAdmin = () => authorize({ teamRoles: ['owner', 'admin'] });

/**
 * Convenience helper: Require manager level access (owner, admin, or manager)
 * Usage: router.get('/analytics', authenticate, requireManager(), controller.getAnalytics)
 */
export const requireManager = () => authorize({ teamRoles: ['owner', 'admin', 'manager'] });

/**
 * Convenience helper: Require seller with company isolation
 * Prevents sellers from accessing other companies' data
 * Usage: router.get('/:companyId/orders', authenticate, requireSellerWithCompanyMatch(), controller.getOrders)
 */
export const requireSellerWithCompanyMatch = () => authorize({
    roles: ['seller'],
    requireCompanyMatch: true,
});

/**
 * Export all helpers as default
 */
export default {
    authorize,
    requireAdmin,
    requireSeller,
    requireStaff,
    requireOwner,
    requireOwnerOrAdmin,
    requireManager,
    requireSellerWithCompanyMatch,
};
