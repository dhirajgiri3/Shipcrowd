/**
 * Session Service
 * 
 * Purpose: Manage user sessions with security features including:
 * - Concurrent session limits (device-specific + global)
 * - Token rotation and reuse detection
 * - Device tracking and notifications
 * - MongoDB transaction support with fallback
 * 
 * DEPENDENCIES:
 * - Database Models (Session, User, AuditLog)
 * - JWT helpers, Logger, Error handling
 * - Email service for security notifications
 * 
 * TESTING:
 * Unit Tests: tests/unit/services/auth/session.service.test.ts
 * Integration Tests: tests/integration/auth/session-*.test.ts
 * 
 * ✅ PHASE 1 IMPROVEMENTS:
 * - Transaction support with automatic fallback for test environments
 * - Removed all dynamic imports for Jest compatibility
 * - Optimized token comparison performance
 * - Enhanced error handling and logging
 * - Input validation for all public methods
 */

import bcrypt from 'bcrypt';
import { Request } from 'express';
import mongoose from 'mongoose';
import * as UAParser from 'ua-parser-js';
import { AuditLog, ISession, Session, User } from '../../../../infrastructure/database/mongoose/models';
import { AuthenticationError } from '../../../../shared/errors/app.error';
import { ErrorCode } from '../../../../shared/errors/errorCodes';
import { verifyRefreshToken } from '../../../../shared/helpers/jwt';
import logger from '../../../../shared/logger/winston.logger';
import { sendNewDeviceLoginEmail } from '../communication/email.service';

// ============================================================================
// CONFIGURATION
// ============================================================================

// ✅ FEATURE 11: Concurrent Session Limit
const MAX_CONCURRENT_SESSIONS = parseInt(process.env.MAX_SESSIONS_PER_USER || '5');

// ✅ FEATURE 12: Session Type Differentiation
const MAX_SESSIONS_DESKTOP = parseInt(process.env.MAX_DESKTOP_SESSIONS || '1');
const MAX_SESSIONS_MOBILE = parseInt(process.env.MAX_MOBILE_SESSIONS || '2');

// Transaction support detection
let TRANSACTIONS_SUPPORTED: boolean | null = null;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Normalize device type to desktop or mobile
 */
const normalizeDeviceType = (type: string | undefined): 'desktop' | 'mobile' => {
  if (type === 'mobile' || type === 'tablet') return 'mobile';
  return 'desktop';
};

/**
 * Check if MongoDB transactions are supported
 * Caches result to avoid repeated checks
 */
const checkTransactionSupport = async (): Promise<boolean> => {
  if (TRANSACTIONS_SUPPORTED !== null) {
    return TRANSACTIONS_SUPPORTED;
  }

  try {
    const session = await mongoose.startSession();
    await session.withTransaction(async () => {
      // Empty transaction to test support
    });
    await session.endSession();
    TRANSACTIONS_SUPPORTED = true;
    logger.info('MongoDB transactions: SUPPORTED');
  } catch (error: any) {
    if (error.message?.includes('Transaction') || error.message?.includes('replica set')) {
      TRANSACTIONS_SUPPORTED = false;
      logger.warn('MongoDB transactions: NOT SUPPORTED (standalone mode). Using fallback implementation.');
    } else {
      // Unknown error, assume not supported
      TRANSACTIONS_SUPPORTED = false;
      logger.error('Error checking transaction support:', error);
    }
  }

  return TRANSACTIONS_SUPPORTED;
};

/**
 * Validate user ID format
 */
const validateUserId = (userId: string | mongoose.Types.ObjectId): void => {
  const id = userId.toString();
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AuthenticationError(
      `Invalid userId format: ${id}`,
      ErrorCode.VAL_INVALID_INPUT
    );
  }
};

/**
 * Validate session ID format
 */
const validateSessionId = (sessionId: string): void => {
  if (!mongoose.Types.ObjectId.isValid(sessionId)) {
    throw new AuthenticationError(
      `Invalid sessionId format: ${sessionId}`,
      ErrorCode.VAL_INVALID_INPUT
    );
  }
};

// ============================================================================
// SESSION LIMIT ENFORCEMENT
// ============================================================================

/**
 * Enforce concurrent session limit for a user (WITH transaction support)
 * 
 * ✅ PHASE 1 FIX: Uses MongoDB transactions when available to prevent race conditions
 * Falls back to non-transactional implementation for test environments
 */
const enforceSessionLimitWithTransaction = async (
  userId: string,
  newSessionId?: string,
  deviceType: string = 'other'
): Promise<number> => {
  const session = await mongoose.startSession();
  let terminatedCount = 0;

  try {
    await session.withTransaction(async () => {
      // ✅ Lock user document to prevent concurrent modifications
      await User.findByIdAndUpdate(
        userId,
        { $set: { 'security.lastSessionUpdate': new Date() } },
        { session, new: true }
      );

      // Get all active sessions (within transaction)
      const activeSessions = await Session.find({
        userId,
        expiresAt: { $gt: new Date() },
      })
        .sort({ lastActivity: 1 }) // Oldest first
        .session(session);

      logger.debug(`User ${userId} has ${activeSessions.length} active sessions`);

      const sessionsToTerminateIds = calculateSessionsToTerminate(
        activeSessions,
        newSessionId,
        deviceType
      );

      // Execute Terminations (within transaction)
      if (sessionsToTerminateIds.length > 0) {
        const result = await Session.deleteMany(
          { _id: { $in: sessionsToTerminateIds } },
          { session }
        );

        terminatedCount = result.deletedCount || 0;

        logger.info(
          `Terminated ${terminatedCount} sessions for user ${userId} (Type: ${deviceType})`
        );
      }
    });

    return terminatedCount;
  } catch (error) {
    logger.error('Error enforcing session limit with transaction:', error);
    return 0; // Don't throw - session creation should succeed even if cleanup fails
  } finally {
    await session.endSession();
  }
};

/**
 * Enforce concurrent session limit for a user (WITHOUT transactions - fallback)
 * Used in test environments or standalone MongoDB instances
 */
const enforceSessionLimitWithoutTransaction = async (
  userId: string,
  newSessionId?: string,
  deviceType: string = 'other'
): Promise<number> => {
  try {
    // Update user's last session update time
    await User.findByIdAndUpdate(
      userId,
      { $set: { 'security.lastSessionUpdate': new Date() } },
      { new: true }
    );

    // Get all active sessions
    const activeSessions = await Session.find({
      userId,
      expiresAt: { $gt: new Date() },
    }).sort({ lastActivity: 1 }); // Oldest first

    logger.debug(`User ${userId} has ${activeSessions.length} active sessions`);

    const sessionsToTerminateIds = calculateSessionsToTerminate(
      activeSessions,
      newSessionId,
      deviceType
    );

    // Execute Terminations
    if (sessionsToTerminateIds.length > 0) {
      const result = await Session.deleteMany({
        _id: { $in: sessionsToTerminateIds }
      });

      const terminatedCount = result.deletedCount || 0;

      logger.info(
        `Terminated ${terminatedCount} sessions for user ${userId} (Type: ${deviceType})`
      );

      return terminatedCount;
    }

    return 0;
  } catch (error) {
    logger.error('Error enforcing session limit without transaction:', error);
    return 0; // Don't throw - session creation should succeed even if cleanup fails
  }
};

/**
 * Calculate which sessions should be terminated based on limits
 * Extracted for reusability between transaction and non-transaction modes
 */
const calculateSessionsToTerminate = (
  activeSessions: ISession[],
  newSessionId?: string,
  deviceType: string = 'other'
): string[] => {
  const sessionsToTerminateIds: string[] = [];

  // 1. Enforce Device-Type Specific Limits
  const normalizedNewType = normalizeDeviceType(deviceType);
  const sameTypeSessions = activeSessions.filter(s =>
    normalizeDeviceType(s.deviceInfo?.type) === normalizedNewType
  );

  const limit = normalizedNewType === 'mobile' ? MAX_SESSIONS_MOBILE : MAX_SESSIONS_DESKTOP;

  if (sameTypeSessions.length > limit) {
    const countToRemove = sameTypeSessions.length - limit;
    const toRemove = sameTypeSessions.slice(0, countToRemove);

    for (const s of toRemove) {
      const sId = (s._id as mongoose.Types.ObjectId).toString();
      // Don't terminate the session we just created
      if (newSessionId && sId === newSessionId) continue;
      sessionsToTerminateIds.push(sId);
    }
  }

  // 2. Enforce Global Limit
  if (activeSessions.length > MAX_CONCURRENT_SESSIONS) {
    const remainingSessions = activeSessions.filter(s =>
      !sessionsToTerminateIds.includes((s._id as mongoose.Types.ObjectId).toString())
    );

    if (remainingSessions.length > MAX_CONCURRENT_SESSIONS) {
      const countToRemove = remainingSessions.length - MAX_CONCURRENT_SESSIONS;
      const toRemove = remainingSessions.slice(0, countToRemove);

      for (const s of toRemove) {
        const sId = (s._id as mongoose.Types.ObjectId).toString();
        if (newSessionId && sId === newSessionId) continue;
        if (!sessionsToTerminateIds.includes(sId)) {
          sessionsToTerminateIds.push(sId);
        }
      }
    }
  }

  return sessionsToTerminateIds;
};

/**
 * Enforce concurrent session limit for a user
 * Automatically uses transactions if supported, otherwise falls back
 * 
 * @param userId - User ID to enforce limits for
 * @param newSessionId - Optional ID of newly created session to preserve
 * @param deviceType - Device type for device-specific limits
 * @returns Number of sessions terminated
 */
export const enforceSessionLimit = async (
  userId: string,
  newSessionId?: string,
  deviceType: string = 'other'
): Promise<number> => {
  try {
    validateUserId(userId);

    const transactionsSupported = await checkTransactionSupport();

    if (transactionsSupported) {
      return await enforceSessionLimitWithTransaction(userId, newSessionId, deviceType);
    } else {
      return await enforceSessionLimitWithoutTransaction(userId, newSessionId, deviceType);
    }
  } catch (error) {
    logger.error('Error in enforceSessionLimit:', error);
    return 0;
  }
};

// ============================================================================
// SESSION CREATION
// ============================================================================

/**
 * Parse device information from user agent
 */
const parseDeviceInfo = (userAgent: string) => {
  const parser = new UAParser.UAParser(userAgent);
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

  return {
    deviceType,
    deviceInfo: {
      type: deviceType,
      browser: browser.name ? `${browser.name} ${browser.version}` : 'unknown',
      os: os.name ? `${os.name} ${os.version}` : 'unknown',
      deviceName: device.vendor ? `${device.vendor} ${device.model}` : undefined,
    }
  };
};

/**
 * Handle device tracking and security notifications
 */
const handleDeviceTracking = async (
  userId: string | mongoose.Types.ObjectId,
  session: ISession
): Promise<void> => {
  try {
    const user = await User.findById(userId);
    if (!user) return;

    const currentDeviceId = session.deviceInfo?.deviceName ||
      `${session.deviceInfo?.os} - ${session.deviceInfo?.browser}`;

    // Check if device is trusted
    const isTrusted = user.security.trustedDevices?.some(d =>
      (d.deviceId === currentDeviceId) ||
      (d.ip === session.ip && d.userAgent === session.userAgent)
    );

    if (!isTrusted) {
      // Add to trusted devices
      user.security.trustedDevices = user.security.trustedDevices || [];
      user.security.trustedDevices.push({
        deviceId: currentDeviceId,
        userAgent: session.userAgent,
        ip: session.ip,
        lastActive: new Date(),
        addedAt: new Date()
      });
      await user.save();

      // Send security alert
      await sendNewDeviceLoginEmail(user.email, user.name, {
        deviceType: session.deviceInfo?.type || 'unknown',
        os: session.deviceInfo?.os || 'unknown',
        browser: session.deviceInfo?.browser || 'unknown',
        ip: session.ip || 'unknown',
        time: new Date()
      });

      logger.info(`New device detected for user ${userId}. Alert sent.`);
    } else {
      // Update last active for trusted device
      if (user.security.trustedDevices) {
        const deviceIndex = user.security.trustedDevices.findIndex(d =>
          (d.deviceId === currentDeviceId) ||
          (d.ip === session.ip && d.userAgent === session.userAgent)
        );
        if (deviceIndex > -1) {
          user.security.trustedDevices[deviceIndex].lastActive = new Date();
          await user.save();
        }
      }
    }
  } catch (error) {
    logger.error('Error in device tracking:', error);
    // Don't throw - this is a non-critical feature
  }
};

/**
 * Create a new session for a user
 * 
 * @param userId - User ID
 * @param refreshToken - Hashed refresh token
 * @param req - Express request object
 * @param expiresAt - Session expiration date
 * @returns Created session
 */
export const createSession = async (
  userId: string | mongoose.Types.ObjectId,
  refreshToken: string,
  req: Request,
  expiresAt: Date
): Promise<ISession> => {
  try {
    validateUserId(userId);

    if (!refreshToken) {
      throw new AuthenticationError(
        'Refresh token is required',
        ErrorCode.VAL_INVALID_INPUT
      );
    }

    if (!expiresAt || expiresAt <= new Date()) {
      throw new AuthenticationError(
        'Invalid expiration date',
        ErrorCode.VAL_INVALID_INPUT
      );
    }

    // Parse device information
    const { deviceType, deviceInfo } = parseDeviceInfo(
      req.headers['user-agent'] as string || 'unknown'
    );

    // Create a new session
    const session = new Session({
      userId: userId.toString(),
      refreshToken,
      userAgent: req.headers['user-agent'] || 'unknown',
      ip: req.ip || 'unknown',
      deviceInfo,
      expiresAt,
    });

    await session.save();

    // ✅ FEATURE 8 & 9: Device Tracking & Security Notifications
    // Run in background, don't block session creation
    handleDeviceTracking(userId, session).catch(err => {
      logger.error('Device tracking failed:', err);
    });

    // ✅ FEATURE 11: Enforce session limit after creating session
    logger.info(`Enforcing session limit for user ${userId}, new session ${session._id}, deviceType=${deviceType}`);
    enforceSessionLimit(
      userId.toString(),
      (session._id as mongoose.Types.ObjectId).toString(),
      deviceType
    ).then((deletedCount) => {
      if (deletedCount > 0) {
        logger.warn(`⚠️ Session limit: Deleted ${deletedCount} old sessions for user ${userId}`);
      }
    }).catch(err => {
      logger.error('Session limit enforcement failed:', err);
    });

    return session;
  } catch (error) {
    logger.error('Error creating session:', error);
    throw error;
  }
};

// ============================================================================
// TOKEN ROTATION & REUSE DETECTION
// ============================================================================

/**
 * Rotate refresh token and track previous token in rotation chain
 * 
 * ✅ FEATURE 15: Token Rotation Reuse Detection
 */
export const rotateRefreshToken = async (
  session: ISession,
  newRefreshToken: string
): Promise<void> => {
  try {
    if (!newRefreshToken) {
      throw new AuthenticationError(
        'New refresh token is required',
        ErrorCode.VAL_INVALID_INPUT
      );
    }

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
 * 
 * ✅ IMPROVED: Optimized token comparison - uses indexed query first
 * 
 * @param refreshToken - Raw refresh token to validate
 * @param req - Express request for logging
 * @returns Session if valid, null if invalid or reused
 */
export const validateSessionWithReuseDetection = async (
  refreshToken: string,
  req: Request
): Promise<ISession | null> => {
  try {
    if (!refreshToken) {
      return null;
    }

    // ✅ OPTIMIZATION: Find active sessions with indexed query
    const activeSessions = await Session.find({
      expiresAt: { $gt: new Date() },
      isRevoked: false,
    }).limit(100); // Reasonable limit to prevent memory issues

    // Check each session's hashed token
    let activeSession: ISession | null = null;
    for (const session of activeSessions) {
      const isMatch = await session.compareRefreshToken(refreshToken);
      if (isMatch) {
        activeSession = session;
        break;
      }
    }

    if (activeSession) {
      // Valid session - update activity
      activeSession.lastActive = new Date();
      await activeSession.save();
      return activeSession;
    }

    // ✅ FEATURE 15: Token not found in active sessions - check for reuse
    const reusedSession = await detectTokenReuse(refreshToken, req);
    if (reusedSession) {
      // Token reuse detected - session already revoked and logged
      return null;
    }

    return null; // Invalid token
  } catch (error) {
    logger.error('Session validation with reuse detection error:', error);
    throw error;
  }
};

/**
 * Detect if a token was previously used (token replay attack)
 */
const detectTokenReuse = async (
  refreshToken: string,
  req: Request
): Promise<ISession | null> => {
  try {
    // Check against previousToken field in all sessions
    const allSessions = await Session.find({
      previousToken: { $exists: true, $ne: null }
    }).limit(200);

    for (const session of allSessions) {
      if (session.previousToken) {
        const isPreviousMatch = await bcrypt.compare(refreshToken, session.previousToken);
        if (isPreviousMatch) {
          // ✅ SECURITY BREACH: Token reuse detected!
          logger.error('SECURITY BREACH: Refresh token reuse detected', {
            userId: session.userId,
            sessionId: (session._id as mongoose.Types.ObjectId).toString(),
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            rotationCount: session.rotationCount,
          });

          // Mark session as suspicious
          session.suspiciousActivity = {
            reuseDetected: true,
            reuseAttemptedAt: new Date(),
            reuseIp: req.ip || 'unknown',
          };

          // Revoke only the compromised session
          session.isRevoked = true;
          await session.save();

          // Log security breach to audit log
          await AuditLog.create({
            userId: session.userId.toString(),
            companyId: '',
            action: 'security_breach',
            resourceType: 'session',
            resourceId: (session._id as mongoose.Types.ObjectId).toString(),
            metadata: {
              message: 'Refresh token reuse detected - session revoked',
              ip: req.ip || 'unknown',
              reason: 'token_replay_attack',
              revokedCount: 1,
              userAgent: req.headers['user-agent'] || 'unknown',
            },
            ip: req.ip || 'unknown',
            userAgent: req.headers['user-agent'] || 'unknown',
          });

          logger.warn(`Revoked compromised session ${session._id} for user ${session.userId}`);

          return session;
        }
      }
    }

    return null;
  } catch (error) {
    logger.error('Error detecting token reuse:', error);
    return null;
  }
};

// ============================================================================
// SESSION MANAGEMENT
// ============================================================================

/**
 * Get all active sessions for a user
 */
export const getUserSessions = async (
  userId: string | mongoose.Types.ObjectId
): Promise<ISession[]> => {
  try {
    validateUserId(userId);

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
export const revokeSession = async (
  sessionId: string,
  userId: string
): Promise<boolean> => {
  try {
    validateUserId(userId);
    validateSessionId(sessionId);

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
    validateUserId(userId);

    const query: any = {
      userId: userId.toString(),
      isRevoked: false,
    };

    // Exclude current session if provided
    if (currentSessionId) {
      validateSessionId(currentSessionId);
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
    if (!refreshToken) {
      return;
    }

    await Session.updateOne(
      { refreshToken, isRevoked: false },
      { lastActive: new Date() }
    );
  } catch (error) {
    logger.error('Error updating session activity:', error);
    // Don't throw - this is a non-critical update
  }
};

/**
 * Validate a session by refresh token (simple validation without reuse detection)
 */
export const validateSession = async (refreshToken: string): Promise<ISession | null> => {
  try {
    if (!refreshToken) {
      return null;
    }

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

// ============================================================================
// EXPORTS
// ============================================================================

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
