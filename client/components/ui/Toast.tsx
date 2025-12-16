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
        container: 'bg-[--card-background] border-[--color-success]/30',
        icon: 'text-[--color-success] bg-[--color-success-light]',
        text: 'text-[--color-gray-900]',
    },
    error: {
        container: 'bg-[--card-background] border-[--color-error]/30',
        icon: 'text-[--color-error] bg-[--color-error-light]',
        text: 'text-[--color-gray-900]',
    },
    warning: {
        container: 'bg-[--card-background] border-[--color-warning]/30',
        icon: 'text-[--color-warning] bg-[--color-warning-light]',
        text: 'text-[--color-gray-900]',
    },
    info: {
        container: 'bg-[--card-background] border-[--color-primary]/20',
        icon: 'text-[--color-primary] bg-[--color-primary-light]',
        text: 'text-[--color-gray-900]',
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
                "flex items-start gap-3 p-4 rounded-[--radius-xl] border-2",
                "shadow-[--shadow-xl]",
                "min-w-[320px] max-w-md",
                "animate-slide-up",
                styles.container
            )}
        >
            {/* Icon */}
            <div className={cn(
                "p-2 rounded-[--radius-lg] flex-shrink-0",
                styles.icon
            )}>
                <Icon className="h-4 w-4" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pt-0.5">
                {toast.title && (
                    <p className={cn("font-semibold text-sm mb-0.5", styles.text)}>
                        {toast.title}
                    </p>
                )}
                <p className={cn(
                    "text-sm",
                    styles.text,
                    !toast.title && "font-medium"
                )}>
                    {toast.message}
                </p>
            </div>

            {/* Close button */}
            <button
                onClick={onRemove}
                className={cn(
                    "flex-shrink-0 p-1.5 rounded-[--radius-lg]",
                    "text-[--color-gray-500] hover:text-[--color-gray-900]",
                    "hover:bg-[--color-gray-100]",
                    "transition-colors duration-[--transition-fast]"
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
                className="fixed bottom-6 right-6 z-[--z-toast] flex flex-col gap-3 pointer-events-none"
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
