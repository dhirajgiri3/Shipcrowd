/**
 * Weight Disputes Dashboard Page
 * 
 * Main page for sellers to view and manage weight disputes:
 * - Dashboard metrics (total disputes, pending, financial impact)
 * - Disputes table with filters
 * - Quick stats cards
 * 
 * Route: /seller/disputes/weight
 */

'use client';

import React from 'react';
import { useDisputeMetrics } from '@/src/core/api/hooks';
import { WeightDisputesTable } from '@/src/features/disputes';
import { formatCurrency, formatCompactCurrency } from '@/src/lib/utils';

export default function WeightDisputesPage() {
    const { data: metrics, isLoading: metricsLoading } = useDisputeMetrics();

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
            {/* Page Header */}
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    Weight Disputes
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                    Manage weight discrepancies between declared and actual weights
                </p>
            </div>

            {/* Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                {/* Total Disputes */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    {metricsLoading ? (
                        <div className="animate-pulse">
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-2"></div>
                            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                    Total Disputes
                                </h3>
                                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                            </div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                {metrics?.total || 0}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {metrics?.autoResolved || 0} auto-resolved
                            </p>
                        </>
                    )}
                </div>

                {/* Pending Disputes */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    {metricsLoading ? (
                        <div className="animate-pulse">
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-2"></div>
                            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                    Pending
                                </h3>
                                <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                                {metrics?.pending || 0}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Awaiting your response
                            </p>
                        </>
                    )}
                </div>

                {/* Under Review */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    {metricsLoading ? (
                        <div className="animate-pulse">
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-2"></div>
                            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                    Under Review
                                </h3>
                                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                {metrics?.underReview || 0}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Evidence submitted
                            </p>
                        </>
                    )}
                </div>

                {/* Financial Impact */}
                <div className="bg-gradient-to-br from-red-600 to-red-700 rounded-lg shadow p-6 text-white">
                    {metricsLoading ? (
                        <div className="animate-pulse">
                            <div className="h-4 bg-red-500/30 rounded w-24 mb-2"></div>
                            <div className="h-8 bg-red-500/30 rounded w-32"></div>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-sm font-medium text-red-100">
                                    Financial Impact
                                </h3>
                                <svg className="w-5 h-5 text-red-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <p className="text-2xl font-bold">
                                {formatCompactCurrency(metrics?.totalFinancialImpact || 0)}
                            </p>
                            <p className="text-xs text-red-100 mt-1">
                                Total at stake
                            </p>
                        </>
                    )}
                </div>
            </div>

            {/* Disputes Table */}
            <WeightDisputesTable />
        </div>
    );
}
