"use client";
export const dynamic = "force-dynamic";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/components/ui/core/Card';
import { Button } from '@/src/components/ui/core/Button';
import { Input } from '@/src/components/ui/core/Input';
import { Badge } from '@/src/components/ui/core/Badge';
import {
    PackageX,
    Search,
    Download,
    RefreshCw,
    RotateCcw,
    AlertTriangle,
    CheckCircle,
    Clock,
    Package,
    TrendingDown,
    Filter,
    Eye
} from 'lucide-react';
import { cn } from '@/src/shared/utils';
import { useToast } from '@/src/components/ui/feedback/Toast';
import { formatCurrency } from '@/src/shared/utils';

// Mock NDR/Returns data
const mockNDRs = [
    {
        id: 'NDR-001',
        awbNumber: 'DL987654321IN',
        sellerId: 'SEL-123',
        sellerName: 'Fashion Hub India',
        customer: 'Rahul Sharma',
        city: 'Delhi',
        reason: 'Customer not available',
        attempts: 2,
        status: 'action_pending',
        courier: 'Delhivery',
        createdAt: '2024-12-10',
        amount: 1299,
    },
    {
        id: 'NDR-002',
        awbNumber: 'XB123456789IN',
        sellerId: 'SEL-456',
        sellerName: 'ElectroMart',
        customer: 'Priya Singh',
        city: 'Bangalore',
        reason: 'Address incomplete',
        attempts: 1,
        status: 'reattempt',
        courier: 'Xpressbees',
        createdAt: '2024-12-11',
        amount: 2499,
    },
    {
        id: 'NDR-003',
        awbNumber: 'BD555666777IN',
        sellerId: 'SEL-789',
        sellerName: 'Home Decor Plus',
        customer: 'Amit Kumar',
        city: 'Mumbai',
        reason: 'Customer refused',
        attempts: 1,
        status: 'rto',
        courier: 'Bluedart',
        createdAt: '2024-12-09',
        amount: 3599,
    },
    {
        id: 'NDR-004',
        awbNumber: 'DT999888777IN',
        sellerId: 'SEL-123',
        sellerName: 'Fashion Hub India',
        customer: 'Sneha Patel',
        city: 'Ahmedabad',
        reason: 'Wrong phone number',
        attempts: 2,
        status: 'action_pending',
        courier: 'DTDC',
        createdAt: '2024-12-11',
        amount: 899,
    },
    {
        id: 'NDR-005',
        awbNumber: 'EC111222333IN',
        sellerId: 'SEL-456',
        sellerName: 'ElectroMart',
        customer: 'Vikram Reddy',
        city: 'Hyderabad',
        reason: 'Customer requested reschedule',
        attempts: 1,
        status: 'delivered',
        courier: 'Delhivery',
        createdAt: '2024-12-08',
        amount: 1899,
    },
];

const statusFilters = [
    { id: 'all', label: 'All' },
    { id: 'action_pending', label: 'Action Pending' },
    { id: 'reattempt', label: 'Reattempt' },
    { id: 'rto', label: 'RTO' },
    { id: 'delivered', label: 'Delivered' },
];

export function ReturnsClient() {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('all');
    const [selectedCourier, setSelectedCourier] = useState('All Couriers');
    const { addToast } = useToast();

    const filteredNDRs = mockNDRs.filter(ndr => {
        const matchesSearch = ndr.awbNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
            ndr.sellerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            ndr.customer.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = selectedStatus === 'all' || ndr.status === selectedStatus;
        const matchesCourier = selectedCourier === 'All Couriers' || ndr.courier === selectedCourier;
        return matchesSearch && matchesStatus && matchesCourier;
    });

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'action_pending':
                return <Badge variant="warning" className="gap-1"><AlertTriangle className="h-3 w-3" />Action Pending</Badge>;
            case 'reattempt':
                return <Badge variant="info" className="gap-1"><RefreshCw className="h-3 w-3" />Reattempt</Badge>;
            case 'rto':
                return <Badge variant="destructive" className="gap-1"><RotateCcw className="h-3 w-3" />RTO</Badge>;
            case 'delivered':
                return <Badge variant="success" className="gap-1"><CheckCircle className="h-3 w-3" />Delivered</Badge>;
            default:
                return <Badge variant="neutral">{status}</Badge>;
        }
    };

    const actionPending = mockNDRs.filter(n => n.status === 'action_pending').length;
    const rtoCount = mockNDRs.filter(n => n.status === 'rto').length;
    const rtoValue = mockNDRs.filter(n => n.status === 'rto').reduce((sum, n) => sum + n.amount, 0);
    const couriers = ['All Couriers', ...new Set(mockNDRs.map(n => n.courier))];

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                        <PackageX className="h-6 w-6 text-[var(--primary-blue)]" />
                        Returns & NDR Management
                    </h1>
                    <p className="text-[var(--text-muted)] text-sm mt-1">
                        Monitor and manage non-delivery reports across all sellers
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => addToast('Syncing NDRs...', 'info')}>
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
                                <p className="text-sm text-[var(--text-muted)]">Total NDRs</p>
                                <p className="text-2xl font-bold text-[var(--text-primary)]">{mockNDRs.length}</p>
                            </div>
                            <div className="h-10 w-10 rounded-lg bg-[var(--primary-blue-soft)] flex items-center justify-center">
                                <PackageX className="h-5 w-5 text-[var(--primary-blue)]" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-[var(--text-muted)]">Action Pending</p>
                                <p className="text-2xl font-bold text-[var(--warning)]">{actionPending}</p>
                            </div>
                            <div className="h-10 w-10 rounded-lg bg-[var(--warning-bg)] flex items-center justify-center">
                                <Clock className="h-5 w-5 text-[var(--warning)]" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-[var(--text-muted)]">RTO Count</p>
                                <p className="text-2xl font-bold text-[var(--error)]">{rtoCount}</p>
                            </div>
                            <div className="h-10 w-10 rounded-lg bg-[var(--error-bg)] flex items-center justify-center">
                                <RotateCcw className="h-5 w-5 text-[var(--error)]" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-[var(--text-muted)]">RTO Value</p>
                                <p className="text-2xl font-bold text-[var(--text-primary)]">{formatCurrency(rtoValue)}</p>
                            </div>
                            <div className="h-10 w-10 rounded-lg bg-[var(--primary-blue-soft)] flex items-center justify-center">
                                <TrendingDown className="h-5 w-5 text-[var(--primary-blue)]" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1">
                    <Input
                        placeholder="Search by AWB, Seller, or Customer..."
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
                                    : "bg-gray-100 text-gray-600 hover:bg-[var(--bg-active)]"
                            )}
                        >
                            {filter.label}
                        </button>
                    ))}
                </div>
                <select
                    value={selectedCourier}
                    onChange={(e) => setSelectedCourier(e.target.value)}
                    className="h-10 rounded-lg border border-gray-200 bg-[var(--bg-primary)] px-3 text-sm text-[var(--text-primary)] focus:outline-none focus:border-gray-300"
                >
                    {couriers.map((c) => (
                        <option key={c} value={c}>{c}</option>
                    ))}
                </select>
            </div>

            {/* NDR Table */}
            <Card>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-[var(--bg-secondary)] border-b border-gray-100">
                                <tr>
                                    <th className="text-left p-4 text-xs font-medium text-[var(--text-muted)] uppercase">AWB</th>
                                    <th className="text-left p-4 text-xs font-medium text-[var(--text-muted)] uppercase">Seller</th>
                                    <th className="text-left p-4 text-xs font-medium text-[var(--text-muted)] uppercase">Customer</th>
                                    <th className="text-left p-4 text-xs font-medium text-[var(--text-muted)] uppercase">Reason</th>
                                    <th className="text-center p-4 text-xs font-medium text-[var(--text-muted)] uppercase">Attempts</th>
                                    <th className="text-left p-4 text-xs font-medium text-[var(--text-muted)] uppercase">Courier</th>
                                    <th className="text-center p-4 text-xs font-medium text-[var(--text-muted)] uppercase">Status</th>
                                    <th className="text-right p-4 text-xs font-medium text-[var(--text-muted)] uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredNDRs.map((ndr) => (
                                    <tr key={ndr.id} className="hover:bg-[var(--bg-secondary)] transition-colors">
                                        <td className="p-4">
                                            <code className="font-mono text-sm font-semibold text-[var(--text-primary)]">{ndr.awbNumber}</code>
                                            <p className="text-xs text-[var(--text-muted)] mt-1">{ndr.createdAt}</p>
                                        </td>
                                        <td className="p-4">
                                            <p className="text-sm font-medium text-[var(--text-primary)]">{ndr.sellerName}</p>
                                            <p className="text-xs text-[var(--text-muted)]">{ndr.sellerId}</p>
                                        </td>
                                        <td className="p-4">
                                            <p className="text-sm text-[var(--text-primary)]">{ndr.customer}</p>
                                            <p className="text-xs text-[var(--text-muted)]">{ndr.city}</p>
                                        </td>
                                        <td className="p-4">
                                            <p className="text-sm text-[var(--text-primary)] max-w-[200px] truncate">{ndr.reason}</p>
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className="text-sm font-medium text-[var(--text-primary)]">{ndr.attempts}/3</span>
                                        </td>
                                        <td className="p-4">
                                            <p className="text-sm text-[var(--text-primary)]">{ndr.courier}</p>
                                        </td>
                                        <td className="p-4 text-center">
                                            {getStatusBadge(ndr.status)}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex justify-end">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => addToast('Opening details...', 'info')}
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* Empty State */}
            {filteredNDRs.length === 0 && (
                <Card>
                    <CardContent className="py-12 text-center">
                        <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-[var(--text-primary)]">No NDRs found</h3>
                        <p className="text-[var(--text-muted)] mt-1">All shipments are on track!</p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
