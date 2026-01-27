"use client";
export const dynamic = "force-dynamic";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/components/ui/core/Card';
import { Button } from '@/src/components/ui/core/Button';
import { Input } from '@/src/components/ui/core/Input';
import { Badge } from '@/src/components/ui/core/Badge';
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
    Calendar,
    Loader2
} from 'lucide-react';
import { cn, formatCurrency } from '@/src/lib/utils';
import { useToast } from '@/src/components/ui/feedback/Toast';
import { useAdminBillingOverview, useAdminTransactions } from '@/src/core/api/hooks/admin/useAdminBilling';
import { useDebouncedValue } from '@/src/hooks/data';
import type { BillingTransaction } from '@/src/core/api/clients/billingApi';




export function BillingClient() {
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearch = useDebouncedValue(searchQuery, 500);
    const [selectedStatus, setSelectedStatus] = useState<'all' | 'success' | 'pending' | 'failed'>('all');
    const [activeTab, setActiveTab] = useState<'recharges' | 'manual'>('recharges');
    const [showAddManual, setShowAddManual] = useState(false);
    const { addToast } = useToast();

    // API Hooks
    const { data: overviewStats } = useAdminBillingOverview();

    // Transactions Query
    const { data: transactionsData, isLoading } = useAdminTransactions({
        search: debouncedSearch,
        status: selectedStatus === 'all' ? undefined : selectedStatus,
        type: activeTab === 'manual' ? 'adjustment' : 'recharge', // Basic mapping, adjust as needed
    });

    const transactions = transactionsData?.transactions || [];

    // Helper for badges
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


    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2 text-[var(--text-primary)]">
                        <Receipt className="h-6 w-6 text-[var(--primary-blue)]" />
                        Billing & Recharges
                    </h1>
                    <p className="text-sm mt-1 text-[var(--text-secondary)]">
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
                                <p className="text-sm text-[var(--text-secondary)]">Total Revenue</p>
                                <p className="text-2xl font-bold text-[var(--text-primary)]">
                                    {formatCurrency(overviewStats?.totalRevenue || 0)}
                                </p>
                            </div>
                            <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-[var(--success-bg)]">
                                <IndianRupee className="h-5 w-5 text-[var(--success)]" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-[var(--text-secondary)]">Pending Recharges</p>
                                <p className="text-2xl font-bold text-[var(--warning)]">
                                    {formatCurrency(overviewStats?.pendingRecharges || 0)}
                                </p>
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
                                <p className="text-sm text-[var(--text-secondary)]">Failed Transactions</p>
                                <p className="text-2xl font-bold text-[var(--error)]">
                                    {overviewStats?.failedTransactions || 0}
                                </p>
                            </div>
                            <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-[var(--error-bg)]">
                                <AlertCircle className="h-5 w-5 text-[var(--error)]" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-[var(--text-secondary)]">Active Wallets</p>
                                <p className="text-2xl font-bold text-[var(--text-primary)]">
                                    {overviewStats?.activeWallets || 0}
                                </p>
                            </div>
                            <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-[var(--primary-blue-soft)]">
                                <Users className="h-5 w-5 text-[var(--primary-blue)]" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Manual Entry Form */}
            {showAddManual && (
                <Card className="border-[var(--primary-blue)]/20 bg-[var(--primary-blue-soft)]">
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
                                <select className="flex h-10 w-full rounded-lg border border-gray-200 bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-gray-300">
                                    <option value="">Select Seller</option>
                                    <option value="slr-123">Fashion Hub India (SLR-123)</option>
                                    <option value="slr-456">ElectroMart (SLR-456)</option>
                                    <option value="slr-789">HomeDecor Plus (SLR-789)</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Type *</label>
                                <select className="flex h-10 w-full rounded-lg border border-gray-200 bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-gray-300">
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
            <div className="flex items-center gap-2 border-b pb-4 border-[var(--border-subtle)]">
                <button
                    onClick={() => setActiveTab('recharges')}
                    className={cn(
                        "px-4 py-2 text-sm font-medium rounded-lg transition-all",
                        activeTab === 'recharges'
                            ? "bg-[var(--primary-blue)] text-[var(--text-inverse)]"
                            : "bg-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]"
                    )}
                >
                    Seller Recharges
                </button>
                <button
                    onClick={() => setActiveTab('manual')}
                    className={cn(
                        "px-4 py-2 text-sm font-medium rounded-lg transition-all",
                        activeTab === 'manual'
                            ? "bg-[var(--primary-blue)] text-[var(--text-inverse)]"
                            : "bg-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]"
                    )}
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
                                    className={cn(
                                        "px-4 py-2 text-sm font-medium rounded-full transition-all capitalize",
                                        selectedStatus === status
                                            ? "bg-[var(--primary-blue)] text-[var(--text-inverse)]"
                                            : "bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
                                    )}
                                >
                                    {status}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Recharges Table */}
                    <Card>
                        <CardContent className="p-0">
                            {isLoading ? (
                                <div className="flex items-center justify-center p-12">
                                    <Loader2 className="w-8 h-8 animate-spin text-[var(--primary-blue)]" />
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-[var(--bg-secondary)] border-b border-gray-100">
                                            <tr>
                                                <th className="text-left p-4 text-xs font-medium text-[var(--text-muted)] uppercase">Seller</th>
                                                <th className="text-left p-4 text-xs font-medium text-[var(--text-muted)] uppercase">Amount</th>
                                                <th className="text-left p-4 text-xs font-medium text-[var(--text-muted)] uppercase">Type</th>
                                                <th className="text-left p-4 text-xs font-medium text-[var(--text-muted)] uppercase">Reference</th>
                                                <th className="text-left p-4 text-xs font-medium text-[var(--text-muted)] uppercase">Date</th>
                                                <th className="text-left p-4 text-xs font-medium text-[var(--text-muted)] uppercase">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {transactions.length === 0 ? (
                                                <tr>
                                                    <td colSpan={6} className="p-8 text-center text-[var(--text-muted)]">
                                                        No transactions found
                                                    </td>
                                                </tr>
                                            ) : transactions.map((tx) => (
                                                <tr key={tx._id} className="hover:bg-[var(--bg-secondary)] transition-colors">
                                                    <td className="p-4">
                                                        <p className="font-medium text-[var(--text-primary)]">{tx.companyName}</p>
                                                        <p className="text-xs text-[var(--text-muted)]">Start: {formatCurrency(tx.balanceBefore)}</p>
                                                    </td>
                                                    <td className="p-4">
                                                        <p className={cn("font-semibold", tx.type === 'credit' ? "text-[var(--success)]" : "text-[var(--text-primary)]")}>
                                                            {tx.type === 'credit' ? '+' : '-'}{formatCurrency(tx.amount)}
                                                        </p>
                                                    </td>
                                                    <td className="p-4">
                                                        <p className="text-sm text-[var(--text-primary)] capitalize">{tx.category.replace('_', ' ')}</p>
                                                    </td>
                                                    <td className="p-4">
                                                        <code className="text-xs font-mono bg-[var(--bg-secondary)] px-1 py-0.5 rounded">{tx.referenceId || '-'}</code>
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="flex items-center gap-1 text-sm text-gray-600">
                                                            <Calendar className="h-3.5 w-3.5" />
                                                            {new Date(tx.createdAt).toLocaleDateString()}
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        {getStatusBadge(tx.status)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </>
            )}

            {/* Manual Entries Tab */}
            {activeTab === 'manual' && (
                <Card>
                    <CardContent className="p-0">
                        {isLoading ? (
                            <div className="flex items-center justify-center p-12">
                                <Loader2 className="w-8 h-8 animate-spin text-[var(--primary-blue)]" />
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-[var(--bg-secondary)] border-b border-gray-100">
                                        <tr>
                                            <th className="text-left p-4 text-xs font-medium text-[var(--text-muted)] uppercase">ID</th>
                                            <th className="text-left p-4 text-xs font-medium text-[var(--text-muted)] uppercase">Seller</th>
                                            <th className="text-left p-4 text-xs font-medium text-[var(--text-muted)] uppercase">Type</th>
                                            <th className="text-left p-4 text-xs font-medium text-[var(--text-muted)] uppercase">Amount</th>
                                            <th className="text-left p-4 text-xs font-medium text-[var(--text-muted)] uppercase">Description</th>
                                            <th className="text-left p-4 text-xs font-medium text-[var(--text-muted)] uppercase">Date</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {transactions.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="p-8 text-center text-[var(--text-muted)]">
                                                    No manual entries found
                                                </td>
                                            </tr>
                                        ) : transactions.map((entry) => (
                                            <tr key={entry._id} className="hover:bg-[var(--bg-secondary)] transition-colors">
                                                <td className="p-4">
                                                    <code className="text-xs font-mono">{entry._id.substring(0, 8)}...</code>
                                                </td>
                                                <td className="p-4">
                                                    <p className="font-medium text-[var(--text-primary)]">{entry.companyName}</p>
                                                </td>
                                                <td className="p-4">
                                                    <Badge variant={entry.type === 'credit' ? 'success' : 'warning'}>
                                                        {entry.type === 'credit' ? 'Credit' : 'Debit'}
                                                    </Badge>
                                                </td>
                                                <td className="p-4">
                                                    <span className={cn(
                                                        "font-semibold",
                                                        entry.type === 'credit' ? "text-[var(--success)]" : "text-[var(--error)]"
                                                    )}>
                                                        {entry.type === 'credit' ? '+' : '-'}{formatCurrency(entry.amount)}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    <p className="text-sm text-gray-600 max-w-xs truncate">{entry.description}</p>
                                                </td>
                                                <td className="p-4">
                                                    <p className="text-sm text-gray-600">{new Date(entry.createdAt).toLocaleDateString()}</p>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
