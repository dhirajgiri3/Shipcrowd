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
                    'rounded-[--radius-lg]',
                    'transition-all duration-[--transition-fast]',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-[--color-primary] focus-visible:ring-offset-2',
                    'disabled:pointer-events-none disabled:opacity-50',
                    // Variant styles using design tokens
                    {
                        // Primary - Brand blue
                        'bg-[--color-primary] text-white hover:bg-[--color-primary-hover] active:scale-[0.98] shadow-[--shadow-sm] hover:shadow-[--shadow-primary]':
                            variant === 'primary',
                        // Secondary - Subtle gray
                        'bg-[--color-gray-100] text-[--color-gray-900] hover:bg-[--color-gray-200]':
                            variant === 'secondary',
                        // Outline - Border only
                        'border border-[--color-gray-200] text-[--color-gray-700] bg-white hover:text-[--color-primary] hover:border-[--color-primary] hover:bg-[--color-primary-50]':
                            variant === 'outline',
                        // Ghost - No background
                        'text-[--color-gray-600] hover:text-[--color-gray-900] hover:bg-[--color-gray-100]':
                            variant === 'ghost',
                        // Danger - Red
                        'bg-[--color-error] text-white hover:bg-[--color-error-dark] active:scale-[0.98]':
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
