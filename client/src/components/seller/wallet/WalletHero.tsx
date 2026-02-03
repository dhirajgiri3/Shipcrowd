/**
 * WalletHero - The money nerve center
 *
 * Psychology: Loss aversion - wallet balance MUST be prominent
 * Critical for Indian sellers - low balance = can't ship orders
 *
 * Features:
 * - Hero balance display (impossible to miss)
 * - Low balance alert (< ₹1000 threshold)
 * - Trend indicator (weekly comparison)
 * - One-tap add money CTA
 * - Auto-recharge toggle
 *
 * Research: F-pattern reading - top-left gets most attention
 */

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Plus,
  Zap,
  ArrowRight,
  Package,
  Clock
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { trackEvent, EVENTS } from '@/src/lib/analytics';

interface WalletHeroProps {
  balance: number;
  weeklyChange?: number; // Percentage change from last week
  lowBalanceThreshold?: number;
  averageWeeklySpend?: number;
  onAddMoney?: () => void;
  onEnableAutoRecharge?: () => void;
  isAutoRechargeEnabled?: boolean;
  className?: string;
}

/**
 * Calculate how many more orders can be shipped with current balance
 */
function calculateRemainingOrders(balance: number, avgOrderCost: number = 50): number {
  return Math.floor(balance / avgOrderCost);
}

export function WalletHero({
  balance,
  weeklyChange = 0,
  lowBalanceThreshold = 1000,
  averageWeeklySpend = 3500,
  onAddMoney,
  onEnableAutoRecharge,
  isAutoRechargeEnabled = false,
  className
}: WalletHeroProps) {
  const [showAutoRecharge, setShowAutoRecharge] = useState(false);

  // Determine if balance is low
  const isLowBalance = balance < lowBalanceThreshold;
  const isCriticalBalance = balance < lowBalanceThreshold / 2;

  // Calculate remaining shipping capacity
  const remainingOrders = calculateRemainingOrders(balance);
  const weeksRemaining = balance / averageWeeklySpend;

  // Trend direction
  const isPositiveTrend = weeklyChange > 0;
  const isNegativeTrend = weeklyChange < 0;

  const handleAddMoney = () => {
    trackEvent(EVENTS.TREND_CLICKED, {
      metric: 'wallet_add_money',
      range: '7d'
    });
    onAddMoney?.();
  };

  const handleEnableAutoRecharge = () => {
    trackEvent(EVENTS.TREND_CLICKED, {
      metric: 'wallet_auto_recharge_enable',
      range: '7d'
    });
    setShowAutoRecharge(false);
    onEnableAutoRecharge?.();
  };

  return (
    <div className={cn('relative', className)}>
      {/* Critical Low Balance Alert */}
      <AnimatePresence>
        {isCriticalBalance && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute -top-3 left-1/2 -translate-x-1/2 z-10"
          >
            <div className="flex items-center gap-2 px-4 py-2 bg-red-600 dark:bg-red-500 text-white rounded-full text-xs font-bold shadow-lg">
              <AlertTriangle className="w-4 h-4 animate-pulse" />
              <span>Critical: Add money now to continue shipping</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className={cn(
          'relative overflow-hidden rounded-3xl p-8',
          'bg-gradient-to-br from-[var(--primary-blue)] to-[var(--primary-blue-deep)]',
          'border-2 shadow-xl',
          isLowBalance
            ? 'border-orange-400 dark:border-orange-500 shadow-orange-500/20'
            : 'border-blue-400/30 shadow-blue-500/20'
        )}
      >
        {/* Decorative Gradient Blobs */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm">
                <Wallet className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white/80 uppercase tracking-wide">
                  Available Balance
                </h3>
                {isLowBalance && (
                  <span className="text-xs text-orange-200 font-medium flex items-center gap-1 mt-0.5">
                    <AlertTriangle className="w-3 h-3" />
                    Low balance
                  </span>
                )}
              </div>
            </div>

            {/* Trend Indicator */}
            {weeklyChange !== 0 && (
              <div
                className={cn(
                  'flex items-center gap-1 px-3 py-1.5 rounded-lg backdrop-blur-sm text-xs font-bold',
                  isPositiveTrend
                    ? 'bg-green-500/20 text-green-200'
                    : 'bg-red-500/20 text-red-200'
                )}
              >
                {isPositiveTrend ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
                <span>{Math.abs(weeklyChange).toFixed(1)}%</span>
              </div>
            )}
          </div>

          {/* Balance Display */}
          <div className="mb-6">
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-black text-white tracking-tight">
                ₹{balance.toLocaleString('en-IN')}
              </span>
            </div>

            {/* Contextual Info */}
            <div className="mt-3 flex items-center gap-4 text-white/70 text-sm">
              <div className="flex items-center gap-1.5">
                <Package className="w-4 h-4" />
                <span>~{remainingOrders} more orders</span>
              </div>
              {weeksRemaining < 2 && (
                <div className="flex items-center gap-1.5 text-orange-200">
                  <Clock className="w-4 h-4" />
                  <span>~{weeksRemaining.toFixed(1)} weeks remaining</span>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            {/* Primary CTA: Add Money */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleAddMoney}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white hover:bg-white/95 text-[var(--primary-blue)] font-bold text-sm shadow-lg transition-all"
            >
              <Plus className="w-5 h-5" />
              <span>Add Money</span>
            </motion.button>

            {/* Secondary: Auto-recharge - Only show if NOT enabled */}
            {!isAutoRechargeEnabled && !showAutoRecharge && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowAutoRecharge(true)}
                className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white font-medium text-sm transition-all border border-white/20"
              >
                <Zap className="w-5 h-5" />
              </motion.button>
            )}

            {/* Enabled Indicator - Updates Settings */}
            {isAutoRechargeEnabled && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onEnableAutoRecharge} // Re-opens settings
                className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-green-500/20 hover:bg-green-500/30 backdrop-blur-sm text-green-100 font-medium text-sm transition-all border border-green-500/30"
              >
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span>Auto On</span>
              </motion.button>
            )}
          </div>

          {/* Auto-recharge Suggestion */}
          <AnimatePresence>
            {showAutoRecharge && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                className="overflow-hidden"
              >
                <div className="p-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-yellow-500/20">
                      <Zap className="w-5 h-5 text-yellow-200" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-white font-bold text-sm mb-1">
                        Enable Auto-Recharge
                      </h4>
                      <p className="text-white/70 text-xs leading-relaxed mb-3">
                        Never run out of balance. Auto-recharge ₹5,000 when balance falls below ₹{lowBalanceThreshold.toLocaleString()}.
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleEnableAutoRecharge}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white hover:bg-white/95 text-[var(--primary-blue)] font-medium text-xs transition-all"
                        >
                          Enable Auto-Recharge
                          <ArrowRight className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setShowAutoRecharge(false)}
                          className="px-4 py-2 text-white/70 hover:text-white font-medium text-xs transition-colors"
                        >
                          Not now
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Low Balance Warning (below card) */}
      {isLowBalance && !isCriticalBalance && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 flex items-center gap-2 px-4 py-3 rounded-xl bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800"
        >
          <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-orange-900 dark:text-orange-200">
              Low wallet balance detected
            </p>
            <p className="text-xs text-orange-700 dark:text-orange-300 mt-0.5">
              Add ₹{Math.ceil((averageWeeklySpend * 2 - balance) / 1000) * 1000} to cover next 2 weeks ({Math.ceil(remainingOrders / 7)} days of shipping)
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
