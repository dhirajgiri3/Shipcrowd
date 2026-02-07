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
import { Order, Shipment } from '../../../../infrastructure/database/mongoose/models';
import Dispute from '../../../../infrastructure/database/mongoose/models/crm/disputes/dispute.model';
import { AuthorizationError, ValidationError, NotFoundError } from '../../../../shared/errors/app.error';
import { ErrorCode } from '../../../../shared/errors/errorCodes';
import logger from '../../../../shared/logger/winston.logger';
import { generateAccessToken, generateRefreshToken } from '../../../../shared/helpers/jwt';
import { isPlatformAdmin } from '../../../../shared/utils/role-helpers';

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
    ): Promise<{
        users: UserListItem[];
        total: number;
        page: number;
        pages: number;
        stats: {
            totalUsers: number;
            superAdmins: number;
            admins: number;
            sellers: number;
            staff: number;
            users: number;
        }
    }> {
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
            isDualRole: isPlatformAdmin(user) && !!user.companyId,
        }));

        // Calculate global stats
        const stats = await User.aggregate([
            { $match: { isDeleted: false } },
            {
                $group: {
                    _id: null,
                    totalUsers: { $sum: 1 },
                    superAdmins: {
                        $sum: { $cond: [{ $eq: ['$role', 'super_admin'] }, 1, 0] }
                    },
                    admins: {
                        $sum: { $cond: [{ $eq: ['$role', 'admin'] }, 1, 0] }
                    },
                    sellers: {
                        $sum: { $cond: [{ $eq: ['$role', 'seller'] }, 1, 0] }
                    },
                    staff: {
                        $sum: { $cond: [{ $eq: ['$role', 'staff'] }, 1, 0] }
                    },
                    users: {
                        $sum: { $cond: [{ $eq: ['$role', 'user'] }, 1, 0] }
                    }
                }
            }
        ]);

        const globalStats = stats.length > 0 ? stats[0] : {
            totalUsers: 0,
            superAdmins: 0,
            admins: 0,
            sellers: 0,
            staff: 0,
            users: 0
        };

        return {
            users: enrichedUsers,
            total,
            page,
            pages: Math.ceil(total / limit),
            stats: {
                totalUsers: globalStats.totalUsers,
                superAdmins: globalStats.superAdmins,
                admins: globalStats.admins,
                sellers: globalStats.sellers,
                staff: globalStats.staff,
                users: globalStats.users
            }
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
        if (!isPlatformAdmin(user)) {
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
            .populate('companyId')
            .select('-password -security')
            .lean();

        if (!user) {
            throw new NotFoundError('User not found', ErrorCode.RES_NOT_FOUND);
        }

        let stats = null;

        // If user is a seller (has company), fetch aggregations
        if (user.companyId) {
            const cid = user.companyId._id;

            const [
                totalOrders,
                revenueData,
                totalShipments,
                rtoShipments,
                ndrShipments,
                openDisputes,
                walletBalance
            ] = await Promise.all([
                Order.countDocuments({ companyId: cid }),
                Order.aggregate([
                    { $match: { companyId: cid, status: { $nin: ['cancelled', 'voided'] } } },
                    { $group: { _id: null, total: { $sum: '$totals.total' } } }
                ]),
                Shipment.countDocuments({ companyId: cid }),
                Shipment.countDocuments({
                    companyId: cid,
                    currentStatus: { $in: ['rto', 'returned', 'rto_initiated', 'rto_delivered', 'rto_acknowledged'] }
                }),
                Shipment.countDocuments({
                    companyId: cid,
                    'ndrDetails.ndrAttempts': { $gt: 0 }
                }),
                Dispute.countDocuments({
                    companyId: cid,
                    status: { $in: ['open', 'investigation', 'decision'] }
                }),
                // Access wallet from company doc directly if not populated, but we populated it
                Promise.resolve((user.companyId as any).wallet?.balance || 0)
            ]);

            const revenue = revenueData.length > 0 ? revenueData[0].total : 0;
            const rtoRate = totalShipments > 0 ? (rtoShipments / totalShipments) * 100 : 0;
            const ndrRate = totalShipments > 0 ? (ndrShipments / totalShipments) * 100 : 0;

            logger.info(`Fetched seller stats for ${user.email} (Company: ${cid}):`, {
                revenue, totalOrders, totalShipments, rtoShipments, openDisputes
            });

            stats = {
                orders: {
                    total: totalOrders,
                    revenue: revenue
                },
                shipments: {
                    total: totalShipments,
                    rto: rtoShipments,
                    rtoRate: parseFloat(rtoRate.toFixed(2)),
                    ndr: ndrShipments,
                    ndrRate: parseFloat(ndrRate.toFixed(2))
                },
                disputes: {
                    open: openDisputes
                },
                wallet: {
                    balance: walletBalance
                }
            };
        }

        return { user, stats };
    }



    /**
     * Impersonate a user (generate tokens for them)
     * Restricted to super_admin only (enforced by controller)
     */
    async impersonateUser(
        targetUserId: string,
        performedBy: string
    ): Promise<{ accessToken: string; refreshToken: string; user: any }> {
        // Validate IDs
        if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
            throw new ValidationError('Invalid user ID', ErrorCode.VAL_INVALID_INPUT);
        }

        // Fetch target user
        const user = await User.findById(targetUserId);
        if (!user) {
            throw new NotFoundError('User not found', ErrorCode.RES_NOT_FOUND);
        }

        // Security: Cannot impersonate another super_admin
        if (user.role === 'super_admin') {
            throw new AuthorizationError(
                'Cannot impersonate a super admin',
                ErrorCode.AUTHZ_FORBIDDEN
            );
        }

        // Generate tokens
        // Explicitly cast _id to string or ObjectId to satisfy TypeScript
        const userId = user._id as mongoose.Types.ObjectId;
        const accessToken = generateAccessToken(userId, user.role, user.companyId);
        const refreshToken = generateRefreshToken(userId, 1); // Assuming version 1 for now

        // Log audit
        logger.warn(`Super Admin ${performedBy} impersonated user ${user.email} (${userId})`, {
            action: 'impersonation_login',
            performedBy,
            targetUser: targetUserId,
            targetRole: user.role
        });

        return {
            accessToken,
            refreshToken,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                companyId: user.companyId
            }
        };
    }

    /**
     * Suspend a user account
     */
    async suspendUser(args: {
        targetUserId: string;
        performedBy: string;
        reason: string;
        duration?: number; // Duration in days (optional)
    }) {
        const { targetUserId, performedBy, reason, duration } = args;

        // Validate IDs
        if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
            throw new ValidationError('Invalid user ID', ErrorCode.VAL_INVALID_INPUT);
        }

        // Cannot suspend self
        if (targetUserId === performedBy) {
            throw new AuthorizationError(
                'Cannot suspend yourself',
                ErrorCode.AUTHZ_FORBIDDEN
            );
        }

        // Fetch target user
        const user = await User.findById(targetUserId);
        if (!user) {
            throw new NotFoundError('User not found', ErrorCode.RES_NOT_FOUND);
        }

        // Cannot suspend super_admin or admin
        if (['super_admin', 'admin'].includes(user.role)) {
            throw new ValidationError(
                'Cannot suspend admin users',
                ErrorCode.VAL_INVALID_INPUT
            );
        }

        // Check if already suspended
        if (user.isSuspended) {
            throw new ValidationError(
                'User is already suspended',
                ErrorCode.VAL_INVALID_INPUT
            );
        }

        // Check if banned (cannot suspend banned users)
        if (user.isBanned) {
            throw new ValidationError(
                'Cannot suspend a banned user. Unban first.',
                ErrorCode.VAL_INVALID_INPUT
            );
        }

        // Calculate expiration if duration provided
        let expiresAt: Date | undefined;
        if (duration && duration > 0) {
            expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + duration);
        }

        // Perform suspension
        user.isSuspended = true;
        user.suspensionReason = reason;
        user.suspendedAt = new Date();
        user.suspendedBy = new mongoose.Types.ObjectId(performedBy);
        user.suspensionExpiresAt = expiresAt;
        user.isActive = false; // Deactivate account
        await user.save();

        logger.warn(`User suspended`, {
            performedBy,
            targetUser: targetUserId,
            targetEmail: user.email,
            reason,
            duration,
            expiresAt,
        });

        return {
            success: true,
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                isSuspended: true,
                suspendedAt: user.suspendedAt,
                suspensionExpiresAt: user.suspensionExpiresAt,
            },
        };
    }

    /**
     * Unsuspend a user account
     */
    async unsuspendUser(args: {
        targetUserId: string;
        performedBy: string;
        reason?: string;
    }) {
        const { targetUserId, performedBy, reason } = args;

        // Validate IDs
        if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
            throw new ValidationError('Invalid user ID', ErrorCode.VAL_INVALID_INPUT);
        }

        // Fetch target user
        const user = await User.findById(targetUserId);
        if (!user) {
            throw new NotFoundError('User not found', ErrorCode.RES_NOT_FOUND);
        }

        // Check if suspended
        if (!user.isSuspended) {
            throw new ValidationError(
                'User is not suspended',
                ErrorCode.VAL_INVALID_INPUT
            );
        }

        // Perform unsuspension
        user.isSuspended = false;
        user.suspensionReason = reason ? `Unsuspended: ${reason}` : 'Unsuspended by admin';
        user.suspendedAt = undefined;
        user.suspendedBy = undefined;
        user.suspensionExpiresAt = undefined;
        user.isActive = true; // Reactivate account
        await user.save();

        logger.info(`User unsuspended`, {
            performedBy,
            targetUser: targetUserId,
            targetEmail: user.email,
            reason,
        });

        return {
            success: true,
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                isSuspended: false,
            },
        };
    }

    /**
     * Permanently ban a user account
     */
    async banUser(args: {
        targetUserId: string;
        performedBy: string;
        reason: string;
    }) {
        const { targetUserId, performedBy, reason } = args;

        // Validate IDs
        if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
            throw new ValidationError('Invalid user ID', ErrorCode.VAL_INVALID_INPUT);
        }

        // Cannot ban self
        if (targetUserId === performedBy) {
            throw new AuthorizationError(
                'Cannot ban yourself',
                ErrorCode.AUTHZ_FORBIDDEN
            );
        }

        // Fetch target user
        const user = await User.findById(targetUserId);
        if (!user) {
            throw new NotFoundError('User not found', ErrorCode.RES_NOT_FOUND);
        }

        // Cannot ban super_admin or admin
        if (['super_admin', 'admin'].includes(user.role)) {
            throw new ValidationError(
                'Cannot ban admin users',
                ErrorCode.VAL_INVALID_INPUT
            );
        }

        // Check if already banned
        if (user.isBanned) {
            throw new ValidationError(
                'User is already banned',
                ErrorCode.VAL_INVALID_INPUT
            );
        }

        // Perform ban (clears suspension if any)
        user.isBanned = true;
        user.banReason = reason;
        user.bannedAt = new Date();
        user.bannedBy = new mongoose.Types.ObjectId(performedBy);
        user.isActive = false; // Deactivate account
        // Clear suspension fields
        user.isSuspended = false;
        user.suspensionReason = undefined;
        user.suspendedAt = undefined;
        user.suspendedBy = undefined;
        user.suspensionExpiresAt = undefined;
        await user.save();

        logger.error(`User permanently banned`, {
            performedBy,
            targetUser: targetUserId,
            targetEmail: user.email,
            reason,
        });

        return {
            success: true,
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                isBanned: true,
                bannedAt: user.bannedAt,
            },
        };
    }

    /**
     * Unban a user account
     */
    async unbanUser(args: {
        targetUserId: string;
        performedBy: string;
        reason?: string;
    }) {
        const { targetUserId, performedBy, reason } = args;

        // Validate IDs
        if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
            throw new ValidationError('Invalid user ID', ErrorCode.VAL_INVALID_INPUT);
        }

        // Fetch target user
        const user = await User.findById(targetUserId);
        if (!user) {
            throw new NotFoundError('User not found', ErrorCode.RES_NOT_FOUND);
        }

        // Check if banned
        if (!user.isBanned) {
            throw new ValidationError(
                'User is not banned',
                ErrorCode.VAL_INVALID_INPUT
            );
        }

        // Perform unban
        user.isBanned = false;
        user.banReason = reason ? `Unbanned: ${reason}` : 'Unbanned by admin';
        user.bannedAt = undefined;
        user.bannedBy = undefined;
        user.isActive = true; // Reactivate account
        await user.save();

        logger.info(`User unbanned`, {
            performedBy,
            targetUser: targetUserId,
            targetEmail: user.email,
            reason,
        });

        return {
            success: true,
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                isBanned: false,
            },
        };
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
