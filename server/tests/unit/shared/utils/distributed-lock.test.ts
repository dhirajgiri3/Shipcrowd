/**
 * Unit tests for DistributedLock
 * 
 * Tests cover:
 * - Basic acquire/release operations
 * - Concurrent lock acquisition
 * - Lock expiry and TTL
 * - withLock helper function
 * - Error handling
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { DistributedLock } from '../../../../src/shared/utils/distributed-lock';
import type Redis from 'ioredis';

describe('DistributedLock', () => {
    let lock: DistributedLock;
    let mockRedis: any;

    beforeEach(() => {
        // Create mock Redis client
        mockRedis = {
            set: jest.fn(),
            eval: jest.fn(),
            exists: jest.fn(),
            pttl: jest.fn(),
            quit: jest.fn(),
            on: jest.fn(),
        };

        lock = new DistributedLock(mockRedis as unknown as Redis);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('acquire', () => {
        it('should acquire lock successfully', async () => {
            mockRedis.set.mockResolvedValue('OK');

            const token = await lock.acquire('test-key', 30000);

            expect(token).toBeTruthy();
            expect(typeof token).toBe('string');
            expect(mockRedis.set).toHaveBeenCalledWith(
                'lock:test-key',
                expect.any(String),
                'PX',
                30000,
                'NX'
            );
        });

        it('should return null if lock already held', async () => {
            mockRedis.set.mockResolvedValue(null);

            const token = await lock.acquire('test-key', 30000);

            expect(token).toBeNull();
        });

        it('should use default TTL of 30s if not specified', async () => {
            mockRedis.set.mockResolvedValue('OK');

            await lock.acquire('test-key');

            expect(mockRedis.set).toHaveBeenCalledWith(
                'lock:test-key',
                expect.any(String),
                'PX',
                30000,
                'NX'
            );
        });

        it('should handle Redis errors gracefully', async () => {
            mockRedis.set.mockRejectedValue(new Error('Redis connection failed'));

            const token = await lock.acquire('test-key', 30000);

            expect(token).toBeNull();
        });
    });

    describe('release', () => {
        it('should release lock with correct token', async () => {
            mockRedis.eval.mockResolvedValue(1);

            const result = await lock.release('test-key', 'test-token');

            expect(result).toBe(true);
            expect(mockRedis.eval).toHaveBeenCalledWith(
                expect.stringContaining('redis.call("get", KEYS[1])'),
                1,
                'lock:test-key',
                'test-token'
            );
        });

        it('should fail if token mismatch', async () => {
            mockRedis.eval.mockResolvedValue(0);

            const result = await lock.release('test-key', 'wrong-token');

            expect(result).toBe(false);
        });

        it('should handle Redis errors gracefully', async () => {
            mockRedis.eval.mockRejectedValue(new Error('Redis connection failed'));

            const result = await lock.release('test-key', 'test-token');

            expect(result).toBe(false);
        });
    });

    describe('withLock', () => {
        it('should execute function and release lock', async () => {
            mockRedis.set.mockResolvedValue('OK');
            mockRedis.eval.mockResolvedValue(1);

            const fn = jest.fn().mockResolvedValue('result');

            const result = await lock.withLock('test-key', fn, 30000, 0);

            expect(result).toBe('result');
            expect(fn).toHaveBeenCalledTimes(1);
            expect(mockRedis.set).toHaveBeenCalled(); // Lock acquired
            expect(mockRedis.eval).toHaveBeenCalled(); // Lock released
        });

        it('should release lock even if function throws', async () => {
            mockRedis.set.mockResolvedValue('OK');
            mockRedis.eval.mockResolvedValue(1);

            const fn = jest.fn().mockRejectedValue(new Error('test error'));

            await expect(lock.withLock('test-key', fn, 30000, 0)).rejects.toThrow('test error');

            expect(mockRedis.eval).toHaveBeenCalled(); // Lock still released
        });

        it('should throw if lock cannot be acquired', async () => {
            mockRedis.set.mockResolvedValue(null);

            const fn = jest.fn();

            await expect(lock.withLock('test-key', fn, 30000, 0)).rejects.toThrow(
                /Failed to acquire distributed lock/
            );

            expect(fn).not.toHaveBeenCalled();
        });

        it('should retry acquiring lock within waitMs', async () => {
            // First call fails, second succeeds
            mockRedis.set
                .mockResolvedValueOnce(null)
                .mockResolvedValueOnce('OK');
            mockRedis.eval.mockResolvedValue(1);

            const fn = jest.fn().mockResolvedValue('result');

            const result = await lock.withLock('test-key', fn, 30000, 5000);

            expect(result).toBe('result');
            expect(mockRedis.set).toHaveBeenCalledTimes(2);
        });
    });

    describe('isLocked', () => {
        it('should return true if lock exists', async () => {
            mockRedis.exists.mockResolvedValue(1);

            const result = await lock.isLocked('test-key');

            expect(result).toBe(true);
            expect(mockRedis.exists).toHaveBeenCalledWith('lock:test-key');
        });

        it('should return false if lock does not exist', async () => {
            mockRedis.exists.mockResolvedValue(0);

            const result = await lock.isLocked('test-key');

            expect(result).toBe(false);
        });

        it('should handle Redis errors gracefully', async () => {
            mockRedis.exists.mockRejectedValue(new Error('Redis connection failed'));

            const result = await lock.isLocked('test-key');

            expect(result).toBe(false);
        });
    });

    describe('getTTL', () => {
        it('should return remaining TTL', async () => {
            mockRedis.pttl.mockResolvedValue(15000);

            const ttl = await lock.getTTL('test-key');

            expect(ttl).toBe(15000);
            expect(mockRedis.pttl).toHaveBeenCalledWith('lock:test-key');
        });

        it('should return -1 if lock does not exist', async () => {
            mockRedis.pttl.mockResolvedValue(-2);

            const ttl = await lock.getTTL('test-key');

            expect(ttl).toBe(-2);
        });

        it('should handle Redis errors gracefully', async () => {
            mockRedis.pttl.mockRejectedValue(new Error('Redis connection failed'));

            const ttl = await lock.getTTL('test-key');

            expect(ttl).toBe(-1);
        });
    });

    describe('close', () => {
        it('should close Redis connection', async () => {
            mockRedis.quit.mockResolvedValue('OK');

            await lock.close();

            expect(mockRedis.quit).toHaveBeenCalled();
        });

        it('should handle errors when closing', async () => {
            mockRedis.quit.mockRejectedValue(new Error('Connection already closed'));

            await expect(lock.close()).resolves.not.toThrow();
        });
    });

    describe('concurrent lock acquisition', () => {
        it('should prevent concurrent acquisition of same lock', async () => {
            // First acquire succeeds, second fails
            mockRedis.set
                .mockResolvedValueOnce('OK')
                .mockResolvedValueOnce(null);

            const [token1, token2] = await Promise.all([
                lock.acquire('test-key', 30000),
                lock.acquire('test-key', 30000),
            ]);

            expect(token1).toBeTruthy();
            expect(token2).toBeNull();
        });

        it('should allow acquisition of different locks concurrently', async () => {
            mockRedis.set.mockResolvedValue('OK');

            const [token1, token2] = await Promise.all([
                lock.acquire('key-1', 30000),
                lock.acquire('key-2', 30000),
            ]);

            expect(token1).toBeTruthy();
            expect(token2).toBeTruthy();
            expect(mockRedis.set).toHaveBeenCalledTimes(2);
        });
    });
});
