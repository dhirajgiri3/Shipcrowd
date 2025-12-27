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
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none">
                        {icon}
                    </div>
                )}

                {/* Input */}
                <input
                    type={type}
                    ref={ref}
                    className={cn(
                        // Base styles using design tokens
                        'flex w-full bg-[var(--bg-primary)] text-[var(--text-primary)]',
                        'rounded-[var(--radius-lg)] border',
                        'placeholder:text-[var(--text-muted)]',
                        'transition-colors duration-[var(--duration-fast)]',
                        'focus:outline-none focus:ring-2 focus:ring-offset-0',
                        'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-[var(--bg-secondary)]',
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
                            ? 'border-[var(--border-error)] focus:border-[var(--border-error)] focus:ring-[var(--error-light)]'
                            : 'border-[var(--border-default)] focus:border-[var(--border-focus)] focus:ring-[var(--primary-blue-soft)]',
                        className
                    )}
                    {...props}
                />

                {/* Right Icon */}
                {rightIcon && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
                        {rightIcon}
                    </div>
                )}
            </div>
        );
    }
));

Input.displayName = 'Input';

export { Input };
