/**
 * Admin Disputes Dashboard Page
 * 
 * Overview for admins to manage all weight disputes:
 * - Analytics cards (total, pending, auto-resolved)
 * - Disputes table with bulk actions
 * - Quick filters and search
 * 
 * Route: /admin/disputes/weight
 */

'use client';

import React from 'react';
import { useDisputeAnalytics, useDisputeMetrics } from '@/src/core/api/hooks';
import { AdminDisputesTable } from '@/src/features/disputes/components/AdminDisputesTable';
import { formatCurrency, formatCompactCurrency } from '@/src/lib/utils';

export default function AdminDisputesDashboard() {
    const { data: metrics, isLoading: metricsLoading } = useDisputeMetrics();
    const { data: analytics, isLoading: analyticsLoading } = useDisputeAnalytics();

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    Weight Disputes - Admin
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                    Review and resolve weight discrepancy disputes
                </p>
            </div>

            {/* Analytics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
                {/* Total */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Total</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {metricsLoading ? '...' : metrics?.total || 0}
                    </p>
                </div>

                {/* Pending */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Pending</p>
                    <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                        {metricsLoading ? '...' : metrics?.pending || 0}
                    </p>
                </div>

                {/* Under Review */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Under Review</p>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {metricsLoading ? '...' : metrics?.underReview || 0}
                    </p>
                </div>

                {/* Resolved */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Resolved</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {metricsLoading ? '...' : metrics?.resolved || 0}
                    </p>
                </div>

                {/* Auto Resolved */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Auto Resolved</p>
                    <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                        {metricsLoading ? '...' : metrics?.autoResolved || 0}
                    </p>
                </div>

                {/* Financial Impact */}
                <div className="bg-gradient-to-br from-red-600 to-red-700 rounded-lg shadow p-4 text-white">
                    <p className="text-sm text-red-100">Total Impact</p>
                    <p className="text-2xl font-bold">
                        {metricsLoading ? '...' : formatCompactCurrency(metrics?.totalFinancialImpact || 0)}
                    </p>
                </div>
            </div>

            {/* Resolution Stats */}
            {analytics?.stats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Seller Response Rate</p>
                                <p className="text-xl font-bold text-gray-900 dark:text-white">
                                    {(analytics.stats.sellerResponseRate * 100).toFixed(1)}%
                                </p>
                            </div>
                            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Avg Resolution Time</p>
                                <p className="text-xl font-bold text-gray-900 dark:text-white">
                                    {(metrics?.averageResolutionTime || 0).toFixed(1)}h
                                </p>
                            </div>
                            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Auto-Resolve Rate</p>
                                <p className="text-xl font-bold text-gray-900 dark:text-white">
                                    {(analytics.stats.autoResolveRate * 100).toFixed(1)}%
                                </p>
                            </div>
                            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                                <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Avg Discrepancy</p>
                                <p className="text-xl font-bold text-gray-900 dark:text-white">
                                    {(analytics.stats.averageDiscrepancy || 0).toFixed(1)}%
                                </p>
                            </div>
                            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
                                <svg className="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Disputes Table */}
            <AdminDisputesTable />
        </div>
    );
}
