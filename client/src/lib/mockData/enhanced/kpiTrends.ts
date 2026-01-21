/**
 * Enhanced KPI Trends Mock Data
 *
 * Realistic 7-day sparkline data for KPIs with delta calculations.
 * Used by PerformanceBar to show trends and % changes.
 */

export interface KPITrendData {
  today: number;
  sparkline: number[]; // Last 7 days (oldest to newest)
  delta: number; // Percentage change vs 7 days ago
  trend: 'up' | 'down' | 'neutral';
  last_updated_at: string;
  freshness: 'real_time' | 'cached_60s' | 'stale_5m' | 'stale_15m';
}

export interface AllKPITrends {
  revenue: KPITrendData;
  profit: KPITrendData;
  orders: KPITrendData;
  walletBalance: KPITrendData;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate percentage change between two values
 */
function calculateDelta(current: number, previous: number): number {
  if (previous === 0) return 100;
  return Number((((current - previous) / previous) * 100).toFixed(1));
}

/**
 * Determine trend direction
 */
function getTrend(delta: number): 'up' | 'down' | 'neutral' {
  if (delta > 1) return 'up';
  if (delta < -1) return 'down';
  return 'neutral';
}

/**
 * Generate realistic weekly data with variance and patterns
 */
function generateWeeklyTrend(
  baseValue: number,
  variance: number = 0.15,
  weekendDrop: number = 0.2,
  upwardTrend: boolean = true
): number[] {
  const data: number[] = [];
  const trendMultiplier = upwardTrend ? 1.02 : 0.98;

  for (let i = 0; i < 7; i++) {
    let value = baseValue * Math.pow(trendMultiplier, i);

    // Add random variance
    value *= 1 + (Math.random() - 0.5) * 2 * variance;

    // Weekend drop (Saturday = day 5, Sunday = day 6)
    if (i === 5 || i === 6) {
      value *= 1 - weekendDrop;
    }

    data.push(Math.round(value));
  }

  return data;
}

// ============================================================================
// Mock KPI Trends
// ============================================================================

export function getMockKPITrends(): AllKPITrends {
  // Revenue: Upward trend (growing business)
  const revenueTrend = generateWeeklyTrend(47000, 0.12, 0.15, true);
  const revenue: KPITrendData = {
    today: revenueTrend[6],
    sparkline: revenueTrend,
    delta: calculateDelta(revenueTrend[6], revenueTrend[0]),
    trend: getTrend(calculateDelta(revenueTrend[6], revenueTrend[0])),
    last_updated_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(), // 2 min ago
    freshness: 'cached_60s',
  };

  // Profit: Moderate upward trend (margins improving)
  const profitTrend = generateWeeklyTrend(7200, 0.1, 0.1, true);
  const profit: KPITrendData = {
    today: profitTrend[6],
    sparkline: profitTrend,
    delta: calculateDelta(profitTrend[6], profitTrend[0]),
    trend: getTrend(calculateDelta(profitTrend[6], profitTrend[0])),
    last_updated_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    freshness: 'cached_60s',
  };

  // Orders: Slight downward trend (seasonal variation)
  const ordersTrend = generateWeeklyTrend(44, 0.18, 0.25, false);
  const orders: KPITrendData = {
    today: ordersTrend[6],
    sparkline: ordersTrend,
    delta: calculateDelta(ordersTrend[6], ordersTrend[0]),
    trend: getTrend(calculateDelta(ordersTrend[6], ordersTrend[0])),
    last_updated_at: new Date(Date.now() - 30 * 1000).toISOString(), // 30 sec ago
    freshness: 'real_time',
  };

  // Wallet Balance: Declining (needs recharge)
  const walletTrend = [5200, 5100, 4850, 4600, 4450, 4300, 4230];
  const walletBalance: KPITrendData = {
    today: walletTrend[6],
    sparkline: walletTrend,
    delta: calculateDelta(walletTrend[6], walletTrend[0]),
    trend: 'down', // Always show as concerning
    last_updated_at: new Date(Date.now() - 1 * 60 * 1000).toISOString(), // 1 min ago
    freshness: 'real_time',
  };

  return {
    revenue,
    profit,
    orders,
    walletBalance,
  };
}

// ============================================================================
// Export individual KPIs for flexibility
// ============================================================================

export const mockRevenueTrend = getMockKPITrends().revenue;
export const mockProfitTrend = getMockKPITrends().profit;
export const mockOrdersTrend = getMockKPITrends().orders;
export const mockWalletTrend = getMockKPITrends().walletBalance;
