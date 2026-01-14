/**
 * COD Remittance Dashboard Page
 * 
 * Main page for COD remittance management:
 * - Dashboard statistics
 * - Remittance history table
 * - Filters and search
 * 
 * Route: /seller/cod/remittance
 */

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCODStats } from '@/src/core/api/hooks';
import { CODRemittanceTable, RequestPayoutModal } from '@/src/features/cod';
import { formatCurrency, formatCompactCurrency } from '@/src/lib/utils';

export default function CODRemittancePage() {
    const router = useRouter();
    const { data: stats, isLoading: statsLoading } = useCODStats();
    const [showPayoutModal, setShowPayoutModal] = useState(false);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
            {/* Page Header */}
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                        COD Remittance
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Track your Cash on Delivery settlements and payouts
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => router.push('/seller/cod/settings')}
                        className="px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Settings
                    </button>
                    <button
                        onClick={() => setShowPayoutModal(true)}
                        className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Request Payout
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                {/* Pending Remittances */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    {statsLoading ? (
                        <div className="animate-pulse">
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-2"></div>
                            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                    Pending Amount
                                </h3>
                                <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                                {formatCompactCurrency(stats?.pending.amount || 0)}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                {stats?.pending.count || 0} remittances
                            </p>
                        </>
                    )}
                </div>

                {/* This Month */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    {statsLoading ? (
                        <div className="animate-pulse">
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-2"></div>
                            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                    This Month
                                </h3>
                                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                                {formatCompactCurrency(stats?.thisMonth.netPaid || 0)}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                {stats?.thisMonth.count || 0} completed
                            </p>
                        </>
                    )}
                </div>

                {/* Last Remittance */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    {statsLoading ? (
                        <div className="animate-pulse">
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-2"></div>
                            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
                        </div>
                    ) : stats?.lastRemittance ? (
                        <>
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                    Last Payout
                                </h3>
                                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                                {formatCompactCurrency(stats.lastRemittance.amount)}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                                UTR: {stats.lastRemittance.utr}
                            </p>
                        </>
                    ) : (
                        <>
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                    Last Payout
                                </h3>
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                No payouts yet
                            </p>
                        </>
                    )}
                </div>
            </div>

            {/* Remittance Table */}
            <CODRemittanceTable />

            {/* Request Payout Modal */}
            <RequestPayoutModal
                isOpen={showPayoutModal}
                onClose={() => setShowPayoutModal(false)}
            />
        </div>
    );
}
