/**
 * Enhanced Order Trend Mock Data
 *
 * Realistic 30-day order volume data for dominant trend chart.
 * Includes weekday/weekend patterns, festival spikes, and seasonal variance.
 */

export interface OrderTrendDataPoint {
  date: string; // YYYY-MM-DD
  orders: number;
  dayOfWeek: number; // 0 = Sunday, 6 = Saturday
  isWeekend: boolean;
  isFestival: boolean;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get day of week name
 */
function getDayName(dayOfWeek: number): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[dayOfWeek];
}

/**
 * Format date as YYYY-MM-DD
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Generate realistic order trend with patterns
 */
interface TrendConfig {
  days: number;
  baseVolume: number;
  variance: number; // 0-1, higher = more random
  weekendDrop: number; // 0-1, proportion of drop on weekends
  festivalSpikes?: Array<{ day: number; multiplier: number }>;
  seasonalTrend?: 'up' | 'down' | 'flat';
}

export function generateRealisticTrend(config: TrendConfig): OrderTrendDataPoint[] {
  const {
    days,
    baseVolume,
    variance,
    weekendDrop,
    festivalSpikes = [],
    seasonalTrend = 'flat',
  } = config;

  const data: OrderTrendDataPoint[] = [];
  const endDate = new Date();
  endDate.setHours(0, 0, 0, 0);

  // Seasonal trend multiplier (gradual change over period)
  const seasonalMultiplier =
    seasonalTrend === 'up' ? 1.015 : seasonalTrend === 'down' ? 0.985 : 1.0;

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(endDate);
    date.setDate(date.getDate() - i);

    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // Base value with seasonal trend
    const daysFromStart = days - 1 - i;
    let volume = baseVolume * Math.pow(seasonalMultiplier, daysFromStart);

    // Weekend drop
    if (isWeekend) {
      volume *= 1 - weekendDrop;
    }

    // Festival spike
    const festivalSpike = festivalSpikes.find((spike) => spike.day === daysFromStart);
    const isFestival = !!festivalSpike;
    if (festivalSpike) {
      volume *= festivalSpike.multiplier;
    }

    // Random variance
    volume *= 1 + (Math.random() - 0.5) * 2 * variance;

    data.push({
      date: formatDate(date),
      orders: Math.round(volume),
      dayOfWeek,
      isWeekend,
      isFestival,
    });
  }

  return data;
}

// ============================================================================
// Mock 30-Day Order Trend
// ============================================================================

export const mockOrderTrend30Days = generateRealisticTrend({
  days: 30,
  baseVolume: 42,
  variance: 0.2, // 20% random variation
  weekendDrop: 0.3, // 30% drop on weekends
  festivalSpikes: [
    { day: 10, multiplier: 2.2 }, // Mid-month sale
    { day: 24, multiplier: 1.8 }, // End-of-month push
  ],
  seasonalTrend: 'up', // Gradual growth
});

// ============================================================================
// Alternative Mock Data (for testing different scenarios)
// ============================================================================

/**
 * Declining trend (for stress testing)
 */
export const mockOrderTrendDeclining = generateRealisticTrend({
  days: 30,
  baseVolume: 50,
  variance: 0.15,
  weekendDrop: 0.25,
  seasonalTrend: 'down',
});

/**
 * Flat trend (steady business)
 */
export const mockOrderTrendFlat = generateRealisticTrend({
  days: 30,
  baseVolume: 38,
  variance: 0.1,
  weekendDrop: 0.2,
  seasonalTrend: 'flat',
});

/**
 * Volatile trend (unpredictable business)
 */
export const mockOrderTrendVolatile = generateRealisticTrend({
  days: 30,
  baseVolume: 45,
  variance: 0.4, // High variance
  weekendDrop: 0.35,
  festivalSpikes: [
    { day: 5, multiplier: 3.0 },
    { day: 12, multiplier: 2.5 },
    { day: 20, multiplier: 1.9 },
  ],
});

// ============================================================================
// 7-Day Short Trend (for compact views)
// ============================================================================

export const mockOrderTrend7Days = generateRealisticTrend({
  days: 7,
  baseVolume: 42,
  variance: 0.18,
  weekendDrop: 0.25,
  seasonalTrend: 'up',
});

// ============================================================================
// Export with metadata
// ============================================================================

export interface TrendMetadata {
  totalOrders: number;
  avgDaily: number;
  peakDay: OrderTrendDataPoint;
  lowestDay: OrderTrendDataPoint;
  weekdayAvg: number;
  weekendAvg: number;
  trend: 'up' | 'down' | 'flat';
}

export function getTrendMetadata(data: OrderTrendDataPoint[]): TrendMetadata {
  const totalOrders = data.reduce((sum, d) => sum + d.orders, 0);
  const avgDaily = Math.round(totalOrders / data.length);

  const peakDay = data.reduce((max, d) => (d.orders > max.orders ? d : max), data[0]);
  const lowestDay = data.reduce((min, d) => (d.orders < min.orders ? d : min), data[0]);

  const weekdayData = data.filter((d) => !d.isWeekend);
  const weekendData = data.filter((d) => d.isWeekend);

  const weekdayAvg = Math.round(
    weekdayData.reduce((sum, d) => sum + d.orders, 0) / weekdayData.length
  );
  const weekendAvg = Math.round(
    weekendData.reduce((sum, d) => sum + d.orders, 0) / weekendData.length
  );

  // Determine overall trend (first half vs second half)
  const midPoint = Math.floor(data.length / 2);
  const firstHalf = data.slice(0, midPoint);
  const secondHalf = data.slice(midPoint);

  const firstHalfAvg = firstHalf.reduce((sum, d) => sum + d.orders, 0) / firstHalf.length;
  const secondHalfAvg = secondHalf.reduce((sum, d) => sum + d.orders, 0) / secondHalf.length;

  const trendDirection =
    secondHalfAvg > firstHalfAvg * 1.05 ? 'up' : secondHalfAvg < firstHalfAvg * 0.95 ? 'down' : 'flat';

  return {
    totalOrders,
    avgDaily,
    peakDay,
    lowestDay,
    weekdayAvg,
    weekendAvg,
    trend: trendDirection,
  };
}

export const mockOrderTrend30DaysMetadata = getTrendMetadata(mockOrderTrend30Days);
