
import { CacheRepository } from '../../../infrastructure/redis/cache.repository';
import { PubSubService } from '../../../infrastructure/redis/pubsub.service';

/**
 * Base Service for Caching
 * 
 * Provides built-in access to CacheRepository and standardizes
 * cache key generation and tagging.
 */
export abstract class CachedService {
    protected cache: CacheRepository;
    protected abstract serviceName: string;

    constructor() {
        // Initialize cache with service-specific prefix (optional) or global
        this.cache = new CacheRepository('sc');
    }

    /**
     * Generate cache key with company context
     * Format: sc:{companyId}:{part1}:{part2}
     */
    protected cacheKey(companyId: string, ...parts: string[]): string {
        return `${companyId}:${parts.join(':')}`;
    }

    /**
     * Generate list cache key with query hash
     * Ensures identical queries share the same cache key
     */
    protected listCacheKey(companyId: string, queryParams: Record<string, any>): string {
        const hash = this.hashQuery(queryParams);
        return this.cacheKey(companyId, 'list', this.serviceName, hash);
    }

    /**
     * Helper: Generate consistent hash for query params
     */
    private hashQuery(params: Record<string, any>): string {
        try {
            // Sort keys to ensure {a:1, b:2} == {b:2, a:1}
            return Object.keys(params)
                .sort()
                .filter(k => params[k] !== undefined && params[k] !== null && params[k] !== '')
                .map(k => `${k}=${JSON.stringify(params[k])}`)
                .join('&');
        } catch (e) {
            return 'default';
        }
    }

    /**
     * Generate Company-Scoped Tag
     * Used to invalidate ALL lists for a specific resource in a company
     * Example: company:123:orders
     */
    protected companyTag(companyId: string, resourceValue: string): string {
        return `company:${companyId}:${resourceValue}`;
    }

    /**
     * Invalidate a Tag (and broadcast it)
     */
    protected async invalidateTags(tags: string[]): Promise<void> {
        await this.cache.invalidateTags(tags);
        await PubSubService.publish({
            type: 'tags',
            target: tags,
            source: this.serviceName
        });
    }
}
