"use client";
export const dynamic = "force-dynamic";

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/components/ui/core/Card';
import { PageHeader } from '@/src/components/ui/layout/PageHeader';
import { StatsCard } from '@/src/components/ui/dashboard/StatsCard';
import { Button } from '@/src/components/ui/core/Button';
import { Input } from '@/src/components/ui/core/Input';
import { Badge } from '@/src/components/ui/core/Badge';
import { PillTabs } from '@/src/components/ui/core/PillTabs';
import { CardSkeleton, EmptyState } from '@/src/components/ui';
import {
    IndianRupee,
    ArrowUpRight,
    ArrowDownRight,
    CreditCard,
    Wallet,
    Loader2,
    Upload,
    AlertTriangle,
    Receipt,
} from 'lucide-react';
import { formatCurrency, cn } from '@/src/lib/utils';
import { useAdminFinancialsOverview, useAdminTransactions } from '@/src/core/api/hooks/admin/financials/useAdminFinancials';
import {
    useImportCarrierBilling,
    usePricingVarianceCases,
    useUpdatePricingVarianceCase,
    CarrierBillingImportRecord,
} from '@/src/core/api/hooks/admin/financials/useCarrierReconciliation';
import { showErrorToast } from '@/src/lib/error';

const VARIANCE_TABS = [
    { key: 'all', label: 'All' },
    { key: 'open', label: 'Open' },
    { key: 'under_review', label: 'Under Review' },
    { key: 'resolved', label: 'Resolved' },
    { key: 'waived', label: 'Waived' },
] as const;

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
        currency: 'INR',
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

    const handleVarianceTabChange = (key: string) => {
        setVarianceStatusFilter(key as typeof varianceStatusFilter);
        setVariancePage(1);
    };

    return (
        <div className="p-6 md:p-8 max-w-[1600px] mx-auto bg-[var(--bg-secondary)] min-h-screen pb-20 space-y-6 animate-in fade-in duration-500">
            <PageHeader
                title="Financial Overview"
                description="Platform wallet balance, transactions, and carrier billing reconciliation."
                showBack={true}
                backUrl="/admin"
                breadcrumbs={[
                    { label: 'Admin', href: '/admin' },
                    { label: 'Financials', active: true },
                ]}
            />

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {isLoadingOverview ? (
                    <>
                        {[1, 2, 3].map((i) => (
                            <CardSkeleton key={i} className="h-28" />
                        ))}
                    </>
                ) : (
                    <>
                        <StatsCard
                            title="Available Balance"
                            value={formatCurrency(stats.availableBalance)}
                            icon={Wallet}
                            variant="success"
                        />
                        <StatsCard
                            title="Total Spent (All Time)"
                            value={formatCurrency(stats.totalSpent)}
                            icon={CreditCard}
                            variant="default"
                        />
                        <StatsCard
                            title="Pending COD Remittance"
                            value={formatCurrency(stats.pendingRemittance)}
                            icon={IndianRupee}
                            variant="info"
                        />
                    </>
                )}
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                {/* Recent Transactions */}
                <Card className="lg:col-span-2 border-[var(--border-subtle)]">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Recent Transactions</CardTitle>
                        <Button variant="outline" size="sm">
                            Download Statement
                        </Button>
                    </CardHeader>
                    <CardContent>
                        {isLoadingTransactions ? (
                            <div className="py-12">
                                <CardSkeleton className="h-48" />
                            </div>
                        ) : transactions.length === 0 ? (
                            <EmptyState
                                icon={<Receipt className="w-12 h-12" />}
                                variant="noData"
                                title="No recent transactions"
                                description="Transactions will appear here when wallet activity occurs."
                            />
                        ) : (
                            <div className="space-y-1">
                                {transactions.map((txn) => (
                                    <div
                                        key={txn.id}
                                        className="flex items-center justify-between p-3 rounded-xl hover:bg-[var(--bg-hover)] transition-colors"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div
                                                className={cn(
                                                    'p-2 rounded-lg',
                                                    txn.type === 'credit'
                                                        ? 'bg-[var(--success-bg)] text-[var(--success)]'
                                                        : 'bg-[var(--error-bg)] text-[var(--error)]'
                                                )}
                                            >
                                                {txn.type === 'credit' ? (
                                                    <ArrowDownRight className="w-4 h-4" />
                                                ) : (
                                                    <ArrowUpRight className="w-4 h-4" />
                                                )}
                                            </div>
                                            <div>
                                                <p className="font-medium text-[var(--text-primary)]">{txn.description}</p>
                                                <p className="text-xs text-[var(--text-muted)]">
                                                    {new Date(txn.date).toLocaleDateString()} • {txn.id}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p
                                                className={cn(
                                                    'font-semibold',
                                                    txn.type === 'credit' ? 'text-[var(--success)]' : 'text-[var(--text-primary)]'
                                                )}
                                            >
                                                {txn.type === 'credit' ? '+' : ''}
                                                {formatCurrency(txn.amount)}
                                            </p>
                                            <p className="text-xs text-[var(--text-muted)] capitalize">{txn.status}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card className="border-[var(--border-subtle)]">
                    <CardHeader>
                        <CardTitle>Quick Actions</CardTitle>
                        <CardDescription>Wallet and payment operations</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <Button variant="primary" className="w-full justify-start" size="lg">
                            <Wallet className="mr-2 h-5 w-5" /> Recharge Wallet
                        </Button>
                        <Button variant="outline" className="w-full justify-start" size="lg">
                            <IndianRupee className="mr-2 h-5 w-5" /> Withdraw Funds
                        </Button>
                        <div className="pt-4 border-t border-[var(--border-subtle)]">
                            <h4 className="text-sm font-medium text-[var(--text-primary)] mb-2">Payment Methods</h4>
                            <div className="p-3 border border-[var(--border-subtle)] rounded-xl flex items-center justify-between mb-2 bg-[var(--bg-secondary)]">
                                <span className="text-sm text-[var(--text-primary)]">HDFC Bank **** 8821</span>
                                <Badge variant="outline">Primary</Badge>
                            </div>
                            <Button variant="ghost" size="sm" className="w-full text-[var(--primary-blue)]">
                                + Add New Method
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Carrier Billing Import */}
            <Card className="border-[var(--border-subtle)]">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Upload className="h-5 w-5" />
                        Carrier Billing Import
                    </CardTitle>
                    <CardDescription>
                        Paste JSON array of billing records. Supports provider, awb, billedTotal, optional shipmentId, invoiceRef, source, billedAt.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-3 md:grid-cols-4 md:items-end">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[var(--text-primary)]">Threshold %</label>
                            <Input
                                type="number"
                                value={thresholdPercent}
                                onChange={(e) => setThresholdPercent(e.target.value)}
                                placeholder="5"
                            />
                        </div>
                        <div className="md:col-span-3 flex justify-end">
                            <Button
                                variant="primary"
                                onClick={handleImportBilling}
                                disabled={importBillingMutation.isPending}
                            >
                                {importBillingMutation.isPending ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                    <Upload className="h-4 w-4 mr-2" />
                                )}
                                Import Billing Records
                            </Button>
                        </div>
                    </div>
                    <textarea
                        className="min-h-[140px] w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-3 text-sm font-mono text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--primary-blue)] focus:ring-1 focus:ring-[var(--primary-blue)]"
                        placeholder='[{"provider":"delhivery","awb":"DL123","billedTotal":125.5}]'
                        value={importPayload}
                        onChange={(e) => setImportPayload(e.target.value)}
                    />
                </CardContent>
            </Card>

            {/* Pricing Variance Cases */}
            <Card className="border-[var(--border-subtle)]">
                <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-[var(--warning)]" />
                            Pricing Variance Cases
                        </CardTitle>
                        <CardDescription>Review and resolve carrier billing discrepancies</CardDescription>
                    </div>
                    <PillTabs
                        tabs={VARIANCE_TABS}
                        activeTab={varianceStatusFilter}
                        onTabChange={handleVarianceTabChange}
                    />
                </CardHeader>
                <CardContent>
                    {isVarianceLoading ? (
                        <div className="py-12">
                            <CardSkeleton className="h-48" />
                        </div>
                    ) : varianceCases.length === 0 ? (
                        <EmptyState
                            icon={<AlertTriangle className="w-12 h-12" />}
                            variant="noData"
                            title="No variance cases"
                            description="No pricing variance cases for the selected filter."
                        />
                    ) : (
                        <div className="space-y-3">
                            {varianceCases.map((item) => (
                                <div
                                    key={item._id}
                                    className="rounded-xl border border-[var(--border-subtle)] p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between bg-[var(--bg-primary)] hover:border-[var(--border-default)] transition-colors"
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
                                        <Badge
                                            variant={item.variancePercent > item.thresholdPercent ? 'error' : 'success'}
                                        >
                                            {item.variancePercent.toFixed(2)}%
                                        </Badge>
                                        <Badge variant="outline">{item.status}</Badge>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleVarianceStatus(item._id, 'under_review')}
                                            disabled={updateVarianceMutation.isPending}
                                        >
                                            Review
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleVarianceStatus(item._id, 'resolved')}
                                            disabled={updateVarianceMutation.isPending}
                                        >
                                            Resolve
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleVarianceStatus(item._id, 'waived')}
                                            disabled={updateVarianceMutation.isPending}
                                        >
                                            Waive
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {variancePagination && variancePagination.pages > 1 && (
                        <div className="mt-4 flex items-center justify-between text-sm border-t border-[var(--border-subtle)] pt-4">
                            <span className="text-[var(--text-muted)]">
                                Page {variancePagination.page} of {variancePagination.pages}
                            </span>
                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    disabled={variancePagination.page <= 1}
                                    onClick={() => setVariancePage((prev) => Math.max(1, prev - 1))}
                                >
                                    Previous
                                </Button>
                                <Button
                                    size="sm"
                                    variant="secondary"
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
