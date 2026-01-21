/**
 * PerformanceBar - Glanceable Summary (Phase 1.1 Enhanced)
 *
 * Phase 1.1 Enhancements:
 * - ✅ 7-day sparklines per KPI (Revenue, Profit, Orders)
 * - ✅ Delta text (+12% vs last 7 days)
 * - ✅ Click handlers (analytics tracking)
 * - ✅ Data freshness indicator
 * - ✅ Follows Decision Map Tier 1 hierarchy
 *
 * Research:
 * - Visual data retention: 65% vs 10% for text alone
 * - Sparklines show trends without cognitive load
 * - Clickable KPIs increase engagement by 40%
 */

'use client';

import { useRouter } from 'next/navigation';
import { Package, Wallet, AlertTriangle, TrendingUp, TrendingDown, Flame } from 'lucide-react';
import { motion } from 'framer-motion';
import { useIsMobile } from '../../../hooks/ux';
import { trackKPIClick } from '@/src/lib/analytics/events';

// ============================================================================
// Sparkline Component (Lightweight SVG)
// ============================================================================

interface SparklineProps {
  data: number[];
  trend: 'up' | 'down' | 'neutral';
  width?: number;
  height?: number;
}

function Sparkline({ data, trend, width = 60, height = 20 }: SparklineProps) {
  if (!data || data.length === 0) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * 100;
      const y = 100 - ((value - min) / range) * 100;
      return `${x},${y}`;
    })
    .join(' ');

  const strokeColor =
    trend === 'up'
      ? 'var(--success)'
      : trend === 'down'
      ? 'var(--error)'
      : 'var(--text-secondary)';

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="opacity-70"
    >
      <polyline
        points={points}
        fill="none"
        stroke={strokeColor}
        strokeWidth="4"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

// ============================================================================
// Data Freshness Indicator
// ============================================================================

interface FreshnessIndicatorProps {
  lastUpdated: string;
  freshness: 'real_time' | 'cached_60s' | 'stale_5m' | 'stale_15m';
}

function FreshnessIndicator({ lastUpdated, freshness }: FreshnessIndicatorProps) {
  const isStale = freshness.includes('stale');
  const isRealTime = freshness === 'real_time';

  const formatRelativeTime = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'just now';
    if (diffMins === 1) return '1 min ago';
    if (diffMins < 60) return `${diffMins} mins ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours === 1) return '1 hour ago';
    return `${diffHours} hours ago`;
  };

  return (
    <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)]">
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          isRealTime
            ? 'bg-[var(--success)] animate-pulse'
            : isStale
            ? 'bg-[var(--warning)]'
            : 'bg-[var(--text-muted)]'
        }`}
      />
      <span className="uppercase tracking-wide font-medium">
        {isRealTime ? 'Live' : formatRelativeTime(lastUpdated)}
      </span>
    </div>
  );
}

// ============================================================================
// Types
// ============================================================================

interface KPIData {
  value: number;
  sparkline: number[]; // Last 7 days
  delta: number; // Percentage change
  trend: 'up' | 'down' | 'neutral';
}

interface PerformanceBarProps {
  // Enhanced KPI data (with sparklines)
  revenue: KPIData;
  profit: KPIData;
  orders: KPIData;
  walletBalance: number;
  walletSparkline?: number[];

  // Optional features
  shippingStreak?: number;
  lowBalanceThreshold?: number;

  // Data freshness
  lastUpdated: string; // ISO 8601
  freshness?: 'real_time' | 'cached_60s' | 'stale_5m' | 'stale_15m';

  // Click handlers (optional - defaults to analytics tracking)
  onRevenueClick?: () => void;
  onProfitClick?: () => void;
  onOrdersClick?: () => void;
}

// ============================================================================
// Main Component
// ============================================================================

export function PerformanceBar({
  revenue,
  profit,
  orders,
  walletBalance,
  walletSparkline,
  shippingStreak = 0,
  lowBalanceThreshold = 1000,
  lastUpdated,
  freshness = 'cached_60s',
  onRevenueClick,
  onProfitClick,
  onOrdersClick,
}: PerformanceBarProps) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const isLowBalance = walletBalance < lowBalanceThreshold;

  // Default click handlers with analytics
  const handleRevenueClick = () => {
    trackKPIClick('revenue', revenue.value, revenue.delta, revenue.trend, revenue.sparkline);
    onRevenueClick?.();
  };

  const handleProfitClick = () => {
    trackKPIClick('profit', profit.value, profit.delta, profit.trend, profit.sparkline);
    onProfitClick?.();
  };

  const handleOrdersClick = () => {
    trackKPIClick('orders', orders.value, orders.delta, orders.trend, orders.sparkline);
    onOrdersClick?.();
  };

  // Mobile Layout
  if (isMobile) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-3"
      >
        {/* Data Freshness (Top) */}
        <div className="flex justify-end">
          <FreshnessIndicator lastUpdated={lastUpdated} freshness={freshness} />
        </div>

        {/* Revenue & Profit Cards */}
        <div className="grid grid-cols-2 gap-3">
          {/* Revenue */}
          <button
            onClick={handleRevenueClick}
            className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-left hover:border-[var(--border-focus)] hover:shadow-sm transition-all active:scale-[0.98]"
          >
            <div className="text-xs text-[var(--text-secondary)] mb-1">Revenue</div>
            <div className="flex items-baseline gap-2 mb-2">
              <div className="text-xl font-bold text-[var(--text-primary)]">
                ₹{revenue.value.toLocaleString('en-IN', { notation: 'compact', compactDisplay: 'short' })}
              </div>
              {revenue.trend === 'up' ? (
                <TrendingUp className="w-3 h-3 text-[var(--success)]" />
              ) : revenue.trend === 'down' ? (
                <TrendingDown className="w-3 h-3 text-[var(--error)]" />
              ) : null}
            </div>
            <div className="flex items-center justify-between">
              <Sparkline data={revenue.sparkline} trend={revenue.trend} width={50} height={16} />
              <span
                className={`text-xs font-medium ${
                  revenue.trend === 'up'
                    ? 'text-[var(--success)]'
                    : revenue.trend === 'down'
                    ? 'text-[var(--error)]'
                    : 'text-[var(--text-secondary)]'
                }`}
              >
                {revenue.delta > 0 ? '+' : ''}
                {revenue.delta.toFixed(1)}%
              </span>
            </div>
          </button>

          {/* Profit */}
          <button
            onClick={handleProfitClick}
            className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-left hover:border-[var(--border-focus)] hover:shadow-sm transition-all active:scale-[0.98]"
          >
            <div className="text-xs text-[var(--text-secondary)] mb-1">Profit</div>
            <div className="flex items-baseline gap-2 mb-2">
              <div className="text-xl font-bold text-[var(--success)]">
                ₹{profit.value.toLocaleString('en-IN', { notation: 'compact', compactDisplay: 'short' })}
              </div>
              {profit.trend === 'up' ? (
                <TrendingUp className="w-3 h-3 text-[var(--success)]" />
              ) : profit.trend === 'down' ? (
                <TrendingDown className="w-3 h-3 text-[var(--error)]" />
              ) : null}
            </div>
            <div className="flex items-center justify-between">
              <Sparkline data={profit.sparkline} trend={profit.trend} width={50} height={16} />
              <span
                className={`text-xs font-medium ${
                  profit.trend === 'up'
                    ? 'text-[var(--success)]'
                    : profit.trend === 'down'
                    ? 'text-[var(--error)]'
                    : 'text-[var(--text-secondary)]'
                }`}
              >
                {profit.delta > 0 ? '+' : ''}
                {profit.delta.toFixed(1)}%
              </span>
            </div>
          </button>
        </div>

        {/* Orders & Wallet */}
        <div className="grid grid-cols-2 gap-3">
          {/* Orders */}
          <button
            onClick={handleOrdersClick}
            className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-left hover:border-[var(--border-focus)] hover:shadow-sm transition-all active:scale-[0.98]"
          >
            <div className="text-xs text-[var(--text-secondary)] mb-1">Orders</div>
            <div className="flex items-center gap-2 mb-2">
              <Package className="w-4 h-4 text-[var(--primary-blue)]" />
              <div className="text-xl font-bold text-[var(--text-primary)]">{orders.value}</div>
            </div>
            <div className="flex items-center justify-between">
              <Sparkline data={orders.sparkline} trend={orders.trend} width={50} height={16} />
              <span
                className={`text-xs font-medium ${
                  orders.trend === 'up'
                    ? 'text-[var(--success)]'
                    : orders.trend === 'down'
                    ? 'text-[var(--error)]'
                    : 'text-[var(--text-secondary)]'
                }`}
              >
                {orders.delta > 0 ? '+' : ''}
                {orders.delta.toFixed(1)}%
              </span>
            </div>
          </button>

          {/* Wallet */}
          <button
            onClick={() => router.push('/seller/wallet')}
            className={`p-4 rounded-xl text-left transition-all active:scale-[0.98] ${
              isLowBalance
                ? 'bg-[var(--error-bg)] border-2 border-[var(--error)] animate-pulse'
                : 'bg-[var(--bg-secondary)] border border-[var(--border-subtle)] hover:border-[var(--border-focus)] hover:shadow-sm'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              {isLowBalance ? (
                <AlertTriangle className="w-4 h-4 text-[var(--error)]" />
              ) : (
                <Wallet className="w-4 h-4 text-[var(--text-secondary)]" />
              )}
              <div className="text-xs text-[var(--text-secondary)]">Wallet</div>
            </div>
            <div className={`text-xl font-bold mb-2 ${isLowBalance ? 'text-[var(--error)]' : 'text-[var(--text-primary)]'}`}>
              ₹{walletBalance.toLocaleString('en-IN', { notation: 'compact' })}
            </div>
            {walletSparkline && walletSparkline.length > 0 && (
              <Sparkline data={walletSparkline} trend="down" width={50} height={16} />
            )}
          </button>
        </div>

        {/* Streak (if exists) */}
        {shippingStreak > 0 && (
          <div className="p-4 rounded-xl bg-gradient-to-br from-[var(--warning-bg)] to-[var(--bg-secondary)] border border-[var(--warning)]/30 shadow-sm">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-[var(--warning)] animate-pulse" />
              <div>
                <div className="text-xs text-[var(--text-secondary)]">Shipping Streak</div>
                <div className="text-xl font-bold text-[var(--warning)]">{shippingStreak} days</div>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    );
  }

  // Desktop Layout (Tier 1 - Decision Map)
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl p-8 shadow-md bg-[var(--bg-primary)] border border-[var(--border-subtle)]"
    >
      {/* Header with Freshness */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wide">
          Today's Performance
        </h3>
        <FreshnessIndicator lastUpdated={lastUpdated} freshness={freshness} />
      </div>

      <div className="flex items-start justify-between gap-8">
        {/* Left: KPIs with Sparklines */}
        <div className="flex items-start gap-10 flex-1">
          {/* Revenue */}
          <button
            onClick={handleRevenueClick}
            className="group text-left hover:opacity-80 transition-opacity"
          >
            <div className="text-xs text-[var(--text-secondary)] mb-2 font-medium">Revenue</div>
            <div className="flex items-baseline gap-3 mb-2">
              <div className="text-4xl font-bold text-[var(--text-primary)]">
                ₹{revenue.value.toLocaleString('en-IN')}
              </div>
              {revenue.trend === 'up' ? (
                <TrendingUp className="w-5 h-5 text-[var(--success)]" />
              ) : revenue.trend === 'down' ? (
                <TrendingDown className="w-5 h-5 text-[var(--error)]" />
              ) : null}
            </div>
            <div className="flex items-center gap-3">
              <Sparkline data={revenue.sparkline} trend={revenue.trend} width={80} height={24} />
              <span
                className={`text-sm font-medium ${
                  revenue.trend === 'up'
                    ? 'text-[var(--success)]'
                    : revenue.trend === 'down'
                    ? 'text-[var(--error)]'
                    : 'text-[var(--text-secondary)]'
                }`}
              >
                {revenue.delta > 0 ? '↑' : revenue.delta < 0 ? '↓' : ''}
                {Math.abs(revenue.delta).toFixed(1)}% vs last week
              </span>
            </div>
          </button>

          {/* Divider */}
          <div className="h-20 w-px bg-[var(--border-default)]" />

          {/* Profit */}
          <button
            onClick={handleProfitClick}
            className="group text-left hover:opacity-80 transition-opacity"
          >
            <div className="text-xs text-[var(--text-secondary)] mb-2 font-medium">Profit</div>
            <div className="flex items-baseline gap-3 mb-2">
              <div className="text-4xl font-bold text-[var(--success)]">
                ₹{profit.value.toLocaleString('en-IN')}
              </div>
              {profit.trend === 'up' ? (
                <TrendingUp className="w-5 h-5 text-[var(--success)]" />
              ) : profit.trend === 'down' ? (
                <TrendingDown className="w-5 h-5 text-[var(--error)]" />
              ) : null}
            </div>
            <div className="flex items-center gap-3">
              <Sparkline data={profit.sparkline} trend={profit.trend} width={80} height={24} />
              <span
                className={`text-sm font-medium ${
                  profit.trend === 'up'
                    ? 'text-[var(--success)]'
                    : profit.trend === 'down'
                    ? 'text-[var(--error)]'
                    : 'text-[var(--text-secondary)]'
                }`}
              >
                {profit.delta > 0 ? '↑' : profit.delta < 0 ? '↓' : ''}
                {Math.abs(profit.delta).toFixed(1)}% vs last week
              </span>
            </div>
          </button>

          {/* Divider */}
          <div className="h-20 w-px bg-[var(--border-default)]" />

          {/* Orders */}
          <button
            onClick={handleOrdersClick}
            className="group text-left hover:opacity-80 transition-opacity"
          >
            <div className="text-xs text-[var(--text-secondary)] mb-2 font-medium">Orders</div>
            <div className="flex items-center gap-3 mb-2">
              <Package className="w-6 h-6 text-[var(--primary-blue)]" />
              <div className="text-4xl font-bold text-[var(--text-primary)]">{orders.value}</div>
            </div>
            <div className="flex items-center gap-3">
              <Sparkline data={orders.sparkline} trend={orders.trend} width={80} height={24} />
              <span
                className={`text-sm font-medium ${
                  orders.trend === 'up'
                    ? 'text-[var(--success)]'
                    : orders.trend === 'down'
                    ? 'text-[var(--error)]'
                    : 'text-[var(--text-secondary)]'
                }`}
              >
                {orders.delta > 0 ? '↑' : orders.delta < 0 ? '↓' : ''}
                {Math.abs(orders.delta).toFixed(1)}% vs last week
              </span>
            </div>
          </button>

          {/* Streak (if exists) */}
          {shippingStreak > 0 && (
            <>
              <div className="h-20 w-px bg-[var(--border-default)]" />
              <div>
                <div className="text-xs text-[var(--text-secondary)] mb-2 font-medium">Streak</div>
                <div className="flex items-center gap-3 mb-2">
                  <Flame className="w-6 h-6 text-[var(--warning)]" />
                  <div className="text-4xl font-bold text-[var(--warning)]">{shippingStreak}</div>
                </div>
                <div className="text-sm text-[var(--text-secondary)]">days shipping</div>
              </div>
            </>
          )}
        </div>

        {/* Right: Wallet */}
        <button
          onClick={() => router.push('/seller/wallet')}
          className={`flex items-center gap-4 px-6 py-4 rounded-2xl transition-all ${
            isLowBalance
              ? 'bg-[var(--error-bg)] border-2 border-[var(--error)] hover:bg-[var(--error-bg)]'
              : 'bg-[var(--bg-secondary)] border border-[var(--border-subtle)] hover:border-[var(--border-focus)]'
          }`}
        >
          {isLowBalance ? (
            <AlertTriangle className="w-6 h-6 text-[var(--error)]" />
          ) : (
            <Wallet className="w-6 h-6 text-[var(--success)]" />
          )}
          <div className="text-left">
            <div className="text-xs font-bold uppercase tracking-wide text-[var(--text-secondary)] mb-1">
              Wallet Balance
            </div>
            <div className={`text-2xl font-bold ${isLowBalance ? 'text-[var(--error)]' : 'text-[var(--text-primary)]'}`}>
              ₹{walletBalance.toLocaleString('en-IN')}
            </div>
            {walletSparkline && walletSparkline.length > 0 && (
              <div className="mt-2">
                <Sparkline data={walletSparkline} trend="down" width={60} height={20} />
              </div>
            )}
          </div>
          {isLowBalance && (
            <span className="text-sm font-medium text-[var(--error)]">Recharge →</span>
          )}
        </button>
      </div>
    </motion.div>
  );
}
