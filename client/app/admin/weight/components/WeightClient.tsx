"use client";
export const dynamic = "force-dynamic";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/components/ui/core/Card';
import { Button } from '@/src/components/ui/core/Button';
import { Input } from '@/src/components/ui/core/Input';
import { Badge } from '@/src/components/ui/core/Badge';
import {
    Scale,
    Search,
    Filter,
    AlertTriangle,
    CheckCircle,
    XCircle,
    Clock,
    IndianRupee,
    Package,
    TrendingUp,
    Eye,
    Download,
    RefreshCw
} from 'lucide-react';
import { cn } from '@/src/shared/utils';
import { useToast } from '@/src/components/ui/feedback/Toast';
import { formatCurrency } from '@/src/shared/utils';

// Mock weight discrepancy data for admin
const mockDiscrepancies = [
    {
        id: 'WD-001',
        awbNumber: 'DL987654321IN',
        sellerId: 'SLR-123',
        sellerName: 'Fashion Hub India',
        courier: 'Delhivery',
        declaredWeight: 500,
        actualWeight: 850,
        difference: 350,
        additionalCharge: 45,
        status: 'pending',
        createdAt: '2024-12-11',
    },
    {
        id: 'WD-002',
        awbNumber: 'XB123456789IN',
        sellerId: 'SLR-456',
        sellerName: 'ElectroMart',
        courier: 'Xpressbees',
        declaredWeight: 1000,
        actualWeight: 1500,
        difference: 500,
        additionalCharge: 65,
        status: 'disputed',
        disputeReason: 'Incorrect volumetric calculation',
        createdAt: '2024-12-10',
    },
    {
        id: 'WD-003',
        awbNumber: 'BD555666777IN',
        sellerId: 'SLR-789',
        sellerName: 'Home Decor Plus',
        courier: 'Bluedart',
        declaredWeight: 750,
        actualWeight: 1200,
        difference: 450,
        additionalCharge: 58,
        status: 'approved',
        createdAt: '2024-12-09',
    },
    {
        id: 'WD-004',
        awbNumber: 'DT999888777IN',
        sellerId: 'SLR-123',
        sellerName: 'Fashion Hub India',
        courier: 'DTDC',
        declaredWeight: 300,
        actualWeight: 500,
        difference: 200,
        additionalCharge: 28,
        status: 'rejected',
        rejectionReason: 'Courier error confirmed',
        createdAt: '2024-12-08',
    },
    {
        id: 'WD-005',
        awbNumber: 'EC111222333IN',
        sellerId: 'SLR-456',
        sellerName: 'ElectroMart',
        courier: 'Ecom Express',
        declaredWeight: 600,
        actualWeight: 950,
        difference: 350,
        additionalCharge: 42,
        status: 'pending',
        createdAt: '2024-12-12',
    },
];

const statusFilters = [
    { id: 'all', label: 'All' },
    { id: 'pending', label: 'Pending' },
    { id: 'disputed', label: 'Disputed' },
    { id: 'approved', label: 'Approved' },
    { id: 'rejected', label: 'Rejected' },
];

export function WeightClient() {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('all');
    const [selectedCourier, setSelectedCourier] = useState('All Couriers');
    const { addToast } = useToast();

    const filteredDiscrepancies = mockDiscrepancies.filter(disc => {
        const matchesSearch = disc.awbNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
            disc.sellerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            disc.sellerId.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = selectedStatus === 'all' || disc.status === selectedStatus;
        const matchesCourier = selectedCourier === 'All Couriers' || disc.courier === selectedCourier;
        return matchesSearch && matchesStatus && matchesCourier;
    });

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending':
                return <Badge variant="warning" className="gap-1"><Clock className="h-3 w-3" />Pending</Badge>;
            case 'disputed':
                return <Badge variant="info" className="gap-1"><AlertTriangle className="h-3 w-3" />Disputed</Badge>;
            case 'approved':
                return <Badge variant="success" className="gap-1"><CheckCircle className="h-3 w-3" />Approved</Badge>;
            case 'rejected':
                return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Rejected</Badge>;
            default:
                return <Badge variant="neutral">{status}</Badge>;
        }
    };

    const handleApprove = (id: string) => {
        addToast('Discrepancy approved. Charge added to seller wallet.', 'success');
    };

    const handleReject = (id: string) => {
        addToast('Discrepancy rejected. Seller notified.', 'success');
    };

    const totalPending = mockDiscrepancies.filter(d => d.status === 'pending' || d.status === 'disputed').length;
    const totalChargeable = mockDiscrepancies
        .filter(d => d.status === 'pending' || d.status === 'approved')
        .reduce((sum, d) => sum + d.additionalCharge, 0);
    const couriers = ['All Couriers', ...new Set(mockDiscrepancies.map(d => d.courier))];

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2 text-[var(--text-primary)]">
                        <Scale className="h-6 w-6 text-[var(--primary-blue)]" />
                        Weight Discrepancy Management
                    </h1>
                    <p className="text-sm mt-1 text-[var(--text-secondary)]">
                        Review and manage weight discrepancy claims from couriers
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => addToast('Syncing with couriers...', 'info')}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Sync
                    </Button>
                    <Button variant="outline" onClick={() => addToast('Exporting report...', 'info')}>
                        <Download className="h-4 w-4 mr-2" />
                        Export
                    </Button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-[var(--text-secondary)]">Total Discrepancies</p>
                                <p className="text-2xl font-bold text-[var(--text-primary)]">{mockDiscrepancies.length}</p>
                            </div>
                            <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-[var(--primary-blue-soft)]">
                                <Scale className="h-5 w-5 text-[var(--primary-blue)]" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-[var(--text-secondary)]">Pending Review</p>
                                <p className="text-2xl font-bold text-[var(--warning)]">{totalPending}</p>
                            </div>
                            <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-[var(--warning-bg)]">
                                <Clock className="h-5 w-5 text-[var(--warning)]" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-[var(--text-secondary)]">Total Chargeable</p>
                                <p className="text-2xl font-bold text-[var(--text-primary)]">{formatCurrency(totalChargeable)}</p>
                            </div>
                            <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-[var(--error-bg)]">
                                <IndianRupee className="h-5 w-5 text-[var(--error)]" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-[var(--text-secondary)]">Avg. Difference</p>
                                <p className="text-2xl font-bold text-[var(--text-primary)]">
                                    {Math.round(mockDiscrepancies.reduce((sum, d) => sum + d.difference, 0) / mockDiscrepancies.length)}g
                                </p>
                            </div>
                            <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-[var(--info-bg)]">
                                <TrendingUp className="h-5 w-5 text-[var(--info)]" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1">
                    <Input
                        placeholder="Search by AWB, Seller ID, or Name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        icon={<Search className="h-4 w-4" />}
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
                                    : "bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
                            )}
                        >
                            {filter.label}
                        </button>
                    ))}
                </div>
                <select
                    value={selectedCourier}
                    onChange={(e) => setSelectedCourier(e.target.value)}
                    className="h-10 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary-blue)]"
                >
                    {couriers.map((c) => (
                        <option key={c} value={c}>{c}</option>
                    ))}
                </select>
            </div>

            {/* Discrepancy Table */}
            <Card>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-[var(--bg-secondary)] border-b border-[var(--border-subtle)]">
                                <tr>
                                    <th className="text-left p-4 text-xs font-medium text-[var(--text-muted)] uppercase">AWB</th>
                                    <th className="text-left p-4 text-xs font-medium text-[var(--text-muted)] uppercase">Seller</th>
                                    <th className="text-left p-4 text-xs font-medium text-[var(--text-muted)] uppercase">Courier</th>
                                    <th className="text-center p-4 text-xs font-medium text-[var(--text-muted)] uppercase">Declared</th>
                                    <th className="text-center p-4 text-xs font-medium text-[var(--text-muted)] uppercase">Actual</th>
                                    <th className="text-center p-4 text-xs font-medium text-[var(--text-muted)] uppercase">Diff</th>
                                    <th className="text-right p-4 text-xs font-medium text-[var(--text-muted)] uppercase">Charge</th>
                                    <th className="text-center p-4 text-xs font-medium text-[var(--text-muted)] uppercase">Status</th>
                                    <th className="text-right p-4 text-xs font-medium text-[var(--text-muted)] uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border-subtle)]">
                                {filteredDiscrepancies.map((disc) => (
                                    <tr key={disc.id} className="hover:bg-[var(--bg-secondary)] transition-colors">
                                        <td className="p-4">
                                            <code className="font-mono text-sm font-semibold text-[var(--text-primary)]">{disc.awbNumber}</code>
                                            <p className="text-xs text-[var(--text-muted)] mt-1">{disc.createdAt}</p>
                                        </td>
                                        <td className="p-4">
                                            <p className="text-sm font-medium text-[var(--text-primary)]">{disc.sellerName}</p>
                                            <p className="text-xs text-[var(--text-muted)]">{disc.sellerId}</p>
                                        </td>
                                        <td className="p-4">
                                            <p className="text-sm text-[var(--text-primary)]">{disc.courier}</p>
                                        </td>
                                        <td className="p-4 text-center">
                                            <p className="text-sm font-medium text-[var(--text-primary)]">{disc.declaredWeight}g</p>
                                        </td>
                                        <td className="p-4 text-center">
                                            <p className="text-sm font-medium text-[var(--text-primary)]">{disc.actualWeight}g</p>
                                        </td>
                                        <td className="p-4 text-center">
                                            <p className="text-sm font-semibold text-[var(--error)]">+{disc.difference}g</p>
                                        </td>
                                        <td className="p-4 text-right">
                                            <p className="text-sm font-bold text-[var(--text-primary)]">{formatCurrency(disc.additionalCharge)}</p>
                                        </td>
                                        <td className="p-4 text-center">
                                            {getStatusBadge(disc.status)}
                                        </td>
                                        <td className="p-4">
                                            {(disc.status === 'pending' || disc.status === 'disputed') && (
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="text-xs border-[var(--success)]/20 text-[var(--success)] hover:bg-[var(--success-bg)]"
                                                        onClick={() => handleApprove(disc.id)}
                                                    >
                                                        <CheckCircle className="h-3 w-3 mr-1" />
                                                        Approve
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="text-xs border-[var(--error)]/20 text-[var(--error)] hover:bg-[var(--error-bg)]"
                                                        onClick={() => handleReject(disc.id)}
                                                    >
                                                        <XCircle className="h-3 w-3 mr-1" />
                                                        Reject
                                                    </Button>
                                                </div>
                                            )}
                                            {disc.status === 'approved' && (
                                                <p className="text-xs text-[var(--success)] text-right">Charged to seller</p>
                                            )}
                                            {disc.status === 'rejected' && (
                                                <p className="text-xs text-[var(--text-muted)] text-right">No charge</p>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* Empty State */}
            {filteredDiscrepancies.length === 0 && (
                <Card>
                    <CardContent className="py-12 text-center">
                        <CheckCircle className="h-12 w-12 mx-auto mb-4 text-[var(--success)]" />
                        <h3 className="text-lg font-medium text-[var(--text-primary)]">No discrepancies found</h3>
                        <p className="mt-1 text-[var(--text-secondary)]">All weight discrepancies have been resolved</p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
