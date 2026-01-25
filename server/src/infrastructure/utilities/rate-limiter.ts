/**
 * Redis-Based Rate Limiter with In-Memory Fallback
 *
 * Issue #A: Production-ready distributed rate limiting
 * - Atomic INCR operations prevent race conditions
 * - TTL-based window management
 * - Graceful fallback to in-memory when Redis unavailable
 */

import { RedisManager } from '../../infrastructure/redis/redis.manager';
import logger from '../../shared/logger/winston.logger';
import { Redis, Cluster } from 'ioredis';

export interface RateLimitResult {
    allowed: boolean;
    retryAfter?: number;
    remaining?: number;
}

export class RedisRateLimiter {
    // Fallback: In-memory rate limiter (for development/Redis failure)
    private inMemoryLimiter: Map<string, { count: number; resetAt: number }> = new Map();
    private cleanupInterval?: NodeJS.Timeout;

    constructor() {
        // Cleanup old in-memory entries every minute
        this.cleanupInterval = setInterval(() => this.cleanupInMemory(), 60000);
    }

    /**
     * Check rate limit using Redis or in-memory fallback
     */
    async checkLimit(
        key: string,
        limit: number,
        windowSeconds: number
    ): Promise<RateLimitResult> {
        try {
            // Try Redis first
            if (await RedisManager.healthCheck()) {
                const redis = await RedisManager.getMainClient();
                try {
                    return await this.checkLimitRedis(redis, key, limit, windowSeconds);
                } catch (error: any) {
                    logger.error('Redis rate limit check failed, falling back to in-memory', {
                        key,
                        error: error.message,
                    });
                }
            }
        } catch (e) {
            // Ignore connection errors and fall back
        }

        // Fallback to in-memory
        return this.checkLimitInMemory(key, limit, windowSeconds);
    }

    /**
     * Redis-based rate limit check (production)
     * Uses atomic INCR operation to prevent race conditions
     */
    private async checkLimitRedis(
        redis: Redis | Cluster,
        key: string,
        limit: number,
        windowSeconds: number
    ): Promise<RateLimitResult> {
        const fullKey = `rate_limit:${key}`;

        // Atomic increment with INCR
        const current = await redis.incr(fullKey);

        if (current === 1) {
            // First request in window - set expiry
            await redis.expire(fullKey, windowSeconds);
        }

        if (current > limit) {
            const ttl = await redis.ttl(fullKey);
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

        if (await RedisManager.healthCheck()) {
            const redis = await RedisManager.getMainClient();
            await redis.del(fullKey);
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
        this.inMemoryLimiter.clear();
        // RedisManager handles persistent connections
    }
}

// Singleton instance
let rateLimiterInstance: RedisRateLimiter | null = null;

export function getRateLimiter(): RedisRateLimiter {
    if (!rateLimiterInstance) {
        rateLimiterInstance = new RedisRateLimiter();
    }
    return rateLimiterInstance;
}
