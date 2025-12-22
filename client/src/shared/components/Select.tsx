import * as React from 'react';
import { cn } from '../utils/cn';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
    value: string;
    label: string;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
    options: SelectOption[];
    placeholder?: string;
    error?: string;
    onChange?: (value: string) => void;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
    ({ className, options, placeholder, error, onChange, value, ...props }, ref) => {
        const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
            onChange?.(e.target.value);
        };

        return (
            <div className="w-full relative">
                <select
                    className={cn(
                        "flex h-10 w-full appearance-none rounded-md border border-[var(--border-default)] bg-[var(--bg-primary)] px-3 py-2 pr-10 text-sm text-[var(--text-primary)] ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-blue)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                        error && "border-red-500 focus-visible:ring-red-500",
                        !value && "text-[var(--text-muted)]",
                        className
                    )}
                    ref={ref}
                    value={value}
                    onChange={handleChange}
                    {...props}
                >
                    {placeholder && (
                        <option value="" disabled>
                            {placeholder}
                        </option>
                    )}
                    {options.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                {error && (
                    <p className="mt-1 text-xs text-red-500">{error}</p>
                )}
            </div>
        );
    }
);
Select.displayName = "Select";

export { Select };
