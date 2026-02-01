/**
 * Accessibility Utilities
 * 
 * Helper functions and hooks for improving keyboard navigation and screen reader support
 */

import { useEffect, useRef, RefObject } from 'react';

/**
 * Hook to manage focus trap within a modal or dialog
 * Ensures focus stays within the component when Tab is pressed
 * 
 * @param isActive - Whether the focus trap is currently active
 * @returns Ref to attach to the container element
 */
export function useFocusTrap<T extends HTMLElement = HTMLDivElement>(isActive: boolean) {
    const containerRef = useRef<T>(null);

    useEffect(() => {
        if (!isActive || !containerRef.current) return;

        const container = containerRef.current;
        const focusableElements = container.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );

        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        // Focus first element when trap activates
        firstElement?.focus();

        const handleTabKey = (e: KeyboardEvent) => {
            if (e.key !== 'Tab') return;

            if (e.shiftKey) {
                // Shift + Tab (backwards)
                if (document.activeElement === firstElement) {
                    e.preventDefault();
                    lastElement?.focus();
                }
            } else {
                // Tab (forwards)
                if (document.activeElement === lastElement) {
                    e.preventDefault();
                    firstElement?.focus();
                }
            }
        };

        container.addEventListener('keydown', handleTabKey as EventListener);
        return () => container.removeEventListener('keydown', handleTabKey as EventListener);
    }, [isActive]);

    return containerRef;
}

/**
 * Hook to restore focus to the element that opened a modal when modal closes
 * 
 * @param isOpen - Whether the modal is currently open
 */
export function useRestoreFocus(isOpen: boolean) {
    const previousActiveElement = useRef<HTMLElement | null>(null);

    useEffect(() => {
        if (isOpen) {
            // Store the currently focused element
            previousActiveElement.current = document.activeElement as HTMLElement;
        } else if (previousActiveElement.current) {
            // Restore focus when modal closes
            previousActiveElement.current.focus();
            previousActiveElement.current = null;
        }
    }, [isOpen]);
}

/**
 * Hook for keyboard shortcuts
 * 
 * @param key - The key to listen for
 * @param callback - Function to call when key is pressed
 * @param modifiers - Optional modifiers (ctrl, shift, alt, meta)
 */
export function useKeyboardShortcut(
    key: string,
    callback: () => void,
    modifiers?: { ctrl?: boolean; shift?: boolean; alt?: boolean; meta?: boolean }
) {
    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            const matchesKey = e.key.toLowerCase() === key.toLowerCase();
            const matchesModifiers =
                (!modifiers?.ctrl || e.ctrlKey) &&
                (!modifiers?.shift || e.shiftKey) &&
                (!modifiers?.alt || e.altKey) &&
                (!modifiers?.meta || e.metaKey);

            if (matchesKey && matchesModifiers) {
                e.preventDefault();
                callback();
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [key, callback, modifiers]);
}

/**
 * Announce message to screen readers
 * Creates a live region that screen readers will read
 */
export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite') {
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only'; // Visually hidden but readable by screen readers
    announcement.textContent = message;

    document.body.appendChild(announcement);

    // Remove after announcement
    setTimeout(() => {
        document.body.removeChild(announcement);
    }, 1000);
}
