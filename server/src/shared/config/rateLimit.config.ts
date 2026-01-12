import rateLimit from 'express-rate-limit';
// @ts-ignore - Optional dependency for Redis store
import RedisStore from 'rate-limit-redis';
import { createClient } from 'redis';
import { SYSTEM_MESSAGES } from '../constants/messages';

/**
 * Rate Limiting Configuration
 * 
 * Prevents brute force attacks and API abuse
 * Uses Redis for distributed rate limiting across multiple servers
 */

// Redis client for rate limiting
let redisClient: ReturnType<typeof createClient> | undefined;

/**
 * Initialize Redis client for rate limiting
 */
export const initializeRateLimitRedis = async () => {
    if (process.env.REDIS_URL) {
        try {
            redisClient = createClient({
                url: process.env.REDIS_URL,
            });

            await redisClient.connect();
            console.log('✅ Redis connected for rate limiting');
        } catch (error) {
            console.warn('⚠️  Redis connection failed, using memory store for rate limiting');
            redisClient = undefined;
        }
    } else {
        console.log('ℹ️  No REDIS_URL configured, using memory store for rate limiting');
    }
};

/**
 * Global rate limiter
 * Applied to all routes
 * 100 requests per 15 minutes per IP
 */
export const globalRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: SYSTEM_MESSAGES.RATE_LIMIT_EXCEEDED(),
    standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false, // Disable `X-RateLimit-*` headers
    store: redisClient
        ? new RedisStore({
            client: redisClient,
            prefix: 'rl:global:',
        })
        : undefined, // Use memory store if Redis not available
    handler: (req, res) => {
        res.status(429).json({
            success: false,
            error: {
                code: 'RATE_LIMIT_EXCEEDED',
                message: SYSTEM_MESSAGES.RATE_LIMIT_EXCEEDED(),
            },
            timestamp: new Date().toISOString(),
        });
    },
});

/**
 * Strict rate limiter for authentication endpoints
 * Prevents brute force attacks
 * 5 requests per 15 minutes per IP
 */
export const authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 login attempts per windowMs
    message: SYSTEM_MESSAGES.RATE_LIMIT_AUTH,
    skipSuccessfulRequests: true, // Don't count successful requests
    store: redisClient
        ? new RedisStore({
            client: redisClient,
            prefix: 'rl:auth:',
        })
        : undefined,
    handler: (req, res) => {
        res.status(429).json({
            success: false,
            error: {
                code: 'RATE_LIMIT_AUTH',
                message: SYSTEM_MESSAGES.RATE_LIMIT_AUTH,
            },
            timestamp: new Date().toISOString(),
        });
    },
});

/**
 * API rate limiter for authenticated users
 * 60 requests per minute per user
 */
export const apiRateLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 60, // 60 requests per minute
    message: SYSTEM_MESSAGES.RATE_LIMIT_EXCEEDED(60),
    keyGenerator: (req) => {
        // Use user ID if authenticated, otherwise IP
        return (req as any).user?._id?.toString() || req.ip || 'unknown';
    },
    store: redisClient
        ? new RedisStore({
            client: redisClient,
            prefix: 'rl:api:',
        })
        : undefined,
    handler: (req, res) => {
        const retryAfter = 60; // seconds
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
    },
});

/**
 * Lenient rate limiter for webhooks
 * No rate limiting for trusted webhook sources
 */
export const webhookRateLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 1000, // Very high limit for webhooks
    skip: (req) => {
        // Skip rate limiting for trusted IPs (configure in env)
        const trustedIPs = process.env.TRUSTED_WEBHOOK_IPS?.split(',') || [];
        return trustedIPs.includes(req.ip || '');
    },
});

/**
 * File upload rate limiter
 * Prevents abuse of upload endpoints
 * 10 uploads per hour
 */
export const uploadRateLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10,
    message: 'Too many file uploads. Please try again later.',
    keyGenerator: (req) => {
        return (req as any).user?._id?.toString() || req.ip || 'unknown';
    },
    store: redisClient
        ? new RedisStore({
            client: redisClient,
            prefix: 'rl:upload:',
        })
        : undefined,
});

/**
 * Create custom rate limiter
 * 
 * @param windowMs - Time window in milliseconds
 * @param max - Maximum number of requests
 * @param message - Custom error message
 * @returns Rate limiter middleware
 */
export const createRateLimiter = (
    windowMs: number,
    max: number,
    message?: string
) => {
    return rateLimit({
        windowMs,
        max,
        message: message || SYSTEM_MESSAGES.RATE_LIMIT_EXCEEDED(),
        store: redisClient
            ? new RedisStore({
                client: redisClient,
                prefix: 'rl:custom:',
            })
            : undefined,
    });
};
