import { ButtonHTMLAttributes, forwardRef, memo } from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

/**
 * Button Component
 * 
 * Primary interactive element using design system tokens.
 * All colors reference CSS custom properties from globals.css
 */

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg' | 'icon';
    isLoading?: boolean;
}

const Button = memo(forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {
        return (
            <button
                ref={ref}
                disabled={disabled || isLoading}
                className={cn(
                    // Base styles using design tokens
                    'inline-flex items-center justify-center font-medium',
                    'rounded-[var(--radius-lg)]',
                    'transition-all duration-[var(--duration-fast)]',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-blue)] focus-visible:ring-offset-2',
                    'disabled:pointer-events-none disabled:opacity-50',
                    // Variant styles using design tokens
                    {
                        // Primary - Brand blue
                        'bg-[var(--primary-blue)] text-white hover:bg-[var(--primary-blue-deep)] active:scale-[0.98] shadow-sm hover:shadow-md':
                            variant === 'primary',
                        // Secondary - Subtle gray
                        'bg-[var(--bg-tertiary)] text-[var(--text-primary)] hover:bg-[var(--bg-active)]':
                            variant === 'secondary',
                        // Outline - Border only
                        'border border-[var(--border-default)] text-[var(--text-secondary)] bg-[var(--bg-primary)] hover:text-[var(--primary-blue)] hover:border-[var(--primary-blue)] hover:bg-[var(--primary-blue-soft)]':
                            variant === 'outline',
                        // Ghost - No background
                        'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]':
                            variant === 'ghost',
                        // Danger - Red
                        'bg-[var(--error)] text-white hover:bg-[var(--error-dark)] active:scale-[0.98]':
                            variant === 'danger',
                    },
                    // Size styles
                    {
                        'h-8 px-3 text-sm gap-1.5': size === 'sm',
                        'h-10 px-4 text-sm gap-2': size === 'md',
                        'h-12 px-6 text-base gap-2': size === 'lg',
                        'h-10 w-10 p-0': size === 'icon',
                    },
                    className
                )}
                {...props}
            >
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {children}
            </button>
        );
    }
));

Button.displayName = 'Button';

export { Button };
export type { ButtonProps };
