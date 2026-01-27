"use client";
export const dynamic = "force-dynamic";

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/src/components/ui/core/Button';
import { DataTable } from '@/src/components/ui/data/DataTable';
import { Modal } from '@/src/components/ui/feedback/Modal';
import { useToast } from '@/src/components/ui/feedback/Toast';
import { formatCurrency, cn } from '@/src/lib/utils';
import {
    Search,
    Building2,
    Users,
    Package,
    IndianRupee,
    Clock,
    CheckCircle2,
    Download,
    Ban,
    Mail,
    Phone,
    MapPin,
    UserPlus,
    LayoutGrid,
    List,
    Shield,
    MoreHorizontal,
    ArrowUpRight,
    Loader2
} from 'lucide-react';
import { useAdminSellers, useAdminCompanyAction, useAdminCompanyStats } from '@/src/core/api/hooks/admin/useAdminSellers';
import { useDebouncedValue } from '@/src/hooks/data';
import type { Company } from '@/src/core/api/clients/companyApi';

const statusTabs = [
    { id: 'all', label: 'All Sellers' },
    { id: 'approved', label: 'Approved' },
    { id: 'pending_verification', label: 'Pending Verification' },
    { id: 'suspended', label: 'Suspended' }
];


export function SellersClient() {
    const [activeTab, setActiveTab] = useState('all');
    const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
    const [search, setSearch] = useState('');
    const debouncedSearch = useDebouncedValue(search, 500);
    const [selectedSeller, setSelectedSeller] = useState<Company | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const { addToast } = useToast();

    // API Hooks
    const { data: sellersData, isLoading } = useAdminSellers({
        search: debouncedSearch,
        status: activeTab === 'all' ? undefined : activeTab,
    });

    const { data: statsData } = useAdminCompanyStats();
    const { mutate: performAction, isPending: isActionPending } = useAdminCompanyAction();

    const sellers = sellersData?.companies || [];

    // Stats
    const stats = useMemo(() => ({
        total: statsData?.total || 0,
        active: statsData?.active || 0,
        pending: statsData?.byStatus?.pending_verification || 0,
        // TODO: Get real aggregated revenue/volume stats if available in API
        monthlyVolume: 0,
        totalRevenue: 0
    }), [statsData]);

    // Handlers
    const handleViewSeller = (seller: Company) => {
        setSelectedSeller(seller);
        setIsDetailOpen(true);
    };

    const handleAction = (status: Company['status']) => {
        if (!selectedSeller) return;

        performAction({
            companyId: selectedSeller._id,
            status
        }, {
            onSuccess: () => {
                setIsDetailOpen(false);
            }
        });
    };




    // Columns config
    const columns = [
        {
            header: 'Company',
            accessorKey: 'name' as const,
            cell: (row: Company) => (
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-[var(--primary-blue-soft)] text-[var(--primary-blue)] flex items-center justify-center font-bold text-sm uppercase">
                        {row.name.substring(0, 2)}
                    </div>
                    <div>
                        <p className="font-semibold text-[var(--text-primary)]">{row.name}</p>
                        <p className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {row.address?.city || 'N/A'}
                        </p>
                    </div>
                </div>
            )
        },
        // Owner name isn't directly on Company type, might need populate or just show email/date
        {
            header: 'Joined',
            accessorKey: 'createdAt' as const,
            cell: (row: Company) => (
                <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">{new Date(row.createdAt).toLocaleDateString()}</p>
                </div>
            )
        },
        {
            header: 'Status',
            accessorKey: 'status' as const,
            cell: (row: Company) => (
                <div className="flex flex-col gap-1">
                    <span className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold w-fit",
                        row.status === 'approved' ? "bg-[var(--success-bg)] text-[var(--success)]" :
                            row.status === 'pending_verification' || row.status === 'kyc_submitted' ? "bg-[var(--warning-bg)] text-[var(--warning)]" :
                                "bg-[var(--error-bg)] text-[var(--error)]"
                    )}>
                        <span className={cn("w-1.5 h-1.5 rounded-full",
                            row.status === 'approved' ? "bg-[var(--success)]" :
                                row.status.includes('pending') || row.status.includes('kyc') ? "bg-[var(--warning)]" : "bg-[var(--error)]"
                        )} />
                        {row.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                </div>
            )
        },
        // Placeholder for Performance/Wallet until those APIs are connected
        {
            header: 'Wallet',
            accessorKey: '_id' as const, // Temporary key
            cell: (row: Company) => (
                <span className="text-[var(--text-muted)] text-xs italic">
                    --
                </span>
            )
        },
        {
            header: 'Actions',
            accessorKey: '_id' as const,
            cell: (row: Company) => (
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleViewSeller(row)}>
                        View
                    </Button>
                </div>
            )
        }
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-[var(--primary-blue-soft)] flex items-center justify-center text-[var(--primary-blue)] shadow-lg shadow-blue-500/20">
                        <Building2 className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Seller Management</h1>
                        <p className="text-[var(--text-muted)] text-sm">Monitor performance and manage accounts</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="hidden md:flex">
                        <Download className="h-4 w-4 mr-1.5" />
                        Export
                    </Button>
                    <Button size="sm" className="bg-[var(--primary-blue)] hover:bg-[var(--primary-blue-deep)] text-white shadow-lg shadow-blue-500/25 border-0">
                        <UserPlus className="h-4 w-4 mr-1.5" />
                        Invite Seller
                    </Button>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total Sellers', value: stats.total, icon: Users, color: 'blue' },
                    { label: 'Pending Approval', value: stats.pending, icon: Clock, color: 'amber' },
                    { label: 'Monthly Volume', value: stats.monthlyVolume.toLocaleString(), icon: Package, color: 'violet' },
                    { label: 'Total Revenue', value: formatCurrency(stats.totalRevenue), icon: IndianRupee, color: 'emerald' },
                ].map((stat, i) => (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        key={stat.label}
                        className="p-5 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] hover:border-[var(--primary-blue)]/30 transition-colors group"
                    >
                        <div className="flex items-start justify-between mb-2">
                            <div className={cn(
                                "p-2 rounded-lg",
                                stat.color === 'blue' ? "bg-[var(--info-bg)] text-[var(--info)]" :
                                    stat.color === 'amber' ? "bg-[var(--warning-bg)] text-[var(--warning)]" :
                                        stat.color === 'violet' ? "bg-[var(--primary-blue-soft)] text-[var(--primary-blue)]" :
                                            "bg-[var(--success-bg)] text-[var(--success)]"
                            )}>
                                <stat.icon className="w-5 h-5" />
                            </div>
                        </div>
                        <p className="text-2xl font-bold text-[var(--text-primary)]">{stat.value}</p>
                        <p className="text-xs text-[var(--text-muted)] font-medium uppercase tracking-wide mt-1">{stat.label}</p>
                    </motion.div>
                ))}
            </div>

            {/* Filters & Controls */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-1 rounded-2xl">
                <div className="flex items-center bg-[var(--bg-primary)] p-1 rounded-xl border border-[var(--border-subtle)] w-full md:w-auto">
                    {statusTabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                                activeTab === tab.id
                                    ? "bg-[var(--primary-blue)] text-white shadow-md"
                                    : "text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
                            )}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
                        <input
                            type="text"
                            placeholder="Search sellers..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-blue)]/20 focus:border-[var(--primary-blue)] transition-all"
                        />
                    </div>
                    <div className="flex bg-[var(--bg-primary)] rounded-xl border border-[var(--border-subtle)] p-1">
                        <button
                            onClick={() => setViewMode('table')}
                            className={cn("p-2 rounded-lg transition-all", viewMode === 'table' ? "bg-[var(--bg-secondary)] text-[var(--text-primary)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]")}
                        >
                            <List className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('grid')}
                            className={cn("p-2 rounded-lg transition-all", viewMode === 'grid' ? "bg-[var(--bg-secondary)] text-[var(--text-primary)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]")}
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            {isLoading ? (
                <div className="flex items-center justify-center p-20">
                    <Loader2 className="w-8 h-8 animate-spin text-[var(--primary-blue)]" />
                </div>
            ) : viewMode === 'table' ? (
                <div className="bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-subtle)] overflow-hidden">
                    <DataTable columns={columns} data={sellers} />
                </div>
            ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <AnimatePresence>
                        {sellers.map((seller) => (
                            <motion.div
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                key={seller._id}
                                onClick={() => handleViewSeller(seller)}
                                className="group relative p-6 bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-subtle)] hover:border-[var(--primary-blue)]/50 hover:shadow-xl transition-all cursor-pointer overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 p-4">
                                    <button className="p-2 rounded-full hover:bg-[var(--bg-secondary)] text-[var(--text-muted)] transition-colors">
                                        <MoreHorizontal className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-16 h-16 rounded-2xl bg-[var(--primary-blue-soft)] flex items-center justify-center text-xl font-bold text-[var(--primary-blue)] uppercase">
                                        {seller.name.substring(0, 2)}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-[var(--text-primary)] text-lg">{seller.name}</h3>
                                        <p className="text-sm text-[var(--text-muted)] flex items-center gap-1">
                                            <MapPin className="w-3 h-3" /> {seller.address?.city || 'N/A'}
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <div className="p-3 rounded-xl bg-[var(--bg-secondary)]">
                                        <p className="text-xs text-[var(--text-muted)]">Wallet</p>
                                        <p className="font-bold text-[var(--text-primary)]">--</p>
                                    </div>
                                    <div className="p-3 rounded-xl bg-[var(--bg-secondary)]">
                                        <p className="text-xs text-[var(--text-muted)]">Joined</p>
                                        <p className="font-bold text-[var(--text-primary)]">{new Date(seller.createdAt).toLocaleDateString()}</p>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between mt-auto pt-4 border-t border-[var(--border-subtle)]">
                                    <span className={cn(
                                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold",
                                        seller.status === 'approved' ? "bg-[var(--success-bg)] text-[var(--success)]" :
                                            seller.status.includes('pending') ? "bg-[var(--warning-bg)] text-[var(--warning)]" :
                                                "bg-[var(--error-bg)] text-[var(--error)]"
                                    )}>
                                        <span className={cn("w-1.5 h-1.5 rounded-full",
                                            seller.status === 'approved' ? "bg-[var(--success)]" :
                                                seller.status.includes('pending') ? "bg-[var(--warning)]" : "bg-[var(--error)]"
                                        )} />
                                        {seller.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                    </span>
                                    <span className="text-xs font-medium text-[var(--primary-blue)] group-hover:translate-x-1 transition-transform flex items-center gap-1">
                                        View Details <ArrowUpRight className="w-3 h-3" />
                                    </span>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}

            {/* Seller Detail Modal */}
            <Modal
                isOpen={isDetailOpen}
                onClose={() => setIsDetailOpen(false)}
                title={selectedSeller?.name || 'Seller Details'}
            >
                {selectedSeller && (
                    <div className="space-y-6">
                        {/* Profile Section */}
                        <div className="flex items-center gap-4 p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
                            <div className="w-16 h-16 rounded-full bg-[var(--primary-blue)] text-white flex items-center justify-center text-xl font-bold uppercase uppercase">
                                {selectedSeller.name.substring(0, 2)}
                            </div>
                            <div>
                                <h3 className="font-bold text-[var(--text-primary)]">{selectedSeller.name}</h3>
                                <div className="flex flex-col text-sm text-[var(--text-secondary)] mt-1 gap-0.5">
                                    <div className="flex items-center gap-2">
                                        <Building2 className="w-3.5 h-3.5" /> {selectedSeller.address?.city || 'No City'}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-3.5 h-3.5" /> Joined {new Date(selectedSeller.createdAt).toLocaleDateString()}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="flex gap-3">
                            <Button className="flex-1 bg-[var(--primary-blue)] hover:bg-[var(--primary-blue-deep)] text-white">
                                Login as Seller
                            </Button>
                            {selectedSeller.status === 'pending_verification' || selectedSeller.status === 'kyc_submitted' ? (
                                <Button
                                    className="flex-1 bg-[var(--success)] hover:bg-[var(--success)]/90 text-white"
                                    onClick={() => handleAction('approved')}
                                    disabled={isActionPending}
                                >
                                    {isActionPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                                    Approve
                                </Button>
                            ) : selectedSeller.status === 'approved' ? (
                                <Button
                                    variant="outline"
                                    className="flex-1 border-[var(--error)]/20 text-[var(--error)] hover:bg-[var(--error-bg)]"
                                    onClick={() => handleAction('suspended')}
                                    disabled={isActionPending}
                                >
                                    {isActionPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Ban className="w-4 h-4 mr-2" />}
                                    Suspend
                                </Button>
                            ) : null}
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
