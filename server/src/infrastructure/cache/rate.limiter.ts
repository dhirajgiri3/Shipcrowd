/**
 * Redis-Based Rate Limiter with In-Memory Fallback
 *
 * Issue #A: Production-ready distributed rate limiting
 * - Atomic INCR operations prevent race conditions
 * - TTL-based window management
 * - Graceful fallback to in-memory when Redis unavailable
 */

import Redis from 'ioredis';
import logger from '../../shared/logger/winston.logger';

export interface RateLimitResult {
    allowed: boolean;
    retryAfter?: number;
    remaining?: number;
}

export class RedisRateLimiter {
    private redis: Redis | null = null;
    private isRedisAvailable: boolean = false;

    // Fallback: In-memory rate limiter (for development/Redis failure)
    private inMemoryLimiter: Map<string, { count: number; resetAt: number }> = new Map();
    private cleanupInterval?: NodeJS.Timeout;

    constructor(redisUrl?: string) {
        try {
            const url = redisUrl || process.env.REDIS_URL;

            if (url) {
                this.redis = new Redis(url, {
                    maxRetriesPerRequest: 3,
                    retryStrategy: (times) => {
                        if (times > 3) {
                            logger.warn('Redis connection failed, falling back to in-memory rate limiter');
                            this.isRedisAvailable = false;
                            return null; // Stop retrying
                        }
                        return Math.min(times * 100, 3000);
                    },
                });

                this.redis.on('connect', () => {
                    logger.info('Redis rate limiter connected');
                    this.isRedisAvailable = true;
                });

                this.redis.on('error', (err) => {
                    logger.error('Redis rate limiter error', { error: err.message });
                    this.isRedisAvailable = false;
                });
            } else {
                logger.warn('No Redis URL provided, using in-memory rate limiter (NOT for production)');
            }

            // Cleanup old in-memory entries every minute
            this.cleanupInterval = setInterval(() => this.cleanupInMemory(), 60000);
        } catch (error: any) {
            logger.error('Failed to initialize Redis rate limiter', { error: error.message });
            this.isRedisAvailable = false;
        }
    }

    /**
     * Check rate limit using Redis or in-memory fallback
     *
     * @param key - Unique identifier for rate limit (e.g., "rto:companyId")
     * @param limit - Maximum requests allowed in window
     * @param windowSeconds - Time window in seconds
     */
    async checkLimit(
        key: string,
        limit: number,
        windowSeconds: number
    ): Promise<RateLimitResult> {
        // Try Redis first if available
        if (this.redis && this.isRedisAvailable) {
            try {
                return await this.checkLimitRedis(key, limit, windowSeconds);
            } catch (error: any) {
                logger.error('Redis rate limit check failed, falling back to in-memory', {
                    key,
                    error: error.message,
                });
                this.isRedisAvailable = false;
            }
        }

        // Fallback to in-memory
        return this.checkLimitInMemory(key, limit, windowSeconds);
    }

    /**
     * Redis-based rate limit check (production)
     * Uses atomic INCR operation to prevent race conditions
     */
    private async checkLimitRedis(
        key: string,
        limit: number,
        windowSeconds: number
    ): Promise<RateLimitResult> {
        const fullKey = `rate_limit:${key}`;

        // Atomic increment with INCR
        const current = await this.redis!.incr(fullKey);

        if (current === 1) {
            // First request in window - set expiry
            await this.redis!.expire(fullKey, windowSeconds);
        }

        if (current > limit) {
            const ttl = await this.redis!.ttl(fullKey);
            return {
                allowed: false,
                retryAfter: ttl > 0 ? ttl : windowSeconds,
                remaining: 0,
            };
        }

        return {
            allowed: true,
            remaining: Math.max(0, limit - current),
        };
    }

    /**
     * In-memory rate limit check (fallback/development)
     * Note: Not atomic, but acceptable for fallback scenario
     */
    private checkLimitInMemory(
        key: string,
        limit: number,
        windowSeconds: number
    ): RateLimitResult {
        const now = Date.now();
        const limiterEntry = this.inMemoryLimiter.get(key);

        // Check if window expired
        if (!limiterEntry || now >= limiterEntry.resetAt) {
            this.inMemoryLimiter.set(key, {
                count: 1,
                resetAt: now + windowSeconds * 1000,
            });
            return { allowed: true, remaining: limit - 1 };
        }

        // Check if limit exceeded
        if (limiterEntry.count >= limit) {
            const retryAfter = Math.ceil((limiterEntry.resetAt - now) / 1000);
            return { allowed: false, retryAfter, remaining: 0 };
        }

        // Increment count
        limiterEntry.count++;
        return { allowed: true, remaining: limit - limiterEntry.count };
    }

    /**
     * Clean up expired in-memory entries
     */
    private cleanupInMemory(): void {
        const now = Date.now();
        let cleanedCount = 0;

        const entries = Array.from(this.inMemoryLimiter.entries());
        for (const [key, entry] of entries) {
            if (now >= entry.resetAt) {
                this.inMemoryLimiter.delete(key);
                cleanedCount++;
            }
        }

        if (cleanedCount > 0) {
            logger.debug('Cleaned up expired rate limit entries', { count: cleanedCount });
        }
    }

    /**
     * Reset rate limit for a specific key (useful for testing)
     */
    async reset(key: string): Promise<void> {
        const fullKey = `rate_limit:${key}`;

        if (this.redis && this.isRedisAvailable) {
            await this.redis.del(fullKey);
        }

        this.inMemoryLimiter.delete(key);
    }

    /**
     * Cleanup on shutdown
     */
    async disconnect(): Promise<void> {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }

        if (this.redis) {
            await this.redis.quit();
        }

        this.inMemoryLimiter.clear();
    }
}

// Singleton instance
let rateLimiterInstance: RedisRateLimiter | null = null;

/**
 * Get rate limiter singleton instance
 */
export function getRateLimiter(): RedisRateLimiter {
    if (!rateLimiterInstance) {
        rateLimiterInstance = new RedisRateLimiter();
    }
    return rateLimiterInstance;
}
