import { cn } from '@/src/lib/utils';
import { useState } from 'react';
import { Shield, Store, User, UserCog } from 'lucide-react';

type UserRole = 'super_admin' | 'admin' | 'seller' | 'staff' | string;

type RoleAvatarProps = {
    role: UserRole;
    name?: string;
    src?: string | null;
    className?: string;
    size?: 'sm' | 'md' | 'lg';
};

/** Role-based avatar with light/dark mode support via design system */
const ROLE_META: Record<string, { icon: typeof Shield; bg: string; fg: string }> = {
    super_admin: {
        icon: Shield,
        bg: 'bg-rose-100 dark:bg-rose-900/40',
        fg: 'text-rose-700 dark:text-rose-300',
    },
    admin: {
        icon: UserCog,
        bg: 'bg-blue-100 dark:bg-blue-900/40',
        fg: 'text-blue-700 dark:text-blue-300',
    },
    seller: {
        icon: Store,
        bg: 'bg-emerald-100 dark:bg-emerald-900/40',
        fg: 'text-emerald-700 dark:text-emerald-300',
    },
    staff: {
        icon: User,
        bg: 'bg-amber-100 dark:bg-amber-900/40',
        fg: 'text-amber-700 dark:text-amber-300',
    },
};

const SIZE_CLASS: Record<NonNullable<RoleAvatarProps['size']>, string> = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-16 w-16',
};

const ICON_SIZE: Record<NonNullable<RoleAvatarProps['size']>, string> = {
    sm: 'h-3.5 w-3.5',
    md: 'h-5 w-5',
    lg: 'h-7 w-7',
};

const INITIALS_SIZE: Record<NonNullable<RoleAvatarProps['size']>, string> = {
    sm: 'text-[10px]',
    md: 'text-xs',
    lg: 'text-sm',
};

export function RoleAvatar({ role, name, src, className, size = 'md' }: RoleAvatarProps) {
    const [imgError, setImgError] = useState(false);
    const showImage = src && !imgError;

    const meta = ROLE_META[role] || ROLE_META.staff;
    const Icon = meta.icon;
    const initials = (name || 'User')
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    return (
        <div
            className={cn(
                'rounded-full flex items-center justify-center shrink-0 overflow-hidden',
                'ring-1 ring-[var(--border-subtle)]',
                'transition-colors duration-200',
                !showImage && meta.bg,
                !showImage && meta.fg,
                SIZE_CLASS[size],
                className
            )}
            aria-label={`${role} avatar`}
            title={role.replace(/_/g, ' ')}
        >
            {showImage ? (
                <img
                    src={src}
                    alt={name ? `${name} avatar` : 'Avatar'}
                    className="aspect-square h-full w-full object-cover"
                    onError={() => setImgError(true)}
                />
            ) : size === 'sm' ? (
                <span className={cn('font-semibold tracking-tight', INITIALS_SIZE[size])}>{initials}</span>
            ) : (
                <Icon className={cn('shrink-0', ICON_SIZE[size])} strokeWidth={2} />
            )}
        </div>
    );
}
