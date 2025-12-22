"use client";
export const dynamic = "force-dynamic";

import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/src/shared/components/card';
import { Button } from '@/src/shared/components/button';
import { Badge } from '@/src/shared/components/badge';
import { Input } from '@/src/shared/components/Input';
import { DataTable } from '@/src/shared/components/DataTable';
import { Modal } from '@/src/shared/components/Modal';
import { useToast } from '@/src/shared/components/Toast';
import { formatCurrency, formatDate, cn } from '@/src/shared/utils';
import {
    Search,
    Building2,
    Users,
    Package,
    IndianRupee,
    Clock,
    CheckCircle2,
    XCircle,
    Filter,
    Download,
    Eye,
    Ban,
    Mail,
    Phone,
    MapPin,
    TrendingUp,
    UserPlus,
    ArrowUpRight,
    Shield
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
    },
    {
        id: 'SEL-006',
        companyName: 'SportsZone',
        ownerName: 'Neha Gupta',
        email: 'neha@sportszone.in',
        phone: '+91 43210 98765',
        city: 'Pune',
        status: 'active',
        kycStatus: 'verified',
        joinedAt: '2024-05-15',
        totalShipments: 1980,
        monthlyVolume: 198,
        walletBalance: 22000,
        successRate: 91.5,
        revenue: 298000,
        avatar: 'SZ'
    }
];

const statusTabs = [
    { id: 'all', label: 'All Sellers' },
    { id: 'active', label: 'Active' },
    { id: 'pending', label: 'Pending Approval' },
    { id: 'suspended', label: 'Suspended' }
];

type Seller = typeof mockSellers[0];

export default function SellersPage() {
    const [activeTab, setActiveTab] = useState('all');
    const [search, setSearch] = useState('');
    const [selectedSeller, setSelectedSeller] = useState<Seller | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const { addToast } = useToast();

    const filteredSellers = useMemo(() => {
        return mockSellers.filter(seller => {
            const matchesTab = activeTab === 'all' || seller.status === activeTab;
            const matchesSearch =
                seller.companyName.toLowerCase().includes(search.toLowerCase()) ||
                seller.ownerName.toLowerCase().includes(search.toLowerCase()) ||
                seller.email.toLowerCase().includes(search.toLowerCase()) ||
                seller.city.toLowerCase().includes(search.toLowerCase());
            return matchesTab && matchesSearch;
        });
    }, [activeTab, search]);

    const stats = useMemo(() => ({
        total: mockSellers.length,
        active: mockSellers.filter(s => s.status === 'active').length,
        pending: mockSellers.filter(s => s.status === 'pending').length,
        suspended: mockSellers.filter(s => s.status === 'suspended').length,
        monthlyVolume: mockSellers.reduce((acc, s) => acc + s.monthlyVolume, 0),
        totalRevenue: mockSellers.reduce((acc, s) => acc + s.revenue, 0)
    }), []);

    const tabCounts = useMemo(() => ({
        all: mockSellers.length,
        active: mockSellers.filter(s => s.status === 'active').length,
        pending: mockSellers.filter(s => s.status === 'pending').length,
        suspended: mockSellers.filter(s => s.status === 'suspended').length,
    }), []);

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

    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'active':
                return { label: 'Active', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' };
            case 'pending':
                return { label: 'Pending', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' };
            case 'suspended':
                return { label: 'Suspended', color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200' };
            default:
                return { label: status, color: 'text-gray-600', bg: 'bg-[var(--bg-secondary)]', border: 'border-gray-200' };
        }
    };

    const columns = [
        {
            header: 'Seller',
            accessorKey: 'companyName' as const,
            cell: (row: Seller) => (
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-[#2525FF]/10 text-[#2525FF] font-semibold text-sm">
                        {row.avatar}
                    </div>
                    <div>
                        <p className="font-semibold text-[var(--text-primary)]">{row.companyName}</p>
                        <p className="text-xs text-[var(--text-muted)]">{row.ownerName} • {row.city}</p>
                    </div>
                </div>
            )
        },
        {
            header: 'Status',
            accessorKey: 'status' as const,
            cell: (row: Seller) => {
                const config = getStatusConfig(row.status);
                return (
                    <div className="space-y-1">
                        <span className={cn(
                            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
                            config.bg, config.color
                        )}>
                            {row.status === 'active' && <CheckCircle2 className="h-3 w-3" />}
                            {row.status === 'pending' && <Clock className="h-3 w-3" />}
                            {row.status === 'suspended' && <XCircle className="h-3 w-3" />}
                            {config.label}
                        </span>
                        {row.kycStatus === 'verified' && (
                            <div className="flex items-center gap-1 text-xs text-emerald-600">
                                <Shield className="h-3 w-3" />
                                KYC Verified
                            </div>
                        )}
                    </div>
                );
            }
        },
        {
            header: 'Monthly Volume',
            accessorKey: 'monthlyVolume' as const,
            cell: (row: Seller) => (
                <div>
                    <p className="font-bold text-[var(--text-primary)] text-lg">{row.monthlyVolume}</p>
                    <p className="text-xs text-[var(--text-muted)]">shipments</p>
                </div>
            )
        },
        {
            header: 'Performance',
            accessorKey: 'successRate' as const,
            cell: (row: Seller) => {
                if (row.successRate === 0) {
                    return <span className="text-sm text-gray-400">No data</span>;
                }
                const isGood = row.successRate >= 90;
                return (
                    <div className="space-y-1.5 w-28">
                        <div className="flex items-center justify-between text-sm">
                            <span className={cn("font-semibold", isGood ? "text-emerald-600" : "text-amber-600")}>
                                {row.successRate}%
                            </span>
                        </div>
                        <div className="h-1.5 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                            <div
                                className={cn(
                                    "h-full rounded-full",
                                    isGood ? "bg-emerald-500" : "bg-amber-500"
                                )}
                                style={{ width: `${row.successRate}%` }}
                            />
                        </div>
                    </div>
                );
            }
        },
        {
            header: 'Wallet',
            accessorKey: 'walletBalance' as const,
            cell: (row: Seller) => (
                <span className={cn(
                    "font-semibold",
                    row.walletBalance < 0 ? "text-rose-600" :
                        row.walletBalance < 5000 ? "text-amber-600" : "text-[var(--text-primary)]"
                )}>
                    {formatCurrency(row.walletBalance)}
                </span>
            )
        },
        {
            header: 'Actions',
            accessorKey: 'id' as const,
            width: 'w-40',
            cell: (row: Seller) => (
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 px-3"
                        onClick={() => handleViewSeller(row)}
                    >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                    </Button>
                    {row.status === 'pending' && (
                        <Button
                            size="sm"
                            className="h-9 px-3 bg-emerald-600 hover:bg-emerald-700"
                            onClick={() => handleApproveSeller(row)}
                        >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Approve
                        </Button>
                    )}
                </div>
            )
        }
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-[#2525FF]/10">
                            <Building2 className="h-6 w-6 text-[#2525FF]" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Seller Management</h1>
                            <p className="text-[var(--text-muted)] text-sm">Manage all registered sellers on the platform</p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-1.5" />
                        Export
                    </Button>
                    <Button size="sm">
                        <UserPlus className="h-4 w-4 mr-1.5" />
                        Invite Seller
                    </Button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-5">
                <div className="relative overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-5">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center h-11 w-11 rounded-lg bg-[#2525FF]/10">
                            <Users className="h-5 w-5 text-[#2525FF]" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.total}</p>
                            <p className="text-xs text-[var(--text-muted)]">Total Sellers</p>
                        </div>
                    </div>
                </div>
                <div className="relative overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-5">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center h-11 w-11 rounded-lg bg-emerald-100">
                            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.active}</p>
                            <p className="text-xs text-[var(--text-muted)]">Active</p>
                        </div>
                    </div>
                </div>
                <div className="relative overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-5">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center h-11 w-11 rounded-lg bg-amber-100">
                            <Clock className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.pending}</p>
                            <p className="text-xs text-[var(--text-muted)]">Pending</p>
                        </div>
                    </div>
                </div>
                <div className="relative overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-5">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center h-11 w-11 rounded-lg bg-purple-100">
                            <Package className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.monthlyVolume.toLocaleString()}</p>
                            <p className="text-xs text-[var(--text-muted)]">Monthly Shipments</p>
                        </div>
                    </div>
                </div>
                <div className="relative overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-5">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center h-11 w-11 rounded-lg bg-green-100">
                            <IndianRupee className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-[var(--text-primary)]">{formatCurrency(stats.totalRevenue)}</p>
                            <p className="text-xs text-[var(--text-muted)]">Monthly Revenue</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {statusTabs.map((tab) => {
                    const count = tabCounts[tab.id as keyof typeof tabCounts];
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-all whitespace-nowrap",
                                isActive
                                    ? "bg-[#2525FF] border-[#2525FF] text-white"
                                    : "bg-[var(--bg-primary)] border-gray-200 text-gray-600 hover:border-gray-300"
                            )}
                        >
                            <span className="font-medium text-sm">{tab.label}</span>
                            <span className={cn(
                                "px-2 py-0.5 rounded-full text-xs font-medium",
                                isActive ? "bg-white/20 text-white" : "bg-[var(--bg-tertiary)] text-gray-600"
                            )}>
                                {count}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Search & Table */}
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] overflow-hidden">
                <div className="flex items-center gap-3 p-4 border-b border-[var(--border-subtle)]">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Search by company name, owner, email, or city..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10 h-11"
                        />
                    </div>
                    <Button variant="outline" size="sm" className="h-11">
                        <Filter className="h-4 w-4 mr-1.5" />
                        Filters
                    </Button>
                </div>

                {filteredSellers.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="flex items-center justify-center h-16 w-16 rounded-2xl bg-[var(--bg-tertiary)] mx-auto mb-4">
                            <Building2 className="h-8 w-8 text-gray-400" />
                        </div>
                        <p className="text-[var(--text-primary)] font-medium mb-1">No sellers found</p>
                        <p className="text-sm text-[var(--text-muted)]">Try adjusting your search or filters</p>
                    </div>
                ) : (
                    <DataTable columns={columns} data={filteredSellers} />
                )}
            </div>

            {/* Seller Detail Modal */}
            <Modal
                isOpen={isDetailOpen}
                onClose={() => setIsDetailOpen(false)}
                title="Seller Details"
            >
                {selectedSeller && (
                    <div className="space-y-6">
                        {/* Header */}
                        <div className="flex items-start gap-4">
                            <div className="flex items-center justify-center h-16 w-16 rounded-2xl bg-[#2525FF]/10 text-[#2525FF] font-bold text-xl">
                                {selectedSeller.avatar}
                            </div>
                            <div className="flex-1">
                                <h3 className="text-xl font-bold text-[var(--text-primary)]">{selectedSeller.companyName}</h3>
                                <p className="text-[var(--text-muted)]">{selectedSeller.ownerName}</p>
                                <div className="flex items-center gap-2 mt-2">
                                    {(() => {
                                        const config = getStatusConfig(selectedSeller.status);
                                        return (
                                            <span className={cn(
                                                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
                                                config.bg, config.color
                                            )}>
                                                {config.label}
                                            </span>
                                        );
                                    })()}
                                    {selectedSeller.kycStatus === 'verified' && (
                                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                                            <Shield className="h-3 w-3" />
                                            KYC Verified
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Contact */}
                        <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-[var(--bg-secondary)]">
                            <div className="flex items-center gap-3">
                                <Mail className="h-4 w-4 text-gray-400" />
                                <span className="text-sm">{selectedSeller.email}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <Phone className="h-4 w-4 text-gray-400" />
                                <span className="text-sm">{selectedSeller.phone}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <MapPin className="h-4 w-4 text-gray-400" />
                                <span className="text-sm">{selectedSeller.city}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <Clock className="h-4 w-4 text-gray-400" />
                                <span className="text-sm">Joined {formatDate(selectedSeller.joinedAt)}</span>
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-4">
                            <div className="text-center p-4 rounded-xl bg-blue-50 border border-blue-100">
                                <p className="text-2xl font-bold text-[var(--text-primary)]">{selectedSeller.totalShipments.toLocaleString()}</p>
                                <p className="text-xs text-[var(--text-muted)]">Total Shipments</p>
                            </div>
                            <div className="text-center p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                                <p className="text-2xl font-bold text-[var(--text-primary)]">{selectedSeller.successRate || 'N/A'}%</p>
                                <p className="text-xs text-[var(--text-muted)]">Success Rate</p>
                            </div>
                            <div className={cn(
                                "text-center p-4 rounded-xl border",
                                selectedSeller.walletBalance < 0
                                    ? "bg-rose-50 border-rose-100"
                                    : "bg-[var(--bg-secondary)] border-gray-100"
                            )}>
                                <p className={cn(
                                    "text-2xl font-bold",
                                    selectedSeller.walletBalance < 0 ? "text-rose-600" : "text-[var(--text-primary)]"
                                )}>
                                    {formatCurrency(selectedSeller.walletBalance)}
                                </p>
                                <p className="text-xs text-gray-500">Wallet Balance</p>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-3 pt-4 border-t">
                            <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
                                Close
                            </Button>
                            {selectedSeller.status === 'pending' && (
                                <Button
                                    className="bg-emerald-600 hover:bg-emerald-700"
                                    onClick={() => handleApproveSeller(selectedSeller)}
                                >
                                    <CheckCircle2 className="h-4 w-4 mr-1.5" />
                                    Approve Seller
                                </Button>
                            )}
                            {selectedSeller.status === 'active' && (
                                <Button
                                    variant="outline"
                                    className="text-rose-600 border-rose-200 hover:bg-rose-50"
                                    onClick={() => handleSuspendSeller(selectedSeller)}
                                >
                                    <Ban className="h-4 w-4 mr-1.5" />
                                    Suspend
                                </Button>
                            )}
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
