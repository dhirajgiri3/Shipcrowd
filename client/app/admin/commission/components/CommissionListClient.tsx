"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import {
    CheckCircle2,
    XCircle,
    Search,
    Filter,
    MoreVertical,
    FileText,
    Download,
    Loader2,
    AlertCircle,
    User,
    Calendar,
    DollarSign,
    CheckSquare,
    Square
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/components/ui/core/Card';
import { Button } from '@/src/components/ui/core/Button';
import { Input } from '@/src/components/ui/core/Input';
import { Badge } from '@/src/components/ui/core/Badge';
import { useCommissionPage } from '@/src/core/api/hooks/admin/commission/useCommission';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/src/components/ui/feedback/DropdownMenu";
import { formatCurrency } from '@/src/lib/utils';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/src/components/ui/feedback/Dialog';
import { Label } from '@/src/components/ui/core/Label';

export function CommissionListClient() {
    const router = useRouter();

    const {
        searchQuery,
        setSearchQuery,
        statusFilter,
        setStatusFilter,
        selectedIds,
        setSelectedIds,
        isRejectDialogOpen,
        setIsRejectDialogOpen,
        rejectionReason,
        setRejectionReason,

        transactions,
        isLoading,
        isError,
        error,

        areAllSelected,
        isApproving,
        isRejecting,

        toggleSelectAll,
        toggleSelect,
        handleBulkApprove,
        handleBulkReject
    } = useCommissionPage();

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'approved': return 'success';
            case 'pending': return 'warning';
            case 'rejected': return 'error';
            case 'paid': return 'info';
            default: return 'default';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-[var(--text-primary)] tracking-tight">Commission Management</h1>
                    <p className="text-sm text-[var(--text-secondary)] mt-1">Review and approve sales commissions</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" className="gap-2">
                        <Download className="h-4 w-4" />
                        Export
                    </Button>
                </div>
            </div>

            <Card className="border-[var(--border-default)]">
                <CardHeader className="pb-4 border-b border-[var(--border-subtle)]">
                    <div className="flex flex-col md:flex-row gap-4 justify-between">
                        {/* Filters */}
                        <div className="flex items-center gap-2 flex-1">
                            <div className="relative flex-1 max-w-sm">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
                                <Input
                                    placeholder="Search sales rep..."
                                    className="pl-9 bg-[var(--bg-primary)]"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <select
                                className="h-10 rounded-md border border-[var(--border-default)] bg-[var(--bg-primary)] px-3 text-sm"
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <option value="all">All Status</option>
                                <option value="pending">Pending</option>
                                <option value="approved">Approved</option>
                                <option value="rejected">Rejected</option>
                                <option value="paid">Paid</option>
                            </select>
                        </div>
                    </div>
                </CardHeader>

                {/* Bulk Action Bar */}
                {selectedIds.size > 0 && (
                    <div className="bg-[var(--primary-blue)]/10 p-2 px-4 flex items-center justify-between border-b border-[var(--primary-blue)]/20 animate-in slide-in-from-top-2">
                        <span className="text-sm font-medium text-[var(--primary-blue)]">
                            {selectedIds.size} transactions selected
                        </span>
                        <div className="flex items-center gap-2">
                            <Button
                                size="sm"
                                variant="ghost"
                                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                                onClick={() => setSelectedIds(new Set())}
                            >
                                Cancel
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 border-red-200 hover:bg-red-50"
                                onClick={() => setIsRejectDialogOpen(true)}
                                disabled={isRejecting}
                            >
                                {isRejecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />}
                                Reject Selected
                            </Button>
                            <Button
                                size="sm"
                                className="bg-[var(--primary-blue)] hover:bg-[var(--primary-blue-deep)] text-white"
                                onClick={handleBulkApprove}
                                disabled={isApproving}
                            >
                                {isApproving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                                Approve Selected
                            </Button>
                        </div>
                    </div>
                )}

                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="flex items-center justify-center min-h-[400px]">
                            <Loader2 className="h-8 w-8 animate-spin text-[var(--primary-blue)]" />
                        </div>
                    ) : isError ? (
                        <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8 bg-red-50">
                            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
                            <h3 className="text-lg font-semibold text-red-900">Failed to load transactions</h3>
                            <p className="text-red-600 mt-2">{error?.message || "Something went wrong"}</p>
                        </div>
                    ) : transactions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center min-h-[300px] text-center p-8">
                            <div className="h-12 w-12 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center mb-4">
                                <DollarSign className="h-6 w-6 text-[var(--text-muted)]" />
                            </div>
                            <h3 className="text-lg font-medium text-[var(--text-primary)]">No transactions found</h3>
                            <p className="text-sm text-[var(--text-muted)] mt-1">Try adjusting your filters</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-[var(--bg-tertiary)]/50 border-b border-[var(--border-subtle)]">
                                    <tr>
                                        <th className="px-4 py-3 w-[50px]">
                                            <button
                                                onClick={toggleSelectAll}
                                                className="flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                                            >
                                                {areAllSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                                            </button>
                                        </th>
                                        <th className="px-4 py-3 font-medium text-[var(--text-muted)]">Transaction ID</th>
                                        <th className="px-4 py-3 font-medium text-[var(--text-muted)]">Sales Rep</th>
                                        <th className="px-4 py-3 font-medium text-[var(--text-muted)]">Status</th>
                                        <th className="px-4 py-3 font-medium text-[var(--text-muted)] text-right">Amount</th>
                                        <th className="px-4 py-3 font-medium text-[var(--text-muted)] text-right">Final Amount</th>
                                        <th className="px-4 py-3 font-medium text-[var(--text-muted)]">Date</th>
                                        <th className="px-4 py-3 font-medium text-[var(--text-muted)] text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--border-subtle)]">
                                    {transactions.map((transaction) => {
                                        const isSelected = selectedIds.has(transaction._id);
                                        return (
                                            <tr
                                                key={transaction._id}
                                                className={`hover:bg-[var(--bg-tertiary)]/30 transition-colors ${isSelected ? 'bg-[var(--primary-blue)]/5' : ''}`}
                                            >
                                                <td className="px-4 py-3">
                                                    <button
                                                        onClick={() => toggleSelect(transaction._id)}
                                                        className={`flex items-center justify-center ${isSelected ? 'text-[var(--primary-blue)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
                                                    >
                                                        {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                                                    </button>
                                                </td>
                                                <td className="px-4 py-3 font-mono text-xs text-[var(--text-primary)]">
                                                    {transaction._id.substring(transaction._id.length - 8).toUpperCase()}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center">
                                                            <User className="w-3 h-3 text-[var(--text-muted)]" />
                                                        </div>
                                                        <span className="font-medium text-[var(--text-primary)]">
                                                            {/* Assuming SalesRep name is populated or use ID fallback */}
                                                            {transaction.salesRepresentative?.name || 'Unknown Rep'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <Badge variant={getStatusColor(transaction.status)} className="capitalize">
                                                        {transaction.status}
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-3 text-right text-[var(--text-secondary)]">
                                                    {formatCurrency(transaction.amount)}
                                                </td>
                                                <td className="px-4 py-3 text-right font-medium text-[var(--text-primary)]">
                                                    {formatCurrency(transaction.finalAmount)}
                                                </td>
                                                <td className="px-4 py-3 text-[var(--text-secondary)]">
                                                    {transaction.createdAt ? format(new Date(transaction.createdAt), 'MMM d, yyyy') : '-'}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                                <MoreVertical className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                            <DropdownMenuItem onClick={() => router.push(`/admin/commission/${transaction._id}`)}>
                                                                View Details
                                                            </DropdownMenuItem>
                                                            {transaction.status === 'pending' && (
                                                                <>
                                                                    <DropdownMenuSeparator />
                                                                    <DropdownMenuItem className="text-[var(--success)]">
                                                                        Approve
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem className="text-[var(--error)]">
                                                                        Reject
                                                                    </DropdownMenuItem>
                                                                </>
                                                            )}
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Bulk Reject Dialog */}
            <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reject Transactions</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to reject {selectedIds.size} transactions? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-2">
                        <Label htmlFor="reason">Rejection Reason</Label>
                        <Input
                            id="reason"
                            placeholder="e.g., Duplicate entry, Invalid calculation..."
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            className="mt-2"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsRejectDialogOpen(false)}>Cancel</Button>
                        <Button
                            className="bg-red-600 hover:bg-red-700 text-white"
                            onClick={handleBulkReject}
                            disabled={!rejectionReason || isRejecting}
                        >
                            {isRejecting ? 'Rejecting...' : 'Confirm Reject'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

