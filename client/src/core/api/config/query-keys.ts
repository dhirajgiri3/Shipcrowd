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

import { RateCalculationPayload } from "../hooks";

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
  // KYC DOMAIN
  // ========================================================================
  kyc: {
    all: () => ['kyc'],
    list: (params?: FilterParams) => ['kyc', 'list', params],
    detail: (id: string) => ['kyc', 'detail', id],
  },

  // ========================================================================
  // ZONES DOMAIN
  // ========================================================================
  zones: {
    all: ['zones'] as const,
    list: (filters?: any) => [...queryKeys.zones.all, 'list', filters] as const,
    detail: (id: string) => [...queryKeys.zones.all, 'detail', id] as const,
  },

  // ========================================================================
  // COURIERS DOMAIN
  // ========================================================================
  couriers: {
    all: () => ['couriers'] as const,
    list: (filters?: any) => [...queryKeys.couriers.all(), 'list', filters] as const,
    detail: (id: string) => [...queryKeys.couriers.all(), 'detail', id] as const,
    performance: (id: string, filters?: any) => [...queryKeys.couriers.detail(id), 'performance', filters] as const,
    services: (id: string) => [...queryKeys.couriers.detail(id), 'services'] as const,
  },

  // ========================================================================
  // RATE CARDS DOMAIN
  // ========================================================================
  rateCards: {
    all: () => ['rateCards', 'all'],
    detail: (id: string) => ['rateCards', 'detail', id],
    calculate: (payload: any) => ['rateCards', 'calculate', JSON.stringify(payload)],
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
    list: (filters?: FilterParams) => ['shipments', 'list', filters],
    detail: (id: string) => ['shipments', 'detail', id],
    tracking: (awb: string) => ['shipments', 'tracking', awb],
    byOrder: (orderId: string) => ['shipments', 'order', orderId],
    stats: () => ['shipments', 'stats'],
  },

  // ========================================================================
  // RETURNS DOMAIN
  // ========================================================================
  returns: {
    all: () => ['returns'],
    list: (filters?: FilterParams) => ['returns', 'list', filters],
    detail: (id: string) => ['returns', 'detail', id],
    analytics: (dateFilter?: string) => ['returns', 'analytics', dateFilter],
    stats: () => ['returns', 'stats'],
  },

  // ========================================================================
  // DISPUTES DOMAIN
  // ========================================================================
  disputes: {
    all: () => ['disputes'],
    list: (filters?: FilterParams) => ['disputes', 'list', filters],
    detail: (id: string) => ['disputes', 'detail', id],
    analytics: () => ['disputes', 'analytics'],
  },

  // ========================================================================
  // WALLET & FINANCE DOMAIN
  // ========================================================================
  wallet: {
    all: () => ['wallet'],
    balance: () => ['wallet', 'balance'],
    transactions: (filters?: FilterParams) => ['wallet', 'transactions', filters],
    statement: (month: string) => ['wallet', 'statement', month],
    stats: (dateRange?: DateRangeParams) => ['wallet', 'stats', dateRange],
  },

  finance: {
    all: () => ['finance'],
    availableBalance: () => ['finance', 'available-balance'],
    cashFlowForecast: () => ['finance', 'cash-flow-forecast'],
    insights: () => ['finance', 'insights'],
  },

  cod: {
    all: () => ['cod'],
    remittances: (filters?: FilterParams) => ['cod', 'remittances', filters],
    remittance: (id: string) => ['cod', 'remittance', id],
    eligible: (cutoffDate?: string) => ['cod', 'eligible', cutoffDate],
    analytics: () => ['cod', 'analytics'],
    timeline: () => ['cod', 'timeline'],
  },

  // ========================================================================
  // COMMISSION DOMAIN
  // ========================================================================
  commission: {
    all: () => ['commission'],
    rules: (filters?: FilterParams) => ['commission', 'rules', filters],
    rule: (id: string) => ['commission', 'rules', id],
    payouts: (filters?: FilterParams) => ['commission', 'payouts', filters],
    payout: (id: string) => ['commission', 'payouts', id],
    salesReps: (filters?: FilterParams) => ['commission', 'sales-reps', filters],
    salesRep: (id: string) => ['commission', 'sales-reps', id],
    transactions: (filters?: FilterParams) => ['commission', 'transactions', filters],
  },

  // ========================================================================
  // WAREHOUSE OPS DOMAIN (INVENTORY / PACKING / PICKING)
  // ========================================================================
  warehouseOps: {
    all: () => ['warehouse-ops'],
    inventory: (filters?: FilterParams) => ['warehouse-ops', 'inventory', filters],
    inventoryItem: (id: string) => ['warehouse-ops', 'inventory', id],
    inventoryStats: (warehouseId: string) => ['warehouse-ops', 'inventory', 'stats', warehouseId],
    packingStations: (filters?: FilterParams) => ['warehouse-ops', 'packing', 'stations', filters],
    packingStation: (id: string) => ['warehouse-ops', 'packing', 'stations', id],
    pickLists: (filters?: FilterParams) => ['warehouse-ops', 'picking', 'pick-lists', filters],
    pickList: (id: string) => ['warehouse-ops', 'picking', 'pick-lists', id],
    myPickLists: (filters?: FilterParams) => ['warehouse-ops', 'picking', 'my-pick-lists', filters],
  },

  // ========================================================================
  // ADMIN OPERATIONS DOMAIN
  // ========================================================================
  adminOps: {
    all: () => ['admin-ops'],
    emailQueueStats: () => ['admin-ops', 'email-queue', 'stats'],
    emailQueueFailed: () => ['admin-ops', 'email-queue', 'failed'],
    emailQueueRecent: () => ['admin-ops', 'email-queue', 'recent'],
  },

  // ========================================================================
  // WAREHOUSES DOMAIN
  // ========================================================================
  warehouses: {
    all: () => ['warehouses'],
    list: (params?: FilterParams) => ['warehouses', 'list', params],
    detail: (id: string) => ['warehouses', 'detail', id],
    inventory: (warehouseId: string, filters?: any) => ['warehouses', warehouseId, 'inventory', filters],
    stats: (warehouseId: string) => ['warehouses', warehouseId, 'stats'],
  },

  // ========================================================================
  // ANALYTICS DOMAIN
  // ========================================================================
  analytics: {
    all: () => ['analytics'],
    dashboard: (filters?: DateRangeParams) => ['analytics', 'dashboard', filters],
    orders: (period: string) => ['analytics', 'orders', period],
    shipments: (period: string) => ['analytics', 'shipments', period],
    revenue: (period: string) => ['analytics', 'revenue', period],
    profitability: (period: string) => ['analytics', 'profitability', period],
    geographic: (filters?: DateRangeParams) => ['analytics', 'geographic', filters],
    courier: (courierId: string, period?: string) => ['analytics', 'courier', courierId, period],
    smart: (filters?: DateRangeParams) => ['analytics', 'smart-insights', filters],
    savedReports: () => ['analytics', 'saved-reports'],
    report: (reportId: string) => ['analytics', 'report', reportId],
    sla: (filters?: any) => ['analytics', 'sla', filters],
    cost: (filters?: any) => ['analytics', 'cost', filters],
    courierComparison: (filters?: any) => ['analytics', 'courier-comparison', filters],
  },

  // ========================================================================
  // INTEGRATIONS DOMAIN
  // ========================================================================
  integrations: {
    all: () => ['integrations'],
    health: () => ['integrations', 'health'],
    list: () => ['integrations', 'list'],
    detail: (id: string) => ['integrations', 'detail', id],
    ecommerce: () => ['integrations', 'ecommerce'],
    ecommerceList: (filters?: any) => ['integrations', 'ecommerce', 'list', filters],
    syncStatus: (integrationId: string) => ['integrations', integrationId, 'sync'],
    webhooks: () => ['integrations', 'webhooks'],
  },

  // ========================================================================
  // ADMIN USERS DOMAIN
  // ========================================================================
  admin: {
    all: () => ['admin'],
    users: (filters?: FilterParams) => ['admin', 'users', filters],
    user: (id: string) => ['admin', 'user', id],
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
    platform: () => ['settings', 'platform'] as const,
    featureFlags: () => ['settings', 'features'] as const,
    carriers: () => ['settings', 'carriers'] as const,
    company: (companyid: string) => ['settings', 'company'] as const,
    warehouses: () => ['settings', 'warehouses'] as const,
    packingStations: () => ['settings', 'packing-stations'] as const,
    pickLists: () => ['settings', 'pick-lists'] as const,
    inventory: () => ['settings', 'inventory'] as const,
    communication: () => ['settings', 'communication'] as const,
    fraud: () => ['settings', 'fraud'] as const,
    emailQueue: () => ['settings', 'email-queue'] as const,
    whatsapp: () => ['settings', 'whatsapp'] as const,
    invoices: () => ['settings', 'invoices'] as const,
    marketing: () => ['settings', 'marketing'] as const,

  },

  // ========================================================================
  // TEAM DOMAIN
  // ========================================================================
  team: {
    all: () => ['team'],
    members: () => ['team', 'members'],
    member: (memberId: string) => ['team', 'member', memberId],
    invitations: () => ['team', 'invitations'],
  },

  // ========================================================================
  // MARKETING DOMAIN
  // ========================================================================
  marketing: {
    all: () => ['marketing'],
    promoCodes: (filters?: any) => ['marketing', 'promo-codes', filters],
    promoCode: (id: string) => ['marketing', 'promo-code', id],
    validatePromo: (code: string) => ['marketing', 'validate', code],
  },

  // ========================================================================
  // RTO (Return-To-Origin) DOMAIN
  // ========================================================================
  rto: {
    all: () => ['rto'],
    events: (filters?: any) => ['rto', 'events', filters],
    pending: (filters?: any) => ['rto', 'pending', filters],
    analytics: (filters?: any) => ['rto', 'analytics', filters],
    detail: (id: string) => ['rto', 'detail', id],
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
