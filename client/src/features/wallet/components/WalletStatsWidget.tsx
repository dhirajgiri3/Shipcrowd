/**
 * Wallet Stats Widget Component
 * 
 * Displays wallet statistics for a given period.
 * Features:
 * - Total credits, debits, net flow
 * - Transaction count
 * - Average transaction value
 * - Data from GET /finance/wallet/stats
 */

'use client';

import React, { useState } from 'react';
import { useWalletStats } from '@/src/core/api/hooks';
import { formatCurrency, formatCompactCurrency } from '@/src/lib/utils';

export function WalletStatsWidget() {
    const [dateRange] = useState<{ startDate: string; endDate: string } | undefined>(undefined);
    const { data: stats, isLoading, isError } = useWalletStats(dateRange);

    if (isLoading) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 animate-pulse">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-4"></div>
                <div className="space-y-3">
                    {[...Array(4)].map((_, i) => (
                        <div key={i}>
                            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20 mb-1"></div>
                            <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-28"></div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (isError || !stats) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                    Wallet Statistics
                </h3>
                <p className="text-sm text-red-600 dark:text-red-400">
                    Failed to load statistics
                </p>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                Wallet Statistics
            </h3>

            <div className="space-y-4">
                {/* Total Credits */}
                <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                        Total Credits
                    </p>
                    <p className="text-lg font-bold text-green-600 dark:text-green-400">
                        {formatCompactCurrency(stats.totalCredits)}
                    </p>
                </div>

                {/* Total Debits */}
                <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                        Total Debits
                    </p>
                    <p className="text-lg font-bold text-red-600 dark:text-red-400">
                        {formatCompactCurrency(stats.totalDebits)}
                    </p>
                </div>

                {/* Net Flow */}
                <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                        Net Flow
                    </p>
                    <p className={`text-lg font-bold ${stats.netFlow >= 0
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                        }`}>
                        {stats.netFlow >= 0 ? '+' : ''}{formatCompactCurrency(Math.abs(stats.netFlow))}
                    </p>
                </div>

                {/* Transaction Count */}
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                        Total Transactions
                    </p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                        {stats.transactionCount.toLocaleString()}
                    </p>
                </div>

                {/* Average Transaction */}
                <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                        Avg Transaction
                    </p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                        {formatCurrency(stats.averageTransaction)}
                    </p>
                </div>
            </div>
        </div>
    );
}
