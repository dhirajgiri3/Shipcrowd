import { HTMLAttributes, forwardRef, memo } from 'react';
import { cn } from '@/lib/utils';

/**
 * Card Components
 * 
 * Container components using design system CSS custom properties.
 * Memoized for performance.
 */

// ═══════════════════════════════════════════════════════════════════════════
// CARD
// ═══════════════════════════════════════════════════════════════════════════

interface CardProps extends HTMLAttributes<HTMLDivElement> {
    hover?: boolean;
    padding?: 'none' | 'sm' | 'md' | 'lg';
}

const Card = memo(forwardRef<HTMLDivElement, CardProps>(
    ({ className, hover = false, padding, ...props }, ref) => (
        <div
            ref={ref}
            className={cn(
                // Base styles using design tokens
                'rounded-[var(--radius-xl)] border border-[var(--border-default)] bg-[var(--bg-primary)]',
                // Hover state (optional)
                hover && 'transition-all duration-[var(--duration-base)] hover:border-[var(--border-strong)] hover:-translate-y-0.5',
                // Padding variants
                {
                    'p-0': padding === 'none',
                    'p-4': padding === 'sm',
                    'p-6': padding === 'md',
                    'p-8': padding === 'lg',
                },
                className
            )}
            {...props}
        />
    )
));
Card.displayName = 'Card';

// ═══════════════════════════════════════════════════════════════════════════
// CARD HEADER
// ═══════════════════════════════════════════════════════════════════════════

const CardHeader = memo(forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
        <div
            ref={ref}
            className={cn('flex flex-col space-y-1.5 p-6', className)}
            {...props}
        />
    )
));
CardHeader.displayName = 'CardHeader';

// ═══════════════════════════════════════════════════════════════════════════
// CARD TITLE
// ═══════════════════════════════════════════════════════════════════════════

const CardTitle = memo(forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
    ({ className, ...props }, ref) => (
        <h3
            ref={ref}
            className={cn(
                'font-semibold leading-none tracking-tight text-[var(--text-primary)]',
                className
            )}
            {...props}
        />
    )
));
CardTitle.displayName = 'CardTitle';

// ═══════════════════════════════════════════════════════════════════════════
// CARD DESCRIPTION
// ═══════════════════════════════════════════════════════════════════════════

const CardDescription = memo(forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
    ({ className, ...props }, ref) => (
        <p
            ref={ref}
            className={cn('text-sm text-[var(--text-muted)]', className)}
            {...props}
        />
    )
));
CardDescription.displayName = 'CardDescription';

// ═══════════════════════════════════════════════════════════════════════════
// CARD CONTENT
// ═══════════════════════════════════════════════════════════════════════════

const CardContent = memo(forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
        <div
            ref={ref}
            className={cn('p-6 pt-0', className)}
            {...props}
        />
    )
));
CardContent.displayName = 'CardContent';

// ═══════════════════════════════════════════════════════════════════════════
// CARD FOOTER
// ═══════════════════════════════════════════════════════════════════════════

const CardFooter = memo(forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
        <div
            ref={ref}
            className={cn(
                'flex items-center p-6 pt-0',
                className
            )}
            {...props}
        />
    )
));
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
export type { CardProps };
