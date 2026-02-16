"use client";

import { useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Menu } from 'lucide-react';
import { ProfileDropdown } from '@/src/components/shared/ProfileDropdown';
import { ThemeToggle } from '@/src/components/shared/ThemeToggle';
import { useAuth, useLogoutRedirect } from '@/src/features/auth';
import { adminNavItems } from '@/src/components/admin/Sidebar';
import { AdminSearch } from './header/AdminSearch';
import { SupportBadge } from './header/SupportBadge';
import { QuickLinksMenu } from './header/QuickLinksMenu';

export function Header({ onMenuClick }: { onMenuClick?: () => void }) {
    const pathname = usePathname();
    const router = useRouter();
    const { user } = useAuth();
    const { handleLogout } = useLogoutRedirect();

    const currentUser = {
        name: user?.name || 'Admin',
        email: user?.email || '',
        role: user?.role || 'admin',
        avatar: user?.avatar,
    };

    const visibleNavItems = useMemo(
        () => adminNavItems.filter((item) => !item.superAdminOnly || user?.role === 'super_admin'),
        [user?.role]
    );

    const activeItem = useMemo(() => {
        if (pathname === '/admin') {
            return visibleNavItems.find((item) => item.href === '/admin');
        }

        return visibleNavItems
            .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
            .sort((a, b) => b.href.length - a.href.length)[0];
    }, [pathname, visibleNavItems]);

    const getFallbackTitle = (path: string) => {
        const segment = path.split('/')[2];
        if (!segment) return 'Dashboard';
        return segment.charAt(0).toUpperCase() + segment.slice(1).replaceAll('-', ' ');
    };

    const handleSignOut = async () => {
        await handleLogout();
    };

    return (
        <header className="sticky top-0 z-[var(--z-header-sticky)] flex h-16 w-full items-center justify-between bg-[var(--bg-primary)]/95 backdrop-blur border-b border-[var(--border-subtle)] px-4 lg:px-6 transition-colors duration-200 gap-4">
            <div className="flex items-center gap-3 min-w-0">
                <button
                    onClick={onMenuClick}
                    className="lg:hidden h-9 w-9 rounded-lg flex items-center justify-center hover:bg-[var(--bg-hover)] transition-colors duration-150"
                    aria-label="Open admin navigation"
                >
                    <Menu className="h-5 w-5 text-[var(--text-secondary)]" />
                </button>
                <div className="min-w-0 flex flex-col justify-center">
                    <h1 className="truncate text-lg font-bold text-[var(--text-primary)] leading-tight">
                        {activeItem?.label || getFallbackTitle(pathname)}
                    </h1>
                    {/* Optional: Breadcrumbs or subtitle could go here if needed, keeping it clean for now */}
                </div>
            </div>

            <div className="flex flex-1 items-center justify-center max-w-2xl px-4 hidden md:flex">
                <AdminSearch navItems={visibleNavItems} />
            </div>

            <div className="flex items-center gap-3 md:gap-4 shrink-0">
                <div className="flex items-center gap-1 md:gap-2 mr-1">
                    <SupportBadge />
                    <QuickLinksMenu />
                </div>

                <div className="h-6 w-px bg-[var(--border-subtle)] hidden lg:block" />

                <div className="flex items-center gap-2">
                    <ThemeToggle />
                    <ProfileDropdown user={currentUser} onSignOut={handleSignOut} />
                </div>
            </div>
        </header>
    );
}
