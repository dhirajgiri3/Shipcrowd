/**
 * WalletHero - Balance display and quick actions
 *
 * Features:
 * - Prominent balance display
 * - Low/critical balance alerts
 * - Trend indicator (when data available)
 * - Add Money CTA
 * - Auto-recharge toggle
 */

'use client';

import { useState, useCallback } from 'react';
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
    Clock,
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { formatCurrency } from '@/src/lib/utils';
import { Button } from '@/src/components/ui/core/Button';
import { trackEvent, EVENTS } from '@/src/lib/analytics';

interface WalletHeroProps {
    balance: number;
    weeklyChange?: number;
    lowBalanceThreshold?: number;
    averageWeeklySpend?: number;
    onAddMoney?: () => void;
    onEnableAutoRecharge?: () => void;
    isAutoRechargeEnabled?: boolean;
    className?: string;
}

const AVG_ORDER_COST = 50;

function calculateRemainingOrders(balance: number, avgOrderCost: number = AVG_ORDER_COST): number {
    return Math.max(0, Math.floor(balance / avgOrderCost));
}

export function WalletHero({
    balance,
    weeklyChange = 0,
    lowBalanceThreshold = 1000,
    averageWeeklySpend = 3500,
    onAddMoney,
    onEnableAutoRecharge,
    isAutoRechargeEnabled = false,
    className,
}: WalletHeroProps) {
    const [showAutoRecharge, setShowAutoRecharge] = useState(false);

    const isLowBalance = balance < lowBalanceThreshold;
    const isCriticalBalance = balance < lowBalanceThreshold / 2;
    const remainingOrders = calculateRemainingOrders(balance);
    const weeksRemaining = averageWeeklySpend > 0 ? balance / averageWeeklySpend : 0;
    const isPositiveTrend = weeklyChange > 0;

    const suggestedTopUp = Math.ceil((averageWeeklySpend * 2 - balance) / 1000) * 1000;

    const handleAddMoney = useCallback(() => {
        trackEvent(EVENTS.TREND_CLICKED, { metric: 'wallet_add_money', range: '7d' });
        onAddMoney?.();
    }, [onAddMoney]);

    const handleEnableAutoRecharge = useCallback(() => {
        trackEvent(EVENTS.TREND_CLICKED, { metric: 'wallet_auto_recharge_enable', range: '7d' });
        setShowAutoRecharge(false);
        onEnableAutoRecharge?.();
    }, [onEnableAutoRecharge]);

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
                        <div
                            className={cn(
                                'flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold',
                                'bg-[var(--error)] text-white'
                            )}
                        >
                            <AlertTriangle className="w-4 h-4 animate-pulse flex-shrink-0" />
                            <span>Critical: Add money now to continue shipping</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Hero Card */}
            <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                className={cn(
                    'relative overflow-hidden rounded-[var(--radius-2xl)] p-6 sm:p-8',
                    'bg-gradient-to-br from-[var(--primary-blue)] to-[var(--primary-blue-deep)]',
                    'border border-white/20',
                    isLowBalance
                        ? 'ring-2 ring-[var(--warning)]/50'
                        : 'ring-0'
                )}
            >
                {/* Subtle gradient orbs */}
                <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/10 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 space-y-6">
                    {/* Header Row */}
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-white/20 backdrop-blur-sm">
                                <Wallet className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-white/90 uppercase tracking-wider">
                                    Available Balance
                                </h3>
                                {isLowBalance && (
                                    <span className="text-xs text-amber-200 font-medium flex items-center gap-1 mt-0.5">
                                        <AlertTriangle className="w-3 h-3" />
                                        Low balance
                                    </span>
                                )}
                            </div>
                        </div>

                        {weeklyChange !== 0 && (
                            <div
                                className={cn(
                                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold',
                                    isPositiveTrend
                                        ? 'bg-[var(--success)]/20 text-white/95'
                                        : 'bg-[var(--error)]/20 text-white/95'
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
                    <div>
                        <div className="text-4xl sm:text-5xl font-black text-white tracking-tight">
                            {formatCurrency(balance)}
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-4 text-white/75 text-sm">
                            <div className="flex items-center gap-1.5">
                                <Package className="w-4 h-4 opacity-80" />
                                <span>~{remainingOrders} more orders</span>
                            </div>
                            {weeksRemaining > 0 && weeksRemaining < 2 && (
                                <div className="flex items-center gap-1.5 text-amber-200">
                                    <Clock className="w-4 h-4" />
                                    <span>~{weeksRemaining.toFixed(1)} weeks remaining</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                        <Button
                            onClick={handleAddMoney}
                            className={cn(
                                'flex-1 sm:flex-initial flex items-center justify-center gap-2',
                                'h-12 px-6 rounded-xl',
                                'bg-white text-[var(--primary-blue)] hover:bg-white/95',
                                'font-bold text-sm border-0 shadow-none'
                            )}
                        >
                            <Plus className="w-5 h-5" />
                            Add Money
                        </Button>

                        {!isAutoRechargeEnabled && !showAutoRecharge && (
                            <Button
                                variant="ghost"
                                onClick={() => setShowAutoRecharge(true)}
                                className={cn(
                                    'h-12 px-5 rounded-xl',
                                    'bg-white/10 hover:bg-white/20 text-white',
                                    'border border-white/20 font-medium text-sm'
                                )}
                                aria-label="Enable auto-recharge"
                            >
                                <Zap className="w-5 h-5" />
                            </Button>
                        )}

                        {isAutoRechargeEnabled && (
                            <Button
                                variant="ghost"
                                onClick={onEnableAutoRecharge}
                                className={cn(
                                    'h-12 px-5 rounded-xl',
                                    'bg-[var(--success)]/20 hover:bg-[var(--success)]/30',
                                    'text-white border border-[var(--success)]/30 font-medium text-sm'
                                )}
                            >
                                <span className="w-2 h-2 rounded-full bg-[var(--success)] animate-pulse mr-2" />
                                Auto On
                            </Button>
                        )}
                    </div>

                    {/* Auto-recharge Suggestion */}
                    <AnimatePresence>
                        {showAutoRecharge && (
                            <motion.div
                                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                animate={{ opacity: 1, height: 'auto', marginTop: 0 }}
                                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                            >
                                <div
                                    className={cn(
                                        'p-4 rounded-xl',
                                        'bg-white/10 backdrop-blur-sm border border-white/20'
                                    )}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 rounded-lg bg-[var(--warning)]/20">
                                            <Zap className="w-5 h-5 text-amber-200" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-white font-bold text-sm mb-1">
                                                Enable Auto-Recharge
                                            </h4>
                                            <p className="text-white/70 text-xs leading-relaxed mb-3">
                                                Never run out of balance. Auto-recharge ₹5,000 when balance
                                                falls below {formatCurrency(lowBalanceThreshold)}.
                                            </p>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <Button
                                                    onClick={handleEnableAutoRecharge}
                                                    size="sm"
                                                    className="h-9 px-4 rounded-lg bg-white text-[var(--primary-blue)] hover:bg-white/95 font-medium text-xs"
                                                >
                                                    Enable Auto-Recharge
                                                    <ArrowRight className="w-4 h-4 ml-1" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setShowAutoRecharge(false)}
                                                    className="h-9 px-4 text-white/70 hover:text-white font-medium text-xs"
                                                >
                                                    Not now
                                                </Button>
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
            {isLowBalance && !isCriticalBalance && suggestedTopUp > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                        'mt-4 flex items-start gap-3 px-4 py-3 rounded-xl',
                        'bg-[var(--warning-bg)] border border-[var(--warning)]/30'
                    )}
                >
                    <AlertTriangle className="w-5 h-5 text-[var(--warning)] flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[var(--text-primary)]">
                            Low wallet balance
                        </p>
                        <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                            Add {formatCurrency(suggestedTopUp)} to cover the next 2 weeks of shipping.
                        </p>
                    </div>
                </motion.div>
            )}
        </div>
    );
}
