/**
 * Reusable Confirmation Modal Component
 * 
 * Features:
 * - Custom title and message
 * - Optional reason input
 * - Danger/Warning variants
 * - Customizable button text
 */

'use client';

import React, { useState } from 'react';

export interface ConfirmationModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info';
    requireReason?: boolean;
    reasonLabel?: string;
    reasonPlaceholder?: string;
    onConfirm: (reason?: string) => void;
    onCancel: () => void;
    isLoading?: boolean;
}

const VARIANT_STYLES = {
    danger: {
        icon: 'text-red-600 dark:text-red-400',
        button: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
        iconBg: 'bg-red-100 dark:bg-red-900/30',
    },
    warning: {
        icon: 'text-yellow-600 dark:text-yellow-400',
        button: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500',
        iconBg: 'bg-yellow-100 dark:bg-yellow-900/30',
    },
    info: {
        icon: 'text-blue-600 dark:text-blue-400',
        button: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
        iconBg: 'bg-blue-100 dark:bg-blue-900/30',
    },
};

export function ConfirmationModal({
    isOpen,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'info',
    requireReason = false,
    reasonLabel = 'Reason',
    reasonPlaceholder = 'Please provide a reason...',
    onConfirm,
    onCancel,
    isLoading = false,
}: ConfirmationModalProps) {
    const [reason, setReason] = useState('');
    const [error, setError] = useState('');

    const styles = VARIANT_STYLES[variant];

    const handleConfirm = () => {
        if (requireReason && !reason.trim()) {
            setError('Reason is required');
            return;
        }

        onConfirm(requireReason ? reason : undefined);
        setReason('');
        setError('');
    };

    const handleCancel = () => {
        setReason('');
        setError('');
        onCancel();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
                {/* Header */}
                <div className="p-6">
                    <div className="flex items-start gap-4">
                        {/* Icon */}
                        <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${styles.iconBg}`}>
                            {variant === 'danger' && (
                                <svg className={`w-6 h-6 ${styles.icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            )}
                            {variant === 'warning' && (
                                <svg className={`w-6 h-6 ${styles.icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            )}
                            {variant === 'info' && (
                                <svg className={`w-6 h-6 ${styles.icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            )}
                        </div>

                        {/* Content */}
                        <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                {title}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                {message}
                            </p>
                        </div>
                    </div>

                    {/* Reason Input */}
                    {requireReason && (
                        <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                {reasonLabel} <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                value={reason}
                                onChange={(e) => {
                                    setReason(e.target.value);
                                    setError('');
                                }}
                                rows={3}
                                className={`w-full px-3 py-2 border rounded-lg resize-none focus:ring-2 focus:ring-offset-2 ${
                                    error
                                        ? 'border-red-300 dark:border-red-600 focus:ring-red-500'
                                        : 'border-gray-300 dark:border-gray-600 focus:ring-primary-500'
                                } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
                                placeholder={reasonPlaceholder}
                            />
                            {error && (
                                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 rounded-b-lg flex items-center justify-end gap-3">
                    <button
                        onClick={handleCancel}
                        disabled={isLoading}
                        className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={isLoading}
                        className={`px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 ${styles.button}`}
                    >
                        {isLoading && (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        )}
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
