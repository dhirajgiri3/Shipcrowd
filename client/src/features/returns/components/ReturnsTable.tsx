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
    requested: { label: 'Requested', color: 'bg-[var(--warning-bg)] text-[var(--warning)]' },
    approved: { label: 'Approved', color: 'bg-[var(--primary-blue-soft)] text-[var(--primary-blue)]' },
    rejected: { label: 'Rejected', color: 'bg-[var(--error-bg)] text-[var(--error)]' },
    pickup_scheduled: { label: 'Pickup Scheduled', color: 'bg-[var(--primary-blue-soft)] text-[var(--primary-blue)]' },
    in_transit: { label: 'In Transit', color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' }, // Pending purple var
    received: { label: 'Received', color: 'bg-[var(--primary-blue-soft)] text-[var(--primary-blue)]' },
    qc_pending: { label: 'QC Pending', color: 'bg-[var(--warning-bg)] text-[var(--warning)]' },
    qc_passed: { label: 'QC Passed', color: 'bg-[var(--success-bg)] text-[var(--success)]' },
    qc_failed: { label: 'QC Failed', color: 'bg-[var(--error-bg)] text-[var(--error)]' },
    refund_initiated: { label: 'Refund Initiated', color: 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400' },
    refund_completed: { label: 'Refund Completed', color: 'bg-[var(--success-bg)] text-[var(--success)]' },
    closed: { label: 'Closed', color: 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]' },
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
        <div className="bg-[var(--bg-elevated)] rounded-lg shadow border border-[var(--border-default)]">
            {/* Status Tabs */}
            <div className="border-b border-[var(--border-default)]">
                <nav className="flex space-x-4 px-6" aria-label="Tabs">
                    {STATUS_TABS.map(tab => (
                        <button
                            key={tab.status}
                            onClick={() => setActiveTab(tab.status)}
                            className={`py-4 px-3 border-b-2 font-medium text-sm transition-colors ${activeTab === tab.status
                                ? 'border-[var(--primary-blue)] text-[var(--primary-blue)]'
                                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Search */}
            <div className="p-6 border-b border-[var(--border-default)]">
                <input
                    type="text"
                    value={search}
                    placeholder="Search by return ID or order number..."
                    aria-label="Search returns"
                    className="w-full px-4 py-2 border border-[var(--border-default)] rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-blue)]"
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                {isLoading ? (
                    <div className="p-12 text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary-blue)] mx-auto"></div>
                        <p className="text-[var(--text-secondary)] mt-4">Loading returns...</p>
                    </div>
                ) : !data?.returns.length ? (
                    <div className="p-12 text-center">
                        <svg className="w-16 h-16 mx-auto text-[var(--text-tertiary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                        </svg>
                        <h3 className="mt-4 text-lg font-medium text-[var(--text-primary)]">No returns found</h3>
                        <p className="text-[var(--text-secondary)] mt-2">All orders are going great!</p>
                    </div>
                ) : (
                    <table className="w-full">
                        <thead className="bg-[var(--bg-secondary)]">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Return ID</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Order</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Customer</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Items</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Refund</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Requested</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-default)]">
                            {data.returns.map((returnReq) => {
                                const order = typeof returnReq.orderId === 'object' ? returnReq.orderId : null;

                                return (
                                    <tr
                                        key={returnReq._id}
                                        onClick={() => handleRowClick(returnReq._id)}
                                        className="hover:bg-[var(--bg-hover)] cursor-pointer transition-colors"
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-[var(--primary-blue)]">
                                                {returnReq.returnId}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-[var(--text-primary)]">
                                                {order?.orderNumber || 'N/A'}
                                            </div>
                                            {order && (
                                                <div className="text-xs text-[var(--text-secondary)]">
                                                    {formatCurrency(order.totalAmount)}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-[var(--text-primary)]">
                                                {returnReq.customerName}
                                            </div>
                                            <div className="text-xs text-[var(--text-secondary)]">
                                                {returnReq.customerPhone}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-[var(--text-primary)]">
                                                {returnReq.items.length} item{returnReq.items.length > 1 ? 's' : ''}
                                            </div>
                                            <div className="text-xs text-[var(--text-secondary)] capitalize">
                                                {returnReq.primaryReason.replace(/_/g, ' ')}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-semibold text-[var(--success)]">
                                                {formatCurrency(returnReq.estimatedRefund)}
                                            </div>
                                            {returnReq.refundDetails && (
                                                <div className="text-xs text-[var(--text-secondary)]">
                                                    {returnReq.refundDetails.method.replace(/_/g, ' ')}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-secondary)]">
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
                <div className="px-6 py-4 border-t border-[var(--border-default)] flex items-center justify-between">
                    <div className="text-sm text-[var(--text-secondary)]">
                        Showing {(data.pagination.page - 1) * data.pagination.limit + 1} to{' '}
                        {Math.min(data.pagination.page * data.pagination.limit, data.pagination.total)} of{' '}
                        {data.pagination.total} returns
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setFilters({ ...filters, page: Math.max(1, filters.page! - 1) })}
                            disabled={data.pagination.page === 1}
                            className="px-4 py-2 border border-[var(--border-default)] rounded-lg hover:bg-[var(--bg-secondary)] disabled:opacity-50 text-[var(--text-primary)]"
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => setFilters({ ...filters, page: filters.page! + 1 })}
                            disabled={data.pagination.page >= data.pagination.totalPages}
                            className="px-4 py-2 border border-[var(--border-default)] rounded-lg hover:bg-[var(--bg-secondary)] disabled:opacity-50 text-[var(--text-primary)]"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
