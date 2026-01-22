/**
 * Dashboard Data Utilities
 * 
 * Utilities for transforming API data into dashboard component format
 * with mock data fallback support
 */

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true';

/**
 * Transform dashboard API response to PerformanceBar KPI format
 */
export function transformDashboardToKPIs(dashboardData: any, walletBalance?: number) {
    if (!dashboardData) return null;

    const { weeklyTrend, totalRevenue, totalOrders } = dashboardData;

    // Calculate sparklines from weekly trend
    const sortedTrend = weeklyTrend?.sort((a: any, b: any) =>
        new Date(a._id).getTime() - new Date(b._id).getTime()
    ) || [];

    const revenueSparkline = sortedTrend.map((d: any) => d.revenue);
    const ordersSparkline = sortedTrend.map((d: any) => d.orders);

    // Calculate deltas (% change from previous day)
    const revenueDelta = calculateDelta(revenueSparkline);
    const ordersDelta = calculateDelta(ordersSparkline);

    // Determine trends
    const revenueTrend = revenueDelta > 0 ? 'up' as const : revenueDelta < 0 ? 'down' as const : 'neutral' as const;
    const ordersTrend = ordersDelta > 0 ? 'up' as const : ordersDelta < 0 ? 'down' as const : 'neutral' as const;

    // Estimate profit (we don't have shipping cost data yet)
    // Using 10% margin as temporary estimate
    const estimatedProfit = totalRevenue * 0.1;
    const profitSparkline = revenueSparkline.map((r: number) => r * 0.1);
    const profitDelta = revenueDelta; // Same trend as revenue for now

    return {
        revenue: {
            today: totalRevenue,
            sparkline: revenueSparkline,
            delta: revenueDelta,
            trend: revenueTrend,
            last_updated_at: dashboardData.dateRange?.endDate || new Date().toISOString(),
            freshness: calculateFreshness(dashboardData.dateRange?.endDate)
        },
        profit: {
            today: estimatedProfit,
            sparkline: profitSparkline,
            delta: profitDelta,
            trend: revenueTrend,
            last_updated_at: dashboardData.dateRange?.endDate || new Date().toISOString(),
            freshness: calculateFreshness(dashboardData.dateRange?.endDate)
        },
        orders: {
            today: totalOrders,
            sparkline: ordersSparkline,
            delta: ordersDelta,
            trend: ordersTrend,
            last_updated_at: dashboardData.dateRange?.endDate || new Date().toISOString(),
            freshness: calculateFreshness(dashboardData.dateRange?.endDate)
        },
        walletBalance: {
            today: walletBalance || 0,
            sparkline: [], // TODO: Add wallet trend when available
            delta: 0,
            trend: 'neutral' as const,
            last_updated_at: new Date().toISOString(),
            freshness: 'real_time' as const
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

    return ((latest - previous) / previous) * 100;
}

/**
 * Calculate data freshness indicator
 */
function calculateFreshness(lastUpdated?: string): 'real_time' | 'cached_60s' | 'stale_5m' | 'stale_15m' {
    if (!lastUpdated) return 'stale_15m';

    const now = new Date().getTime();
    const updated = new Date(lastUpdated).getTime();
    const diff = now - updated;

    const oneMinute = 60 * 1000;
    const fiveMinutes = 5 * 60 * 1000;
    const fifteenMinutes = 15 * 60 * 1000;

    if (diff < oneMinute) return 'real_time';
    if (diff < fiveMinutes) return 'cached_60s';
    if (diff < fifteenMinutes) return 'stale_5m';
    return 'stale_15m';
}

/**
 * Use data with mock fallback
 */
export function useDataWithFallback<T>(
    apiData: T | undefined,
    mockData: T,
    isLoading: boolean
): { data: T; isLoading: boolean; isUsingMock: boolean } {
    if (USE_MOCK) {
        return {
            data: mockData,
            isLoading: false,
            isUsingMock: true
        };
    }

    return {
        data: apiData || mockData,
        isLoading,
        isUsingMock: !apiData
    };
}

export { USE_MOCK };
