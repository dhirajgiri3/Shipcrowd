/**
 * Dashboard Data Utilities
 *
 * Utilities for transforming API data into dashboard component format
 * with intelligent mock data fallback support.
 *
 * Strategy: Always try real API first, fall back to mock when unavailable
 */

import type { DashboardMetrics } from '@/src/types/api/analytics/analytics.types';

// Read from env - false means always try real API first
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true';

type FreshnessLevel = 'real_time' | 'cached' | 'stale' | 'mock';

interface TransformedKPIs {
    revenue: KPITrendDataItem;
    profit: KPITrendDataItem;
    orders: KPITrendDataItem;
    walletBalance: KPITrendDataItem;
}

interface KPITrendDataItem {
    today: number;
    sparkline: number[];
    delta: number;
    trend: 'up' | 'down' | 'neutral';
    lastUpdatedAt: string;
    freshness: FreshnessLevel;
}

/**
 * Calculate data freshness based on timestamp
 */
export function calculateFreshness(timestamp?: string | Date): FreshnessLevel {
    if (!timestamp) return 'mock';

    const dataTime = new Date(timestamp).getTime();
    const now = Date.now();
    const ageMs = now - dataTime;

    // Real-time: < 1 minute
    if (ageMs < 60 * 1000) return 'real_time';
    // Cached: < 5 minutes
    if (ageMs < 5 * 60 * 1000) return 'cached';
    // Stale: > 5 minutes
    return 'stale';
}

/**
 * Format freshness for display
 */
export function formatFreshness(freshness: FreshnessLevel, timestamp?: string): string {
    switch (freshness) {
        case 'real_time':
            return 'Live';
        case 'cached':
            return 'Updated recently';
        case 'stale':
            if (timestamp) {
                const mins = Math.floor((Date.now() - new Date(timestamp).getTime()) / 60000);
                return `${mins}m ago`;
            }
            return 'Stale';
        case 'mock':
            return 'Sample data';
        default:
            return 'Unknown';
    }
}

/**
 * Transform dashboard API response to PerformanceBar KPI format
 * Uses real historical data when available, indicates when using estimates
 */
export function transformDashboardToKPIs(
    dashboardData: DashboardMetrics,
    walletBalance?: number,
    dataTimestamp?: string
): TransformedKPIs {
    const totalRevenue = dashboardData.totalRevenue || 0;
    const totalShipments = dashboardData.totalShipments || dashboardData.totalOrders || 0;
    const totalProfit = dashboardData.totalProfit || 0;

    // Extract historical data from backend weeklyTrend
    const weeklyTrend = dashboardData.weeklyTrend || [];
    const hasRealHistory = weeklyTrend.length >= 2;

    // Generate sparklines from real data or indicate no history
    let revenueSparkline: number[] = [];
    let profitSparkline: number[] = [];
    let ordersSparkline: number[] = [];

    if (hasRealHistory) {
        // Use actual historical data from backend
        revenueSparkline = weeklyTrend.map((day: any) => day.revenue || 0);
        profitSparkline = weeklyTrend.map((day: any) => day.profit || 0);
        ordersSparkline = weeklyTrend.map((day: any) => day.orders || 0);
    } else {
        // No historical data - show single point (today's value)
        // Don't fake historical data - be honest
        revenueSparkline = [totalRevenue];
        profitSparkline = [totalProfit];
        ordersSparkline = [totalShipments];
    }

    // Calculate deltas from actual data
    const revenueDelta = hasRealHistory ? calculateDelta(revenueSparkline) : 0;
    const profitDelta = hasRealHistory ? calculateDelta(profitSparkline) : 0;
    const ordersDelta = hasRealHistory ? calculateDelta(ordersSparkline) : 0;

    // Use deltas from backend if available (more accurate)
    const finalRevenueDelta = dashboardData.deltas?.revenue ?? revenueDelta;
    const finalProfitDelta = dashboardData.deltas?.profit ?? profitDelta;
    const finalOrdersDelta = dashboardData.deltas?.orders ?? ordersDelta;

    // Determine trends
    const getTrend = (delta: number): 'up' | 'down' | 'neutral' =>
        delta > 0 ? 'up' : delta < 0 ? 'down' : 'neutral';

    const now = dataTimestamp || new Date().toISOString();
    const freshness = calculateFreshness(dataTimestamp);

    return {
        revenue: {
            today: totalRevenue,
            sparkline: revenueSparkline,
            delta: finalRevenueDelta,
            trend: getTrend(finalRevenueDelta),
            lastUpdatedAt: now,
            freshness
        },
        profit: {
            today: totalProfit,
            sparkline: profitSparkline,
            delta: finalProfitDelta,
            trend: getTrend(finalProfitDelta),
            lastUpdatedAt: now,
            freshness
        },
        orders: {
            today: totalShipments,
            sparkline: ordersSparkline,
            delta: finalOrdersDelta,
            trend: getTrend(finalOrdersDelta),
            lastUpdatedAt: now,
            freshness
        },
        walletBalance: {
            today: walletBalance || 0,
            sparkline: [],
            delta: 0,
            trend: 'neutral',
            lastUpdatedAt: now,
            freshness: walletBalance !== undefined ? freshness : 'mock'
        }
    };
}

/**
 * Calculate percentage change from last two values
 */
function calculateDelta(sparkline: number[]): number {
    if (!sparkline || sparkline.length < 2) return 0;

    const latest = sparkline[sparkline.length - 1];
    const previous = sparkline[sparkline.length - 2];

    if (previous === 0) return latest > 0 ? 100 : 0;

    return Number((((latest - previous) / previous) * 100).toFixed(1));
}

/**
 * Data state for components - indicates source and loading state
 */
export interface DataState<T> {
    data: T;
    isLoading: boolean;
    isError: boolean;
    isUsingMock: boolean;
    errorMessage?: string;
    lastUpdatedAt?: string;
    freshness: FreshnessLevel;
}

/**
 * Use data with intelligent mock fallback
 * Strategy: Try real API first, fall back to mock with clear indication
 */
export function useDataWithFallback<T>(
    apiData: T | undefined | null,
    mockData: T,
    isLoading: boolean,
    isError: boolean = false,
    errorMessage?: string,
    dataTimestamp?: string
): DataState<T> {
    // If explicitly using mock mode, return mock immediately
    if (USE_MOCK) {
        return {
            data: mockData,
            isLoading: false,
            isError: false,
            isUsingMock: true,
            freshness: 'mock'
        };
    }

    // Still loading
    if (isLoading) {
        return {
            data: mockData, // Show mock while loading for better UX
            isLoading: true,
            isError: false,
            isUsingMock: true,
            freshness: 'mock'
        };
    }

    // Error occurred - fall back to mock with error indication
    if (isError || !apiData) {
        return {
            data: mockData,
            isLoading: false,
            isError: isError,
            isUsingMock: true,
            errorMessage: errorMessage || 'Unable to load data',
            freshness: 'mock'
        };
    }

    // Real data available
    return {
        data: apiData,
        isLoading: false,
        isError: false,
        isUsingMock: false,
        lastUpdatedAt: dataTimestamp || new Date().toISOString(),
        freshness: calculateFreshness(dataTimestamp)
    };
}

/**
 * Format currency for Indian Rupees
 */
export function formatCurrency(amount: number): string {
    if (amount >= 10000000) {
        return `₹${(amount / 10000000).toFixed(2)}Cr`;
    }
    if (amount >= 100000) {
        return `₹${(amount / 100000).toFixed(2)}L`;
    }
    if (amount >= 1000) {
        return `₹${(amount / 1000).toFixed(1)}K`;
    }
    return `₹${amount.toLocaleString('en-IN')}`;
}

/**
 * Format percentage with sign
 */
export function formatDelta(delta: number): string {
    const sign = delta > 0 ? '+' : '';
    return `${sign}${delta.toFixed(1)}%`;
}

export { USE_MOCK };
