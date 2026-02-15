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
    History,
    ChevronRight,
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { formatCurrency } from '@/src/lib/utils';
import { Button } from '@/src/components/ui/core/Button';
import { trackEvent, EVENTS } from '@/src/lib/analytics';

const QUICK_ADD_PRESETS: Array<{ value: number; orders: string; popular?: boolean }> = [
    { value: 1000, orders: '~20 orders' },
    { value: 5000, orders: '~100 orders', popular: true },
    { value: 10000, orders: '~200 orders' },
];

interface WalletHeroProps {
    balance: number;
    weeklyChange?: number;
    lowBalanceThreshold?: number;
    averageWeeklySpend?: number;
    onAddMoney?: () => void;
    /** Opens Add Money with amount pre-selected (for quick-add presets) */
    onAddMoneyWithAmount?: (amount: number) => void;
    onEnableAutoRecharge?: () => void;
    isAutoRechargeEnabled?: boolean;
    /** Scroll to transactions section (e.g. #wallet-transactions) */
    onViewTransactions?: () => void;
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
    onAddMoneyWithAmount,
    onEnableAutoRecharge,
    onViewTransactions,
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

    const handleQuickAdd = useCallback(
        (amount: number) => {
            trackEvent(EVENTS.TREND_CLICKED, { metric: 'wallet_quick_add', amount });
            if (onAddMoneyWithAmount) {
                onAddMoneyWithAmount(amount);
            } else {
                onAddMoney?.();
            }
        },
        [onAddMoneyWithAmount, onAddMoney]
    );

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
                            <AlertTriangle className="w-4 h-4 animate-pulse shrink-0" />
                            <span>Critical: Add money now to continue shipping</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Hero Card - baby pink → sky blue → primary gradient */}
            <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                className={cn(
                    'relative overflow-hidden rounded-[var(--radius-2xl)] p-6 sm:p-8',
                    'bg-gradient-to-br from-[var(--wallet-hero-from)] via-[var(--wallet-hero-via)] to-[var(--wallet-hero-to)]',
                    'border border-[var(--wallet-hero-border)]',
                    isLowBalance
                        ? 'ring-2 ring-[var(--warning)]/50'
                        : 'ring-0'
                )}
            >
                {/* Gradient orbs - primary, sky blue, baby pink */}
                <div className="absolute -top-20 -right-20 w-72 h-72 sm:w-80 sm:h-80 bg-[var(--primary-blue)]/20 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute top-1/2 -left-24 w-48 h-48 sm:w-56 sm:h-56 bg-[var(--info)]/15 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-12 right-1/3 w-40 h-40 sm:w-48 sm:h-48 bg-[var(--wallet-hero-orb-pink)] rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 flex flex-col md:flex-row md:items-stretch gap-6 md:gap-8">
                    {/* Left: Balance + Actions (with accent bar) */}
                    <div className="flex-1 min-w-0 space-y-6 border-l-4 border-[var(--primary-blue)] pl-4 sm:pl-6">
                        {/* Header Row */}
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-[var(--primary-blue)]/10">
                                    <Wallet className="w-6 h-6 text-[var(--primary-blue)]" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                                        Available Balance
                                    </h3>
                                    {isLowBalance && (
                                        <span className="text-xs text-[var(--warning)] font-medium flex items-center gap-1 mt-0.5">
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
                                            ? 'bg-[var(--success-bg)] text-[var(--success)]'
                                            : 'bg-[var(--error-bg)] text-[var(--error)]'
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
                            <div className="font-mono text-4xl sm:text-5xl font-bold tracking-tight text-[var(--text-primary)]">
                                {formatCurrency(balance)}
                            </div>

                            <div className="mt-3 flex flex-wrap items-center gap-4 text-[var(--text-secondary)] text-sm">
                                <div className="flex items-center gap-1.5">
                                    <Package className="w-4 h-4 opacity-80" />
                                    <span>~{remainingOrders} more orders</span>
                                </div>
                                {weeksRemaining > 0 && weeksRemaining < 2 && (
                                    <div className="flex items-center gap-1.5 text-[var(--warning)]">
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
                                    'bg-gradient-to-r from-[var(--primary-blue)] to-[var(--primary-blue-deep)] text-white hover:opacity-95',
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
                                        'bg-[var(--wallet-hero-card)] hover:bg-[var(--wallet-hero-card-hover)]',
                                        'text-[var(--text-primary)] border border-[var(--wallet-hero-card-border)] font-medium text-sm'
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
                                        'bg-[var(--success-bg)] hover:bg-[var(--success)]/10',
                                        'text-[var(--success)] border border-[var(--success)]/30 font-medium text-sm'
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
                                        'bg-[var(--wallet-hero-card)] border border-[var(--wallet-hero-card-border)]'
                                    )}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 rounded-lg bg-[var(--warning-bg)]">
                                            <Zap className="w-5 h-5 text-[var(--warning)]" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-[var(--text-primary)] font-bold text-sm mb-1">
                                                Enable Auto-Recharge
                                            </h4>
                                            <p className="text-[var(--text-secondary)] text-xs leading-relaxed mb-3">
                                                Never run out of balance. Auto-recharge {formatCurrency(5000)} when balance
                                                falls below {formatCurrency(lowBalanceThreshold)}.
                                            </p>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <Button
                                                    onClick={handleEnableAutoRecharge}
                                                    size="sm"
                                                    className="h-9 px-4 rounded-lg bg-gradient-to-r from-[var(--primary-blue)] to-[var(--primary-blue-deep)] text-white hover:opacity-95 font-medium text-xs"
                                                >
                                                    Enable Auto-Recharge
                                                    <ArrowRight className="w-4 h-4 ml-1" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setShowAutoRecharge(false)}
                                                    className="h-9 px-4 text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-medium text-xs"
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

                    {/* Right: Quick Add + View History */}
                    <div className="md:w-72 lg:w-80 shrink-0 flex flex-col gap-4">
                        {/* Quick Add Presets */}
                        <div className="rounded-xl bg-[var(--wallet-hero-card)] border border-[var(--wallet-hero-card-border)] p-4">
                            <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">
                                Quick Add
                            </p>
                            <div className="space-y-2">
                                {QUICK_ADD_PRESETS.map((preset) => (
                                    <button
                                        key={preset.value}
                                        onClick={() => handleQuickAdd(preset.value)}
                                        className={cn(
                                            'relative w-full flex items-center justify-between gap-2 px-4 py-3 rounded-lg',
                                            'bg-[var(--wallet-hero-card-inner)] hover:bg-[var(--wallet-hero-card)]',
                                            'border border-[var(--wallet-hero-card-border)]',
                                            'text-[var(--text-primary)] font-semibold text-sm transition-colors',
                                            'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-blue)]/50'
                                        )}
                                        aria-label={`Add ${formatCurrency(preset.value)} to wallet`}
                                    >
                                        <span className="flex items-center gap-2">
                                            {formatCurrency(preset.value, 'INR', { compact: true })}
                                            {preset.popular && (
                                                <span className="text-[10px] font-bold text-[var(--warning)] bg-[var(--warning-bg)] px-1.5 py-0.5 rounded">
                                                    Popular
                                                </span>
                                            )}
                                        </span>
                                        <span className="text-xs text-[var(--text-secondary)] font-normal">
                                            {preset.orders}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* View Transactions */}
                        {onViewTransactions && (
                            <button
                                onClick={onViewTransactions}
                                className={cn(
                                    'flex items-center justify-between gap-2 px-4 py-3 rounded-xl',
                                    'bg-[var(--wallet-hero-card)] hover:bg-[var(--wallet-hero-card-hover)]',
                                    'border border-[var(--wallet-hero-card-border)]',
                                    'text-[var(--text-primary)] font-medium text-sm transition-colors',
                                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-blue)]/50'
                                )}
                                aria-label="View transaction history"
                            >
                                <span className="flex items-center gap-2">
                                    <History className="w-4 h-4 text-[var(--text-secondary)]" />
                                    View Transactions
                                </span>
                                <ChevronRight className="w-4 h-4 text-[var(--text-tertiary)]" />
                            </button>
                        )}
                    </div>
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
                    <AlertTriangle className="w-5 h-5 text-[var(--warning)] shrink-0 mt-0.5" />
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
