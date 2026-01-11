import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { getUserSessions, revokeSession, revokeAllSessions } from '../../../../core/application/services/auth/session.service';
import { createAuditLog } from '../../middleware/system/audit-log.middleware';
import logger from '../../../../shared/logger/winston.logger';
import { sendSuccess, sendError, sendValidationError } from '../../../../shared/utils/responseHelper';
import { ISession } from '../../../../infrastructure/database/mongoose/models';
import { AuthenticationError, ValidationError, DatabaseError } from '../../../../shared/errors/app.error';
import { ErrorCode } from '../../../../shared/errors/errorCodes';

const sessionIdSchema = z.object({
  sessionId: z.string(),
});

/**
 * Helper function to find the current session ID by comparing cookie token with hashed session tokens
 * Uses bcrypt.compare since session.refreshToken is stored as bcrypt hash
 */
const findCurrentSessionId = async (sessions: ISession[], cookieToken?: string): Promise<string | undefined> => {
  if (!cookieToken) return undefined;

  for (const session of sessions) {
    try {
      // ✅ FIX: Use bcrypt.compare to match plaintext cookie with stored hash
      const isMatch = await bcrypt.compare(cookieToken, session.refreshToken);
      if (isMatch) {
        return (session._id as any).toString();
      }
    } catch (error) {
      // If comparison fails, continue to next session
      logger.debug('Session token comparison failed:', error);
    }
  }
  return undefined;
};

export const getSessions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Authentication required', 401, 'AUTH_REQUIRED');
      return;
    }

    const sessions = await getUserSessions(req.user._id);

    // ✅ FIX: Use bcrypt.compare to identify current session (was comparing plaintext with hash)
    const currentSessionId = await findCurrentSessionId(sessions, req.cookies?.refreshToken);

    const formattedSessions = sessions.map(session => ({
      id: session._id,
      deviceInfo: session.deviceInfo,
      location: session.location,
      ip: session.ip,
      lastActive: session.lastActive,
      createdAt: session.createdAt,
      current: (session._id as any).toString() === currentSessionId,
    }));

    sendSuccess(res, { sessions: formattedSessions }, 'Sessions retrieved successfully');
  } catch (error) {
    logger.error('Error getting sessions:', error);
    next(error);
  }
};


export const terminateSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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

export const terminateAllSessions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Authentication required', 401, 'AUTH_REQUIRED');
      return;
    }

    // ✅ FIX: Use bcrypt.compare via helper to find current session
    const sessions = await getUserSessions(req.user._id);
    const currentSessionId = req.body.keepCurrent === true
      ? await findCurrentSessionId(sessions, req.cookies?.refreshToken)
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
