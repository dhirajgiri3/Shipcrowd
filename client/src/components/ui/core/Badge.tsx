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
    // Base styles using design tokens - Sleek, Flat, Premium
    'inline-flex items-center font-medium rounded-md transition-all duration-[var(--duration-fast)]',
    {
        variants: {
            variant: {
                // Semantic variants - Flat & Clean (No Rings)
                // Using semantic CSS variables where possible for consistency
                success: 'bg-[var(--success-bg)] text-[var(--success)] hover:bg-[var(--success-bg)]/80',
                warning: 'bg-[var(--warning-bg)] text-[var(--warning)] hover:bg-[var(--warning-bg)]/80',
                error: 'bg-[var(--error-bg)] text-[var(--error)] hover:bg-[var(--error-bg)]/80',
                info: 'bg-[var(--info-bg)] text-[var(--info)] hover:bg-[var(--info-bg)]/80',

                // Neutral - Soft gray
                neutral: 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]',

                // Pending/Orange (Mapped to Warning usually, but distinct if needed)
                pending: 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400',

                // Brand variant - Premium Blue
                primary: 'bg-[var(--primary-blue-soft)] text-[var(--primary-blue)] hover:bg-[var(--primary-blue-soft)]/80',

                // Utility variants
                outline: 'bg-transparent border border-[var(--border-default)] text-[var(--text-secondary)]',
                secondary: 'bg-[var(--bg-tertiary)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)]',

                // Legacy/Destructive
                default: 'bg-[var(--bg-secondary)] text-[var(--text-primary)]',
                destructive: 'bg-[var(--error-bg)] text-[var(--error)]',
            },
            size: {
                sm: 'px-2 py-0.5 text-[10px] uppercase tracking-wider font-bold', // Micro-labels
                md: 'px-2.5 py-1 text-xs font-semibold', // Standard
                lg: 'px-3 py-1.5 text-sm font-semibold', // Large indicators
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
