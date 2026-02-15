/**
 * Centralized Courier Rate Limiter Service
 * 
 * Leverages existing express-rate-limit + Redis infrastructure
 * for consistent, distributed rate limiting across all courier integrations.
 * 
 * Benefits:
 * - Reuses existing Redis-backed rate limiting
 * - Distributed across multiple server instances
 * - Configurable per courier and endpoint
 * - Consistent with rest of application
 * 
 * Usage:
 * 1. Define RateLimiterConfig for each courier
 * 2. Inject via constructor in courier provider
 * 3. Call await rateLimiter.acquire(endpoint) before API calls
 */

import { Cluster, Redis } from 'ioredis';
import { RedisManager } from '../../../../../infrastructure/redis/redis.manager';
import logger from '../../../../../shared/logger/winston.logger';

/**
 * Rate limit rule for a specific API endpoint
 */
export interface RateLimitRule {
    endpoint: string;              // e.g. '/api/v1/packages/json/'
    maxRequests: number;           // Maximum requests allowed
    windowMs: number;              // Time window in milliseconds
}

/**
 * Configuration for courier rate limiting
 */
export interface RateLimiterConfig {
    courier: string;               // Courier identifier (e.g. 'velocity', 'delhivery')
    rules: RateLimitRule[];        // Rate limit rules per endpoint
    enabled: boolean;              // Can disable entirely (for testing or unlimited APIs)
}

/**
 * Simple in-memory rate limiter using sliding window
 * Falls back to this if Redis is unavailable
 */
class InMemoryRateLimiter {
    private requests: Map<string, number[]> = new Map();

    async checkLimit(key: string, maxRequests: number, windowMs: number): Promise<boolean> {
        const now = Date.now();
        const windowStart = now - windowMs;

        // Get recent requests for this key
        const timestamps = this.requests.get(key) || [];
        const recentRequests = timestamps.filter(t => t > windowStart);

        if (recentRequests.length >= maxRequests) {
            // Rate limit exceeded
            return false;
        }

        // Record this request
        recentRequests.push(now);
        this.requests.set(key, recentRequests);

        // Cleanup old entries periodically
        if (Math.random() < 0.01) { // 1% chance
            this.cleanup(windowMs);
        }

        return true;
    }

    private cleanup(windowMs: number): void {
        const now = Date.now();
        const cutoff = now - (windowMs * 2); // Keep 2x window for safety

        this.requests.forEach((timestamps, key) => {
            const recent = timestamps.filter(t => t > cutoff);
            if (recent.length === 0) {
                this.requests.delete(key);
            } else {
                this.requests.set(key, recent);
            }
        });
    }

    reset(): void {
        this.requests.clear();
    }
}

/**
 * Centralized Rate Limiter Service
 * 
 * Uses Redis for distributed rate limiting when available,
 * falls back to in-memory for development/testing.
 */
export class RateLimiterService {
    private config: RateLimiterConfig;
    private redis: Redis | Cluster | null = null;
    private fallback: InMemoryRateLimiter;
    private enabled: boolean;

    constructor(config: RateLimiterConfig) {
        this.config = config;
        this.enabled = config.enabled;
        this.fallback = new InMemoryRateLimiter();

        if (!this.enabled) {
            logger.info(`Rate limiting disabled for ${config.courier}`, {
                reason: 'No rate limits documented or explicitly disabled'
            });
        }
    }

    /**
     * Initialize Redis connection (call once at startup)
     */
    async initialize(): Promise<void> {
        if (!this.enabled) return;

        try {
            this.redis = await RedisManager.getMainClient();
            logger.info(`Rate limiter using Redis for ${this.config.courier}`);
        } catch (error) {
            logger.warn(`Rate limiter falling back to memory for ${this.config.courier}`, {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            this.redis = null;
        }
    }

    /**
     * Acquire rate limit permission before making API call
     * 
     * This will wait if rate limit is exceeded, ensuring we never hit the limit.
     * 
     * @param endpoint - API endpoint being called (must match rule endpoint)
     */
    async acquire(endpoint: string): Promise<void> {
        if (!this.enabled) {
            // No-op if rate limiting is disabled
            return;
        }

        const rule = this.findRule(endpoint);
        if (!rule) {
            // No rate limit configured for this endpoint - allow through
            logger.debug(`No rate limit for ${this.config.courier}:${endpoint}`);
            return;
        }

        const key = this.getRedisKey(endpoint);
        const allowed = await this.checkRateLimit(key, rule.maxRequests, rule.windowMs);

        if (!allowed) {
            // Rate limit exceeded - wait and retry
            const waitTime = this.calculateWaitTime(rule.windowMs);

            logger.warn(`Rate limit exceeded for ${this.config.courier}:${endpoint}`, {
                maxRequests: rule.maxRequests,
                windowMs: rule.windowMs,
                waitTime
            });

            await this.sleep(waitTime);

            // Retry after waiting
            await this.acquire(endpoint);
        }
    }

    /**
     * Check if request is allowed under rate limit
     */
    private async checkRateLimit(
        key: string,
        maxRequests: number,
        windowMs: number
    ): Promise<boolean> {
        if (this.redis) {
            return await this.checkRedisRateLimit(key, maxRequests, windowMs);
        } else {
            return await this.fallback.checkLimit(key, maxRequests, windowMs);
        }
    }

    /**
     * Redis-based rate limiting using sliding window
     */
    private async checkRedisRateLimit(
        key: string,
        maxRequests: number,
        windowMs: number
    ): Promise<boolean> {
        try {
            const now = Date.now();
            const windowStart = now - windowMs;

            // Remove old entries
            await this.redis!.zremrangebyscore(key, 0, windowStart);

            // Count recent requests
            const count = await this.redis!.zcard(key);

            if (count >= maxRequests) {
                return false; // Rate limit exceeded
            }

            // Add this request
            await this.redis!.zadd(key, now, `${now}-${Math.random()}`);

            // Set expiry (2x window for safety)
            await this.redis!.expire(key, Math.ceil((windowMs * 2) / 1000));

            return true;
        } catch (error) {
            logger.error('Redis rate limit check failed, falling back to memory', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });

            // Fallback to in-memory
            return await this.fallback.checkLimit(key, maxRequests, windowMs);
        }
    }

    /**
     * Find rate limit rule for endpoint
     */
    private findRule(endpoint: string): RateLimitRule | null {
        // Exact match first
        let rule = this.config.rules.find(r => r.endpoint === endpoint);

        if (!rule) {
            // Try prefix match (e.g. '/api/v1/packages' matches '/api/v1/packages/json/')
            rule = this.config.rules.find(r => endpoint.startsWith(r.endpoint));
        }

        return rule || null;
    }

    /**
     * Generate Redis key for rate limiting
     */
    private getRedisKey(endpoint: string): string {
        return `rl:courier:${this.config.courier}:${endpoint}`;
    }

    /**
     * Calculate wait time when rate limit is exceeded
     */
    private calculateWaitTime(windowMs: number): number {
        // Wait for a fraction of the window (with jitter)
        const baseWait = windowMs / 10; // 10% of window
        const jitter = Math.random() * baseWait * 0.3; // 0-30% jitter
        return Math.floor(baseWait + jitter);
    }

    /**
     * Sleep for specified milliseconds
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get current status (for monitoring/debugging)
     */
    async getStatus(endpoint: string): Promise<{
        allowed: boolean;
        remaining: number;
        resetAt: Date;
    } | null> {
        const rule = this.findRule(endpoint);
        if (!rule) return null;

        const key = this.getRedisKey(endpoint);
        const now = Date.now();
        const windowStart = now - rule.windowMs;

        try {
            if (this.redis) {
                await this.redis.zremrangebyscore(key, 0, windowStart);
                const count = await this.redis.zcard(key);

                return {
                    allowed: count < rule.maxRequests,
                    remaining: Math.max(0, rule.maxRequests - count),
                    resetAt: new Date(now + rule.windowMs)
                };
            }
        } catch (error) {
            logger.error('Failed to get rate limit status', { error });
        }

        return null;
    }

    /**
     * Reset all limiters (useful for testing)
     */
    async reset(): Promise<void> {
        if (this.redis) {
            const pattern = `rl:courier:${this.config.courier}:*`;
            const keys = await this.redis.keys(pattern);

            if (keys.length > 0) {
                await this.redis.del(...keys);
            }
        }

        this.fallback.reset();
        logger.info(`Rate limiters reset for ${this.config.courier}`);
    }

    /**
     * Check if rate limiting is enabled
     */
    isEnabled(): boolean {
        return this.enabled;
    }

    /**
     * Get configured endpoints
     */
    getConfiguredEndpoints(): string[] {
        return this.config.rules.map(r => r.endpoint);
    }
}
