'use client';

import React from 'react';
import { AlertTriangle, RefreshCw, LifeBuoy, XCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/src/components/ui/feedback/Dialog';
import { Button } from '@/src/components/ui/core/Button';
import { AppError, ErrorSeverity } from '@/src/core/error/error-types';
import { ERROR_MESSAGES } from '@/src/core/error/messages';

interface ErrorRecoveryModalProps {
    isOpen: boolean;
    error: AppError | null;
    onClose: () => void;
    onRetry?: () => void;
}

export const ErrorRecoveryModal: React.FC<ErrorRecoveryModalProps> = ({ isOpen, error, onClose, onRetry }) => {
    if (!error) return null;

    const isCritical = error.severity === ErrorSeverity.CRITICAL;

    // Support link (can be configured via env or constant)
    const SUPPORT_EMAIL = "support@shipcrowd.com";
    const SUPPORT_LINK = `mailto:${SUPPORT_EMAIL}?subject=Error Report: ${error.code || 'Unknown'}&body=Context: ${encodeURIComponent(JSON.stringify(error.context || {}))}`;

    const handleRetry = () => {
        if (onRetry) {
            onRetry();
        } else {
            window.location.reload();
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && !isCritical && onClose()}>
            <DialogContent className="sm:max-w-[425px] border-l-4 border-l-[var(--error)]">
                <DialogHeader>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-full">
                            <AlertTriangle className="w-6 h-6 text-[var(--error)]" />
                        </div>
                        <DialogTitle className="text-xl">
                            {error.category === 'network' ? 'Connection Issue' : ERROR_MESSAGES.DEFAULT_TITLE}
                        </DialogTitle>
                    </div>
                </DialogHeader>

                <div className="py-4">
                    <p className="text-[var(--text-secondary)] mb-4">
                        {error.message || ERROR_MESSAGES.DEFAULT}
                    </p>

                    {error.code && (
                        <div className="bg-[var(--bg-secondary)] p-2 rounded text-xs font-mono text-[var(--text-tertiary)] flex justify-between items-center">
                            <span>Code: {error.code}</span>
                            {/* Copy button could go here */}
                        </div>
                    )}
                </div>

                <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-2">
                    <Button
                        variant="ghost"
                        onClick={() => window.open(SUPPORT_LINK, '_blank')}
                        className="w-full sm:w-auto text-[var(--text-secondary)]"
                    >
                        <LifeBuoy className="w-4 h-4 mr-2" />
                        {ERROR_MESSAGES.CONTACT_SUPPORT}
                    </Button>

                    <div className="flex gap-2 w-full sm:w-auto">
                        {!isCritical && (
                            <Button variant="outline" onClick={onClose} className="flex-1">
                                {ERROR_MESSAGES.CLOSE}
                            </Button>
                        )}
                        <Button variant="primary" onClick={handleRetry} className="flex-1">
                            <RefreshCw className="w-4 h-4 mr-2" />
                            {isCritical ? ERROR_MESSAGES.RELOAD : ERROR_MESSAGES.TRY_AGAIN}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
