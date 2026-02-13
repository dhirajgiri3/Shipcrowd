"use client";

import { useState, useEffect, useMemo, type FormEvent } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Search, Menu } from 'lucide-react';
import { ProfileDropdown } from '@/src/components/shared/ProfileDropdown';
import { ThemeToggle } from '@/src/components/shared/ThemeToggle';
import { NotificationCenter } from '@/src/components/shared/NotificationCenter';
import { cn } from '@/src/lib/utils';
import { useAuth, useLogoutRedirect } from '@/src/features/auth';
import { adminNavItems } from '@/src/components/admin/Sidebar';

export function Header({ onMenuClick }: { onMenuClick?: () => void }) {
    const pathname = usePathname();
    const router = useRouter();
    const { user } = useAuth();
    const { handleLogout } = useLogoutRedirect();
    const [searchFocused, setSearchFocused] = useState(false);
    const [searchValue, setSearchValue] = useState('');

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

    const searchResults = useMemo(() => {
        const q = searchValue.trim().toLowerCase();
        if (!q) return [];

        return visibleNavItems
            .filter((item) => item.label.toLowerCase().includes(q) || item.href.toLowerCase().includes(q))
            .slice(0, 6);
    }, [searchValue, visibleNavItems]);

    const getFallbackTitle = (path: string) => {
        const segment = path.split('/')[2];
        if (!segment) return 'Dashboard';
        return segment.charAt(0).toUpperCase() + segment.slice(1).replaceAll('-', ' ');
    };

    const handleSignOut = async () => {
        await handleLogout();
    };

    const navigateTo = (href: string) => {
        router.push(href);
        setSearchValue('');
        setSearchFocused(false);
    };

    const onSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!searchValue.trim()) return;

        const exact = visibleNavItems.find((item) => item.label.toLowerCase() === searchValue.trim().toLowerCase());
        const first = exact ?? searchResults[0];
        if (first) {
            navigateTo(first.href);
        }
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                const searchInput = document.getElementById('global-search-admin');
                searchInput?.focus();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <header className="sticky top-0 z-[var(--z-header-sticky)] flex h-14 w-full items-center justify-between bg-[var(--bg-primary)]/95 backdrop-blur border-b border-[var(--border-subtle)] px-4 lg:px-6 transition-colors duration-200">
            <div className="flex items-center gap-3 min-w-0">
                <button
                    onClick={onMenuClick}
                    className="lg:hidden h-9 w-9 rounded-lg flex items-center justify-center hover:bg-[var(--bg-hover)] transition-colors duration-150"
                    aria-label="Open admin navigation"
                >
                    <Menu className="h-5 w-5 text-[var(--text-secondary)]" />
                </button>
                <div className="min-w-0">
                    <h1 className="truncate text-lg font-semibold text-[var(--text-primary)]">{activeItem?.label || getFallbackTitle(pathname)}</h1>
                </div>
            </div>

            <div className="hidden md:flex flex-1 max-w-xl mx-8">
                <form onSubmit={onSearchSubmit} className={cn('relative w-full transition-all duration-200', searchFocused && 'z-[var(--z-search-focus)]')}>
                    <div className={cn(
                        'absolute inset-0 rounded-xl transition-all duration-200',
                        'bg-[var(--bg-secondary)] border border-[var(--border-subtle)]',
                        searchFocused && 'border-[var(--border-focus)] ring-1 ring-[var(--border-focus)]/20'
                    )} />

                    <div className="relative flex items-center px-3 h-10">
                        <Search className={cn(
                            'h-4 w-4 mr-2.5 transition-colors duration-150 flex-shrink-0',
                            searchFocused ? 'text-[var(--text-secondary)]' : 'text-[var(--text-muted)]'
                        )} />
                        <input
                            id="global-search-admin"
                            type="text"
                            value={searchValue}
                            onChange={(e) => setSearchValue(e.target.value)}
                            placeholder="Search pages..."
                            onFocus={() => setSearchFocused(true)}
                            onBlur={() => setTimeout(() => setSearchFocused(false), 120)}
                            className="flex-1 bg-transparent border-none outline-none text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                            aria-label="Search admin pages"
                        />
                        <kbd className={cn(
                            'hidden lg:flex h-5 items-center justify-center px-1.5 text-[10px] font-medium text-[var(--text-muted)] bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded transition-opacity duration-150',
                            searchFocused ? 'opacity-100' : 'opacity-60'
                        )}>⌘K</kbd>
                    </div>

                    {searchFocused && searchValue.trim() && (
                        <div className="absolute top-[calc(100%+0.4rem)] w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] shadow-lg overflow-hidden">
                            {searchResults.length > 0 ? (
                                <ul className="max-h-72 overflow-y-auto py-1">
                                    {searchResults.map((item) => (
                                        <li key={item.href}>
                                            <button
                                                type="button"
                                                onMouseDown={() => navigateTo(item.href)}
                                                className="w-full text-left px-3 py-2.5 hover:bg-[var(--bg-hover)] transition-colors"
                                            >
                                                <p className="text-sm font-medium text-[var(--text-primary)]">{item.label}</p>
                                                <p className="text-xs text-[var(--text-muted)]">{item.href}</p>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="px-3 py-2.5 text-sm text-[var(--text-muted)]">No matching pages</p>
                            )}
                        </div>
                    )}
                </form>
            </div>

            <div className="flex items-center gap-2">
                <div className="h-6 w-px bg-[var(--border-subtle)] hidden lg:block" />

                <div className="flex items-center gap-1">
                    <ThemeToggle />
                    <NotificationCenter />
                    <ProfileDropdown user={currentUser} onSignOut={handleSignOut} />
                </div>
            </div>
        </header>
    );
}
