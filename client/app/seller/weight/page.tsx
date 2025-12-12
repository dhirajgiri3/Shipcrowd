"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
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
    MessageSquare,
    FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency } from '@/lib/utils';

// Mock weight discrepancy data
const mockDiscrepancies = [
    {
        id: 'WD-001',
        awbNumber: 'DL987654321IN',
        orderId: 'ORD-2024-001234',
        courier: 'Delhivery',
        declaredWeight: 500,
        chargedWeight: 850,
        difference: 350,
        additionalCharge: 45,
        status: 'pending',
        createdAt: '2024-12-11',
        deadlineDate: '2024-12-14',
    },
    {
        id: 'WD-002',
        awbNumber: 'XB123456789IN',
        orderId: 'ORD-2024-001235',
        courier: 'Xpressbees',
        declaredWeight: 1000,
        chargedWeight: 1500,
        difference: 500,
        additionalCharge: 65,
        status: 'accepted',
        createdAt: '2024-12-10',
        deadlineDate: '2024-12-13',
    },
    {
        id: 'WD-003',
        awbNumber: 'BD555666777IN',
        orderId: 'ORD-2024-001236',
        courier: 'Bluedart',
        declaredWeight: 750,
        chargedWeight: 1200,
        difference: 450,
        additionalCharge: 58,
        status: 'disputed',
        createdAt: '2024-12-09',
        deadlineDate: '2024-12-12',
        disputeReason: 'Incorrect volumetric calculation',
    },
    {
        id: 'WD-004',
        awbNumber: 'DT999888777IN',
        orderId: 'ORD-2024-001237',
        courier: 'DTDC',
        declaredWeight: 300,
        chargedWeight: 500,
        difference: 200,
        additionalCharge: 28,
        status: 'resolved',
        createdAt: '2024-12-08',
        deadlineDate: '2024-12-11',
        resolution: 'Refunded ₹28',
    },
];

const statusFilters = [
    { id: 'all', label: 'All' },
    { id: 'pending', label: 'Pending Action' },
    { id: 'disputed', label: 'Disputed' },
    { id: 'accepted', label: 'Accepted' },
    { id: 'resolved', label: 'Resolved' },
];

export default function WeightDiscrepancyPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('all');
    const { addToast } = useToast();

    const filteredDiscrepancies = mockDiscrepancies.filter(disc => {
        const matchesSearch = disc.awbNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
            disc.orderId.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = selectedStatus === 'all' || disc.status === selectedStatus;
        return matchesSearch && matchesStatus;
    });

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending':
                return <Badge variant="warning" className="gap-1"><Clock className="h-3 w-3" />Pending</Badge>;
            case 'disputed':
                return <Badge variant="info" className="gap-1"><MessageSquare className="h-3 w-3" />Disputed</Badge>;
            case 'accepted':
                return <Badge variant="neutral" className="gap-1"><CheckCircle className="h-3 w-3" />Accepted</Badge>;
            case 'resolved':
                return <Badge variant="success" className="gap-1"><CheckCircle className="h-3 w-3" />Resolved</Badge>;
            default:
                return <Badge variant="neutral">{status}</Badge>;
        }
    };

    const handleAccept = (id: string) => {
        addToast('Weight discrepancy accepted. Amount will be deducted.', 'info');
    };

    const handleDispute = (id: string) => {
        addToast('Dispute submitted successfully!', 'success');
    };

    const totalPending = mockDiscrepancies.filter(d => d.status === 'pending').length;
    const totalAdditionalCharges = mockDiscrepancies
        .filter(d => d.status === 'pending' || d.status === 'accepted')
        .reduce((sum, d) => sum + d.additionalCharge, 0);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Scale className="h-6 w-6 text-[#2525FF]" />
                        Weight Discrepancies
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">
                        Review and manage weight difference claims
                    </p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">Total Discrepancies</p>
                                <p className="text-2xl font-bold text-gray-900">{mockDiscrepancies.length}</p>
                            </div>
                            <div className="h-10 w-10 rounded-lg bg-[#2525FF]/10 flex items-center justify-center">
                                <Scale className="h-5 w-5 text-[#2525FF]" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">Pending Action</p>
                                <p className="text-2xl font-bold text-amber-600">{totalPending}</p>
                            </div>
                            <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                                <AlertTriangle className="h-5 w-5 text-amber-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">Total Add. Charges</p>
                                <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalAdditionalCharges)}</p>
                            </div>
                            <div className="h-10 w-10 rounded-lg bg-rose-100 flex items-center justify-center">
                                <IndianRupee className="h-5 w-5 text-rose-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">Disputes Won</p>
                                <p className="text-2xl font-bold text-emerald-600">67%</p>
                            </div>
                            <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                                <TrendingUp className="h-5 w-5 text-emerald-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Info Banner */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                    <h3 className="font-medium text-amber-800">Action Required Within 48 Hours</h3>
                    <p className="text-sm text-amber-700 mt-1">
                        Pending discrepancies will be auto-accepted if no action is taken within the deadline.
                        Upload proof to dispute any incorrect weight charges.
                    </p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                    <Input
                        placeholder="Search by AWB or Order ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        icon={<Search className="h-4 w-4" />}
                    />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
                    {statusFilters.map((filter) => (
                        <button
                            key={filter.id}
                            onClick={() => setSelectedStatus(filter.id)}
                            className={cn(
                                "px-4 py-2 text-sm font-medium rounded-full transition-all whitespace-nowrap",
                                selectedStatus === filter.id
                                    ? "bg-[#2525FF] text-white"
                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            )}
                        >
                            {filter.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Discrepancy Table */}
            <Card>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase">AWB / Order</th>
                                    <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase">Courier</th>
                                    <th className="text-center p-4 text-xs font-medium text-gray-500 uppercase">Declared</th>
                                    <th className="text-center p-4 text-xs font-medium text-gray-500 uppercase">Charged</th>
                                    <th className="text-center p-4 text-xs font-medium text-gray-500 uppercase">Difference</th>
                                    <th className="text-right p-4 text-xs font-medium text-gray-500 uppercase">Add. Charge</th>
                                    <th className="text-center p-4 text-xs font-medium text-gray-500 uppercase">Status</th>
                                    <th className="text-right p-4 text-xs font-medium text-gray-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredDiscrepancies.map((disc) => (
                                    <tr key={disc.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="p-4">
                                            <code className="font-mono font-semibold text-gray-900">{disc.awbNumber}</code>
                                            <p className="text-xs text-gray-500 mt-1">{disc.orderId}</p>
                                        </td>
                                        <td className="p-4">
                                            <p className="text-sm font-medium text-gray-900">{disc.courier}</p>
                                        </td>
                                        <td className="p-4 text-center">
                                            <p className="text-sm font-medium text-gray-900">{disc.declaredWeight}g</p>
                                        </td>
                                        <td className="p-4 text-center">
                                            <p className="text-sm font-medium text-gray-900">{disc.chargedWeight}g</p>
                                        </td>
                                        <td className="p-4 text-center">
                                            <p className="text-sm font-semibold text-rose-600">+{disc.difference}g</p>
                                        </td>
                                        <td className="p-4 text-right">
                                            <p className="text-sm font-bold text-gray-900">{formatCurrency(disc.additionalCharge)}</p>
                                        </td>
                                        <td className="p-4 text-center">
                                            {getStatusBadge(disc.status)}
                                        </td>
                                        <td className="p-4">
                                            {disc.status === 'pending' && (
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="text-xs"
                                                        onClick={() => handleAccept(disc.id)}
                                                    >
                                                        <CheckCircle className="h-3 w-3 mr-1" />
                                                        Accept
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        className="text-xs bg-[#2525FF]"
                                                        onClick={() => handleDispute(disc.id)}
                                                    >
                                                        <FileText className="h-3 w-3 mr-1" />
                                                        Dispute
                                                    </Button>
                                                </div>
                                            )}
                                            {disc.status === 'disputed' && (
                                                <p className="text-xs text-gray-500 text-right">Under review</p>
                                            )}
                                            {disc.status === 'resolved' && disc.resolution && (
                                                <p className="text-xs text-emerald-600 text-right">{disc.resolution}</p>
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
                        <CheckCircle className="h-12 w-12 text-emerald-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900">No discrepancies found</h3>
                        <p className="text-gray-500 mt-1">All your shipment weights match!</p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
