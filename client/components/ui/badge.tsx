import { HTMLAttributes, memo } from 'react';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Badge Component
 * 
 * Status indicators using design system CSS custom properties.
 * Memoized for performance in tables/lists.
 */

const badgeVariants = cva(
    // Base styles using design tokens
    'inline-flex items-center font-medium rounded-[--radius-full] transition-colors duration-[--transition-fast]',
    {
        variants: {
            variant: {
                // Semantic variants using design tokens
                success: 'bg-[--color-success-light] text-[--color-success-dark] border border-[--color-success]/20',
                warning: 'bg-[--color-warning-light] text-[--color-warning-dark] border border-[--color-warning]/20',
                error: 'bg-[--color-error-light] text-[--color-error-dark] border border-[--color-error]/20',
                info: 'bg-[--color-info-light] text-[--color-info-dark] border border-[--color-info]/20',
                neutral: 'bg-[--color-gray-100] text-[--color-gray-700] border border-[--color-gray-200]',

                // Brand variant
                primary: 'bg-[--color-primary-light] text-[--color-primary] border border-[--color-primary]/20',

                // Utility variants
                outline: 'bg-transparent border border-[--color-gray-200] text-[--color-gray-700]',
                secondary: 'bg-[--color-gray-100] text-[--color-gray-600] border border-transparent',

                // Legacy support
                default: 'bg-[--color-gray-100] text-[--color-gray-700] border border-[--color-gray-200]',
                destructive: 'bg-[--color-error-light] text-[--color-error-dark] border border-[--color-error]/20',
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
