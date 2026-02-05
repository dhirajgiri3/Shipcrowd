'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
    RotateCcw,
    ClipboardCheck,
    Truck,
    IndianRupee,
    ArrowRight,
} from 'lucide-react';
import { useRTOStats } from '@/src/core/api/hooks/rto/useRTOManagement';

const cardVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: (i: number) => ({
        opacity: 1,
        y: 0,
        transition: { delay: i * 0.06, duration: 0.3 },
    }),
};

export function RTODashboardCards() {
    const router = useRouter();
    const { data: stats, isLoading, error } = useRTOStats();

    if (error) return null;

    const pendingQC = stats?.byStatus?.qc_pending ?? 0;
    const inTransit = stats?.byStatus?.in_transit ?? 0;
    const total = stats?.total ?? 0;
    const totalCharges = stats?.totalCharges ?? 0;

    const cards = [
        {
            key: 'qc_pending',
            label: 'Pending QC',
            value: String(pendingQC),
            subtext: 'Awaiting inspection',
            icon: ClipboardCheck,
            color: 'amber',
            bgClass: 'bg-[var(--warning-bg)] border-[var(--warning)]/30',
            iconClass: 'text-[var(--warning)]',
        },
        {
            key: 'in_transit',
            label: 'In Transit (Reverse)',
            value: String(inTransit),
            subtext: 'Returning to warehouse',
            icon: Truck,
            color: 'blue',
            bgClass: 'bg-[var(--primary-blue-soft)] border-[var(--primary-blue)]/30',
            iconClass: 'text-[var(--primary-blue)]',
        },
        {
            key: 'total',
            label: 'This Month',
            value: String(total),
            subtext: 'Total RTO cases',
            icon: RotateCcw,
            color: 'rose',
            bgClass: 'bg-[var(--error-bg)] border-[var(--error)]/20',
            iconClass: 'text-[var(--error)]',
        },
        {
            key: 'charges',
            label: 'Monthly Cost',
            value: `₹${totalCharges.toLocaleString('en-IN')}`,
            subtext: 'RTO charges (period)',
            icon: IndianRupee,
            color: 'slate',
            bgClass: 'bg-[var(--bg-secondary)] border-[var(--border-subtle)]',
            iconClass: 'text-[var(--text-secondary)]',
        },
    ];

    return (
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-[var(--error-bg)]">
                        <RotateCcw className="w-5 h-5 text-[var(--error)]" />
                    </div>
                    <div>
                        <h3 className="text-base font-semibold text-[var(--text-primary)]">
                            RTO Overview
                        </h3>
                        <p className="text-xs text-[var(--text-secondary)]">
                            Return-to-origin cases at a glance
                        </p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => router.push('/seller/rto')}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-[var(--primary-blue)] hover:bg-[var(--primary-blue-soft)] transition-colors"
                >
                    View all RTO
                    <ArrowRight className="w-4 h-4" />
                </button>
            </div>

            <div className="p-4">
                {isLoading ? (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {[1, 2, 3, 4].map((i) => (
                            <div
                                key={i}
                                className="h-24 rounded-xl bg-[var(--bg-secondary)] animate-pulse border border-[var(--border-subtle)]"
                            />
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {cards.map((card, i) => {
                            const Icon = card.icon;
                            return (
                                <motion.button
                                    key={card.key}
                                    type="button"
                                    variants={cardVariants}
                                    initial="hidden"
                                    animate="visible"
                                    custom={i}
                                    onClick={() => {
                                        if (card.key === 'qc_pending') {
                                            router.push('/seller/rto?returnStatus=qc_pending');
                                        } else if (card.key === 'in_transit') {
                                            router.push('/seller/rto?returnStatus=in_transit');
                                        } else {
                                            router.push('/seller/rto');
                                        }
                                    }}
                                    className={`w-full text-left rounded-xl border p-4 transition-all hover:shadow-md hover:scale-[1.01] active:scale-[0.99] ${card.bgClass}`}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider truncate">
                                                {card.label}
                                            </p>
                                            <p className="text-2xl font-bold text-[var(--text-primary)] mt-0.5 truncate">
                                                {card.value}
                                            </p>
                                            <p className="text-[10px] text-[var(--text-secondary)] mt-1 truncate">
                                                {card.subtext}
                                            </p>
                                        </div>
                                        <div className={`p-2 rounded-lg shrink-0 ${card.iconClass}`}>
                                            <Icon className="w-5 h-5" />
                                        </div>
                                    </div>
                                </motion.button>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
