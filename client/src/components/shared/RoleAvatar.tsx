import { cn } from '@/src/lib/utils';
import { Shield, Store, User, UserCog } from 'lucide-react';

type UserRole = 'super_admin' | 'admin' | 'seller' | 'staff' | string;

type RoleAvatarProps = {
    role: UserRole;
    name?: string;
    className?: string;
    size?: 'sm' | 'md' | 'lg';
};

const ROLE_META: Record<string, { icon: any; bg: string; fg: string }> = {
    super_admin: { icon: Shield, bg: 'bg-rose-100', fg: 'text-rose-700' },
    admin: { icon: UserCog, bg: 'bg-blue-100', fg: 'text-blue-700' },
    seller: { icon: Store, bg: 'bg-emerald-100', fg: 'text-emerald-700' },
    staff: { icon: User, bg: 'bg-amber-100', fg: 'text-amber-700' },
};

const SIZE_CLASS: Record<NonNullable<RoleAvatarProps['size']>, string> = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-16 w-16',
};

export function RoleAvatar({ role, name, className, size = 'md' }: RoleAvatarProps) {
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
                'rounded-full border border-[var(--border-subtle)] flex items-center justify-center',
                SIZE_CLASS[size],
                meta.bg,
                meta.fg,
                className
            )}
            aria-label={`${role} avatar`}
            title={role.replace('_', ' ')}
        >
            {size === 'sm' ? (
                <span className="text-[10px] font-semibold">{initials}</span>
            ) : (
                <Icon className={cn(size === 'lg' ? 'h-7 w-7' : 'h-5 w-5')} />
            )}
        </div>
    );
}
