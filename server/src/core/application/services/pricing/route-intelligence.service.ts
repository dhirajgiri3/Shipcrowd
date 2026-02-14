import mongoose from 'mongoose';
import { CourierPerformance } from '../../../../infrastructure/database/mongoose/models';
import CacheService from '../../../../infrastructure/utilities/cache.service';
import logger from '../../../../shared/logger/winston.logger';

/**
 * Route Performance Metrics
 */
export interface RoutePerformanceMetrics {
    deliverySuccessRate: number; // 0-100
    rtoRate: number; // 0-100
    dataSource: 'route' | 'courier' | 'default';
}

/**
 * Route Intelligence Service
 *
 * Fetches real courier performance data with a simple fallback hierarchy:
 * 1. Route-level (origin+destination pincode match)
 * 2. Courier-level (overall metrics)
 * 3. Defaults (when no performance data exists)
 */
class RouteIntelligenceService {
    private readonly CACHE_TTL_SEC = 900; // 15 minutes
    private readonly DEFAULT_METRICS: RoutePerformanceMetrics = {
        deliverySuccessRate: 85,
        rtoRate: 12,
        dataSource: 'default',
    };

    /**
     * Get route performance metrics for multiple couriers in batch
     */
    async getBatchRoutePerformance(
        companyId: string,
        courierIds: string[],
        fromPincode: string,
        toPincode: string
    ): Promise<Map<string, RoutePerformanceMetrics>> {
        const result = new Map<string, RoutePerformanceMetrics>();

        if (!courierIds.length) {
            return result;
        }

        const companyObjectId = new mongoose.Types.ObjectId(companyId);

        try {
            // Fetch all courier performance docs for this company in one query
            const performanceDocs = await CourierPerformance.find({
                companyId: companyObjectId,
                courierId: { $in: courierIds },
            })
                .select('courierId routeMetrics overallMetrics')
                .lean();

            // Process each courier
            for (const courierId of courierIds) {
                const cacheKey = this.getCacheKey(companyId, courierId, fromPincode, toPincode);

                // Try cache first
                const cached = await CacheService.get<RoutePerformanceMetrics>(cacheKey);
                if (cached) {
                    result.set(courierId, cached);
                    continue;
                }

                // Find performance doc for this courier
                const perfDoc = performanceDocs.find((doc) => doc.courierId === courierId);

                let metrics: RoutePerformanceMetrics;

                if (!perfDoc) {
                    // No performance data exists - use defaults
                    metrics = { ...this.DEFAULT_METRICS };
                } else {
                    // Try route-level metrics first
                    const routeMetric = perfDoc.routeMetrics?.find(
                        (rm: any) =>
                            rm.originPincode === fromPincode &&
                            rm.destinationPincode === toPincode
                    );

                    if (routeMetric && routeMetric.totalShipments >= 10) {
                        // Route-level data available with sufficient volume
                        metrics = {
                            deliverySuccessRate: routeMetric.deliverySuccessRate || 85,
                            rtoRate: routeMetric.rtoRate || 12,
                            dataSource: 'route',
                        };
                    } else if (perfDoc.overallMetrics) {
                        // Fall back to courier-level overall metrics
                        metrics = {
                            deliverySuccessRate:
                                perfDoc.overallMetrics.deliverySuccessRate || 85,
                            rtoRate: perfDoc.overallMetrics.rtoRate || 12,
                            dataSource: 'courier',
                        };
                    } else {
                        // No usable metrics - use defaults
                        metrics = { ...this.DEFAULT_METRICS };
                    }
                }

                // Cache and store
                await CacheService.set(cacheKey, metrics, this.CACHE_TTL_SEC);
                result.set(courierId, metrics);
            }

            logger.debug('Route intelligence batch lookup completed', {
                companyId,
                courierIds,
                fromPincode,
                toPincode,
                resultCount: result.size,
                dataSources: Array.from(result.values()).map((m) => m.dataSource),
            });

            return result;
        } catch (error) {
            logger.error('Route intelligence lookup failed, using defaults', {
                companyId,
                courierIds,
                error: error instanceof Error ? error.message : error,
            });

            // Fallback: return defaults for all couriers
            for (const courierId of courierIds) {
                result.set(courierId, { ...this.DEFAULT_METRICS });
            }

            return result;
        }
    }

    private getCacheKey(
        companyId: string,
        courierId: string,
        fromPincode: string,
        toPincode: string
    ): string {
        return `route-intel:${companyId}:${courierId}:${fromPincode}:${toPincode}`;
    }
}

export default new RouteIntelligenceService();
