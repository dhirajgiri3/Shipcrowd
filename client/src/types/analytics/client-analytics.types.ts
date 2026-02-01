/**
 * Analytics Type Definitions
 * 
 * Types for the Advanced Analytics module including:
 * - Metrics Configuration
 * - Report Building
 * - SLA Tracking
 * - Courier Comparison
 * - Cost Analysis
 */

// ==========================================
// SHARED TYPES
// ==========================================

export type ClientTimeRange = '7d' | '30d' | '90d' | 'mtd' | 'ytd' | 'custom';

export interface DateRange {
    from: Date;
    to: Date;
}

export type ClientMetricCategory = 'volume' | 'performance' | 'financial' | 'time';

export interface MetricConfig {
    id: string;
    label: string;
    description: string;
    category: ClientMetricCategory;
    format: 'number' | 'currency' | 'percent' | 'time';
}

// ==========================================
// REPORT BUILDER
// ==========================================

export type ClientChartType = 'line' | 'bar' | 'pie' | 'area' | 'scatter';

export interface ReportConfig {
    metrics: string[];
    dimensions: string[];
    filters: Record<string, any>;
    chartType: ClientChartType;
    dateRange: DateRange;
}

export interface ClientReportDataPoint {
    date: string;
    [key: string]: string | number;
}

// ==========================================
// SLA DASHBOARD
// ==========================================

export interface ClientSLAMetric {
    type: 'pickup' | 'delivery' | 'ndr' | 'cod';
    label: string;
    target: number; // e.g., 24 (hours) or 98 (percent)
    actual: number;
    compliance: number; // percentage
    trend: number; // change vs last period
    status: 'compliant' | 'warning' | 'breached';
    history: { date: string; value: number }[];
}

export interface SLASummary {
    pickupCompliance: ClientSLAMetric;
    deliveryCompliance: ClientSLAMetric;
    ndrResponseTime: ClientSLAMetric;
    codSettlementTime: ClientSLAMetric;
}

// ==========================================
// COURIER COMPARISON
// ==========================================

export interface ClientCourierPerformance {
    courierId: string;
    courierName: string;
    color: string;
    metrics: {
        deliverySuccessRate: number;
        avgDeliveryTime: number; // hours
        rtoRate: number;
        ndrRate: number;
        avgCostPerKg: number;
        codRemittanceTime: number; // days
        lostDamagedRate: number;
    };
}

// ==========================================
// COST ANALYSIS
// ==========================================

export interface ClientCostBreakdown {
    category: string;
    amount: number;
    percentage: number;
}

export interface CostTrend {
    date: string;
    shipping: number;
    rto: number;
    codFees: number;
    other: number;
}

export interface CostAnalysisData {
    totalSpend: number;
    avgCostPerOrder: number;
    costPerZone: ClientCostBreakdown[];
    costPerCourier: ClientCostBreakdown[];
    paymentModeSplit: {
        prepaid: number;
        cod: number;
    };
    trend: CostTrend[];
}
