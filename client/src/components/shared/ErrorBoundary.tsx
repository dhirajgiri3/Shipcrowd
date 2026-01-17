"use client";

import React, { Component, ReactNode, ErrorInfo } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/src/components/ui/core/Button';
import logger from '@/src/shared/utils/logger';

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

    static getDerivedStateFromError(error: Error): State {
        return {
            hasError: true,
            error,
            errorInfo: null,
        };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        logger.error('ErrorBoundary caught an error:', error, errorInfo);

        this.setState({
            error,
            errorInfo,
        });

        // TODO: Send to error tracking service
        // sendToErrorTracking({ error, errorInfo });
    }

    handleReset = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
        });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--bg-primary)]">
                    <div className="max-w-md w-full text-center space-y-6">
                        <div className="h-16 w-16 mx-auto rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
                            <AlertTriangle className="h-8 w-8 text-rose-600 dark:text-rose-400" />
                        </div>

                        <div>
                            <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
                                Something went wrong
                            </h1>
                            <p className="text-sm text-[var(--text-secondary)]">
                                We're sorry for the inconvenience. Please try refreshing the page.
                            </p>
                        </div>

                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <div className="p-4 bg-rose-50 dark:bg-rose-950/20 rounded-xl border border-rose-200 dark:border-rose-800/50 text-left">
                                <p className="text-xs font-mono text-rose-600 dark:text-rose-400 break-all">
                                    {this.state.error.toString()}
                                </p>
                                {this.state.errorInfo && (
                                    <details className="mt-2">
                                        <summary className="text-xs text-rose-600 dark:text-rose-400 cursor-pointer">
                                            Stack trace
                                        </summary>
                                        <pre className="text-[10px] mt-2 font-mono text-rose-600 dark:text-rose-400 overflow-x-auto">
                                            {this.state.errorInfo.componentStack}
                                        </pre>
                                    </details>
                                )}
                            </div>
                        )}

                        <div className="flex gap-3 justify-center">
                            <Button
                                variant="outline"
                                onClick={this.handleReset}
                            >
                                Try Again
                            </Button>
                            <Button
                                variant="primary"
                                onClick={() => window.location.href = '/'}
                            >
                                Go Home
                            </Button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
