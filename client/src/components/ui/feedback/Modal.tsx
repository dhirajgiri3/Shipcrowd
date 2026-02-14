'use client';
import { useEffect, useRef, memo } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/src/lib/utils';

/**
 * Modal Component
 *
 * Accessible modal dialog using design system tokens.
 * Uses portal for proper stacking context.
 * Implements focus trap: Tab/Shift+Tab cycle within modal; focus returns to trigger on close.
 */

const FOCUSABLE_SELECTOR = [
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    'a[href]',
    '[tabindex]:not([tabindex="-1"])',
].join(', ');

function getFocusables(container: HTMLElement): HTMLElement[] {
    return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (el) => el.offsetParent !== null && !el.hasAttribute('aria-hidden')
    );
}

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    className?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-[90vw]',
};

export const Modal = memo(function Modal({
    isOpen,
    onClose,
    title,
    children,
    className,
    size = 'md'
}: ModalProps) {
    const overlayRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const previousActiveRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        if (isOpen) {
            document.body.style.overflow = 'hidden';
            previousActiveRef.current = document.activeElement as HTMLElement | null;
            document.addEventListener('keydown', handleEscape);
        }

        return () => {
            document.body.style.overflow = 'unset';
            document.removeEventListener('keydown', handleEscape);
            if (previousActiveRef.current?.focus) {
                previousActiveRef.current.focus();
            }
        };
    }, [isOpen, onClose]);

    useEffect(() => {
        if (!isOpen || !contentRef.current) return;

        const container = contentRef.current;
        const focusables = getFocusables(container);
        if (focusables.length > 0) {
            focusables[0].focus();
        }

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key !== 'Tab') return;

            const focusables = getFocusables(container);
            if (focusables.length === 0) return;

            const first = focusables[0];
            const last = focusables[focusables.length - 1];

            if (e.shiftKey) {
                if (document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                }
            } else {
                if (document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
        };

        container.addEventListener('keydown', handleKeyDown);
        return () => container.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);

    if (!isOpen) return null;

    return createPortal(
        <div
            className={cn(
                "fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4",
                "bg-black/50 backdrop-blur-sm",
                "animate-fade-in"
            )}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? 'modal-title' : undefined}
        >
            {/* Backdrop */}
            <div
                ref={overlayRef}
                className="absolute inset-0"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Modal Content */}
            <div
                ref={contentRef}
                className={cn(
                    "relative z-10 w-full",
                    "bg-[var(--bg-primary)] rounded-[var(--radius-xl)]",
                    "shadow-lg",
                    "animate-slide-up",
                    sizeClasses[size],
                    className
                )}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-[var(--border-subtle)]">
                    {title && (
                        <h3
                            id="modal-title"
                            className="text-lg font-semibold text-[var(--text-primary)]"
                        >
                            {title}
                        </h3>
                    )}
                    <button
                        onClick={onClose}
                        className={cn(
                            "rounded-[var(--radius-full)] p-1.5 ml-auto",
                            "text-[var(--text-muted)] hover:text-[var(--text-primary)]",
                            "hover:bg-[var(--bg-hover)]",
                            "transition-colors duration-[var(--duration-fast)]"
                        )}
                        aria-label="Close modal"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">
                    {children}
                </div>
            </div>
        </div>,
        document.body
    );
});
