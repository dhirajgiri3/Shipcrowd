"use client";

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

export interface ShortcutItem {
    key: string;
    description: string;
    action?: () => void;
    group: 'Navigation' | 'Actions' | 'View' | 'General';
}

interface UseKeyboardShortcutsProps {
    enabled?: boolean;
    onShowHelp?: () => void;
}

export function useKeyboardShortcuts({ enabled = true, onShowHelp }: UseKeyboardShortcutsProps = {}) {
    const router = useRouter();

    const shortcuts: ShortcutItem[] = [
        // Navigation
        { key: 'g h', description: 'Go to Dashboard', group: 'Navigation', action: () => router.push('/seller') },
        { key: 'g o', description: 'Go to Orders', group: 'Navigation', action: () => router.push('/seller/orders') },
        { key: 'g w', description: 'Go to Wallet', group: 'Navigation', action: () => router.push('/seller/wallet') },
        { key: 'g a', description: 'Go to Analytics', group: 'Navigation', action: () => router.push('/seller/analytics') },
        { key: 'g s', description: 'Go to Settings', group: 'Navigation', action: () => router.push('/seller/settings') },

        // Actions
        { key: 'n', description: 'New Order', group: 'Actions', action: () => router.push('/seller/orders/create') },
        {
            key: '/', description: 'Search', group: 'Actions', action: () => {
                const searchInput = document.querySelector('input[type="search"]') as HTMLInputElement;
                if (searchInput) searchInput.focus();
            }
        },

        // General
        { key: '?', description: 'Show Keyboard Shortcuts', group: 'General', action: onShowHelp },
        { key: 'Esc', description: 'Close Modal', group: 'General' },
    ];

    const handleKeyDown = useCallback((event: KeyboardEvent) => {
        if (!enabled) return;

        // Ignore if typing in an input
        const target = event.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
            return;
        }

        const pressedKey = event.key;

        // Handle single key shortcuts
        if (pressedKey === '?') {
            event.preventDefault();
            onShowHelp?.();
            return;
        }

        if (pressedKey === '/') {
            event.preventDefault();
            const searchAction = shortcuts.find(s => s.key === '/');
            searchAction?.action?.();
            return;
        }

        // Handle 'n' for new order
        if (pressedKey.toLowerCase() === 'n') {
            const newOrderAction = shortcuts.find(s => s.key === 'n');
            if (newOrderAction) {
                // event.preventDefault(); // Don't prevent default if it conflicts differently, but here it's fine
                newOrderAction.action?.();
            }
        }

        // For 'g + key' sequences, we need state or a different approach.
        // For simplicity in this v1, we'll stick to single modifiers or implement basic sequence detection if needed.
        // But requested spec implies simple shortcuts. Let's implement a simple 'g' then 'key' detector?
        // Actually, libraries like `react-hotkeys-hook` are better, but I'll write a simple custom handler for 'g' sequences.

    }, [enabled, onShowHelp, router, shortcuts]);

    // Simple sequence handler
    useEffect(() => {
        if (!enabled) return;

        let lastKeyTime = 0;
        let lastKey: string | null = null;

        const handleSequence = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

            const now = Date.now();
            const char = e.key.toLowerCase();

            // Check for '?'
            if (e.key === '?' && e.shiftKey) {
                // ? is shift+/ usually. Accessing via key '?' simplifies it if the browser maps it.
                onShowHelp?.();
                return;
            }

            // Check for 'Esc'
            if (e.key === 'Escape') {
                // Close help if open (managed by modal state outside)
                return;
            }


            if (lastKey === 'g' && (now - lastKeyTime) < 500) {
                // Sequence g + char
                switch (char) {
                    case 'h': router.push('/seller'); break;
                    case 'o': router.push('/seller/orders'); break;
                    case 'w': router.push('/seller/wallet'); break;
                    case 'a': router.push('/seller/analytics'); break;
                    case 's': router.push('/seller/settings'); break;
                }
                lastKey = null;
                return;
            }

            if (char === 'g') {
                lastKey = 'g';
                lastKeyTime = now;
                return;
            }

            // Single keys
            if (char === '/') {
                e.preventDefault();
                const searchInput = document.querySelector('input[type="search"]') as HTMLInputElement;
                if (searchInput) searchInput.focus();
            }

            if (char === 'n') {
                router.push('/seller/orders/create');
            }

            lastKey = null;
        };

        window.addEventListener('keydown', handleSequence);
        return () => window.removeEventListener('keydown', handleSequence);
    }, [enabled, router, onShowHelp]);

    return { shortcuts };
}
