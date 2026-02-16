"use client";
export const dynamic = "force-dynamic";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CheckCircle2, XCircle, Clock,
    FileText, User, Building2, RefreshCw
} from 'lucide-react';
import { Button } from '@/src/components/ui/core/Button';
import { Badge } from '@/src/components/ui/core/Badge';
import { StatusBadge } from '@/src/components/ui/data/StatusBadge';
import { ViewActionButton } from '@/src/components/ui/core/ViewActionButton';
import { Modal } from '@/src/components/ui/feedback/Modal';
import { useToast } from '@/src/components/ui/feedback/Toast';
import { PageHeader } from '@/src/components/ui/layout/PageHeader';
import { SearchInput } from '@/src/components/ui/form/SearchInput';
import { PillTabs } from '@/src/components/ui/core/PillTabs';
import { DateRangePicker } from '@/src/components/ui/form/DateRangePicker';
import { DataTable } from '@/src/components/ui/data/DataTable';
import { StatsCard } from '@/src/components/ui/dashboard/StatsCard';
import { formatDate, cn, parsePaginationQuery } from '@/src/lib/utils';
import { handleApiError } from '@/src/lib/error';
import { useAllKYCs, useVerifyKYC, useRejectKYC, KYCFilters } from '@/src/core/api/hooks/security/useKYC';
import { useUrlDateRange } from '@/src/hooks/analytics/useUrlDateRange';
import { useDebouncedValue } from '@/src/hooks/data';

// --- CONSTANTS ---
const STATUS_TABS = [
    { id: 'all', label: 'All Requests' },
    { id: 'verified', label: 'Verified' },
    { id: 'pending', label: 'Pending' },
    { id: 'rejected', label: 'Rejected' },
];
const DEFAULT_LIMIT = 10;

export function KycClient() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { addToast } = useToast();

    // -- State from URL & Local --
    const { page, limit } = parsePaginationQuery(searchParams, { defaultLimit: DEFAULT_LIMIT });
    const status = (searchParams.get('status') as KYCFilters['status']) || 'all';
    const search = searchParams.get('search') || '';
    const {
        range: dateRange,
        startDateIso,
        endDateIso,
        setRange,
    } = useUrlDateRange();

    const [searchTerm, setSearchTerm] = useState(search);
    const debouncedSearch = useDebouncedValue(searchTerm, 500);
    const [selectedRequest, setSelectedRequest] = useState<any>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [isRejecting, setIsRejecting] = useState(false);

    // Keep local search in sync with URL (back/forward/share links)
    useEffect(() => {
        setSearchTerm((current) => (current === search ? current : search));
    }, [search]);

    // -- URL Helper --
    const updateUrl = (updates: Record<string, string | number | null>) => {
        const params = new URLSearchParams(searchParams.toString());
        Object.entries(updates).forEach(([key, value]) => {
            if (value === null || value === undefined || value === '') {
                params.delete(key);
            } else {
                params.set(key, String(value));
            }
        });
        router.push(`?${params.toString()}`, { scroll: false });
    };

    // Sync debounced search to URL
    useEffect(() => {
        if (debouncedSearch !== search) {
            updateUrl({ search: debouncedSearch, page: 1 });
        }
    }, [debouncedSearch, search]);

    // -- API Params --
    const queryParams: KYCFilters = useMemo(() => ({
        page,
        limit,
        status: status === 'all' ? undefined : status,
        search: debouncedSearch || undefined,
        startDate: startDateIso,
        endDate: endDateIso,
    }), [page, limit, status, debouncedSearch, startDateIso, endDateIso]);

    // -- API Hooks --
    const { data, isLoading, refetch, isFetching } = useAllKYCs(queryParams);
    const verifyKYC = useVerifyKYC();
    const rejectKYC = useRejectKYC();

    const kycs = data?.kycs || [];
    const pagination = data?.pagination;
    const stats = data?.stats || { total: 0, pending: 0, verified: 0, rejected: 0 };

    // -- Handlers --
    const handleTabChange = (newStatus: string) => {
        updateUrl({ status: newStatus, page: 1 });
    };

    const handlePageChange = (newPage: number) => {
        updateUrl({ page: newPage });
    };

    const handleDateRangeChange = setRange;

    const handleRefresh = () => {
        refetch();
        addToast('Refreshed', 'success', { description: 'KYC data updated' });
    };

    const handleViewDetails = (item: any) => {
        setSelectedRequest(item);
        setIsDetailOpen(true);
        setIsRejecting(false);
        setRejectionReason('');
    };

    const handleApprove = async () => {
        if (!selectedRequest) return;
        try {
            await verifyKYC.mutateAsync({
                kycId: selectedRequest._id,
                documentType: 'pan' // Defaulting to PAN as primary
            });
            if (selectedRequest.documents?.gstin) {
                await verifyKYC.mutateAsync({
                    kycId: selectedRequest._id,
                    documentType: 'gstin'
                });
            }
            addToast('KYC verified', 'success', { description: 'Application approved successfully' });
            setIsDetailOpen(false);
        } catch (error) {
            handleApiError(error as Error, 'Failed to verify KYC');
        }
    };

    const handleReject = async () => {
        if (!selectedRequest) return;
        if (!isRejecting) {
            setIsRejecting(true);
            return;
        }
        if (!rejectionReason) {
            addToast('Error', 'error', { description: 'Please provide a rejection reason' });
            return;
        }

        try {
            await rejectKYC.mutateAsync({
                kycId: selectedRequest._id,
                reason: rejectionReason
            });
            addToast('KYC rejected', 'success', { description: 'Application rejected' });
            setIsDetailOpen(false);
        } catch (error) {
            handleApiError(error as Error, 'Failed to reject KYC');
        }
    };

    // -- Columns for DataTable --
    const columns = [
        {
            header: 'User',
            accessorKey: 'userId',
            cell: (row: any) => (
                <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--text-secondary)] font-medium text-xs">
                        {(row.userId?.name || row.userId?.email || 'U').substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                        <p className="font-medium text-[var(--text-primary)] text-sm">{row.userId?.name || 'Unknown'}</p>
                        <p className="text-xs text-[var(--text-muted)]">{row.userId?.email}</p>
                    </div>
                </div>
            )
        },
        {
            header: 'Company',
            accessorKey: 'companyId',
            cell: (row: any) => (
                <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                    <Building2 className="w-4 h-4 text-[var(--text-muted)]" />
                    {row.companyId?.name || 'N/A'}
                </div>
            )
        },
        {
            header: 'Status',
            accessorKey: 'status',
            cell: (row: any) => (
                <StatusBadge
                    domain="kyc"
                    status={row.status}
                    className="capitalize"
                />
            )
        },
        {
            header: 'Submitted',
            accessorKey: 'createdAt',
            cell: (row: any) => (
                <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                    <Clock className="w-3.5 h-3.5" />
                    {formatDate(row.createdAt)}
                </div>
            )
        },
        {
            header: 'Documents',
            accessorKey: 'documents',
            cell: (row: any) => (
                <div className="flex gap-1">
                    {row.documents?.pan && <Badge variant="outline" size="sm" className="text-[10px]">PAN</Badge>}
                    {row.documents?.gstin && <Badge variant="outline" size="sm" className="text-[10px]">GST</Badge>}
                    {row.documents?.bankAccount && <Badge variant="outline" size="sm" className="text-[10px]">Bank</Badge>}
                </div>
            )
        },
        {
            header: '',
            accessorKey: 'actions',
            width: 'w-10',
            cell: (row: any) => (
                <ViewActionButton
                    onClick={() => handleViewDetails(row)}
                />
            )
        }
    ];

    return (
        <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-8 animate-fade-in bg-[var(--bg-secondary)] min-h-screen">
            <PageHeader
                title="KYC Management"
                description="Verify identities and approve merchant documentation."
                showBack={true}
                backUrl="/admin"
                breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'KYC', active: true }]}
                actions={
                    <Button
                        variant="outline"
                        onClick={handleRefresh}
                        disabled={isFetching}
                        className="bg-[var(--bg-primary)]"
                    >
                        <RefreshCw className={cn("w-4 h-4 mr-2", isFetching && "animate-spin")} />
                        Refresh
                    </Button>
                }
            />

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatsCard title="Total Requests" value={stats.total} icon={FileText} variant="info" />
                <StatsCard title="Verified Merchants" value={stats.verified} icon={CheckCircle2} variant="success" />
                <StatsCard
                    title="Pending Review"
                    value={stats.pending}
                    icon={Clock}
                    variant={stats.pending > 0 ? "warning" : "default"}
                />
                <StatsCard title="Rejected" value={stats.rejected} icon={XCircle} variant="critical" />
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-[var(--bg-primary)] p-1 rounded-xl border border-[var(--border-default)]">
                <SearchInput
                    placeholder="Search by Name, Email, Company..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    widthClass="w-full md:w-96"
                />

                <div className="flex items-center gap-4">
                    <div className="hidden md:block">
                        <DateRangePicker value={dateRange} onRangeChange={handleDateRangeChange} />
                    </div>

                    <PillTabs
                        tabs={STATUS_TABS.map((t) => ({ key: t.id, label: t.label }))}
                        activeTab={status}
                        onTabChange={handleTabChange}
                        className="overflow-x-auto scrollbar-hide"
                    />
                </div>
            </div>

            {/* Data Table */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
            >
                <DataTable
                    columns={columns}
                    data={kycs}
                    isLoading={isLoading}
                    onRowClick={handleViewDetails}
                    pagination={{
                        currentPage: pagination?.page || 1,
                        totalPages: pagination?.pages || 1,
                        totalItems: pagination?.total || 0,
                        onPageChange: handlePageChange
                    }}
                />
            </motion.div>

            {/* Detail Modal */}
            <Modal
                isOpen={isDetailOpen}
                onClose={() => setIsDetailOpen(false)}
                title="KYC Application Details"
            >
                {selectedRequest && (
                    <div className="space-y-6">
                        {/* Header Info */}
                        <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-lg bg-[var(--primary-blue)] text-white flex items-center justify-center font-bold">
                                    {(selectedRequest.userId?.name || 'U').substring(0, 2)}
                                </div>
                                <div>
                                    <h3 className="font-bold text-[var(--text-primary)]">{selectedRequest.userId?.name}</h3>
                                    <p className="text-xs text-[var(--text-muted)]">{selectedRequest.userId?.email}</p>
                                </div>
                            </div>
                            <StatusBadge domain="kyc" status={selectedRequest.status} className="capitalize" />
                        </div>

                        {/* Documents */}
                        <div>
                            <h4 className="text-xs uppercase tracking-wider text-[var(--text-muted)] font-bold mb-3">Submitted Documents</h4>
                            <div className="space-y-2">
                                <DocumentItem
                                    icon={FileText}
                                    label="PAN Card"
                                    value={selectedRequest.documents?.pan?.number || 'Not Submitted'}
                                    verified={selectedRequest.documents?.pan?.verified}
                                />
                                <DocumentItem
                                    icon={Building2}
                                    label="GST Certificate"
                                    value={selectedRequest.documents?.gstin?.number || 'Not Submitted'}
                                    verified={selectedRequest.documents?.gstin?.verified}
                                />
                                <DocumentItem
                                    icon={User}
                                    label="Aadhaar Card"
                                    value={selectedRequest.documents?.aadhaar?.number || 'Not Submitted'}
                                    verified={selectedRequest.documents?.aadhaar?.verified}
                                />
                            </div>
                        </div>

                        {/* Rejection UI */}
                        <AnimatePresence>
                            {isRejecting && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="overflow-hidden"
                                >
                                    <label className="text-sm font-medium text-[var(--text-primary)] mb-1 block">Reason for Rejection</label>
                                    <textarea
                                        value={rejectionReason}
                                        onChange={(e) => setRejectionReason(e.target.value)}
                                        placeholder="Please explain why the KYC is being rejected..."
                                        className="w-full p-3 rounded-xl border border-[var(--border-strong)] bg-[var(--bg-tertiary)] text-sm focus:ring-2 focus:ring-[var(--primary-blue)] focus:border-transparent outline-none h-24 resize-none"
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Actions */}
                        <div className="flex gap-3 pt-4 border-t border-[var(--border-subtle)]">
                            {selectedRequest.status !== 'rejected' && (
                                <Button
                                    variant="outline"
                                    className="flex-1 border-[var(--error)]/20 text-[var(--error)] hover:bg-[var(--error-bg)]"
                                    onClick={handleReject}
                                    disabled={rejectKYC.isPending || verifyKYC.isPending}
                                >
                                    {isRejecting ? 'Confirm Rejection' : 'Reject Application'}
                                </Button>
                            )}
                            {isRejecting && (
                                <Button
                                    variant="ghost"
                                    onClick={() => setIsRejecting(false)}
                                >
                                    Cancel
                                </Button>
                            )}
                            {selectedRequest.status !== 'verified' && !isRejecting && (
                                <Button
                                    variant="primary"
                                    className="flex-1"
                                    onClick={handleApprove}
                                    disabled={verifyKYC.isPending || rejectKYC.isPending}
                                >
                                    Approve & Verify
                                </Button>
                            )}
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}

function DocumentItem({ icon: Icon, label, value, verified }: any) {
    return (
        <div className="flex items-center justify-between p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)]">
            <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
                    <Icon className="w-4 h-4" />
                </div>
                <div>
                    <p className="text-xs text-[var(--text-muted)] font-medium">{label}</p>
                    <p className="text-sm font-semibold text-[var(--text-primary)] font-mono">{value}</p>
                </div>
            </div>
            {verified ? (
                <StatusBadge domain="kyc" status="verified" size="sm" className="h-6" />
            ) : (
                <StatusBadge domain="kyc" status="pending" size="sm" className="h-6" />
            )}
        </div>
    );
}
