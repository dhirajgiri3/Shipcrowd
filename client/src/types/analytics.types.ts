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

export type TimeRange = '7d' | '30d' | '90d' | 'mtd' | 'ytd' | 'custom';

export interface DateRange {
    from: Date;
    to: Date;
}

export type MetricCategory = 'volume' | 'performance' | 'financial' | 'time';

export interface MetricConfig {
    id: string;
    label: string;
    description: string;
    category: MetricCategory;
    format: 'number' | 'currency' | 'percent' | 'time';
}

// ==========================================
// REPORT BUILDER
// ==========================================

export type ChartType = 'line' | 'bar' | 'pie' | 'area' | 'scatter';

export interface ReportConfig {
    metrics: string[];
    dimensions: string[];
    filters: Record<string, any>;
    chartType: ChartType;
    dateRange: DateRange;
}

export interface ReportDataPoint {
    date: string;
    [key: string]: string | number;
}

// ==========================================
// SLA DASHBOARD
// ==========================================

export interface SLAMetric {
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
    pickupCompliance: SLAMetric;
    deliveryCompliance: SLAMetric;
    ndrResponseTime: SLAMetric;
    codSettlementTime: SLAMetric;
}

// ==========================================
// COURIER COMPARISON
// ==========================================

export interface CourierPerformance {
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

export interface CostBreakdown {
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
    costPerZone: CostBreakdown[];
    costPerCourier: CostBreakdown[];
    paymentModeSplit: {
        prepaid: number;
        cod: number;
    };
    trend: CostTrend[];
}
