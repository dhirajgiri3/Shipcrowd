/**
 * OrderTrendChart Component
 *
 * Phase 1.2: Dominant visual data chart (Tier 1 priority)
 *
 * Research-backed UX:
 * - Visual data retention: 65% vs 10% for text
 * - Area chart shows trend direction at a glance
 * - 30 days = optimal for identifying patterns without overwhelming
 * - Weekends/festivals highlighted (Indian market context)
 *
 * Features:
 * - 30-day order volume trend (realistic mock data)
 * - Area fill with gradient (visual prominence)
 * - Hover/tap tooltips with date + order count
 * - Click data point → analytics event fired
 * - Mobile optimized: Simplified axis, touch-friendly
 * - Tier 1 styling: rounded-3xl, p-8, shadow-md
 */

"use client";

import { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, Calendar, Info, ChevronDown, ChevronUp, Package } from 'lucide-react';
import { track, EVENTS } from '@/src/lib/analytics/events';

// --- TYPES ---

export interface OrderTrendDataPoint {
  date: string; // YYYY-MM-DD
  orders: number;
  dayOfWeek: number; // 0 = Sunday, 6 = Saturday
  isWeekend: boolean;
  isFestival: boolean;
}

export interface OrderTrendChartProps {
  data: OrderTrendDataPoint[];
  onDataPointClick?: (dataPoint: OrderTrendDataPoint) => void;
  className?: string;
  periodLabel?: string;
  timeframeDays?: number;
}

// --- HELPER FUNCTIONS ---

/**
 * Format date for display
 */
function formatDate(dateStr: string, format: 'short' | 'full' = 'short'): string {
  const date = new Date(dateStr);

  if (format === 'short') {
    // "Jan 15" format
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  // "Monday, Jan 15, 2024" format
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

/**
 * Calculate SVG path for area chart
 */
function calculateAreaPath(
  data: OrderTrendDataPoint[],
  width: number,
  height: number,
  padding: { top: number; bottom: number; left: number; right: number }
): string {
  if (data.length === 0) return '';

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxOrders = Math.max(...data.map(d => d.orders));
  const minOrders = Math.min(...data.map(d => d.orders));
  const range = maxOrders - minOrders || 1;

  const xDenominator = Math.max(1, data.length - 1);
  const points = data.map((point, index) => {
    const x = padding.left + (index / xDenominator) * chartWidth;
    const y = padding.top + chartHeight - ((point.orders - minOrders) / range) * chartHeight;
    return { x, y };
  });

  // Create area path (line + fill to bottom)
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${height - padding.bottom} L ${padding.left} ${height - padding.bottom} Z`;

  return areaPath;
}

/**
 * Calculate trend metadata
 */
function calculateTrendMetadata(data: OrderTrendDataPoint[]) {
  if (data.length < 2) return { trend: 'neutral' as const, changePercent: 0 };

  const midPoint = Math.floor(data.length / 2);
  const firstHalf = data.slice(0, midPoint);
  const secondHalf = data.slice(midPoint);

  const firstHalfAvg = firstHalf.reduce((sum, d) => sum + d.orders, 0) / firstHalf.length;
  const secondHalfAvg = secondHalf.reduce((sum, d) => sum + d.orders, 0) / secondHalf.length;

  const changePercent = firstHalfAvg > 0
    ? ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100
    : (secondHalfAvg > 0 ? 100 : 0);

  const trend = changePercent > 5 ? 'up' : changePercent < -5 ? 'down' : 'neutral';

  return { trend, changePercent };
}

// --- MAIN COMPONENT ---

export function OrderTrendChart({
  data,
  onDataPointClick,
  className = '',
  periodLabel = 'Last 30 Days',
  timeframeDays = 30,
}: OrderTrendChartProps) {
  // Collapsible state with localStorage persistence
  const [isCollapsed, setIsCollapsed] = useState(true); // Default collapsed
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  // Load collapsed state from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('orderTrendChart_collapsed');
    if (saved !== null) {
      setIsCollapsed(saved === 'true');
    }
  }, []);

  // Save collapsed state to localStorage
  const toggleCollapsed = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('orderTrendChart_collapsed', String(newState));
  };

  // Chart dimensions
  const width = 800;
  const height = 300;
  const padding = { top: 20, bottom: 40, left: 40, right: 20 };

  // Calculate trend
  const { trend, changePercent } = useMemo(() => calculateTrendMetadata(data), [data]);

  // Calculate area path
  const areaPath = useMemo(() =>
    calculateAreaPath(data, width, height, padding),
    [data, width, height, padding]
  );

  // Calculate data points for interactive circles
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const maxOrders = Math.max(...data.map(d => d.orders));
  const minOrders = Math.min(...data.map(d => d.orders));
  const range = maxOrders - minOrders || 1;

  const xDenominator = Math.max(1, data.length - 1);
  const dataPoints = data.map((point, index) => ({
    x: padding.left + (index / xDenominator) * chartWidth,
    y: padding.top + chartHeight - ((point.orders - minOrders) / range) * chartHeight,
    data: point
  }));

  // Handle data point click
  const handleDataPointClick = (point: OrderTrendDataPoint, index: number) => {
    track(EVENTS.TREND_CLICKED, {
      metric: 'order_volume',
      range: `${timeframeDays}d`,
      data_point_index: index,
      data_point_value: point.orders,
      is_weekend: point.isWeekend,
      is_festival: point.isFestival,
      date: point.date,
    });

    onDataPointClick?.(point);
  };

  // Total orders in period - safe calculation to prevent NaN
  const totalOrders = data.reduce((sum, d) => sum + (d.orders || 0), 0);
  const avgDaily = data.length > 0 ? Math.round(totalOrders / data.length) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-3xl p-4 md:p-6 shadow-md bg-[var(--bg-primary)] border border-[var(--border-subtle)] ${className}`}
    >
      {/* Collapsible Header - Enhanced visibility */}
      <button
        onClick={toggleCollapsed}
        className="w-full flex items-center justify-between gap-4 mb-4 p-3 rounded-xl hover:bg-[var(--bg-secondary)] transition-all group border border-transparent hover:border-[var(--border-default)]"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <h3 className="text-lg md:text-xl font-bold text-[var(--text-primary)]">{periodLabel} Order Trends</h3>
            <div className="px-2 py-0.5 rounded-md bg-[var(--bg-tertiary)] text-[10px] font-medium text-[var(--text-muted)] uppercase">
              Strategic
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {!isCollapsed && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-secondary)]">
              <span className="text-sm text-[var(--text-secondary)]">Avg Daily:</span>
              <span className="text-lg font-bold text-[var(--text-primary)]">{avgDaily}</span>
              <div className={`flex items-center gap-1 ${trend === 'up' ? 'text-[var(--success)]' :
                trend === 'down' ? 'text-[var(--error)]' :
                  'text-[var(--text-secondary)]'
                }`}>
                {trend === 'up' && <TrendingUp className="w-4 h-4" />}
                {trend === 'down' && <TrendingDown className="w-4 h-4" />}
                {trend === 'neutral' && <Minus className="w-4 h-4" />}
                <span className="text-xs font-semibold">
                  {Math.abs(changePercent).toFixed(1)}%
                </span>
              </div>
            </div>
          )}

          {/* Prominent expand/collapse indicator */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--primary-blue)]/10 border border-[var(--primary-blue)]/20 group-hover:bg-[var(--primary-blue)]/20 transition-colors">
            <span className="text-xs font-medium text-[var(--primary-blue)] hidden md:block">
              {isCollapsed ? 'Click to expand' : 'Click to collapse'}
            </span>
            {isCollapsed ? (
              <ChevronDown className="w-5 h-5 text-[var(--primary-blue)] group-hover:translate-y-0.5 transition-transform" />
            ) : (
              <ChevronUp className="w-5 h-5 text-[var(--primary-blue)] group-hover:-translate-y-0.5 transition-transform" />
            )}
          </div>
        </div>
      </button>

      {/* Collapsible Content */}
      {!isCollapsed && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Empty State */}
          {data.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="w-16 h-16 text-[var(--text-muted)] opacity-30 mb-4" />
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                No Order Data Available
              </h3>
              <p className="text-sm text-[var(--text-secondary)] max-w-md">
                Start creating orders to see your 30-day trend analysis here. This chart will help you identify patterns and plan better.
              </p>
            </div>
          ) : (
            <>
              {/* Original Header (hidden since we made custom header above) */}
              <div className="hidden flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4 md:mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg md:text-2xl font-bold text-[var(--text-primary)]">Order Volume Trend</h3>
                    <div className="group relative">
                      <Info className="w-4 h-4 text-[var(--text-muted)] cursor-help" />
                      <div className="absolute left-0 top-6 w-64 p-3 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                        <p className="text-xs text-[var(--text-secondary)]">
                          30-day order volume showing weekday/weekend patterns and seasonal trends
                        </p>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-[var(--text-secondary)]">Last 30 days</p>
                </div>

                {/* Trend Indicator */}
                <div className="flex items-center justify-between md:justify-start gap-3 md:gap-4">
                  <div className="text-left md:text-right">
                    <div className="text-xs md:text-sm text-[var(--text-muted)] mb-0.5">Avg Daily</div>
                    <div className="text-xl md:text-2xl font-bold text-[var(--text-primary)]">{avgDaily}</div>
                  </div>
                  <div className={`flex items-center gap-1.5 px-2.5 md:px-3 py-1.5 rounded-lg ${trend === 'up' ? 'bg-[var(--success-bg)] text-[var(--success)]' :
                    trend === 'down' ? 'bg-[var(--error-bg)] text-[var(--error)]' :
                      'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
                    }`}>
                    {trend === 'up' && <TrendingUp className="w-3.5 md:w-4 h-3.5 md:h-4" />}
                    {trend === 'down' && <TrendingDown className="w-3.5 md:w-4 h-3.5 md:h-4" />}
                    {trend === 'neutral' && <Minus className="w-3.5 md:w-4 h-3.5 md:h-4" />}
                    <span className="text-xs md:text-sm font-semibold">
                      {Math.abs(changePercent).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Chart */}
              <div className="relative">
                <svg
                  viewBox={`0 0 ${width} ${height}`}
                  className="w-full h-auto"
                  style={{ maxHeight: '300px' }}
                >
                  {/* Gradient for area fill */}
                  <defs>
                    <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop
                        offset="0%"
                        style={{
                          stopColor: trend === 'up' ? 'var(--success)' :
                            trend === 'down' ? 'var(--error)' :
                              'var(--primary-blue)',
                          stopOpacity: 0.3
                        }}
                      />
                      <stop
                        offset="100%"
                        style={{
                          stopColor: trend === 'up' ? 'var(--success)' :
                            trend === 'down' ? 'var(--error)' :
                              'var(--primary-blue)',
                          stopOpacity: 0.05
                        }}
                      />
                    </linearGradient>
                  </defs>

                  {/* Y-axis grid lines */}
                  {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                    const y = padding.top + chartHeight - ratio * chartHeight;
                    const value = Math.round(minOrders + ratio * range);
                    return (
                      <g key={ratio}>
                        <line
                          x1={padding.left}
                          y1={y}
                          x2={width - padding.right}
                          y2={y}
                          stroke="var(--border-subtle)"
                          strokeWidth="1"
                          strokeDasharray="4 4"
                        />
                        <text
                          x={padding.left - 8}
                          y={y + 4}
                          textAnchor="end"
                          className="text-xs fill-[var(--text-muted)]"
                        >
                          {value}
                        </text>
                      </g>
                    );
                  })}

                  {/* Area chart */}
                  <path
                    d={areaPath}
                    fill="url(#areaGradient)"
                    stroke={trend === 'up' ? 'var(--success)' : trend === 'down' ? 'var(--error)' : 'var(--primary-blue)'}
                    strokeWidth="2.5"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />

                  {/* Interactive data points */}
                  {dataPoints.map((point, index) => {
                    const isHovered = hoveredIndex === index;
                    const isFestival = point.data.isFestival;
                    const isWeekend = point.data.isWeekend;

                    return (
                      <g key={index}>
                        {/* Festival marker */}
                        {isFestival && (
                          <circle
                            cx={point.x}
                            cy={point.y}
                            r="8"
                            fill="var(--warning-bg)"
                            stroke="var(--warning)"
                            strokeWidth="2"
                            opacity="0.5"
                          />
                        )}

                        {/* Weekend highlight */}
                        {isWeekend && !isFestival && (
                          <rect
                            x={point.x - 3}
                            y={padding.top}
                            width="6"
                            height={chartHeight}
                            fill="var(--bg-secondary)"
                            opacity="0.3"
                          />
                        )}

                        {/* Data point circle */}
                        <circle
                          cx={point.x}
                          cy={point.y}
                          r={isHovered ? 6 : 4}
                          fill={trend === 'up' ? 'var(--success)' : trend === 'down' ? 'var(--error)' : 'var(--primary-blue)'}
                          stroke="var(--bg-primary)"
                          strokeWidth="2"
                          className="cursor-pointer transition-all"
                          onMouseEnter={(e) => {
                            setHoveredIndex(index);
                            const rect = e.currentTarget.getBoundingClientRect();
                            setTooltipPosition({ x: point.x, y: point.y });
                          }}
                          onMouseLeave={() => setHoveredIndex(null)}
                          onClick={() => handleDataPointClick(point.data, index)}
                        />
                      </g>
                    );
                  })}

                  {/* X-axis labels (show every 5th day to avoid crowding) */}
                  {dataPoints
                    .filter((_, index) => index % 5 === 0 || index === dataPoints.length - 1)
                    .map((point, idx) => (
                      <text
                        key={idx}
                        x={point.x}
                        y={height - padding.bottom + 20}
                        textAnchor="middle"
                        className="text-xs fill-[var(--text-muted)]"
                      >
                        {formatDate(point.data.date)}
                      </text>
                    ))}
                </svg>

                {/* Tooltip */}
                {hoveredIndex !== null && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-lg shadow-lg p-3 pointer-events-none z-10"
                    style={{
                      left: `${(tooltipPosition.x / width) * 100}%`,
                      top: `${(tooltipPosition.y / height) * 100 - 15}%`,
                      transform: 'translate(-50%, -100%)'
                    }}
                  >
                    <div className="text-xs text-[var(--text-muted)] mb-1">
                      {formatDate(data[hoveredIndex].date, 'full')}
                    </div>
                    <div className="text-lg font-bold text-[var(--text-primary)]">
                      {data[hoveredIndex].orders} orders
                    </div>
                    {data[hoveredIndex].isFestival && (
                      <div className="text-xs text-[var(--warning)] mt-1 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Festival spike
                      </div>
                    )}
                    {data[hoveredIndex].isWeekend && !data[hoveredIndex].isFestival && (
                      <div className="text-xs text-[var(--text-muted)] mt-1">
                        Weekend
                      </div>
                    )}
                  </motion.div>
                )}
              </div>

              {/* Legend */}
              <div className="flex flex-wrap items-center gap-3 md:gap-6 mt-4 md:mt-6 text-xs text-[var(--text-secondary)]">
                <div className="flex items-center gap-1.5 md:gap-2">
                  <div className="w-2.5 md:w-3 h-2.5 md:h-3 rounded-full bg-[var(--warning)]" />
                  <span className="text-[10px] md:text-xs">Festival spike</span>
                </div>
                <div className="flex items-center gap-1.5 md:gap-2">
                  <div className="w-2.5 md:w-3 h-2.5 md:h-3 bg-[var(--bg-secondary)] opacity-50" />
                  <span className="text-[10px] md:text-xs">Weekend</span>
                </div>
                <div className="flex items-center gap-1.5 md:gap-2">
                  <Calendar className="w-2.5 md:w-3 h-2.5 md:h-3" />
                  <span className="text-[10px] md:text-xs hidden sm:inline">Click any point to filter orders</span>
                  <span className="text-[10px] md:text-xs sm:hidden">Tap to filter</span>
                </div>
              </div>
            </>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
