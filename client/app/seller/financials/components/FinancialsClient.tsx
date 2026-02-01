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

// Mock insights data
const MOCK_INSIGHTS = {
    thisWeekSpend: 8450,
    lastWeekSpend: 7200,
    categories: [
        { name: 'Shipping Costs', amount: 6200, percentage: 73, icon: Truck, color: 'bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400' },
        { name: 'Packaging', amount: 1450, percentage: 17, icon: Package, color: 'bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400' },
        { name: 'Transaction Fees', amount: 800, percentage: 10, icon: CreditCard, color: 'bg-orange-100 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400' }
    ],
    avgOrderCost: 385,
    recommendations: [
        'Switch to Blue Dart for Mumbai deliveries to save ₹45/order',
        'Bulk order packaging materials to save 15% on material costs',
        'Enable auto-recharge at ₹10,000 to avoid payment failures'
    ]
};

export function FinancialsClient() {
    const [isAddMoneyOpen, setIsAddMoneyOpen] = useState(false);
    const { addToast } = useToast();

    const { data: balanceData, isLoading: balanceLoading } = useWalletBalance();
    const { data: transactionsData } = useWalletTransactions({ limit: 20 });
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

    if (balanceLoading) {
        return (
            <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
                <p className="text-[var(--text-secondary)]">Loading...</p>
            </div>
        );
    }

    const balance = balanceData?.balance || 0;
    const transactions = transactionsData?.transactions || [];
    const insights: any = null; // Will be implemented in future phase
    const weeklyChange = 0;

    return (
        <div className="min-h-screen bg-[var(--bg-primary)]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    <WalletHero
                        balance={balance}
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

                {transactions.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                        <TransactionList transactions={transactions as any} />
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
