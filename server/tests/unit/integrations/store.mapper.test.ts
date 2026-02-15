import { describe, expect, it } from '@jest/globals';
import { applyDefaultsToSettings, applyDefaultsToSyncConfig, toEcommerceStoreDTO } from '../../../src/core/mappers/store.mapper';

describe('store.mapper', () => {
  it('applies default settings', () => {
    const settings = applyDefaultsToSettings({ autoFulfill: false });
    expect(settings.autoFulfill).toBe(false);
    expect(settings.syncFrequency).toBe('EVERY_15_MIN');
    expect(settings.notifications.syncErrors).toBe(true);
  });

  it('applies default sync config', () => {
    const syncConfig = applyDefaultsToSyncConfig({ orderSync: { syncInterval: 30 } });
    expect(syncConfig.orderSync.syncInterval).toBe(30);
    expect(syncConfig.orderSync.autoSync).toBe(true);
    expect(syncConfig.webhooksEnabled).toBe(true);
  });

  it('maps to EcommerceStoreDTO with platform fields', () => {
    const store = {
      _id: 'store123',
      shopDomain: 'demo.myshopify.com',
      shopName: 'Demo Shop',
      isActive: true,
      isPaused: false,
      syncConfig: { orderSync: { syncInterval: 15, autoSync: true }, webhooksEnabled: true },
      settings: {},
      stats: { totalOrdersSynced: 5, lastOrderSyncAt: new Date('2025-01-01') },
    };

    const dto = toEcommerceStoreDTO(store, 'shopify');
    expect(dto.storeId).toBe('store123');
    expect(dto.platform).toBe('shopify');
    expect(dto.storeName).toBe('Demo Shop');
    expect(dto.storeUrl).toBe('https://demo.myshopify.com');
    expect(dto.syncConfig.intervalMinutes).toBe(15);
  });
});
