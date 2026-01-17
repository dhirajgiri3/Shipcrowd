"use client";
export const dynamic = "force-dynamic";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/src/components/ui/core/Button';
import { Input } from '@/src/components/ui/core/Input';
import { Badge } from '@/src/components/ui/core/Badge';
import { Modal } from '@/src/components/ui/feedback/Modal';
import { useToast } from '@/src/components/ui/feedback/Toast';
import { formatDate, cn } from '@/src/shared/utils';
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

// --- MOCK DATA ---
const mockKYCData = [
    {
        id: 'SLR-001',
        name: 'TechGadgets Inc.',
        owner: 'Rahul Sharma',
        email: 'rahul@techgadgets.com',
        status: 'verified',
        submittedAt: '2024-11-15',
        verifiedAt: '2024-11-17',
        documents: ['Pan Card', 'GST Certificate', 'Bank Statement'],
        riskScore: 'Low'
    },
    {
        id: 'SLR-002',
        name: 'Fashion Hub',
        owner: 'Priya Patel',
        email: 'priya@fashionhub.in',
        status: 'pending',
        submittedAt: '2024-12-10',
        verifiedAt: null,
        documents: ['Pan Card', 'GST Certificate'],
        pendingDocs: ['Bank Statement'],
        riskScore: 'Medium'
    },
    {
        id: 'SLR-003',
        name: 'HomeDecor Plus',
        owner: 'Amit Singh',
        email: 'amit@homedecorplus.com',
        status: 'verified',
        submittedAt: '2024-10-20',
        verifiedAt: '2024-10-22',
        documents: ['Pan Card', 'GST Certificate', 'Bank Statement', 'Address Proof'],
        riskScore: 'Low'
    },
    {
        id: 'SLR-004',
        name: 'StartupStore',
        owner: 'Kavita Reddy',
        email: 'kavita@startupstore.in',
        status: 'incomplete',
        submittedAt: null,
        verifiedAt: null,
        documents: ['Pan Card'],
        pendingDocs: ['GST Certificate', 'Bank Statement'],
        riskScore: 'High'
    },
    {
        id: 'SLR-005',
        name: 'BookWorld',
        owner: 'Vikram Iyer',
        email: 'vikram@bookworld.com',
        status: 'rejected',
        submittedAt: '2024-12-05',
        verifiedAt: null,
        documents: ['Pan Card', 'GST Certificate'],
        rejectionReason: 'GST certificate expired',
        riskScore: 'High'
    }
];

const statusFilters = [
    { id: 'all', label: 'All Requests' },
    { id: 'verified', label: 'Verified', color: 'bg-[var(--success)]' },
    { id: 'pending', label: 'Pending Review', color: 'bg-[var(--warning)]' },
    { id: 'rejected', label: 'Rejected', color: 'bg-[var(--error)]' },
    { id: 'incomplete', label: 'Incomplete', color: 'bg-[var(--info)]' }
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
                <span className={cn(
                    "text-xs font-bold px-2 py-1 rounded-full",
                    color === 'blue' ? "bg-[var(--info-bg)] text-[var(--info)]" :
                        color === 'emerald' ? "bg-[var(--success-bg)] text-[var(--success)]" :
                            color === 'amber' ? "bg-[var(--warning-bg)] text-[var(--warning)]" :
                                "bg-[var(--error-bg)] text-[var(--error)]"
                )}>
                    {trend}
                </span>
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

    // Derived Data
    const filteredData = mockKYCData.filter(item => {
        const matchesFilter = activeFilter === 'all' || item.status === activeFilter;
        const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.email.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    const stats = {
        total: mockKYCData.length,
        verified: mockKYCData.filter(k => k.status === 'verified').length,
        pending: mockKYCData.filter(k => k.status === 'pending').length,
        rejected: mockKYCData.filter(k => k.status === 'rejected').length
    };

    // Actions
    const handleViewDetails = (item: any) => {
        setSelectedRequest(item);
        setIsDetailOpen(true);
    };

    const handleApprove = () => {
        addToast('KYC Approved Successfully', 'success');
        setIsDetailOpen(false);
    };

    const handleReject = () => {
        addToast('KYC Rejected', 'warning');
        setIsDetailOpen(false);
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
                <StatsCard title="Total Requests" value={stats.total} icon={FileText} color="blue" trend="+12%" />
                <StatsCard title="Verified" value={stats.verified} icon={CheckCircle2} color="emerald" trend="+8%" />
                <StatsCard title="Pending Review" value={stats.pending} icon={Clock} color="amber" trend="5 Urgent" />
                <StatsCard title="Rejected" value={stats.rejected} icon={XCircle} color="rose" trend="2 New" />
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
                        <AnimatePresence>
                            {filteredData.map((item) => (
                                <motion.div
                                    layout
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    key={item.id}
                                    onClick={() => handleViewDetails(item)}
                                    className="group relative p-4 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] hover:border-[var(--primary-blue)]/50 hover:shadow-md cursor-pointer transition-all"
                                >
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-[var(--bg-secondary)] flex items-center justify-center font-bold text-[var(--text-primary)] border border-[var(--border-subtle)]">
                                                {item.name.substring(0, 2)}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-[var(--text-primary)]">{item.name}</h4>
                                                <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mt-1">
                                                    <span>{item.id}</span>
                                                    <span>•</span>
                                                    <span>{item.owner}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            <div className="flex flex-col items-end">
                                                <span className={cn(
                                                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold capitalize",
                                                    item.status === 'verified' ? "bg-[var(--success-bg)] text-[var(--success)]" :
                                                        item.status === 'pending' ? "bg-[var(--warning-bg)] text-[var(--warning)]" :
                                                            item.status === 'incomplete' ? "bg-[var(--info-bg)] text-[var(--info)]" :
                                                                "bg-[var(--error-bg)] text-[var(--error)]"
                                                )}>
                                                    {item.status === 'verified' && <CheckCircle2 className="w-3 h-3" />}
                                                    {item.status === 'pending' && <Clock className="w-3 h-3" />}
                                                    {item.status === 'incomplete' && <AlertTriangle className="w-3 h-3" />}
                                                    {item.status === 'rejected' && <XCircle className="w-3 h-3" />}
                                                    {item.status}
                                                </span>
                                                {item.submittedAt && (
                                                    <span className="text-[10px] text-[var(--text-muted)] mt-1">
                                                        Submitted {item.submittedAt}
                                                    </span>
                                                )}
                                            </div>
                                            <ChevronDown className="-rotate-90 w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--primary-blue)] transition-colors" />
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
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
                                    {selectedRequest.name.substring(0, 2)}
                                </div>
                                <div>
                                    <h3 className="font-bold text-[var(--text-primary)]">{selectedRequest.name}</h3>
                                    <p className="text-xs text-[var(--text-muted)]">{selectedRequest.email}</p>
                                </div>
                            </div>
                            <Badge variant={selectedRequest.riskScore === 'Low' ? 'success' : selectedRequest.riskScore === 'Medium' ? 'warning' : 'destructive'}>
                                {selectedRequest.riskScore} Risk
                            </Badge>
                        </div>

                        {/* Documents Grid */}
                        <div>
                            <h4 className="text-sm font-bold text-[var(--text-secondary)] mb-3">Submitted Documents</h4>
                            <div className="grid gap-2">
                                {selectedRequest.documents.map((doc: string, i: number) => (
                                    <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer group">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-lg bg-[var(--info-bg)] text-[var(--info)]">
                                                <FileText className="w-4 h-4" />
                                            </div>
                                            <span className="text-sm font-medium text-[var(--text-primary)]">{doc}</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                                                <Eye className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--primary-blue)]" />
                                            </Button>
                                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                                                <Download className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--primary-blue)]" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="grid grid-cols-2 gap-3 pt-4 border-t border-[var(--border-subtle)]">
                            <Button
                                variant="outline"
                                className="border-[var(--error)]/20 text-[var(--error)] hover:bg-[var(--error-bg)]"
                                onClick={handleReject}
                            >
                                <XCircle className="w-4 h-4 mr-2" /> Reject
                            </Button>
                            <Button
                                className="bg-[var(--success)] hover:bg-[var(--success)]/90 text-white"
                                onClick={handleApprove}
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
