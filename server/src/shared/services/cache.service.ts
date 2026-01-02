/**
 * In-Memory Cache Service
 * 
 * Simple caching layer with TTL (Time To Live) support.
 * Used primarily for expensive analytics queries.
 * 
 * Features:
 * - TTL-based expiration
 * - Size limit to prevent memory leaks
 * - Cache key namespacing
 * - Automatic cleanup of expired entries
 */

import logger from '../logger/winston.logger';

interface CacheEntry<T> {
    data: T;
    expiresAt: number;
}

class CacheService {
    private cache: Map<string, CacheEntry<any>>;
    private maxSize: number;
    private cleanupInterval: NodeJS.Timeout | null;

    constructor(maxSize: number = 1000) {
        this.cache = new Map();
        this.maxSize = maxSize;
        this.cleanupInterval = null;

        // Start periodic cleanup every 5 minutes
        this.startCleanup();
    }

    /**
     * Get value from cache
     * Returns null if not found or expired
     */
    get<T>(key: string): T | null {
        const entry = this.cache.get(key);

        if (!entry) {
            return null;
        }

        // Check if expired
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return null;
        }

        return entry.data as T;
    }

    /**
     * Set value in cache with TTL in seconds
     */
    set<T>(key: string, data: T, ttlSeconds: number = 300): void {
        // Enforce size limit
        if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
            // Remove oldest entry (first in Map)
            const firstKey = this.cache.keys().next().value;
            if (firstKey) {
                this.cache.delete(firstKey);
            }
        }

        const expiresAt = Date.now() + ttlSeconds * 1000;
        this.cache.set(key, { data, expiresAt });
    }

    /**
     * Delete specific key
     */
    delete(key: string): boolean {
        return this.cache.delete(key);
    }

    /**
     * Delete all keys matching a pattern
     * Example: deletePattern('dashboard:seller:') removes all seller dashboards
     */
    deletePattern(pattern: string): number {
        let count = 0;
        for (const key of this.cache.keys()) {
            if (key.includes(pattern)) {
                this.cache.delete(key);
                count++;
            }
        }
        return count;
    }

    /**
     * Clear entire cache
     */
    clear(): void {
        this.cache.clear();
    }

    /**
     * Get cache statistics
     */
    stats(): { size: number; maxSize: number; keys: string[] } {
        return {
            size: this.cache.size,
            maxSize: this.maxSize,
            keys: Array.from(this.cache.keys()),
        };
    }

    /**
     * Start automatic cleanup of expired entries
     */
    private startCleanup(): void {
        this.cleanupInterval = setInterval(() => {
            this.cleanExpired();
        }, 5 * 60 * 1000); // Every 5 minutes
    }

    /**
     * Stop automatic cleanup
     */
    stopCleanup(): void {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
    }

    /**
     * Remove all expired entries
     */
    private cleanExpired(): void {
        const now = Date.now();
        let removed = 0;

        for (const [key, entry] of this.cache.entries()) {
            if (now > entry.expiresAt) {
                this.cache.delete(key);
                removed++;
            }
        }

        if (removed > 0) {
            logger.debug(`Cache cleanup: removed ${removed} expired entries`);
        }
    }

    /**
     * Generate cache key for analytics
     */
    static analyticsKey(
        type: 'seller' | 'admin' | 'orders' | 'shipments' | 'revenue' | 'customer' | 'inventory' | 'reports',
        companyId: string,
        params: Record<string, any>
    ): string {
        const paramStr = Object.entries(params)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, v]) => `${k}:${v}`)
            .join('|');

        return `analytics:${type}:${companyId}:${paramStr}`;
    }

    /**
     * Get recommended TTL for analytics type (in seconds)
     */
    static getTTL(type: 'dashboard' | 'trends' | 'stats' | 'reports'): number {
        const ttls: Record<string, number> = {
            dashboard: 300,   // 5 minutes
            trends: 900,      // 15 minutes
            stats: 1800,      // 30 minutes
            reports: 3600     // 1 hour
        };
        return ttls[type] || 300;
    }
}


// Singleton instance
const cacheService = new CacheService(1000);

// Graceful shutdown
process.on('SIGTERM', () => {
    cacheService.stopCleanup();
});

export default cacheService;
export { CacheService };
