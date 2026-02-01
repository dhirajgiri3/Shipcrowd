/**
 * Returns Dashboard Client Component
 * Handles the interactive UI for returns management
 */

'use client';

import React from 'react';
import { useReturnMetrics } from '@/src/core/api/hooks';
import { ReturnsTable } from '@/src/features/returns/components/ReturnsTable';
import { formatCurrency } from '@/src/lib/utils';
import { Loader } from '@/src/components/ui';

export function ReturnsClient() {
    const { data: metrics, isLoading } = useReturnMetrics();

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                            Returns Management
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-1">
                            Manage product returns and refunds
                        </p>
                    </div>
                    <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        Analytics
                    </button>
                </div>

                {/* Metrics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Total Returns</p>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                            {isLoading ? <Loader variant="dots" size="sm" /> : metrics?.total || 0}
                        </p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Requested</p>
                        <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400 mt-2">
                            {isLoading ? <Loader variant="dots" size="sm" /> : metrics?.requested || 0}
                        </p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <p className="text-sm text-gray-500 dark:text-gray-400">QC Pending</p>
                        <p className="text-3xl font-bold text-orange-600 dark:text-orange-400 mt-2">
                            {isLoading ? <Loader variant="dots" size="sm" /> : metrics?.qcPending || 0}
                        </p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Return Rate</p>
                        <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-2">
                            {isLoading ? <Loader variant="dots" size="sm" /> : `${((metrics?.returnRate || 0) * 100).toFixed(1)}%`}
                        </p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Total Refunds</p>
                        <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">
                            {isLoading ? <Loader variant="dots" size="sm" /> : formatCurrency(metrics?.totalRefundAmount || 0)}
                        </p>
                    </div>
                </div>

                {/* Returns Table */}
                <ReturnsTable />
            </div>
        </div>
    );
}
