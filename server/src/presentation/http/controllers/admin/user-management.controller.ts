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
}

export default new UserManagementController();
