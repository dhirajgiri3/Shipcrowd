import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { getUserSessions, revokeSession, revokeAllSessions } from '../../../../core/application/services/auth/session.service';
import { createAuditLog } from '../../middleware/system/audit-log.middleware';
import logger from '../../../../shared/logger/winston.logger';
import { guardChecks, requireCompanyContext } from '../../../../shared/helpers/controller.helpers';
import { sendSuccess } from '../../../../shared/utils/responseHelper';
import { ISession } from '../../../../infrastructure/database/mongoose/models';
import { AuthenticationError, ValidationError, NotFoundError } from '../../../../shared/errors/app.error';
import { ErrorCode } from '../../../../shared/errors/errorCodes';
import { getRefreshTokenFromRequest } from '../../../../shared/helpers/auth-cookies';

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
    const auth = guardChecks(req);
    requireCompanyContext(auth);

    const sessions = await getUserSessions(auth.userId);

    // ✅ FIX: Use bcrypt.compare to identify current session (was comparing plaintext with hash)
    const currentSessionId = await findCurrentSessionId(sessions, getRefreshTokenFromRequest(req));

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
    const auth = guardChecks(req);
    requireCompanyContext(auth);

    const validation = sessionIdSchema.safeParse(req.params);
    if (!validation.success) {
      const errors = validation.error.errors.map(err => ({
        code: 'VALIDATION_ERROR',
        message: err.message,
        field: err.path.join('.'),
      }));
      throw new ValidationError('Validation failed', errors);
    }

    const success = await revokeSession(validation.data.sessionId, auth.userId.toString());

    if (!success) {
      throw new NotFoundError('Session', ErrorCode.BIZ_NOT_FOUND);
    }

    await createAuditLog(
      auth.userId,
      auth.companyId,
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
    const auth = guardChecks(req);
    requireCompanyContext(auth);

    // ✅ FIX: Use bcrypt.compare via helper to find current session
    const sessions = await getUserSessions(auth.userId);
    const currentSessionId = req.body?.keepCurrent === true
      ? await findCurrentSessionId(sessions, getRefreshTokenFromRequest(req))
      : undefined;

    const count = await revokeAllSessions(auth.userId, currentSessionId);

    await createAuditLog(
      auth.userId,
      auth.companyId,
      'session_revoke',
      'session',
      auth.userId,
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
