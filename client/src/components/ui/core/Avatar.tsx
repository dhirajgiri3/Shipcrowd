import { cn } from '@/src/lib/utils';
import { forwardRef } from 'react';

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
    src?: string;
    alt?: string;
    fallback?: string;
}

const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
    ({ className, src, alt, fallback, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn(
                    'relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full',
                    className
                )}
                {...props}
            >
                {src ? (
                    <img
                        src={src}
                        alt={alt}
                        className="aspect-square h-full w-full object-cover"
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center rounded-full bg-muted">
                        <span className="text-sm font-medium uppercase text-muted-foreground">
                            {fallback?.slice(0, 2)}
                        </span>
                    </div>
                )}
            </div>
        );
    }
);
Avatar.displayName = 'Avatar';

export { Avatar };
