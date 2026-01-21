/**
 * Enhanced Mock Data - Centralized Exports
 *
 * Import all enhanced mock data from this single entry point.
 *
 * Usage:
 * ```typescript
 * import { mockKPITrends, mockOrderTrend30Days } from '@/lib/mockData/enhanced';
 * ```
 */

// KPI Trends
export {
  getMockKPITrends,
  mockRevenueTrend,
  mockProfitTrend,
  mockOrdersTrend,
  mockWalletTrend,
  type KPITrendData,
  type AllKPITrends,
} from './kpiTrends';

// Order Trends
export {
  generateRealisticTrend,
  mockOrderTrend30Days,
  mockOrderTrend7Days,
  mockOrderTrendDeclining,
  mockOrderTrendFlat,
  mockOrderTrendVolatile,
  getTrendMetadata,
  mockOrderTrend30DaysMetadata,
  type OrderTrendDataPoint,
  type TrendMetadata,
} from './orderTrend';

// Pipeline Flow
export {
  getMockPipelineFlow,
  mockPipelineFlow,
  type PipelineStage,
  type PipelineFlowData,
} from './pipelineFlow';

// Geographic Metrics
export {
  getTopCities,
  searchCities,
  getMockGeoMetrics,
  getGeographicInsightsData,
  mockGeoMetrics,
  mockTopCitiesByVolume,
  mockTopCitiesByExceptions,
  mockGeographicInsights,
  type CityMetric,
  type GeoMetricsData,
} from './geoMetrics';

// Orders
export {
  getPendingPickups,
  getRTOOrders,
  type Order,
  type OrderStatus,
  type PaymentMode,
  type OrderAddress,
} from './orders';

// Business Metrics
export {
  getTodaySnapshot,
  type TodaySnapshot,
} from './businessMetrics';

// Smart Insights
export {
  getTopInsights,
  type SmartInsight,
} from './smartInsights';

// Wallet Transactions
export {
  mockTransactions,
  type Transaction,
} from './walletTransactions';

// NDR Cases
export {
  mockNDRCases,
  mockNDRMetrics,
  mockNDRReasonDistribution,
  type NDRCase,
} from './ndrCases';

