/**
 * Request Payout Modal
 * 
 * Allows sellers to request on-demand COD payout:
 * - Shows available balance from eligible shipments
 * - Amount input with validation
 * - Estimated processing time
 * - Confirmation step
 * - Real-time integration with backend
 */

'use client';

import React, { useState } from 'react';
import { useRequestPayout, useCODStats } from '@/src/core/api/hooks';
import { formatCurrency } from '@/lib/utils';

interface RequestPayoutModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function RequestPayoutModal({ isOpen, onClose }: RequestPayoutModalProps) {
    const [amount, setAmount] = useState<string>('');
    const [showConfirmation, setShowConfirmation] = useState(false);

    const { data: stats } = useCODStats();
    const requestPayout = useRequestPayout();

    if (!isOpen) return null;

    const availableBalance = stats?.pending?.amount || 0;
    const numAmount = parseFloat(amount) || 0;
    const isValidAmount = numAmount > 0 && numAmount <= availableBalance;

    const handleRequest = async () => {
        if (!isValidAmount) return;

        try {
            await requestPayout.mutateAsync({ amount: numAmount });
            onClose();
            setAmount('');
            setShowConfirmation(false);
        } catch (error) {
            console.error('Failed to request payout:', error);
        }
    };

    const handleCancel = () => {
        setAmount('');
        setShowConfirmation(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
                {/* Backdrop */}
                <div
                    className="fixed inset-0 bg-black/50 transition-opacity"
                    onClick={handleCancel}
                />

                {/* Modal */}
                <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                            Request Payout
                        </h2>
                        <button
                            onClick={handleCancel}
                            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {!showConfirmation ? (
                        <>
                            {/* Available Balance */}
                            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                <p className="text-sm text-blue-600 dark:text-blue-400 mb-1">
                                    Available Balance
                                </p>
                                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                                    {formatCurrency(availableBalance)}
                                </p>
                                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                    From {stats?.pending?.count || 0} eligible shipments
                                </p>
                            </div>

                            {/* Amount Input */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Payout Amount
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                                        ₹
                                    </span>
                                    <input
                                        type="number"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        placeholder="0.00"
                                        className="w-full pl-8 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        max={availableBalance}
                                        step="0.01"
                                    />
                                </div>
                                {amount && !isValidAmount && (
                                    <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                                        {numAmount > availableBalance
                                            ? 'Amount exceeds available balance'
                                            : 'Please enter a valid amount'}
                                    </p>
                                )}
                            </div>

                            {/* Quick Amount Buttons */}
                            <div className="mb-6">
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                    Quick Select
                                </p>
                                <div className="grid grid-cols-3 gap-2">
                                    <button
                                        onClick={() => setAmount((availableBalance * 0.25).toString())}
                                        className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                                    >
                                        25%
                                    </button>
                                    <button
                                        onClick={() => setAmount((availableBalance * 0.5).toString())}
                                        className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                                    >
                                        50%
                                    </button>
                                    <button
                                        onClick={() => setAmount(availableBalance.toString())}
                                        className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                                    >
                                        100%
                                    </button>
                                </div>
                            </div>

                            {/* Info */}
                            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                <div className="flex items-start gap-3">
                                    <svg className="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <div className="text-sm text-gray-600 dark:text-gray-400">
                                        <p className="font-medium mb-1">Processing Time</p>
                                        <p>On-demand payouts are typically processed within 4 hours during business hours.</p>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3">
                                <button
                                    onClick={handleCancel}
                                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => setShowConfirmation(true)}
                                    disabled={!isValidAmount}
                                    className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    Continue
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Confirmation Step */}
                            <div className="mb-6 text-center">
                                <div className="mx-auto w-16 h-16 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mb-4">
                                    <svg className="w-8 h-8 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                    Confirm Payout Request
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    You are requesting a payout of
                                </p>
                            </div>

                            <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
                                <p className="text-3xl font-bold text-green-700 dark:text-green-300">
                                    {formatCurrency(numAmount)}
                                </p>
                            </div>

                            <div className="mb-6 space-y-2 text-sm text-gray-600 dark:text-gray-400">
                                <div className="flex justify-between">
                                    <span>Processing Fee:</span>
                                    <span className="font-medium text-gray-900 dark:text-white">₹0 (Free)</span>
                                </div>
                                <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                                    <span>You will receive:</span>
                                    <span className="font-bold text-gray-900 dark:text-white">
                                        {formatCurrency(numAmount)}
                                    </span>
                                </div>
                            </div>

                            {/* Confirmation Actions */}
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowConfirmation(false)}
                                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={handleRequest}
                                    disabled={requestPayout.isPending}
                                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    {requestPayout.isPending ? 'Processing...' : 'Confirm Request'}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
