/**
 * Wallet Page Client Component
 * 
 * Handles client-side interactivity for wallet page:
 * - Modal state (Add Money, Withdraw)
 * - Component orchestration
 */

'use client';

import { useState } from 'react';
import { WalletBalanceCard, WalletTransactionList, AddMoneyModal } from '@/src/features/wallet';
import { WalletStatsWidget } from '@/src/features/wallet';
import { useWalletBalance } from '@/src/core/api/hooks';

export function WalletPageClient() {
    const [showAddMoney, setShowAddMoney] = useState(false);
    const [showWithdraw, setShowWithdraw] = useState(false);
    const { data: balance } = useWalletBalance();

    return (
        <>
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

        </>
    );
}
