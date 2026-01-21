import { ButtonHTMLAttributes, forwardRef, memo } from 'react';
import { cn } from '@/src/lib/utils';
import { DotsLoader } from '@/src/components/ui/feedback/Loader';

/**
 * Enhanced Button Component - Premium UI/UX for Shipping Aggregator
 *
 * Features:
 * - Smooth animations and micro-interactions
 * - Integrated centralized loader (DotsLoader)
 * - Accessibility-first design
 * - Design system tokens from globals.css
 * - 100% backward compatible - same API as before
 *
 * @example
 * <Button variant="primary" size="md" isLoading={submitting}>
 *   Create Shipment
 * </Button>
 */

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'link';
    size?: 'sm' | 'md' | 'lg' | 'icon';
    isLoading?: boolean;
}

const Button = memo(forwardRef<HTMLButtonElement, ButtonProps>(
    ({
        className,
        variant = 'primary',
        size = 'md',
        isLoading,
        children,
        disabled,
        ...props
    }, ref) => {
        return (
            <button
                ref={ref}
                disabled={disabled || isLoading}
                className={cn(
                    // Base styles - Enhanced for premium feel
                    'group relative inline-flex items-center justify-center',
                    'font-medium tracking-wide',
                    'rounded-[var(--radius-lg)]',
                    'transition-all duration-200 ease-out',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                    'disabled:pointer-events-none',
                    'overflow-hidden',

                    // Disabled state - Subtle and consistent
                    'disabled:opacity-60 disabled:saturate-50',

                    // Interactive states - Smooth transitions
                    'active:scale-[0.98]',
                    'transform-gpu', // Hardware acceleration

                    // Variant styles - Premium design system
                    variant === 'primary' && [
                        'bg-gradient-to-b from-[var(--primary-blue)] to-[var(--primary-blue-deep)]',
                        'text-white',
                        !isLoading && !disabled && 'hover:brightness-110',
                        'focus-visible:ring-[var(--primary-blue)]',
                    ],

                    variant === 'secondary' && [
                        'bg-[var(--bg-tertiary)] text-[var(--text-primary)]',
                        'border border-[var(--border-subtle)]',
                        !isLoading && !disabled && 'hover:bg-[var(--bg-active)] hover:border-[var(--border-default)]',
                        'focus-visible:ring-[var(--text-secondary)]',
                    ],

                    variant === 'outline' && [
                        'border border-[var(--border-default)]',
                        'text-[var(--text-secondary)] bg-[var(--bg-primary)]',
                        !isLoading && !disabled && 'hover:text-[var(--primary-blue)] hover:border-[var(--primary-blue)] hover:bg-[var(--primary-blue-soft)]',
                        'focus-visible:ring-[var(--primary-blue)]',
                    ],

                    variant === 'ghost' && [
                        'text-[var(--text-secondary)] bg-transparent',
                        !isLoading && !disabled && 'hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]',
                        'focus-visible:ring-[var(--text-muted)]',
                    ],

                    variant === 'danger' && [
                        'bg-[var(--error)] text-white',
                        !isLoading && !disabled && 'hover:bg-[var(--error-light)]',
                        'focus-visible:ring-[var(--error)]',
                    ],

                    variant === 'link' && [
                        'text-[var(--primary-blue)] bg-transparent px-0 shadow-none',
                        'underline-offset-4',
                        !isLoading && !disabled && 'hover:underline hover:brightness-90',
                        'focus-visible:ring-[var(--primary-blue)]',
                    ],

                    // Size styles - Comfortable touch targets
                    size === 'sm' && 'h-8 px-3 text-xs gap-1.5',
                    size === 'md' && 'h-10 px-4 text-sm gap-2',
                    size === 'lg' && 'h-12 px-6 text-base gap-2',
                    size === 'icon' && 'h-10 w-10 p-0',

                    className
                )}
                {...props}
            >
                {/* Shimmer effect on hover - Premium touch */}
                {!disabled && !isLoading && variant !== 'link' && variant !== 'ghost' && (
                    <span
                        className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out bg-gradient-to-r from-transparent via-white/20 to-transparent"
                        aria-hidden="true"
                    />
                )}

                {/* Loading state with centralized DotsLoader */}
                {isLoading && (
                    <DotsLoader size={size === 'lg' ? 'md' : 'sm'} />
                )}

                {/* Button content */}
                {!isLoading && children}
            </button>
        );
    }
));

Button.displayName = 'Button';

export { Button };
export type { ButtonProps };
