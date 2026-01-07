/**
 * Session
 * 
 * Purpose: Enforce concurrent session limit for a user
 * 
 * DEPENDENCIES:
 * - Database Models, Error Handling, Logger
 * 
 * TESTING:
 * Unit Tests: tests/unit/services/.../{filename}.test.ts
 * Coverage: TBD
 * 
 * NOTE: This service needs comprehensive documentation.
 * See SERVICE_TEMPLATE.md for documentation standards.
 */

import { Request } from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import * as UAParser from 'ua-parser-js';
import { Session, ISession } from '../../../../infrastructure/database/mongoose/models';
import { verifyRefreshToken } from '../../../../shared/helpers/jwt';
import logger from '../../../../shared/logger/winston.logger';
import { DatabaseError, AuthenticationError } from '../../../../shared/errors/app.error';
import { ErrorCode } from '../../../../shared/errors/errorCodes';

// ✅ FEATURE 11: Concurrent Session Limit
const MAX_CONCURRENT_SESSIONS = parseInt(process.env.MAX_SESSIONS_PER_USER || '5');

/**
 * Enforce concurrent session limit for a user
 * Automatically terminates oldest sessions if limit exceeded
 */
export const enforceSessionLimit = async (
  userId: string,
  newSessionId?: string
): Promise<number> => {
  try {
    // Get all active sessions for user, sorted by lastActivity (oldest first)
    const sessions = await Session.find({
      userId,
      expiresAt: { $gt: new Date() },
    }).sort({ lastActivity: 1 });

    logger.info(`User ${userId} has ${sessions.length} active sessions`);

    // If at or over limit, terminate oldest sessions
    if (sessions.length >= MAX_CONCURRENT_SESSIONS) {
      const sessionsToTerminate = sessions.slice(
        0,
        sessions.length - MAX_CONCURRENT_SESSIONS + 1
      );

      let terminatedCount = 0;
      for (const session of sessionsToTerminate) {
        // Skip the new session we just created (if provided)
        if (newSessionId && (session._id as mongoose.Types.ObjectId).toString() === newSessionId) {
          continue;
        }

        await session.deleteOne();
        terminatedCount++;

        logger.info(
          `Terminated session ${session._id} for user ${userId} due to session limit (${MAX_CONCURRENT_SESSIONS})`
        );
      }

      return terminatedCount;
    }

    return 0;
  } catch (error) {
    logger.error('Error enforcing session limit:', error);
    // Don't throw - session creation should succeed even if cleanup fails
    return 0;
  }
};

/**
 * Create a new session for a user
 */
export const createSession = async (
  userId: string | mongoose.Types.ObjectId,
  refreshToken: string,
  req: Request,
  expiresAt: Date
): Promise<ISession> => {
  try {
    // Parse user agent to get device information
    const parser = new UAParser.UAParser(req.headers['user-agent'] as string);
    const browser = parser.getBrowser();
    const os = parser.getOS();
    const device = parser.getDevice();

    // Determine device type
    let deviceType = 'other';
    if (device.type) {
      if (device.type === 'mobile' || device.type === 'tablet') {
        deviceType = device.type;
      } else {
        deviceType = 'desktop';
      }
    } else if (os.name && !device.type) {
      deviceType = 'desktop';
    }

    // Create a new session
    const session = new Session({
      userId: userId.toString(),
      refreshToken,
      userAgent: req.headers['user-agent'] || 'unknown',
      ip: req.ip || 'unknown',
      deviceInfo: {
        type: deviceType,
        browser: browser.name ? `${browser.name} ${browser.version}` : 'unknown',
        os: os.name ? `${os.name} ${os.version}` : 'unknown',
        deviceName: device.vendor ? `${device.vendor} ${device.model}` : undefined,
      },
      expiresAt,
    });

    await session.save();

    // ✅ FEATURE 11: Enforce session limit after creating session
    await enforceSessionLimit(userId.toString(), (session._id as mongoose.Types.ObjectId).toString());

    return session;
  } catch (error) {
    logger.error('Error creating session:', error);
    throw error;
  }
};

// ✅ FEATURE 15: Token Rotation Reuse Detection

/**
 * Rotate refresh token and track previous token in rotation chain
 */
export const rotateRefreshToken = async (
  session: ISession,
  newRefreshToken: string
): Promise<void> => {
  try {
    // Store current token as previous (for reuse detection)
    session.previousToken = session.refreshToken;
    session.refreshToken = newRefreshToken;
    session.rotationCount = (session.rotationCount || 0) + 1;
    session.lastRotatedAt = new Date();

    await session.save();

    logger.info(`Token rotated for session ${(session._id as mongoose.Types.ObjectId).toString()}`, {
      userId: session.userId,
      rotationCount: session.rotationCount,
    });
  } catch (error) {
    logger.error('Token rotation error:', error);
    throw error;
  }
};

/**
 * Validate session and detect token reuse (replay attacks)
 * Returns null if token reuse detected
 */
export const validateSessionWithReuseDetection = async (
  refreshToken: string,
  req: Request
): Promise<ISession | null> => {
  try {
    // Find session by current refresh token (hashed)
    const sessions = await Session.find({
      expiresAt: { $gt: new Date() },
    });

    // Check each session's hashed token
    let activeSession: ISession | null = null;
    for (const session of sessions) {
      const isMatch = await session.compareRefreshToken(refreshToken);
      if (isMatch) {
        activeSession = session;
        break;
      }
    }

    if (!activeSession) {
      // Token not found in active sessions - check if it was previously used (rotation chain)
      const allSessions = await Session.find({});

      // Check against previousToken field
      for (const session of allSessions) {
        if (session.previousToken) {
          const isPreviousMatch = await bcrypt.compare(refreshToken, session.previousToken);
          if (isPreviousMatch) {
            // ✅ FEATURE 15: Token reuse detected!
            logger.error('SECURITY BREACH: Refresh token reuse detected', {
              userId: session.userId,
              sessionId: (session._id as mongoose.Types.ObjectId).toString(),
              ip: req.ip,
              userAgent: req.headers['user-agent'],
              rotationCount: session.rotationCount,
            });

            // Mark as suspicious
            session.suspiciousActivity = {
              reuseDetected: true,
              reuseAttemptedAt: new Date(),
              reuseIp: req.ip || 'unknown',
            };
            await session.save();

            // Revoke ALL sessions for this user (potential breach)
            const revokedCount = await revokeAllSessions(session.userId.toString());
            logger.warn(`Revoked ${revokedCount} sessions for user ${session.userId} due to token reuse`);

            // Log security breach directly to AuditLog (avoid circular import issues)
            const { AuditLog } = await import('../../../../infrastructure/database/mongoose/models/index.js');
            await AuditLog.create({
              userId: session.userId.toString(),
              companyId: '',
              action: 'security_breach',
              resourceType: 'session',
              resourceId: (session._id as mongoose.Types.ObjectId).toString(),
              metadata: {
                message: 'Refresh token reuse detected - all sessions revoked',
                ip: req.ip || 'unknown',
                reason: 'token_replay_attack',
                revokedCount,
                userAgent: req.headers['user-agent'] || 'unknown',
              },
              ip: req.ip || 'unknown',
              userAgent: req.headers['user-agent'] || 'unknown',
            });

            return null; // Force re-authentication
          }
        }
      }

      return null; // Invalid token
    }

    // Valid session - update activity
    activeSession.lastActive = new Date();
    await activeSession.save();

    return activeSession;
  } catch (error) {
    logger.error('Session validation with reuse detection error:', error);
    throw error;
  }
};

/**
 * Get all active sessions for a user
 */
export const getUserSessions = async (userId: string | mongoose.Types.ObjectId): Promise<ISession[]> => {
  try {
    return await Session.find({
      userId: userId.toString(),
      isRevoked: false,
      expiresAt: { $gt: new Date() },
    }).sort({ lastActive: -1 });
  } catch (error) {
    logger.error('Error getting user sessions:', error);
    throw error;
  }
};

/**
 * Revoke a specific session
 */
export const revokeSession = async (sessionId: string, userId: string): Promise<boolean> => {
  try {
    const result = await Session.updateOne(
      { _id: sessionId, userId },
      { isRevoked: true }
    );
    return result.modifiedCount > 0;
  } catch (error) {
    logger.error('Error revoking session:', error);
    throw error;
  }
};

/**
 * Revoke all sessions for a user except the current one
 */
export const revokeAllSessions = async (
  userId: string | mongoose.Types.ObjectId,
  currentSessionId?: string
): Promise<number> => {
  try {
    const query: any = {
      userId: userId.toString(),
      isRevoked: false,
    };

    // Exclude current session if provided
    if (currentSessionId) {
      query._id = { $ne: currentSessionId };
    }

    const result = await Session.updateMany(query, { isRevoked: true });
    return result.modifiedCount;
  } catch (error) {
    logger.error('Error revoking all sessions:', error);
    throw error;
  }
};

/**
 * Update session last active time
 */
export const updateSessionActivity = async (refreshToken: string): Promise<void> => {
  try {
    await Session.updateOne(
      { refreshToken, isRevoked: false },
      { lastActive: new Date() }
    );
  } catch (error) {
    logger.error('Error updating session activity:', error);
    // Don't throw error to prevent disrupting the main flow
  }
};

/**
 * Validate a session by refresh token
 */
export const validateSession = async (refreshToken: string): Promise<ISession | null> => {
  try {
    // Verify the token first
    const payload = await verifyRefreshToken(refreshToken);

    // Find the session
    const session = await Session.findOne({
      refreshToken,
      userId: payload.userId,
      isRevoked: false,
      expiresAt: { $gt: new Date() },
    });

    return session;
  } catch (error) {
    logger.error('Error validating session:', error);
    return null;
  }
};

export default {
  createSession,
  getUserSessions,
  revokeSession,
  revokeAllSessions,
  updateSessionActivity,
  validateSession,
  enforceSessionLimit,
  rotateRefreshToken,
  validateSessionWithReuseDetection,
};
