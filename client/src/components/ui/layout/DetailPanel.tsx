"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from '@/src/components/ui/core/Button';
import { cn } from '@/src/lib/utils';

interface DetailPanelProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    subtitle?: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
    width?: 'sm' | 'md' | 'lg';
}

const widthClasses = {
    sm: 'sm:w-[400px]',
    md: 'sm:w-[500px]',
    lg: 'sm:w-[600px]'
};

export const DetailPanel = React.memo(DetailPanelComponent);

function DetailPanelComponent({
    isOpen,
    onClose,
    title,
    subtitle,
    children,
    footer,
    width = 'md'
}: DetailPanelProps) {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 h-[100dvh] bg-black/40 backdrop-blur-sm z-50 overflow-hidden"
                    />

                    {/* Panel */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className={cn(
                            "fixed top-0 right-0 h-[100dvh] w-full bg-[var(--bg-primary)] shadow-2xl z-50 border-l border-[var(--border-subtle)] flex flex-col",
                            widthClasses[width]
                        )}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-[var(--border-subtle)] bg-[var(--bg-primary)]">
                            <div>
                                <h2 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                                    {title}
                                </h2>
                                {subtitle && (
                                    <p className="text-sm text-[var(--text-muted)] mt-1">
                                        {subtitle}
                                    </p>
                                )}
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={onClose}
                                className="rounded-full hover:bg-[var(--bg-secondary)]"
                            >
                                <X className="w-5 h-5 text-[var(--text-secondary)]" />
                            </Button>
                        </div>

                        {/* Content Scrollable */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {children}
                        </div>

                        {/* Footer Actions */}
                        {footer && (
                            <div className="p-6 border-t border-[var(--border-subtle)] bg-[var(--bg-primary)]">
                                {footer}
                            </div>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
