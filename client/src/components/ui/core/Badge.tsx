import { HTMLAttributes, memo } from 'react';
import { cn } from '@/src/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Badge Component
 * 
 * Status indicators using design system CSS custom properties.
 * Memoized for performance in tables/lists.
 */

const badgeVariants = cva(
    // Base styles using design tokens
    'inline-flex items-center font-medium rounded-md transition-colors duration-[var(--duration-fast)] ring-1 ring-inset',
    {
        variants: {
            variant: {
                // Semantic variants using design tokens - Sleek & Minimal
                // Using subtle backgrounds with matching text and very subtle ring
                success: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20',
                warning: 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20',
                error: 'bg-red-50 text-red-700 ring-red-600/10 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-500/20',
                info: 'bg-blue-50 text-blue-700 ring-blue-700/10 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-500/20',
                neutral: 'bg-gray-50 text-gray-600 ring-gray-500/10 dark:bg-gray-500/10 dark:text-gray-400 dark:ring-gray-500/20',
                pending: 'bg-orange-50 text-orange-700 ring-orange-600/20 dark:bg-orange-500/10 dark:text-orange-400 dark:ring-orange-500/20',

                // Brand variant
                primary: 'bg-[var(--primary-blue-soft)] text-[var(--primary-blue)] ring-[var(--primary-blue)]/20',

                // Utility variants
                outline: 'bg-transparent ring-[var(--border-default)] text-[var(--text-secondary)]',
                secondary: 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] ring-transparent',

                // Legacy support (mapped to new system)
                default: 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] ring-[var(--border-default)]',
                destructive: 'bg-red-50 text-red-700 ring-red-600/10',
            },
            size: {
                sm: 'px-1.5 py-0.5 text-[10px]',
                md: 'px-2 py-1 text-xs',
                lg: 'px-2.5 py-1 text-sm',
            },
        },
        defaultVariants: {
            variant: 'neutral',
            size: 'md',
        },
    }
);

export interface BadgeProps
    extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> { }

const Badge = memo(function Badge({ className, variant, size, ...props }: BadgeProps) {
    return (
        <span className={cn(badgeVariants({ variant, size }), className)} {...props} />
    );
});

Badge.displayName = 'Badge';

export { Badge, badgeVariants };
