import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { RedisManager } from '../../infrastructure/redis/redis.manager';
import { SYSTEM_MESSAGES } from '../constants/messages';
import { Redis, Cluster } from 'ioredis';

/**
 * Rate Limiting Configuration
 *
 * Prevents brute force attacks and API abuse
 * Uses Redis for distributed rate limiting across multiple servers
 */

// Cached Redis client for rate limiting (initialized once)
let rateLimitRedisClient: Redis | Cluster | null = null;

/**
 * Initialize Redis client for rate limiting
 * Call this BEFORE starting the server
 */
export const initializeRateLimitRedis = async () => {
    try {
        rateLimitRedisClient = await RedisManager.getMainClient();
        console.log('✅ Rate limiting using shared RedisManager');
    } catch (error) {
        console.warn('⚠️  Redis connection failed, rate limiting will use memory store');
        rateLimitRedisClient = null;
    }
};

/**
 * Create rate limiter config with pre-initialized client
 */
const createLimiterConfig = (
    windowMs: number,
    max: number,
    message: any,
    prefix: string,
    extra: any = {}
) => {
    const extraSkip = typeof extra?.skip === 'function' ? extra.skip : undefined;
    return rateLimit({
        windowMs,
        max,
        message,
        standardHeaders: true,
        legacyHeaders: false,
        ...extra,
        skip: (req: any, res: any) => {
            // In tests, rate limiting is opt-in to avoid cross-suite interference.
            if (process.env.NODE_ENV === 'test' && req.headers['x-test-rate-limit'] !== 'enforce') {
                return true;
            }
            return extraSkip ? extraSkip(req, res) : false;
        },
        store: rateLimitRedisClient ? new RedisStore({
            // @ts-ignore - Compatibility shim for ioredis + rate-limit-redis
            sendCommand: (...args: string[]) => {
                // No await needed - client is already connected
                return rateLimitRedisClient!.call(args[0], ...args.slice(1)) as any;
            },
            prefix: prefix,
        }) : undefined, // Falls back to memory store if Redis unavailable
    });
};

/**
 * Global rate limiter
 * Tuned for 20k shipments/month business scale (Supports shared office IPs/NAT)
 */
export const globalRateLimiter = createLimiterConfig(
    5 * 60 * 1000, // 5 minutes
    1000, // 1000 requests per 5 minutes
    SYSTEM_MESSAGES.RATE_LIMIT_EXCEEDED(1000),
    'rl:global:',
    {
        handler: (req: any, res: any) => {
            res.status(429).json({
                success: false,
                error: {
                    code: 'RATE_LIMIT_EXCEEDED',
                    message: SYSTEM_MESSAGES.RATE_LIMIT_EXCEEDED(),
                },
                timestamp: new Date().toISOString(),
            });
        }
    }
);

/**
 * Strict rate limiter for authentication endpoints
 */
export const authRateLimiter = createLimiterConfig(
    15 * 60 * 1000,
    5,
    SYSTEM_MESSAGES.RATE_LIMIT_AUTH,
    'rl:auth:',
    {
        skipSuccessfulRequests: true,
        handler: (req: any, res: any) => {
            res.status(429).json({
                success: false,
                error: {
                    code: 'RATE_LIMIT_AUTH',
                    message: SYSTEM_MESSAGES.RATE_LIMIT_AUTH,
                },
                timestamp: new Date().toISOString(),
            });
        }
    }
);

/**
 * API rate limiter for authenticated users
 * Tuned for: 20k shipments/month = ~660/day. 
 * Heavy warehouse scanning users need burst capacity (120 req/min).
 */
export const apiRateLimiter = createLimiterConfig(
    60 * 1000,
    120,
    SYSTEM_MESSAGES.RATE_LIMIT_EXCEEDED(120),
    'rl:api:',
    {
        keyGenerator: (req: any) => {
            return req.user?._id?.toString() || req.ip || 'unknown';
        },
        handler: (req: any, res: any) => {
            const retryAfter = 60;
            res.set('Retry-After', String(retryAfter));
            res.status(429).json({
                success: false,
                error: {
                    code: 'RATE_LIMIT_EXCEEDED',
                    message: SYSTEM_MESSAGES.RATE_LIMIT_EXCEEDED(retryAfter),
                },
                retryAfter,
                timestamp: new Date().toISOString(),
            });
        }
    }
);

/**
 * Lenient rate limiter for webhooks
 */
export const webhookRateLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 1000,
    skip: (req) => {
        const trustedIPs = process.env.TRUSTED_WEBHOOK_IPS?.split(',') || [];
        return trustedIPs.includes(req.ip || '');
    },
});

/**
 * File upload rate limiter
 */
export const uploadRateLimiter = createLimiterConfig(
    60 * 60 * 1000,
    10,
    'Too many file uploads. Please try again later.',
    'rl:upload:',
    {
        keyGenerator: (req: any) => {
            return req.user?._id?.toString() || req.ip || 'unknown';
        },
    }
);

/**
 * Rate limiter for public tracking page
 * Protects against enumeration and scraping
 */
export const publicTrackingRateLimiter = createLimiterConfig(
    60 * 1000, // 1 minute
    60, // 60 requests per minute
    SYSTEM_MESSAGES.RATE_LIMIT_EXCEEDED(60),
    'rl:tracking:',
    {
        keyGenerator: (req: any) => {
            return req.ip || 'unknown'; // Public endpoint, key by IP
        },
        handler: (req: any, res: any) => {
            res.status(429).json({
                success: false,
                error: {
                    code: 'RATE_LIMIT_EXCEEDED',
                    message: SYSTEM_MESSAGES.RATE_LIMIT_EXCEEDED(60),
                },
                timestamp: new Date().toISOString(),
            });
        }
    }
);

/**
 * Rate limiter for KYC verification endpoints
 * 30 requests per hour (covers multiple document types and retries)
 */
export const kycRateLimiter = createLimiterConfig(
    60 * 60 * 1000,
    30,
    'Too many KYC verification attempts. Please try again in an hour.',
    'rl:kyc:'
);

/**
 * Rate limiter for login attempts
 * Strict: 5 requests per 15 minutes
 */
export const loginRateLimiter = createLimiterConfig(
    15 * 60 * 1000,
    5,
    'Too many login attempts, please try again later',
    'rl:login:'
);

/**
 * Rate limiter for password reset requests
 * Very Strict: 3 requests per hour
 */
export const passwordResetRateLimiter = createLimiterConfig(
    60 * 60 * 1000,
    3,
    'Too many password reset requests, please try again later',
    'rl:pwd_reset:'
);

/**
 * Rate limiter for registration
 * Moderate: 5 requests per hour (prevent spam accounts)
 */
export const registrationRateLimiter = createLimiterConfig(
    60 * 60 * 1000,
    5,
    'Too many registration attempts, please try again later',
    'rl:register:'
);

/**
 * Rate limiter for email verification (clicking link)
 * Moderate: 10 requests per hour
 */
export const emailVerificationRateLimiter = createLimiterConfig(
    60 * 60 * 1000,
    5,
    'Too many verification attempts, please try again later',
    'rl:email_verify:'
);

/**
 * Rate limiter for resending verification email
 * Strict: 3 requests per hour
 */
export const resendVerificationRateLimiter = createLimiterConfig(
    60 * 60 * 1000,
    3,
    'Too many verification emails requested, please try again later',
    'rl:resend_verify:'
);

/**
 * Rate limiter for magic link requests
 * Strict: 5 requests per hour
 */
export const magicLinkRateLimiter = createLimiterConfig(
    60 * 60 * 1000,
    5,
    'Too many magic link requests, please try again later',
    'rl:magic_link:'
);

/**
 * Rate limiter for setting password
 * Strict: 5 requests per hour
 */
export const setPasswordRateLimiter = createLimiterConfig(
    60 * 60 * 1000,
    5,
    'Too many password set attempts, please try again later',
    'rl:set_pwd:'
);

/**
 * Rate limiter for change password (authenticated)
 * Strict: 5 requests per 15 minutes
 */
export const changePasswordRateLimiter = createLimiterConfig(
    15 * 60 * 1000,
    5,
    'Too many password change attempts, please try again later',
    'rl:change_pwd:'
);

/**
 * Rate limiter for change email requests (authenticated)
 * Strict: 3 requests per hour
 */
export const changeEmailRateLimiter = createLimiterConfig(
    60 * 60 * 1000,
    3,
    'Too many email change attempts, please try again later',
    'rl:change_email:'
);

/**
 * Public Rate Limiter (General non-auth endpoints)
 * Permissive: 200 requests per 15 minutes
 */
export const publicRateLimiter = createLimiterConfig(
    15 * 60 * 1000,
    200,
    SYSTEM_MESSAGES.RATE_LIMIT_EXCEEDED(200),
    'rl:public:'
);

/**
 * Create custom rate limiter helper
 */
export const createRateLimiter = (
    windowMs: number,
    max: number,
    message?: string
) => {
    return createLimiterConfig(
        windowMs,
        max,
        message || SYSTEM_MESSAGES.RATE_LIMIT_EXCEEDED(),
        'rl:custom:'
    );
};
