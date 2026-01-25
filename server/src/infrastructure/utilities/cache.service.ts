/**
 * Cache Service
 * 
 * Redis-based caching with in-memory fallback for development
 * Used for analytics and frequently accessed data
 */

import Redis from 'ioredis';
import logger from '../../shared/logger/winston.logger';

interface CacheEntry<T> {
    data: T;
    expiresAt: number;
}

/**
 * Simple caching service with Redis support and in-memory fallback
 */
export class CacheService {
    private static memoryCache = new Map<string, CacheEntry<unknown>>();
    private static redis: Redis | null = null;
    private static isRedisAvailable = false;

    /**
     * Initialize Redis connection if available
     */
    static async initialize(): Promise<void> {
        try {
            const redisUrl = process.env.REDIS_URL;
            if (redisUrl) {
                this.redis = new Redis(redisUrl, {
                    lazyConnect: true,
                    maxRetriesPerRequest: 3,
                    retryStrategy: (times: number) => Math.min(times * 100, 3000),
                });

                await this.redis.connect();
                this.isRedisAvailable = true;
                logger.info('Cache service initialized with Redis');
            } else {
                logger.warn('No REDIS_URL provided, using in-memory cache (NOT for production)');
            }
        } catch (error: any) {
            logger.warn('Redis connection failed, using in-memory cache', { error: error.message });
            this.isRedisAvailable = false;
        }
    }

    /**
     * Get cached value
     */
    static async get<T>(key: string): Promise<T | null> {
        const fullKey = `Shipcrowd:cache:${key}`;

        try {
            if (this.redis && this.isRedisAvailable) {
                const cached = await this.redis.get(fullKey);
                if (cached) {
                    return JSON.parse(cached) as T;
                }
                return null;
            }

            // In-memory fallback
            const entry = this.memoryCache.get(fullKey) as CacheEntry<T> | undefined;
            if (entry) {
                if (Date.now() < entry.expiresAt) {
                    return entry.data;
                }
                this.memoryCache.delete(fullKey);
            }
            return null;
        } catch (error: any) {
            logger.error('Cache get error', { key, error: error.message });
            return null;
        }
    }

    /**
     * Set cached value with TTL
     */
    static async set<T>(key: string, value: T, ttlSeconds: number = 3600): Promise<void> {
        const fullKey = `Shipcrowd:cache:${key}`;

        try {
            if (this.redis && this.isRedisAvailable) {
                await this.redis.setex(fullKey, ttlSeconds, JSON.stringify(value));
                return;
            }

            // In-memory fallback
            this.memoryCache.set(fullKey, {
                data: value,
                expiresAt: Date.now() + (ttlSeconds * 1000),
            });

            // Limit in-memory cache size
            if (this.memoryCache.size > 1000) {
                const firstKey = this.memoryCache.keys().next().value;
                if (firstKey) {
                    this.memoryCache.delete(firstKey);
                }
            }
        } catch (error: any) {
            logger.error('Cache set error', { key, error: error.message });
        }
    }

    /**
     * Delete cached value
     */
    static async delete(key: string): Promise<void> {
        const fullKey = `Shipcrowd:cache:${key}`;

        try {
            if (this.redis && this.isRedisAvailable) {
                await this.redis.del(fullKey);
            }
            this.memoryCache.delete(fullKey);
        } catch (error: any) {
            logger.error('Cache delete error', { key, error: error.message });
        }
    }

    /**
     * Clear all cache with pattern
     */
    static async clearPattern(pattern: string): Promise<void> {
        const fullPattern = `Shipcrowd:cache:${pattern}`;

        try {
            if (this.redis && this.isRedisAvailable) {
                const keys = await this.redis.keys(fullPattern);
                if (keys.length > 0) {
                    await this.redis.del(...keys);
                }
            }

            // In-memory fallback
            for (const key of this.memoryCache.keys()) {
                if (key.startsWith(fullPattern.replace('*', ''))) {
                    this.memoryCache.delete(key);
                }
            }
        } catch (error: any) {
            logger.error('Cache clear pattern error', { pattern, error: error.message });
        }
    }

    /**
     * Get or set (cache-aside pattern)
     */
    static async getOrSet<T>(
        key: string,
        fetchFn: () => Promise<T>,
        ttlSeconds: number = 3600
    ): Promise<T> {
        const cached = await this.get<T>(key);
        if (cached !== null) {
            return cached;
        }

        const fresh = await fetchFn();
        await this.set(key, fresh, ttlSeconds);
        return fresh;
    }
}

export default CacheService;
