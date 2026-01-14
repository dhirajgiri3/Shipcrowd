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
    'inline-flex items-center font-medium rounded-[var(--radius-full)] transition-colors duration-[var(--duration-fast)]',
    {
        variants: {
            variant: {
                // Semantic variants using design tokens
                success: 'bg-[var(--success-bg)] text-[var(--text-success)] border border-[var(--success-border)]',
                warning: 'bg-[var(--warning-bg)] text-[var(--text-warning)] border border-[var(--warning-border)]',
                error: 'bg-[var(--error-bg)] text-[var(--text-error)] border border-[var(--error-border)]',
                info: 'bg-[var(--info-bg)] text-[var(--info)] border border-[var(--info-border)]',
                neutral: 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border border-[var(--border-default)]',

                // Brand variant
                primary: 'bg-[var(--primary-blue-soft)] text-[var(--primary-blue)] border border-[var(--primary-blue-medium)]',

                // Utility variants
                outline: 'bg-transparent border border-[var(--border-default)] text-[var(--text-secondary)]',
                secondary: 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border border-transparent',

                // Legacy support (mapped to new system)
                default: 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border border-[var(--border-default)]',
                destructive: 'bg-[var(--error-bg)] text-[var(--text-error)] border border-[var(--error-border)]',
            },
            size: {
                sm: 'px-2 py-0.5 text-[10px]',
                md: 'px-2.5 py-0.5 text-xs',
                lg: 'px-3 py-1 text-sm',
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
