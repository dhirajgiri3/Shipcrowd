"use client";
export const dynamic = "force-dynamic";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/core/Card';
import { MetricCard } from '@/components/admin/MetricCard';
import { Button } from '@/components/ui/core/Button';
import { Badge } from '@/components/ui/core/Badge';
import {
    IndianRupee,
    ArrowUpRight,
    ArrowDownRight,
    CreditCard,
    Wallet,
    Download,
    Plus,
    RefreshCcw
} from 'lucide-react';
import { formatCurrency } from '@/src/shared/utils';
import { useToast } from '@/components/ui/feedback/Toast';

const transactions = [
    { id: 'TXN-001', date: '2024-12-11', description: 'Wallet Recharge', amount: 5000, type: 'credit', status: 'success' },
    { id: 'TXN-002', date: '2024-12-10', description: 'Shipment #SHP-9921 Deduction', amount: -450, type: 'debit', status: 'success' },
    { id: 'TXN-003', date: '2024-12-10', description: 'COD Remittance - Dec Week 1', amount: 12450, type: 'credit', status: 'processing' },
    { id: 'TXN-004', date: '2024-12-09', description: 'Subscription Renewal - Growth Plan', amount: -2999, type: 'debit', status: 'success' },
    { id: 'TXN-005', date: '2024-12-08', description: 'Shipment #SHP-8812 Deduction', amount: -620, type: 'debit', status: 'success' },
    { id: 'TXN-006', date: '2024-12-07', description: 'Wallet Recharge', amount: 10000, type: 'credit', status: 'success' },
];

const codRemittances = [
    { period: 'Week 50 (Dec 9-15)', amount: 15420, status: 'pending', expectedDate: '2024-12-22' },
    { period: 'Week 49 (Dec 2-8)', amount: 12450, status: 'processing', expectedDate: '2024-12-15' },
    { period: 'Week 48 (Nov 25-Dec 1)', amount: 18920, status: 'completed', paidDate: '2024-12-08' },
];

export default function FinancialsPage() {
    const { addToast } = useToast();

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-[var(--text-primary)]">Wallet & Billing</h2>
                <Button onClick={() => addToast('Opening recharge modal...', 'info')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Recharge Wallet
                </Button>
            </div>

            {/* Metrics */}
            <div className="grid gap-4 md:grid-cols-3">
                <MetricCard
                    title="Available Balance"
                    value={formatCurrency(24500)}
                    icon={Wallet}
                    className="bg-[var(--primary-blue-soft)] border-[var(--primary-blue)]/20"
                />
                <MetricCard
                    title="Total Spent (This Month)"
                    value={formatCurrency(18800)}
                    icon={CreditCard}
                    trend="up"
                    change={5.2}
                />
                <MetricCard
                    title="Pending COD Remittance"
                    value={formatCurrency(27870)}
                    icon={IndianRupee}
                    trend="neutral"
                />
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                {/* Transactions */}
                <Card className="lg:col-span-2">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Recent Transactions</CardTitle>
                        <Button variant="outline" size="sm">
                            <Download className="h-4 w-4 mr-2" />
                            Download Statement
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {transactions.map((txn) => (
                                <div key={txn.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-2 rounded-full ${txn.type === 'credit' ? 'bg-[var(--success-bg)] text-[var(--success)]' : 'bg-[var(--error-bg)] text-[var(--error)]'}`}>
                                            {txn.type === 'credit' ? <ArrowDownRight className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                                        </div>
                                        <div>
                                            <p className="font-medium text-[var(--text-primary)]">{txn.description}</p>
                                            <p className="text-xs text-[var(--text-muted)]">{txn.date} • {txn.id}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={`font-semibold ${txn.type === 'credit' ? 'text-[var(--success)]' : 'text-[var(--text-primary)]'}`}>
                                            {txn.type === 'credit' ? '+' : ''}{formatCurrency(txn.amount)}
                                        </p>
                                        <Badge variant={txn.status === 'success' ? 'success' : 'warning'} className="text-xs">
                                            {txn.status}
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Quick Actions & COD Remittance */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Quick Actions</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <Button className="w-full justify-start" size="lg" onClick={() => addToast('Opening recharge modal...', 'info')}>
                                <Wallet className="mr-2 h-5 w-5" /> Recharge Wallet
                            </Button>
                            <Button variant="outline" className="w-full justify-start" size="lg" onClick={() => addToast('Withdrawal feature coming soon!', 'info')}>
                                <IndianRupee className="mr-2 h-5 w-5" /> Withdraw Funds
                            </Button>
                            <div className="pt-4 border-t border-[var(--border-subtle)]">
                                <h4 className="text-sm font-medium text-[var(--text-primary)] mb-2">Payment Methods</h4>
                                <div className="p-3 border border-[var(--border-subtle)] rounded-lg flex items-center justify-between mb-2">
                                    <span className="text-sm">HDFC Bank **** 8821</span>
                                    <Badge variant="outline">Primary</Badge>
                                </div>
                                <Button variant="ghost" size="sm" className="w-full text-[var(--primary-blue)]">
                                    + Add New Method
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <RefreshCcw className="h-5 w-5 text-[var(--text-muted)]" />
                                COD Remittance
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {codRemittances.map((rem, idx) => (
                                <div key={idx} className="p-3 border border-[var(--border-subtle)] rounded-lg">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm font-medium text-[var(--text-primary)]">{rem.period}</span>
                                        <Badge variant={
                                            rem.status === 'completed' ? 'success' :
                                                rem.status === 'processing' ? 'warning' : 'neutral'
                                        }>
                                            {rem.status}
                                        </Badge>
                                    </div>
                                    <p className="text-lg font-bold text-[var(--text-primary)]">{formatCurrency(rem.amount)}</p>
                                    <p className="text-xs text-[var(--text-muted)]">
                                        {rem.status === 'completed' ? `Paid on ${rem.paidDate}` : `Expected by ${rem.expectedDate}`}
                                    </p>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
