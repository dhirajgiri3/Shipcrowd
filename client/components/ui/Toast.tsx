"use client";

import { createContext, useContext, useState, useCallback, ReactNode, memo } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Toast Notification System
 * 
 * Context-based toast notifications using design system tokens.
 * Provides success, error, warning, and info variants.
 */

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
    id: string;
    message: string;
    type: ToastType;
    title?: string;
}

interface ToastContextType {
    toasts: Toast[];
    addToast: (message: string, type?: ToastType, title?: string) => void;
    removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within ToastProvider');
    }
    return context;
}

// Icon mapping
const icons = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info,
};

// Styles using design tokens
const toastStyles = {
    success: {
        container: 'bg-[var(--bg-elevated)] border-[var(--border-subtle)]',
        indicator: 'bg-[var(--success)]',
        icon: 'text-[var(--success)] bg-[var(--success-bg)]',
        text: 'text-[var(--text-primary)]',
        title: 'text-[var(--text-primary)]'
    },
    error: {
        container: 'bg-[var(--bg-elevated)] border-[var(--border-subtle)]',
        indicator: 'bg-[var(--error)]',
        icon: 'text-[var(--error)] bg-[var(--error-bg)]',
        text: 'text-[var(--text-primary)]',
        title: 'text-[var(--text-primary)]'
    },
    warning: {
        container: 'bg-[var(--bg-elevated)] border-[var(--border-subtle)]',
        indicator: 'bg-[var(--warning)]',
        icon: 'text-[var(--warning)] bg-[var(--warning-bg)]',
        text: 'text-[var(--text-primary)]',
        title: 'text-[var(--text-primary)]'
    },
    info: {
        container: 'bg-[var(--bg-elevated)] border-[var(--border-subtle)]',
        indicator: 'bg-[var(--primary-blue)]',
        icon: 'text-[var(--primary-blue)] bg-[var(--primary-blue-soft)]',
        text: 'text-[var(--text-primary)]',
        title: 'text-[var(--text-primary)]'
    },
};

// Memoized toast item component
const ToastItem = memo(function ToastItem({
    toast,
    onRemove
}: {
    toast: Toast;
    onRemove: () => void;
}) {
    const Icon = icons[toast.type];
    const styles = toastStyles[toast.type];

    return (
        <div
            role="alert"
            className={cn(
                "group relative flex items-start gap-3 p-4 rounded-[var(--radius-xl)] border",
                "shadow-[var(--shadow-dropdown)]",
                "min-w-[320px] max-w-md",
                "animate-slide-up bg-[var(--bg-elevated)]",
                "overflow-hidden",
                styles.container
            )}
        >
            {/* Status Indicator Bar */}
            <div className={cn("absolute left-0 top-0 bottom-0 w-1", styles.indicator)} />

            {/* Icon */}
            <div className={cn(
                "p-2 rounded-[var(--radius-lg)] flex-shrink-0 mt-0.5",
                styles.icon
            )}>
                <Icon className="h-4 w-4" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 py-0.5">
                {toast.title && (
                    <p className={cn("font-semibold text-sm mb-1", styles.title)}>
                        {toast.title}
                    </p>
                )}
                <p className={cn(
                    "text-sm leading-relaxed",
                    "text-[var(--text-secondary)]",
                    !toast.title && "font-medium"
                )}>
                    {toast.message}
                </p>
            </div>

            {/* Close button */}
            <button
                onClick={onRemove}
                className={cn(
                    "flex-shrink-0 p-1.5 rounded-[var(--radius-lg)] -mr-1 -mt-1",
                    "text-[var(--text-muted)] hover:text-[var(--text-primary)]",
                    "hover:bg-[var(--bg-hover)]",
                    "transition-colors duration-[var(--duration-fast)]"
                )}
                aria-label="Dismiss notification"
            >
                <X className="h-3.5 w-3.5" />
            </button>
        </div>
    );
});

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const addToast = useCallback((message: string, type: ToastType = 'info', title?: string) => {
        const id = Math.random().toString(36).substring(7);
        setToasts(prev => [...prev, { id, message, type, title }]);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 5000);
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
            {children}

            {/* Toast Container */}
            <div
                className="fixed bottom-6 right-6 z-[var(--z-toast)] flex flex-col gap-3 pointer-events-none"
                aria-live="polite"
            >
                {toasts.map(toast => (
                    <div key={toast.id} className="pointer-events-auto">
                        <ToastItem
                            toast={toast}
                            onRemove={() => removeToast(toast.id)}
                        />
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}
