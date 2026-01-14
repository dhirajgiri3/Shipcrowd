/**
 * Wallet Dashboard Page
 * 
 * Main wallet page displaying:
 * - Current balance with Add/Withdraw modals
 * - Recent transactions
 * - Wallet statistics
 * 
 * Route: /seller/wallet
 */

'use client';

import React, { useState } from 'react';
import { WalletBalanceCard, WalletTransactionList, AddMoneyModal, WithdrawMoneyModal } from '@/src/features/wallet';
import { WalletStatsWidget } from '@/src/features/wallet';
import { useWalletBalance } from '@/src/core/api/hooks';

export default function WalletPage() {
    const [showAddMoney, setShowAddMoney] = useState(false);
    const [showWithdraw, setShowWithdraw] = useState(false);
    const { data: balance } = useWalletBalance();

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
            {/* Page Header */}
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    Wallet
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                    Manage your wallet balance and view transaction history
                </p>
            </div>

            {/* Dashboard Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                {/* Balance Card - Takes 2 columns on large screens */}
                <div className="lg:col-span-2">
                    <WalletBalanceCard
                        onAddMoney={() => setShowAddMoney(true)}
                        onWithdraw={() => setShowWithdraw(true)}
                    />
                </div>

                {/* Stats Widget - Takes 1 column */}
                <div className="lg:col-span-1">
                    <WalletStatsWidget />
                </div>
            </div>

            {/* Transaction List - Full width */}
            <div className="mb-6">
                <WalletTransactionList />
            </div>

            {/* Modals */}
            <AddMoneyModal
                isOpen={showAddMoney}
                onClose={() => setShowAddMoney(false)}
                currentBalance={balance?.balance || 0}
            />
            <WithdrawMoneyModal
                isOpen={showWithdraw}
                onClose={() => setShowWithdraw(false)}
                currentBalance={balance?.balance || 0}
            />
        </div>
    );
}
