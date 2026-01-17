/**
 * COD Remittance Table Component
 * 
 * Features:
 * - Paginated list of remittances
 * - Status filtering
 * - Date range filtering
 * - UTR tracking display
 * - Batch info display
 * - Deduction breakdown
 * - Click to view details
 */

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCODRemittances } from '@/src/core/api/hooks';
import { formatCurrency, formatDate } from '@/src/lib/utils';
import { StatusBadge } from '@/src/components/ui/data/StatusBadge';
import type { RemittanceStatus, RemittanceFilters } from '@/src/types/api/finance';

export function CODRemittanceTable() {
    const router = useRouter();
    const [filters, setFilters] = useState<RemittanceFilters>({
        page: 1,
        limit: 10,
    });

    const { data, isLoading, isError } = useCODRemittances(filters);

    const handleStatusFilter = (status?: RemittanceStatus) => {
        setFilters(prev => ({ ...prev, status, page: 1 }));
    };

    const handlePageChange = (page: number) => {
        setFilters(prev => ({ ...prev, page }));
    };

    if (isLoading) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
                <div className="p-6 space-y-4">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="animate-pulse flex space-x-4">
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <p className="text-red-600 dark:text-red-400">Failed to load remittances</p>
            </div>
        );
    }

    const remittances = data?.remittances || [];
    const pagination = data?.pagination;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            {/* Header with Filters */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Remittance History
                    </h2>
                </div>

                {/* Status Filter Tabs */}
                <div className="flex gap-2 overflow-x-auto">
                    <button
                        onClick={() => handleStatusFilter(undefined)}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${!filters.status
                            ? 'bg-primary-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                            }`}
                    >
                        All
                    </button>
                    <button
                        onClick={() => handleStatusFilter('pending_approval')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${filters.status === 'pending_approval'
                            ? 'bg-primary-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                            }`}
                    >
                        Pending
                    </button>
                    <button
                        onClick={() => handleStatusFilter('approved')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${filters.status === 'approved'
                            ? 'bg-primary-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                            }`}
                    >
                        Approved
                    </button>
                    <button
                        onClick={() => handleStatusFilter('completed')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${filters.status === 'completed'
                            ? 'bg-primary-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                            }`}
                    >
                        Completed
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Batch
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Date
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Shipments
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Amount
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Deductions
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Net Payable
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                UTR
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {remittances.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                    No remittances found
                                </td>
                            </tr>
                        ) : (
                            remittances.map((remittance) => (
                                <tr
                                    key={remittance._id}
                                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                                    onClick={() => router.push(`/seller/cod/remittance/${remittance._id}`)}
                                >
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                                            {remittance.batch.batchNumber}
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                            {remittance.remittanceId}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                        {formatDate(remittance.timeline.batchCreated)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                        {remittance.batch.shipmentsCount}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                        {formatCurrency(remittance.batch.totalCODCollected)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 dark:text-red-400">
                                        -{formatCurrency(remittance.deductions.total)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600 dark:text-green-400">
                                        {formatCurrency(remittance.finalPayable)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <StatusBadge status={remittance.status} />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {remittance.payout?.utr ? (
                                            <div className="text-sm">
                                                <div className="font-mono text-gray-900 dark:text-white">
                                                    {remittance.payout.utr}
                                                </div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                                    {remittance.payout.processedAt && formatDate(remittance.payout.processedAt)}
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-gray-400 dark:text-gray-500">
                                                Not yet processed
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {pagination && pagination.pages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-700 dark:text-gray-300">
                            Showing page {pagination.page} of {pagination.pages} ({pagination.total} total)
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => handlePageChange(pagination.page - 1)}
                                disabled={!pagination.hasPrev}
                                className="px-3 py-1 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => handlePageChange(pagination.page + 1)}
                                disabled={!pagination.hasNext}
                                className="px-3 py-1 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
