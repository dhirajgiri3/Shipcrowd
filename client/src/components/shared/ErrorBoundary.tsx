/**
 * Global Error Boundary
 * 
 * Catches React errors at the top level and displays fallback UI.
 * Prevents the entire app from crashing when a component fails.
 * 
 * Features:
 * - Catches errors in child components
 * - Shows user-friendly error UI
 * - Logs errors for debugging
 * - Provides retry functionality
 * - Different UI for dev vs production
 */

'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ErrorView } from '../errors/ErrorView';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }

    static getDerivedStateFromError(error: Error): Partial<State> {
        // Update state so next render shows fallback UI
        return {
            hasError: true,
            error,
        };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        // Log error to console (in production, send to error tracking service)
        console.error('ErrorBoundary caught an error:', error, errorInfo);

        // Update state with error details
        this.setState({
            error,
            errorInfo,
        });

        // TODO: Send to error tracking service (Sentry, LogRocket, etc.)
        if (process.env.NODE_ENV === 'production') {
            // Example: Sentry.captureException(error);
        }
    }

    handleReset = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
        });
    };

    handleReload = () => {
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            // Custom fallback UI provided by parent
            if (this.props.fallback) {
                return this.props.fallback;
            }

            // Default fallback UI using premium ErrorView
            return (
                <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
                    <ErrorView
                        error={this.state.error || undefined}
                        reset={this.handleReset}
                        title="Something went wrong"
                        message="We encountered an unexpected issue. Please try again or return home."
                        homePath="/"
                    />
                </div>
            );
        }

        return this.props.children;
    }
}

/**
 * Hook to reset error boundary from child components
 * Usage: const resetError = useErrorBoundary();
 */
export function useErrorBoundary() {
    const [, setError] = React.useState();
    return React.useCallback((error: Error) => {
        setError(() => {
            throw error;
        });
    }, []);
}
