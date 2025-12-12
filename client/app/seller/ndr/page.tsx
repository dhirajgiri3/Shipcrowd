"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import {
    PackageX,
    Search,
    Filter,
    Phone,
    RefreshCw,
    RotateCcw,
    MessageSquare,
    Clock,
    AlertTriangle,
    CheckCircle,
    XCircle,
    MapPin,
    Calendar,
    ArrowRight,
    X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency } from '@/lib/utils';

// Mock NDR data
const mockNDRs = [
    {
        id: 'NDR-001',
        awbNumber: 'DL987654321IN',
        orderId: 'ORD-2024-001234',
        customer: { name: 'Rahul Sharma', phone: '+91 98765 43210' },
        address: 'Green Park Extension, New Delhi - 110016',
        reason: 'Customer not available',
        reasonCode: 'CNA',
        attempts: 2,
        maxAttempts: 3,
        lastAttemptDate: '2024-12-10',
        courier: 'Delhivery',
        status: 'action_required',
        createdAt: '2024-12-09',
        codAmount: 1299,
        paymentMode: 'COD',
    },
    {
        id: 'NDR-002',
        awbNumber: 'XB123456789IN',
        orderId: 'ORD-2024-001235',
        customer: { name: 'Priya Singh', phone: '+91 87654 32109' },
        address: 'Koramangala, Bangalore - 560034',
        reason: 'Address incomplete',
        reasonCode: 'AIC',
        attempts: 1,
        maxAttempts: 3,
        lastAttemptDate: '2024-12-11',
        courier: 'Xpressbees',
        status: 'action_required',
        createdAt: '2024-12-11',
        codAmount: 0,
        paymentMode: 'Prepaid',
    },
    {
        id: 'NDR-003',
        awbNumber: 'BD555666777IN',
        orderId: 'ORD-2024-001236',
        customer: { name: 'Amit Kumar', phone: '+91 76543 21098' },
        address: 'Andheri West, Mumbai - 400053',
        reason: 'Customer refused delivery',
        reasonCode: 'CRD',
        attempts: 1,
        maxAttempts: 3,
        lastAttemptDate: '2024-12-10',
        courier: 'Bluedart',
        status: 'rto_initiated',
        createdAt: '2024-12-09',
        codAmount: 2499,
        paymentMode: 'COD',
    },
    {
        id: 'NDR-004',
        awbNumber: 'DT999888777IN',
        orderId: 'ORD-2024-001237',
        customer: { name: 'Sneha Patel', phone: '+91 65432 10987' },
        address: 'Satellite, Ahmedabad - 380015',
        reason: 'Wrong phone number',
        reasonCode: 'WPN',
        attempts: 2,
        maxAttempts: 3,
        lastAttemptDate: '2024-12-11',
        courier: 'DTDC',
        status: 'action_required',
        createdAt: '2024-12-10',
        codAmount: 799,
        paymentMode: 'COD',
    },
    {
        id: 'NDR-005',
        awbNumber: 'EC111222333IN',
        orderId: 'ORD-2024-001238',
        customer: { name: 'Vikram Reddy', phone: '+91 54321 09876' },
        address: 'Jubilee Hills, Hyderabad - 500033',
        reason: 'Customer requested reschedule',
        reasonCode: 'CRR',
        attempts: 1,
        maxAttempts: 3,
        lastAttemptDate: '2024-12-11',
        courier: 'Delhivery',
        status: 'reattempt_scheduled',
        createdAt: '2024-12-11',
        codAmount: 1899,
        paymentMode: 'COD',
    },
];

const statusFilters = [
    { id: 'all', label: 'All NDRs' },
    { id: 'action_required', label: 'Action Required' },
    { id: 'reattempt_scheduled', label: 'Reattempt Scheduled' },
    { id: 'rto_initiated', label: 'RTO Initiated' },
];

export default function NDRManagementPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('all');
    const [selectedNDR, setSelectedNDR] = useState<typeof mockNDRs[0] | null>(null);
    const [showActionModal, setShowActionModal] = useState(false);
    const { addToast } = useToast();

    const filteredNDRs = mockNDRs.filter(ndr => {
        const matchesSearch = ndr.awbNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
            ndr.customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            ndr.orderId.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = selectedStatus === 'all' || ndr.status === selectedStatus;
        return matchesSearch && matchesStatus;
    });

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'action_required':
                return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />Action Required</Badge>;
            case 'reattempt_scheduled':
                return <Badge variant="info" className="gap-1"><RefreshCw className="h-3 w-3" />Reattempt Scheduled</Badge>;
            case 'rto_initiated':
                return <Badge variant="warning" className="gap-1"><RotateCcw className="h-3 w-3" />RTO Initiated</Badge>;
            default:
                return <Badge variant="neutral">{status}</Badge>;
        }
    };

    const handleAction = (action: string) => {
        setShowActionModal(false);
        addToast(`Action "${action}" submitted successfully!`, 'success');
    };

    const actionRequiredCount = mockNDRs.filter(n => n.status === 'action_required').length;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <PackageX className="h-6 w-6 text-[#2525FF]" />
                        NDR Management
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">
                        Manage non-delivery reports and take actions
                    </p>
                </div>
                {actionRequiredCount > 0 && (
                    <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 rounded-lg px-4 py-2">
                        <AlertTriangle className="h-4 w-4 text-rose-600" />
                        <span className="text-sm font-medium text-rose-700">
                            {actionRequiredCount} NDR{actionRequiredCount > 1 ? 's' : ''} require action
                        </span>
                    </div>
                )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">Total NDRs</p>
                                <p className="text-2xl font-bold text-gray-900">{mockNDRs.length}</p>
                            </div>
                            <div className="h-10 w-10 rounded-lg bg-[#2525FF]/10 flex items-center justify-center">
                                <PackageX className="h-5 w-5 text-[#2525FF]" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">Action Required</p>
                                <p className="text-2xl font-bold text-rose-600">{actionRequiredCount}</p>
                            </div>
                            <div className="h-10 w-10 rounded-lg bg-rose-100 flex items-center justify-center">
                                <AlertTriangle className="h-5 w-5 text-rose-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">Reattempt Scheduled</p>
                                <p className="text-2xl font-bold text-cyan-600">
                                    {mockNDRs.filter(n => n.status === 'reattempt_scheduled').length}
                                </p>
                            </div>
                            <div className="h-10 w-10 rounded-lg bg-cyan-100 flex items-center justify-center">
                                <RefreshCw className="h-5 w-5 text-cyan-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">RTO Initiated</p>
                                <p className="text-2xl font-bold text-amber-600">
                                    {mockNDRs.filter(n => n.status === 'rto_initiated').length}
                                </p>
                            </div>
                            <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                                <RotateCcw className="h-5 w-5 text-amber-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                    <Input
                        placeholder="Search by AWB, Order ID, or Customer..."
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

            {/* NDR List */}
            <div className="space-y-4">
                {filteredNDRs.map((ndr) => (
                    <Card
                        key={ndr.id}
                        className={cn(
                            "hover:shadow-lg transition-all cursor-pointer border-l-4",
                            ndr.status === 'action_required' && "border-l-rose-500",
                            ndr.status === 'reattempt_scheduled' && "border-l-cyan-500",
                            ndr.status === 'rto_initiated' && "border-l-amber-500"
                        )}
                        onClick={() => { setSelectedNDR(ndr); setShowActionModal(true); }}
                    >
                        <CardContent className="p-5">
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                <div className="flex-1 space-y-2">
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <code className="font-mono font-semibold text-gray-900">{ndr.awbNumber}</code>
                                        {getStatusBadge(ndr.status)}
                                        <Badge variant={ndr.paymentMode === 'COD' ? 'warning' : 'success'} className="text-xs">
                                            {ndr.paymentMode}
                                        </Badge>
                                    </div>

                                    <div className="flex items-center gap-4 text-sm text-gray-600">
                                        <span className="flex items-center gap-1">
                                            <Phone className="h-3.5 w-3.5" />
                                            {ndr.customer.name}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <MapPin className="h-3.5 w-3.5" />
                                            {ndr.address.split(',').slice(-1)[0].trim()}
                                        </span>
                                    </div>

                                    <div className="bg-rose-50 rounded-lg px-3 py-2 inline-block">
                                        <p className="text-sm text-rose-700">
                                            <span className="font-medium">Reason:</span> {ndr.reason}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-6">
                                    <div className="text-center">
                                        <p className="text-xs text-gray-400">Attempts</p>
                                        <p className="text-lg font-bold text-gray-900">{ndr.attempts}/{ndr.maxAttempts}</p>
                                    </div>
                                    {ndr.codAmount > 0 && (
                                        <div className="text-center">
                                            <p className="text-xs text-gray-400">COD Amount</p>
                                            <p className="text-lg font-bold text-gray-900">{formatCurrency(ndr.codAmount)}</p>
                                        </div>
                                    )}
                                    <div className="text-center">
                                        <p className="text-xs text-gray-400">Courier</p>
                                        <p className="text-sm font-medium text-gray-900">{ndr.courier}</p>
                                    </div>
                                    {ndr.status === 'action_required' && (
                                        <Button size="sm" className="bg-rose-600 hover:bg-rose-700">
                                            Take Action
                                            <ArrowRight className="h-4 w-4 ml-1" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Action Modal */}
            {showActionModal && selectedNDR && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <Card className="w-full max-w-lg">
                        <CardHeader className="flex flex-row items-start justify-between">
                            <div>
                                <CardTitle className="text-lg">Take NDR Action</CardTitle>
                                <CardDescription>
                                    {selectedNDR.awbNumber} • {selectedNDR.customer.name}
                                </CardDescription>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setShowActionModal(false)}>
                                <X className="h-5 w-5" />
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="bg-gray-50 rounded-lg p-4">
                                <p className="text-sm text-gray-500">NDR Reason</p>
                                <p className="font-medium text-gray-900">{selectedNDR.reason}</p>
                                <p className="text-xs text-gray-400 mt-1">
                                    Last attempt: {selectedNDR.lastAttemptDate} • Attempt {selectedNDR.attempts} of {selectedNDR.maxAttempts}
                                </p>
                            </div>

                            <div className="space-y-2">
                                <p className="text-sm font-medium text-gray-700">Select Action</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <Button
                                        variant="outline"
                                        className="h-auto py-4 flex-col gap-2"
                                        onClick={() => handleAction('reattempt')}
                                    >
                                        <RefreshCw className="h-5 w-5 text-cyan-600" />
                                        <span>Reattempt Delivery</span>
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="h-auto py-4 flex-col gap-2"
                                        onClick={() => handleAction('rto')}
                                    >
                                        <RotateCcw className="h-5 w-5 text-amber-600" />
                                        <span>Initiate RTO</span>
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="h-auto py-4 flex-col gap-2"
                                        onClick={() => handleAction('update_address')}
                                    >
                                        <MapPin className="h-5 w-5 text-[#2525FF]" />
                                        <span>Update Address</span>
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="h-auto py-4 flex-col gap-2"
                                        onClick={() => handleAction('update_phone')}
                                    >
                                        <Phone className="h-5 w-5 text-emerald-600" />
                                        <span>Update Phone</span>
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Remarks (Optional)</label>
                                <textarea
                                    className="flex min-h-[80px] w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-gray-300 resize-none"
                                    placeholder="Add any additional instructions..."
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Empty State */}
            {filteredNDRs.length === 0 && (
                <Card>
                    <CardContent className="py-12 text-center">
                        <CheckCircle className="h-12 w-12 text-emerald-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900">No NDRs found</h3>
                        <p className="text-gray-500 mt-1">All your deliveries are on track!</p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
