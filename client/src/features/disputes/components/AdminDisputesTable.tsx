/**
 * Admin Disputes Table Component
 * 
 * Enhanced table for admin view with:
 * - Status-based priority sorting
 * - Bulk actions (resolve multiple)
 * - Days pending indicator
 * - Quick actions (resolve buttons)
 * - Advanced filters (carrier, date range, amount)
 */

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWeightDisputes } from '@/src/core/api/hooks';
import { formatCurrency, formatDate, formatPaginationRange } from '@/src/lib/utils';
import { StatusBadge } from '@/src/components/ui/data/StatusBadge';
import type { DisputeStatus, DisputeFilters } from '@/src/types/api/returns';
import { useAdminBatchDisputes } from '@/src/core/api/hooks/admin/disputes/useAdminDisputes';

const STATUS_TABS = [
    { value: 'all', label: 'All' },
    { value: 'pending', label: 'Pending' },
    { value: 'under_review', label: 'Under Review' },
    { value: 'auto_resolved', label: 'Auto Resolved' },
    { value: 'manual_resolved', label: 'Resolved' },
];

export function AdminDisputesTable() {
    const router = useRouter();
    const [filters, setFilters] = useState<DisputeFilters>({ page: 1, limit: 25 });
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const { data, isLoading, isError } = useWeightDisputes(filters);
    const batchMutation = useAdminBatchDisputes();

    const getDaysPending = (createdAt: string) => {
        const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
        return days;
    };

    const getUrgencyColor = (days: number) => {
        if (days >= 7) return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30';
        if (days >= 5) return 'text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30';
        if (days >= 3) return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30';
        return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700';
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedIds(new Set(data?.disputes.map(d => d._id) || []));
        } else {
            setSelectedIds(new Set());
        }
    };

    const handleSelect = (id: string, checked: boolean) => {
        const newSelected = new Set(selectedIds);
        if (checked) {
            newSelected.add(id);
        } else {
            newSelected.delete(id);
        }
        setSelectedIds(newSelected);
    };

    if (isLoading) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
                <div className="p-6 space-y-4">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="animate-pulse flex gap-4">
                            <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded flex-1"></div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <p className="text-red-600">Failed to load disputes</p>
            </div>
        );
    }

    const disputes = data?.disputes || [];
    const pagination = data?.pagination;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-4 mb-4">
                    {STATUS_TABS.map((tab) => (
                        <button
                            key={tab.value}
                            onClick={() => setFilters({ ...filters, status: tab.value === 'all' ? undefined : tab.value as DisputeStatus, page: 1 })}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${(filters.status === tab.value || (!filters.status && tab.value === 'all'))
                                ? 'bg-primary-600 text-white'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Bulk Actions */}
                {selectedIds.size > 0 && (
                    <div className="flex items-center gap-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <span className="text-sm text-blue-700 dark:text-blue-300">{selectedIds.size} selected</span>
                        <button
                            onClick={() =>
                                batchMutation.mutate({
                                    disputeIds: Array.from(selectedIds),
                                    action: 'approve_seller',
                                    notes: 'Bulk approved in seller favor from admin table',
                                })
                            }
                            className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                        >
                            Bulk Resolve: Seller Favor
                        </button>
                        <button
                            onClick={() =>
                                batchMutation.mutate({
                                    disputeIds: Array.from(selectedIds),
                                    action: 'approve_carrier',
                                    notes: 'Bulk approved in Shipcrowd favor from admin table',
                                })
                            }
                            className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                        >
                            Bulk Resolve: Shipcrowd Favor
                        </button>
                        <button
                            onClick={() => setSelectedIds(new Set())}
                            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                        >
                            Clear
                        </button>
                    </div>
                )}
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                        <tr>
                            <th className="px-4 py-3 text-left">
                                <input
                                    type="checkbox"
                                    checked={disputes.length > 0 && selectedIds.size === disputes.length}
                                    onChange={(e) => handleSelectAll(e.target.checked)}
                                    className="rounded border-gray-300 dark:border-gray-600"
                                />
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Dispute</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Company</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Weight</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Discrepancy</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Impact</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Evidence</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Days</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {disputes.length === 0 ? (
                            <tr>
                                <td colSpan={10} className="px-4 py-12 text-center">
                                    <p className="text-gray-500 dark:text-gray-400">No disputes found</p>
                                </td>
                            </tr>
                        ) : (
                            disputes.map((dispute) => {
                                const days = getDaysPending(dispute.createdAt);
                                const shipment = typeof dispute.shipmentId === 'object' ? dispute.shipmentId : null;

                                return (
                                    <tr key={dispute._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="px-4 py-3">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.has(dispute._id)}
                                                onChange={(e) => handleSelect(dispute._id, e.target.checked)}
                                                className="rounded border-gray-300 dark:border-gray-600"
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-sm font-medium text-gray-900 dark:text-white">{dispute.disputeId}</div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">{shipment?.trackingNumber || 'N/A'}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-sm text-gray-900 dark:text-white">Company</div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">{dispute.companyId}</div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                                            {dispute.declaredWeight.value} → {dispute.actualWeight.value} {dispute.actualWeight.unit}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`text-sm font-bold ${dispute.discrepancy.thresholdExceeded ? 'text-red-600' : 'text-yellow-600'}`}>
                                                {dispute.discrepancy.percentage.toFixed(1)}%
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`text-sm font-semibold ${dispute.financialImpact.chargeDirection === 'debit' ? 'text-red-600' : 'text-green-600'}`}>
                                                {formatCurrency(dispute.financialImpact.difference)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            {dispute.evidence ? (
                                                <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-1 rounded">
                                                    Submitted
                                                </span>
                                            ) : (
                                                <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-1 rounded">
                                                    None
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`text-xs px-2 py-1 rounded font-medium ${getUrgencyColor(days)}`}>
                                                {days}d
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <StatusBadge domain="dispute" status={dispute.status} size="sm" />
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                onClick={() => router.push(`/admin/disputes/weight/${dispute._id}`)}
                                                className="px-3 py-1 text-sm bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors"
                                            >
                                                Review
                                            </button>
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
                <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                        {formatPaginationRange(pagination.page, pagination.limit, pagination.total, 'results')}
                    </span>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setFilters({ ...filters, page: filters.page! - 1 })}
                            disabled={pagination.page === 1}
                            className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm disabled:opacity-50"
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => setFilters({ ...filters, page: filters.page! + 1 })}
                            disabled={pagination.page === pagination.totalPages}
                            className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm disabled:opacity-50"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
