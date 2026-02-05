/**
 * Distributed Lock Utility using Redis
 * 
 * Prevents thundering herd during token refresh across multiple app instances.
 * Uses Redis SETNX (SET if Not eXists) pattern with TTL for automatic cleanup.
 * 
 * Pattern: SETNX with TTL + Lua script release for atomic operations
 * 
 * @example
 * ```typescript
 * const lock = getDistributedLock();
 * 
 * // Option 1: Manual acquire/release
 * const token = await lock.acquire('my-lock', 30000);
 * if (token) {
 *   try {
 *     // Critical section
 *   } finally {
 *     await lock.release('my-lock', token);
 *   }
 * }
 * 
 * // Option 2: Automatic with withLock
 * const result = await lock.withLock(
 *   'my-lock',
 *   async () => {
 *     // Critical section
 *     return someValue;
 *   },
 *   30000,  // Lock TTL
 *   10000   // Max wait time
 * );
 * ```
 */

import Redis from 'ioredis';
import logger from '../logger/winston.logger';

export class DistributedLock {
    private redis: Redis;
    private readonly lockPrefix = 'lock:';

    constructor(redisClient?: Redis) {
        if (redisClient) {
            this.redis = redisClient;
        } else {
            // Create default Redis client
            this.redis = new Redis({
                host: process.env.REDIS_HOST || 'localhost',
                port: Number(process.env.REDIS_PORT) || 6379,
                password: process.env.REDIS_PASSWORD,
                db: Number(process.env.REDIS_DB) || 0,
                retryStrategy: (times) => {
                    const delay = Math.min(times * 50, 2000);
                    return delay;
                },
                maxRetriesPerRequest: 3,
            });

            this.redis.on('error', (error) => {
                logger.error('Redis connection error in DistributedLock', {
                    error: error.message,
                });
            });
        }
    }

    /**
     * Acquire distributed lock with TTL
     * 
     * Uses Redis SET command with NX (not exists) and PX (milliseconds TTL) options.
     * This is an atomic operation that prevents race conditions.
     * 
     * @param key - Lock identifier (e.g., 'ekart:auth:companyId')
     * @param ttlMs - Lock TTL in milliseconds (default 30s)
     * @returns Lock token if acquired, null if lock is already held
     */
    async acquire(key: string, ttlMs: number = 30000): Promise<string | null> {
        const lockKey = this.lockPrefix + key;
        const lockToken = `${Date.now()}_${Math.random().toString(36).substring(7)}`;

        try {
            // SET key value NX PX ttl (atomic operation)
            // NX: Only set if key doesn't exist
            // PX: Set expiry in milliseconds
            const result = await this.redis.set(
                lockKey,
                lockToken,
                'PX',
                ttlMs,
                'NX'
            );

            if (result === 'OK') {
                logger.debug('Distributed lock acquired', {
                    key,
                    lockToken: lockToken.substring(0, 10) + '...',
                    ttlMs,
                });
                return lockToken;
            }

            logger.debug('Distributed lock acquisition failed (already held)', { key });
            return null;
        } catch (error) {
            logger.error('Distributed lock acquisition error', {
                key,
                error: error instanceof Error ? error.message : 'Unknown',
            });
            return null;
        }
    }

    /**
     * Release distributed lock
     * 
     * Uses Lua script to ensure only the lock holder can release.
     * This prevents accidentally releasing another process's lock.
     * 
     * @param key - Lock identifier
     * @param token - Lock token from acquire()
     * @returns true if released, false if token mismatch or already expired
     */
    async release(key: string, token: string): Promise<boolean> {
        const lockKey = this.lockPrefix + key;

        try {
            // Lua script: only delete if value matches (prevents race condition)
            // This is atomic - check and delete happen together
            const luaScript = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
        else
          return 0
        end
      `;

            const result = await this.redis.eval(luaScript, 1, lockKey, token);

            if (result === 1) {
                logger.debug('Distributed lock released', {
                    key,
                    token: token.substring(0, 10) + '...',
                });
                return true;
            }

            logger.warn('Distributed lock release failed (token mismatch or expired)', {
                key,
                token: token.substring(0, 10) + '...',
            });
            return false;
        } catch (error) {
            logger.error('Distributed lock release error', {
                key,
                token: token.substring(0, 10) + '...',
                error: error instanceof Error ? error.message : 'Unknown',
            });
            return false;
        }
    }

    /**
     * Execute function with distributed lock
     * 
     * Automatically acquires lock, executes function, and releases lock.
     * Lock is released even if function throws an error.
     * 
     * @param key - Lock identifier
     * @param fn - Function to execute while holding lock
     * @param ttlMs - Lock TTL in milliseconds (default 30s)
     * @param waitMs - Max time to wait for lock (default: don't wait)
     * @returns Result of function execution
     * @throws Error if lock cannot be acquired within waitMs
     */
    async withLock<T>(
        key: string,
        fn: () => Promise<T>,
        ttlMs: number = 30000,
        waitMs: number = 0
    ): Promise<T> {
        const startTime = Date.now();
        let token: string | null = null;

        // Try to acquire lock with optional retry
        while (!token) {
            token = await this.acquire(key, ttlMs);

            if (!token) {
                const elapsed = Date.now() - startTime;

                if (waitMs > 0 && elapsed < waitMs) {
                    // Wait 100ms and retry
                    await new Promise((resolve) => setTimeout(resolve, 100));
                } else {
                    throw new Error(
                        `Failed to acquire distributed lock: ${key} (waited ${elapsed}ms)`
                    );
                }
            }
        }

        try {
            // Execute function while holding lock
            logger.debug('Executing function with distributed lock', { key });
            return await fn();
        } finally {
            // Always release lock (even if fn throws)
            await this.release(key, token);
        }
    }

    /**
     * Check if lock is currently held
     * 
     * @param key - Lock identifier
     * @returns true if lock exists, false otherwise
     */
    async isLocked(key: string): Promise<boolean> {
        const lockKey = this.lockPrefix + key;
        try {
            const exists = await this.redis.exists(lockKey);
            return exists === 1;
        } catch (error) {
            logger.error('Error checking lock status', {
                key,
                error: error instanceof Error ? error.message : 'Unknown',
            });
            return false;
        }
    }

    /**
     * Get remaining TTL for lock
     * 
     * @param key - Lock identifier
     * @returns Remaining TTL in milliseconds, or -1 if lock doesn't exist
     */
    async getTTL(key: string): Promise<number> {
        const lockKey = this.lockPrefix + key;
        try {
            const ttl = await this.redis.pttl(lockKey);
            return ttl;
        } catch (error) {
            logger.error('Error getting lock TTL', {
                key,
                error: error instanceof Error ? error.message : 'Unknown',
            });
            return -1;
        }
    }

    /**
     * Close Redis connection
     * Call this when shutting down the application
     */
    async close(): Promise<void> {
        try {
            await this.redis.quit();
            logger.info('DistributedLock Redis connection closed');
        } catch (error) {
            logger.error('Error closing DistributedLock Redis connection', {
                error: error instanceof Error ? error.message : 'Unknown',
            });
        }
    }
}

// ==================== Singleton Instance ====================

/**
 * Singleton instance of DistributedLock
 * Reuses same Redis connection across the application
 */
let distributedLockInstance: DistributedLock | null = null;

/**
 * Get singleton instance of DistributedLock
 * 
 * @returns Shared DistributedLock instance
 */
export function getDistributedLock(): DistributedLock {
    if (!distributedLockInstance) {
        distributedLockInstance = new DistributedLock();
        logger.info('DistributedLock singleton instance created');
    }
    return distributedLockInstance;
}

/**
 * Reset singleton instance (useful for testing)
 */
export function resetDistributedLock(): void {
    if (distributedLockInstance) {
        distributedLockInstance.close();
        distributedLockInstance = null;
        logger.info('DistributedLock singleton instance reset');
    }
}
