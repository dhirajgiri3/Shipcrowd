'use client';

import * as React from 'react';
import toast, { Toaster as HotToaster } from 'react-hot-toast';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastContextValue {
    addToast: (message: string, type?: ToastType) => void;
}

// Helper function to show toast (only works on client)
const showToast = (message: string, type: ToastType = 'info') => {
    if (typeof window === 'undefined') return; // SSR guard

    switch (type) {
        case 'success':
            toast.success(message);
            break;
        case 'error':
            toast.error(message);
            break;
        case 'warning':
            toast(message, { icon: '⚠️' });
            break;
        default:
            toast(message);
    }
};

// Safe noop for SSR - never throws
const safeAddToast = (message: string, type: ToastType = 'info') => {
    showToast(message, type);
};

// Export a simple hook that always returns a valid object
// This never throws and works safely on both client and server
export function useToast(): ToastContextValue {
    return {
        addToast: safeAddToast,
    };
}

// Provider just adds the Toaster component
export function ToastProvider({ children }: { children: React.ReactNode }) {
    return (
        <>
            {children}
            <HotToaster
                position="top-right"
                toastOptions={{
                    duration: 4000,
                    style: {
                        background: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border-default)',
                    },
                }}
            />
        </>
    );
}
