/**
 * Refund Modal Component
 * 
 * Enhanced confirmation modal for processing refunds with:
 * - Refund method selection (Wallet, Original Payment, Bank Transfer)
 * - Amount display
 * - Method-specific UI feedback
 * - Loading states
 */

'use client';

import React from 'react';

interface RefundModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    amount: number;
    refundMethod: 'wallet' | 'original_payment' | 'bank_transfer';
    onMethodChange: (method: 'wallet' | 'original_payment' | 'bank_transfer') => void;
    isLoading?: boolean;
}

const REFUND_METHODS = [
    {
        value: 'wallet' as const,
        label: 'Wallet',
        description: 'Instant credit to customer wallet',
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
        ),
        badge: 'Fastest',
        badgeColor: 'bg-[var(--success-bg)] text-[var(--success)]',
    },
    {
        value: 'original_payment' as const,
        label: 'Original Payment Method',
        description: 'Refund to original payment source',
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
        ),
        badge: '3-5 days',
        badgeColor: 'bg-[var(--primary-blue-soft)] text-[var(--primary-blue)]',
    },
    {
        value: 'bank_transfer' as const,
        label: 'Bank Transfer',
        description: 'Direct transfer to bank account',
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
            </svg>
        ),
        badge: '5-7 days',
        badgeColor: 'bg-[var(--warning-bg)] text-[var(--warning)]',
    },
];

export function RefundModal({
    isOpen,
    onClose,
    onConfirm,
    amount,
    refundMethod,
    onMethodChange,
    isLoading = false,
}: RefundModalProps) {
    if (!isOpen) return null;

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        }).format(value);
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
                {/* Backdrop */}
                <div
                    className="fixed inset-0 bg-black/50 transition-opacity"
                    onClick={onClose}
                />

                {/* Modal */}
                <div className="relative bg-[var(--bg-elevated)] rounded-lg shadow-xl max-w-lg w-full p-6 border border-[var(--border-default)]">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[var(--warning-bg)] flex items-center justify-center">
                                <svg className="w-6 h-6 text-[var(--warning)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <div>
                                <h2 className="text-xl font-semibold text-[var(--text-primary)]">
                                    Process Refund
                                </h2>
                                <p className="text-2xl font-bold text-[var(--primary-blue)] mt-1">
                                    {formatCurrency(amount)}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            disabled={isLoading}
                            className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] disabled:opacity-50"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Method Selection */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                            Select Refund Method
                        </label>
                        <div className="space-y-3">
                            {REFUND_METHODS.map((method) => (
                                <button
                                    key={method.value}
                                    type="button"
                                    onClick={() => onMethodChange(method.value)}
                                    disabled={isLoading}
                                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${refundMethod === method.value
                                        ? 'border-[var(--primary-blue)] bg-[var(--primary-blue-soft)]'
                                        : 'border-[var(--border-default)] hover:border-[var(--border-hover)]'
                                        } disabled:opacity-50`}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className={`mt-0.5 ${refundMethod === method.value ? 'text-[var(--primary-blue)]' : 'text-[var(--text-tertiary)]'}`}>
                                            {method.icon}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-medium text-[var(--text-primary)]">
                                                    {method.label}
                                                </span>
                                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${method.badgeColor}`}>
                                                    {method.badge}
                                                </span>
                                            </div>
                                            <p className="text-sm text-[var(--text-secondary)]">
                                                {method.description}
                                            </p>
                                        </div>
                                        <div>
                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${refundMethod === method.value
                                                ? 'border-[var(--primary-blue)] bg-[var(--primary-blue)]'
                                                : 'border-[var(--border-default)]'
                                                }`}>
                                                {refundMethod === method.value && (
                                                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                    </svg>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Info */}
                    <div className="mb-6 p-4 bg-[var(--primary-blue-soft)] border border-[var(--primary-blue-light)] rounded-lg">
                        <div className="flex gap-3">
                            <svg className="w-5 h-5 text-[var(--primary-blue)] mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div className="text-sm text-[var(--primary-blue-deep)]">
                                <p className="font-medium mb-1">Important</p>
                                <p>This action cannot be undone. The refund will be processed immediately after confirmation.</p>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            disabled={isLoading}
                            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={onConfirm}
                            disabled={isLoading}
                            className="flex-1 px-4 py-2 bg-[var(--warning)] text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Processing...
                                </>
                            ) : (
                                'Process Refund'
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
