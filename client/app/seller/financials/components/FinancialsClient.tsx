"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Truck, Package, CreditCard } from 'lucide-react';
import { Button } from '@/src/components/ui/core/Button';
import {
    WalletHero,
    SpendingInsights,
    QuickAddMoney,
    TransactionList
} from '@/src/components/seller/wallet';
import type { PaymentMethod } from '@/src/components/seller/wallet';
import { useToast } from '@/src/components/ui/feedback/Toast';
import { useWalletBalance, useWalletTransactions, useRechargeWallet } from '@/src/core/api/hooks/finance/useWallet';

const CATEGORY_ICONS = {
    'Shipping Costs': Truck,
    'Packaging': Package,
    'Transaction Fees': CreditCard,
    'Other': CreditCard
} as const;

const CATEGORY_COLORS = {
    'Shipping Costs': 'bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400',
    'Packaging': 'bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400',
    'Transaction Fees': 'bg-orange-100 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400',
    'Other': 'bg-gray-100 dark:bg-gray-950/30 text-gray-700 dark:text-gray-400'
} as const;

export function FinancialsClient() {
    const [isAddMoneyOpen, setIsAddMoneyOpen] = useState(false);
    const { addToast } = useToast();

    const { data: balanceData, isLoading: balanceLoading } = useWalletBalance();
    const { data: transactionsData, isLoading: transactionsLoading } = useWalletTransactions({ limit: 20 });
    const rechargeWallet = useRechargeWallet();

    const handleRechargeSubmit = async (amount: number, _method: PaymentMethod) => {
        try {
            const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
            await rechargeWallet.mutateAsync({ amount, paymentId });
            setIsAddMoneyOpen(false);
        } catch (error) {
            addToast('Failed to process recharge', 'error');
        }
    };

    // Calculate insights from transactions
    const calculateInsights = () => {
        if (!transactionsData?.transactions) return null;

        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

        const thisWeekTxns = transactionsData.transactions.filter(
            t => new Date(t.createdAt) >= weekAgo && t.type === 'debit'
        );
        const lastWeekTxns = transactionsData.transactions.filter(
            t => new Date(t.createdAt) >= twoWeeksAgo && new Date(t.createdAt) < weekAgo && t.type === 'debit'
        );

        const thisWeekTotal = thisWeekTxns.reduce((sum, t) => sum + t.amount, 0);
        const lastWeekTotal = lastWeekTxns.reduce((sum, t) => sum + t.amount, 0);

        const categorize = (txns: typeof thisWeekTxns) => {
            const categories: Record<string, number> = {};
            txns.forEach(t => {
                const cat = t.reason.includes('ship') ? 'Shipping Costs' :
                            t.reason.includes('pack') ? 'Packaging' :
                            t.reason.includes('fee') ? 'Transaction Fees' : 'Other';
                categories[cat] = (categories[cat] || 0) + t.amount;
            });
            return Object.entries(categories).map(([name, amount]) => ({
                name,
                amount,
                percentage: thisWeekTotal > 0 ? Math.round((amount / thisWeekTotal) * 100) : 0,
                icon: CATEGORY_ICONS[name as keyof typeof CATEGORY_ICONS] || CreditCard,
                color: CATEGORY_COLORS[name as keyof typeof CATEGORY_COLORS] || CATEGORY_COLORS.Other
            }));
        };

        return {
            thisWeekSpend: thisWeekTotal,
            lastWeekSpend: lastWeekTotal,
            categories: categorize(thisWeekTxns),
            avgOrderCost: thisWeekTxns.length > 0 ? Math.round(thisWeekTotal / thisWeekTxns.length) : 0,
            recommendations: [
                balanceData && balanceData.balance < 10000 ? 'Low balance - consider recharging' : null,
                'Review shipping costs for optimization opportunities',
                'Check for bulk packaging material discounts'
            ].filter(Boolean) as string[]
        };
    };

    const insights = calculateInsights();
    const weeklyChange = insights && insights.lastWeekSpend > 0
        ? Math.round(((insights.thisWeekSpend - insights.lastWeekSpend) / insights.lastWeekSpend) * 100)
        : 0;

    if (balanceLoading) {
        return (
            <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
                <p className="text-[var(--text-secondary)]">Loading...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[var(--bg-primary)]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    <WalletHero
                        balance={balanceData?.balance || 0}
                        weeklyChange={weeklyChange}
                        lowBalanceThreshold={10000}
                        averageWeeklySpend={insights?.thisWeekSpend || 0}
                        onAddMoney={() => setIsAddMoneyOpen(true)}
                    />
                </motion.div>

                {insights && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                        <SpendingInsights
                            thisWeekSpend={insights.thisWeekSpend}
                            lastWeekSpend={insights.lastWeekSpend}
                            categories={insights.categories}
                            avgOrderCost={insights.avgOrderCost}
                            recommendations={insights.recommendations}
                        />
                    </motion.div>
                )}

                {!transactionsLoading && transactionsData?.transactions && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                        <TransactionList transactions={transactionsData.transactions as any} />
                    </motion.div>
                )}

                <div className="fixed bottom-6 right-6 md:hidden z-40">
                    <Button
                        onClick={() => setIsAddMoneyOpen(true)}
                        size="lg"
                        className="h-14 w-14 rounded-full shadow-2xl bg-[var(--primary-blue)]"
                    >
                        <Plus className="h-6 w-6" />
                    </Button>
                </div>
            </div>

            <QuickAddMoney
                isOpen={isAddMoneyOpen}
                onClose={() => setIsAddMoneyOpen(false)}
                onSubmit={handleRechargeSubmit}
            />
        </div>
    );
}
