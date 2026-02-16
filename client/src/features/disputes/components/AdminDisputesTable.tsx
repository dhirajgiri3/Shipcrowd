/**
 * Admin Disputes Table Component
 *
 * Enhanced table for admin view with:
 * - Status-based filters (PillTabs)
 * - Search by AWB/Dispute ID
 * - Bulk actions (resolve multiple)
 * - Days pending indicator
 * - Design system tokens
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { formatCurrency, formatPaginationRange } from '@/src/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/core/Card';
import { Button } from '@/src/components/ui/core/Button';
import { SearchInput } from '@/src/components/ui/form/SearchInput';
import { PillTabs } from '@/src/components/ui/core/PillTabs';
import { StatusBadge } from '@/src/components/ui/data/StatusBadge';
import { TableSkeleton, EmptyState } from '@/src/components/ui';
import { useDebouncedValue } from '@/src/hooks/data';
import type { DisputeStatus, DisputeFilters } from '@/src/types/api/returns';
import { useAdminBatchDisputes, useAdminDisputes } from '@/src/core/api/hooks/admin/disputes/useAdminDisputes';
import { Scale, CheckCircle2, XCircle } from 'lucide-react';

const STATUS_TABS = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'under_review', label: 'Under Review' },
    { key: 'auto_resolved', label: 'Auto Resolved' },
    { key: 'manual_resolved', label: 'Resolved' },
] as const;

function getDaysPending(createdAt: string): number {
    const days = Math.floor(
        (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    return Math.max(0, days);
}

function getUrgencyClasses(days: number): string {
    if (days >= 7) return 'text-[var(--error)] bg-[var(--error-bg)]';
    if (days >= 5) return 'text-[var(--warning)] bg-[var(--warning-bg)]';
    if (days >= 3) return 'text-[var(--warning)]/80 bg-[var(--warning-bg)]/50';
    return 'text-[var(--text-muted)] bg-[var(--bg-tertiary)]';
}

export function AdminDisputesTable() {
    const router = useRouter();
    const [search, setSearch] = useState('');
    const debouncedSearch = useDebouncedValue(search, 350);
    const [filters, setFilters] = useState<DisputeFilters>({ page: 1, limit: 25 });
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        setFilters((prev) => ({
            ...prev,
            search: debouncedSearch || undefined,
            page: 1,
        }));
    }, [debouncedSearch]);

    const { data, isLoading, isError } = useAdminDisputes(filters);
    const batchMutation = useAdminBatchDisputes();

    const disputes = data?.disputes ?? [];
    const pagination = data?.pagination;

    const handleStatusChange = useCallback(
        (key: string) => {
            setFilters((prev) => ({
                ...prev,
                status: key === 'all' ? undefined : (key as DisputeStatus),
                page: 1,
            }));
        },
        []
    );

    const handleSelectAll = useCallback(
        (checked: boolean) => {
            if (checked) {
                setSelectedIds(new Set(disputes.map((d) => d._id)));
            } else {
                setSelectedIds(new Set());
            }
        },
        [disputes]
    );

    const handleSelect = useCallback((id: string, checked: boolean) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (checked) next.add(id);
            else next.delete(id);
            return next;
        });
    }, []);

    const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

    const handleBulkApproveSeller = useCallback(() => {
        if (selectedIds.size === 0) return;
        batchMutation.mutate({
            disputeIds: Array.from(selectedIds),
            action: 'approve_seller',
            notes: 'Bulk approved in seller favor from admin table',
        });
        setSelectedIds(new Set());
    }, [selectedIds, batchMutation]);

    const handleBulkApproveCarrier = useCallback(() => {
        if (selectedIds.size === 0) return;
        batchMutation.mutate({
            disputeIds: Array.from(selectedIds),
            action: 'approve_carrier',
            notes: 'Bulk approved in Shipcrowd favor from admin table',
        });
        setSelectedIds(new Set());
    }, [selectedIds, batchMutation]);

    const activeStatus = filters.status ?? 'all';

    if (isError) {
        return (
            <Card className="border-[var(--border-subtle)]">
                <CardContent className="py-12">
                    <EmptyState
                        variant="error"
                        title="Failed to load disputes"
                        description="There was an error fetching the weight disputes. Please try again."
                    />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-[var(--border-subtle)]">
            <CardHeader className="border-b border-[var(--border-subtle)]">
                <CardTitle>Dispute List</CardTitle>
                <div className="flex flex-col sm:flex-row gap-4 mt-4">
                    <PillTabs
                        tabs={STATUS_TABS}
                        activeTab={activeStatus}
                        onTabChange={handleStatusChange}
                    />
                    <SearchInput
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by AWB or Dispute ID..."
                        widthClass="w-full sm:w-72"
                    />
                </div>

                {/* Bulk Actions Bar */}
                {selectedIds.size > 0 && (
                    <div className="flex flex-wrap items-center gap-3 p-3 mt-4 rounded-xl bg-[var(--primary-blue-soft)] border border-[var(--primary-blue)]/20">
                        <span className="text-sm font-medium text-[var(--primary-blue)]">
                            {selectedIds.size} selected
                        </span>
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={handleBulkApproveSeller}
                            disabled={batchMutation.isPending}
                        >
                            <CheckCircle2 className="w-4 h-4 mr-1.5" />
                            Approve Seller
                        </Button>
                        <Button
                            variant="danger"
                            size="sm"
                            onClick={handleBulkApproveCarrier}
                            disabled={batchMutation.isPending}
                        >
                            <XCircle className="w-4 h-4 mr-1.5" />
                            Approve Carrier
                        </Button>
                        <button
                            type="button"
                            onClick={clearSelection}
                            className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                        >
                            Clear
                        </button>
                    </div>
                )}
            </CardHeader>

            <CardContent className="p-0">
                {isLoading ? (
                    <div className="p-4">
                        <TableSkeleton rows={8} columns={10} showHeader={true} />
                    </div>
                ) : disputes.length === 0 ? (
                    <div className="py-16 px-4">
                        <EmptyState
                            icon={<Scale className="w-12 h-12" />}
                            variant="noData"
                            title="No disputes found"
                            description={
                                debouncedSearch
                                    ? 'Try adjusting your search or filters.'
                                    : 'Weight disputes will appear here when detected.'
                            }
                        />
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-[var(--bg-secondary)] border-b border-[var(--border-subtle)]">
                                    <tr>
                                        <th className="px-4 py-3 w-10">
                                            <input
                                                type="checkbox"
                                                checked={
                                                    disputes.length > 0 &&
                                                    selectedIds.size === disputes.length
                                                }
                                                onChange={(e) =>
                                                    handleSelectAll(e.target.checked)
                                                }
                                                className="rounded border-[var(--border-default)] text-[var(--primary-blue)] focus:ring-[var(--primary-blue)]"
                                                aria-label="Select all"
                                            />
                                        </th>
                                        <th className="px-4 py-3 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                                            Dispute
                                        </th>
                                        <th className="px-4 py-3 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                                            Company
                                        </th>
                                        <th className="px-4 py-3 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                                            Weight
                                        </th>
                                        <th className="px-4 py-3 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                                            Discrepancy
                                        </th>
                                        <th className="px-4 py-3 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                                            Impact
                                        </th>
                                        <th className="px-4 py-3 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                                            Evidence
                                        </th>
                                        <th className="px-4 py-3 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                                            Days
                                        </th>
                                        <th className="px-4 py-3 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--border-subtle)]">
                                    {disputes.map((dispute) => {
                                        const days = getDaysPending(dispute.createdAt);
                                        const shipment =
                                            typeof dispute.shipmentId === 'object'
                                                ? dispute.shipmentId
                                                : null;

                                        return (
                                            <tr
                                                key={dispute._id}
                                                className="hover:bg-[var(--bg-hover)] transition-colors"
                                            >
                                                <td className="px-4 py-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedIds.has(dispute._id)}
                                                        onChange={(e) =>
                                                            handleSelect(dispute._id, e.target.checked)
                                                        }
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="rounded border-[var(--border-default)] text-[var(--primary-blue)] focus:ring-[var(--primary-blue)]"
                                                        aria-label={`Select ${dispute.disputeId}`}
                                                    />
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="font-medium text-[var(--text-primary)]">
                                                        {dispute.disputeId}
                                                    </div>
                                                    <div className="text-xs text-[var(--text-muted)] font-mono">
                                                        {shipment?.trackingNumber ?? 'N/A'}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-[var(--text-primary)]">
                                                    <span className="text-xs truncate max-w-[120px] block" title={String((dispute.companyId as { name?: string })?.name ?? dispute.companyId)}>
                                                        {(dispute.companyId as { name?: string })?.name ?? dispute.companyId}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-[var(--text-primary)]">
                                                    {dispute.declaredWeight.value} →{' '}
                                                    {dispute.actualWeight.value}{' '}
                                                    {dispute.actualWeight.unit}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span
                                                        className={`font-bold ${
                                                            dispute.discrepancy.thresholdExceeded
                                                                ? 'text-[var(--error)]'
                                                                : 'text-[var(--warning)]'
                                                        }`}
                                                    >
                                                        {dispute.discrepancy.percentage.toFixed(1)}%
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span
                                                        className={`font-semibold ${
                                                            dispute.financialImpact.chargeDirection ===
                                                            'debit'
                                                                ? 'text-[var(--error)]'
                                                                : 'text-[var(--success)]'
                                                        }`}
                                                    >
                                                        {formatCurrency(
                                                            dispute.financialImpact.difference
                                                        )}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    {dispute.evidence ? (
                                                        <span className="text-xs px-2 py-1 rounded-md bg-[var(--success-bg)] text-[var(--success)]">
                                                            Submitted
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs px-2 py-1 rounded-md bg-[var(--bg-tertiary)] text-[var(--text-muted)]">
                                                            None
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span
                                                        className={`text-xs px-2 py-1 rounded-md font-medium ${getUrgencyClasses(days)}`}
                                                    >
                                                        {days}d
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <StatusBadge
                                                        domain="dispute"
                                                        status={dispute.status}
                                                        size="sm"
                                                    />
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <Button
                                                        variant="primary"
                                                        size="sm"
                                                        onClick={() =>
                                                            router.push(
                                                                `/admin/disputes/weight/${dispute._id}`
                                                            )
                                                        }
                                                    >
                                                        Review
                                                    </Button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {pagination && pagination.totalPages > 1 && (
                            <div className="px-4 py-3 border-t border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-2">
                                <span className="text-sm text-[var(--text-muted)]">
                                    {formatPaginationRange(
                                        pagination.page,
                                        pagination.limit,
                                        pagination.total,
                                        'results'
                                    )}
                                </span>
                                <div className="flex gap-2">
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={() =>
                                            setFilters((prev) => ({
                                                ...prev,
                                                page: (prev.page ?? 1) - 1,
                                            }))
                                        }
                                        disabled={pagination.page === 1}
                                    >
                                        Previous
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={() =>
                                            setFilters((prev) => ({
                                                ...prev,
                                                page: (prev.page ?? 1) + 1,
                                            }))
                                        }
                                        disabled={
                                            pagination.page === pagination.totalPages
                                        }
                                    >
                                        Next
                                    </Button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    );
}
