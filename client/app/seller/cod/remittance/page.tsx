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
import { CODRemittanceTable, RequestPayoutModal, UploadMISModal } from '@/src/features/cod';
import { formatCurrency, formatCompactCurrency } from '@/src/lib/utils';
import { Button } from '@/src/components/ui/core/Button';
import { Card, CardContent } from '@/src/components/ui/core/Card';

export default function CODRemittancePage() {
    const router = useRouter();
    const { data: stats, isLoading: statsLoading } = useCODStats();
    const [showPayoutModal, setShowPayoutModal] = useState(false);
    const [showUploadModal, setShowUploadModal] = useState(false);

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
                            onClick={() => setShowUploadModal(true)}
                            variant="outline"
                            className="bg-[var(--bg-primary)]"
                        >
                            <TrendingUp className="w-4 h-4 mr-2" />
                            Upload MIS
                        </Button>
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
                    <Card className="border-[var(--border-default)] hover:border-[var(--warning)]/50 transition-all duration-300 h-full">
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
                                        <div className="w-12 h-12 rounded-xl bg-[var(--warning-soft)] border-2 border-[var(--warning)]/20 flex items-center justify-center">
                                            <Clock className="w-6 h-6 text-[var(--warning)]" />
                                        </div>
                                        <span className="text-xs font-mono text-[var(--text-muted)] bg-[var(--bg-tertiary)] px-2 py-1 rounded">
                                            PENDING
                                        </span>
                                    </div>
                                    <p className="text-sm font-medium text-[var(--text-secondary)] mb-2">
                                        Pending Amount
                                    </p>
                                    <p className="text-3xl font-bold text-[var(--text-primary)] mb-2">
                                        {formatCompactCurrency(stats?.pendingCollection?.amount || 0)}
                                    </p>
                                    <p className="text-xs text-[var(--text-muted)]">
                                        {stats?.pendingCollection?.orders || 0} shipments awaiting processing
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
                                        <div className="w-12 h-12 rounded-xl bg-[var(--primary-blue-soft)] border-2 border-[var(--primary-blue)]/20 flex items-center justify-center">
                                            <TrendingUp className="w-6 h-6 text-[var(--primary-blue)]" />
                                        </div>
                                        <span className="text-xs font-mono text-[var(--text-muted)] bg-[var(--bg-tertiary)] px-2 py-1 rounded">
                                            MTD
                                        </span>
                                    </div>
                                    <p className="text-sm font-medium text-[var(--text-secondary)] mb-2">
                                        This Month
                                    </p>
                                    <p className="text-3xl font-bold text-[var(--text-primary)] mb-2">
                                        {formatCompactCurrency(stats?.thisMonth?.received || 0)}
                                    </p>
                                    <p className="text-xs text-[var(--text-muted)]">
                                        {formatCompactCurrency(stats?.thisMonth?.deducted || 0)} deducted
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
                            ) : (
                                <>
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="w-12 h-12 rounded-xl bg-[var(--success-bg)] border-2 border-[var(--success)]/20 flex items-center justify-center">
                                            <DollarSign className="w-6 h-6 text-[var(--success)]" />
                                        </div>
                                        <span className="text-xs font-mono text-[var(--text-muted)] bg-[var(--bg-tertiary)] px-2 py-1 rounded">
                                            AVAILABLE
                                        </span>
                                    </div>
                                    <p className="text-sm font-medium text-[var(--text-secondary)] mb-2">
                                        Available for Payout
                                    </p>
                                    <p className="text-3xl font-bold text-[var(--text-primary)] mb-2">
                                        {formatCompactCurrency(stats?.available?.amount || 0)}
                                    </p>
                                    <p className="text-xs text-[var(--text-muted)]">
                                        {stats?.available?.estimatedPayoutDate
                                            ? `Est. payout: ${stats.available.estimatedPayoutDate}`
                                            : 'Ready for payout'
                                        }
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
            {/* Upload MIS Modal */}
            <UploadMISModal
                isOpen={showUploadModal}
                onClose={() => setShowUploadModal(false)}
            />
        </div>
    );
}
