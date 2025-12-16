import { InputHTMLAttributes, forwardRef, memo, ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Input Component
 * 
 * Form input using design system tokens.
 * Uses CSS custom properties for consistent theming.
 */

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
    icon?: ReactNode;
    rightIcon?: ReactNode;
    error?: boolean;
    size?: 'sm' | 'md' | 'lg';
}

const Input = memo(forwardRef<HTMLInputElement, InputProps>(
    ({ className, type, icon, rightIcon, error, size = 'md', ...props }, ref) => {
        return (
            <div className="relative w-full">
                {/* Left Icon */}
                {icon && (
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[--color-gray-400] pointer-events-none">
                        {icon}
                    </div>
                )}

                {/* Input */}
                <input
                    type={type}
                    ref={ref}
                    className={cn(
                        // Base styles using design tokens
                        'flex w-full bg-white text-[--color-gray-900]',
                        'rounded-[--radius-lg] border',
                        'placeholder:text-[--color-gray-400]',
                        'transition-colors duration-[--transition-fast]',
                        'focus:outline-none focus:ring-2 focus:ring-offset-0',
                        'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-[--color-gray-50]',
                        'file:border-0 file:bg-transparent file:text-sm file:font-medium',
                        // Size variants
                        {
                            'h-8 px-3 text-sm': size === 'sm',
                            'h-10 px-3 text-sm': size === 'md',
                            'h-12 px-4 text-base': size === 'lg',
                        },
                        // Icon padding
                        icon && 'pl-10',
                        rightIcon && 'pr-10',
                        // State variants using design tokens
                        error
                            ? 'border-[--color-error] focus:border-[--color-error] focus:ring-[--color-error-light]'
                            : 'border-[--color-gray-200] focus:border-[--color-primary] focus:ring-[--color-primary-light]',
                        className
                    )}
                    {...props}
                />

                {/* Right Icon */}
                {rightIcon && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[--color-gray-400]">
                        {rightIcon}
                    </div>
                )}
            </div>
        );
    }
));

Input.displayName = 'Input';

export { Input };
