/**
 * Bulk Actions Bar
 * 
 * Floating action bar that appears when items are selected
 * Features:
 * - Selected count display
 * - Action dropdown menu
 * - Clear selection button
 * - Smooth animations
 */

'use client';

import React, { useState } from 'react';

export interface BulkAction {
    id: string;
    label: string;
    icon?: React.ReactNode;
    variant?: 'default' | 'danger' | 'success';
    onClick: () => void;
}

interface BulkActionsBarProps {
    selectedCount: number;
    actions: BulkAction[];
    onClear: () => void;
}

export function BulkActionsBar({ selectedCount, actions, onClear }: BulkActionsBarProps) {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    if (selectedCount === 0) return null;

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 animate-in slide-in-from-bottom-5">
            <div className="bg-gray-900 dark:bg-gray-800 text-white rounded-lg shadow-2xl border border-gray-700">
                <div className="flex items-center gap-4 px-6 py-4">
                    {/* Selected Count */}
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <span className="font-medium">
                            {selectedCount} {selectedCount === 1 ? 'item' : 'items'} selected
                        </span>
                    </div>

                    {/* Actions Dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                        >
                            <span className="font-medium">Actions</span>
                            <svg className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>

                        {/* Dropdown Menu */}
                        {isDropdownOpen && (
                            <>
                                <div
                                    className="fixed inset-0 z-10"
                                    onClick={() => setIsDropdownOpen(false)}
                                />
                                <div className="absolute bottom-full mb-2 right-0 w-56 bg-white dark:bg-gray-700 rounded-lg shadow-xl border border-gray-200 dark:border-gray-600 py-2 z-20">
                                    {actions.map((action) => (
                                        <button
                                            key={action.id}
                                            onClick={() => {
                                                action.onClick();
                                                setIsDropdownOpen(false);
                                            }}
                                            className={`w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors ${action.variant === 'danger'
                                                    ? 'hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400'
                                                    : action.variant === 'success'
                                                        ? 'hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600 dark:text-green-400'
                                                        : 'hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                                                }`}
                                        >
                                            {action.icon && <span className="flex-shrink-0">{action.icon}</span>}
                                            <span className="font-medium">{action.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Clear Selection */}
                    <button
                        onClick={onClear}
                        className="p-2 hover:bg-gray-800 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        title="Clear selection"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
}
