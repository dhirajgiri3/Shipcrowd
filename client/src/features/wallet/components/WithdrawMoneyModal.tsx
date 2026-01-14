/**
 * Withdraw Money Modal Component
 * 
 * Features:
 * - Withdrawal amount input with validation
 * - Bank account selection/management
 * - Minimum withdrawal amount enforcement
 * - Processing fee display
 * - Confirmation step
 * - Real-time balance check
 */

'use client';

import React, { useState } from 'react';
import { useWithdrawWallet } from '@/src/core/api/hooks';
import { formatCurrency } from '@/lib/utils';

interface WithdrawMoneyModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentBalance: number;
}

const MIN_WITHDRAWAL = 100;
const WITHDRAWAL_FEE_PERCENT = 0; // No fee for now
const WITHDRAWAL_FEE_FLAT = 0;

export function WithdrawMoneyModal({ isOpen, onClose, currentBalance }: WithdrawMoneyModalProps) {
    const [amount, setAmount] = useState<string>('');
    const [bankAccount, setBankAccount] = useState<string>('');
    const [showConfirmation, setShowConfirmation] = useState(false);

    const { mutate: withdrawWallet, isPending, isError, error } = useWithdrawWallet();

    const numAmount = parseFloat(amount) || 0;
    const processingFee = (numAmount * WITHDRAWAL_FEE_PERCENT) / 100 + WITHDRAWAL_FEE_FLAT;
    const totalAmount = numAmount + processingFee;
    const canWithdraw = numAmount >= MIN_WITHDRAWAL && totalAmount <= currentBalance;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!canWithdraw || !bankAccount) {
            return;
        }

        if (!showConfirmation) {
            setShowConfirmation(true);
            return;
        }

        withdrawWallet(
            {
                amount: numAmount,
                bankAccountId: bankAccount,
            },
            {
                onSuccess: () => {
                    onClose();
                    setAmount('');
                    setBankAccount('');
                    setShowConfirmation(false);
                },
            }
        );
    };

    const handleBackToForm = () => {
        setShowConfirmation(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                        {showConfirmation ? 'Confirm Withdrawal' : 'Withdraw Money'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {!showConfirmation ? (
                        <>
                            {/* Current Balance Info */}
                            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                                    Available Balance
                                </p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {formatCurrency(currentBalance)}
                                </p>
                            </div>

                            {/* Withdrawal Amount */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Withdrawal Amount
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                                        ₹
                                    </span>
                                    <input
                                        type="number"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        placeholder={`Min ${MIN_WITHDRAWAL}`}
                                        min={MIN_WITHDRAWAL}
                                        step="1"
                                        className="w-full pl-8 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    />
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    Minimum withdrawal: {formatCurrency(MIN_WITHDRAWAL)}
                                </p>
                            </div>

                            {/* Bank Account Selection */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Bank Account
                                </label>
                                <select
                                    value={bankAccount}
                                    onChange={(e) => setBankAccount(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                >
                                    <option value="">Select bank account</option>
                                    <option value="primary">HDFC Bank - ****1234 (Primary)</option>
                                    <option value="secondary">ICICI Bank - ****5678</option>
                                </select>
                            </div>

                            {/* Fee Breakdown */}
                            {numAmount > 0 && (
                                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600 dark:text-gray-400">Withdrawal Amount</span>
                                        <span className="font-medium text-gray-900 dark:text-white">
                                            {formatCurrency(numAmount)}
                                        </span>
                                    </div>
                                    {processingFee > 0 && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600 dark:text-gray-400">Processing Fee</span>
                                            <span className="font-medium text-gray-900 dark:text-white">
                                                {formatCurrency(processingFee)}
                                            </span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-sm pt-2 border-t border-blue-200 dark:border-blue-800">
                                        <span className="font-semibold text-gray-900 dark:text-white">
                                            Total Deducted
                                        </span>
                                        <span className="font-semibold text-gray-900 dark:text-white">
                                            {formatCurrency(totalAmount)}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Validation Errors */}
                            {numAmount > 0 && numAmount < MIN_WITHDRAWAL && (
                                <p className="text-sm text-red-600 dark:text-red-400">
                                    Minimum withdrawal amount is {formatCurrency(MIN_WITHDRAWAL)}
                                </p>
                            )}
                            {totalAmount > currentBalance && (
                                <p className="text-sm text-red-600 dark:text-red-400">
                                    Insufficient balance (including fees)
                                </p>
                            )}
                        </>
                    ) : (
                        <>
                            {/* Confirmation View */}
                            <div className="space-y-4">
                                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                                    <div className="flex items-start gap-3">
                                        <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                        <div>
                                            <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                                                Confirm Withdrawal
                                            </p>
                                            <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                                                Please review the details before confirming
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-3">
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-600 dark:text-gray-400">Amount</span>
                                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                                            {formatCurrency(numAmount)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-600 dark:text-gray-400">Bank Account</span>
                                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                                            {bankAccount === 'primary' ? 'HDFC ****1234' : 'ICICI ****5678'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between pt-3 border-t border-gray-200 dark:border-gray-600">
                                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                            Total Deducted
                                        </span>
                                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                            {formatCurrency(totalAmount)}
                                        </span>
                                    </div>
                                </div>

                                <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                                    Funds will be transferred to your bank account within 1-2 business days
                                </p>
                            </div>
                        </>
                    )}

                    {/* Error Message */}
                    {isError && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
                            <p className="text-sm text-red-800 dark:text-red-300">
                                {error?.message || 'Failed to process withdrawal. Please try again.'}
                            </p>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={showConfirmation ? handleBackToForm : onClose}
                            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors"
                            disabled={isPending}
                        >
                            {showConfirmation ? 'Back' : 'Cancel'}
                        </button>
                        <button
                            type="submit"
                            disabled={!canWithdraw || !bankAccount || isPending}
                            className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white rounded-md font-medium transition-colors disabled:cursor-not-allowed"
                        >
                            {isPending ? 'Processing...' : showConfirmation ? 'Confirm Withdrawal' : 'Continue'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
