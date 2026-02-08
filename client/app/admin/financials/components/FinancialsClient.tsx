"use client";
export const dynamic = "force-dynamic";

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/core/Card';
import { MetricCard } from '@/src/components/admin/MetricCard';
import { Button } from '@/src/components/ui/core/Button';
import { Input } from '@/src/components/ui/core/Input';
import { IndianRupee, ArrowUpRight, ArrowDownRight, CreditCard, Wallet, Loader2, Upload, AlertTriangle } from 'lucide-react';
import { formatCurrency, cn } from '@/src/lib/utils';
import { Badge } from '@/src/components/ui/core/Badge';
import { useAdminFinancialsOverview, useAdminTransactions } from '@/src/core/api/hooks/admin/financials/useAdminFinancials';
import {
    useImportCarrierBilling,
    usePricingVarianceCases,
    useUpdatePricingVarianceCase,
    CarrierBillingImportRecord,
} from '@/src/core/api/hooks/admin/financials/useCarrierReconciliation';
import { showErrorToast } from '@/src/lib/error';

export function FinancialsClient() {
    const { data: overview, isLoading: isLoadingOverview } = useAdminFinancialsOverview();
    const { data: transactionsResponse, isLoading: isLoadingTransactions } = useAdminTransactions({ limit: 5 });
    const [varianceStatusFilter, setVarianceStatusFilter] = useState<'all' | 'open' | 'under_review' | 'resolved' | 'waived'>('open');
    const [thresholdPercent, setThresholdPercent] = useState('5');
    const [importPayload, setImportPayload] = useState('');
    const [variancePage, setVariancePage] = useState(1);

    const varianceFilters = useMemo(
        () => ({
            page: variancePage,
            limit: 20,
            status: varianceStatusFilter === 'all' ? undefined : varianceStatusFilter,
        }),
        [variancePage, varianceStatusFilter]
    );
    const { data: varianceResponse, isLoading: isVarianceLoading } = usePricingVarianceCases(varianceFilters);
    const importBillingMutation = useImportCarrierBilling();
    const updateVarianceMutation = useUpdatePricingVarianceCase();

    const transactions = transactionsResponse?.data || [];
    const varianceCases = varianceResponse?.data || [];
    const variancePagination = varianceResponse?.pagination;
    const stats = overview || {
        availableBalance: 0,
        totalSpent: 0,
        pendingRemittance: 0,
        currency: 'INR'
    };

    const handleImportBilling = async () => {
        let records: CarrierBillingImportRecord[] = [];
        try {
            const parsed = JSON.parse(importPayload || '[]');
            if (!Array.isArray(parsed)) {
                showErrorToast('Import payload must be a JSON array');
                return;
            }
            records = parsed;
        } catch {
            showErrorToast('Invalid JSON payload');
            return;
        }

        const parsedThreshold = Number(thresholdPercent || '5');
        if (!Number.isFinite(parsedThreshold) || parsedThreshold < 0 || parsedThreshold > 100) {
            showErrorToast('Threshold must be between 0 and 100');
            return;
        }

        await importBillingMutation.mutateAsync({
            records,
            thresholdPercent: parsedThreshold,
        });
        setVariancePage(1);
    };

    const handleVarianceStatus = async (id: string, status: 'open' | 'under_review' | 'resolved' | 'waived') => {
        await updateVarianceMutation.mutateAsync({ id, status });
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">Financial Overview</h2>

            <div className="grid gap-4 md:grid-cols-3">
                <MetricCard
                    title="Available Balance"
                    value={isLoadingOverview ? "..." : formatCurrency(stats.availableBalance)}
                    icon={Wallet}
                    className="bg-[var(--bg-secondary)] border-[var(--border-subtle)]"
                />
                <MetricCard
                    title="Total Spent (All Time)"
                    value={isLoadingOverview ? "..." : formatCurrency(stats.totalSpent)}
                    icon={CreditCard}
                    trend="neutral"
                />
                <MetricCard
                    title="Pending COD Remittance"
                    value={isLoadingOverview ? "..." : formatCurrency(stats.pendingRemittance)}
                    icon={IndianRupee}
                    trend="neutral"
                />
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <Card className="col-span-2">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Recent Transactions</CardTitle>
                        <Button variant="outline" size="sm">Download Statement</Button>
                    </CardHeader>
                    <CardContent>
                        {isLoadingTransactions ? (
                            <div className="flex justify-center p-8">
                                <Loader2 className="w-6 h-6 animate-spin text-[var(--text-muted)]" />
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {transactions.length === 0 ? (
                                    <p className="text-center text-[var(--text-muted)] py-4">No recent transactions</p>
                                ) : (
                                    transactions.map((txn) => (
                                        <div key={txn.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className={cn(
                                                    "p-2 rounded-full",
                                                    txn.type === 'credit' ? "bg-[var(--success-bg)] text-[var(--success)]" : "bg-[var(--error-bg)] text-[var(--error)]"
                                                )}>
                                                    {txn.type === 'credit' ? <ArrowDownRight className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-[var(--text-primary)]">{txn.description}</p>
                                                    <p className="text-xs text-[var(--text-muted)]">
                                                        {new Date(txn.date).toLocaleDateString()} • {txn.id}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className={cn(
                                                    "font-semibold",
                                                    txn.type === 'credit' ? "text-[var(--success)]" : "text-[var(--text-primary)]"
                                                )}>
                                                    {txn.type === 'credit' ? '+' : ''}{formatCurrency(txn.amount)}
                                                </p>
                                                <p className="text-xs text-[var(--text-muted)] capitalize">{txn.status}</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <Button className="w-full justify-start" size="lg">
                            <Wallet className="mr-2 h-5 w-5" /> Recharge Wallet
                        </Button>
                        <Button variant="outline" className="w-full justify-start" size="lg">
                            <IndianRupee className="mr-2 h-5 w-5" /> Withdraw Funds
                        </Button>
                        <div className="pt-4 border-t border-gray-100">
                            <h4 className="text-sm font-medium text-[var(--text-primary)] mb-2">Payment Methods</h4>
                            <div className="p-3 border border-gray-200 rounded-lg flex items-center justify-between mb-2">
                                <span className="text-sm">HDFC Bank **** 8821</span>
                                <Badge variant="outline">Primary</Badge>
                            </div>
                            <Button variant="ghost" size="sm" className="w-full text-[var(--primary-blue)]">
                                + Add New Method
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Upload className="h-5 w-5" />
                        Carrier Billing Import
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="grid gap-3 md:grid-cols-4">
                        <Input
                            type="number"
                            value={thresholdPercent}
                            onChange={(event) => setThresholdPercent(event.target.value)}
                            placeholder="Threshold %"
                        />
                        <div className="md:col-span-3 flex justify-end">
                            <Button
                                onClick={handleImportBilling}
                                disabled={importBillingMutation.isPending}
                            >
                                {importBillingMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                                Import Billing Records
                            </Button>
                        </div>
                    </div>
                    <textarea
                        className="min-h-[140px] w-full rounded-md border border-[var(--border-input)] bg-[var(--bg-primary)] p-3 text-sm font-mono"
                        placeholder='Paste JSON array. Example: [{"provider":"delhivery","awb":"DL123","billedTotal":125.5}]'
                        value={importPayload}
                        onChange={(event) => setImportPayload(event.target.value)}
                    />
                    <p className="text-xs text-[var(--text-muted)]">
                        Supports `provider`, `awb`, `billedTotal`, optional `shipmentId`, `invoiceRef`, `source`, `billedAt`.
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5" />
                        Pricing Variance Cases
                    </CardTitle>
                    <div className="flex gap-2">
                        {(['all', 'open', 'under_review', 'resolved', 'waived'] as const).map((item) => (
                            <Button
                                key={item}
                                size="sm"
                                variant={varianceStatusFilter === item ? 'default' : 'outline'}
                                onClick={() => {
                                    setVarianceStatusFilter(item);
                                    setVariancePage(1);
                                }}
                            >
                                {item}
                            </Button>
                        ))}
                    </div>
                </CardHeader>
                <CardContent>
                    {isVarianceLoading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="w-6 h-6 animate-spin text-[var(--text-muted)]" />
                        </div>
                    ) : varianceCases.length === 0 ? (
                        <p className="text-sm text-[var(--text-muted)] text-center py-8">No variance cases for selected filter.</p>
                    ) : (
                        <div className="space-y-3">
                            {varianceCases.map((item) => (
                                <div
                                    key={item._id}
                                    className="rounded-lg border border-[var(--border-subtle)] p-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
                                >
                                    <div>
                                        <p className="font-semibold text-[var(--text-primary)]">
                                            {item.provider.toUpperCase()} • {item.awb}
                                        </p>
                                        <p className="text-xs text-[var(--text-muted)] mt-1">
                                            Expected {formatCurrency(item.expectedCost)} • Billed {formatCurrency(item.billedCost)} • Variance {item.variancePercent.toFixed(2)}%
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <Badge variant={item.variancePercent > item.thresholdPercent ? 'error' : 'success'}>
                                            {item.variancePercent.toFixed(2)}%
                                        </Badge>
                                        <Badge variant="outline">{item.status}</Badge>
                                        <Button size="sm" variant="outline" onClick={() => handleVarianceStatus(item._id, 'under_review')} disabled={updateVarianceMutation.isPending}>
                                            Review
                                        </Button>
                                        <Button size="sm" variant="outline" onClick={() => handleVarianceStatus(item._id, 'resolved')} disabled={updateVarianceMutation.isPending}>
                                            Resolve
                                        </Button>
                                        <Button size="sm" variant="outline" onClick={() => handleVarianceStatus(item._id, 'waived')} disabled={updateVarianceMutation.isPending}>
                                            Waive
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {variancePagination && variancePagination.pages > 1 && (
                        <div className="mt-4 flex items-center justify-between text-sm">
                            <span className="text-[var(--text-muted)]">
                                Page {variancePagination.page} of {variancePagination.pages}
                            </span>
                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={variancePagination.page <= 1}
                                    onClick={() => setVariancePage((prev) => Math.max(1, prev - 1))}
                                >
                                    Previous
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={variancePagination.page >= variancePagination.pages}
                                    onClick={() => setVariancePage((prev) => prev + 1)}
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
