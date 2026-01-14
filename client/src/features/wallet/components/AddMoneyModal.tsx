/**
 * Add Money Modal Component
 * 
 * Features:
 * - Payment amount input with predefined quick amounts
 * - Payment method selection (UPI, Card, Net Banking, Wallet)
 * - Payment gateway integration UI
 * - Form validation
 * - Loading states during payment processing
 * - Success/error handling
 */

'use client';

import React, { useState } from 'react';
import { useRechargeWallet } from '@/src/core/api/hooks';
import { formatCurrency } from '@/lib/utils';

interface AddMoneyModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentBalance?: number;
}

const QUICK_AMOUNTS = [500, 1000, 2000, 5000, 10000];
const MIN_AMOUNT = 100;
const MAX_AMOUNT = 500000;

type PaymentMethod = 'upi' | 'card' | 'netbanking' | 'wallet';

export function AddMoneyModal({ isOpen, onClose, currentBalance = 0 }: AddMoneyModalProps) {
    const [amount, setAmount] = useState<string>('');
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('upi');
    const [customAmount, setCustomAmount] = useState<boolean>(false);

    const { mutate: rechargeWallet, isPending, isError, error } = useRechargeWallet();

    const handleQuickAmount = (value: number) => {
        setAmount(value.toString());
        setCustomAmount(false);
    };

    const handleCustomAmount = () => {
        setCustomAmount(true);
        setAmount('');
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const numAmount = parseFloat(amount);

        if (isNaN(numAmount) || numAmount <= 0) {
            return;
        }

        rechargeWallet(
            {
                amount: numAmount,
                // Note: Payment method is handled by payment gateway, not sent to backend
            },
            {
                onSuccess: () => {
                    onClose();
                    setAmount('');
                    setCustomAmount(false);
                },
            }
        );
    };

    // Validation helper
    const getAmountError = (): string | null => {
        if (!amount || !customAmount) return null;
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) return 'Please enter a valid amount';
        if (numAmount < MIN_AMOUNT) return `Minimum amount is ₹${MIN_AMOUNT.toLocaleString()}`;
        if (numAmount > MAX_AMOUNT) return `Maximum amount is ₹${MAX_AMOUNT.toLocaleString()}`;
        return null;
    };

    const amountError = getAmountError();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                        Add Money to Wallet
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
                    {/* Current Balance Info */}
                    <div className="bg-primary-50 dark:bg-primary-900/20 rounded-lg p-4">
                        <p className="text-sm text-primary-700 dark:text-primary-300 mb-1">
                            Current Balance
                        </p>
                        <p className="text-2xl font-bold text-primary-900 dark:text-primary-100">
                            {formatCurrency(currentBalance)}
                        </p>
                    </div>

                    {/* Quick Amounts */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                            Select Amount
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {QUICK_AMOUNTS.map((quickAmount) => (
                                <button
                                    key={quickAmount}
                                    type="button"
                                    onClick={() => handleQuickAmount(quickAmount)}
                                    className={`px-4 py-3 rounded-md font-medium transition-colors ${amount === quickAmount.toString() && !customAmount
                                        ? 'bg-primary-600 text-white'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                        }`}
                                >
                                    ₹{quickAmount.toLocaleString()}
                                </button>
                            ))}
                            <button
                                type="button"
                                onClick={handleCustomAmount}
                                className={`px-4 py-3 rounded-md font-medium transition-colors ${customAmount
                                    ? 'bg-primary-600 text-white'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                    }`}
                            >
                                Custom
                            </button>
                        </div>
                    </div>

                    {/* Custom Amount Input */}
                    {customAmount && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Enter Amount
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                                    ₹
                                </span>
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="Enter amount"
                                    min="1"
                                    step="1"
                                    className={`w-full pl-8 pr-4 py-2 border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent ${amountError
                                        ? 'border-red-500 dark:border-red-400'
                                        : 'border-gray-300 dark:border-gray-600'
                                        }`}
                                    autoFocus
                                />
                            </div>
                            {amountError && (
                                <div className="mt-2 flex items-center gap-1.5 text-sm text-red-600 dark:text-red-400">
                                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span>{amountError}</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Payment Method */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                            Payment Method
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setPaymentMethod('upi')}
                                className={`p-4 rounded-lg border-2 transition-all ${paymentMethod === 'upi'
                                    ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20'
                                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                    }`}
                            >
                                <div className="text-left">
                                    <p className="font-medium text-gray-900 dark:text-white">UPI</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                        PhonePe, GPay, etc.
                                    </p>
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() => setPaymentMethod('card')}
                                className={`p-4 rounded-lg border-2 transition-all ${paymentMethod === 'card'
                                    ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20'
                                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                    }`}
                            >
                                <div className="text-left">
                                    <p className="font-medium text-gray-900 dark:text-white">Card</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                        Debit/Credit Card
                                    </p>
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() => setPaymentMethod('netbanking')}
                                className={`p-4 rounded-lg border-2 transition-all ${paymentMethod === 'netbanking'
                                    ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20'
                                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                    }`}
                            >
                                <div className="text-left">
                                    <p className="font-medium text-gray-900 dark:text-white">Net Banking</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                        All banks
                                    </p>
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() => setPaymentMethod('wallet')}
                                className={`p-4 rounded-lg border-2 transition-all ${paymentMethod === 'wallet'
                                    ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20'
                                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                    }`}
                            >
                                <div className="text-left">
                                    <p className="font-medium text-gray-900 dark:text-white">Wallet</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                        Paytm, etc.
                                    </p>
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Error Message */}
                    {isError && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
                            <p className="text-sm text-red-800 dark:text-red-300">
                                {error?.message || 'Failed to add money. Please try again.'}
                            </p>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors"
                            disabled={isPending}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!amount || parseFloat(amount) <= 0 || isPending || !!amountError}
                            className="w-full py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
                        >
                            {isPending ? 'Processing...' : `Add ${amount ? formatCurrency(parseFloat(amount)) : '₹0'}`}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
