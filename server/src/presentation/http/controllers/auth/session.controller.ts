import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../../middleware/auth/auth';
import { getUserSessions, revokeSession, revokeAllSessions } from '../../../../core/application/services/auth/session.service';
import { createAuditLog } from '../../middleware/system/auditLog';
import logger from '../../../../shared/logger/winston.logger';
import { sendSuccess, sendError, sendValidationError } from '../../../../shared/utils/responseHelper';

const sessionIdSchema = z.object({
  sessionId: z.string(),
});

export const getSessions = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Authentication required', 401, 'AUTH_REQUIRED');
      return;
    }

    const sessions = await getUserSessions(req.user._id);

    const formattedSessions = sessions.map(session => ({
      id: session._id,
      deviceInfo: session.deviceInfo,
      location: session.location,
      ip: session.ip,
      lastActive: session.lastActive,
      createdAt: session.createdAt,
      current: req.cookies?.refreshToken === session.refreshToken,
    }));

    sendSuccess(res, { sessions: formattedSessions }, 'Sessions retrieved successfully');
  } catch (error) {
    logger.error('Error getting sessions:', error);
    next(error);
  }
};

export const terminateSession = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Authentication required', 401, 'AUTH_REQUIRED');
      return;
    }

    const validation = sessionIdSchema.safeParse(req.params);
    if (!validation.success) {
      const errors = validation.error.errors.map(err => ({
        code: 'VALIDATION_ERROR',
        message: err.message,
        field: err.path.join('.'),
      }));
      sendValidationError(res, errors);
      return;
    }

    const success = await revokeSession(validation.data.sessionId, req.user._id.toString());

    if (!success) {
      sendError(res, 'Session not found or already revoked', 404, 'SESSION_NOT_FOUND');
      return;
    }

    await createAuditLog(
      req.user._id,
      req.user.companyId,
      'session_revoke',
      'session',
      validation.data.sessionId,
      { message: 'Session terminated', success: true },
      req
    );

    sendSuccess(res, null, 'Session terminated successfully');
  } catch (error) {
    logger.error('Error terminating session:', error);
    next(error);
  }
};

export const terminateAllSessions = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Authentication required', 401, 'AUTH_REQUIRED');
      return;
    }

    const currentSessionId = req.body.keepCurrent === true
      ? (await getUserSessions(req.user._id)).find(
        session => session.refreshToken === req.cookies?.refreshToken
      )?._id?.toString()
      : undefined;

    const count = await revokeAllSessions(req.user._id, currentSessionId);

    await createAuditLog(
      req.user._id,
      req.user.companyId,
      'session_revoke',
      'session',
      req.user._id,
      { message: 'All sessions terminated', count, keepCurrent: !!currentSessionId, success: true },
      req
    );

    sendSuccess(res, { count }, currentSessionId
      ? 'All other sessions terminated successfully'
      : 'All sessions terminated successfully'
    );
  } catch (error) {
    logger.error('Error terminating all sessions:', error);
    next(error);
  }
};

const sessionController = {
  getSessions,
  terminateSession,
  terminateAllSessions,
};

export default sessionController;
