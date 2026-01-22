/**
 * COD Remittance Dashboard Page
 * 
 * Main page for COD remittance management:
 * - Dashboard statistics with hero metrics
 * - Remittance history table
 * - Filters and search
 * 
 * Route: /seller/cod/remittance
 */

'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
    DollarSign,
    TrendingUp,
    Clock,
    Settings,
    Plus,
    Info
} from 'lucide-react';
import { useCODStats } from '@/src/core/api/hooks';
import { CODRemittanceTable, RequestPayoutModal } from '@/src/features/cod';
import { formatCurrency, formatCompactCurrency } from '@/src/lib/utils';
import { Button } from '@/src/components/ui/core/Button';
import { Card, CardContent } from '@/src/components/ui/core/Card';

export default function CODRemittancePage() {
    const router = useRouter();
    const { data: stats, isLoading: statsLoading } = useCODStats();
    const [showPayoutModal, setShowPayoutModal] = useState(false);

    return (
        <div className="min-h-screen space-y-6 pb-10">
            {/* Header */}
            <header className="space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <motion.h1
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="text-3xl font-bold text-[var(--text-primary)] tracking-tight"
                        >
                            COD Remittance
                        </motion.h1>
                        <p className="text-sm text-[var(--text-secondary)] mt-2">
                            Track your Cash on Delivery settlements and payouts
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <Button
                            onClick={() => router.push('/seller/cod/settings')}
                            variant="outline"
                            className="bg-[var(--bg-primary)]"
                        >
                            <Settings className="w-4 h-4 mr-2" />
                            Settings
                        </Button>
                        <Button
                            onClick={() => setShowPayoutModal(true)}
                            variant="primary"
                            className="bg-[var(--primary-blue)] hover:bg-[var(--primary-blue-deep)] text-white"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Request Payout
                        </Button>
                    </div>
                </div>

                {/* Info Banner */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-3 p-4 rounded-xl bg-[var(--primary-blue)]/5 border border-[var(--primary-blue)]/20"
                >
                    <Info className="w-5 h-5 text-[var(--primary-blue)] shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <p className="text-sm text-[var(--text-primary)] font-medium">
                            COD Settlement Timeline
                        </p>
                        <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                            COD amounts are remitted within 3-5 business days after delivery confirmation. Track your pending and completed remittances below.
                        </p>
                    </div>
                </motion.div>
            </header>

            {/* Hero Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Pending Amount - Hero Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0 }}
                >
                    <Card className="border-[var(--border-default)] hover:border-[var(--primary-orange)]/50 transition-all duration-300 h-full">
                        <CardContent className="p-6">
                            {statsLoading ? (
                                <div className="animate-pulse space-y-3">
                                    <div className="h-4 bg-[var(--bg-tertiary)] rounded w-24" />
                                    <div className="h-10 bg-[var(--bg-tertiary)] rounded w-32" />
                                    <div className="h-3 bg-[var(--bg-tertiary)] rounded w-20" />
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-2 border-orange-500/20 flex items-center justify-center">
                                            <Clock className="w-6 h-6 text-orange-600" />
                                        </div>
                                        <span className="text-xs font-mono text-[var(--text-muted)] bg-[var(--bg-tertiary)] px-2 py-1 rounded">
                                            PENDING
                                        </span>
                                    </div>
                                    <p className="text-sm font-medium text-[var(--text-secondary)] mb-2">
                                        Pending Amount
                                    </p>
                                    <p className="text-3xl font-bold text-[var(--text-primary)] mb-2">
                                        {formatCompactCurrency(stats?.pending.amount || 0)}
                                    </p>
                                    <p className="text-xs text-[var(--text-muted)]">
                                        {stats?.pending.count || 0} remittances awaiting processing
                                    </p>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>

                {/* This Month */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <Card className="border-[var(--border-default)] hover:border-[var(--primary-blue)]/50 transition-all duration-300 h-full">
                        <CardContent className="p-6">
                            {statsLoading ? (
                                <div className="animate-pulse space-y-3">
                                    <div className="h-4 bg-[var(--bg-tertiary)] rounded w-24" />
                                    <div className="h-10 bg-[var(--bg-tertiary)] rounded w-32" />
                                    <div className="h-3 bg-[var(--bg-tertiary)] rounded w-20" />
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-2 border-blue-500/20 flex items-center justify-center">
                                            <TrendingUp className="w-6 h-6 text-blue-600" />
                                        </div>
                                        <span className="text-xs font-mono text-[var(--text-muted)] bg-[var(--bg-tertiary)] px-2 py-1 rounded">
                                            MTD
                                        </span>
                                    </div>
                                    <p className="text-sm font-medium text-[var(--text-secondary)] mb-2">
                                        This Month
                                    </p>
                                    <p className="text-3xl font-bold text-[var(--text-primary)] mb-2">
                                        {formatCompactCurrency(stats?.thisMonth.netPaid || 0)}
                                    </p>
                                    <p className="text-xs text-[var(--text-muted)]">
                                        {stats?.thisMonth.count || 0} completed remittances
                                    </p>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Last Remittance */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <Card className="border-[var(--border-default)] hover:border-[var(--success)]/30 transition-all duration-300 h-full">
                        <CardContent className="p-6">
                            {statsLoading ? (
                                <div className="animate-pulse space-y-3">
                                    <div className="h-4 bg-[var(--bg-tertiary)] rounded w-24" />
                                    <div className="h-10 bg-[var(--bg-tertiary)] rounded w-32" />
                                    <div className="h-3 bg-[var(--bg-tertiary)] rounded w-20" />
                                </div>
                            ) : stats?.lastRemittance ? (
                                <>
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500/10 to-green-600/5 border-2 border-green-500/20 flex items-center justify-center">
                                            <DollarSign className="w-6 h-6 text-green-600" />
                                        </div>
                                        <span className="text-xs font-mono text-[var(--text-muted)] bg-[var(--bg-tertiary)] px-2 py-1 rounded">
                                            PAID
                                        </span>
                                    </div>
                                    <p className="text-sm font-medium text-[var(--text-secondary)] mb-2">
                                        Last Payout
                                    </p>
                                    <p className="text-3xl font-bold text-[var(--text-primary)] mb-2">
                                        {formatCompactCurrency(stats.lastRemittance.amount)}
                                    </p>
                                    <p className="text-xs text-[var(--text-muted)] font-mono">
                                        UTR: {stats.lastRemittance.utr}
                                    </p>
                                </>
                            ) : (
                                <>
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="w-12 h-12 rounded-xl bg-[var(--bg-tertiary)] border-2 border-[var(--border-subtle)] flex items-center justify-center">
                                            <DollarSign className="w-6 h-6 text-[var(--text-muted)]" />
                                        </div>
                                    </div>
                                    <p className="text-sm font-medium text-[var(--text-secondary)] mb-2">
                                        Last Payout
                                    </p>
                                    <p className="text-sm text-[var(--text-muted)] py-3">
                                        No payouts yet
                                    </p>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>
            </div>

            {/* Remittance Table */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
            >
                <CODRemittanceTable />
            </motion.div>

            {/* Request Payout Modal */}
            <RequestPayoutModal
                isOpen={showPayoutModal}
                onClose={() => setShowPayoutModal(false)}
            />
        </div>
    );
}
