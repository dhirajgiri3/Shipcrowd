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

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import Script from 'next/script';
import { Plus, Wallet as WalletIcon, Zap } from 'lucide-react';
import { Button } from '@/src/components/ui/core/Button';
import { PageHeader } from '@/src/components/ui/layout/PageHeader';
import { CardSkeleton } from '@/src/components/ui/data/Skeleton';
import {
    WalletHero,
    QuickAddMoney,
    TransactionList,
    AutoRechargeSettings
} from '@/src/components/seller/wallet';
import type { PaymentMethod } from '@/src/components/seller/wallet';
import type { Transaction as WalletUiTransaction } from '@/src/components/seller/wallet';
import { useToast } from '@/src/components/ui/feedback/Toast';
import { useInitWalletRecharge, useWalletBalance, useWalletTransactions, useRechargeWallet, useWalletStats } from '@/src/core/api/hooks/finance/useWallet';
import { useAutoRechargeSettings, useUpdateAutoRecharge } from '@/src/core/api/hooks/finance/useAutoRecharge';
import { useProfile } from '@/src/core/api/hooks/settings/useProfile';
import type { AutoRechargeSettings as WalletAutoRechargeSettings } from '@/src/core/api/clients/finance/walletApi';
import type { WalletTransaction } from '@/src/types/api/finance';

export function WalletPageClient() {
    const [isAddMoneyOpen, setIsAddMoneyOpen] = useState(false);
    const [isAutoRechargeOpen, setIsAutoRechargeOpen] = useState(false);
    const [isRazorpayLoaded, setIsRazorpayLoaded] = useState(false);
    const { addToast } = useToast();

    const { data: balanceData, isLoading: balanceLoading, error: balanceError } = useWalletBalance();
    const { data: transactionsData, isLoading: transactionsLoading } = useWalletTransactions({ limit: 20 });
    const { data: walletStats } = useWalletStats();
    const { data: autoRechargeSettings } = useAutoRechargeSettings();
    const { data: profile } = useProfile();
    const initRecharge = useInitWalletRecharge();
    const rechargeWallet = useRechargeWallet({
        onError: () => {}, // Suppress hook toast - we show inline in QuickAddMoney / handler catch
    });
    const updateAutoRecharge = useUpdateAutoRecharge();
    const getErrorMessage = (error: unknown, fallback: string) =>
        error instanceof Error ? error.message : fallback;

    // Calculate weekly change from wallet stats if available
    const weeklyChange = useMemo(() => {
        if (!walletStats) return 0;
        // TODO: Implement weekly change calculation from wallet stats
        // This would require comparing current week vs previous week spending
        return 0;
    }, [walletStats]);

    const mapWalletTransactionToUi = (tx: WalletTransaction): WalletUiTransaction => {
        const categoryByReason: Record<string, WalletUiTransaction['category']> = {
            recharge: 'recharge',
            refund: 'refund',
            cod_remittance: 'cod_remittance',
            shipping_cost: 'order',
            rto_charge: 'fee',
            adjustment: 'fee',
            promotional_credit: 'recharge',
            weight_discrepancy: 'fee',
            other: 'fee',
        };

        const transactionType: WalletUiTransaction['type'] = tx.type === 'debit' ? 'debit' : 'credit';

        return {
            id: tx._id,
            type: transactionType,
            amount: Number(tx.amount || 0),
            category: categoryByReason[tx.reason] || 'fee',
            description: tx.description || 'Wallet transaction',
            context: {
                orderId: tx.reference?.type === 'order' ? tx.reference.id : undefined,
                awb: tx.reference?.type === 'shipment' ? tx.reference.externalId : undefined,
            },
            timestamp: tx.createdAt || tx.updatedAt || new Date().toISOString(),
            runningBalance: Number(tx.balanceAfter ?? tx.balanceBefore ?? 0),
        };
    };

    const handleRechargeSubmit = async (amount: number, method: PaymentMethod) => {
        if (!isRazorpayLoaded) {
            throw new Error('Payment gateway failed to load. Please refresh and try again.');
        }

        let init;
        try {
            init = await initRecharge.mutateAsync({ amount });
        } catch (error) {
            console.error('Recharge init failed:', error);
            throw new Error('Failed to process recharge. Please try again.');
        }
        if (!(init.key || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID)) {
            addToast('Razorpay key is not configured. Please contact support.', 'error');
            return;
        }

        const options: RazorpayOptions = {
            key: init.key || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '',
            amount: Math.round(init.amount * 100),
            currency: init.currency || 'INR',
            name: 'Shipcrowd Logistics',
            description: `Wallet Recharge via ${method.toUpperCase()}`,
            image: 'https://shipcrowd.com/logo.png',
            order_id: init.orderId,
            prefill: {
                name: profile?.name || '',
                email: profile?.email || '',
                contact: profile?.phone || '',
            },
            handler: async (response) => {
                try {
                    await rechargeWallet.mutateAsync({
                        amount: init.amount,
                        paymentId: response.razorpay_payment_id,
                        orderId: response.razorpay_order_id,
                        signature: response.razorpay_signature,
                    });
                    setIsAddMoneyOpen(false);
                    // Success toast shown by useRechargeWallet onSuccess
                } catch (error) {
                    console.error('Recharge verification failed:', error);
                    addToast('Payment captured but wallet credit failed. Please contact support.', 'error');
                }
            },
            theme: {
                color: '#2563EB',
            },
        };

        const razorpay = new window.Razorpay(options);
        razorpay.open();
    };

    const handleSaveAutoRecharge = async (settings: Partial<WalletAutoRechargeSettings>) => {
        try {
            await updateAutoRecharge.mutateAsync(settings);
            setIsAutoRechargeOpen(false);
            addToast(
                settings.enabled
                    ? 'Auto-recharge enabled successfully'
                    : 'Auto-recharge settings updated',
                'success'
            );
        } catch (error: unknown) {
            console.error('Auto-recharge update failed:', error);
            addToast(getErrorMessage(error, 'Failed to save settings'), 'error');
        }
    };

    // Loading State
    if (balanceLoading) {
        return (
            <div className="min-h-screen space-y-8 pb-20">
                <PageHeader
                    title="Wallet"
                    breadcrumbs={[
                        { label: 'Dashboard', href: '/seller/dashboard' },
                        { label: 'Wallet', active: true },
                    ]}
                />
                <CardSkeleton />
                <CardSkeleton />
            </div>
        );
    }

    // Error State
    if (balanceError) {
        return (
            <div className="min-h-screen space-y-8 pb-20">
                <PageHeader
                    title="Wallet"
                    breadcrumbs={[
                        { label: 'Dashboard', href: '/seller/dashboard' },
                        { label: 'Wallet', active: true },
                    ]}
                />
                <div className="flex items-center justify-center py-12">
                    <div className="max-w-md w-full bg-[var(--bg-primary)] rounded-2xl p-8 text-center space-y-4 border border-[var(--border-default)]">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--error-bg)]">
                            <WalletIcon className="w-8 h-8 text-[var(--error)]" />
                        </div>
                        <h3 className="text-lg font-bold text-[var(--text-primary)]">
                            Unable to Load Wallet
                        </h3>
                        <p className="text-sm text-[var(--text-secondary)]">
                            We couldn&apos;t fetch your wallet information. Please refresh the page or try again later.
                        </p>
                        <Button
                            onClick={() => window.location.reload()}
                            className="mt-4"
                        >
                            Refresh Page
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    const balance = balanceData?.balance || 0;
    const transactions = (transactionsData?.transactions || []).map(mapWalletTransactionToUi);
    const isAutoRechargeEnabled = !!autoRechargeSettings?.enabled;
    const lowBalanceThreshold = balanceData?.lowBalanceThreshold ?? 1000;

    // Calculate average weekly spend from wallet stats if available
    const averageWeeklySpend = useMemo(() => {
        if (!walletStats) return undefined;
        // If stats has weekly data, use it; otherwise undefined to hide
        // TODO: Add weekly spend calculation when stats endpoint provides this data
        return undefined;
    }, [walletStats]);

    // Empty State for Transactions
    const hasTransactions = transactions.length > 0;

    return (
        <div className="min-h-screen space-y-8 pb-20 animate-fade-in">
            <Script
                id="razorpay-checkout-js"
                src="https://checkout.razorpay.com/v1/checkout.js"
                onLoad={() => setIsRazorpayLoaded(true)}
            />

            {/* Page Header */}
            <PageHeader
                title="Wallet"
                breadcrumbs={[
                    { label: 'Dashboard', href: '/seller/dashboard' },
                    { label: 'Wallet', active: true },
                ]}
                actions={
                    <div className="flex items-center gap-3">
                        {!isAutoRechargeEnabled && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setIsAutoRechargeOpen(true)}
                                className="h-10 px-4 rounded-xl"
                            >
                                <Zap className="w-4 h-4 mr-2" />
                                Enable Auto-Recharge
                            </Button>
                        )}
                        <Button
                            size="sm"
                            onClick={() => setIsAddMoneyOpen(true)}
                            className="h-10 px-5 rounded-xl"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Money
                        </Button>
                    </div>
                }
            />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
                {/* Wallet Hero Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    <WalletHero
                        balance={balance}
                        weeklyChange={weeklyChange}
                        lowBalanceThreshold={lowBalanceThreshold}
                        averageWeeklySpend={averageWeeklySpend}
                        onAddMoney={() => setIsAddMoneyOpen(true)}
                        onEnableAutoRecharge={() => setIsAutoRechargeOpen(true)}
                        isAutoRechargeEnabled={isAutoRechargeEnabled}
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
                            transactions={transactions}
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

            {/* Auto-Recharge Settings Modal */}
            <AutoRechargeSettings
                isOpen={isAutoRechargeOpen}
                onClose={() => setIsAutoRechargeOpen(false)}
                onSave={handleSaveAutoRecharge}
                currentSettings={autoRechargeSettings}
                isLoading={updateAutoRecharge.isPending}
            />
        </div>
    );
}
