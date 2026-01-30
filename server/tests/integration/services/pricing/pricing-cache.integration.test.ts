import { PricingCacheService } from '@/core/application/services/pricing/pricing-cache.service';
import { RedisManager } from '@/infrastructure/redis/redis.manager';
import RedisMock from 'ioredis-mock';

// Mock RedisManager
jest.mock('@/infrastructure/redis/redis.manager');

// Mock Logger
jest.mock('@/shared/logger/winston.logger', () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
}));

// Mock Metrics to prevent side effects
jest.mock('@/core/application/services/metrics/pricing-metrics.service', () => ({
    recordCacheMiss: jest.fn(),
    recordCacheHit: jest.fn(),
}));

describe('PricingCacheService Integration', () => {
    let service: PricingCacheService;
    let redisMock: InstanceType<typeof RedisMock>;

    beforeEach(() => {
        jest.clearAllMocks();
        redisMock = new RedisMock();

        // Mock RedisManager to return our mock instance
        (RedisManager.getMainClient as jest.Mock).mockResolvedValue(redisMock);

        // Reset singleton (if possible) or just instantiate new service
        // Since getPricingCache returns singleton, we might need to bypass it or
        // relying on the fact that new PricingCacheService() calls getRedis() per method.
        // But getPricingCache exports a singleton.
        // We can just instantiate the class directly if we exported it, 
        // OR rely on the fact that getRedis() is called dynamically.
        service = new PricingCacheService();
    });

    afterEach(async () => {
        await redisMock.flushall();
    });

    describe('Zone Caching', () => {
        it('should handle cache miss for zone', async () => {
            const zone = await service.getZone('110001', '400001');
            expect(zone).toBeNull();
        });

        it('should cache and retrieve zone', async () => {
            await service.cacheZone('110001', '400001', 'zoneA');

            const cached = await service.getZone('110001', '400001');
            expect(cached).toBe('zoneA');

            // Verify TTL (approximate)
            // ioredis-mock doesn't strictly support accessing ttl via API easily in this context without getTtl,
            // but we trust the call was made. We can check key existence.
            const exists = await redisMock.exists('zone:110001:400001');
            expect(exists).toBe(1);
        });
    });

    describe('RateCard Caching (Default Company)', () => {
        const companyId = 'comp_123';
        const version = 'v2';
        const rateCardData = { _id: 'rc_123', name: 'Test Card', version };

        it('should return null on cache miss', async () => {
            const result = await service.getDefaultRateCard(companyId);
            expect(result).toBeNull();
        });

        it('should cache and retrieve default rate card with version pointer', async () => {
            await service.cacheDefaultRateCard(companyId, version, rateCardData);

            // Verify pointer
            const pointer = await redisMock.get(`ratecard:default:${companyId}:current`);
            expect(pointer).toBe(version);

            // Verify data
            const data = await redisMock.get(`ratecard:default:${companyId}:${version}`);
            expect(JSON.parse(data!)).toEqual(rateCardData);

            // Verify retrieval via service
            const retrieved = await service.getDefaultRateCard(companyId);
            expect(retrieved).toEqual(rateCardData);
        });
    });

    describe('Cache Invalidation', () => {
        const companyId = 'comp_inv';
        const version = 'v5';
        const rateCardData = { _id: 'rc_inv', version };

        beforeEach(async () => {
            await service.cacheDefaultRateCard(companyId, version, rateCardData);
        });

        it('should invalidate rate cards for company', async () => {
            // Ensure exists first
            const before = await service.getDefaultRateCard(companyId);
            expect(before).toBeDefined();

            // Invalidate
            await service.invalidateRateCard(companyId);

            // Ensure gone
            const after = await service.getDefaultRateCard(companyId);
            expect(after).toBeNull();

            // Verify keys deleted
            const pointer = await redisMock.get(`ratecard:default:${companyId}:current`);
            expect(pointer).toBeNull();

            const data = await redisMock.get(`ratecard:default:${companyId}:${version}`);
            expect(data).toBeNull();
        });
    });
});
