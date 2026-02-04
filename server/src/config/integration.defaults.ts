/**
 * Integration Defaults
 *
 * Shared defaults for ecommerce integration settings and sync configuration.
 */

export const DEFAULT_STORE_SETTINGS = {
  syncFrequency: 'EVERY_15_MIN',
  autoFulfill: true,
  autoTrackingUpdate: true,
  syncHistoricalOrders: false,
  historicalOrderDays: 30,
  orderFilters: {
    minOrderValue: undefined,
    maxOrderValue: undefined,
    statusFilters: [],
    excludeStatuses: [],
  },
  notifications: {
    syncErrors: true,
    connectionIssues: true,
    lowInventory: false,
  },
};

export const DEFAULT_SYNC_CONFIG = {
  orderSync: {
    enabled: true,
    autoSync: true,
    syncInterval: 15,
    syncStatus: 'IDLE',
    errorCount: 0,
  },
  inventorySync: {
    enabled: true,
    autoSync: false,
    syncDirection: 'ONE_WAY',
    errorCount: 0,
  },
  webhooksEnabled: true,
};
