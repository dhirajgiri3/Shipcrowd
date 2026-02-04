/**
 * Integration Health Service
 *
 * Purpose: Provide health monitoring data for e-commerce platform integrations
 * (Shopify, WooCommerce, Amazon, Flipkart).
 *
 * FEATURES:
 * - Active/inactive store counts
 * - Last sync timestamps
 * - Error rates and counts
 * - Sync success rates
 * - Webhook delivery status
 *
 * USAGE:
 * ```typescript
 * const health = await IntegrationHealthService.getHealth(companyId);
 * ```
 */

import {
    ShopifyStore,
    WooCommerceStore,
    AmazonStore,
    FlipkartStore,
    SyncLog,
    AmazonSyncLog,
    FlipkartSyncLog,
    WooCommerceSyncLog,
} from '../../../../infrastructure/database/mongoose/models';
import logger from '../../../../shared/logger/winston.logger';

interface StoreHealth {
    storeId: string;
    storeName: string;
    storeUrl?: string;
    platform: string;
    isActive: boolean;
    isPaused: boolean;
    lastSyncAt?: Date;
    syncStatus?: string;
    errorCount24h: number;
    errorCount7d: number;
    syncSuccessRate?: number;
    webhooksActive: number;
    webhooksTotal: number;
}

interface PlatformHealth {
    platform: 'shopify' | 'woocommerce' | 'amazon' | 'flipkart';
    totalStores: number;
    activeStores: number;
    pausedStores: number;
    inactiveStores: number;
    stores: StoreHealth[];
    overallErrorRate: number;
    overallSuccessRate: number;
}

interface IntegrationHealthResponse {
    companyId: string;
    timestamp: Date;
    platforms: {
        shopify?: PlatformHealth;
        woocommerce?: PlatformHealth;
        amazon?: PlatformHealth;
        flipkart?: PlatformHealth;
    };
    summary: {
        totalStores: number;
        activeStores: number;
        healthyStores: number;
        unhealthyStores: number;
    };
}

export class IntegrationHealthService {
    /**
     * Get comprehensive health data for all platform integrations
     *
     * @param companyId - Company ID
     * @returns Complete health status
     */
    static async getHealth(companyId: string): Promise<IntegrationHealthResponse> {
        try {
            // Fetch data concurrently
            const [shopifyData, woocommerceData, amazonData, flipkartData] = await Promise.all([
                this.getShopifyHealth(companyId),
                this.getWooCommerceHealth(companyId),
                this.getAmazonHealth(companyId),
                this.getFlipkartHealth(companyId),
            ]);

            // Calculate summary metrics
            const summary = {
                totalStores:
                    (shopifyData?.totalStores || 0) +
                    (woocommerceData?.totalStores || 0) +
                    (amazonData?.totalStores || 0) +
                    (flipkartData?.totalStores || 0),
                activeStores:
                    (shopifyData?.activeStores || 0) +
                    (woocommerceData?.activeStores || 0) +
                    (amazonData?.activeStores || 0) +
                    (flipkartData?.activeStores || 0),
                healthyStores: 0,
                unhealthyStores: 0,
            };

            // Count healthy/unhealthy stores
            const allStores = [
                ...(shopifyData?.stores || []),
                ...(woocommerceData?.stores || []),
                ...(amazonData?.stores || []),
                ...(flipkartData?.stores || []),
            ];

            allStores.forEach(store => {
                if (store.errorCount24h < 5 && store.syncSuccessRate && store.syncSuccessRate > 80) {
                    summary.healthyStores++;
                } else {
                    summary.unhealthyStores++;
                }
            });

            return {
                companyId,
                timestamp: new Date(),
                platforms: {
                    shopify: shopifyData || undefined,
                    woocommerce: woocommerceData || undefined,
                    amazon: amazonData || undefined,
                    flipkart: flipkartData || undefined,
                },
                summary,
            };
        } catch (error: any) {
            logger.error('Failed to get integration health', {
                companyId,
                error: error.message,
            });
            throw error;
        }
    }

    /**
     * Get Shopify integration health
     */
    private static async getShopifyHealth(companyId: string): Promise<PlatformHealth | null> {
        try {
            const stores = await ShopifyStore.find({ companyId }).lean();

            if (stores.length === 0) {
                return null;
            }

            const storeHealth: StoreHealth[] = await Promise.all(
                stores.map(async (store: any) => {
                    // Get error counts from sync logs
                    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
                    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

                    const [errors24h, errors7d, recentLogs] = await Promise.all([
                        SyncLog.countDocuments({
                            storeId: store._id,
                            integrationType: 'SHOPIFY',
                            status: 'FAILED',
                            startedAt: { $gte: oneDayAgo },
                        }),
                        SyncLog.countDocuments({
                            storeId: store._id,
                            integrationType: 'SHOPIFY',
                            status: 'FAILED',
                            startedAt: { $gte: sevenDaysAgo },
                        }),
                        SyncLog.find({
                            storeId: store._id,
                            integrationType: 'SHOPIFY',
                            startedAt: { $gte: sevenDaysAgo },
                        })
                            .sort({ startedAt: -1 })
                            .limit(100)
                            .lean(),
                    ]);

                    // Calculate success rate
                    const totalSyncs = recentLogs.length;
                    const successfulSyncs = recentLogs.filter((log: any) => log.status === 'SUCCESS').length;
                    const syncSuccessRate = totalSyncs > 0 ? (successfulSyncs / totalSyncs) * 100 : 100;

                    // Get last successful sync
                    const lastSync = recentLogs.find((log: any) => log.status === 'SUCCESS');

                    return {
                        storeId: store._id.toString(),
                        storeName: store.storeName || store.shopDomain,
                        storeUrl: `https://${store.shopDomain}`,
                        platform: 'shopify',
                        isActive: store.isActive,
                        isPaused: store.isPaused || false,
                        lastSyncAt: lastSync?.completedAt,
                        syncStatus: store.syncConfig?.order?.status || 'UNKNOWN',
                        errorCount24h: errors24h,
                        errorCount7d: errors7d,
                        syncSuccessRate: Math.round(syncSuccessRate * 10) / 10,
                        webhooksActive: store.webhooks?.filter((w: any) => w.isActive).length || 0,
                        webhooksTotal: store.webhooks?.length || 0,
                    };
                })
            );

            const activeStores = stores.filter((s: any) => s.isActive).length;
            const pausedStores = stores.filter((s: any) => s.isPaused).length;

            // Calculate overall error and success rates
            const totalErrors = storeHealth.reduce((sum, s) => sum + s.errorCount7d, 0);
            const avgSuccessRate =
                storeHealth.reduce((sum, s) => sum + (s.syncSuccessRate || 0), 0) / storeHealth.length;

            return {
                platform: 'shopify',
                totalStores: stores.length,
                activeStores,
                pausedStores,
                inactiveStores: stores.length - activeStores,
                stores: storeHealth,
                overallErrorRate: totalErrors,
                overallSuccessRate: Math.round(avgSuccessRate * 10) / 10,
            };
        } catch (error: any) {
            logger.error('Failed to get Shopify health', {
                companyId,
                error: error.message,
            });
            return null;
        }
    }

    /**
     * Get WooCommerce integration health
     */
    private static async getWooCommerceHealth(companyId: string): Promise<PlatformHealth | null> {
        try {
            const stores = await WooCommerceStore.find({ companyId }).lean();

            if (stores.length === 0) {
                return null;
            }

            const storeHealth: StoreHealth[] = await Promise.all(
                stores.map(async (store: any) => {
                    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
                    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

                    const [errors24h, errors7d, recentLogs] = await Promise.all([
                        WooCommerceSyncLog.countDocuments({
                            storeId: store._id,
                            status: 'FAILED',
                            startedAt: { $gte: oneDayAgo },
                        }),
                        WooCommerceSyncLog.countDocuments({
                            storeId: store._id,
                            status: 'FAILED',
                            startedAt: { $gte: sevenDaysAgo },
                        }),
                        WooCommerceSyncLog.find({
                            storeId: store._id,
                            startedAt: { $gte: sevenDaysAgo },
                        })
                            .sort({ startedAt: -1 })
                            .limit(100)
                            .lean(),
                    ]);

                    const totalSyncs = recentLogs.length;
                    const successfulSyncs = recentLogs.filter((log: any) => log.status === 'COMPLETED').length;
                    const syncSuccessRate = totalSyncs > 0 ? (successfulSyncs / totalSyncs) * 100 : 100;

                    const lastSync = recentLogs.find((log: any) => log.status === 'COMPLETED');

                    return {
                        storeId: store._id.toString(),
                        storeName: store.storeName || store.storeUrl,
                        storeUrl: store.storeUrl,
                        platform: 'woocommerce',
                        isActive: store.isActive,
                        isPaused: store.isPaused || false,
                        lastSyncAt: lastSync?.endTime,
                        syncStatus: store.syncConfig?.orderSync?.syncStatus || 'UNKNOWN',
                        errorCount24h: errors24h,
                        errorCount7d: errors7d,
                        syncSuccessRate: Math.round(syncSuccessRate * 10) / 10,
                        webhooksActive: store.webhooks?.filter((w: any) => w.isActive).length || 0,
                        webhooksTotal: store.webhooks?.length || 0,
                    };
                })
            );

            const activeStores = stores.filter((s: any) => s.isActive).length;
            const pausedStores = stores.filter((s: any) => s.isPaused).length;

            const totalErrors = storeHealth.reduce((sum, s) => sum + s.errorCount7d, 0);
            const avgSuccessRate =
                storeHealth.reduce((sum, s) => sum + (s.syncSuccessRate || 0), 0) / storeHealth.length;

            return {
                platform: 'woocommerce',
                totalStores: stores.length,
                activeStores,
                pausedStores,
                inactiveStores: stores.length - activeStores,
                stores: storeHealth,
                overallErrorRate: totalErrors,
                overallSuccessRate: Math.round(avgSuccessRate * 10) / 10,
            };
        } catch (error: any) {
            logger.error('Failed to get WooCommerce health', {
                companyId,
                error: error.message,
            });
            return null;
        }
    }

    /**
     * Get Amazon integration health
     */
    private static async getAmazonHealth(companyId: string): Promise<PlatformHealth | null> {
        try {
            const stores = await AmazonStore.find({ companyId }).lean();

            if (stores.length === 0) {
                return null;
            }

            const storeHealth: StoreHealth[] = await Promise.all(
                stores.map(async (store: any) => {
                    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
                    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

                    const [errors24h, errors7d, recentLogs] = await Promise.all([
                        AmazonSyncLog.countDocuments({
                            storeId: store._id,
                            status: 'FAILED',
                            startedAt: { $gte: oneDayAgo },
                        }),
                        AmazonSyncLog.countDocuments({
                            storeId: store._id,
                            status: 'FAILED',
                            startedAt: { $gte: sevenDaysAgo },
                        }),
                        AmazonSyncLog.find({
                            storeId: store._id,
                            startedAt: { $gte: sevenDaysAgo },
                        })
                            .sort({ startedAt: -1 })
                            .limit(100)
                            .lean(),
                    ]);

                    const totalSyncs = recentLogs.length;
                    const successfulSyncs = recentLogs.filter((log: any) => log.status === 'SUCCESS').length;
                    const syncSuccessRate = totalSyncs > 0 ? (successfulSyncs / totalSyncs) * 100 : 100;

                    const lastSync = recentLogs.find((log: any) => log.status === 'COMPLETED');

                    return {
                        storeId: store._id.toString(),
                        storeName: store.sellerName || store.sellerId,
                        storeUrl: undefined,
                        platform: 'amazon',
                        isActive: store.isActive,
                        isPaused: store.isPaused || false,
                        lastSyncAt: lastSync?.endTime,
                        syncStatus: store.syncConfig?.orderSync?.syncStatus || 'UNKNOWN',
                        errorCount24h: errors24h,
                        errorCount7d: errors7d,
                        syncSuccessRate: Math.round(syncSuccessRate * 10) / 10,
                        webhooksActive: store.webhooks?.filter((w: any) => w.isActive).length || 0,
                        webhooksTotal: store.webhooks?.length || 0,
                    };
                })
            );

            const activeStores = stores.filter((s: any) => s.isActive).length;
            const pausedStores = stores.filter((s: any) => s.isPaused).length;

            const totalErrors = storeHealth.reduce((sum, s) => sum + s.errorCount7d, 0);
            const avgSuccessRate =
                storeHealth.reduce((sum, s) => sum + (s.syncSuccessRate || 0), 0) / storeHealth.length;

            return {
                platform: 'amazon',
                totalStores: stores.length,
                activeStores,
                pausedStores,
                inactiveStores: stores.length - activeStores,
                stores: storeHealth,
                overallErrorRate: totalErrors,
                overallSuccessRate: Math.round(avgSuccessRate * 10) / 10,
            };
        } catch (error: any) {
            logger.error('Failed to get Amazon health', {
                companyId,
                error: error.message,
            });
            return null;
        }
    }

    /**
     * Get Flipkart integration health
     */
    private static async getFlipkartHealth(companyId: string): Promise<PlatformHealth | null> {
        try {
            const stores = await FlipkartStore.find({ companyId }).lean();

            if (stores.length === 0) {
                return null;
            }

            const storeHealth: StoreHealth[] = await Promise.all(
                stores.map(async (store: any) => {
                    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
                    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

                    const [errors24h, errors7d, recentLogs] = await Promise.all([
                        FlipkartSyncLog.countDocuments({
                            storeId: store._id,
                            status: 'FAILED',
                            startedAt: { $gte: oneDayAgo },
                        }),
                        FlipkartSyncLog.countDocuments({
                            storeId: store._id,
                            status: 'FAILED',
                            startedAt: { $gte: sevenDaysAgo },
                        }),
                        FlipkartSyncLog.find({
                            storeId: store._id,
                            startedAt: { $gte: sevenDaysAgo },
                        })
                            .sort({ startedAt: -1 })
                            .limit(100)
                            .lean(),
                    ]);

                    const totalSyncs = recentLogs.length;
                    const successfulSyncs = recentLogs.filter((log: any) => log.status === 'SUCCESS').length;
                    const syncSuccessRate = totalSyncs > 0 ? (successfulSyncs / totalSyncs) * 100 : 100;

                    const lastSync = recentLogs.find((log: any) => log.status === 'COMPLETED');

                    return {
                        storeId: store._id.toString(),
                        storeName: store.sellerName || store.sellerId,
                        storeUrl: store.storeUrl,
                        platform: 'flipkart',
                        isActive: store.isActive,
                        isPaused: store.isPaused || false,
                        lastSyncAt: lastSync?.endTime,
                        syncStatus: store.syncConfig?.orderSync?.syncStatus || 'UNKNOWN',
                        errorCount24h: errors24h,
                        errorCount7d: errors7d,
                        syncSuccessRate: Math.round(syncSuccessRate * 10) / 10,
                        webhooksActive: store.webhooks?.filter((w: any) => w.isActive).length || 0,
                        webhooksTotal: store.webhooks?.length || 0,
                    };
                })
            );

            const activeStores = stores.filter((s: any) => s.isActive).length;
            const pausedStores = stores.filter((s: any) => s.isPaused).length;

            const totalErrors = storeHealth.reduce((sum, s) => sum + s.errorCount7d, 0);
            const avgSuccessRate =
                storeHealth.reduce((sum, s) => sum + (s.syncSuccessRate || 0), 0) / storeHealth.length;

            return {
                platform: 'flipkart',
                totalStores: stores.length,
                activeStores,
                pausedStores,
                inactiveStores: stores.length - activeStores,
                stores: storeHealth,
                overallErrorRate: totalErrors,
                overallSuccessRate: Math.round(avgSuccessRate * 10) / 10,
            };
        } catch (error: any) {
            logger.error('Failed to get Flipkart health', {
                companyId,
                error: error.message,
            });
            return null;
        }
    }
}

export default IntegrationHealthService;
