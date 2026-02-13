"use client";
export const dynamic = "force-dynamic";

import { useState } from 'react';
import { Card, CardContent } from '@/src/components/ui/core/Card';
import { Button } from '@/src/components/ui/core/Button';
import { Input } from '@/src/components/ui/core/Input';
import {
    Scale,
    Search,
    AlertTriangle,
    CheckCircle,
    FileText,
    Loader2,
    IndianRupee,
    TrendingUp
} from 'lucide-react';
import { StatusBadge } from '@/src/components/ui/data/StatusBadge';
import { cn } from '@/src/lib/utils';
import { formatCurrency } from '@/src/lib/utils';
import { useWeightDiscrepancies, useAcceptDiscrepancy, useDisputeDiscrepancy } from '@/src/core/api/hooks/seller/useWeightDiscrepancy';
import { useDebouncedValue } from '@/src/hooks/data/useDebouncedValue';
import { PageHeader } from '@/src/components/ui/layout/PageHeader';
import { StatsCard } from '@/src/components/ui/dashboard/StatsCard';
import { Pagination } from '@/src/components/ui/data/Pagination';
import { DisputeDialog } from './DisputeDialog'; // Importing local component

const statusFilters = [
    { id: 'all', label: 'All' },
    { id: 'pending', label: 'Pending Action' },
    { id: 'disputed', label: 'Disputed' },
    { id: 'accepted', label: 'Accepted' },
    { id: 'resolved', label: 'Resolved' },
];

export function WeightClient() {
    // State
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearch = useDebouncedValue(searchQuery, 500);
    const [selectedStatus, setSelectedStatus] = useState('all');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // Dialog State
    const [isDisputeOpen, setIsDisputeOpen] = useState(false);
    const [selectedDiscrepancyId, setSelectedDiscrepancyId] = useState<string | null>(null);
    const [selectedAwb, setSelectedAwb] = useState<string>('');

    // API Hooks
    const { data, isLoading, isFetching } = useWeightDiscrepancies({
        status: selectedStatus === 'all' ? undefined : selectedStatus,
        search: debouncedSearch,
        page,
        limit: pageSize
    });

    const { mutate: acceptDiscrepancy, isPending: isAccepting } = useAcceptDiscrepancy();
    const { mutate: disputeDiscrepancy, isPending: isDisputing } = useDisputeDiscrepancy();

    const discrepancies = data?.discrepancies || [];
    const totalItems = data?.total || 0;
    const totalPages = data?.pages || 0;

    // Handlers
    const handleAccept = (id: string) => {
        acceptDiscrepancy(id);
    };

    const openDisputeDialog = (id: string, awb: string) => {
        setSelectedDiscrepancyId(id);
        setSelectedAwb(awb);
        setIsDisputeOpen(true);
    };

    const handleDisputeSubmit = ({ reason, proofFiles }: { reason: string; proofFiles: string[] }) => {
        if (selectedDiscrepancyId) {
            disputeDiscrepancy(
                { id: selectedDiscrepancyId, reason, proofFiles },
                {
                    onSuccess: () => {
                        setIsDisputeOpen(false);
                        setSelectedDiscrepancyId(null);
                    }
                }
            );
        }
    };

    const handlePageChange = (newPage: number) => {
        setPage(newPage);
        // Scroll to top of table or page
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Calculate stats 
    // Note: detailed stats should ideally come from backend to be accurate across all pages
    const currentPending = discrepancies.filter(d => d.status === 'pending').length;
    const currentAdditionalCharges = discrepancies
        .filter(d => d.status === 'pending' || d.status === 'accepted')
        .reduce((sum, d) => sum + d.additionalCharge, 0);

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-10">
            {/* Header */}
            <PageHeader
                title="Weight Reconciliation"
                description="Review and manage weight difference claims from couriers"
                breadcrumbs={[
                    { label: 'Seller', href: '/seller/dashboard' },
                    { label: 'Weight Reconciliation', active: true }
                ]}
            />

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatsCard
                    title="Total Discrepancies"
                    value={totalItems}
                    icon={Scale}
                    variant="default"
                />
                <StatsCard
                    title="Pending Action"
                    value={isLoading ? '-' : currentPending}
                    // Showing current page pending, should be total pending from API if available
                    icon={AlertTriangle}
                    variant="warning"
                    description="Requires attention"
                />
                <StatsCard
                    title="Add. Charges"
                    value={formatCurrency(currentAdditionalCharges)}
                    icon={IndianRupee}
                    variant="critical"
                    description="On current page"
                />
                <StatsCard
                    title="Disputes Won"
                    value="67%"
                    icon={TrendingUp}
                    variant="success"
                    description="Last 30 days"
                    trend={{ value: 12, label: 'vs last month', positive: true }}
                />
            </div>

            {/* Application Content */}
            <div className="space-y-4">
                {/* Filters & Actions */}
                <div className="flex flex-col md:flex-row justify-between gap-4 items-center bg-[var(--bg-primary)] p-1 rounded-xl">
                    {/* Search */}
                    <div className="w-full md:w-72">
                        <Input
                            placeholder="Search AWB or Order ID..."
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setPage(1); // Reset page on search
                            }}
                            icon={<Search className="h-4 w-4" />}
                            className="bg-[var(--bg-tertiary)]"
                        />
                    </div>

                    {/* Status Tabs */}
                    <div className="flex p-1 bg-[var(--bg-tertiary)] rounded-lg overflow-x-auto max-w-full no-scrollbar">
                        {statusFilters.map((filter) => (
                            <button
                                key={filter.id}
                                onClick={() => {
                                    setSelectedStatus(filter.id);
                                    setPage(1);
                                }}
                                className={cn(
                                    "px-4 py-1.5 text-sm font-medium rounded-md transition-all whitespace-nowrap",
                                    selectedStatus === filter.id
                                        ? "bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-sm"
                                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)]/50"
                                )}
                            >
                                {filter.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Main Table Card */}
                <Card className="overflow-hidden border-[var(--border-subtle)] shadow-sm">
                    <CardContent className="p-0">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center p-24 space-y-4">
                                <Loader2 className="w-10 h-10 animate-spin text-[var(--primary-blue)]" />
                                <p className="text-[var(--text-muted)] animate-pulse">Loading discrepancies...</p>
                            </div>
                        ) : (
                            <>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-[var(--bg-secondary)] border-b border-[var(--border-subtle)]">
                                            <tr>
                                                <th className="text-left p-4 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">AWB / Order</th>
                                                <th className="text-left p-4 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Courier</th>
                                                <th className="text-center p-4 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Declared</th>
                                                <th className="text-center p-4 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Charged</th>
                                                <th className="text-center p-4 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Difference</th>
                                                <th className="text-right p-4 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Add. Charge</th>
                                                <th className="text-center p-4 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Status</th>
                                                <th className="text-right p-4 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[var(--border-subtle)]">
                                            {discrepancies.length === 0 ? (
                                                <tr>
                                                    <td colSpan={8} className="p-16 text-center">
                                                        <div className="flex flex-col items-center justify-center">
                                                            <div className="h-16 w-16 bg-[var(--success-bg)] rounded-full flex items-center justify-center mb-4">
                                                                <CheckCircle className="h-8 w-8 text-[var(--success)]" />
                                                            </div>
                                                            <h3 className="text-lg font-medium text-[var(--text-primary)]">No discrepancies found</h3>
                                                            <p className="text-[var(--text-muted)] mt-1 max-w-sm">
                                                                {searchQuery || selectedStatus !== 'all'
                                                                    ? "Try adjusting your search or filters to find what you're looking for."
                                                                    : "Great job! All your shipments match their declared weights."}
                                                            </p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : discrepancies.map((disc) => (
                                                <tr key={disc.id} className="hover:bg-[var(--bg-hover)] transition-colors group">
                                                    <td className="p-4">
                                                        <div className="flex flex-col">
                                                            <span className="font-mono font-medium text-[var(--text-primary)] group-hover:text-[var(--primary-blue)] transition-colors cursor-pointer">
                                                                {disc.awbNumber}
                                                            </span>
                                                            <span className="text-xs text-[var(--text-muted)] mt-0.5">{disc.orderId}</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        <span className="text-sm font-medium text-[var(--text-primary)] bg-[var(--bg-tertiary)] px-2 py-1 rounded">
                                                            {disc.courier}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        <span className="text-sm text-[var(--text-secondary)]">{disc.declaredWeight / 1000} kg</span>
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        <span className="text-sm font-medium text-[var(--text-primary)]">{disc.chargedWeight / 1000} kg</span>
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        <span className="text-sm font-semibold text-[var(--error)] bg-[var(--error-bg)] px-2 py-1 rounded-full">
                                                            +{(disc.difference / 1000).toFixed(2)} kg
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <span className="text-sm font-bold text-[var(--text-primary)]">{formatCurrency(disc.additionalCharge)}</span>
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        <StatusBadge domain="weight_discrepancy" status={disc.status} />
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="flex justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                            {disc.status === 'pending' && (
                                                                <>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="h-8 text-xs hover:bg-[var(--success-bg)] hover:text-[var(--success)]"
                                                                        onClick={() => handleAccept(disc.id)}
                                                                        disabled={isAccepting}
                                                                        title="Accept Charges"
                                                                    >
                                                                        <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                                                                        Accept
                                                                    </Button>
                                                                    <Button
                                                                        variant="primary"
                                                                        size="sm"
                                                                        className="h-8 text-xs bg-[var(--primary-blue)] hover:bg-[var(--primary-blue-deep)]"
                                                                        onClick={() => openDisputeDialog(disc.id, disc.awbNumber)}
                                                                        disabled={isDisputing}
                                                                    >
                                                                        <FileText className="h-3.5 w-3.5 mr-1.5" />
                                                                        Dispute
                                                                    </Button>
                                                                </>
                                                            )}
                                                            {disc.status !== 'pending' && (
                                                                <Button variant="ghost" size="sm" className="h-8 text-xs text-[var(--text-muted)]" disabled>
                                                                    No actions
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <Pagination
                                    currentPage={page}
                                    totalPages={totalPages}
                                    totalItems={totalItems}
                                    pageSize={pageSize}
                                    onPageChange={handlePageChange}
                                    onPageSizeChange={setPageSize}
                                />
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Dispute Dialog */}
            <DisputeDialog
                isOpen={isDisputeOpen}
                onClose={() => setIsDisputeOpen(false)}
                onSubmit={handleDisputeSubmit}
                isSubmitting={isDisputing}
                awbNumber={selectedAwb}
            />
        </div>
    );
}
