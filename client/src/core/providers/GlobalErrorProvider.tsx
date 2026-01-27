'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { ErrorRecoveryModal } from '@/src/components/errors/ErrorRecoveryModal';
import { AppError, ErrorSeverity, ErrorCategory } from '@/src/core/error/error-types';
import { toast } from 'sonner';

interface GlobalErrorContextType {
    reportError: (error: unknown, severity?: ErrorSeverity, category?: ErrorCategory) => void;
    clearError: () => void;
}

const GlobalErrorContext = createContext<GlobalErrorContextType | null>(null);

export const useGlobalError = () => {
    const context = useContext(GlobalErrorContext);
    if (!context) {
        throw new Error('useGlobalError must be used within a GlobalErrorProvider');
    }
    return context;
};

export const GlobalErrorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [activeError, setActiveError] = useState<AppError | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const reportError = useCallback((error: unknown, severity = ErrorSeverity.ERROR, category = ErrorCategory.UNKNOWN) => {
        console.error('[Global Error Report]', error);

        let appError: AppError;

        if (isAppError(error)) {
            appError = error;
        } else if (error instanceof Error) {
            appError = {
                message: error.message,
                severity,
                category,
                originalError: error
            };
        } else if (typeof error === 'string') {
            appError = {
                message: error,
                severity,
                category
            };
        } else {
            appError = {
                message: 'An unexpected error occurred.',
                severity,
                category
            };
        }

        // Logic: Critical errors show Modal, others show Toast
        if (appError.severity === ErrorSeverity.CRITICAL) {
            setActiveError(appError);
            setIsModalOpen(true);
        } else {
            // For non-critical errors, just show toast
            toast.error(appError.message, {
                description: appError.code ? `Code: ${appError.code}` : undefined,
            });
        }
    }, []);

    const clearError = useCallback(() => {
        setActiveError(null);
        setIsModalOpen(false);
    }, []);

    // Listen for custom events from utility functions (legacy/non-react code)
    useEffect(() => {
        const handleCustomReport = (event: CustomEvent) => {
            const { message, code, severity, originalError } = event.detail;
            setActiveError({
                message,
                code,
                severity: severity || ErrorSeverity.ERROR,
                category: ErrorCategory.UNKNOWN,
                originalError
            });
            if (severity === ErrorSeverity.CRITICAL) {
                setIsModalOpen(true);
            } else {
                toast.error(message);
            }
        };

        window.addEventListener('global-error-report', handleCustomReport as EventListener);
        return () => window.removeEventListener('global-error-report', handleCustomReport as EventListener);
    }, []);

    // Global Unhandled Rejection Listener
    useEffect(() => {
        const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
            // Prevent default browser console noise if we handle it
            // event.preventDefault(); 
            reportError(event.reason, ErrorSeverity.ERROR, ErrorCategory.UNKNOWN);
        };

        const handleGlobalError = (event: ErrorEvent) => {
            reportError(event.error, ErrorSeverity.ERROR, ErrorCategory.CLIENT);
        };

        window.addEventListener('unhandledrejection', handleUnhandledRejection);
        window.addEventListener('error', handleGlobalError);

        return () => {
            window.removeEventListener('unhandledrejection', handleUnhandledRejection);
            window.removeEventListener('error', handleGlobalError);
        };
    }, [reportError]);

    return (
        <GlobalErrorContext.Provider value={{ reportError, clearError }}>
            {children}
            <ErrorRecoveryModal
                isOpen={isModalOpen}
                error={activeError}
                onClose={clearError}
            />
        </GlobalErrorContext.Provider>
    );
};

// Type Guard
function isAppError(error: any): error is AppError {
    return error && typeof error === 'object' && 'message' in error && 'severity' in error;
}
