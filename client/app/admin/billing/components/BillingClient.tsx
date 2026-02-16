"use client";
export const dynamic = "force-dynamic";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/components/ui/core/Card';
import { Button } from '@/src/components/ui/core/Button';
import { PageHeader } from '@/src/components/ui/layout/PageHeader';
import { SearchInput } from '@/src/components/ui/form/SearchInput';
import { EmptyState } from '@/src/components/ui/feedback/EmptyState';
import { Badge } from '@/src/components/ui/core/Badge';
import { StatusBadge } from '@/src/components/ui/data/StatusBadge';
import { DataTable } from '@/src/components/ui/data/DataTable';
import {
    Receipt,
    FileOutput,
    IndianRupee,
    Users,
    Clock,
    AlertCircle,
    CheckCircle,
    XCircle,
    Plus,
    X,
} from 'lucide-react';
import { cn, formatCurrency } from '@/src/lib/utils';
import { useBillingPage } from '@/src/core/api/hooks/admin/billing/useBilling';
import type { BillingTransaction } from '@/src/core/api/clients/finance/billingApi';

export function BillingClient() {
    const {
        searchQuery,
        selectedStatus,
        activeTab,
        showAddManual,
        setShowAddManual,
        manualForm,
        setManualForm,
        overviewStats,
        transactions,
        isLoading,
        handleSearchChange,
        handleStatusChange,
        handleTabChange,
        submitManualEntry,
        addToast
    } = useBillingPage();



    // Columns Configuration
    const columns = [
        {
            accessorKey: 'companyName',
            header: 'Seller',
            cell: (row: BillingTransaction) => (
                <div>
                    <p className="font-medium text-[var(--text-primary)]">{row.companyName}</p>
                    {activeTab === 'recharges' && (
                        <p className="text-xs text-[var(--text-muted)]">Start: {formatCurrency(row.balanceBefore)}</p>
                    )}
                </div>
            )
        },
        {
            accessorKey: 'amount',
            header: 'Amount',
            cell: (row: BillingTransaction) => (
                <p className={cn(
                    "font-semibold",
                    row.type === 'credit' ? "text-[var(--success)]" : "text-[var(--text-primary)]"
                )}>
                    {row.type === 'credit' ? '+' : '-'}{formatCurrency(row.amount)}
                </p>
            )
        },
        {
            accessorKey: 'type',
            header: 'Type',
            cell: (row: BillingTransaction) => (
                activeTab === 'manual' ? (
                    <Badge variant={row.type === 'credit' ? 'success' : 'warning'}>
                        {row.type === 'credit' ? 'Credit' : 'Debit'}
                    </Badge>
                ) : (
                    <p className="text-sm text-[var(--text-primary)] capitalize">{row.category.replace('_', ' ')}</p>
                )
            )
        },
        activeTab === 'recharges' ? {
            accessorKey: 'referenceId',
            header: 'Reference',
            cell: (row: BillingTransaction) => (
                <code className="text-xs font-mono bg-[var(--bg-secondary)] px-1 py-0.5 rounded">{row.referenceId || '-'}</code>
            )
        } : {
            accessorKey: 'description',
            header: 'Description',
            cell: (row: BillingTransaction) => (
                <p className="text-sm text-[var(--text-secondary)] max-w-xs truncate">{row.description}</p>
            )
        },
        {
            accessorKey: 'createdAt',
            header: 'Date',
            cell: (row: BillingTransaction) => (
                <div className="flex items-center gap-1 text-sm text-[var(--text-secondary)]">
                    <Clock className="h-3.5 w-3.5" />
                    {new Date(row.createdAt).toLocaleDateString()}
                </div>
            )
        },
    ];

    // Status Column only for recharges
    if (activeTab === 'recharges') {
        columns.push({
            accessorKey: 'status',
            header: 'Status',
            cell: (row: BillingTransaction) => <StatusBadge domain="billing" status={row.status} size="sm" />
        });
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <PageHeader
                title="Billing & Recharges"
                description="Manage seller recharges and manual billing entries"
                showBack={true}
                backUrl="/admin"
                breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Billing', active: true }]}
                actions={
                    <>
                        <Button variant="outline" onClick={() => addToast('Downloading report...', 'info')}>
                            <FileOutput className="h-4 w-4 mr-2" />
                            Export
                        </Button>
                        <Button variant="primary" onClick={() => setShowAddManual(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Manual Entry
                        </Button>
                    </>
                }
            />

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
                                <p className="text-sm text-[var(--text-secondary)]">Pending</p>
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
                                <p className="text-sm text-[var(--text-secondary)]">Failed</p>
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
                                <label className="text-sm font-medium text-[var(--text-primary)]">Seller *</label>
                                <select
                                    className="flex h-10 w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-focus)]"
                                    value={manualForm.sellerId}
                                    onChange={(e) => setManualForm({ ...manualForm, sellerId: e.target.value })}
                                >
                                    <option value="">Select Seller</option>
                                    <option value="slr-123">Fashion Hub India (SLR-123)</option>
                                    <option value="slr-456">ElectroMart (SLR-456)</option>
                                    <option value="slr-789">HomeDecor Plus (SLR-789)</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-[var(--text-primary)]">Type *</label>
                                <select
                                    className="flex h-10 w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-focus)]"
                                    value={manualForm.type}
                                    onChange={(e) => setManualForm({ ...manualForm, type: e.target.value })}
                                >
                                    <option value="credit">Credit (Add Money)</option>
                                    <option value="debit">Debit (Deduct Money)</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-[var(--text-primary)]">Amount (₹) *</label>
                                <Input
                                    type="number"
                                    placeholder="Enter amount"
                                    value={manualForm.amount}
                                    onChange={(e) => setManualForm({ ...manualForm, amount: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[var(--text-primary)]">Reason *</label>
                            <Input
                                placeholder="e.g., Compensation for delayed COD remittance"
                                value={manualForm.reason}
                                onChange={(e) => setManualForm({ ...manualForm, reason: e.target.value })}
                            />
                        </div>
                        <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-subtle)]">
                            <Button variant="outline" onClick={() => setShowAddManual(false)}>Cancel</Button>
                            <Button onClick={submitManualEntry}>
                                Submit Entry
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Tabs */}
            <div className="flex items-center gap-2 border-b pb-4 border-[var(--border-subtle)]">
                {(['recharges', 'manual'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => handleTabChange(tab)}
                        className={cn(
                            "px-4 py-2 text-sm font-medium rounded-lg transition-all capitalize",
                            activeTab === tab
                                ? "bg-[var(--primary-blue)] text-[var(--text-inverse)]"
                                : "bg-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]"
                        )}
                    >
                        {tab === 'recharges' ? 'Seller Recharges' : 'Manual Entries'}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <div className="flex-1">
                    <SearchInput
                        placeholder="Search by seller name or transaction ID..."
                        value={searchQuery}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        widthClass="w-full"
                    />
                </div>
                {activeTab === 'recharges' && (
                    <div className="flex gap-2">
                        {(['all', 'success', 'pending', 'failed'] as const).map((status) => (
                            <button
                                key={status}
                                onClick={() => handleStatusChange(status)}
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
                )}
            </div>

            <Card>
                <CardContent className="p-0">
                    {!isLoading && transactions.length === 0 ? (
                        <EmptyState
                            icon={Receipt}
                            title="No transactions found"
                            description="No billing transactions match your filters. Try adjusting your search or filters."
                        />
                    ) : (
                        <DataTable
                            columns={columns}
                            data={transactions}
                            isLoading={isLoading}
                            searchKey="companyName"
                        />
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
