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
import { ViewActionButton } from '@/src/components/ui/core/ViewActionButton';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/core/Card';
import { Button } from '@/src/components/ui/core/Button';
import { Badge } from '@/src/components/ui/core/Badge';
import type { RemittanceStatus, RemittanceFilters } from '@/src/types/api/finance';
import { Package, AlertCircle } from 'lucide-react';

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
            <Card className="border-[var(--border-default)]">
                <CardContent className="p-6 space-y-4">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="animate-pulse flex space-x-4">
                            <div className="h-4 bg-[var(--bg-tertiary)] rounded w-1/4"></div>
                            <div className="h-4 bg-[var(--bg-tertiary)] rounded w-1/4"></div>
                            <div className="h-4 bg-[var(--bg-tertiary)] rounded w-1/4"></div>
                            <div className="h-4 bg-[var(--bg-tertiary)] rounded w-1/4"></div>
                        </div>
                    ))}
                </CardContent>
            </Card>
        );
    }

    if (isError) {
        return (
            <Card className="border-[var(--error)]">
                <CardContent className="p-12 text-center">
                    <AlertCircle className="h-12 w-12 text-[var(--error)] mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                        Failed to Load Remittances
                    </h3>
                    <p className="text-sm text-[var(--text-secondary)]">
                        We couldn't fetch your COD remittances. Please try again.
                    </p>
                </CardContent>
            </Card>
        );
    }

    const remittances = data?.remittances || [];
    const pagination = data?.pagination;

    return (
        <Card className="border-[var(--border-default)]">
            {/* Header with Filters */}
            <CardHeader className="border-b border-[var(--border-subtle)]">
                <div className="flex items-center justify-between mb-4">
                    <CardTitle className="text-lg font-semibold text-[var(--text-primary)]">
                        Remittance History
                    </CardTitle>
                </div>

                {/* Status Filter Tabs */}
                <div className="flex gap-2 overflow-x-auto pb-2">
                    <Button
                        onClick={() => handleStatusFilter(undefined)}
                        variant={!filters.status ? "primary" : "outline"}
                        size="sm"
                        className={!filters.status
                            ? "bg-[var(--primary-blue)] text-white"
                            : "bg-[var(--bg-primary)] hover:bg-[var(--bg-tertiary)]"
                        }
                    >
                        All
                    </Button>
                    <Button
                        onClick={() => handleStatusFilter('pending_approval')}
                        variant={filters.status === 'pending_approval' ? "primary" : "outline"}
                        size="sm"
                        className={filters.status === 'pending_approval'
                            ? "bg-[var(--primary-blue)] text-white"
                            : "bg-[var(--bg-primary)] hover:bg-[var(--bg-tertiary)]"
                        }
                    >
                        Pending
                    </Button>
                    <Button
                        onClick={() => handleStatusFilter('approved')}
                        variant={filters.status === 'approved' ? "primary" : "outline"}
                        size="sm"
                        className={filters.status === 'approved'
                            ? "bg-[var(--primary-blue)] text-white"
                            : "bg-[var(--bg-primary)] hover:bg-[var(--bg-tertiary)]"
                        }
                    >
                        Approved
                    </Button>
                    <Button
                        onClick={() => handleStatusFilter('paid')}
                        variant={filters.status === 'paid' ? "primary" : "outline"}
                        size="sm"
                        className={filters.status === 'paid'
                            ? "bg-[var(--primary-blue)] text-white"
                            : "bg-[var(--bg-primary)] hover:bg-[var(--bg-tertiary)]"
                        }
                    >
                        Paid
                    </Button>
                </div>
            </CardHeader>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-[var(--bg-tertiary)]">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                                Batch
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                                Date
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                                Shipments
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                                Amount
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                                Deductions
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                                Net Payable
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                                Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                                UTR
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-subtle)]">
                        {remittances.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="px-6 py-12 text-center">
                                    <Package className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-3" />
                                    <p className="text-sm text-[var(--text-muted)]">No remittances found</p>
                                </td>
                            </tr>
                        ) : (
                            remittances.map((remittance) => (
                                <tr
                                    key={remittance._id}
                                    className="hover:bg-[var(--bg-tertiary)]/30 cursor-pointer transition-colors"
                                    onClick={() => { }}
                                >
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-[var(--text-primary)]">
                                            {remittance.batch.batchNumber}
                                        </div>
                                        <div className="text-xs text-[var(--text-muted)] font-mono">
                                            {remittance.remittanceId}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-secondary)]">
                                        {formatDate(remittance.timeline.batchCreated)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <Badge variant="outline" className="bg-[var(--bg-tertiary)] text-[var(--text-primary)]">
                                            {remittance.batch.shipmentsCount}
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[var(--text-primary)]">
                                        {formatCurrency(remittance.batch.totalCODCollected)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--error)]">
                                        -{formatCurrency(remittance.deductions.total)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-[var(--success)]">
                                        {formatCurrency(remittance.finalPayable)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <StatusBadge domain="remittance" status={remittance.status} size="sm" />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {remittance.payout?.utr ? (
                                            <div className="text-sm">
                                                <div className="font-mono text-[var(--text-primary)]">
                                                    {remittance.payout.utr}
                                                </div>
                                                <div className="text-xs text-[var(--text-muted)]">
                                                    {remittance.payout.processedAt && formatDate(remittance.payout.processedAt)}
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-[var(--text-muted)]">
                                                Not yet processed
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                        <ViewActionButton
                                            onClick={() => router.push(`/seller/cod/remittance/${remittance._id}`)}
                                        />
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {pagination && pagination.pages > 1 && (
                <div className="px-6 py-4 border-t border-[var(--border-subtle)]">
                    <div className="flex items-center justify-between">
                        <div className="text-sm text-[var(--text-secondary)]">
                            Showing page {pagination.page} of {pagination.pages} ({pagination.total} total)
                        </div>
                        <div className="flex gap-2">
                            <Button
                                onClick={() => handlePageChange(pagination.page - 1)}
                                disabled={!pagination.hasPrev}
                                variant="outline"
                                size="sm"
                                className="bg-[var(--bg-primary)]"
                            >
                                Previous
                            </Button>
                            <Button
                                onClick={() => handlePageChange(pagination.page + 1)}
                                disabled={!pagination.hasNext}
                                variant="outline"
                                size="sm"
                                className="bg-[var(--bg-primary)]"
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </Card>
    );
}
