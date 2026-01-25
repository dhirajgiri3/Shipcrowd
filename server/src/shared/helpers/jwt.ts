import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import crypto from 'crypto';
import Redis from 'ioredis';
import logger from '../logger/winston.logger';

// Define token types
export interface AccessTokenPayload {
  userId: string;
  role: string;
  companyId?: string;
  jti?: string; // JWT ID for revocation
  iat?: number; // Issued at timestamp
}

export interface RefreshTokenPayload {
  userId: string;
  tokenVersion: number;
  jti?: string; // JWT ID for revocation
  iat?: number; // Issued at timestamp
}

// Get JWT secrets from environment variables
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'access_token_secret';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'refresh_token_secret';

// Token expiration times
const ACCESS_TOKEN_EXPIRY = '15m'; // 15 minutes
const REFRESH_TOKEN_EXPIRY = '7d'; // 7 days

// Redis client for token blacklist (persistent storage)
let redisClient: Redis | null = null;
let redisAvailable = false;

// Initialize Redis connection for token blacklist
const initRedisBlacklist = async (): Promise<void> => {
  try {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 3) return null; // Stop retrying
        return Math.min(times * 100, 3000);
      },
      lazyConnect: true,
    });

    await redisClient.connect();
    redisAvailable = true;
    logger.info('Token blacklist Redis connected - tokens will persist across restarts');
  } catch (error) {
    logger.warn('Redis unavailable for token blacklist - falling back to in-memory (tokens lost on restart)', error);
    redisClient = null;
    redisAvailable = false;
  }
};

// Initialize Redis on module load
initRedisBlacklist().catch(() => { });

// Fallback in-memory blacklist (only used if Redis unavailable)
interface BlacklistedToken {
  jti: string;
  expiresAt: number;
}
const fallbackBlacklist: BlacklistedToken[] = [];

/**
 * Generate a unique JWT ID
 */
const generateJwtId = (): string => {
  return crypto.randomBytes(16).toString('hex');
};

/**
 * Add a token to the blacklist (Redis or in-memory fallback)
 * @param jti JWT ID
 * @param expiry Expiration time in seconds
 */
export const blacklistToken = async (jti: string, expiry: number): Promise<boolean> => {
  try {
    if (redisAvailable && redisClient) {
      // Use Redis with automatic expiration
      await redisClient.setex(`token:blacklist:${jti}`, expiry, '1');
      logger.debug(`Token ${jti} blacklisted in Redis for ${expiry}s`);
    } else {
      // Fallback to in-memory
      const expiresAt = Math.floor(Date.now() / 1000) + expiry;
      fallbackBlacklist.push({ jti, expiresAt });
      // Cleanup expired tokens
      const now = Math.floor(Date.now() / 1000);
      for (let i = fallbackBlacklist.length - 1; i >= 0; i--) {
        if (fallbackBlacklist[i].expiresAt < now) {
          fallbackBlacklist.splice(i, 1);
        }
      }
      logger.debug(`Token ${jti} blacklisted in memory (Redis unavailable)`);
    }
    return true;
  } catch (error) {
    logger.error('Error blacklisting token:', error);
    return false;
  }
};

/**
 * Check if a token is blacklisted
 * @param jti JWT ID
 */
export const isTokenBlacklisted = async (jti: string): Promise<boolean> => {
  try {
    if (redisAvailable && redisClient) {
      const exists = await redisClient.exists(`token:blacklist:${jti}`);
      return exists === 1;
    } else {
      // Fallback check
      const now = Math.floor(Date.now() / 1000);
      return fallbackBlacklist.some(token => token.jti === jti && token.expiresAt > now);
    }
  } catch (error) {
    logger.error('Error checking token blacklist:', error);
    return false;
  }
};

/**
 * Generate an access token for a user
 */
export const generateAccessToken = (
  userId: string | Types.ObjectId,
  role: string,
  companyId?: string | Types.ObjectId
): string => {
  const jti = generateJwtId();

  const payload: AccessTokenPayload = {
    userId: userId.toString(),
    role,
    companyId: companyId ? companyId.toString() : undefined,
    jti,
  };

  return jwt.sign(payload, ACCESS_TOKEN_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
    audience: 'Shipcrowd-api',
    issuer: 'Shipcrowd-auth',
  } as jwt.SignOptions);
};

/**
 * Generate a refresh token for a user
 * @param userId User ID
 * @param tokenVersion Token version for security
 * @param expiry Optional custom expiry time (e.g., '30d' for remember me)
 */
export const generateRefreshToken = (
  userId: string | Types.ObjectId,
  tokenVersion: number,
  expiry?: string
): string => {
  const jti = generateJwtId();

  const payload: RefreshTokenPayload = {
    userId: userId.toString(),
    tokenVersion,
    jti,
  };

  return jwt.sign(payload, REFRESH_TOKEN_SECRET, {
    expiresIn: expiry || REFRESH_TOKEN_EXPIRY,
    audience: 'Shipcrowd-api',
    issuer: 'Shipcrowd-auth',
  } as jwt.SignOptions);
};

/**
 * Verify an access token
 * @param token Access token to verify
 * @param checkBlacklist Whether to check if the token is blacklisted
 */
export const verifyAccessToken = async (
  token: string,
  checkBlacklist: boolean = true
): Promise<AccessTokenPayload> => {
  const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET, {
    audience: 'Shipcrowd-api',
    issuer: 'Shipcrowd-auth',
  }) as AccessTokenPayload;

  // Check if token is blacklisted
  if (checkBlacklist && decoded.jti) {
    const isBlacklisted = await isTokenBlacklisted(decoded.jti);
    if (isBlacklisted) {
      throw new Error('Token has been revoked');
    }
  }

  return decoded;
};

/**
 * Verify a refresh token
 * @param token Refresh token to verify
 * @param checkBlacklist Whether to check if the token is blacklisted
 */
export const verifyRefreshToken = async (
  token: string,
  checkBlacklist: boolean = true
): Promise<RefreshTokenPayload> => {
  const decoded = jwt.verify(token, REFRESH_TOKEN_SECRET, {
    audience: 'Shipcrowd-api',
    issuer: 'Shipcrowd-auth',
  }) as RefreshTokenPayload;

  // Check if token is blacklisted
  if (checkBlacklist && decoded.jti) {
    const isBlacklisted = await isTokenBlacklisted(decoded.jti);
    if (isBlacklisted) {
      throw new Error('Token has been revoked');
    }
  }

  return decoded;
};

/**
 * Revoke an access token
 * @param token Access token to revoke
 */
export const revokeAccessToken = async (token: string): Promise<boolean> => {
  try {
    const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET) as AccessTokenPayload;

    if (!decoded.jti) {
      logger.warn('Cannot revoke token without jti');
      return false;
    }

    // Calculate token expiry in seconds
    const expirySeconds = decoded.iat
      ? Math.max(0, (decoded.iat + (15 * 60)) - Math.floor(Date.now() / 1000))
      : 15 * 60; // Default to 15 minutes if iat is not available

    return await blacklistToken(decoded.jti, expirySeconds);
  } catch (error) {
    logger.error('Error revoking access token:', error);
    return false;
  }
};

/**
 * Revoke a refresh token
 * @param token Refresh token to revoke
 */
export const revokeRefreshToken = async (token: string): Promise<boolean> => {
  try {
    const decoded = jwt.verify(token, REFRESH_TOKEN_SECRET) as RefreshTokenPayload;

    if (!decoded.jti) {
      logger.warn('Cannot revoke token without jti');
      return false;
    }

    // Calculate token expiry in seconds
    const expirySeconds = decoded.iat
      ? Math.max(0, (decoded.iat + (7 * 24 * 60 * 60)) - Math.floor(Date.now() / 1000))
      : 7 * 24 * 60 * 60; // Default to 7 days if iat is not available

    return await blacklistToken(decoded.jti, expirySeconds);
  } catch (error) {
    logger.error('Error revoking refresh token:', error);
    return false;
  }
};

export default {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  revokeAccessToken,
  revokeRefreshToken,
  blacklistToken,
  isTokenBlacklisted,
};
