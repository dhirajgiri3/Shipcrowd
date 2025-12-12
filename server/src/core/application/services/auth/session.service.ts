import { Request } from 'express';
import mongoose from 'mongoose';
import * as UAParser from 'ua-parser-js';
import Session, { ISession } from '../../../../infrastructure/database/mongoose/models/Session';
import { verifyRefreshToken } from '../../../../shared/helpers/jwt';
import logger from '../../../../shared/logger/winston.logger';

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
    return session;
  } catch (error) {
    logger.error('Error creating session:', error);
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
};
