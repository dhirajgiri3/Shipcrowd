/**
 * Critical Unit Tests for PubSubService
 *
 * Tests distributed cache invalidation across multiple app instances
 */

import { CacheRepository } from '../../../../src/infrastructure/redis/cache.repository';
import { PubSubService } from '../../../../src/infrastructure/redis/pubsub.service';
import { RedisManager } from '../../../../src/infrastructure/redis/redis.manager';

describe('PubSubService', () => {
    beforeAll(async () => {
        await PubSubService.initialize();
    });

    afterAll(async () => {
        await RedisManager.closeAll();
    });

    describe('Message Publishing and Subscription', () => {
        test('Published messages are received by listeners', async () => {
            const receivedMessages: any[] = [];

            // Register listener
            PubSubService.onInvalidation('test-listener', (msg) => {
                receivedMessages.push(msg);
            });

            // Publish message
            await PubSubService.publish({
                type: 'tags',
                target: ['test:tag'],
                source: 'unit-test'
            });

            // Wait for async delivery
            await new Promise(resolve => setTimeout(resolve, 100));

            expect(receivedMessages.length).toBe(1);
            expect(receivedMessages[0]).toMatchObject({
                type: 'tags',
                target: ['test:tag'],
                source: 'unit-test'
            });

            // Cleanup
            PubSubService.offInvalidation('test-listener');
        });

        test('Multiple listeners receive the same message', async () => {
            const listener1Messages: any[] = [];
            const listener2Messages: any[] = [];

            PubSubService.onInvalidation('listener-1', (msg) => {
                listener1Messages.push(msg);
            });

            PubSubService.onInvalidation('listener-2', (msg) => {
                listener2Messages.push(msg);
            });

            await PubSubService.publish({
                type: 'pattern',
                target: 'test:*',
                source: 'unit-test'
            });

            await new Promise(resolve => setTimeout(resolve, 100));

            expect(listener1Messages.length).toBe(1);
            expect(listener2Messages.length).toBe(1);
            expect(listener1Messages[0]).toEqual(listener2Messages[0]);

            // Cleanup
            PubSubService.offInvalidation('listener-1');
            PubSubService.offInvalidation('listener-2');
        });

        test('Listener errors do not crash the system', async () => {
            const errorListener = jest.fn(() => {
                throw new Error('Listener intentionally failed');
            });

            const normalListener = jest.fn();

            PubSubService.onInvalidation('error-listener', errorListener);
            PubSubService.onInvalidation('normal-listener', normalListener);

            await PubSubService.publish({
                type: 'key',
                target: 'test:key',
            });

            await new Promise(resolve => setTimeout(resolve, 100));

            // Both listeners should have been called
            expect(errorListener).toHaveBeenCalled();
            expect(normalListener).toHaveBeenCalled();

            // Cleanup
            PubSubService.offInvalidation('error-listener');
            PubSubService.offInvalidation('normal-listener');
        });
    });

    describe('Distributed Cache Invalidation', () => {
        test('Cache invalidation propagates across "instances"', async () => {
            // Simulate 2 app instances by creating 2 cache repositories
            const cache1 = new CacheRepository('app1');
            const cache2 = new CacheRepository('app2');

            // Set data in both instances
            await cache1.setWithTags('shared:key1', 'data1', {
                ttl: 3600,
                tags: ['shared:tag']
            });

            await cache2.setWithTags('shared:key2', 'data2', {
                ttl: 3600,
                tags: ['shared:tag']
            });

            // Verify both cached
            expect(await cache1.get('shared:key1')).toBe('data1');
            expect(await cache2.get('shared:key2')).toBe('data2');

            // Invalidate from instance 1
            await cache1.invalidateTags(['shared:tag']);

            // Give pub/sub time to propagate
            await new Promise(resolve => setTimeout(resolve, 200));

            // Both instances should have invalidated data
            expect(await cache1.get('shared:key1')).toBeNull();
            expect(await cache2.get('shared:key2')).toBeNull();
        }, 10000);
    });

    describe('Listener Management', () => {
        test('offInvalidation removes listener', () => {
            const listener = jest.fn();

            PubSubService.onInvalidation('temp-listener', listener);
            const removed = PubSubService.offInvalidation('temp-listener');

            expect(removed).toBe(true);

            // Subsequent removal returns false
            const removedAgain = PubSubService.offInvalidation('temp-listener');
            expect(removedAgain).toBe(false);
        });

        test('Registering same listener ID overwrites', async () => {
            const listener1 = jest.fn();
            const listener2 = jest.fn();

            PubSubService.onInvalidation('same-id', listener1);
            PubSubService.onInvalidation('same-id', listener2); // Overwrites

            await PubSubService.publish({
                type: 'key',
                target: 'test',
            });

            await new Promise(resolve => setTimeout(resolve, 100));

            expect(listener1).not.toHaveBeenCalled();
            expect(listener2).toHaveBeenCalled();

            PubSubService.offInvalidation('same-id');
        });
    });

    describe('Error Resilience', () => {
        test('Malformed JSON message does not crash subscriber', async () => {
            // Directly publish invalid JSON to Redis
            const publisher = await RedisManager.getPublisherClient();
            await publisher.publish('shipcrowd:cache:invalidation', 'invalid-json-{{{');

            // Wait a bit
            await new Promise(resolve => setTimeout(resolve, 100));

            // System should still be functioning
            const client = await RedisManager.getMainClient();
            const pong = await client.ping();
            expect(pong).toBe('PONG');
        });
    });
});
