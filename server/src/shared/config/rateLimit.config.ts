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
    return rateLimit({
        windowMs,
        max,
        message,
        standardHeaders: true,
        legacyHeaders: false,
        ...extra,
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
 */
export const globalRateLimiter = createLimiterConfig(
    15 * 60 * 1000,
    100,
    SYSTEM_MESSAGES.RATE_LIMIT_EXCEEDED(),
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
 */
export const apiRateLimiter = createLimiterConfig(
    60 * 1000,
    60,
    SYSTEM_MESSAGES.RATE_LIMIT_EXCEEDED(60),
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
        }
    }
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
