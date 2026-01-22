/**
 * CODStatusCard - Priority component for Indian sellers
 * Psychology: 65% of orders are COD - show pending remittance prominently
 */

'use client';

import { IndianRupee, Clock, TrendingUp, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

interface CODStatusCardProps {
    pendingAmount: number;
    readyForRemittance: number;
    expectedRemittanceDate?: string;
    lastRemittanceAmount?: number;
    breakdown?: Array<{
        courier: string;
        amount: number;
        status: 'scheduled' | 'processing' | 'verifying';
        date?: string;
    }>;
}

export function CODStatusCard({
    pendingAmount,
    readyForRemittance,
    expectedRemittanceDate = 'Jan 25, 2026',
    lastRemittanceAmount,
    breakdown = [
        { courier: 'Delhivery', amount: Math.floor(pendingAmount * 0.55), status: 'scheduled', date: 'Jan 25' },
        { courier: 'BlueDart', amount: Math.floor(pendingAmount * 0.25), status: 'scheduled', date: 'Jan 28' },
        { courier: 'Ecom Express', amount: Math.floor(pendingAmount * 0.20), status: 'verifying' }
    ]
}: CODStatusCardProps) {
    const router = useRouter();

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="feature-card h-full"
        >
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[var(--success-bg)] to-[var(--bg-secondary)] border border-[var(--success)]/30 p-6 h-full flex flex-col">
                {/* Decorative Gradient Blob */}
                <div className="absolute top-0 right-0 w-40 h-40 bg-[var(--success)]/10 blur-3xl rounded-full pointer-events-none" />

                {/* Header */}
                <div className="relative z-10 mb-6">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 rounded-lg bg-[var(--success)] text-white">
                            <IndianRupee className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wide">
                            COD Collection
                        </span>
                    </div>
                    <h3 className="text-3xl font-bold text-[var(--text-primary)]">
                        ₹{pendingAmount.toLocaleString('en-IN')}
                    </h3>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">
                        Total pending COD collection
                    </p>
                </div>

                {/* Ready for Remittance */}
                <div className="relative z-10 mb-6">
                    <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--bg-primary)]/60 border border-[var(--border-subtle)] backdrop-blur-sm">
                        <div>
                            <div className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wide mb-1">
                                Ready for Remittance
                            </div>
                            <div className="text-xl font-bold text-[var(--success)]">
                                ₹{readyForRemittance.toLocaleString('en-IN')}
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="flex items-center justify-end gap-1 text-[10px] text-[var(--text-secondary)] mb-1">
                                <Clock className="w-3 h-3" />
                                <span className="font-medium">Expected</span>
                            </div>
                            <div className="text-sm font-bold text-[var(--text-primary)]">
                                {expectedRemittanceDate}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Courier Breakdown (Quick Win) */}
                {breakdown && breakdown.length > 0 && (
                    <div className="relative z-10 mb-6 flex-1">
                        <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wide mb-3">
                            Courier Breakdown
                        </h4>
                        <div className="space-y-2">
                            {breakdown.map((item, i) => (
                                <div key={i} className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-1.5 h-1.5 rounded-full ${item.status === 'scheduled' ? 'bg-[var(--success)]' : 'bg-[var(--warning)]'
                                            }`} />
                                        <span className="text-[var(--text-primary)] font-medium">{item.courier}</span>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-bold text-[var(--text-primary)]">₹{item.amount.toLocaleString('en-IN', { notation: 'compact' })}</div>
                                        {item.date && (
                                            <div className="text-[10px] text-[var(--text-secondary)]">
                                                {item.status === 'scheduled' ? `Settling ${item.date}` : item.status}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Last Remittance */}
                {lastRemittanceAmount && (
                    <div className="relative z-10 mb-4 pt-4 border-t border-[var(--border-subtle)]">
                        <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
                            <div className="flex items-center gap-1.5">
                                <TrendingUp className="w-3 h-3" />
                                <span>Last remittance</span>
                            </div>
                            <span className="font-bold text-[var(--text-primary)]">
                                ₹{lastRemittanceAmount.toLocaleString('en-IN')}
                            </span>
                        </div>
                    </div>
                )}

                {/* CTA */}
                <button
                    onClick={() => router.push('/seller/cod/remittance')}
                    className="relative z-10 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[var(--text-primary)] hover:bg-[var(--text-primary)]/90 text-[var(--bg-primary)] font-bold text-sm transition-all shadow-lg active:scale-[0.98]"
                >
                    <span>View COD Details</span>
                    <ArrowRight className="w-4 h-4" />
                </button>
            </div>
        </motion.div>
    );
}
