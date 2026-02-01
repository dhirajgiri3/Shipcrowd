/**
 * Redis Lock Service
 * Provides distributed locking for auto-recharge to prevent race conditions
 * across multiple server instances
 */

import Redis from 'ioredis';
import logger from '../../../../shared/logger/winston.logger';

export class RedisLockService {
    private static instance: RedisLockService;
    private redis: Redis | null = null;
    private isAvailable: boolean = false;

    private constructor() {
        this.initialize();
    }

    static getInstance(): RedisLockService {
        if (!RedisLockService.instance) {
            RedisLockService.instance = new RedisLockService();
        }
        return RedisLockService.instance;
    }

    private initialize() {
        try {
            const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

            this.redis = new Redis(redisUrl, {
                retryStrategy: (times) => {
                    // Reconnect after 1 second
                    if (times > 3) {
                        logger.warn('Redis connection failed after 3 retries, disabling locks');
                        this.isAvailable = false;
                        return null; // Stop retrying
                    }
                    return 1000;
                },
                maxRetriesPerRequest: 3,
            });

            this.redis.on('connect', () => {
                logger.info('Redis connected - distributed locking enabled');
                this.isAvailable = true;
            });

            this.redis.on('error', (error) => {
                logger.error('Redis connection error', { error: error.message });
                this.isAvailable = false;
            });

        } catch (error: any) {
            logger.warn('Redis initialization failed - locks disabled in this instance', {
                error: error.message,
            });
            this.isAvailable = false;
        }
    }

    /**
     * Acquire a distributed lock
     * @param key Lock key (e.g., 'auto-recharge:lock:companyId')
     * @param ttl Time-to-live in milliseconds (default: 5 minutes)
     * @returns true if lock acquired, false otherwise
     */
    async acquireLock(key: string, ttl: number = 300000): Promise<boolean> {
        if (!this.isAvailable || !this.redis) {
            logger.warn('Redis unavailable - proceeding without lock', { key });
            return true; // Allow execution in dev/single-instance environments
        }

        try {
            // SET key value NX PX ttl
            // NX: Only set if not exists
            // PX: Set expiry in milliseconds
            const result = await this.redis.set(key, '1', 'PX', ttl, 'NX');

            if (result === 'OK') {
                logger.debug('Lock acquired', { key, ttl });
                return true;
            }

            logger.debug('Lock already held by another process', { key });
            return false;
        } catch (error: any) {
            logger.error('Failed to acquire lock', { key, error: error.message });
            // Fail open - allow execution if Redis error
            return true;
        }
    }

    /**
     * Release a distributed lock
     * @param key Lock key
     */
    async releaseLock(key: string): Promise<void> {
        if (!this.isAvailable || !this.redis) {
            return;
        }

        try {
            await this.redis.del(key);
            logger.debug('Lock released', { key });
        } catch (error: any) {
            logger.error('Failed to release lock', { key, error: error.message });
        }
    }

    /**
     * Execute a function with a distributed lock
     * Automatically releases lock after execution
     * @param key Lock key
     * @param fn Function to execute
     * @param ttl Lock TTL in milliseconds (default: 5 minutes)
     * @returns Result of the function
     * @throws Error if lock cannot be acquired
     */
    async withLock<T>(
        key: string,
        fn: () => Promise<T>,
        ttl: number = 300000
    ): Promise<T> {
        const acquired = await this.acquireLock(key, ttl);

        if (!acquired) {
            throw new Error(`Failed to acquire lock: ${key}`);
        }

        try {
            return await fn();
        } finally {
            await this.releaseLock(key);
        }
    }

    /**
     * Check if Redis is available
     */
    isRedisAvailable(): boolean {
        return this.isAvailable;
    }

    /**
     * Close Redis connection (for graceful shutdown)
     */
    async close(): Promise<void> {
        if (this.redis) {
            await this.redis.quit();
            logger.info('Redis connection closed');
        }
    }
}

// Export singleton instance
export default RedisLockService.getInstance();
