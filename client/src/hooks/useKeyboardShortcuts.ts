/**
 * Keyboard Shortcuts Hook (Phase 4: Premium Polish)
 * 
 * Power user feature for quick navigation:
 * - R: Refresh dashboard
 * - W: Go to Wallet
 * - O: Go to Orders
 * - C: Create new order
 * - ?: Show shortcuts modal
 * 
 * Inspired by Gmail, GitHub, Linear keyboard shortcuts
 */

'use client';

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

export interface KeyboardShortcut {
    key: string;
    description: string;
    action: () => void;
    category: 'navigation' | 'actions' | 'help';
}

interface UseKeyboardShortcutsOptions {
    onShowHelp?: () => void;
    enabled?: boolean;
}

export function useKeyboardShortcuts({ onShowHelp, enabled = true }: UseKeyboardShortcutsOptions = {}) {
    const router = useRouter();

    const shortcuts: KeyboardShortcut[] = [
        // Navigation
        {
            key: 'w',
            description: 'Go to Wallet',
            action: () => router.push('/seller/wallet'),
            category: 'navigation',
        },
        {
            key: 'o',
            description: 'Go to Orders',
            action: () => router.push('/seller/orders'),
            category: 'navigation',
        },
        {
            key: 'd',
            description: 'Go to Dashboard',
            action: () => router.push('/seller'),
            category: 'navigation',
        },
        {
            key: 'a',
            description: 'Go to Analytics',
            action: () => router.push('/seller/analytics'),
            category: 'navigation',
        },
        // Actions
        {
            key: 'c',
            description: 'Create New Order',
            action: () => router.push('/seller/orders/create'),
            category: 'actions',
        },
        {
            key: 'r',
            description: 'Refresh Dashboard',
            action: () => window.location.reload(),
            category: 'actions',
        },
        // Help
        {
            key: '?',
            description: 'Show Keyboard Shortcuts',
            action: () => onShowHelp?.(),
            category: 'help',
        },
    ];

    const handleKeyPress = useCallback(
        (event: KeyboardEvent) => {
            // Ignore if user is typing in an input/textarea
            const target = event.target as HTMLElement;
            if (
                target.tagName === 'INPUT' ||
                target.tagName === 'TEXTAREA' ||
                target.isContentEditable
            ) {
                return;
            }

            // Ignore if modifier keys are pressed (except Shift for ?)
            if (event.ctrlKey || event.metaKey || event.altKey) {
                return;
            }

            const key = event.key.toLowerCase();
            const shortcut = shortcuts.find((s) => s.key === key);

            if (shortcut) {
                event.preventDefault();
                shortcut.action();
            }
        },
        [shortcuts]
    );

    useEffect(() => {
        if (!enabled) return;

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [enabled, handleKeyPress]);

    return { shortcuts };
}
