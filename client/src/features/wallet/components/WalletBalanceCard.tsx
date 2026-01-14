/**
 * Wallet Balance Card Component
 * 
 * Displays current wallet balance with real-time data from backend.
 * Features:
 * - Real-time balance from GET /finance/wallet/balance
 * - Loading and error states
 * - Formatted currency display
 * - Quick action buttons (Add Money, Withdraw)
 */

'use client';

import React from 'react';
import { useWalletBalance } from '@/src/core/api/hooks';
import { formatCurrency } from '@/lib/utils';

interface WalletBalanceCardProps {
    onAddMoney?: () => void;
    onWithdraw?: () => void;
}

export function WalletBalanceCard({ onAddMoney, onWithdraw }: WalletBalanceCardProps = {}) {
    const { data: balance, isLoading, isError, error } = useWalletBalance();

    if (isLoading) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 animate-pulse">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-4"></div>
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-6"></div>
                <div className="flex gap-3">
                    <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                    <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                </div>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm">Failed to load wallet balance</span>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-br from-primary-600 to-primary-700 dark:from-primary-700 dark:to-primary-800 rounded-lg shadow-lg p-6 text-white">
            {/* Balance Label */}
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-primary-100">
                    Current Balance
                </h3>
                <svg className="w-5 h-5 text-primary-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            </div>

            {/* Balance Amount */}
            <div className="mb-6">
                <p className="text-4xl font-bold mb-1">
                    {formatCurrency(balance?.balance || 0, balance?.currency || 'INR')}
                </p>
                {balance?.lastUpdated && (
                    <p className="text-xs text-primary-200">
                        Last updated: {new Date(balance.lastUpdated).toLocaleString()}
                    </p>
                )}
            </div>

            {/* Quick Actions */}
            <div className="flex gap-3">
                <button
                    className="flex-1 bg-white text-primary-700 hover:bg-primary-50 px-4 py-2 rounded-md font-medium transition-colors duration-200 flex items-center justify-center gap-2"
                    onClick={onAddMoney}
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Money
                </button>
                <button
                    className="flex-1 bg-primary-800 hover:bg-primary-900 px-4 py-2 rounded-md font-medium transition-colors duration-200 flex items-center justify-center gap-2"
                    onClick={onWithdraw}
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                    Withdraw
                </button>
            </div>
        </div>
    );
}
