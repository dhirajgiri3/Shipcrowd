import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';
import { getUserSessions, revokeSession, revokeAllSessions } from '../../../core/application/services/auth/session.service';
import { createAuditLog } from '../middleware/auditLog';
import logger from '../../../shared/logger/winston.logger';

// Define validation schemas
const sessionIdSchema = z.object({
  sessionId: z.string(),
});

/**
 * Get all active sessions for the current user
 * @route GET /sessions
 */
export const getSessions = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const sessions = await getUserSessions(req.user._id);

    // Format sessions for client
    const formattedSessions = sessions.map(session => ({
      id: session._id,
      deviceInfo: session.deviceInfo,
      location: session.location,
      ip: session.ip,
      lastActive: session.lastActive,
      createdAt: session.createdAt,
      // Identify current session
      current: req.cookies?.refreshToken === session.refreshToken,
    }));

    res.json({ sessions: formattedSessions });
  } catch (error) {
    logger.error('Error getting sessions:', error);
    next(error);
  }
};

/**
 * Revoke a specific session
 * @route DELETE /sessions/:sessionId
 */
export const terminateSession = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const { sessionId } = sessionIdSchema.parse(req.params);

    const success = await revokeSession(sessionId, req.user._id.toString());

    if (!success) {
      res.status(404).json({ message: 'Session not found or already revoked' });
      return;
    }

    await createAuditLog(
      req.user._id,
      req.user.companyId,
      'session_revoke',
      'session',
      sessionId,
      {
        message: 'Session terminated',
        success: true
      },
      req
    );

    res.json({ message: 'Session terminated successfully' });
  } catch (error) {
    logger.error('Error terminating session:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Validation error', errors: error.errors });
      return;
    }
    next(error);
  }
};

/**
 * Revoke all sessions except the current one
 * @route DELETE /sessions
 */
export const terminateAllSessions = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    // Get current session ID
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
      {
        message: 'All sessions terminated',
        count,
        keepCurrent: !!currentSessionId,
        success: true
      },
      req
    );

    res.json({
      message: currentSessionId
        ? 'All other sessions terminated successfully'
        : 'All sessions terminated successfully',
      count
    });
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
