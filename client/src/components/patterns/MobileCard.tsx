/**
 * MobileCard - Responsive card component optimized for mobile
 * Psychology: Scannable information hierarchy, touch-friendly
 *
 * Usage:
 * <MobileCard
 *   header={<>Status + AWB</>}
 *   body={<>Customer info</>}
 *   footer={<>Actions</>}
 *   variant="elevated"
 * />
 */

'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface MobileCardProps {
    header?: ReactNode;
    body: ReactNode;
    footer?: ReactNode;
    variant?: 'flat' | 'elevated' | 'bordered' | 'ghost';
    status?: 'default' | 'success' | 'warning' | 'error' | 'info';
    onClick?: () => void;
    className?: string;
    animation?: boolean;
}

export function MobileCard({
    header,
    body,
    footer,
    variant = 'elevated',
    status = 'default',
    onClick,
    className = '',
    animation = true
}: MobileCardProps) {
    // Variant styles
    const variantClasses = {
        flat: 'bg-[var(--bg-primary)]',
        elevated: 'bg-[var(--bg-primary)] shadow-[var(--shadow-sm)]',
        bordered: 'bg-[var(--bg-primary)] border border-[var(--border-default)]',
        ghost: 'bg-transparent'
    };

    // Status styles (border accent)
    const statusClasses = {
        default: '',
        success: 'border-l-4 border-l-[var(--success)]',
        warning: 'border-l-4 border-l-[var(--warning)]',
        error: 'border-l-4 border-l-[var(--error)]',
        info: 'border-l-4 border-l-[var(--info)]'
    };

    const Component = animation ? motion.div : 'div';
    const animationProps = animation ? {
        whileHover: onClick ? { scale: 1.01, y: -2 } : undefined,
        whileTap: onClick ? { scale: 0.99 } : undefined,
        transition: { type: 'spring' as const, damping: 25, stiffness: 300 }
    } : {};

    return (
        <Component
            onClick={onClick}
            className={`
                rounded-[var(--radius-xl)]
                overflow-hidden
                ${variantClasses[variant]}
                ${statusClasses[status]}
                ${onClick ? 'cursor-pointer hover:shadow-[var(--shadow-md)] transition-shadow duration-[var(--duration-base)]' : ''}
                ${className}
            `}
            {...animationProps}
        >
            {/* Header */}
            {header && (
                <div className="px-4 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
                    {header}
                </div>
            )}

            {/* Body */}
            <div className="px-4 py-4">
                {body}
            </div>

            {/* Footer */}
            {footer && (
                <div className="px-4 py-3 border-t border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
                    {footer}
                </div>
            )}
        </Component>
    );
}

/**
 * MobileCardStack - Stacked cards with stagger animation
 */
interface MobileCardStackProps {
    children: ReactNode;
    gap?: 'sm' | 'md' | 'lg';
    staggerDelay?: number;
}

export function MobileCardStack({
    children,
    gap = 'md',
    staggerDelay = 0.05
}: MobileCardStackProps) {
    const gapClasses = {
        sm: 'space-y-2',
        md: 'space-y-4',
        lg: 'space-y-6'
    };

    return (
        <motion.div
            className={gapClasses[gap]}
            initial="hidden"
            animate="visible"
            variants={{
                hidden: { opacity: 0 },
                visible: {
                    opacity: 1,
                    transition: {
                        staggerChildren: staggerDelay
                    }
                }
            }}
        >
            {children}
        </motion.div>
    );
}

/**
 * MobileCardSkeleton - Loading placeholder for MobileCard
 */
export function MobileCardSkeleton() {
    return (
        <div className="rounded-[var(--radius-xl)] bg-[var(--bg-primary)] border border-[var(--border-subtle)] overflow-hidden">
            {/* Header skeleton */}
            <div className="px-4 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
                <div className="flex items-center justify-between">
                    <div className="skeleton h-4 w-24 rounded-md" />
                    <div className="skeleton h-5 w-20 rounded-full" />
                </div>
            </div>

            {/* Body skeleton */}
            <div className="px-4 py-4 space-y-3">
                <div className="skeleton h-4 w-3/4 rounded-md" />
                <div className="skeleton h-4 w-full rounded-md" />
                <div className="skeleton h-4 w-2/3 rounded-md" />
            </div>

            {/* Footer skeleton */}
            <div className="px-4 py-3 border-t border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
                <div className="flex items-center gap-2">
                    <div className="skeleton h-8 w-8 rounded-full" />
                    <div className="skeleton h-8 w-8 rounded-full" />
                    <div className="skeleton h-8 flex-1 rounded-lg ml-auto" />
                </div>
            </div>
        </div>
    );
}
