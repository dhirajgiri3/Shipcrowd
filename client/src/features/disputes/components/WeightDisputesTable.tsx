/**
 * Weight Disputes Table Component
 * 
 * Comprehensive dispute list with:
 * - Status filters (All, Pending, Under Review, Resolved)
 * - Weight comparison (declared vs actual vs discrepancy %)
 * - Financial impact display
 * - Evidence indicators
 * - Search by AWB/Dispute ID
 * - Pagination
 */

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWeightDisputes } from '@/src/core/api/hooks';
import { formatCurrency, formatDate } from '@/lib/utils';
import { StatusBadge } from '@/src/components/shared/StatusBadge';
import type { DisputeStatus, DisputeFilters } from '@/src/types/api/dispute.types';

const STATUS_FILTERS: { value: DisputeStatus | 'all'; label: string; count?: number }[] = [
    { value: 'all', label: 'All Disputes' },
    { value: 'pending', label: 'Pending' },
    { value: 'under_review', label: 'Under Review' },
    { value: 'auto_resolved', label: 'Auto Resolved' },
    { value: 'manual_resolved', label: 'Resolved' },
];

export function WeightDisputesTable() {
    const router = useRouter();
    const [search, setSearch] = useState('');
    const [filters, setFilters] = useState<DisputeFilters>({
        page: 1,
        limit: 20,
    });

    const { data, isLoading, isError } = useWeightDisputes(filters);

    const handleStatusFilter = (status: DisputeStatus | 'all') => {
        setFilters({
            ...filters,
            status: status === 'all' ? undefined : status,
            page: 1,
        });
    };

    const handleSearch = () => {
        setFilters({
            ...filters,
            search: search || undefined,
            page: 1,
        });
    };

    if (isLoading) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
                <div className="p-6 space-y-4">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="animate-pulse flex gap-4">
                            <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded flex-1"></div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <p className="text-red-600 dark:text-red-400">Failed to load disputes</p>
            </div>
        );
    }

    const disputes = data?.disputes || [];
    const pagination = data?.pagination;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            {/* Header with Filters */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                {/* Status Filter Tabs */}
                <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                    {STATUS_FILTERS.map((statusFilter) => (
                        <button
                            key={statusFilter.value}
                            onClick={() => handleStatusFilter(statusFilter.value)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${(filters.status === statusFilter.value || (!filters.status && statusFilter.value === 'all'))
                                    ? 'bg-primary-600 text-white'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                }`}
                        >
                            {statusFilter.label}
                        </button>
                    ))}
                </div>

                {/* Search Bar */}
                <div className="flex gap-3">
                    <div className="relative flex-1">
                        <svg
                            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                            />
                        </svg>
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                            placeholder="Search by AWB or Dispute ID..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                    </div>
                    <button
                        onClick={handleSearch}
                        className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                    >
                        Search
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Dispute ID / AWB
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Weight Comparison
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Discrepancy
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Financial Impact
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Evidence
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Detected
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {disputes.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-12 text-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <svg
                                            className="w-12 h-12 text-gray-400"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                            />
                                        </svg>
                                        <div>
                                            <p className="text-gray-900 dark:text-white font-medium">No disputes found</p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                                {filters.search
                                                    ? 'Try adjusting your search criteria'
                                                    : 'Weight disputes will appear here when detected'}
                                            </p>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            disputes.map((dispute) => {
                                const shipment = typeof dispute.shipmentId === 'object' ? dispute.shipmentId : null;
                                const awb = shipment?.trackingNumber || 'N/A';

                                return (
                                    <tr
                                        key={dispute._id}
                                        onClick={() => router.push(`/seller/disputes/weight/${dispute._id}`)}
                                        className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                                    >
                                        {/* Dispute ID / AWB */}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                {dispute.disputeId}
                                            </div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                                                {awb}
                                            </div>
                                        </td>

                                        {/* Weight Comparison */}
                                        <td className="px-6 py-4">
                                            <div className="text-sm space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-gray-500 dark:text-gray-400 text-xs">Declared:</span>
                                                    <span className="font-medium text-gray-900 dark:text-white">
                                                        {dispute.declaredWeight.value} {dispute.declaredWeight.unit}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-gray-500 dark:text-gray-400 text-xs">Actual:</span>
                                                    <span className="font-medium text-orange-600 dark:text-orange-400">
                                                        {dispute.actualWeight.value} {dispute.actualWeight.unit}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Discrepancy */}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <span className={`text-sm font-bold ${dispute.discrepancy.thresholdExceeded
                                                        ? 'text-red-600 dark:text-red-400'
                                                        : 'text-yellow-600 dark:text-yellow-400'
                                                    }`}>
                                                    {dispute.discrepancy.percentage.toFixed(1)}%
                                                </span>
                                                {dispute.discrepancy.thresholdExceeded && (
                                                    <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                                                        <path
                                                            fillRule="evenodd"
                                                            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                                            clipRule="evenodd"
                                                        />
                                                    </svg>
                                                )}
                                            </div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                                {dispute.discrepancy.value.toFixed(2)} kg
                                            </div>
                                        </td>

                                        {/* Financial Impact */}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className={`text-sm font-semibold ${dispute.financialImpact.chargeDirection === 'debit'
                                                    ? 'text-red-600 dark:text-red-400'
                                                    : 'text-green-600 dark:text-green-400'
                                                }`}>
                                                {dispute.financialImpact.chargeDirection === 'debit' ? '-' : '+'}
                                                {formatCurrency(dispute.financialImpact.difference)}
                                            </div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                                {dispute.financialImpact.chargeDirection === 'debit' ? 'You owe' : 'Refund due'}
                                            </div>
                                        </td>

                                        {/* Evidence */}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {dispute.evidence ? (
                                                <div className="flex items-center gap-2">
                                                    <div className="flex items-center gap-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
                                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                            <path
                                                                fillRule="evenodd"
                                                                d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                                                                clipRule="evenodd"
                                                            />
                                                        </svg>
                                                        {dispute.evidence.sellerPhotos?.length || 0}
                                                    </div>
                                                    <div className="flex items-center gap-1 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-1 rounded">
                                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                            <path
                                                                fillRule="evenodd"
                                                                d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                                                                clipRule="evenodd"
                                                            />
                                                        </svg>
                                                        {dispute.evidence.sellerDocuments?.length || 0}
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-gray-400 dark:text-gray-500">No evidence</span>
                                            )}
                                        </td>

                                        {/* Status */}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <StatusBadge status={dispute.status} />
                                        </td>

                                        {/* Detected Date */}
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {formatDate(dispute.detectedAt)}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <div className="text-sm text-gray-700 dark:text-gray-300">
                        Showing{' '}
                        <span className="font-medium">
                            {(pagination.page - 1) * pagination.limit + 1}
                        </span>{' '}
                        to{' '}
                        <span className="font-medium">
                            {Math.min(pagination.page * pagination.limit, pagination.total)}
                        </span>{' '}
                        of <span className="font-medium">{pagination.total}</span> disputes
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setFilters({ ...filters, page: filters.page! - 1 })}
                            disabled={pagination.page === 1}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => setFilters({ ...filters, page: filters.page! + 1 })}
                            disabled={pagination.page === pagination.totalPages}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
