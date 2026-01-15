import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { RedisConnection } from '../../../../infrastructure/utilities/redis.connection';
import logger from '../../../../shared/logger/winston.logger';

const CSRF_TOKEN_EXPIRY = 900; // 15 minutes
const CSRF_TOKEN_LENGTH = 64; // 64 hex characters = 256 bits

/**
 * Generate and store CSRF token in Redis
 * Token is one-time use for sensitive operations
 */
export const generateCSRFToken = async (sessionId: string): Promise<string> => {
    if (!sessionId) {
        throw new Error('Session ID required for CSRF token generation');
    }

    try {
        const token = crypto.randomBytes(32).toString('hex');
        const key = `csrf:${sessionId}:${token}`;

        // Store token in Redis with expiry
        const redisClient = await RedisConnection.getConnection();
        await redisClient.setEx(key, CSRF_TOKEN_EXPIRY, '1');

        logger.debug('CSRF token generated', {
            sessionId,
            tokenLength: token.length,
        });

        return token;
    } catch (error) {
        logger.error('Failed to generate CSRF token', { error, sessionId });
        throw error;
    }
};

/**
 * Validate CSRF token against Redis store
 * Token is consumed after validation (one-time use)
 */
export const validateCSRFToken = async (
    sessionId: string,
    token: string
): Promise<boolean> => {
    if (!sessionId || !token) {
        logger.warn('CSRF validation: Missing sessionId or token', {
            hasSessionId: !!sessionId,
            hasToken: !!token,
        });
        return false;
    }

    // Validate token format (64 hex characters)
    if (!/^[a-f0-9]{64}$/.test(token)) {
        logger.warn('CSRF validation: Invalid token format', {
            sessionId,
            tokenLength: token.length,
        });
        return false;
    }

    try {
        const key = `csrf:${sessionId}:${token}`;
        const redisClient = await RedisConnection.getConnection();
        const exists = await redisClient.exists(key);

        if (exists !== 1) {
            logger.warn('CSRF validation: Token not found or expired', {
                sessionId,
            });
            return false;
        }

        // Consume token (one-time use) - Delete after validation
        await redisClient.del(key);

        logger.debug('CSRF token validated and consumed', { sessionId });
        return true;
    } catch (error) {
        logger.error('CSRF validation failed', { error, sessionId });
        return false;
    }
};

/**
 * Check if origin/referer is allowed
 */
const isValidOrigin = (origin: string, referer: string): boolean => {
    // ✅ DEVELOPMENT: Allow requests without origin/referer for API testing (Postman, etc.)
    // This is safe because CSRF token validation still applies
    if (process.env.NODE_ENV === 'development') {
        // If both origin and referer are missing/empty, allow it (Postman scenario)
        if (!origin && !referer) {
            return true;
        }
    }

    const allowedOrigins = [
        process.env.CLIENT_URL || 'http://localhost:3000',
        process.env.CLIENT_URL_STAGING || '',
    ].filter(Boolean);

    // Check origin header
    if (origin && allowedOrigins.includes(origin)) {
        return true;
    }

    // Check referer header
    if (referer) {
        return allowedOrigins.some((allowed) => referer.startsWith(allowed));
    }

    return false;
};

/**
 * CSRF Protection Middleware
 * Validates CSRF tokens for state-changing operations
 */
export const csrfProtection = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    // Skip for test environment
    if (process.env.NODE_ENV === 'test') {
        next();
        return;
    }

    // Skip for safe HTTP methods
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        next();
        return;
    }

    try {
        const csrfToken = req.headers['x-csrf-token'] as string;
        const sessionId = (req as any).session?.id || (req as any).user?._id;

        // 🔍 DEBUG: Let's see what's actually in req.user
        logger.info('CSRF Debug:', {
            hasSession: !!(req as any).session,
            sessionId: (req as any).session?.id,
            hasUser: !!(req as any).user,
            userId: (req as any).user?._id,
            userFull: JSON.stringify((req as any).user),
            finalSessionId: sessionId,
        });

        // Session is required for CSRF validation
        if (!sessionId) {
            logger.warn('CSRF protection: No session found', {
                method: req.method,
                path: req.path,
                ip: req.ip,
            });

            res.status(401).json({
                success: false,
                code: 'SESSION_REQUIRED',
                message: 'Session required for CSRF validation',
                timestamp: new Date(),
            });
            return;
        }

        // Validate CSRF token
        const isValidToken = await validateCSRFToken(sessionId, csrfToken);

        if (!isValidToken) {
            logger.warn('CSRF protection: Invalid or expired token', {
                sessionId,
                hasToken: !!csrfToken,
                method: req.method,
                path: req.path,
                ip: req.ip,
                userAgent: req.headers['user-agent'],
            });

            res.status(403).json({
                success: false,
                code: 'CSRF_TOKEN_INVALID',
                message: 'Invalid or expired CSRF token',
                timestamp: new Date(),
            });
            return;
        }

        // Validate origin (additional security layer)
        const origin = req.headers.origin as string || '';
        const referer = req.headers.referer as string || '';

        if (!isValidOrigin(origin, referer)) {
            logger.warn('CSRF protection: Invalid origin', {
                sessionId,
                origin,
                referer,
                method: req.method,
                path: req.path,
                ip: req.ip,
            });

            res.status(403).json({
                success: false,
                code: 'CSRF_ORIGIN_INVALID',
                message: 'Invalid request origin',
                timestamp: new Date(),
            });
            return;
        }

        logger.debug('CSRF protection: Passed', { sessionId, method: req.method });
        next();
    } catch (error) {
        logger.error('CSRF protection error', { error, method: req.method });
        res.status(500).json({
            success: false,
            code: 'CSRF_VALIDATION_ERROR',
            message: 'CSRF validation error',
            timestamp: new Date(),
        });
    }
};

/**
 * Optional: CSRF protection that logs but doesn't block
 * Useful for gradual rollout or monitoring
 */
export const csrfProtectionMonitor = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    if (process.env.NODE_ENV === 'test' || ['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        next();
        return;
    }

    try {
        const csrfToken = req.headers['x-csrf-token'] as string;
        const sessionId = (req as any).session?.id || (req as any).user?.id;

        if (sessionId && csrfToken) {
            const isValid = await validateCSRFToken(sessionId, csrfToken);

            if (!isValid) {
                logger.warn('CSRF monitor: Invalid token detected (not blocking)', {
                    sessionId,
                    method: req.method,
                    path: req.path,
                });
            }
        }

        next();
    } catch (error) {
        logger.error('CSRF monitor error', { error });
        next();
    }
};
