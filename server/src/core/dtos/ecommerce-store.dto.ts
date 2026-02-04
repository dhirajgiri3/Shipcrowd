export interface EcommerceStoreDTO {
  storeId: string;
  externalStoreId?: string;
  platform: 'shopify' | 'woocommerce' | 'amazon' | 'flipkart';
  storeName: string;
  storeUrl?: string;
  connectedAt?: Date;
  isActive: boolean;
  isPaused?: boolean;
  stats?: {
    lastOrderAt?: Date;
    orderCount?: number;
    lastSyncAt?: Date;
  };
  settings: Record<string, any>;
  syncConfig: {
    intervalMinutes: number;
    autoSync: boolean;
    webhooksEnabled: boolean;
  };
}
