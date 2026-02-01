'use client';

import { memo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    TrendingUp,
    TrendingDown,
    Wallet,
    ArrowUpRight,
    ArrowDownRight,
    AlertTriangle,
    ChevronDown,
    ChevronUp,
    Calendar,
    Loader2
} from 'lucide-react';
import { formatCurrency } from '@/src/lib/dashboard/data-utils';
import { useCashFlowForecast, useWalletBalance, transformCashFlowToComponent } from '@/src/core/api/hooks/finance';

/**
 * Cash Flow Forecast (7-Day)
 *
 * Critical for Indian sellers - helps plan inventory restocking
 * Shows expected inflows (COD settlements) and outflows (shipping costs)
 */

interface CashFlowDay {
    date: string;
    inflows: {
        type: 'cod_settlement' | 'refund' | 'other';
        amount: number;
        source?: string;
    }[];
    outflows: {
        type: 'shipping_costs' | 'wallet_deduction' | 'fees' | 'other';
        amount: number;
        estimated?: boolean;
    }[];
    netChange: number;
    endingBalance: number;
}

interface CashFlowAlert {
    type: 'low_balance' | 'large_inflow' | 'high_outflow';
    date: string;
    message: string;
}

interface CashFlowForecastData {
    currentBalance: number;
    forecast: CashFlowDay[];
    projectedBalance: number;
    alerts: CashFlowAlert[];
}

interface CashFlowForecastProps {
    onRechargeClick?: () => void;
}

const DayRow = memo(function DayRow({
    day,
    isToday,
    isExpanded,
    onToggle
}: {
    day: CashFlowDay;
    isToday: boolean;
    isExpanded: boolean;
    onToggle: () => void;
}) {
    const date = new Date(day.date);
    const totalInflow = day.inflows.reduce((sum, i) => sum + i.amount, 0);
    const totalOutflow = day.outflows.reduce((sum, o) => sum + o.amount, 0);
    const hasDetails = day.inflows.length > 0 || day.outflows.length > 0;

    return (
        <div className="border-b border-[var(--border-subtle)] last:border-b-0">
            <button
                onClick={onToggle}
                disabled={!hasDetails}
                className={`
                    w-full px-4 py-3 flex items-center justify-between gap-4 transition-colors
                    ${hasDetails ? 'hover:bg-[var(--bg-hover)] cursor-pointer' : 'cursor-default'}
                    ${isToday ? 'bg-[var(--primary-blue-soft)]/30' : ''}
                `}
            >
                <div className="flex items-center gap-3 min-w-[100px]">
                    <Calendar className="w-4 h-4 text-[var(--text-muted)]" />
                    <div className="text-left">
                        <p className={`text-sm font-medium ${isToday ? 'text-[var(--primary-blue)]' : 'text-[var(--text-primary)]'}`}>
                            {isToday ? 'Today' : date.toLocaleDateString('en-IN', { weekday: 'short' })}
                        </p>
                        <p className="text-xs text-[var(--text-muted)]">
                            {date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-6 flex-1 justify-end">
                    {/* Inflows */}
                    <div className="text-right min-w-[80px]">
                        {totalInflow > 0 ? (
                            <div className="flex items-center justify-end gap-1 text-[var(--success)]">
                                <ArrowUpRight className="w-3 h-3" />
                                <span className="text-sm font-medium">+{formatCurrency(totalInflow)}</span>
                            </div>
                        ) : (
                            <span className="text-sm text-[var(--text-muted)]">-</span>
                        )}
                    </div>

                    {/* Outflows */}
                    <div className="text-right min-w-[80px]">
                        {totalOutflow > 0 ? (
                            <div className="flex items-center justify-end gap-1 text-[var(--error)]">
                                <ArrowDownRight className="w-3 h-3" />
                                <span className="text-sm font-medium">-{formatCurrency(totalOutflow)}</span>
                            </div>
                        ) : (
                            <span className="text-sm text-[var(--text-muted)]">-</span>
                        )}
                    </div>

                    {/* Net Change */}
                    <div className="text-right min-w-[90px]">
                        <span className={`text-sm font-semibold ${day.netChange >= 0 ? 'text-[var(--success)]' : 'text-[var(--error)]'}`}>
                            {day.netChange >= 0 ? '+' : ''}{formatCurrency(day.netChange)}
                        </span>
                    </div>

                    {/* Ending Balance */}
                    <div className="text-right min-w-[90px]">
                        <span className={`text-sm font-semibold ${day.endingBalance < 5000 ? 'text-[var(--error)]' : 'text-[var(--text-primary)]'}`}>
                            {formatCurrency(day.endingBalance)}
                        </span>
                    </div>

                    {/* Expand Icon */}
                    {hasDetails && (
                        <div className="w-5">
                            {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-[var(--text-muted)]" />
                            ) : (
                                <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
                            )}
                        </div>
                    )}
                </div>
            </button>

            {/* Expanded Details */}
            <AnimatePresence>
                {isExpanded && hasDetails && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="px-4 pb-3 pl-11 space-y-2">
                            {day.inflows.map((inflow, idx) => (
                                <div key={`in-${idx}`} className="flex items-center justify-between text-xs">
                                    <span className="text-[var(--text-secondary)]">
                                        {inflow.type === 'cod_settlement' ? 'COD Settlement' : inflow.type}
                                        {inflow.source && ` (${inflow.source})`}
                                    </span>
                                    <span className="text-[var(--success)] font-medium">+{formatCurrency(inflow.amount)}</span>
                                </div>
                            ))}
                            {day.outflows.map((outflow, idx) => (
                                <div key={`out-${idx}`} className="flex items-center justify-between text-xs">
                                    <span className="text-[var(--text-secondary)]">
                                        {outflow.type === 'shipping_costs' ? 'Shipping Costs' : outflow.type}
                                        {outflow.estimated && ' (est.)'}
                                    </span>
                                    <span className="text-[var(--error)] font-medium">-{formatCurrency(outflow.amount)}</span>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
});

const CashFlowForecast = memo(function CashFlowForecast({
    onRechargeClick
}: CashFlowForecastProps) {
    const [expandedDay, setExpandedDay] = useState<number | null>(null);

    // API Hooks
    const { data: forecastData, isLoading: isForecastLoading, error: forecastError } = useCashFlowForecast();
    const { data: balanceData, isLoading: isBalanceLoading } = useWalletBalance();

    // Transform API data to component format
    const cashFlowData = forecastData && balanceData
        ? transformCashFlowToComponent(forecastData, balanceData.balance)
        : null;

    const isLoading = isForecastLoading || isBalanceLoading;

    if (isLoading) {
        return (
            <div className="rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] p-6">
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-[var(--primary-blue)]" />
                </div>
            </div>
        );
    }

    if (forecastError || !cashFlowData) {
        return (
            <div className="rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] p-6">
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <AlertTriangle className="h-12 w-12 text-[var(--text-muted)] opacity-30 mb-4" />
                    <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                        Unable to load cash flow forecast
                    </h3>
                    <p className="text-sm text-[var(--text-secondary)]">
                        Please try again later or contact support if the issue persists.
                    </p>
                </div>
            </div>
        );
    }

    // Calculate totals after null check
    const totalInflows = cashFlowData.forecast.reduce(
        (sum, day) => sum + day.inflows.reduce((s, i) => s + i.amount, 0),
        0
    );
    const totalOutflows = cashFlowData.forecast.reduce(
        (sum, day) => sum + day.outflows.reduce((s, o) => s + o.amount, 0),
        0
    );
    const netChange = cashFlowData.projectedBalance - cashFlowData.currentBalance;

    return (
        <div className="rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-[var(--border-subtle)]">
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-[var(--primary-blue-soft)]">
                            <TrendingUp className="w-5 h-5 text-[var(--primary-blue)]" />
                        </div>
                        <div>
                            <h3 className="text-base font-semibold text-[var(--text-primary)]">
                                7-Day Cash Flow Forecast
                            </h3>
                            <p className="text-xs text-[var(--text-secondary)]">
                                Plan inventory based on expected cash
                            </p>
                        </div>
                    </div>

                    <div className="text-right">
                        <p className="text-xs text-[var(--text-muted)]">Current Balance</p>
                        <p className="text-lg font-bold text-[var(--text-primary)]">
                            {formatCurrency(cashFlowData.currentBalance)}
                        </p>
                    </div>
                </div>
            </div>

            {/* Alerts */}
            {cashFlowData.alerts.length > 0 && (
                <div className="px-6 py-3 bg-[var(--error-bg)] border-b border-[var(--error)]/20">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="w-4 h-4 text-[var(--error)] mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                            <p className="text-sm font-medium text-[var(--error)]">
                                Low Balance Warning
                            </p>
                            <p className="text-xs text-[var(--error)]/80 mt-0.5">
                                {cashFlowData.alerts[0].message}
                            </p>
                        </div>
                        {onRechargeClick && (
                            <button
                                onClick={onRechargeClick}
                                className="px-3 py-1.5 text-xs font-medium bg-[var(--error)] text-white rounded-lg hover:bg-[var(--error-light)] transition-colors"
                            >
                                Recharge Now
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4 p-4 bg-[var(--bg-secondary)]">
                <div className="text-center p-3 rounded-lg bg-[var(--bg-primary)]">
                    <p className="text-xs text-[var(--text-muted)] mb-1">Expected Inflows</p>
                    <p className="text-lg font-bold text-[var(--success)]">
                        +{formatCurrency(totalInflows)}
                    </p>
                </div>
                <div className="text-center p-3 rounded-lg bg-[var(--bg-primary)]">
                    <p className="text-xs text-[var(--text-muted)] mb-1">Expected Outflows</p>
                    <p className="text-lg font-bold text-[var(--error)]">
                        -{formatCurrency(totalOutflows)}
                    </p>
                </div>
                <div className="text-center p-3 rounded-lg bg-[var(--bg-primary)]">
                    <p className="text-xs text-[var(--text-muted)] mb-1">Projected Balance</p>
                    <div className="flex items-center justify-center gap-2">
                        <p className={`text-lg font-bold ${cashFlowData.projectedBalance < 5000 ? 'text-[var(--error)]' : 'text-[var(--text-primary)]'}`}>
                            {formatCurrency(cashFlowData.projectedBalance)}
                        </p>
                        {netChange !== 0 && (
                            <span className={`text-xs font-medium ${netChange >= 0 ? 'text-[var(--success)]' : 'text-[var(--error)]'}`}>
                                ({netChange >= 0 ? '+' : ''}{formatCurrency(netChange)})
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Forecast Table Header */}
            <div className="px-4 py-2 bg-[var(--bg-tertiary)] border-y border-[var(--border-subtle)]">
                <div className="flex items-center justify-between gap-4 text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wider">
                    <span className="min-w-[100px]">Date</span>
                    <div className="flex items-center gap-6 flex-1 justify-end">
                        <span className="text-right min-w-[80px]">Inflows</span>
                        <span className="text-right min-w-[80px]">Outflows</span>
                        <span className="text-right min-w-[90px]">Net</span>
                        <span className="text-right min-w-[90px]">Balance</span>
                        <span className="w-5"></span>
                    </div>
                </div>
            </div>

            {/* Forecast Days */}
            <div className="max-h-[300px] overflow-y-auto">
                {cashFlowData.forecast.map((day, idx) => (
                    <DayRow
                        key={day.date}
                        day={day}
                        isToday={idx === 0}
                        isExpanded={expandedDay === idx}
                        onToggle={() => setExpandedDay(expandedDay === idx ? null : idx)}
                    />
                ))}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 bg-[var(--bg-secondary)] border-t border-[var(--border-subtle)]">
                <p className="text-xs text-[var(--text-muted)] text-center">
                    Outflows after today are estimates based on your shipping history
                </p>
            </div>
        </div>
    );
});

export { CashFlowForecast };
export type { CashFlowForecastData, CashFlowForecastProps };
