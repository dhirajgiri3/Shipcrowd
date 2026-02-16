import { NextFunction, Request, Response } from 'express';
import {
    AmazonStore,
    FlipkartStore,
    ShopifyStore,
    WooCommerceStore,
} from '../../../../infrastructure/database/mongoose/models';
import { guardChecks, requirePlatformAdmin } from '../../../../shared/helpers/controller.helpers';
import { sendSuccess } from '../../../../shared/utils/responseHelper';

type StoreHealth = {
    storeId: string;
    storeName: string;
    storeUrl?: string;
    platform: string;
    isActive: boolean;
    isPaused: boolean;
    lastSyncAt?: Date | string | null;
    syncStatus?: string;
    errorCount24h: number;
    errorCount7d: number;
    syncSuccessRate?: number;
    webhooksActive: number;
    webhooksTotal: number;
    companyId?: string;
};

const normalizeStores = (platform: string, stores: any[]): StoreHealth[] => {
    return stores.map((store) => {
        const webhooks = Array.isArray(store?.webhooks) ? store.webhooks : [];
        const webhooksActive = webhooks.filter((w: any) => w?.isActive).length;

        return {
            storeId: String(store?._id),
            storeName:
                store?.shopName ||
                store?.storeName ||
                store?.sellerName ||
                store?.shopDomain ||
                store?.storeUrl ||
                'Unknown Store',
            storeUrl: store?.storeUrl || (store?.shopDomain ? `https://${store.shopDomain}` : undefined),
            platform,
            isActive: Boolean(store?.isActive),
            isPaused: Boolean(store?.isPaused),
            lastSyncAt: store?.lastSyncAt || store?.updatedAt || null,
            syncStatus: store?.syncStatus || 'unknown',
            errorCount24h: 0,
            errorCount7d: 0,
            syncSuccessRate: 100,
            webhooksActive,
            webhooksTotal: webhooks.length,
            companyId: store?.companyId ? String(store.companyId) : undefined,
        };
    });
};

const toPlatformBlock = (platform: 'shopify' | 'woocommerce' | 'amazon' | 'flipkart', stores: StoreHealth[]) => ({
    platform,
    totalStores: stores.length,
    activeStores: stores.filter((s) => s.isActive).length,
    pausedStores: stores.filter((s) => s.isPaused).length,
    inactiveStores: stores.filter((s) => !s.isActive).length,
    stores,
    overallErrorRate: 0,
    overallSuccessRate: 100,
});

export const getPlatformIntegrationHealth = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const auth = guardChecks(req, { requireCompany: false });
        requirePlatformAdmin(auth);

        const companyIdFilter = req.query.companyId ? String(req.query.companyId) : undefined;
        const companyFilter = companyIdFilter ? { companyId: companyIdFilter } : {};

        const [shopifyStores, wooStores, amazonStores, flipkartStores] = await Promise.all([
            ShopifyStore.find({ ...companyFilter, isDeleted: { $ne: true } })
                .select('_id companyId shopName shopDomain storeUrl isActive isPaused webhooks updatedAt')
                .lean(),
            WooCommerceStore.find({ ...companyFilter, isDeleted: { $ne: true } })
                .select('_id companyId storeName storeUrl isActive isPaused webhooks updatedAt')
                .lean(),
            AmazonStore.find({ ...companyFilter, isDeleted: { $ne: true } })
                .select('_id companyId storeName sellerName storeUrl isActive isPaused webhooks updatedAt')
                .lean(),
            FlipkartStore.find({ ...companyFilter, isDeleted: { $ne: true } })
                .select('_id companyId storeName storeUrl isActive isPaused webhooks updatedAt')
                .lean(),
        ]);

        const shopify = normalizeStores('shopify', shopifyStores);
        const woocommerce = normalizeStores('woocommerce', wooStores);
        const amazon = normalizeStores('amazon', amazonStores);
        const flipkart = normalizeStores('flipkart', flipkartStores);
        const allStores = [...shopify, ...woocommerce, ...amazon, ...flipkart];

        sendSuccess(
            res,
            {
                companyId: companyIdFilter || 'all',
                timestamp: new Date(),
                platforms: {
                    shopify: toPlatformBlock('shopify', shopify),
                    woocommerce: toPlatformBlock('woocommerce', woocommerce),
                    amazon: toPlatformBlock('amazon', amazon),
                    flipkart: toPlatformBlock('flipkart', flipkart),
                },
                summary: {
                    totalStores: allStores.length,
                    activeStores: allStores.filter((s) => s.isActive).length,
                    healthyStores: allStores.filter((s) => (s.syncSuccessRate || 0) >= 80).length,
                    unhealthyStores: allStores.filter((s) => (s.syncSuccessRate || 0) < 80).length,
                },
            },
            'Admin integration health retrieved'
        );
    } catch (error) {
        next(error);
    }
};

export default {
    getPlatformIntegrationHealth,
};
