'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import {
    Wallet,
    Clock,
    CheckCircle2,
    ArrowRight,
    Calendar,
    Building2,
    TrendingUp,
    AlertCircle
} from 'lucide-react';
import { formatCurrency } from '@/src/lib/dashboard/data-utils';

/**
 * COD Settlement Timeline
 *
 * Critical component for Indian e-commerce - 65% of orders are COD
 * Shows sellers exactly when their money will arrive
 *
 * Pipeline: Collected → In Process → Scheduled → Settled
 */

interface CODSettlementData {
    collected: {
        amount: number;
        count: number;
    };
    inProcess: {
        amount: number;
        count: number;
        expectedDate?: string;
    };
    scheduled: {
        amount: number;
        date: string;
        courier?: string;
        method?: string;
    }[];
    settled: {
        thisMonth: number;
        count: number;
        lastSettlement?: {
            date: string;
            amount: number;
        };
    };
}

interface CODSettlementTimelineProps {
    data?: CODSettlementData;
    isLoading?: boolean;
    isUsingMock?: boolean;
}

// Mock data for fallback
const MOCK_COD_DATA: CODSettlementData = {
    collected: {
        amount: 52000,
        count: 68
    },
    inProcess: {
        amount: 38000,
        count: 42,
        expectedDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
    },
    scheduled: [
        {
            amount: 45000,
            date: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
            courier: 'Delhivery',
            method: 'NEFT'
        },
        {
            amount: 28000,
            date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            courier: 'BlueDart',
            method: 'IMPS'
        }
    ],
    settled: {
        thisMonth: 125000,
        count: 156,
        lastSettlement: {
            date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
            amount: 38500
        }
    }
};

const StageCard = memo(function StageCard({
    icon: Icon,
    title,
    amount,
    subtitle,
    color,
    isActive = false,
    delay = 0
}: {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    amount: number;
    subtitle: string;
    color: string;
    isActive?: boolean;
    delay?: number;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.3 }}
            className={`
                relative flex-1 min-w-[140px] p-4 rounded-xl border transition-all
                ${isActive
                    ? 'bg-[var(--bg-primary)] border-[var(--primary-blue)] shadow-md'
                    : 'bg-[var(--bg-secondary)] border-[var(--border-subtle)] hover:border-[var(--border-default)]'
                }
            `}
        >
            <div className={`inline-flex p-2 rounded-lg mb-3 ${color}`}>
                <Icon className="w-4 h-4" />
            </div>
            <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1">
                {title}
            </p>
            <p className="text-lg font-bold text-[var(--text-primary)] mb-1">
                {formatCurrency(amount)}
            </p>
            <p className="text-xs text-[var(--text-secondary)]">
                {subtitle}
            </p>
            {isActive && (
                <motion.div
                    layoutId="activeIndicator"
                    className="absolute -top-px left-4 right-4 h-0.5 bg-[var(--primary-blue)] rounded-full"
                />
            )}
        </motion.div>
    );
});

const CODSettlementTimeline = memo(function CODSettlementTimeline({
    data,
    isLoading = false,
    isUsingMock = false
}: CODSettlementTimelineProps) {
    const codData = data || MOCK_COD_DATA;

    // Calculate next settlement
    const nextSettlement = codData.scheduled[0];
    const nextSettlementDate = nextSettlement ? new Date(nextSettlement.date) : null;
    const daysUntilSettlement = nextSettlementDate
        ? Math.ceil((nextSettlementDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null;

    // Total pending amount
    const totalPending = codData.collected.amount + codData.inProcess.amount +
        codData.scheduled.reduce((sum, s) => sum + s.amount, 0);

    if (isLoading) {
        return (
            <div className="rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] p-6">
                <div className="animate-pulse space-y-4">
                    <div className="h-6 bg-[var(--bg-tertiary)] rounded w-48" />
                    <div className="grid grid-cols-4 gap-4">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="h-32 bg-[var(--bg-tertiary)] rounded-xl" />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-[var(--success-bg)]">
                        <Wallet className="w-5 h-5 text-[var(--success)]" />
                    </div>
                    <div>
                        <h3 className="text-base font-semibold text-[var(--text-primary)]">
                            COD Settlement Pipeline
                        </h3>
                        <p className="text-xs text-[var(--text-secondary)]">
                            Track when your money arrives
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {isUsingMock && (
                        <span className="px-2 py-1 text-[10px] font-medium bg-[var(--warning-bg)] text-[var(--warning)] rounded-md">
                            Sample Data
                        </span>
                    )}
                    <div className="text-right">
                        <p className="text-xs text-[var(--text-muted)]">Total Pending</p>
                        <p className="text-lg font-bold text-[var(--text-primary)]">
                            {formatCurrency(totalPending)}
                        </p>
                    </div>
                </div>
            </div>

            {/* Pipeline Stages */}
            <div className="p-6">
                <div className="flex items-stretch gap-2 overflow-x-auto pb-2">
                    <StageCard
                        icon={Clock}
                        title="Collected"
                        amount={codData.collected.amount}
                        subtitle={`${codData.collected.count} orders awaiting`}
                        color="bg-[var(--warning-bg)] text-[var(--warning)]"
                        delay={0}
                    />

                    <div className="flex items-center px-1">
                        <ArrowRight className="w-4 h-4 text-[var(--text-muted)]" />
                    </div>

                    <StageCard
                        icon={Building2}
                        title="In Process"
                        amount={codData.inProcess.amount}
                        subtitle={`${codData.inProcess.count} orders verifying`}
                        color="bg-[var(--primary-blue-soft)] text-[var(--primary-blue)]"
                        isActive={true}
                        delay={0.1}
                    />

                    <div className="flex items-center px-1">
                        <ArrowRight className="w-4 h-4 text-[var(--text-muted)]" />
                    </div>

                    <StageCard
                        icon={Calendar}
                        title="Scheduled"
                        amount={nextSettlement?.amount || 0}
                        subtitle={nextSettlementDate
                            ? `${nextSettlementDate.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}`
                            : 'No upcoming'
                        }
                        color="bg-[var(--info-bg)] text-[var(--info)]"
                        delay={0.2}
                    />

                    <div className="flex items-center px-1">
                        <ArrowRight className="w-4 h-4 text-[var(--text-muted)]" />
                    </div>

                    <StageCard
                        icon={CheckCircle2}
                        title="Settled"
                        amount={codData.settled.thisMonth}
                        subtitle={`${codData.settled.count} this month`}
                        color="bg-[var(--success-bg)] text-[var(--success)]"
                        delay={0.3}
                    />
                </div>

                {/* Next Settlement Alert */}
                {nextSettlement && daysUntilSettlement !== null && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="mt-4 p-4 rounded-xl bg-gradient-to-r from-[var(--primary-blue-soft)] to-[var(--bg-secondary)] border border-[var(--primary-blue)]/20"
                    >
                        <div className="flex items-center justify-between flex-wrap gap-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-[var(--primary-blue)] text-white">
                                    <TrendingUp className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-[var(--text-primary)]">
                                        Next Settlement: {formatCurrency(nextSettlement.amount)}
                                    </p>
                                    <p className="text-xs text-[var(--text-secondary)]">
                                        {nextSettlementDate?.toLocaleDateString('en-IN', {
                                            weekday: 'long',
                                            month: 'short',
                                            day: 'numeric'
                                        })}
                                        {nextSettlement.courier && ` via ${nextSettlement.courier}`}
                                        {nextSettlement.method && ` (${nextSettlement.method})`}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`
                                    px-3 py-1.5 rounded-lg text-sm font-semibold
                                    ${daysUntilSettlement <= 2
                                        ? 'bg-[var(--success-bg)] text-[var(--success)]'
                                        : 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]'
                                    }
                                `}>
                                    {daysUntilSettlement === 0
                                        ? 'Today'
                                        : daysUntilSettlement === 1
                                            ? 'Tomorrow'
                                            : `In ${daysUntilSettlement} days`
                                    }
                                </span>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Upcoming Settlements List */}
                {codData.scheduled.length > 1 && (
                    <div className="mt-4 pt-4 border-t border-[var(--border-subtle)]">
                        <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-3">
                            Upcoming Settlements
                        </p>
                        <div className="space-y-2">
                            {codData.scheduled.slice(1).map((settlement, idx) => (
                                <div
                                    key={idx}
                                    className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <Calendar className="w-4 h-4 text-[var(--text-muted)]" />
                                        <div>
                                            <p className="text-sm font-medium text-[var(--text-primary)]">
                                                {new Date(settlement.date).toLocaleDateString('en-IN', {
                                                    month: 'short',
                                                    day: 'numeric'
                                                })}
                                            </p>
                                            {settlement.courier && (
                                                <p className="text-xs text-[var(--text-secondary)]">
                                                    {settlement.courier}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <p className="text-sm font-semibold text-[var(--text-primary)]">
                                        {formatCurrency(settlement.amount)}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Last Settlement Info */}
                {codData.settled.lastSettlement && (
                    <div className="mt-4 pt-4 border-t border-[var(--border-subtle)]">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-[var(--text-secondary)]">
                                Last settlement
                            </span>
                            <span className="text-[var(--text-primary)]">
                                {formatCurrency(codData.settled.lastSettlement.amount)} on{' '}
                                {new Date(codData.settled.lastSettlement.date).toLocaleDateString('en-IN', {
                                    month: 'short',
                                    day: 'numeric'
                                })}
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
});

export { CODSettlementTimeline };
export type { CODSettlementData, CODSettlementTimelineProps };
