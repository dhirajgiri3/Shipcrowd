/**
 * Wallet Transaction List Component
 * 
 * Displays paginated transaction history with real-time data from backend.
 * Features:
 * - Real-time transactions from GET /finance/wallet/transactions
 * - Pagination support
 * - Filter by type (credit/debit) and reason
 * - Loading skeleton
 * - Empty state
 */

'use client';

import React, { useState } from 'react';
import { useWalletTransactions } from '@/src/core/api/hooks';
import { formatCurrency } from '@/lib/utils';
import type { TransactionFilters, WalletTransaction } from '@/src/types/api/wallet.types';

export function WalletTransactionList() {
    const [filters, setFilters] = useState<TransactionFilters>({
        page: 1,
        limit: 10,
    });

    const { data, isLoading, isError } = useWalletTransactions(filters);

    // Transaction type badge colors
    const getTypeBadge = (type: 'credit' | 'debit') => {
        return type === 'credit'
            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    };

    // Transaction reason display text
    const getReasonText = (reason: string) => {
        const reasonMap: Record<string, string> = {
            recharge: 'Wallet Recharge',
            shipping_cost: 'Shipping Cost',
            rto_charge: 'RTO Charge',
            cod_remittance: 'COD Remittance',
            refund: 'Refund',
            other: 'Other',
        };
        return reasonMap[reason] || reason;
    };

    if (isLoading) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Recent Transactions</h3>
                <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-md animate-pulse">
                            <div className="flex-1">
                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-2"></div>
                                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-48"></div>
                            </div>
                            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Recent Transactions</h3>
                <div className="flex items-center justify-center py-8 text-red-600 dark:text-red-400">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Failed to load transactions
                </div>
            </div>
        );
    }

    if (!data?.transactions || data.transactions.length === 0) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Recent Transactions</h3>
                <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
                    <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-sm">No transactions yet</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Recent Transactions</h3>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                    {data.pagination.total} total
                </span>
            </div>

            {/* Filters */}
            <div className="flex gap-2 mb-4">
                <button
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${!filters.type
                        ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                        }`}
                    onClick={() => setFilters({ ...filters, type: undefined, page: 1 })}
                >
                    All
                </button>
                <button
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${filters.type === 'credit'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                        }`}
                    onClick={() => setFilters({ ...filters, type: 'credit', page: 1 })}
                >
                    Credits
                </button>
                <button
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${filters.type === 'debit'
                        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                        }`}
                    onClick={() => setFilters({ ...filters, type: 'debit', page: 1 })}
                >
                    Debits
                </button>
            </div>

            {/* Transaction List */}
            <div className="space-y-3">
                {data.transactions.map((transaction: WalletTransaction) => (
                    <div
                        key={transaction._id}
                        className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getTypeBadge(transaction.type)}`}>
                                    {transaction.type.toUpperCase()}
                                </span>
                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                    {getReasonText(transaction.reason)}
                                </span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                {transaction.description}
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                {new Date(transaction.createdAt).toLocaleString()}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className={`text-lg font-semibold ${transaction.type === 'credit'
                                ? 'text-green-600 dark:text-green-400'
                                : 'text-red-600 dark:text-red-400'
                                }`}>
                                {transaction.type === 'credit' ? '+' : '-'}{formatCurrency(transaction.amount)}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Balance: {formatCurrency(transaction.balanceAfter)}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Pagination */}
            {data.pagination.pages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={() => setFilters({ ...filters, page: (filters.page || 1) - 1 })}
                        disabled={!data.pagination.hasPrev}
                    >
                        Previous
                    </button>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                        Page {data.pagination.page} of {data.pagination.pages}
                    </span>
                    <button
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={() => setFilters({ ...filters, page: (filters.page || 1) + 1 })}
                        disabled={!data.pagination.hasNext}
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    );
}
