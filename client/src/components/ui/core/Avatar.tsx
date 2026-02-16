'use client';

import { cn } from '@/src/lib/utils';
import { forwardRef, useState } from 'react';

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
    src?: string | null;
    alt?: string;
    fallback?: string;
    size?: 'xs' | 'sm' | 'md' | 'lg';
}

const SIZE_CLASS = {
    xs: 'h-6 w-6',
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
} as const;

const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
    ({ className, src, alt, fallback, size = 'md', ...props }, ref) => {
        const [imgError, setImgError] = useState(false);
        const initials = fallback?.slice(0, 2).toUpperCase() || '?';

        return (
            <div
                ref={ref}
                className={cn(
                    'relative flex shrink-0 overflow-hidden rounded-full',
                    'ring-1 ring-[var(--border-subtle)]',
                    'bg-[var(--bg-tertiary)] transition-colors duration-200',
                    SIZE_CLASS[size],
                    className
                )}
                {...props}
            >
                {src && !imgError ? (
                    <img
                        src={src}
                        alt={alt ?? 'Avatar'}
                        className="aspect-square h-full w-full object-cover"
                        onError={() => setImgError(true)}
                    />
                ) : (
                    <div
                        className={cn(
                            'flex h-full w-full items-center justify-center font-semibold uppercase',
                            'text-[var(--text-secondary)]'
                        )}
                    >
                        {initials}
                    </div>
                )}
            </div>
        );
    }
);
Avatar.displayName = 'Avatar';

export { Avatar };
