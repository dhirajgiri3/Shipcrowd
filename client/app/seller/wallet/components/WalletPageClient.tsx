/**
 * Wallet Page Client Component
 * 
 * Comprehensive financial dashboard displaying:
 * - Wallet balance with hero display
 * - Spending insights and analytics
 * - Transaction history
 * - Quick recharge functionality
 * 
 * Route: /seller/wallet
 */

"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Truck, Package, CreditCard, Wallet as WalletIcon } from 'lucide-react';
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

export function WalletPageClient() {
    const [isAddMoneyOpen, setIsAddMoneyOpen] = useState(false);
    const { addToast } = useToast();

    const { data: balanceData, isLoading: balanceLoading, error: balanceError } = useWalletBalance();
    const { data: transactionsData, isLoading: transactionsLoading } = useWalletTransactions({ limit: 20 });
    const rechargeWallet = useRechargeWallet();

    const handleRechargeSubmit = async (amount: number, _method: PaymentMethod) => {
        try {
            const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
            await rechargeWallet.mutateAsync({ amount, paymentId });
            setIsAddMoneyOpen(false);
            addToast('Wallet recharged successfully', 'success');
        } catch (error) {
            console.error('Recharge failed:', error);
            addToast('Failed to process recharge. Please try again.', 'error');
        }
    };

    // Loading State
    if (balanceLoading) {
        return (
            <div className="min-h-screen bg-[var(--bg-secondary)] flex items-center justify-center">
                <div className="text-center space-y-4">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--primary-blue)]/10">
                        <WalletIcon className="w-8 h-8 text-[var(--primary-blue)] animate-pulse" />
                    </div>
                    <p className="text-[var(--text-secondary)] text-sm font-medium">Loading wallet...</p>
                </div>
            </div>
        );
    }

    // Error State
    if (balanceError) {
        return (
            <div className="min-h-screen bg-[var(--bg-secondary)] flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-[var(--bg-primary)] rounded-2xl p-8 text-center space-y-4 border border-[var(--border-default)]">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10">
                        <WalletIcon className="w-8 h-8 text-red-500" />
                    </div>
                    <h3 className="text-lg font-bold text-[var(--text-primary)]">
                        Unable to Load Wallet
                    </h3>
                    <p className="text-sm text-[var(--text-secondary)]">
                        We couldn't fetch your wallet information. Please refresh the page or try again later.
                    </p>
                    <Button
                        onClick={() => window.location.reload()}
                        className="mt-4"
                    >
                        Refresh Page
                    </Button>
                </div>
            </div>
        );
    }

    const balance = balanceData?.balance || 0;
    const transactions = transactionsData?.transactions || [];
    const weeklyChange = 0; // TODO: Calculate from backend analytics

    // Empty State for Transactions
    const hasTransactions = transactions.length > 0;

    return (
        <div className="min-h-screen bg-[var(--bg-secondary)]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
                {/* Wallet Hero Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    <WalletHero
                        balance={balance}
                        weeklyChange={weeklyChange}
                        lowBalanceThreshold={10000}
                        averageWeeklySpend={8450}
                        onAddMoney={() => setIsAddMoneyOpen(true)}
                    />
                </motion.div>

                {/* Spending Insights - Future Enhancement */}
                {/* Will be enabled when backend analytics are ready */}
                {/* <motion.div 
                    initial={{ opacity: 0, y: 20 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    transition={{ delay: 0.1 }}
                >
                    <SpendingInsights
                        thisWeekSpend={8450}
                        lastWeekSpend={7200}
                        categories={[
                            { name: 'Shipping Costs', amount: 6200, percentage: 73, icon: Truck, color: 'bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400' },
                            { name: 'Packaging', amount: 1450, percentage: 17, icon: Package, color: 'bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400' },
                            { name: 'Transaction Fees', amount: 800, percentage: 10, icon: CreditCard, color: 'bg-orange-100 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400' }
                        ]}
                        avgOrderCost={385}
                        recommendations={[
                            'Switch to Blue Dart for Mumbai deliveries to save ₹45/order',
                            'Bulk order packaging materials to save 15% on material costs',
                            'Enable auto-recharge at ₹10,000 to avoid payment failures'
                        ]}
                    />
                </motion.div> */}

                {/* Transactions Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    {hasTransactions ? (
                        <TransactionList
                            transactions={transactions as any}
                            isLoading={transactionsLoading}
                        />
                    ) : (
                        <div className="bg-[var(--bg-primary)] rounded-2xl p-12 text-center border border-[var(--border-default)]">
                            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[var(--primary-blue)]/10 mb-4">
                                <WalletIcon className="w-10 h-10 text-[var(--primary-blue)]" />
                            </div>
                            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">
                                No Transactions Yet
                            </h3>
                            <p className="text-sm text-[var(--text-secondary)] mb-6 max-w-md mx-auto">
                                Your transaction history will appear here once you start using your wallet for shipments and recharges.
                            </p>
                            <Button
                                onClick={() => setIsAddMoneyOpen(true)}
                                className="inline-flex items-center gap-2"
                            >
                                <Plus className="w-4 h-4" />
                                Add Money to Get Started
                            </Button>
                        </div>
                    )}
                </motion.div>

                {/* Mobile FAB - Add Money */}
                <div className="fixed bottom-6 right-6 md:hidden z-40">
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setIsAddMoneyOpen(true)}
                        className="h-14 w-14 rounded-full shadow-2xl bg-[var(--primary-blue)] hover:bg-[var(--primary-blue-deep)] text-white flex items-center justify-center transition-colors"
                        aria-label="Add money to wallet"
                    >
                        <Plus className="h-6 w-6" />
                    </motion.button>
                </div>
            </div>

            {/* Add Money Modal */}
            <QuickAddMoney
                isOpen={isAddMoneyOpen}
                onClose={() => setIsAddMoneyOpen(false)}
                onSubmit={handleRechargeSubmit}
            />
        </div>
    );
}
