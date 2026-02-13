"use client";

import { useState, useEffect, useMemo, type FormEvent } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Search, Menu, Truck, Plus, Wallet } from 'lucide-react';
import { ProfileDropdown } from '@/src/components/shared/ProfileDropdown';
import { NotificationCenter } from '@/src/components/shared/NotificationCenter';
import { ThemeToggle } from '@/src/components/shared/ThemeToggle';
import { Tooltip } from '@/src/components/ui/feedback/Tooltip';
import { cn } from '@/src/lib/utils';
import { useAuth, useLogoutRedirect } from '@/src/features/auth';
import { useWalletBalance } from '@/src/core/api/hooks/finance/useWallet';
import { sellerNavSections, sellerAccountItems, sellerSupportItems } from '@/src/components/seller/layout/Sidebar';

export function Header({ onMenuClick }: { onMenuClick?: () => void }) {
    const pathname = usePathname();
    const router = useRouter();
    const { user } = useAuth();
    const { handleLogout } = useLogoutRedirect();
    const { data: walletData, isLoading: isWalletLoading } = useWalletBalance();

    const [searchFocused, setSearchFocused] = useState(false);
    const [searchValue, setSearchValue] = useState('');

    const currentUser = {
        name: user?.name || 'Seller',
        email: user?.email || '',
        role: user?.role || 'seller',
        avatar: user?.avatar,
    };

    const navItems = useMemo(
        () => [...sellerNavSections.flatMap((section) => section.items), ...sellerAccountItems, ...sellerSupportItems],
        []
    );

    const activeItem = useMemo(() => {
        if (pathname === '/seller') {
            return navItems.find((item) => item.href === '/seller');
        }

        return navItems
            .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
            .sort((a, b) => b.href.length - a.href.length)[0];
    }, [navItems, pathname]);

    const searchResults = useMemo(() => {
        const q = searchValue.trim().toLowerCase();
        if (!q) return [];

        return navItems
            .filter((item) => item.label.toLowerCase().includes(q) || item.href.toLowerCase().includes(q))
            .slice(0, 6);
    }, [searchValue, navItems]);

    const hasCompanyContext = Boolean(user?.companyId);
    const walletBalance = walletData?.balance ?? 0;

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

        const exact = navItems.find((item) => item.label.toLowerCase() === searchValue.trim().toLowerCase());
        const first = exact ?? searchResults[0];
        if (first) {
            navigateTo(first.href);
        }
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                const searchInput = document.getElementById('global-search-seller');
                searchInput?.focus();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const walletText = !hasCompanyContext
        ? 'No Company'
        : isWalletLoading
            ? 'Loading...'
            : formatCurrency(walletBalance);

    return (
        <header className="sticky top-0 z-[var(--z-header-sticky)] flex h-14 w-full items-center justify-between bg-[var(--bg-primary)]/95 backdrop-blur border-b border-[var(--border-subtle)] px-4 lg:px-6 transition-colors duration-200">
            <div className="flex items-center gap-3 min-w-0">
                <button
                    onClick={onMenuClick}
                    className="lg:hidden h-9 w-9 rounded-lg flex items-center justify-center hover:bg-[var(--bg-hover)] transition-colors duration-150"
                    aria-label="Open seller navigation"
                >
                    <Menu className="h-5 w-5 text-[var(--text-secondary)]" />
                </button>
                <h1 className="truncate text-lg font-semibold text-[var(--text-primary)]">{activeItem?.label || 'Dashboard'}</h1>
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
                            id="global-search-seller"
                            type="text"
                            value={searchValue}
                            onChange={(e) => setSearchValue(e.target.value)}
                            placeholder="Search seller pages..."
                            onFocus={() => setSearchFocused(true)}
                            onBlur={() => setTimeout(() => setSearchFocused(false), 120)}
                            className="flex-1 bg-transparent border-none outline-none text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                            aria-label="Search seller pages"
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
                <div className="hidden lg:flex items-center gap-2">
                    <Tooltip content={hasCompanyContext ? 'Manage Wallet' : 'No company linked'} side="bottom">
                        <button
                            onClick={() => navigateTo('/seller/wallet')}
                            disabled={!hasCompanyContext}
                            className={cn(
                                'h-9 px-3 rounded-lg flex items-center gap-2 transition-colors duration-150 border',
                                hasCompanyContext
                                    ? 'bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] border-[var(--border-subtle)] hover:border-[var(--border-default)]'
                                    : 'bg-[var(--bg-secondary)] border-[var(--border-subtle)] opacity-60 cursor-not-allowed'
                            )}
                        >
                            <Wallet className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
                            <div className="flex flex-col items-start leading-none">
                                <span className="text-[9px] uppercase font-semibold text-[var(--text-muted)] tracking-wide">Balance</span>
                                <span className="text-xs font-semibold text-[var(--text-primary)] tabular-nums">{walletText}</span>
                            </div>
                        </button>
                    </Tooltip>

                    <Tooltip content="Create New Order" side="bottom">
                        <button
                            onClick={() => navigateTo('/seller/orders/create')}
                            className="h-9 px-3 rounded-lg text-xs font-semibold text-white bg-[var(--primary-blue)] hover:bg-[var(--primary-blue-deep)] transition-colors duration-150 flex items-center gap-1.5"
                        >
                            <Plus className="h-3.5 w-3.5" />
                            <span className="hidden xl:inline">New Order</span>
                        </button>
                    </Tooltip>

                    <Tooltip content="Track Order" side="bottom">
                        <button
                            onClick={() => navigateTo('/seller/tracking')}
                            className="h-9 w-9 rounded-lg flex items-center justify-center text-[var(--text-secondary)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)] hover:border-[var(--border-default)] transition-colors duration-150"
                        >
                            <Truck className="h-4 w-4" />
                        </button>
                    </Tooltip>
                </div>

                <div className="h-6 w-px bg-[var(--border-subtle)] hidden lg:block mx-1" />

                <div className="flex items-center gap-1">
                    <ThemeToggle />
                    <NotificationCenter />
                    <ProfileDropdown user={currentUser} onSignOut={handleSignOut} />
                </div>
            </div>
        </header>
    );
}
