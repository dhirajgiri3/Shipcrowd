/**
 * Critical Unit Tests for CacheRepository
 *
 * Tests tag-based invalidation at scale
 */

import { CacheRepository } from '../../../../src/infrastructure/redis/cache.repository';
import { RedisManager } from '../../../../src/infrastructure/redis/redis.manager';

describe('CacheRepository', () => {
    let cache: CacheRepository;

    beforeAll(() => {
        cache = new CacheRepository('test');
    });

    afterAll(async () => {
        await RedisManager.closeAll();
    });

    afterEach(async () => {
        // Clean up test keys
        await cache.deletePattern('*');
    });

    describe('Basic Operations', () => {
        test('getOrSet caches value on first call', async () => {
            let callCount = 0;

            const fetchFn = async () => {
                callCount++;
                return { data: 'test-data' };
            };

            // First call - should fetch
            const result1 = await cache.getOrSet('key1', fetchFn, { ttl: 60 });
            expect(result1).toEqual({ data: 'test-data' });
            expect(callCount).toBe(1);

            // Second call - should use cache
            const result2 = await cache.getOrSet('key1', fetchFn, { ttl: 60 });
            expect(result2).toEqual({ data: 'test-data' });
            expect(callCount).toBe(1); // fetchFn not called again
        });

        test('Direct set and get work correctly', async () => {
            await cache.set('direct:key', { value: 123 }, 60);

            const result = await cache.get<{ value: number }>('direct:key');
            expect(result).toEqual({ value: 123 });
        });
    });

    describe('Tag-Based Invalidation', () => {
        test('Invalidating tags removes all associated keys', async () => {
            // Setup multiple keys with same tag
            await cache.setWithTags('order:1', { id: 1 }, {
                ttl: 3600,
                tags: ['company:123:orders']
            });

            await cache.setWithTags('order:2', { id: 2 }, {
                ttl: 3600,
                tags: ['company:123:orders']
            });

            await cache.setWithTags('order:3', { id: 3 }, {
                ttl: 3600,
                tags: ['company:123:orders']
            });

            // Verify all cached
            expect(await cache.get('order:1')).toEqual({ id: 1 });
            expect(await cache.get('order:2')).toEqual({ id: 2 });
            expect(await cache.get('order:3')).toEqual({ id: 3 });

            // Invalidate tag
            const deleted = await cache.invalidateTags(['company:123:orders']);
            expect(deleted).toBe(3);

            // Verify all removed
            expect(await cache.get('order:1')).toBeNull();
            expect(await cache.get('order:2')).toBeNull();
            expect(await cache.get('order:3')).toBeNull();
        });

        test('Invalidating 10,000 tagged keys completes without timeout', async () => {
            const tag = 'company:test:orders';
            const keyCount = 10000;

            // Setup 10k keys with same tag
            console.log(`Setting up ${keyCount} keys...`);
            const client = await RedisManager.getMainClient();
            const pipeline = client.pipeline();

            for (let i = 0; i < keyCount; i++) {
                const key = `test:order:${i}`;
                const tagKey = `test:tag:${tag}`;

                pipeline.setex(key, 3600, JSON.stringify({ id: i }));
                pipeline.sadd(tagKey, `test:${key}`);
            }

            await pipeline.exec();
            console.log(`Setup complete`);

            // Measure invalidation time
            const start = Date.now();
            const deleted = await cache.invalidateTags([tag]);
            const duration = Date.now() - start;

            console.log(`Invalidated ${deleted} keys in ${duration}ms`);

            // Should complete in reasonable time (< 5s)
            expect(duration).toBeLessThan(5000);
            expect(deleted).toBe(keyCount);
        }, 30000); // 30s timeout for this test

        test('Multiple tags work correctly', async () => {
            await cache.setWithTags('user:1:profile', { name: 'John' }, {
                ttl: 3600,
                tags: ['user:1', 'profiles']
            });

            await cache.setWithTags('user:2:profile', { name: 'Jane' }, {
                ttl: 3600,
                tags: ['user:2', 'profiles']
            });

            // Invalidate user:1 tag only
            await cache.invalidateTags(['user:1']);

            expect(await cache.get('user:1:profile')).toBeNull();
            expect(await cache.get('user:2:profile')).toEqual({ name: 'Jane' });

            // Invalidate profiles tag
            await cache.invalidateTags(['profiles']);

            expect(await cache.get('user:2:profile')).toBeNull();
        });
    });

    describe('Pattern Deletion', () => {
        test('deletePattern removes matching keys using SCAN', async () => {
            await cache.set('pattern:1', 'a');
            await cache.set('pattern:2', 'b');
            await cache.set('other:1', 'c');

            const deleted = await cache.deletePattern('pattern:*');

            expect(deleted).toBe(2);
            expect(await cache.get('pattern:1')).toBeNull();
            expect(await cache.get('pattern:2')).toBeNull();
            expect(await cache.get('other:1')).toBe('c'); // Not deleted
        });
    });

    describe('Edge Cases', () => {
        test('Invalidating non-existent tag returns 0', async () => {
            const deleted = await cache.invalidateTags(['nonexistent:tag']);
            expect(deleted).toBe(0);
        });

        test('Empty tags array does nothing', async () => {
            await cache.setWithTags('key1', 'value', { ttl: 60, tags: [] });

            const deleted = await cache.invalidateTags([]);
            expect(deleted).toBe(0);

            expect(await cache.get('key1')).toBe('value');
        });

        test('getOrSet handles fetch function errors gracefully', async () => {
            const fetchFn = async () => {
                throw new Error('Fetch failed');
            };

            await expect(cache.getOrSet('error:key', fetchFn)).rejects.toThrow('Fetch failed');
        });
    });
});
