/**
 * React Query Key Factory
 *
 * Centralized query key management for all API endpoints.
 * Provides type-safe, consistent cache keys across the application.
 *
 * Benefits:
 * - Single source of truth for cache keys
 * - Easier cache invalidation strategies
 * - Prevents accidental key mismatches
 * - Type-safe query key construction
 *
 * Usage:
 * @example
 * const { data } = useQuery({
 *   queryKey: queryKeys.orders.list({ status: 'pending' }),
 *   queryFn: () => fetchOrders(),
 * });
 *
 * // Invalidate related queries on mutation
 * queryClient.invalidateQueries({
 *   queryKey: queryKeys.orders.all(),
 * });
 */

// ============================================================================
// Type Definitions
// ============================================================================

export interface ListParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface FilterParams extends ListParams {
  status?: string;
  search?: string;
  filters?: Record<string, any>;
}

export interface DateRangeParams {
  startDate?: string;
  endDate?: string;
}

// ============================================================================
// Query Keys Factory
// ============================================================================

export const queryKeys = {
  // ========================================================================
  // USERS DOMAIN
  // ========================================================================
  users: {
    all: () => ['users'],
    list: (params?: FilterParams) => ['users', 'list', params],
    detail: (id: string) => ['users', 'detail', id],
    profile: () => ['users', 'profile'],
    permissions: (userId: string) => ['users', userId, 'permissions'],
    settings: () => ['users', 'settings'],
    mfa: () => ['users', 'mfa'],
  },

  // ========================================================================
  // ORDERS DOMAIN
  // ========================================================================
  orders: {
    all: () => ['orders'],
    list: (params?: FilterParams) => ['orders', 'list', params],
    detail: (id: string) => ['orders', 'detail', id],
    byShipment: (shipmentId: string) => ['orders', 'shipment', shipmentId],
    bulk: (ids: string[]) => ['orders', 'bulk', ids.sort()],
    create: () => ['orders', 'create'],
    status: (id: string) => ['orders', id, 'status'],
  },

  // ========================================================================
  // SHIPMENTS DOMAIN
  // ========================================================================
  shipments: {
    all: () => ['shipments'],
    list: (params?: FilterParams) => ['shipments', 'list', params],
    detail: (id: string) => ['shipments', 'detail', id],
    tracking: (trackingNumber: string) => ['shipments', 'tracking', trackingNumber],
    label: (shipmentId: string) => ['shipments', shipmentId, 'label'],
    manifest: (manifestId: string) => ['shipments', 'manifest', manifestId],
    bulk: (ids: string[]) => ['shipments', 'bulk', ids.sort()],
    create: () => ['shipments', 'create'],
    ndr: (shipmentId: string) => ['shipments', shipmentId, 'ndr'],
  },

  // ========================================================================
  // ANALYTICS DOMAIN
  // ========================================================================
  analytics: {
    all: () => ['analytics'],
    dashboard: (filters?: any) => ['analytics', 'dashboard', filters],
    revenue: (period?: '7d' | '30d' | '90d' | '1y') =>
      ['analytics', 'revenue', period || '30d'],
    shipments: (period?: '7d' | '30d' | '90d') =>
      ['analytics', 'shipments', period || '30d'],
    courierPerformance: (period?: string) =>
      ['analytics', 'courier-performance', period || '30d'],
    sellerActions: () => ['analytics', 'seller-actions'],
    recentCustomers: (limit?: number) =>
      ['analytics', 'customers', 'recent', limit || 5],
    topRoutes: (limit?: number) =>
      ['analytics', 'routes', 'top', limit || 10],
    trends: (metric: string, period?: string) =>
      ['analytics', 'trends', metric, period || '30d'],
    costs: (period?: string) =>
      ['analytics', 'costs', period || '30d'],

    // New advanced analytics keys
    savedReports: () => ['analytics', 'reports', 'saved'],
    report: (reportId: string) => ['analytics', 'reports', reportId],
    sla: (filters?: any) => ['analytics', 'sla', filters],
    slaByCourier: (courierId: string, filters?: any) => ['analytics', 'sla', 'courier', courierId, filters],
    courierComparison: (filters?: any) => ['analytics', 'courier-comparison', filters],
    cost: (filters?: any) => ['analytics', 'cost', filters],
    costTrend: (filters?: any) => ['analytics', 'cost', 'trend', filters],
    zones: (filters?: any) => ['analytics', 'zones', filters],
    topCouriers: (limit?: number, filters?: any) => ['analytics', 'top-couriers', limit, filters],
    trend: (metric: string, filters?: any) => ['analytics', 'trend', metric, filters],
  },

  // ========================================================================
  // INTEGRATIONS DOMAIN
  // ========================================================================
  integrations: {
    all: () => ['integrations'],
    list: () => ['integrations', 'list'],
    detail: (id: string) => ['integrations', 'detail', id],
    syncing: () => ['integrations', 'syncing'],
    health: (integrationId: string) => ['integrations', integrationId, 'health'],
    sync: (integrationId: string) => ['integrations', integrationId, 'sync'],
    shopify: {
      all: () => ['integrations', 'shopify'],
      detail: (storeId: string) => ['integrations', 'shopify', storeId],
      health: (storeId: string) => ['integrations', 'shopify', storeId, 'health'],
    },
    woocommerce: {
      all: () => ['integrations', 'woocommerce'],
      detail: (storeId: string) => ['integrations', 'woocommerce', storeId],
    },
    amazon: {
      all: () => ['integrations', 'amazon'],
      detail: (storeId: string) => ['integrations', 'amazon', storeId],
    },
    flipkart: {
      all: () => ['integrations', 'flipkart'],
      detail: (storeId: string) => ['integrations', 'flipkart', storeId],
    },
  },

  // ========================================================================
  // WAREHOUSES DOMAIN
  // ========================================================================
  warehouses: {
    all: () => ['warehouses'],
    list: (params?: ListParams) => ['warehouses', 'list', params],
    detail: (id: string) => ['warehouses', 'detail', id],
    inventory: (warehouseId: string) => ['warehouses', warehouseId, 'inventory'],
    create: () => ['warehouses', 'create'],
  },

  // ========================================================================
  // RATE CARDS DOMAIN
  // ========================================================================
  rateCards: {
    all: () => ['rate-cards'],
    list: (params?: ListParams) => ['rate-cards', 'list', params],
    detail: (id: string) => ['rate-cards', 'detail', id],
    byCarrier: (carrierId: string) => ['rate-cards', 'carrier', carrierId],
    comparison: (carrierIds: string[]) =>
      ['rate-cards', 'comparison', carrierIds.sort()],
    zones: () => ['rate-cards', 'zones'],
  },

  // ========================================================================
  // FINANCE DOMAIN
  // ========================================================================
  finance: {
    all: () => ['finance'],
    overview: () => ['finance', 'overview'],
    invoices: (params?: FilterParams) => ['finance', 'invoices', params],
    invoice: (invoiceId: string) => ['finance', 'invoice', invoiceId],
    settlements: (params?: FilterParams) => ['finance', 'settlements', params],
    settlement: (settlementId: string) => ['finance', 'settlement', settlementId],
    payouts: (params?: FilterParams) => ['finance', 'payouts', params],
    payout: (payoutId: string) => ['finance', 'payout', payoutId],
    gst: {
      all: () => ['finance', 'gst'],
      status: () => ['finance', 'gst', 'status'],
      irn: (shipmentId: string) => ['finance', 'gst', 'irn', shipmentId],
    },
  },

  // ========================================================================
  // WALLET DOMAIN
  // ========================================================================
  wallet: {
    all: () => ['wallet'],
    balance: () => ['wallet', 'balance'],
    transactions: (params?: FilterParams) => ['wallet', 'transactions', params],
    history: (limit?: number) => ['wallet', 'history', limit || 50],
    stats: (dateRange?: { start: string; end: string }) => ['wallet', 'stats', dateRange],
    topup: () => ['wallet', 'topup'],
    withdraw: () => ['wallet', 'withdraw'],
    settings: () => ['wallet', 'settings'],
  },

  // ========================================================================
  // COD MANAGEMENT DOMAIN
  // ========================================================================
  cod: {
    all: () => ['cod'],
    remittances: (params?: FilterParams) => ['cod', 'remittances', params],
    remittance: (remittanceId: string) => ['cod', 'remittance', remittanceId],
    orders: (params?: FilterParams) => ['cod', 'orders', params],
    analytics: (period?: string) => ['cod', 'analytics', period || '30d'],
  },

  // ========================================================================
  // RETURNS DOMAIN
  // ========================================================================
  returns: {
    all: () => ['returns'],
    list: (params?: FilterParams) => ['returns', 'list', params],
    detail: (id: string) => ['returns', 'detail', id],
    qc: (returnId: string) => ['returns', returnId, 'qc'],
    analytics: (period?: string) => ['returns', 'analytics', period || '30d'],
  },

  // ========================================================================
  // WEIGHT DISPUTES DOMAIN
  // ========================================================================
  disputes: {
    all: () => ['disputes'],
    list: (params?: FilterParams) => ['disputes', 'list', params],
    detail: (id: string) => ['disputes', 'detail', id],
    metrics: (dateRange?: DateRangeParams) => ['disputes', 'metrics', dateRange],
    analytics: (filters?: any) => ['disputes', 'analytics', filters],
    weight: {
      all: () => ['disputes', 'weight'],
      list: (params?: FilterParams) => ['disputes', 'weight', 'list', params],
      detail: (id: string) => ['disputes', 'weight', 'detail', id],
    },
    other: {
      all: () => ['disputes', 'other'],
      list: (params?: FilterParams) => ['disputes', 'other', 'list', params],
    },
  },

  // ========================================================================
  // KYC DOMAIN
  // ========================================================================
  kyc: {
    all: () => ['kyc'],
    status: () => ['kyc', 'status'],
    details: () => ['kyc', 'details'],
    documents: () => ['kyc', 'documents'],
    upload: () => ['kyc', 'upload'],
  },

  // ========================================================================
  // COMPANY DOMAIN
  // ========================================================================
  company: {
    all: () => ['company'],
    profile: () => ['company', 'profile'],
    settings: () => ['company', 'settings'],
    users: (params?: ListParams) => ['company', 'users', params],
    teams: () => ['company', 'teams'],
    integrations: () => ['company', 'integrations'],
    apiKeys: () => ['company', 'api-keys'],
  },

  // ========================================================================
  // NDR (Non-Delivery Report) DOMAIN
  // ========================================================================
  ndr: {
    all: () => ['ndr'],
    list: (filters?: FilterParams) => ['ndr', 'cases', 'list', filters],
    detail: (id: string) => ['ndr', 'cases', 'detail', id],
    metrics: () => ['ndr', 'metrics'],
    analytics: (filters?: DateRangeParams) => ['ndr', 'analytics', filters],
    settings: () => ['ndr', 'settings'],
  },

  // ========================================================================
  // COMMUNICATION DOMAIN
  // ========================================================================
  communication: {
    all: () => ['communication'],
    templates: () => ['communication', 'templates'],
    templates_list: (type?: string) => ['communication', 'templates', 'list', type],
    template: (id: string) => ['communication', 'template', id],
    rules: () => ['communication', 'rules'],
    rules_list: (filters?: any) => ['communication', 'rules', 'list', filters],
    rule: (id: string) => ['communication', 'rule', id],
    history: (params?: FilterParams) => ['communication', 'history', params],
    campaigns: (params?: FilterParams) => ['communication', 'campaigns', params],
  },

  // ========================================================================
  // TRACKING DOMAIN (PUBLIC)
  // ========================================================================
  tracking: {
    all: () => ['tracking'],
    byAwb: (awb: string) => ['tracking', 'awb', awb],
    byTrackingNumber: (trackingNumber: string) => ['tracking', 'tracking-number', trackingNumber],
    byOrderId: (orderId: string) => ['tracking', 'order', orderId],
    timeline: (shipmentId: string) => ['tracking', shipmentId, 'timeline'],
  },

  // ========================================================================
  // ADDRESS & SERVICEABILITY DOMAIN
  // ========================================================================
  address: {
    all: () => ['address'],
    serviceability: (pincode: string) => ['address', 'serviceability', pincode],
    routeServiceability: (origin: string, destination: string) =>
      ['address', 'serviceability', 'route', origin, destination],
    cityState: (pincode: string) => ['address', 'city-state', pincode],
    bulkValidation: (batchId: string) => ['address', 'bulk-validation', batchId],
    suggestions: (query: string) => ['address', 'suggestions', query],
  },

  // ========================================================================
  // MANIFESTS DOMAIN
  // ========================================================================
  manifests: {
    all: () => ['manifests'],
    list: (filters?: any) => ['manifests', 'list', filters],
    detail: (id: string) => ['manifests', 'detail', id],
    stats: () => ['manifests', 'stats'],
    byStatus: (status: string) => ['manifests', 'status', status],
    byCourier: (courier: string) => ['manifests', 'courier', courier],
    pendingReconciliation: () => ['manifests', 'pending-reconciliation'],
    eligibleShipments: (courier?: string) => ['manifests', 'eligible-shipments', courier],
  },

  // ========================================================================
  // ADMIN ACTIONS DOMAIN
  // ========================================================================
  adminActions: {
    all: () => ['admin', 'actions'],
    list: (params?: FilterParams) => ['admin', 'actions', 'list', params],
  },

  // ========================================================================
  // SELLER ACTIONS DOMAIN
  // ========================================================================
  sellerActions: {
    all: () => ['seller', 'actions'],
    list: (params?: FilterParams) => ['seller', 'actions', 'list', params],
  },


  // ========================================================================
  // ECOMMERCE INTEGRATIONS DOMAIN
  // ========================================================================
  ecommerce: {
    all: () => ['ecommerce'],
    integrations: () => ['ecommerce', 'integrations'],
    integration: (id: string) => ['ecommerce', 'integration', id],
    integrationsList: (filters?: any) => ['ecommerce', 'integrations', 'list', filters],
    syncLogs: (integrationId: string) => ['ecommerce', 'sync-logs', integrationId],
    syncHistory: (integrationId: string, params?: any) => ['ecommerce', 'sync-history', integrationId, params],
    testConnection: (type: string) => ['ecommerce', 'test-connection', type],
  },

  // ========================================================================
  // FRAUD DETECTION DOMAIN
  // ========================================================================
  fraud: {
    all: () => ['fraud'],
    alerts: (filters?: any) => ['fraud', 'alerts', filters],
    alert: (id: string) => ['fraud', 'alert', id],
    stats: () => ['fraud', 'stats'],
    rules: () => ['fraud', 'rules'],
    blockedEntities: () => ['fraud', 'blocked'],
  },

  // ========================================================================
  // SETTINGS DOMAIN
  // ========================================================================
  settings: {
    all: () => ['settings'],
    profile: () => ['settings', 'profile'],
    security: () => ['settings', 'security'],
    notifications: () => ['settings', 'notifications'],
    webhooks: () => ['settings', 'webhooks'],
    webhookLogs: (webhookId: string) => ['settings', 'webhooks', webhookId, 'logs'],
    teamMembers: () => ['settings', 'team'],
    auditLogs: (filters?: any) => ['settings', 'audit-logs', filters],
    subscription: () => ['settings', 'subscription'],
    plans: () => ['settings', 'plans'],
    billing: () => ['settings', 'billing'],
    apiKeys: () => ['settings', 'api-keys'],
  },
};

// ============================================================================
// Cache Invalidation Helpers
// ============================================================================

/**
 * Get all related query keys that should be invalidated on specific mutations
 * Use with queryClient.invalidateQueries()
 */
export const cacheInvalidation = {
  // When order is created/updated
  onOrderMutation: () => [
    { queryKey: queryKeys.orders.all(), exact: false },
    { queryKey: queryKeys.analytics.dashboard(), exact: false },
    { queryKey: queryKeys.sellerActions.all(), exact: false },
  ],

  // When shipment is created/updated
  onShipmentMutation: () => [
    { queryKey: queryKeys.shipments.all(), exact: false },
    { queryKey: queryKeys.orders.all(), exact: false },
    { queryKey: queryKeys.analytics.all(), exact: false },
    { queryKey: queryKeys.tracking.all(), exact: false },
  ],

  // When wallet balance changes
  onWalletMutation: () => [
    { queryKey: queryKeys.wallet.all(), exact: false },
    { queryKey: queryKeys.finance.all(), exact: false },
  ],

  // When integration syncs
  onIntegrationSync: () => [
    { queryKey: queryKeys.integrations.all(), exact: false },
    { queryKey: queryKeys.orders.all(), exact: false },
    { queryKey: queryKeys.analytics.all(), exact: false },
  ],

  // When user profile updates
  onProfileUpdate: () => [
    { queryKey: queryKeys.users.profile(), exact: true },
    { queryKey: queryKeys.settings.all(), exact: false },
    { queryKey: queryKeys.company.all(), exact: false },
  ],
};

// ============================================================================
// Export for use in hooks
// ============================================================================

export default queryKeys;
