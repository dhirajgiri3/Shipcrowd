import { InputHTMLAttributes, forwardRef } from 'react';
import { Search } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
    /** Width class, defaults to w-72 */
    widthClass?: string;
}

const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
    ({ className, widthClass = 'w-72', ...props }, ref) => {
        return (
            <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                <input
                    ref={ref}
                    type="text"
                    className={cn(
                        'pl-10 pr-4 py-2.5 h-11 rounded-xl text-sm transition-all',
                        'bg-[var(--bg-primary)] border border-[var(--border-subtle)] shadow-sm',
                        'focus:border-[var(--primary-blue)] focus:ring-1 focus:ring-[var(--primary-blue)]',
                        'placeholder:text-[var(--text-muted)]',
                        widthClass,
                        className
                    )}
                    {...props}
                />
            </div>
        );
    }
);

SearchInput.displayName = 'SearchInput';

export { SearchInput };
export type { SearchInputProps };
