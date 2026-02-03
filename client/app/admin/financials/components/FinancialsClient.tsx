"use client";
export const dynamic = "force-dynamic";

import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/core/Card';
import { MetricCard } from '@/src/components/admin/MetricCard';
import { Button } from '@/src/components/ui/core/Button';
import { IndianRupee, ArrowUpRight, ArrowDownRight, CreditCard, Wallet, Loader2 } from 'lucide-react';
import { formatCurrency, cn } from '@/src/lib/utils';
import { Badge } from '@/src/components/ui/core/Badge';
import { useAdminFinancialsOverview, useAdminTransactions } from '@/src/core/api/hooks/admin/financials/useAdminFinancials';

export function FinancialsClient() {
    const { data: overview, isLoading: isLoadingOverview } = useAdminFinancialsOverview();
    const { data: transactionsResponse, isLoading: isLoadingTransactions } = useAdminTransactions({ limit: 5 });

    const transactions = transactionsResponse?.data || [];
    const stats = overview || {
        availableBalance: 0,
        totalSpent: 0,
        pendingRemittance: 0,
        currency: 'INR'
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <h2 className="text-2xl font-bold text-gray-900">Financial Overview</h2>

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
                                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
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
        </div>
    );
}
