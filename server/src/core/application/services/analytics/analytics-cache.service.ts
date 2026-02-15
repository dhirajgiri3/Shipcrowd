
import { CachedService } from '../../base/cached.service';

export class AnalyticsCacheService extends CachedService {
    protected serviceName = 'analytics';

    // Singleton pattern
    private static instance: AnalyticsCacheService;
    static getInstance(): AnalyticsCacheService {
        if (!AnalyticsCacheService.instance) {
            AnalyticsCacheService.instance = new AnalyticsCacheService();
        }
        return AnalyticsCacheService.instance;
    }

    /**
     * Get or Set Cache (Proxy to Repository)
     */
    async getOrSet<T>(key: string, fetchFn: () => Promise<T>, ttl: number = 300): Promise<T> {
        return this.cache.getOrSet(key, fetchFn, { ttl });
    }

    /**
     * Direct Get (Proxy)
     */
    async get<T>(key: string): Promise<T | null> {
        return this.cache.get<T>(key);
    }

    /**
     * Direct Set (Proxy)
     */
    async set<T>(key: string, value: T, ttl: number = 300): Promise<void> {
        return this.cache.set(key, value, ttl);
    }
}

export default AnalyticsCacheService.getInstance();
