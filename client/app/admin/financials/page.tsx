"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/core/Card';
import { MetricCard } from '@/components/admin/MetricCard';
import { Button } from '@/components/ui/core/Button';
import { IndianRupee, ArrowUpRight, ArrowDownRight, CreditCard, Wallet } from 'lucide-react';
import { formatCurrency } from '@/src/shared/utils';
import { Badge } from '@/components/ui/core/Badge';

const transactions = [
    { id: 'TXN-001', date: '2023-12-09', description: 'Wallet Recharge', amount: 5000, type: 'credit', status: 'success' },
    { id: 'TXN-002', date: '2023-12-08', description: 'Shipment #SHP-9921 Deduction', amount: -450, type: 'debit', status: 'success' },
    { id: 'TXN-003', date: '2023-12-08', description: 'COD Remittance - Nov Week 4', amount: 12450, type: 'credit', status: 'processing' },
    { id: 'TXN-004', date: '2023-12-07', description: 'Subscription Renewal - Growth Plan', amount: -2999, type: 'debit', status: 'success' },
    { id: 'TXN-005', date: '2023-12-06', description: 'Shipment #SHP-8812 Deduction', amount: -620, type: 'debit', status: 'failed' },
];

export default function FinancialsPage() {
    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <h2 className="text-2xl font-bold text-gray-900">Financial Overview</h2>

            <div className="grid gap-4 md:grid-cols-3">
                <MetricCard
                    title="Available Balance"
                    value={formatCurrency(24500)}
                    icon={Wallet}
                    className="bg-indigo-50 border-indigo-100"
                />
                <MetricCard
                    title="Total Spent (Dec)"
                    value={formatCurrency(12800)}
                    icon={CreditCard}
                    trend="up"
                    change={5.2}
                />
                <MetricCard
                    title="Pending COD Remittance"
                    value={formatCurrency(45200)}
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
                        <div className="space-y-4">
                            {transactions.map((txn) => (
                                <div key={txn.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-2 rounded-full ${txn.type === 'credit' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                            {txn.type === 'credit' ? <ArrowDownRight className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                                        </div>
                                        <div>
                                            <p className="font-medium text-[var(--text-primary)]">{txn.description}</p>
                                            <p className="text-xs text-[var(--text-muted)]">{txn.date} • {txn.id}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={`font-semibold ${txn.type === 'credit' ? 'text-emerald-600' : 'text-[var(--text-primary)]'}`}>
                                            {txn.type === 'credit' ? '+' : ''}{formatCurrency(txn.amount)}
                                        </p>
                                        <p className="text-xs text-[var(--text-muted)] capitalize">{txn.status}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
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
                            <Button variant="ghost" size="sm" className="w-full text-indigo-600">
                                + Add New Method
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
