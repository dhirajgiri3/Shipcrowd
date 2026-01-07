"use client";

import { useEffect } from 'react';
import { Button } from '@/components/ui/core/Button';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { useRouter } from 'next/navigation';

/**
 * Error boundary for Seller Orders Page
 * Catches and displays errors with retry functionality
 */

export default function OrdersError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    const router = useRouter();

    useEffect(() => {
        // Log error to error reporting service
        console.error('Orders page error:', error);
    }, [error]);

    return (
        <div className="min-h-screen flex items-center justify-center p-6">
            <div className="max-w-md w-full text-center">
                <div className="w-20 h-20 bg-[var(--error-bg)] rounded-full flex items-center justify-center mx-auto mb-6">
                    <AlertCircle className="w-10 h-10 text-[var(--error)]" />
                </div>

                <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
                    Something went wrong
                </h2>

                <p className="text-[var(--text-secondary)] mb-6">
                    {error.message || 'An unexpected error occurred while loading your orders. Please try again.'}
                </p>

                {error.digest && (
                    <p className="text-xs text-[var(--text-muted)] mb-6 font-mono">
                        Error ID: {error.digest}
                    </p>
                )}

                <div className="flex items-center justify-center gap-3">
                    <Button
                        onClick={reset}
                        className="bg-[var(--primary-blue)] hover:bg-[var(--primary-blue-deep)] text-white"
                    >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Try Again
                    </Button>

                    <Button
                        onClick={() => router.push('/seller')}
                        variant="outline"
                        className="border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)]"
                    >
                        <Home className="w-4 h-4 mr-2" />
                        Go Home
                    </Button>
                </div>
            </div>
        </div>
    );
}
