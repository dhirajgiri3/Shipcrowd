
import { RedisManager } from './redis.manager';
import logger from '../../shared/logger/winston.logger';
import Redis from 'ioredis';

export interface CacheOptions {
    ttl?: number;
    tags?: string[];
}

export class CacheRepository {
    private prefix: string;

    constructor(prefix: string = 'sc') {
        this.prefix = prefix;
    }

    private key(k: string): string {
        return `${this.prefix}:${k}`;
    }

    private tagKey(tag: string): string {
        return `${this.prefix}:tag:${tag}`;
    }

    /**
     * Atomic Get-Or-Set Pattern
     */
    async getOrSet<T>(
        key: string,
        fetchFn: () => Promise<T>,
        options: CacheOptions = {}
    ): Promise<T> {
        const client = await RedisManager.getMainClient();
        const fullKey = this.key(key);

        try {
            // 1. Try cache
            const cached = await client.get(fullKey);
            if (cached) {
                return JSON.parse(cached) as T;
            }

            // 2. Cache miss - fetch fresh
            const fresh = await fetchFn();

            // 3. Set with tags
            await this.setWithTags(key, fresh, options);

            return fresh;
        } catch (error) {
            logger.error(`[CacheRepository] Error in getOrSet for key ${key}:`, error);
            // Fallback to fresh fetch on error
            return fetchFn();
        }
    }

    /**
     * Set value with Tag Association
     *
     * Fixed: Tag expiration now uses a buffer to prevent orphaned keys.
     * Tags expire 24 hours after the longest TTL to ensure cleanup.
     */
    async setWithTags<T>(key: string, value: T, options: CacheOptions = {}): Promise<void> {
        const client = await RedisManager.getMainClient() as Redis;
        const fullKey = this.key(key);
        const ttl = options.ttl || 3600;

        const pipeline = client.pipeline();

        // 1. Store value
        pipeline.setex(fullKey, ttl, JSON.stringify(value));

        // 2. Associate with Tags
        if (options.tags && options.tags.length > 0) {
            for (const tag of options.tags) {
                const tagSetKey = this.tagKey(tag);
                pipeline.sadd(tagSetKey, fullKey);

                // Tag set expires 24h after data to prevent orphans
                // This ensures tags outlive all associated keys
                const tagTTL = ttl + 86400; // 24 hour buffer
                pipeline.expire(tagSetKey, tagTTL);
            }
        }

        await pipeline.exec();
    }

    /**
     * Invalidate by Tags (Scalable with SSCAN)
     *
     * Uses cursor-based scanning to handle large tag sets without blocking Redis.
     * Deletes keys in batches to prevent pipeline overflow.
     */
    async invalidateTags(tags: string[]): Promise<number> {
        const client = await RedisManager.getMainClient() as Redis;
        let totalDeleted = 0;

        for (const tag of tags) {
            const tagSetKey = this.tagKey(tag);

            // Use SSCAN for large sets (non-blocking, cursor-based)
            const stream = client.sscanStream(tagSetKey, {
                count: 100 // Process in chunks
            });

            const keysToDelete: string[] = [];

            for await (const keyBatch of stream) {
                keysToDelete.push(...keyBatch);

                // Delete in batches of 1000 to avoid pipeline overflow
                if (keysToDelete.length >= 1000) {
                    const pipeline = client.pipeline();
                    keysToDelete.forEach(k => pipeline.del(k));
                    const results = await pipeline.exec();

                    // Count successful deletions
                    totalDeleted += results?.filter(([err]) => !err).length || 0;
                    keysToDelete.length = 0; // Clear array
                }
            }

            // Delete remaining keys + tag set itself
            if (keysToDelete.length > 0) {
                const pipeline = client.pipeline();
                keysToDelete.forEach(k => pipeline.del(k));
                pipeline.del(tagSetKey); // Remove tag set
                const results = await pipeline.exec();
                totalDeleted += results?.filter(([err]) => !err).length || 0;
            } else {
                // If no keys, just delete the tag set
                await client.del(tagSetKey);
            }
        }

        if (totalDeleted > 0) {
            logger.info(`[CacheRepository] Invalidated ${totalDeleted} keys for tags: ${tags.join(', ')}`);
        }

        return totalDeleted;
    }

    /**
     * Direct Get
     */
    async get<T>(key: string): Promise<T | null> {
        try {
            const client = await RedisManager.getMainClient();
            const cached = await client.get(this.key(key));
            return cached ? JSON.parse(cached) : null;
        } catch (error) {
            logger.error(`[CacheRepository] Error getting key ${key}:`, error);
            return null;
        }
    }

    /**
     * Direct Set
     */
    async set<T>(key: string, value: T, ttl: number = 3600): Promise<void> {
        try {
            const client = await RedisManager.getMainClient();
            await client.setex(this.key(key), ttl, JSON.stringify(value));
        } catch (error) {
            logger.error(`[CacheRepository] Error setting key ${key}:`, error);
        }
    }

    /**
     * Delete Key
     */
    async delete(key: string): Promise<void> {
        try {
            const client = await RedisManager.getMainClient();
            await client.del(this.key(key));
        } catch (error) {
            logger.error(`[CacheRepository] Error deleting key ${key}:`, error);
        }
    }

    /**
     * Safe Pattern Deletion (SCAN)
     */
    async deletePattern(pattern: string): Promise<number> {
        const client = await RedisManager.getMainClient() as Redis;
        const fullPattern = this.key(pattern);
        let deleted = 0;
        const keysToDelete: string[] = [];

        const stream = client.scanStream({
            match: fullPattern,
            count: 100
        });

        for await (const keyBatch of stream) {
            keysToDelete.push(...keyBatch);
        }

        if (keysToDelete.length > 0) {
            const pipeline = client.pipeline();
            keysToDelete.forEach(k => pipeline.del(k));
            await pipeline.exec();
            deleted = keysToDelete.length;
        }

        return deleted;
    }
}
