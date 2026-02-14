/**
 * Analytics Type Definitions
 * 
 * Comprehensive types for analytics, reporting, and data visualization.
 */

// ==================== Base Types ====================

export type TimeRange = 'today' | 'yesterday' | '7days' | '30days' | '90days' | 'custom';
export type ChartType = 'line' | 'bar' | 'pie' | 'area' | 'donut' | 'scatter';
export type MetricAggregation = 'sum' | 'avg' | 'count' | 'min' | 'max';

export interface DateRangeFilter {
    startDate: string;
    endDate: string;
}

export interface AnalyticsFilters {
    dateRange?: TimeRange;
    customDateRange?: DateRangeFilter;
    // ✅ PHASE 3: Added for centralized date filtering
    startDate?: string;
    endDate?: string;
    courierIds?: string[];
    zoneIds?: string[];
    paymentMethod?: 'COD' | 'PREPAID' | 'ALL';
    status?: string[];
}

// ==================== Metrics & Dimensions ====================

export type MetricCategory = 'volume' | 'performance' | 'financial' | 'time' | 'quality';

export interface AnalyticsMetric {
    id: string;
    name: string;
    description: string;
    category: MetricCategory;
    type: 'number' | 'percentage' | 'currency' | 'duration';
    aggregation: MetricAggregation;
    unit?: string;
}

export interface MetricValue {
    metricId: string;
    value: number;
    change?: number; // Percentage change from previous period
    trend?: 'up' | 'down' | 'stable';
}

export type DimensionType = 'date' | 'courier' | 'zone' | 'status' | 'payment_method' | 'product_category';

export interface Dimension {
    type: DimensionType;
    values: string[];
}

// ==================== Custom Reports ====================

export interface ReportConfiguration {
    reportId?: string;
    name: string;
    description?: string;
    metrics: string[]; // Metric IDs
    dimensions: DimensionType[];
    filters: AnalyticsFilters;
    chartType: ChartType;
    groupBy?: DimensionType;
    sortBy?: {
        field: string;
        order: 'asc' | 'desc';
    };
}

export interface ReportDataPoint {
    label: string;
    value: number;
    metadata?: Record<string, any>;
}

export interface ReportData {
    config: ReportConfiguration;
    data: ReportDataPoint[];
    summary: {
        total: number;
        average: number;
        min: number;
        max: number;
    };
    generatedAt: string;
}

export interface SavedReport extends ReportConfiguration {
    reportId: string;
    userId: string;
    createdAt: string;
    lastRunAt?: string;
    isScheduled: boolean;
    scheduleFrequency?: 'daily' | 'weekly' | 'monthly';
}

// ==================== SLA Performance ====================

export interface SLAMetric {
    name: string;
    description: string;
    target: number; // Target percentage or hours
    actual: number;
    compliance: number; // Percentage
    status: 'excellent' | 'good' | 'warning' | 'critical';
    trend?: 'improving' | 'declining' | 'stable';
}

export interface SLAPerformance {
    overall: {
        compliance: number;
        status: 'excellent' | 'good' | 'warning' | 'critical';
    };
    pickupSLA: SLAMetric;
    deliverySLA: SLAMetric;
    ndrResponseSLA: SLAMetric;
    codSettlementSLA: SLAMetric;
    byCourier: Array<{
        courierId: string;
        courierName: string;
        compliance: number;
        pickupSLA: number;
        deliverySLA: number;
    }>;
    byZone: Array<{
        zoneId: string;
        zoneName: string;
        compliance: number;
        avgDeliveryTime: number;
    }>;
    timeSeries: Array<{
        date: string;
        compliance: number;
        pickupOnTime: number;
        deliveryOnTime: number;
    }>;
}

// ==================== Courier Comparison ====================

export interface CourierMetrics {
    courierId: string;
    courierName: string;
    totalShipments: number;
    successRate: number; // Delivered %
    avgDeliveryTime: number; // Hours
    rtoRate: number; // %
    ndrRate: number; // %
    weightDisputes: number;
    avgCost: number;
    codRemittanceTime: number; // Days
    customerSatisfaction?: number; // Rating 1-5
    onTimeDelivery: number; // %
    damagedShipments: number;
    lostShipments: number;
}

export interface CourierComparison {
    couriers: CourierMetrics[];
    dateRange: DateRangeFilter;
    recommendation?: {
        bestPerformance: string; // Courier ID
        bestCost: string;
        bestSpeed: string;
        overall: string;
        reasoning: string;
    };
}

// ==================== Cost Analysis ====================

export interface CostBreakdown {
    totalCost: number;
    shipmentCount?: number;
    breakdown: {
        shippingCost: number;
        codCharges: number;
        weightCharges: number;
        fuelSurcharge: number;
        rtoCharges: number;
        otherCharges: number;
    };
    byCourier: Array<{
        courierId: string;
        courierName: string;
        cost: number;
        shipmentCount: number;
        avgCostPerShipment: number;
    }>;
    byZone: Array<{
        zoneName: string;
        cost: number;
        shipmentCount: number;
        avgCostPerShipment: number;
    }>;
    byPaymentMethod: {
        cod: { cost: number; count: number };
        prepaid: { cost: number; count: number };
    };
    timeSeries: Array<{
        date: string;
        totalCost: number;
        shippingCost: number;
        codCharges: number;
    }>;
}

export interface CostSavingsOpportunity {
    id: string;
    type: 'courier_switch' | 'weight_audit' | 'zone_optimization' | 'cod_reduction';
    title: string;
    description: string;
    potentialSavings: number;
    impact: 'high' | 'medium' | 'low';
    effort: 'easy' | 'moderate' | 'complex';
    recommendation: string;
}

export interface CostAnalysis {
    current: CostBreakdown;
    previous?: CostBreakdown;
    savingsOpportunities: CostSavingsOpportunity[];
}

// ==================== Dashboard Overview ====================

export interface DashboardMetrics {
    totalRevenue: number;
    totalShipments: number;
    totalOrders: number; // ✅ Added matching backend field
    totalCost: number;
    // ✅ PHASE 1.3: Real profit from backend
    totalProfit?: number;
    totalCosts?: number;
    profitMargin?: string;
    avgDeliveryTime: number;
    successRate: number;

    // Backend fields
    pendingOrders?: number;
    readyToShip?: number;
    shippedOrders?: number;
    deliveredOrders?: number;
    cancelledOrders?: number;
    rtoOrders?: number;

    // Frontend aliases (legacy)
    activeOrders: number;
    pendingPickup: number;
    inTransit: number;
    delivered: number;
    rto: number;
    ndr: number;
    topCourier: {
        name: string;
        shipments: number;
    };
    topZone: {
        name: string;
        shipments: number;
    };
    // ✅ PHASE 1.3: Historical data for sparklines
    weeklyTrend?: Array<{
        _id: string; // Date string (YYYY-MM-DD)
        orders: number;
        revenue: number;
        profit?: number;
    }>;
    // ✅ PHASE 1.4: Active Days feature (renamed from shippingStreak)
    activeDays?: number;
    shippingStreak?: number; // Deprecated, use activeDays
    longestStreak?: number;
    milestones?: Array<{
        days: number;
        achievedAt: string;
        badge: string;
    }>;
    // ✅ PHASE 1.4: Real week-over-week deltas
    deltas?: {
        revenue: number;
        profit: number;
        orders: number;
    };
}

// ==================== Admin Dashboard ====================

/** Response from GET /analytics/dashboard/admin (multi-company, admin only) */
export interface AdminDashboardCompanyStat {
    companyId: string;
    companyName?: string;
    totalOrders: number;
    totalRevenue: number;
    pendingOrders: number;
    deliveredOrders: number;
}

export interface AdminDashboardRevenueGraphPoint {
    _id: string; // date string YYYY-MM-DD
    orders: number;
    revenue: number;
}

export interface AdminDashboardDateRange {
    startDate: Date | string;
    endDate: Date | string;
}

export interface AdminDashboard {
    totalOrders: number;
    totalRevenue: number;
    totalShipments: number;
    globalSuccessRate: number;
    /** Number of orders that reached a delivery outcome (delivered + shipped + rto). Used to show N/A when 0. */
    attemptedDeliveries?: number;
    /** True when success rate is computed from delivery outcomes; false when no attempts in period. */
    successRateBasedOnAttempts?: boolean;
    /** RTO order count in period (delivery outcome). */
    rtoCount?: number;
    /** RTO rate as % of attempted deliveries (rto / attempted). */
    rtoRate?: number;
    ndrCases: number;
    pendingOrders: number;
    deliveredOrders: number;
    /** Total users with role seller (from User collection). */
    totalRegisteredSellers: number;
    companiesStats: AdminDashboardCompanyStat[];
    revenueGraph: AdminDashboardRevenueGraphPoint[];
    dateRange: AdminDashboardDateRange;
    /** Same-length period immediately before startDate; for "vs previous period" comparison. */
    previousPeriod?: {
        totalRevenue: number;
        totalOrders: number;
        globalSuccessRate: number;
    };
}

/** Filters for admin dashboard (query params) */
export interface AdminDashboardFilters {
    startDate?: string;
    endDate?: string;
}

// ==================== API Response Types ====================

export interface AnalyticsResponse<T> {
    success: boolean;
    data: T;
    metadata?: {
        generatedAt: string;
        filters: AnalyticsFilters;
        recordCount: number;
    };
}

export interface PaginatedAnalyticsResponse<T> extends AnalyticsResponse<T> {
    pagination: {
        page: number;
        limit: number;
        total: number;
        hasMore: boolean;
    };
}

// ==================== Export Types ====================

export type ExportFormat = 'csv' | 'excel' | 'pdf';

export interface ExportRequest {
    reportId?: string;
    config: ReportConfiguration;
    format: ExportFormat;
    includeCharts?: boolean;
}

export interface ExportResponse {
    downloadUrl: string;
    expiresAt: string;
    fileSize: number;
    format: ExportFormat;
}

// ==================== Available Metrics List ====================

export const AVAILABLE_METRICS: AnalyticsMetric[] = [
    // Volume metrics
    { id: 'total_shipments', name: 'Total Shipments', description: 'Total number of shipments', category: 'volume', type: 'number', aggregation: 'count' },
    { id: 'delivered_shipments', name: 'Delivered Shipments', description: 'Successfully delivered shipments', category: 'volume', type: 'number', aggregation: 'count' },
    { id: 'rto_shipments', name: 'RTO Shipments', description: 'Return to origin shipments', category: 'volume', type: 'number', aggregation: 'count' },
    { id: 'ndr_shipments', name: 'NDR Shipments', description: 'Non-delivery report shipments', category: 'volume', type: 'number', aggregation: 'count' },

    // Performance metrics
    { id: 'delivery_success_rate', name: 'Delivery Success Rate', description: 'Percentage of successful deliveries', category: 'performance', type: 'percentage', aggregation: 'avg' },
    { id: 'rto_rate', name: 'RTO Rate', description: 'Percentage of shipments returned', category: 'performance', type: 'percentage', aggregation: 'avg' },
    { id: 'ndr_rate', name: 'NDR Rate', description: 'Percentage of NDR shipments', category: 'performance', type: 'percentage', aggregation: 'avg' },
    { id: 'on_time_delivery', name: 'On-Time Delivery', description: 'Percentage delivered on time', category: 'performance', type: 'percentage', aggregation: 'avg' },

    // Financial metrics
    { id: 'total_revenue', name: 'Total Revenue', description: 'Total revenue from shipments', category: 'financial', type: 'currency', aggregation: 'sum', unit: 'INR' },
    { id: 'shipping_cost', name: 'Shipping Cost', description: 'Total shipping cost', category: 'financial', type: 'currency', aggregation: 'sum', unit: 'INR' },
    { id: 'cod_collected', name: 'COD Collected', description: 'Total COD amount collected', category: 'financial', type: 'currency', aggregation: 'sum', unit: 'INR' },
    { id: 'avg_order_value', name: 'Average Order Value', description: 'Average order value', category: 'financial', type: 'currency', aggregation: 'avg', unit: 'INR' },

    // Time metrics
    { id: 'avg_delivery_time', name: 'Avg Delivery Time', description: 'Average delivery time in hours', category: 'time', type: 'duration', aggregation: 'avg', unit: 'hours' },
    { id: 'pickup_time', name: 'Pickup Time', description: 'Average pickup time', category: 'time', type: 'duration', aggregation: 'avg', unit: 'hours' },
    { id: 'cod_settlement_time', name: 'COD Settlement Time', description: 'Average COD settlement time', category: 'time', type: 'duration', aggregation: 'avg', unit: 'days' },

    // Quality metrics
    { id: 'damaged_rate', name: 'Damaged Rate', description: 'Percentage of damaged shipments', category: 'quality', type: 'percentage', aggregation: 'avg' },
    { id: 'lost_rate', name: 'Lost Rate', description: 'Percentage of lost shipments', category: 'quality', type: 'percentage', aggregation: 'avg' },
    { id: 'weight_disputes', name: 'Weight Disputes', description: 'Number of weight disputes', category: 'quality', type: 'number', aggregation: 'count' },
];
