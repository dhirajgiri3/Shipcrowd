import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg' | 'icon';
    isLoading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {
        return (
            <button
                ref={ref}
                disabled={disabled || isLoading}
                className={cn(
                    'inline-flex items-center justify-center rounded-lg font-medium transition-all focus:outline-none disabled:pointer-events-none disabled:opacity-50',
                    {
                        'bg-[#2525FF] text-white hover:bg-[#1e1ecc] active:scale-[0.98]': variant === 'primary',
                        'bg-white text-gray-900 border border-gray-200 hover:bg-gray-50': variant === 'secondary',
                        'border border-gray-200 text-gray-700 hover:text-[#2525FF] hover:border-[#2525FF] hover:bg-[#2525FF]/5': variant === 'outline',
                        'hover:bg-gray-100 text-gray-600 hover:text-gray-900': variant === 'ghost',
                        'bg-red-600 text-white hover:bg-red-700': variant === 'danger',
                        'h-8 px-3 text-sm': size === 'sm',
                        'h-10 px-4 py-2': size === 'md',
                        'h-12 px-6 text-lg': size === 'lg',
                        'h-10 w-10': size === 'icon',
                    },
                    className
                )}
                {...props}
            >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {children}
            </button>
        );
    }
);
Button.displayName = 'Button';

export { Button };
