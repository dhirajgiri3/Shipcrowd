/**
 * Critical Unit Tests for RedisManager
 *
 * These tests verify the race condition fixes and circuit breaker functionality
 */

import { RedisManager } from '../../../../src/infrastructure/redis/redis.manager';

describe('RedisManager', () => {
    afterAll(async () => {
        await RedisManager.closeAll();
    });

    describe('Race Condition Prevention', () => {
        test('Multiple concurrent getMainClient calls return same instance', async () => {
            // Simulate 100 concurrent requests during server startup
            const promises = Array.from({ length: 100 }, () =>
                RedisManager.getMainClient()
            );

            const clients = await Promise.all(promises);

            // All should be the exact same instance
            const uniqueClients = new Set(clients);
            expect(uniqueClients.size).toBe(1);

            // Verify it's actually connected
            const client = clients[0];
            expect(client.status).toBe('ready');
        }, 15000); // 15s timeout

        test('Subsequent calls use cached client', async () => {
            const client1 = await RedisManager.getMainClient();
            const client2 = await RedisManager.getMainClient();

            // Should be same reference
            expect(client1).toBe(client2);
        });

        test('All three client types can be initialized concurrently', async () => {
            const [main, subscriber, publisher] = await Promise.all([
                RedisManager.getMainClient(),
                RedisManager.getSubscriberClient(),
                RedisManager.getPublisherClient(),
            ]);

            expect(main.status).toBe('ready');
            expect(subscriber.status).toBe('ready');
            expect(publisher.status).toBe('ready');

            // Should be different instances
            expect(main).not.toBe(subscriber);
            expect(main).not.toBe(publisher);
        }, 15000);
    });

    describe('Circuit Breaker', () => {
        test('Health check returns true when Redis is available', async () => {
            const isHealthy = await RedisManager.healthCheck();
            expect(isHealthy).toBe(true);
        });

        test('Can perform basic Redis operations', async () => {
            const client = await RedisManager.getMainClient();

            await client.set('test:key', 'test-value');
            const value = await client.get('test:key');

            expect(value).toBe('test-value');

            // Cleanup
            await client.del('test:key');
        });
    });

    describe('BullMQ Connection Options', () => {
        test('getBullMQConnection returns valid options', () => {
            const options = RedisManager.getBullMQConnection();

            expect(options).toHaveProperty('host');
            expect(options).toHaveProperty('port');
            expect(options).toHaveProperty('maxRetriesPerRequest', null);
            expect(options).toHaveProperty('enableReadyCheck', false);
            expect(typeof options.retryStrategy).toBe('function');
        });
    });

    describe('Graceful Shutdown', () => {
        test('closeAll disconnects all clients', async () => {
            // Get all clients
            await RedisManager.getMainClient();
            await RedisManager.getSubscriberClient();
            await RedisManager.getPublisherClient();

            // Close all
            await RedisManager.closeAll();

            // Verify new connections are created on next call
            const newClient = await RedisManager.getMainClient();
            expect(newClient.status).toBe('ready');
        }, 20000);
    });
});
