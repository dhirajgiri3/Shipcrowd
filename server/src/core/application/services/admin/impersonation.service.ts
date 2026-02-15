import crypto from 'crypto';
import mongoose from 'mongoose';
import { User } from '../../../../infrastructure/database/mongoose/models';
import ImpersonationSession from '../../../../infrastructure/database/mongoose/models/admin/impersonation-session.model';
import { AppError, AuthenticationError, ValidationError } from '../../../../shared/errors/app.error';
import { ErrorCode } from '../../../../shared/errors/errorCodes';
import { generateAccessToken } from '../../../../shared/helpers/jwt';
import logger from '../../../../shared/logger/winston.logger';

/**
 * Impersonation Service
 * Manages admin impersonation sessions with full audit trail
 */
class ImpersonationService {
    /**
     * Start impersonation session
     * Only super_admin and admin roles can impersonate
     */
    async startImpersonation(args: {
        adminUserId: string;
        targetUserId: string;
        reason: string;
        ipAddress: string;
        userAgent: string;
        metadata?: {
            ticketNumber?: string;
            supportRequestId?: string;
            notes?: string;
        };
    }) {
        const { adminUserId, targetUserId, reason, ipAddress, userAgent, metadata } = args;

        // Validate admin user
        const adminUser = await User.findById(adminUserId).select('role name email');
        if (!adminUser) {
            throw new AppError('Admin user not found', ErrorCode.RES_NOT_FOUND, 404);
        }

        // Only super_admin and admin can impersonate
        if (!['super_admin', 'admin'].includes(adminUser.role)) {
            throw new AuthenticationError('Insufficient permissions', ErrorCode.AUTHZ_INSUFFICIENT_PERMISSIONS);
        }

        // Validate target user
        const targetUser = await User.findById(targetUserId)
            .select('role name email companyId teamStatus')
            .populate('companyId', 'name isSuspended');

        if (!targetUser) {
            throw new AppError('Target user not found', ErrorCode.RES_NOT_FOUND, 404);
        }

        // Prevent impersonating other admins or super admins
        if (['super_admin', 'admin'].includes(targetUser.role)) {
            throw new ValidationError(
                'Cannot impersonate admin users',
                ErrorCode.VAL_INVALID_INPUT
            );
        }

        // Prevent impersonating if admin user is same as target
        if (adminUserId === targetUserId) {
            throw new ValidationError(
                'Cannot impersonate yourself',
                ErrorCode.VAL_INVALID_INPUT
            );
        }

        // Validate reason
        if (!reason || reason.trim().length < 10) {
            throw new ValidationError(
                'Impersonation reason must be at least 10 characters',
                ErrorCode.VAL_INVALID_INPUT
            );
        }

        // Check if admin already has an active session with this user
        const existingSession = await ImpersonationSession.findOne({
            adminUserId: new mongoose.Types.ObjectId(adminUserId),
            targetUserId: new mongoose.Types.ObjectId(targetUserId),
            isActive: true,
        });

        if (existingSession) {
            throw new ValidationError(
                'An active impersonation session already exists for this user',
                ErrorCode.VAL_INVALID_INPUT
            );
        }

        // Generate unique session token
        const sessionToken = crypto.randomBytes(32).toString('hex');

        // Create impersonation session
        const session = await ImpersonationSession.create({
            adminUserId: new mongoose.Types.ObjectId(adminUserId),
            targetUserId: new mongoose.Types.ObjectId(targetUserId),
            targetCompanyId: targetUser.companyId,
            sessionToken,
            startedAt: new Date(),
            isActive: true,
            reason: reason.trim(),
            ipAddress,
            userAgent,
            actionsPerformed: [],
            metadata,
        });

        // Generate impersonation token (JWT with special claims)
        const impersonationToken = generateAccessToken(
            targetUserId,
            targetUser.role,
            targetUser.companyId?.toString(),
            {
                impersonation: {
                    sessionId: (session as any)._id.toString(),
                    adminUserId,
                    sessionToken,
                },
            }
        );

        logger.warn('Impersonation session started', {
            adminUserId,
            adminEmail: adminUser.email,
            targetUserId,
            targetEmail: targetUser.email,
            sessionId: (session as any)._id,
            reason,
        });

        return {
            success: true,
            session: {
                id: session._id,
                sessionToken,
                targetUser: {
                    id: targetUser._id,
                    name: targetUser.name,
                    email: targetUser.email,
                    role: targetUser.role,
                    companyId: targetUser.companyId,
                },
                startedAt: session.startedAt,
            },
            impersonationToken,
        };
    }

    /**
     * End impersonation session
     */
    async endImpersonation(args: { sessionId: string; adminUserId: string }) {
        const { sessionId, adminUserId } = args;

        const session = await ImpersonationSession.findOne({
            _id: new mongoose.Types.ObjectId(sessionId),
            adminUserId: new mongoose.Types.ObjectId(adminUserId),
            isActive: true,
        });

        if (!session) {
            throw new AppError('Impersonation session not found or already ended', ErrorCode.RES_NOT_FOUND, 404);
        }

        session.isActive = false;
        session.endedAt = new Date();
        await session.save();

        logger.info('Impersonation session ended', {
            sessionId,
            adminUserId,
            targetUserId: session.targetUserId,
            duration: Date.now() - session.startedAt.getTime(),
        });

        return {
            success: true,
            message: 'Impersonation session ended successfully',
            session: {
                id: session._id,
                duration: Date.now() - session.startedAt.getTime(),
                actionsCount: session.actionsPerformed.length,
            },
        };
    }

    /**
     * Log action performed during impersonation
     */
    async logAction(args: {
        sessionToken: string;
        action: string;
        resource: string;
        resourceId?: string;
        metadata?: Record<string, any>;
    }) {
        const { sessionToken, action, resource, resourceId, metadata } = args;

        const session = await ImpersonationSession.findOne({
            sessionToken,
            isActive: true,
        });

        if (!session) {
            logger.warn('Attempted to log action for invalid impersonation session', {
                sessionToken: sessionToken.substring(0, 8) + '...',
                action,
                resource,
            });
            return;
        }

        session.actionsPerformed.push({
            action,
            resource,
            resourceId,
            timestamp: new Date(),
            metadata,
        } as any);

        await session.save();
    }

    /**
     * Get active impersonation sessions for admin
     */
    async getActiveSessionsForAdmin(adminUserId: string) {
        const sessions = await ImpersonationSession.find({
            adminUserId: new mongoose.Types.ObjectId(adminUserId),
            isActive: true,
        })
            .populate('targetUserId', 'name email role')
            .populate('targetCompanyId', 'name')
            .sort({ startedAt: -1 })
            .lean();

        return sessions;
    }

    /**
     * Get impersonation history for a user
     */
    async getImpersonationHistory(args: {
        targetUserId?: string;
        adminUserId?: string;
        limit?: number;
        skip?: number;
    }) {
        const { targetUserId, adminUserId, limit = 50, skip = 0 } = args;

        const filter: any = {};
        if (targetUserId) {
            filter.targetUserId = new mongoose.Types.ObjectId(targetUserId);
        }
        if (adminUserId) {
            filter.adminUserId = new mongoose.Types.ObjectId(adminUserId);
        }

        const [sessions, total] = await Promise.all([
            ImpersonationSession.find(filter)
                .populate('adminUserId', 'name email role')
                .populate('targetUserId', 'name email role')
                .populate('targetCompanyId', 'name')
                .sort({ startedAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            ImpersonationSession.countDocuments(filter),
        ]);

        return {
            sessions,
            total,
            limit,
            skip,
        };
    }

    /**
     * Verify impersonation session is valid
     */
    async verifySession(sessionToken: string) {
        const session = await ImpersonationSession.findOne({
            sessionToken,
            isActive: true,
        }).lean();

        if (!session) {
            return { valid: false };
        }

        // Check if session is older than 24 hours (auto-expire)
        const sessionAge = Date.now() - session.startedAt.getTime();
        const maxSessionAge = 24 * 60 * 60 * 1000; // 24 hours

        if (sessionAge > maxSessionAge) {
            // Auto-expire old session
            await ImpersonationSession.updateOne(
                { _id: session._id },
                { $set: { isActive: false, endedAt: new Date() } }
            );
            return { valid: false, reason: 'Session expired (24 hours limit)' };
        }

        return {
            valid: true,
            session: {
                id: session._id,
                adminUserId: session.adminUserId,
                targetUserId: session.targetUserId,
                targetCompanyId: session.targetCompanyId,
                startedAt: session.startedAt,
            },
        };
    }

    /**
     * End all active sessions for admin (safety feature)
     */
    async endAllSessionsForAdmin(adminUserId: string) {
        const result = await ImpersonationSession.updateMany(
            {
                adminUserId: new mongoose.Types.ObjectId(adminUserId),
                isActive: true,
            },
            {
                $set: {
                    isActive: false,
                    endedAt: new Date(),
                },
            }
        );

        logger.info('All impersonation sessions ended for admin', {
            adminUserId,
            sessionsEnded: result.modifiedCount,
        });

        return {
            success: true,
            sessionsEnded: result.modifiedCount,
        };
    }
}

export default new ImpersonationService();
