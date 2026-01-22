'use client';

import { ErrorView } from '@/src/components/errors/ErrorView';

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
    // Append error code to message if present for visibility
    const displayMessage = errorCode
        ? `${message || ''} (Code: ${errorCode})`
        : message;

    return (
        <ErrorView
            error={error}
            reset={reset}
            title={title}
            message={displayMessage}
            homePath={showHomeButton ? homeUrl : undefined}
        />
    );
}

export default PageError;
