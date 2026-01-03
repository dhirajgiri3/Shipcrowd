/**
 * Cache Invalidation Listener
 * 
 * Listens to model events and invalidates relevant cache entries.
 */

import cacheService from '../services/cache.service';
import logger from '../logger/winston.logger';

export interface CacheInvalidationEvent {
    eventType: 'created' | 'updated' | 'deleted';
    modelName: string;
    companyId: string;
    documentId?: string;
}

class CacheInvalidationListener {
    private patterns: Map<string, string[]> = new Map();

    constructor() {
        // Map model names to cache key patterns to invalidate
        this.patterns.set('Order', [
            'analytics:orders:',
            'analytics:seller:',
            'analytics:revenue:'
        ]);

        this.patterns.set('Shipment', [
            'analytics:shipments:',
            'analytics:seller:'
        ]);

        this.patterns.set('WalletTransaction', [
            'analytics:revenue:',
            'analytics:seller:'
        ]);

        this.patterns.set('Inventory', [
            'analytics:inventory:'
        ]);
    }

    /**
     * Handle cache invalidation for a model event
     */
    invalidate(event: CacheInvalidationEvent): void {
        const patterns = this.patterns.get(event.modelName);

        if (!patterns) {
            return;
        }

        let totalDeleted = 0;

        patterns.forEach(pattern => {
            // Invalidate company-specific cache entries
            const companyPattern = `${pattern}${event.companyId}`;
            const deleted = cacheService.deletePattern(companyPattern);
            totalDeleted += deleted;
        });

        if (totalDeleted > 0) {
            logger.debug(`Cache invalidation: ${event.modelName} ${event.eventType} - deleted ${totalDeleted} entries for company ${event.companyId}`);
        }
    }

    /**
     * Invalidate all analytics cache for a company
     */
    invalidateAll(companyId: string): void {
        const patterns = [
            `analytics:seller:${companyId}`,
            `analytics:orders:${companyId}`,
            `analytics:shipments:${companyId}`,
            `analytics:revenue:${companyId}`,
            `analytics:inventory:${companyId}`,
            `analytics:customer:${companyId}`
        ];

        let totalDeleted = 0;
        patterns.forEach(pattern => {
            totalDeleted += cacheService.deletePattern(pattern);
        });

        if (totalDeleted > 0) {
            logger.debug(`Cache invalidation: Full invalidation for company ${companyId} - deleted ${totalDeleted} entries`);
        }
    }
}

// Singleton instance
const cacheInvalidationListener = new CacheInvalidationListener();

export default cacheInvalidationListener;
