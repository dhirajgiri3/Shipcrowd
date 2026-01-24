/**
 * User Management Service
 *
 * Super admin service for managing platform users:
 * - List all users with filtering
 * - Promote sellers to admins (dual role)
 * - Demote admins to sellers
 * - Audit logging for all role changes
 */

import mongoose from 'mongoose';
import User from '../../../../infrastructure/database/mongoose/models/iam/users/user.model';
import Company from '../../../../infrastructure/database/mongoose/models/organization/core/company.model';
import { AuthorizationError, ValidationError, NotFoundError } from '../../../../shared/errors/app.error';
import { ErrorCode } from '../../../../shared/errors/errorCodes';
import logger from '../../../../shared/logger/winston.logger';

export interface UserListFilters {
    role?: 'all' | 'super_admin' | 'admin' | 'seller' | 'staff';
    search?: string;
    page?: number;
    limit?: number;
}

export interface UserListItem {
    _id: string;
    name: string;
    email: string;
    role: string;
    companyId?: string;
    companyName?: string;
    createdAt: Date;
    totalOrders?: number;
    canPromote: boolean;
    canDemote: boolean;
    isDualRole: boolean;
}

export interface RoleChangeAudit {
    performedBy: string;
    targetUser: string;
    action: 'promote' | 'demote';
    previousRole: string;
    newRole: string;
    reason?: string;
    retainedCompany: boolean;
}

class UserManagementService {
    /**
     * List all users with filtering and pagination
     */
    async listUsers(
        filters: UserListFilters,
        currentUserId: string
    ): Promise<{ users: UserListItem[]; total: number; page: number; pages: number }> {
        const { role = 'all', search = '', page = 1, limit = 20 } = filters;

        // Build query
        const query: any = {
            isDeleted: false,
            _id: { $ne: currentUserId }, // Exclude self
        };

        if (role !== 'all') {
            query.role = role;
        }

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
            ];
        }

        // Pagination
        const skip = (page - 1) * limit;
        const total = await User.countDocuments(query);

        // Fetch users with company info
        const users = await User.aggregate([
            { $match: query },
            {
                $lookup: {
                    from: 'companies',
                    localField: 'companyId',
                    foreignField: '_id',
                    as: 'company',
                },
            },
            {
                $unwind: {
                    path: '$company',
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $lookup: {
                    from: 'orders',
                    localField: 'companyId',
                    foreignField: 'companyId',
                    as: 'orders',
                },
            },
            {
                $project: {
                    _id: 1,
                    name: 1,
                    email: 1,
                    role: 1,
                    companyId: 1,
                    companyName: '$company.name',
                    createdAt: 1,
                    totalOrders: { $size: '$orders' },
                },
            },
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: limit },
        ]);

        // Add permission flags
        const enrichedUsers: UserListItem[] = users.map(user => ({
            ...user,
            _id: user._id.toString(),
            companyId: user.companyId?.toString(),
            canPromote: this.canPromoteUser(user.role),
            canDemote: this.canDemoteUser(user.role),
            isDualRole: (user.role === 'admin' || user.role === 'super_admin') && !!user.companyId,
        }));

        return {
            users: enrichedUsers,
            total,
            page,
            pages: Math.ceil(total / limit),
        };
    }

    /**
     * Promote seller to admin (dual role - keeps company)
     */
    async promoteToAdmin(
        targetUserId: string,
        performedBy: string,
        reason?: string
    ): Promise<RoleChangeAudit> {
        // Validate IDs
        if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
            throw new ValidationError('Invalid user ID', ErrorCode.VAL_INVALID_INPUT);
        }

        // Fetch target user
        const user = await User.findById(targetUserId);
        if (!user) {
            throw new NotFoundError('User not found', ErrorCode.RES_NOT_FOUND);
        }

        // Validate current role
        if (user.role !== 'seller') {
            throw new ValidationError(
                `Cannot promote ${user.role} to admin. Only sellers can be promoted.`,
                ErrorCode.VAL_INVALID_INPUT
            );
        }

        // Perform promotion
        const previousRole = user.role;
        user.role = 'admin';
        await user.save();

        const audit: RoleChangeAudit = {
            performedBy,
            targetUser: targetUserId,
            action: 'promote',
            previousRole,
            newRole: 'admin',
            reason,
            retainedCompany: !!user.companyId,
        };

        // Log audit
        logger.info(`User promoted to admin: ${user.email}`, audit);

        return audit;
    }

    /**
     * Demote admin to seller (keeps company)
     */
    async demoteToSeller(
        targetUserId: string,
        performedBy: string,
        reason?: string
    ): Promise<RoleChangeAudit> {
        // Validate IDs
        if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
            throw new ValidationError('Invalid user ID', ErrorCode.VAL_INVALID_INPUT);
        }

        // Cannot demote self
        if (targetUserId === performedBy) {
            throw new AuthorizationError(
                'Cannot demote yourself',
                ErrorCode.AUTHZ_FORBIDDEN
            );
        }

        // Fetch target user
        const user = await User.findById(targetUserId);
        if (!user) {
            throw new NotFoundError('User not found', ErrorCode.RES_NOT_FOUND);
        }

        // Check if trying to demote super admin (prevent system lockout)
        if (user.role === 'super_admin') {
            const superAdminCount = await User.countDocuments({
                role: 'super_admin',
                isDeleted: false,
            });

            if (superAdminCount <= 1) {
                throw new AuthorizationError(
                    'Cannot demote the last super admin',
                    ErrorCode.AUTHZ_FORBIDDEN
                );
            }
        }

        // Validate current role (can demote both admin and super_admin)
        if (user.role !== 'admin' && user.role !== 'super_admin') {
            throw new ValidationError(
                `Cannot demote ${user.role}. Only admins or super admins can be demoted to seller.`,
                ErrorCode.VAL_INVALID_INPUT
            );
        }

        // Ensure user has company (safety check)
        if (!user.companyId) {
            throw new ValidationError(
                'Cannot demote admin without company. User must have a seller company.',
                ErrorCode.VAL_INVALID_INPUT
            );
        }

        // Perform demotion
        const previousRole = user.role;
        user.role = 'seller';
        await user.save();

        const audit: RoleChangeAudit = {
            performedBy,
            targetUser: targetUserId,
            action: 'demote',
            previousRole,
            newRole: 'seller',
            reason,
            retainedCompany: !!user.companyId,
        };

        // Log audit
        logger.info(`User demoted to seller: ${user.email}`, audit);

        return audit;
    }

    /**
     * Get user details
     */
    async getUserDetails(userId: string): Promise<any> {
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            throw new ValidationError('Invalid user ID', ErrorCode.VAL_INVALID_INPUT);
        }

        const user = await User.findById(userId)
            .populate('companyId', 'name status wallet')
            .select('-password -security')
            .lean();

        if (!user) {
            throw new NotFoundError('User not found', ErrorCode.RES_NOT_FOUND);
        }

        return user;
    }

    // Helper methods
    private canPromoteUser(role: string): boolean {
        return role === 'seller';
    }

    private canDemoteUser(role: string): boolean {
        return role === 'admin'; // Cannot demote super_admin via UI
    }
}

export default new UserManagementService();
