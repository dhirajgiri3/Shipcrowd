import { NextFunction, Request, Response } from 'express';
import ImpersonationService from '../../../../core/application/services/admin/impersonation.service';
import { ValidationError } from '../../../../shared/errors/app.error';
import { guardChecks, parsePagination } from '../../../../shared/helpers/controller.helpers';
import logger from '../../../../shared/logger/winston.logger';
import { calculatePagination, sendCreated, sendPaginated, sendSuccess } from '../../../../shared/utils/responseHelper';

/**
 * Start impersonation session
 * POST /api/v1/admin/impersonation/start
 */
export const startImpersonation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req);

        const { targetUserId, reason, metadata } = req.body;

        if (!targetUserId) {
            throw new ValidationError('Target user ID is required');
        }

        if (!reason || reason.trim().length < 10) {
            throw new ValidationError('Impersonation reason must be at least 10 characters');
        }

        const result = await ImpersonationService.startImpersonation({
            adminUserId: auth.userId,
            targetUserId,
            reason,
            ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
            userAgent: req.headers['user-agent'] || 'unknown',
            metadata,
        });

        // Set impersonation token in cookie
        res.cookie('impersonationToken', result.impersonationToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
        });

        sendCreated(res, result, 'Impersonation session started successfully');
    } catch (error) {
        logger.error('Error starting impersonation:', error);
        next(error);
    }
};

/**
 * End impersonation session
 * POST /api/v1/admin/impersonation/end
 */
export const endImpersonation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req);

        const { sessionId } = req.body;

        if (!sessionId) {
            throw new ValidationError('Session ID is required');
        }

        const result = await ImpersonationService.endImpersonation({
            sessionId,
            adminUserId: auth.userId,
        });

        // Clear impersonation token cookie
        res.clearCookie('impersonationToken');

        sendSuccess(res, result, 'Impersonation session ended successfully');
    } catch (error) {
        logger.error('Error ending impersonation:', error);
        next(error);
    }
};

/**
 * Get active impersonation sessions for current admin
 * GET /api/v1/admin/impersonation/active
 */
export const getActiveSessions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req);

        const sessions = await ImpersonationService.getActiveSessionsForAdmin(auth.userId);

        sendSuccess(res, { sessions }, 'Active sessions retrieved successfully');
    } catch (error) {
        logger.error('Error fetching active sessions:', error);
        next(error);
    }
};

/**
 * Get impersonation history
 * GET /api/v1/admin/impersonation/history
 */
export const getImpersonationHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req);
void auth;

        const { page, limit, skip } = parsePagination(req.query as Record<string, any>);

        const { targetUserId, adminUserId } = req.query;

        const result = await ImpersonationService.getImpersonationHistory({
            targetUserId: targetUserId as string,
            adminUserId: adminUserId as string,
            limit,
            skip,
        });

        const pagination = calculatePagination(result.total, page, limit);
        sendPaginated(res, result.sessions, pagination, 'Impersonation history retrieved successfully');
    } catch (error) {
        logger.error('Error fetching impersonation history:', error);
        next(error);
    }
};

/**
 * End all active impersonation sessions for current admin
 * POST /api/v1/admin/impersonation/end-all
 */
export const endAllSessions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req);

        const result = await ImpersonationService.endAllSessionsForAdmin(auth.userId);

        // Clear impersonation token cookie
        res.clearCookie('impersonationToken');

        sendSuccess(res, result, 'All impersonation sessions ended successfully');
    } catch (error) {
        logger.error('Error ending all sessions:', error);
        next(error);
    }
};

export default {
    startImpersonation,
    endImpersonation,
    getActiveSessions,
    getImpersonationHistory,
    endAllSessions,
};
