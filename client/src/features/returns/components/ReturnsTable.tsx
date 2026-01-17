/**
 * Returns Table Component
 * 
 * Display all return requests with:
 * - Status filtering
 * - Search functionality
 * - Return details
 * - Quick actions
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useReturns } from '@/src/core/api/hooks';
import { formatCurrency, formatDate } from '@/src/lib/utils';
import { useDebouncedValue } from '@/src/hooks/data';
import type { ReturnStatus, ReturnFilters } from '@/src/types/api/returns';

const STATUS_CONFIG: Record<ReturnStatus, { label: string; color: string }> = {
    requested: { label: 'Requested', color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' },
    approved: { label: 'Approved', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' },
    rejected: { label: 'Rejected', color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' },
    pickup_scheduled: { label: 'Pickup Scheduled', color: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400' },
    in_transit: { label: 'In Transit', color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' },
    received: { label: 'Received', color: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400' },
    qc_pending: { label: 'QC Pending', color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400' },
    qc_passed: { label: 'QC Passed', color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' },
    qc_failed: { label: 'QC Failed', color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' },
    refund_initiated: { label: 'Refund Initiated', color: 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400' },
    refund_completed: { label: 'Refund Completed', color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' },
    closed: { label: 'Closed', color: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300' },
};

const STATUS_TABS = [
    { status: 'all' as const, label: 'All Returns' },
    { status: 'requested' as const, label: 'Requested' },
    { status: 'approved' as const, label: 'Approved' },
    { status: 'qc_pending' as const, label: 'QC Pending' },
    { status: 'refund_initiated' as const, label: 'Refund Initiated' },
    { status: 'refund_completed' as const, label: 'Completed' },
];

export function ReturnsTable() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<ReturnStatus | 'all'>('all');
    const [search, setSearch] = useState('');
    const debouncedSearch = useDebouncedValue(search, 300);
    const [filters, setFilters] = useState<ReturnFilters>({
        page: 1,
        limit: 20,
    });

    // Auto-update filters when debounced search changes
    useEffect(() => {
        setFilters(prev => ({
            ...prev,
            search: debouncedSearch || undefined,
            page: 1,
        }));
    }, [debouncedSearch]);

    const { data, isLoading } = useReturns({
        ...filters,
        ...(activeTab !== 'all' && { status: activeTab }),
    });

    const handleRowClick = (returnId: string) => {
        router.push(`/seller/returns/${returnId}`);
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            {/* Status Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="flex space-x-4 px-6" aria-label="Tabs">
                    {STATUS_TABS.map(tab => (
                        <button
                            key={tab.status}
                            onClick={() => setActiveTab(tab.status)}
                            className={`py-4 px-3 border-b-2 font-medium text-sm transition-colors ${activeTab === tab.status
                                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Search */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <input
                    type="text"
                    value={search}
                    placeholder="Search by return ID or order number..."
                    aria-label="Search returns"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                {isLoading ? (
                    <div className="p-12 text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
                        <p className="text-gray-500 dark:text-gray-400 mt-4">Loading returns...</p>
                    </div>
                ) : !data?.returns.length ? (
                    <div className="p-12 text-center">
                        <svg className="w-16 h-16 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                        </svg>
                        <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">No returns found</h3>
                        <p className="text-gray-500 dark:text-gray-400 mt-2">All orders are going great!</p>
                    </div>
                ) : (
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-700/50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Return ID</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Order</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Customer</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Items</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Refund</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Requested</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {data.returns.map((returnReq) => {
                                const order = typeof returnReq.orderId === 'object' ? returnReq.orderId : null;

                                return (
                                    <tr
                                        key={returnReq._id}
                                        onClick={() => handleRowClick(returnReq._id)}
                                        className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-primary-600 dark:text-primary-400">
                                                {returnReq.returnId}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900 dark:text-white">
                                                {order?.orderNumber || 'N/A'}
                                            </div>
                                            {order && (
                                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                                    {formatCurrency(order.totalAmount)}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-900 dark:text-white">
                                                {returnReq.customerName}
                                            </div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                                {returnReq.customerPhone}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900 dark:text-white">
                                                {returnReq.items.length} item{returnReq.items.length > 1 ? 's' : ''}
                                            </div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                                                {returnReq.primaryReason.replace(/_/g, ' ')}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-semibold text-green-600 dark:text-green-400">
                                                {formatCurrency(returnReq.estimatedRefund)}
                                            </div>
                                            {returnReq.refundDetails && (
                                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                                    {returnReq.refundDetails.method.replace(/_/g, ' ')}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {formatDate(returnReq.requestedAt)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-3 py-1 text-xs font-medium rounded-full ${STATUS_CONFIG[returnReq.status].color}`}>
                                                {STATUS_CONFIG[returnReq.status].label}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Pagination */}
            {data && data.pagination.totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <div className="text-sm text-gray-700 dark:text-gray-300">
                        Showing {(data.pagination.page - 1) * data.pagination.limit + 1} to{' '}
                        {Math.min(data.pagination.page * data.pagination.limit, data.pagination.total)} of{' '}
                        {data.pagination.total} returns
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setFilters({ ...filters, page: Math.max(1, filters.page! - 1) })}
                            disabled={data.pagination.page === 1}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => setFilters({ ...filters, page: filters.page! + 1 })}
                            disabled={data.pagination.page >= data.pagination.totalPages}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
