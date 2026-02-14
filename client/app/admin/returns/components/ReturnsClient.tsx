
"use client";
export const dynamic = "force-dynamic";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDebouncedValue } from '@/src/hooks/data';
import { Card, CardContent } from '@/src/components/ui/core/Card';
import { Button } from '@/src/components/ui/core/Button';
import { StatusBadge } from '@/src/components/ui/data/StatusBadge';
import { ViewActionButton } from '@/src/components/ui/core/ViewActionButton';
import { StatsCard } from '@/src/components/ui/dashboard/StatsCard';
import {
    PackageX,
    Search,
    Download,
    RefreshCw,
    Clock,
    Package,
    TrendingDown,
    CheckCircle2,
} from 'lucide-react';
import { cn, formatCurrency, formatDate } from '@/src/lib/utils';
import { useToast } from '@/src/components/ui/feedback/Toast';
import { useAdminReturns, useAdminReturnStats } from '@/src/core/api/hooks/logistics/useAdminReturns';
import { Loader } from '@/src/components/ui/feedback/Loader';

const statusFilters = [
    { id: 'all', label: 'All' },
    { id: 'requested', label: 'Requested' },
    { id: 'approved', label: 'Approved' },
    { id: 'rejected', label: 'Rejected' },
    { id: 'in_transit', label: 'In Transit' },
    { id: 'delivered', label: 'Delivered' },
    { id: 'completed', label: 'Completed' },
];

export function ReturnsClient() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearch = useDebouncedValue(searchQuery, 300);
    const [selectedStatus, setSelectedStatus] = useState<string>('all');
    const { addToast } = useToast();

    // Use Admin Hooks
    const { data: returns = [], isLoading, isError, refetch } = useAdminReturns({
        status: selectedStatus === 'all' ? undefined : selectedStatus,
        search: debouncedSearch
    });

    const { data: metrics } = useAdminReturnStats();

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                        <PackageX className="h-6 w-6 text-[var(--primary-blue)]" />
                        Returns Management
                    </h1>
                    <p className="text-[var(--text-muted)] text-sm mt-1">
                        Monitor and manage customer returns across all companies
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={() => {
                            refetch();
                            addToast('Refreshed', 'success');
                        }}
                    >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Sync
                    </Button>
                    <Button variant="outline" onClick={() => addToast('Feature coming soon', 'info')}>
                        <Download className="h-4 w-4 mr-2" />
                        Export
                    </Button>
                </div>
            </div>

            {/* Stats Cards - Premium Flat Design */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatsCard
                    title="Total Returns"
                    value={metrics?.total || 0}
                    icon={PackageX}
                    iconColor="text-[var(--primary-blue)] bg-[var(--primary-blue-soft)]"
                    variant="default"
                />
                <StatsCard
                    title="Pending Action"
                    value={metrics?.requested || 0}
                    icon={Clock}
                    variant="warning"
                />
                <StatsCard
                    title="QC Pending"
                    value={metrics?.qcPending || 0}
                    icon={CheckCircle2}
                    variant="info"
                />
                <StatsCard
                    title="Total Refunded"
                    value={formatCurrency(metrics?.totalRefundAmount || 0)}
                    icon={TrendingDown}
                    variant="success"
                />
            </div>

            {/* Filters */}
            <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
                    <input
                        type="text"
                        placeholder="Search by Order ID or Return ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full h-10 pl-9 pr-4 rounded-lg bg-[var(--bg-tertiary)] text-sm text-[var(--text-primary)] border border-[var(--border-default)] focus:border-[var(--primary-blue)] focus:ring-1 focus:ring-[var(--primary-blue)]/20 transition-all placeholder-[var(--text-muted)]"
                    />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2 lg:pb-0">
                    {statusFilters.map((filter) => (
                        <button
                            key={filter.id}
                            onClick={() => setSelectedStatus(filter.id)}
                            className={cn(
                                "px-4 py-2 text-sm font-medium rounded-full transition-all whitespace-nowrap",
                                selectedStatus === filter.id
                                    ? "bg-[var(--primary-blue)] text-white"
                                    : "bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                            )}
                        >
                            {filter.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Returns Table */}
            <Card>
                <CardContent className="p-0">
                    <div className="overflow-x-auto relative min-h-[300px]">
                        {isLoading ? (
                            <div className="absolute inset-0 flex items-center justify-center bg-[var(--bg-primary)]/50 z-10">
                                <Loader centered />
                            </div>
                        ) : null}

                        <table className="w-full">
                            <thead className="bg-[var(--bg-secondary)] border-b border-[var(--border-subtle)]">
                                <tr>
                                    <th className="text-left p-4 text-xs font-medium text-[var(--text-muted)] uppercase">Return ID</th>
                                    <th className="text-left p-4 text-xs font-medium text-[var(--text-muted)] uppercase">Order / Customer</th>
                                    <th className="text-left p-4 text-xs font-medium text-[var(--text-muted)] uppercase">Company</th>
                                    <th className="text-left p-4 text-xs font-medium text-[var(--text-muted)] uppercase">Reason</th>
                                    <th className="text-right p-4 text-xs font-medium text-[var(--text-muted)] uppercase">Amount</th>
                                    <th className="text-center p-4 text-xs font-medium text-[var(--text-muted)] uppercase">Status</th>
                                    <th className="text-right p-4 text-xs font-medium text-[var(--text-muted)] uppercase">Date</th>
                                    <th className="text-right p-4 text-xs font-medium text-[var(--text-muted)] uppercase">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border-subtle)]">
                                {returns.length === 0 && !isLoading ? (
                                    <tr>
                                        <td colSpan={8} className="p-12 text-center">
                                            <div className="flex flex-col items-center">
                                                <Package className="h-12 w-12 text-[var(--text-muted)] mb-4 opacity-50" />
                                                <h3 className="text-lg font-medium text-[var(--text-primary)]">No returns found</h3>
                                                <p className="text-[var(--text-muted)] mt-1">Try adjusting your filters</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : returns.map((item) => (
                                    <tr key={item._id} className="hover:bg-[var(--bg-secondary)] transition-colors group">
                                        <td className="p-4">
                                            <code className="font-mono text-sm font-semibold text-[var(--text-primary)]">{item.returnId || item._id.substring(0, 8)}</code>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium text-[var(--text-primary)]">{item.orderId}</span>
                                                <span className="text-xs text-[var(--text-muted)]">{item.customerName || 'Unknown Customer'}</span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className="text-sm text-[var(--text-secondary)]">{item.companyName || 'N/A'}</span>
                                        </td>
                                        <td className="p-4">
                                            <p className="text-sm text-[var(--text-secondary)] max-w-[200px] truncate" title={item.reason}>
                                                {item.reason}
                                            </p>
                                        </td>
                                        <td className="p-4 text-right">
                                            <span className="text-sm font-medium text-[var(--text-primary)]">{formatCurrency(item.refundAmount || 0)}</span>
                                        </td>
                                        <td className="p-4 text-center">
                                            <StatusBadge domain="return" status={item.status} size="sm" />
                                        </td>
                                        <td className="p-4 text-right">
                                            <span className="text-xs text-[var(--text-muted)]">{formatDate(item.createdAt)}</span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <ViewActionButton
                                                onClick={() => router.push(`/admin/returns/${item._id}`)}
                                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
