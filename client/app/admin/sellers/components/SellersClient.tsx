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
    ArrowUpRight
} from 'lucide-react';

// Mock sellers data
const mockSellers = [
    {
        id: 'SEL-001',
        companyName: 'TechGadgets Inc.',
        ownerName: 'Rahul Sharma',
        email: 'rahul@techgadgets.com',
        phone: '+91 98765 43210',
        city: 'Mumbai',
        status: 'active',
        kycStatus: 'verified',
        joinedAt: '2024-01-15',
        totalShipments: 3420,
        monthlyVolume: 342,
        walletBalance: 45000,
        successRate: 94.5,
        revenue: 485000,
        avatar: 'TG'
    },
    {
        id: 'SEL-002',
        companyName: 'Fashion Hub',
        ownerName: 'Priya Patel',
        email: 'priya@fashionhub.in',
        phone: '+91 87654 32109',
        city: 'Delhi',
        status: 'active',
        kycStatus: 'verified',
        joinedAt: '2024-02-20',
        totalShipments: 2890,
        monthlyVolume: 289,
        walletBalance: 32000,
        successRate: 92.1,
        revenue: 412000,
        avatar: 'FH'
    },
    {
        id: 'SEL-003',
        companyName: 'HomeDecor Plus',
        ownerName: 'Amit Singh',
        email: 'amit@homedecorplus.com',
        phone: '+91 76543 21098',
        city: 'Bangalore',
        status: 'active',
        kycStatus: 'verified',
        joinedAt: '2024-03-10',
        totalShipments: 2450,
        monthlyVolume: 245,
        walletBalance: 28500,
        successRate: 96.3,
        revenue: 356000,
        avatar: 'HD'
    },
    {
        id: 'SEL-004',
        companyName: 'StartupStore',
        ownerName: 'Kavita Reddy',
        email: 'kavita@startupstore.in',
        phone: '+91 65432 10987',
        city: 'Hyderabad',
        status: 'pending',
        kycStatus: 'pending',
        joinedAt: '2024-12-10',
        totalShipments: 0,
        monthlyVolume: 0,
        walletBalance: 1000,
        successRate: 0,
        revenue: 0,
        avatar: 'SS'
    },
    {
        id: 'SEL-005',
        companyName: 'BookWorld',
        ownerName: 'Vikram Iyer',
        email: 'vikram@bookworld.com',
        phone: '+91 54321 09876',
        city: 'Chennai',
        status: 'suspended',
        kycStatus: 'verified',
        joinedAt: '2024-04-05',
        totalShipments: 1760,
        monthlyVolume: 0,
        walletBalance: -5000,
        successRate: 88.2,
        revenue: 245000,
        avatar: 'BW'
    }
];

const statusTabs = [
    { id: 'all', label: 'All Sellers' },
    { id: 'active', label: 'Active' },
    { id: 'pending', label: 'Pending Approval' },
    { id: 'suspended', label: 'Suspended' }
];

type Seller = typeof mockSellers[0];

export function SellersClient() {
    const [activeTab, setActiveTab] = useState('all');
    const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
    const [search, setSearch] = useState('');
    const [selectedSeller, setSelectedSeller] = useState<Seller | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const { addToast } = useToast();

    // Derived state
    const filteredSellers = useMemo(() => {
        return mockSellers.filter(seller => {
            const matchesTab = activeTab === 'all' || seller.status === activeTab;
            const matchesSearch =
                seller.companyName.toLowerCase().includes(search.toLowerCase()) ||
                seller.ownerName.toLowerCase().includes(search.toLowerCase()) ||
                seller.email.toLowerCase().includes(search.toLowerCase());
            return matchesTab && matchesSearch;
        });
    }, [activeTab, search]);

    const stats = useMemo(() => ({
        total: mockSellers.length,
        active: mockSellers.filter(s => s.status === 'active').length,
        pending: mockSellers.filter(s => s.status === 'pending').length,
        monthlyVolume: mockSellers.reduce((acc, s) => acc + s.monthlyVolume, 0),
        totalRevenue: mockSellers.reduce((acc, s) => acc + s.revenue, 0)
    }), []);

    // Handlers
    const handleViewSeller = (seller: Seller) => {
        setSelectedSeller(seller);
        setIsDetailOpen(true);
    };

    const handleApproveSeller = (seller: Seller) => {
        addToast(`Approved ${seller.companyName}`, 'success');
        setIsDetailOpen(false);
    };

    const handleSuspendSeller = (seller: Seller) => {
        addToast(`Suspended ${seller.companyName}`, 'warning');
        setIsDetailOpen(false);
    };

    // Columns config
    const columns = [
        {
            header: 'Company',
            accessorKey: 'companyName' as const,
            cell: (row: Seller) => (
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-[var(--primary-blue-soft)] text-[var(--primary-blue)] flex items-center justify-center font-bold text-sm">
                        {row.avatar}
                    </div>
                    <div>
                        <p className="font-semibold text-[var(--text-primary)]">{row.companyName}</p>
                        <p className="text-xs text-[var(--text-muted)]">{row.city}</p>
                    </div>
                </div>
            )
        },
        {
            header: 'Owner',
            accessorKey: 'ownerName' as const,
            cell: (row: Seller) => (
                <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">{row.ownerName}</p>
                    <p className="text-xs text-[var(--text-muted)]">{row.email}</p>
                </div>
            )
        },
        {
            header: 'Status',
            accessorKey: 'status' as const,
            cell: (row: Seller) => (
                <div className="flex flex-col gap-1">
                    <span className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold w-fit",
                        row.status === 'active' ? "bg-[var(--success-bg)] text-[var(--success)]" :
                            row.status === 'pending' ? "bg-[var(--warning-bg)] text-[var(--warning)]" :
                                "bg-[var(--error-bg)] text-[var(--error)]"
                    )}>
                        <span className={cn("w-1.5 h-1.5 rounded-full",
                            row.status === 'active' ? "bg-[var(--success)]" :
                                row.status === 'pending' ? "bg-[var(--warning)]" : "bg-[var(--error)]"
                        )} />
                        {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
                    </span>
                    {row.kycStatus === 'verified' && (
                        <span className="text-[10px] text-[var(--success)] flex items-center gap-1 px-1">
                            <Shield className="w-3 h-3" /> Verified
                        </span>
                    )}
                </div>
            )
        },
        {
            header: 'Performance',
            accessorKey: 'successRate' as const,
            cell: (row: Seller) => (
                <div className="w-24">
                    <div className="flex justify-between text-xs mb-1">
                        <span className="text-[var(--text-muted)]">Success</span>
                        <span className={cn("font-bold", row.successRate > 90 ? "text-[var(--success)]" : "text-[var(--warning)]")}>{row.successRate}%</span>
                    </div>
                    <div className="h-1 w-full bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                        <div className={cn("h-full rounded-full", row.successRate > 90 ? "bg-[var(--success)]" : "bg-[var(--warning)]")} style={{ width: `${row.successRate}%` }} />
                    </div>
                </div>
            )
        },
        {
            header: 'Wallet',
            accessorKey: 'walletBalance' as const,
            cell: (row: Seller) => (
                <span className={cn(
                    "font-bold font-mono",
                    row.walletBalance < 0 ? "text-[var(--error)]" : "text-[var(--text-primary)]"
                )}>
                    {formatCurrency(row.walletBalance)}
                </span>
            )
        },
        {
            header: 'Actions',
            accessorKey: 'id' as const,
            cell: (row: Seller) => (
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
            {viewMode === 'table' ? (
                <div className="bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-subtle)] overflow-hidden">
                    <DataTable columns={columns} data={filteredSellers} />
                </div>
            ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <AnimatePresence>
                        {filteredSellers.map((seller) => (
                            <motion.div
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                key={seller.id}
                                onClick={() => handleViewSeller(seller)}
                                className="group relative p-6 bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-subtle)] hover:border-[var(--primary-blue)]/50 hover:shadow-xl transition-all cursor-pointer overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 p-4">
                                    <button className="p-2 rounded-full hover:bg-[var(--bg-secondary)] text-[var(--text-muted)] transition-colors">
                                        <MoreHorizontal className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-16 h-16 rounded-2xl bg-[var(--primary-blue-soft)] flex items-center justify-center text-xl font-bold text-[var(--primary-blue)]">
                                        {seller.avatar}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-[var(--text-primary)] text-lg">{seller.companyName}</h3>
                                        <p className="text-sm text-[var(--text-muted)] flex items-center gap-1">
                                            <MapPin className="w-3 h-3" /> {seller.city}
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <div className="p-3 rounded-xl bg-[var(--bg-secondary)]">
                                        <p className="text-xs text-[var(--text-muted)]">Wallet</p>
                                        <p className="font-bold text-[var(--text-primary)]">{formatCurrency(seller.walletBalance)}</p>
                                    </div>
                                    <div className="p-3 rounded-xl bg-[var(--bg-secondary)]">
                                        <p className="text-xs text-[var(--text-muted)]">Volume</p>
                                        <p className="font-bold text-[var(--text-primary)]">{seller.monthlyVolume}</p>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between mt-auto pt-4 border-t border-[var(--border-subtle)]">
                                    <span className={cn(
                                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold",
                                        seller.status === 'active' ? "bg-[var(--success-bg)] text-[var(--success)]" :
                                            seller.status === 'pending' ? "bg-[var(--warning-bg)] text-[var(--warning)]" :
                                                "bg-[var(--error-bg)] text-[var(--error)]"
                                    )}>
                                        <span className={cn("w-1.5 h-1.5 rounded-full",
                                            seller.status === 'active' ? "bg-[var(--success)]" :
                                                seller.status === 'pending' ? "bg-[var(--warning)]" : "bg-[var(--error)]"
                                        )} />
                                        {seller.status.charAt(0).toUpperCase() + seller.status.slice(1)}
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
                title={selectedSeller?.companyName || 'Seller Details'}
            >
                {selectedSeller && (
                    <div className="space-y-6">
                        {/* Profile Section */}
                        <div className="flex items-center gap-4 p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
                            <div className="w-16 h-16 rounded-full bg-[var(--primary-blue)] text-white flex items-center justify-center text-xl font-bold">
                                {selectedSeller.avatar}
                            </div>
                            <div>
                                <h3 className="font-bold text-[var(--text-primary)]">{selectedSeller.ownerName}</h3>
                                <div className="flex flex-col text-sm text-[var(--text-secondary)] mt-1 gap-0.5">
                                    <div className="flex items-center gap-2">
                                        <Mail className="w-3.5 h-3.5" /> {selectedSeller.email}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Phone className="w-3.5 h-3.5" /> {selectedSeller.phone}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="flex gap-3">
                            <Button className="flex-1 bg-[var(--primary-blue)] hover:bg-[var(--primary-blue-deep)] text-white">
                                Login as Seller
                            </Button>
                            {selectedSeller.status === 'pending' ? (
                                <Button
                                    className="flex-1 bg-[var(--success)] hover:bg-[var(--success)]/90 text-white"
                                    onClick={() => handleApproveSeller(selectedSeller)}
                                >
                                    <CheckCircle2 className="w-4 h-4 mr-2" /> Approve
                                </Button>
                            ) : (
                                <Button
                                    variant="outline"
                                    className="flex-1 border-[var(--error)]/20 text-[var(--error)] hover:bg-[var(--error-bg)]"
                                    onClick={() => handleSuspendSeller(selectedSeller)}
                                >
                                    <Ban className="w-4 h-4 mr-2" /> Suspend
                                </Button>
                            )}
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
