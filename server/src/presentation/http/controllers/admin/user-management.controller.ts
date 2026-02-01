/**
 * User Management Controller
 *
 * Super admin controller for managing platform users.
 * Endpoints for listing, promoting, and demoting users.
 */

import { Request, Response, NextFunction } from 'express';
import UserManagementService from '../../../../core/application/services/admin/user-management.service';
import { guardChecks, parsePagination } from '../../../../shared/helpers/controller.helpers';
import { ValidationError } from '../../../../shared/errors/app.error';
import { ErrorCode } from '../../../../shared/errors/errorCodes';
import logger from '../../../../shared/logger/winston.logger';

import { AUTH_COOKIES } from '../../../../shared/constants/security';

// Helper function to get cookie options for auth tokens
const getAuthCookieOptions = (maxAge: number) => ({
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: (process.env.NODE_ENV === 'production' ? 'strict' : 'lax') as 'strict' | 'lax',
    path: '/',
    domain: process.env.NODE_ENV === 'development' ? 'localhost' : undefined,
    maxAge,
});

class UserManagementController {
    /**
     * GET /admin/users
     * List all platform users with filtering and pagination
     */
    async listUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { userId, isSuperAdmin } = guardChecks(req, { requireCompany: false });

            // Only super_admin can access user management
            if (!isSuperAdmin) {
                throw new ValidationError(
                    'Super admin access required',
                    ErrorCode.AUTHZ_FORBIDDEN
                );
            }

            // Parse filters
            const { role, search } = req.query;
            const { page, limit } = parsePagination(req.query, { defaultLimit: 20, maxLimit: 100 });

            const filters = {
                role: role as 'all' | 'super_admin' | 'admin' | 'seller' | 'staff' || 'all',
                search: search as string || '',
                page,
                limit,
            };

            const result = await UserManagementService.listUsers(filters, userId);

            res.status(200).json({
                success: true,
                data: result,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /admin/users/:id/promote
     * Promote seller to admin (retains company for dual role)
     */
    async promoteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { userId, isSuperAdmin } = guardChecks(req, { requireCompany: false });

            // Only super_admin can promote users
            if (!isSuperAdmin) {
                throw new ValidationError(
                    'Super admin access required',
                    ErrorCode.AUTHZ_FORBIDDEN
                );
            }

            const { id: targetUserId } = req.params;
            const { reason } = req.body;

            const audit = await UserManagementService.promoteToAdmin(
                targetUserId,
                userId,
                reason
            );

            logger.info(`User promoted to admin by super admin`, {
                performedBy: userId,
                targetUser: targetUserId,
                audit,
            });

            res.status(200).json({
                success: true,
                message: 'User successfully promoted to admin',
                data: { audit },
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /admin/users/:id/demote
     * Demote admin to seller (retains company)
     */
    async demoteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { userId, isSuperAdmin } = guardChecks(req, { requireCompany: false });

            // Only super_admin can demote users
            if (!isSuperAdmin) {
                throw new ValidationError(
                    'Super admin access required',
                    ErrorCode.AUTHZ_FORBIDDEN
                );
            }

            const { id: targetUserId } = req.params;
            const { reason } = req.body;

            const audit = await UserManagementService.demoteToSeller(
                targetUserId,
                userId,
                reason
            );

            logger.info(`User demoted to seller by super admin`, {
                performedBy: userId,
                targetUser: targetUserId,
                audit,
            });

            res.status(200).json({
                success: true,
                message: 'User successfully demoted to seller',
                data: { audit },
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /admin/users/:id
     * Get detailed user information
     */
    async getUserDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { isSuperAdmin } = guardChecks(req, { requireCompany: false });

            // Only super_admin can view user details
            if (!isSuperAdmin) {
                throw new ValidationError(
                    'Super admin access required',
                    ErrorCode.AUTHZ_FORBIDDEN
                );
            }

            const { id: targetUserId } = req.params;

            const user = await UserManagementService.getUserDetails(targetUserId);

            res.status(200).json({
                success: true,
                data: { user },
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /admin/users/:id/impersonate
     * Impersonate a user (Super Admin only)
     * Sets auth cookies for the target user
     */
    async impersonateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { userId, isSuperAdmin } = guardChecks(req, { requireCompany: false });

            // Strict Super Admin Check
            if (!isSuperAdmin) {
                throw new ValidationError(
                    'Super admin access required',
                    ErrorCode.AUTHZ_FORBIDDEN
                );
            }

            const { id: targetUserId } = req.params;

            const result = await UserManagementService.impersonateUser(targetUserId, userId);

            // Cookie names with secure prefix in production
            const refreshCookieName = process.env.NODE_ENV === 'production' ? AUTH_COOKIES.SECURE_REFRESH_TOKEN : AUTH_COOKIES.REFRESH_TOKEN;
            const accessCookieName = process.env.NODE_ENV === 'production' ? AUTH_COOKIES.SECURE_ACCESS_TOKEN : AUTH_COOKIES.ACCESS_TOKEN;

            // Set cookies (Access: 15m, Refresh: 7d as impersonation default)
            const refreshMaxAge = 7 * 24 * 60 * 60 * 1000;
            const accessMaxAge = 15 * 60 * 1000;

            res.cookie(refreshCookieName, result.refreshToken, getAuthCookieOptions(refreshMaxAge));
            res.cookie(accessCookieName, result.accessToken, getAuthCookieOptions(accessMaxAge));

            res.status(200).json({
                success: true,
                message: 'Impersonation successful. Redirecting...',
                data: {
                    user: result.user
                },
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /admin/users/:id/suspend
     * Suspend a user account
     */
    async suspendUser(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { userId, isSuperAdmin } = guardChecks(req, { requireCompany: false });

            // Only super_admin can suspend users
            if (!isSuperAdmin) {
                throw new ValidationError(
                    'Super admin access required',
                    ErrorCode.AUTHZ_FORBIDDEN
                );
            }

            const { id: targetUserId } = req.params;
            const { reason, duration } = req.body;

            if (!reason || reason.trim().length < 10) {
                throw new ValidationError('Suspension reason must be at least 10 characters');
            }

            const result = await UserManagementService.suspendUser({
                targetUserId,
                performedBy: userId,
                reason: reason.trim(),
                duration, // Optional: duration in days
            });

            logger.warn(`User suspended by super admin`, {
                performedBy: userId,
                targetUser: targetUserId,
                reason,
                duration,
            });

            res.status(200).json({
                success: true,
                message: 'User successfully suspended',
                data: result,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /admin/users/:id/unsuspend
     * Unsuspend a user account
     */
    async unsuspendUser(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { userId, isSuperAdmin } = guardChecks(req, { requireCompany: false });

            // Only super_admin can unsuspend users
            if (!isSuperAdmin) {
                throw new ValidationError(
                    'Super admin access required',
                    ErrorCode.AUTHZ_FORBIDDEN
                );
            }

            const { id: targetUserId } = req.params;
            const { reason } = req.body;

            const result = await UserManagementService.unsuspendUser({
                targetUserId,
                performedBy: userId,
                reason: reason?.trim(),
            });

            logger.info(`User unsuspended by super admin`, {
                performedBy: userId,
                targetUser: targetUserId,
                reason,
            });

            res.status(200).json({
                success: true,
                message: 'User successfully unsuspended',
                data: result,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /admin/users/:id/ban
     * Permanently ban a user account
     */
    async banUser(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { userId, isSuperAdmin } = guardChecks(req, { requireCompany: false });

            // Only super_admin can ban users
            if (!isSuperAdmin) {
                throw new ValidationError(
                    'Super admin access required',
                    ErrorCode.AUTHZ_FORBIDDEN
                );
            }

            const { id: targetUserId } = req.params;
            const { reason } = req.body;

            if (!reason || reason.trim().length < 10) {
                throw new ValidationError('Ban reason must be at least 10 characters');
            }

            const result = await UserManagementService.banUser({
                targetUserId,
                performedBy: userId,
                reason: reason.trim(),
            });

            logger.error(`User permanently banned by super admin`, {
                performedBy: userId,
                targetUser: targetUserId,
                reason,
            });

            res.status(200).json({
                success: true,
                message: 'User successfully banned',
                data: result,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /admin/users/:id/unban
     * Unban a user account
     */
    async unbanUser(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { userId, isSuperAdmin } = guardChecks(req, { requireCompany: false });

            // Only super_admin can unban users
            if (!isSuperAdmin) {
                throw new ValidationError(
                    'Super admin access required',
                    ErrorCode.AUTHZ_FORBIDDEN
                );
            }

            const { id: targetUserId } = req.params;
            const { reason } = req.body;

            const result = await UserManagementService.unbanUser({
                targetUserId,
                performedBy: userId,
                reason: reason?.trim(),
            });

            logger.info(`User unbanned by super admin`, {
                performedBy: userId,
                targetUser: targetUserId,
                reason,
            });

            res.status(200).json({
                success: true,
                message: 'User successfully unbanned',
                data: result,
            });
        } catch (error) {
            next(error);
        }
    }
}

export default new UserManagementController();
