"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import {
    Receipt,
    Search,
    Download,
    Filter,
    IndianRupee,
    Users,
    TrendingUp,
    AlertCircle,
    CheckCircle,
    Clock,
    XCircle,
    Plus,
    X,
    Calendar
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency } from '@/lib/utils';

// Mock recharges data (Admin view of all seller recharges)
const mockRecharges = [
    {
        id: 'RCH-001',
        sellerId: 'SLR-123',
        sellerName: 'Fashion Hub India',
        amount: 25000,
        paymentMethod: 'UPI',
        transactionId: 'PAY_123456789',
        status: 'success',
        date: '2024-12-11 14:32',
        couponUsed: 'NEWUSER50',
        discount: 500,
    },
    {
        id: 'RCH-002',
        sellerId: 'SLR-456',
        sellerName: 'ElectroMart',
        amount: 50000,
        paymentMethod: 'Net Banking',
        transactionId: 'PAY_987654321',
        status: 'success',
        date: '2024-12-11 11:15',
        couponUsed: null,
        discount: 0,
    },
    {
        id: 'RCH-003',
        sellerId: 'SLR-789',
        sellerName: 'HomeDecor Plus',
        amount: 10000,
        paymentMethod: 'Credit Card',
        transactionId: 'PAY_555666777',
        status: 'pending',
        date: '2024-12-11 09:45',
        couponUsed: null,
        discount: 0,
    },
    {
        id: 'RCH-004',
        sellerId: 'SLR-234',
        sellerName: 'Gadget Galaxy',
        amount: 15000,
        paymentMethod: 'UPI',
        transactionId: 'PAY_111222333',
        status: 'failed',
        date: '2024-12-10 18:22',
        couponUsed: 'FLAT200',
        discount: 200,
    },
    {
        id: 'RCH-005',
        sellerId: 'SLR-567',
        sellerName: 'BookWorm Store',
        amount: 5000,
        paymentMethod: 'Debit Card',
        transactionId: 'PAY_444555666',
        status: 'success',
        date: '2024-12-10 15:08',
        couponUsed: null,
        discount: 0,
    },
];

// Mock billing entries
const mockBillingEntries = [
    {
        id: 'BIL-001',
        sellerId: 'SLR-123',
        sellerName: 'Fashion Hub India',
        type: 'manual_credit',
        amount: 5000,
        reason: 'Compensation for delayed COD',
        addedBy: 'Admin',
        date: '2024-12-10',
    },
    {
        id: 'BIL-002',
        sellerId: 'SLR-456',
        sellerName: 'ElectroMart',
        type: 'manual_debit',
        amount: -1500,
        reason: 'Weight discrepancy adjustment',
        addedBy: 'Admin',
        date: '2024-12-09',
    },
];

export default function BillingPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStatus, setSelectedStatus] = useState<'all' | 'success' | 'pending' | 'failed'>('all');
    const [activeTab, setActiveTab] = useState<'recharges' | 'manual'>('recharges');
    const [showAddManual, setShowAddManual] = useState(false);
    const { addToast } = useToast();

    const filteredRecharges = mockRecharges.filter(recharge => {
        const matchesSearch = recharge.sellerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            recharge.transactionId.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = selectedStatus === 'all' || recharge.status === selectedStatus;
        return matchesSearch && matchesStatus;
    });

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'success':
                return <Badge variant="success" className="gap-1"><CheckCircle className="h-3 w-3" />Success</Badge>;
            case 'pending':
                return <Badge variant="warning" className="gap-1"><Clock className="h-3 w-3" />Pending</Badge>;
            case 'failed':
                return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Failed</Badge>;
            default:
                return <Badge variant="neutral">{status}</Badge>;
        }
    };

    const totalRecharges = mockRecharges.filter(r => r.status === 'success').reduce((sum, r) => sum + r.amount, 0);
    const pendingRecharges = mockRecharges.filter(r => r.status === 'pending').reduce((sum, r) => sum + r.amount, 0);
    const failedRecharges = mockRecharges.filter(r => r.status === 'failed').length;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                        <Receipt className="h-6 w-6" style={{ color: 'var(--primary-blue)' }} />
                        Billing & Recharges
                    </h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                        Manage seller recharges and manual billing entries
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => addToast('Downloading report...', 'info')}>
                        <Download className="h-4 w-4 mr-2" />
                        Export
                    </Button>
                    <Button onClick={() => setShowAddManual(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Manual Entry
                    </Button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Total Recharges (Today)</p>
                                <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(totalRecharges)}</p>
                            </div>
                            <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ background: 'var(--success-bg)' }}>
                                <IndianRupee className="h-5 w-5" style={{ color: 'var(--success)' }} />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Pending</p>
                                <p className="text-2xl font-bold" style={{ color: 'var(--warning)' }}>{formatCurrency(pendingRecharges)}</p>
                            </div>
                            <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ background: 'var(--warning-bg)' }}>
                                <Clock className="h-5 w-5" style={{ color: 'var(--warning)' }} />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Failed Transactions</p>
                                <p className="text-2xl font-bold" style={{ color: 'var(--error)' }}>{failedRecharges}</p>
                            </div>
                            <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ background: 'var(--error-bg)' }}>
                                <AlertCircle className="h-5 w-5" style={{ color: 'var(--error)' }} />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Unique Sellers</p>
                                <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                                    {new Set(mockRecharges.map(r => r.sellerId)).size}
                                </p>
                            </div>
                            <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ background: 'var(--primary-blue-soft)' }}>
                                <Users className="h-5 w-5" style={{ color: 'var(--primary-blue)' }} />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Manual Entry Form */}
            {showAddManual && (
                <Card className="border-[#2525FF]/20 bg-[#2525FF]/5">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-lg">Add Manual Billing Entry</CardTitle>
                            <CardDescription>Credit or debit seller wallets manually</CardDescription>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => setShowAddManual(false)}>
                            <X className="h-4 w-4" />
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Seller *</label>
                                <select className="flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-gray-300">
                                    <option value="">Select Seller</option>
                                    <option value="slr-123">Fashion Hub India (SLR-123)</option>
                                    <option value="slr-456">ElectroMart (SLR-456)</option>
                                    <option value="slr-789">HomeDecor Plus (SLR-789)</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Type *</label>
                                <select className="flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-gray-300">
                                    <option value="credit">Credit (Add Money)</option>
                                    <option value="debit">Debit (Deduct Money)</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Amount (₹) *</label>
                                <Input type="number" placeholder="Enter amount" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Reason *</label>
                            <Input placeholder="e.g., Compensation for delayed COD remittance" />
                        </div>
                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                            <Button variant="outline" onClick={() => setShowAddManual(false)}>Cancel</Button>
                            <Button onClick={() => {
                                addToast('Manual entry added successfully!', 'success');
                                setShowAddManual(false);
                            }}>
                                Submit Entry
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Tabs */}
            <div className="flex items-center gap-2 border-b pb-4" style={{ borderColor: 'var(--border-subtle)' }}>
                <button
                    onClick={() => setActiveTab('recharges')}
                    className="px-4 py-2 text-sm font-medium rounded-lg transition-all"
                    style={{
                        background: activeTab === 'recharges' ? 'var(--primary-blue)' : 'transparent',
                        color: activeTab === 'recharges' ? 'var(--text-inverse)' : 'var(--text-secondary)'
                    }}
                >
                    Seller Recharges
                </button>
                <button
                    onClick={() => setActiveTab('manual')}
                    className="px-4 py-2 text-sm font-medium rounded-lg transition-all"
                    style={{
                        background: activeTab === 'manual' ? 'var(--primary-blue)' : 'transparent',
                        color: activeTab === 'manual' ? 'var(--text-inverse)' : 'var(--text-secondary)'
                    }}
                >
                    Manual Entries
                </button>
            </div>

            {/* Recharges Tab */}
            {activeTab === 'recharges' && (
                <>
                    {/* Filters */}
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1">
                            <Input
                                placeholder="Search by seller name or transaction ID..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                icon={<Search className="h-4 w-4" />}
                            />
                        </div>
                        <div className="flex gap-2">
                            {(['all', 'success', 'pending', 'failed'] as const).map((status) => (
                                <button
                                    key={status}
                                    onClick={() => setSelectedStatus(status)}
                                    className="px-4 py-2 text-sm font-medium rounded-full transition-all capitalize"
                                    style={{
                                        background: selectedStatus === status ? 'var(--primary-blue)' : 'var(--bg-secondary)',
                                        color: selectedStatus === status ? 'var(--text-inverse)' : 'var(--text-secondary)'
                                    }}
                                >
                                    {status}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Recharges Table */}
                    <Card>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50 border-b border-gray-100">
                                        <tr>
                                            <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase">Seller</th>
                                            <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase">Amount</th>
                                            <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase">Payment</th>
                                            <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase">Coupon</th>
                                            <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase">Date</th>
                                            <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {filteredRecharges.map((recharge) => (
                                            <tr key={recharge.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="p-4">
                                                    <p className="font-medium text-gray-900">{recharge.sellerName}</p>
                                                    <p className="text-xs text-gray-500">{recharge.sellerId}</p>
                                                </td>
                                                <td className="p-4">
                                                    <p className="font-semibold text-gray-900">{formatCurrency(recharge.amount)}</p>
                                                    {recharge.discount > 0 && (
                                                        <p className="text-xs text-emerald-600">-{formatCurrency(recharge.discount)} discount</p>
                                                    )}
                                                </td>
                                                <td className="p-4">
                                                    <p className="text-sm text-gray-900">{recharge.paymentMethod}</p>
                                                    <p className="text-xs text-gray-500 font-mono">{recharge.transactionId}</p>
                                                </td>
                                                <td className="p-4">
                                                    {recharge.couponUsed ? (
                                                        <code className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">
                                                            {recharge.couponUsed}
                                                        </code>
                                                    ) : (
                                                        <span className="text-gray-400">-</span>
                                                    )}
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-1 text-sm text-gray-600">
                                                        <Calendar className="h-3.5 w-3.5" />
                                                        {recharge.date}
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    {getStatusBadge(recharge.status)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </>
            )}

            {/* Manual Entries Tab */}
            {activeTab === 'manual' && (
                <Card>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase">Entry ID</th>
                                        <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase">Seller</th>
                                        <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase">Type</th>
                                        <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase">Amount</th>
                                        <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase">Reason</th>
                                        <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase">Added By</th>
                                        <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase">Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {mockBillingEntries.map((entry) => (
                                        <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="p-4">
                                                <code className="text-xs font-mono">{entry.id}</code>
                                            </td>
                                            <td className="p-4">
                                                <p className="font-medium text-gray-900">{entry.sellerName}</p>
                                                <p className="text-xs text-gray-500">{entry.sellerId}</p>
                                            </td>
                                            <td className="p-4">
                                                <Badge variant={entry.type === 'manual_credit' ? 'success' : 'warning'}>
                                                    {entry.type === 'manual_credit' ? 'Credit' : 'Debit'}
                                                </Badge>
                                            </td>
                                            <td className="p-4">
                                                <span className={cn(
                                                    "font-semibold",
                                                    entry.amount > 0 ? "text-emerald-600" : "text-rose-600"
                                                )}>
                                                    {entry.amount > 0 ? '+' : ''}{formatCurrency(entry.amount)}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <p className="text-sm text-gray-600 max-w-xs truncate">{entry.reason}</p>
                                            </td>
                                            <td className="p-4">
                                                <p className="text-sm text-gray-600">{entry.addedBy}</p>
                                            </td>
                                            <td className="p-4">
                                                <p className="text-sm text-gray-600">{entry.date}</p>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
