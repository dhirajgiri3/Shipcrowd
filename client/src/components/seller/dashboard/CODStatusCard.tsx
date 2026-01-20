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
}

export function CODStatusCard({
    pendingAmount,
    readyForRemittance,
    expectedRemittanceDate = 'Jan 25, 2026',
    lastRemittanceAmount
}: CODStatusCardProps) {
    const router = useRouter();

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[var(--success-bg)] to-[var(--bg-secondary)] border border-[var(--success)]/30 p-6"
        >
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
                <h3 className="text-2xl font-bold text-[var(--text-primary)]">
                    ₹{pendingAmount.toLocaleString('en-IN')}
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                    Total pending COD collection
                </p>
            </div>

            {/* Ready for Remittance */}
            <div className="relative z-10 mb-6">
                <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)]">
                    <div>
                        <div className="text-xs text-[var(--text-secondary)] font-medium uppercase tracking-wide mb-1">
                            Ready for Remittance
                        </div>
                        <div className="text-xl font-bold text-[var(--success)]">
                            ₹{readyForRemittance.toLocaleString('en-IN')}
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="flex items-center gap-1 text-xs text-[var(--text-secondary)] mb-1">
                            <Clock className="w-3 h-3" />
                            <span className="font-medium">Expected</span>
                        </div>
                        <div className="text-sm font-bold text-[var(--text-primary)]">
                            {expectedRemittanceDate}
                        </div>
                    </div>
                </div>
            </div>

            {/* Last Remittance */}
            {lastRemittanceAmount && (
                <div className="relative z-10 mb-4">
                    <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                        <TrendingUp className="w-3 h-3" />
                        <span>Last remittance:</span>
                        <span className="font-bold text-[var(--text-primary)]">
                            ₹{lastRemittanceAmount.toLocaleString('en-IN')}
                        </span>
                    </div>
                </div>
            )}

            {/* CTA */}
            <button
                onClick={() => router.push('/seller/cod/remittance')}
                className="relative z-10 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--success)] hover:bg-[var(--success)]/90 text-white font-medium text-sm transition-all shadow-sm"
            >
                <span>View COD Details</span>
                <ArrowRight className="w-4 h-4" />
            </button>
        </motion.div>
    );
}
