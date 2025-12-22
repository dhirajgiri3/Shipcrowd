import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '../utils/cn';
import { Button } from './button';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
    if (!isOpen) return null;

    const sizeClasses = {
        sm: 'max-w-md',
        md: 'max-w-lg',
        lg: 'max-w-2xl',
        xl: 'max-w-4xl',
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div
                className={cn(
                    "relative w-full bg-[var(--bg-primary)] rounded-xl shadow-2xl border border-[var(--border-default)] mx-4 max-h-[90vh] overflow-hidden flex flex-col",
                    sizeClasses[size]
                )}
            >
                {/* Header */}
                {title && (
                    <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-default)]">
                        <h3 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h3>
                        <button
                            onClick={onClose}
                            className="p-1 rounded-lg hover:bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                )}

                {/* Content */}
                <div className="px-6 py-4 overflow-y-auto flex-1">
                    {children}
                </div>
            </div>
        </div>
    );
}
