import { EcommerceStoreDTO } from '../dtos/ecommerce-store.dto';
import { DEFAULT_STORE_SETTINGS, DEFAULT_SYNC_CONFIG } from '../../config/integration.defaults';

const safeNumber = (value: any, fallback: number) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  return fallback;
};

export const applyDefaultsToSettings = (settings: any = {}): Record<string, any> => {
  return {
    ...DEFAULT_STORE_SETTINGS,
    ...settings,
    orderFilters: {
      ...DEFAULT_STORE_SETTINGS.orderFilters,
      ...(settings?.orderFilters || {}),
    },
    notifications: {
      ...DEFAULT_STORE_SETTINGS.notifications,
      ...(settings?.notifications || {}),
    },
  };
};

export const applyDefaultsToSyncConfig = (syncConfig: any = {}): any => {
  return {
    ...DEFAULT_SYNC_CONFIG,
    ...syncConfig,
    orderSync: {
      ...DEFAULT_SYNC_CONFIG.orderSync,
      ...(syncConfig?.orderSync || {}),
    },
    inventorySync: {
      ...DEFAULT_SYNC_CONFIG.inventorySync,
      ...(syncConfig?.inventorySync || {}),
    },
    webhooksEnabled:
      typeof syncConfig?.webhooksEnabled === 'boolean'
        ? syncConfig.webhooksEnabled
        : DEFAULT_SYNC_CONFIG.webhooksEnabled,
  };
};

export const toEcommerceStoreDTO = (
  store: any,
  platform: EcommerceStoreDTO['platform']
): EcommerceStoreDTO => {
  const settings = applyDefaultsToSettings(store?.settings || {});
  const syncConfig = applyDefaultsToSyncConfig(store?.syncConfig || {});

  const intervalMinutes = safeNumber(syncConfig?.orderSync?.syncInterval, DEFAULT_SYNC_CONFIG.orderSync.syncInterval);
  const autoSync = Boolean(syncConfig?.orderSync?.autoSync);
  const webhooksEnabled = Boolean(syncConfig?.webhooksEnabled);

  const stats = store?.stats || {};
  const lastSyncAt = stats?.lastSyncAt || stats?.lastOrderSyncAt;
  const orderCount = safeNumber(stats?.totalOrdersSynced, 0);

  return {
    storeId: store?._id?.toString?.() || store?.storeId || store?.id,
    externalStoreId:
      platform === 'shopify'
        ? store?.shopDomain
        : platform === 'woocommerce'
          ? store?.storeUrl
          : platform === 'amazon'
            ? store?.sellerId
            : store?.sellerId,
    platform,
    storeName:
      store?.storeName ||
      store?.shopName ||
      store?.sellerName ||
      store?.shopDomain ||
      'Unknown Store',
    storeUrl:
      store?.storeUrl ||
      (platform === 'shopify' && store?.shopDomain ? `https://${store.shopDomain}` : undefined),
    connectedAt: store?.connectedAt || store?.installedAt || store?.createdAt,
    isActive: Boolean(store?.isActive),
    isPaused: Boolean(store?.isPaused),
    stats: {
      lastOrderAt: stats?.lastOrderSyncAt,
      orderCount,
      lastSyncAt,
    },
    settings,
    syncConfig: {
      intervalMinutes,
      autoSync,
      webhooksEnabled,
    },
  };
};
