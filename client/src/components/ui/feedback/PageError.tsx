'use client';

import { useEffect } from 'react';
import { Button } from '@/src/components/ui/core/Button';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { useRouter } from 'next/navigation';

/**
 * Centralized Page Error Component
 * 
 * Reusable error component for route-level error.tsx files.
 * Provides consistent error handling UX across the application.
 * 
 * @example
 * ```tsx
 * // In error.tsx
 * export default function Error({ error, reset }) {
 *     return <PageError error={error} reset={reset} homeUrl="/dashboard" />;
 * }
 * ```
 */

export interface PageErrorProps {
    /** Error object from Next.js error boundary */
    error: Error & { digest?: string };
    /** Reset function to retry */
    reset: () => void;
    /** Custom title (default: "Something went wrong") */
    title?: string;
    /** Custom message (overrides error.message) */
    message?: string;
    /** Optional error code for debugging */
    errorCode?: string;
    /** Show "Go Home" button (default: true) */
    showHomeButton?: boolean;
    /** Home URL for "Go Home" button (default: "/") */
    homeUrl?: string;
}

export function PageError({
    error,
    reset,
    title = 'Something went wrong',
    message,
    errorCode,
    showHomeButton = true,
    homeUrl = '/',
}: PageErrorProps) {
    const router = useRouter();

    useEffect(() => {
        console.error('Page error:', error);
    }, [error]);

    return (
        <div className="flex h-[400px] w-full flex-col items-center justify-center gap-4 p-6">
            <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/30 rounded-full flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-rose-600 dark:text-rose-400" />
            </div>

            <div className="text-center max-w-md">
                <h2 className="text-xl font-semibold mb-2">{title}</h2>
                <p className="text-muted-foreground text-sm">
                    {message || error.message || 'An unexpected error occurred. Please try again.'}
                </p>
            </div>

            {(errorCode || error.digest) && (
                <div className="flex flex-col items-center gap-1">
                    {errorCode && (
                        <p className="text-xs text-muted-foreground font-mono bg-muted px-2 py-1 rounded">
                            Error Code: {errorCode}
                        </p>
                    )}
                    {error.digest && (
                        <p className="text-xs text-muted-foreground font-mono">
                            Error ID: {error.digest}
                        </p>
                    )}
                </div>
            )}

            <div className="flex items-center gap-3">
                <Button onClick={reset}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Try Again
                </Button>

                {showHomeButton && (
                    <Button variant="outline" onClick={() => router.push(homeUrl)}>
                        <Home className="w-4 h-4 mr-2" />
                        Go Home
                    </Button>
                )}
            </div>
        </div>
    );
}

export default PageError;
