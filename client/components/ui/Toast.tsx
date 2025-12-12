"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

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

const icons = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info,
};

const styles = {
    success: 'bg-white border-emerald-200',
    error: 'bg-white border-rose-200',
    warning: 'bg-white border-amber-200',
    info: 'bg-white border-[#2525FF]/20',
};

const iconStyles = {
    success: 'text-emerald-500 bg-emerald-50',
    error: 'text-rose-500 bg-rose-50',
    warning: 'text-amber-500 bg-amber-50',
    info: 'text-[#2525FF] bg-[#2525FF]/5',
};

const textStyles = {
    success: 'text-emerald-900',
    error: 'text-rose-900',
    warning: 'text-amber-900',
    info: 'text-gray-900',
};

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: () => void }) {
    const Icon = icons[toast.type];

    return (
        <div
            className={cn(
                "flex items-start gap-3 p-4 rounded-xl border-2 shadow-xl",
                "min-w-[320px] max-w-md",
                "animate-in slide-in-from-bottom-5 fade-in duration-300",
                styles[toast.type]
            )}
        >
            <div className={cn("p-2 rounded-lg flex-shrink-0", iconStyles[toast.type])}>
                <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
                {toast.title && (
                    <p className={cn("font-semibold text-sm mb-0.5", textStyles[toast.type])}>
                        {toast.title}
                    </p>
                )}
                <p className={cn("text-sm", textStyles[toast.type], !toast.title && "font-medium")}>
                    {toast.message}
                </p>
            </div>
            <button
                onClick={onRemove}
                className="flex-shrink-0 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
                <X className="h-3.5 w-3.5 text-gray-500" />
            </button>
        </div>
    );
}

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
            <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-3 pointer-events-none">
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
