"use client";
export const dynamic = "force-dynamic";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/src/components/ui/core/Button';
import { Input } from '@/src/components/ui/core/Input';
import { Badge } from '@/src/components/ui/core/Badge';
import { Modal } from '@/src/components/ui/feedback/Modal';
import { useToast } from '@/src/components/ui/feedback/Toast';
import { formatDate, cn } from '@/src/lib/utils';
import {
    Shield,
    Search,
    Users,
    CheckCircle2,
    XCircle,
    Clock,
    AlertTriangle,
    Download,
    Eye,
    FileText,
    TrendingUp,
    Filter,
    MoreHorizontal,
    ChevronDown,
    Building2,
    Calendar,
    ArrowUpRight
} from 'lucide-react';
import { useAllKYCs, useVerifyKYC, useRejectKYC, KYCDocument } from '@/src/core/api/hooks/security/useKYC';


const statusFilters = [
    { id: 'all', label: 'All Requests' },
    { id: 'verified', label: 'Verified', color: 'bg-[var(--success)]' },
    { id: 'pending', label: 'Pending Review', color: 'bg-[var(--warning)]' },
    { id: 'rejected', label: 'Rejected', color: 'bg-[var(--error)]' },
];

// --- COMPONENTS ---

function StatsCard({ title, value, icon: Icon, color, trend }: any) {
    return (
        <motion.div
            whileHover={{ y: -5 }}
            className="p-6 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] hover:shadow-lg transition-all group"
        >
            <div className="flex items-center justify-between mb-4">
                <div className={cn(
                    "p-3 rounded-xl",
                    color === 'blue' ? "bg-[var(--info-bg)] text-[var(--info)]" :
                        color === 'emerald' ? "bg-[var(--success-bg)] text-[var(--success)]" :
                            color === 'amber' ? "bg-[var(--warning-bg)] text-[var(--warning)]" :
                                "bg-[var(--error-bg)] text-[var(--error)]"
                )}>
                    <Icon className="w-6 h-6" />
                </div>
                {trend && (
                    <span className={cn(
                        "text-xs font-bold px-2 py-1 rounded-full",
                        color === 'blue' ? "bg-[var(--info-bg)] text-[var(--info)]" :
                            color === 'emerald' ? "bg-[var(--success-bg)] text-[var(--success)]" :
                                color === 'amber' ? "bg-[var(--warning-bg)] text-[var(--warning)]" :
                                    "bg-[var(--error-bg)] text-[var(--error)]"
                    )}>
                        {trend}
                    </span>
                )}
            </div>
            <div>
                <p className="text-2xl font-bold text-[var(--text-primary)]">{value}</p>
                <p className="text-xs text-[var(--text-muted)] font-medium uppercase tracking-wide mt-1">{title}</p>
            </div>
        </motion.div>
    );
}

export function KycClient() {
    const [activeFilter, setActiveFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedRequest, setSelectedRequest] = useState<any>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const { addToast } = useToast();

    // API Hooks
    const { data, isLoading } = useAllKYCs({
        status: activeFilter !== 'all' ? activeFilter as any : undefined,
        limit: 50 // Fetch more for client-side filtering if needed, or rely on activeFilter
    });
    const verifyKYC = useVerifyKYC();
    const rejectKYC = useRejectKYC();

    // Derived Data
    const kycs = data?.kycs || [];

    // Client-side search (since backend search might not be comprehensive for joined fields yet)
    const filteredData = kycs.filter((item: any) => {
        // Handle potentially missing populated fields gracefully
        const name = item.userId?.name || item.name || 'Unknown User';
        const email = item.userId?.email || item.email || '';
        const company = item.companyId?.name || item.companyName || '';

        const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            company.toLowerCase().includes(searchQuery.toLowerCase());

        return matchesSearch;
    });

    const stats = {
        total: data?.pagination?.total || 0,
        verified: kycs.filter(k => k.status === 'verified').length,
        pending: kycs.filter(k => k.status === 'pending').length,
        rejected: kycs.filter(k => k.status === 'rejected').length
    };

    // Actions
    const handleViewDetails = (item: any) => {
        setSelectedRequest(item);
        setIsDetailOpen(true);
    };

    const handleApprove = async () => {
        if (!selectedRequest) return;
        try {
            // Verify PAN by default or iterate through all docs
            // For this UI, we treat it as "Approve KYC" which usually means verifying pending docs
            await verifyKYC.mutateAsync({
                kycId: selectedRequest._id,
                documentType: 'pan' // Defaulting to PAN for now, ideal would be per-doc or full approval
            });
            // Also enable GST if present
            if (selectedRequest.documents?.gstin) {
                await verifyKYC.mutateAsync({
                    kycId: selectedRequest._id,
                    documentType: 'gstin'
                });
            }
            setIsDetailOpen(false);
        } catch (error) {
            // Error handled by hook
        }
    };

    const handleReject = async () => {
        if (!selectedRequest) return;
        try {
            await rejectKYC.mutateAsync({
                kycId: selectedRequest._id,
                reason: 'Documents invalid or unclear' // Should capture this from input ideally
            });
            setIsDetailOpen(false);
        } catch (error) {
            // Error handled by hook
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-[var(--primary-blue-soft)] flex items-center justify-center text-[var(--primary-blue)] shadow-lg shadow-blue-500/20">
                        <Shield className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-[var(--text-primary)]">KYC Verification</h1>
                        <p className="text-[var(--text-muted)] text-sm">Review and approve document submissions</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-2" /> Export Report
                    </Button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatsCard title="Total Requests" value={stats.total} icon={FileText} color="blue" />
                <StatsCard title="Verified" value={stats.verified} icon={CheckCircle2} color="emerald" />
                <StatsCard title="Pending Review" value={stats.pending} icon={Clock} color="amber" />
                <StatsCard title="Rejected" value={stats.rejected} icon={XCircle} color="rose" />
            </div>

            {/* Main Content Area */}
            <div className="flex flex-col lg:flex-row gap-6">

                {/* Left: Filters & List */}
                <div className="flex-1 space-y-4">

                    {/* Toolbar */}
                    <div className="flex flex-col md:flex-row gap-4 justify-between bg-[var(--bg-primary)] p-2 rounded-2xl border border-[var(--border-subtle)]">
                        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                            {statusFilters.map(filter => (
                                <button
                                    key={filter.id}
                                    onClick={() => setActiveFilter(filter.id)}
                                    className={cn(
                                        "px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2",
                                        activeFilter === filter.id
                                            ? "bg-[var(--bg-secondary)] text-[var(--text-primary)] shadow-sm border border-[var(--border-subtle)]"
                                            : "text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-secondary)]"
                                    )}
                                >
                                    {activeFilter === filter.id && (
                                        <span className={cn("w-2 h-2 rounded-full", filter.color || 'bg-gray-500')} />
                                    )}
                                    {filter.label}
                                </button>
                            ))}
                        </div>
                        <div className="relative w-full md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                            <input
                                type="text"
                                placeholder="Search requests..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 rounded-xl bg-[var(--bg-secondary)] border-transparent focus:bg-[var(--bg-primary)] focus:border-[var(--primary-blue)] focus:ring-0 text-sm transition-all"
                            />
                        </div>
                    </div>

                    {/* List Cards */}
                    <div className="grid gap-3">
                        {isLoading ? (
                            <div className="py-20 flex flex-col items-center justify-center">
                                <div className="w-8 h-8 border-2 border-[var(--primary-blue-light)] border-t-[var(--primary-blue)] rounded-full animate-spin mb-4" />
                                <p className="text-sm text-[var(--text-tertiary)]">Loading KYC requests...</p>
                            </div>
                        ) : filteredData.length === 0 ? (
                            <div className="text-center py-10 text-[var(--text-muted)]">No KYC requests found</div>
                        ) : (
                            <AnimatePresence>
                                {filteredData.map((item: any) => (
                                    <motion.div
                                        layout
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        key={item._id}
                                        onClick={() => handleViewDetails(item)}
                                        className="group relative p-4 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] hover:border-[var(--primary-blue)]/50 hover:shadow-md cursor-pointer transition-all"
                                    >
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-xl bg-[var(--bg-secondary)] flex items-center justify-center font-bold text-[var(--text-primary)] border border-[var(--border-subtle)]">
                                                    {(item.userId?.name || item.name || 'KD').substring(0, 2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-[var(--text-primary)]">{item.userId?.name || item.name || 'Unknown User'}</h4>
                                                    <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mt-1">
                                                        <span>{item._id.substring(0, 8)}...</span>
                                                        <span>•</span>
                                                        <span>{item.companyId?.name || item.companyName || 'No Company'}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4">
                                                <div className="flex flex-col items-end">
                                                    <span className={cn(
                                                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold capitalize",
                                                        item.status === 'verified' ? "bg-[var(--success-bg)] text-[var(--success)]" :
                                                            item.status === 'pending' ? "bg-[var(--warning-bg)] text-[var(--warning)]" :
                                                                "bg-[var(--error-bg)] text-[var(--error)]"
                                                    )}>
                                                        {item.status === 'verified' && <CheckCircle2 className="w-3 h-3" />}
                                                        {item.status === 'pending' && <Clock className="w-3 h-3" />}
                                                        {item.status === 'rejected' && <XCircle className="w-3 h-3" />}
                                                        {item.status}
                                                    </span>
                                                    <span className="text-[10px] text-[var(--text-muted)] mt-1">
                                                        Updated {formatDate(item.updatedAt)}
                                                    </span>
                                                </div>
                                                <ChevronDown className="-rotate-90 w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--primary-blue)] transition-colors" />
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        )}
                    </div>
                </div>

                {/* Right: Details Panel (Desktop) / Modal (Mobile) - For now simplified to Modal */}
            </div>

            {/* Detail Modal */}
            <Modal
                isOpen={isDetailOpen}
                onClose={() => setIsDetailOpen(false)}
                title="Application Details"
            >
                {selectedRequest && (
                    <div className="space-y-6">
                        {/* Header */}
                        <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-[var(--primary-blue)] text-white flex items-center justify-center font-bold">
                                    {(selectedRequest.userId?.name || 'KD').substring(0, 2)}
                                </div>
                                <div>
                                    <h3 className="font-bold text-[var(--text-primary)]">{selectedRequest.userId?.name || 'Unknown User'}</h3>
                                    <p className="text-xs text-[var(--text-muted)]">{selectedRequest.userId?.email || ''}</p>
                                </div>
                            </div>
                            <div className="text-xs font-bold px-2 py-1 rounded bg-[var(--bg-tertiary)] border border-[var(--border-subtle)]">
                                {selectedRequest.status.toUpperCase()}
                            </div>
                        </div>

                        {/* Documents Grid */}
                        <div>
                            <h4 className="text-sm font-bold text-[var(--text-secondary)] mb-3">Submitted Documents</h4>
                            <div className="grid gap-2">
                                {/* PAN Card */}
                                {selectedRequest.documents?.pan && (
                                    <DocumentItem
                                        label="PAN Card"
                                        value={selectedRequest.documents.pan.number}
                                        isVerified={selectedRequest.documents.pan.verified}
                                    />
                                )}
                                {/* GSTIN */}
                                {selectedRequest.documents?.gstin && (
                                    <DocumentItem
                                        label="GST Certificate"
                                        value={selectedRequest.documents.gstin.number}
                                        isVerified={selectedRequest.documents.gstin.verified}
                                    />
                                )}
                                {/* Bank Account */}
                                {selectedRequest.documents?.bankAccount && (
                                    <DocumentItem
                                        label="Bank Account"
                                        value={selectedRequest.documents.bankAccount.accountNumber}
                                        isVerified={selectedRequest.documents.bankAccount.verified}
                                    />
                                )}
                                {/* Aadhaar */}
                                {selectedRequest.documents?.aadhaar && (
                                    <DocumentItem
                                        label="Aadhaar Card"
                                        value={selectedRequest.documents.aadhaar.number}
                                        isVerified={selectedRequest.documents.aadhaar.verified}
                                    />
                                )}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="grid grid-cols-2 gap-3 pt-4 border-t border-[var(--border-subtle)]">
                            <Button
                                variant="outline"
                                className="border-[var(--error)]/20 text-[var(--error)] hover:bg-[var(--error-bg)]"
                                onClick={handleReject}
                                disabled={rejectKYC.isPending}
                            >
                                <XCircle className="w-4 h-4 mr-2" /> Reject
                            </Button>
                            <Button
                                className="bg-[var(--success)] hover:bg-[var(--success)]/90 text-white"
                                onClick={handleApprove}
                                disabled={verifyKYC.isPending}
                            >
                                <CheckCircle2 className="w-4 h-4 mr-2" /> Approve
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}

function DocumentItem({ label, value, isVerified }: { label: string, value: string, isVerified: boolean }) {
    return (
        <div className="flex items-center justify-between p-3 rounded-lg border border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer group">
            <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[var(--info-bg)] text-[var(--info)]">
                    <FileText className="w-4 h-4" />
                </div>
                <div>
                    <span className="text-sm font-medium text-[var(--text-primary)] block">{label}</span>
                    <span className="text-xs text-[var(--text-muted)] font-mono">{value}</span>
                </div>
            </div>
            <div className="flex items-center gap-2">
                {isVerified ? (
                    <Badge variant="success" size="sm">Verified</Badge>
                ) : (
                    <Badge variant="warning" size="sm">Pending</Badge>
                )}
            </div>
        </div>
    )
}
