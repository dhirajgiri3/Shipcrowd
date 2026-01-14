"use client";

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Search, Menu, Truck, Plus, Wallet } from 'lucide-react';
import { ProfileDropdown } from '@/components/shared/ProfileDropdown';
import { NotificationCenter } from '@/components/shared/NotificationCenter';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { Tooltip } from '@/components/ui/feedback/Tooltip';
import { cn } from '@/src/lib/utils';
import { useAuth } from '@/src/features/auth';

export function Header({ onMenuClick }: { onMenuClick?: () => void }) {
    const pathname = usePathname();
    const router = useRouter();
    const { user, logout } = useAuth();
    const [searchFocused, setSearchFocused] = useState(false);
    const [searchValue, setSearchValue] = useState('');

    const currentUser = {
        name: user?.name || 'Seller',
        email: user?.email || '',
        role: (user?.role || 'seller') as 'admin' | 'seller' | 'admin+seller',
        walletBalance: 0
    };

    const getPageTitle = (path: string) => {
        const segment = path.split('/')[2];
        if (!segment) return 'Dashboard';
        const titles: Record<string, string> = {
            'shipments': 'Shipments',
            'orders': 'Orders',
            'warehouses': 'Warehouses',
            'tracking': 'Track & Trace',
            'ndr': 'NDR Management',
            'rates': 'Rate Calculator',
            'financials': 'Wallet & Billing',
            'integrations': 'Integrations',
            'settings': 'Settings',
            'support': 'Help & Support'
        };
        return titles[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
    };

    const handleSignOut = async () => {
        await logout();
        router.push('/login');
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
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
            maximumFractionDigits: 0
        }).format(amount);
    };

    return (
        <header className="sticky top-0 z-[var(--z-header-sticky)] flex h-14 w-full items-center justify-between bg-[var(--bg-primary)] border-b border-[var(--border-subtle)] px-4 lg:px-6 transition-colors duration-200">
            {/* Left Section */}
            <div className="flex items-center gap-3">
                <button
                    onClick={onMenuClick}
                    className="lg:hidden h-9 w-9 rounded-lg flex items-center justify-center hover:bg-[var(--bg-hover)] transition-colors duration-150"
                >
                    <Menu className="h-5 w-5 text-[var(--text-secondary)]" />
                </button>
                <h1 className="text-lg font-semibold text-[var(--text-primary)]">{getPageTitle(pathname)}</h1>
            </div>

            {/* Center - Search */}
            <div className="hidden md:flex flex-1 max-w-md mx-8">
                <div className={cn(
                    "relative w-full transition-all duration-200",
                    searchFocused && "z-[var(--z-search-focus)]"
                )}>
                    <div className={cn(
                        "absolute inset-0 rounded-xl transition-all duration-200",
                        "bg-[var(--bg-secondary)] border border-[var(--border-subtle)]",
                        searchFocused && "border-[var(--border-focus)] ring-1 ring-[var(--border-focus)]/20"
                    )} />

                    <div className="relative flex items-center px-3 h-10">
                        <Search className={cn(
                            "h-4 w-4 mr-2.5 transition-colors duration-150 flex-shrink-0",
                            searchFocused ? "text-[var(--text-secondary)]" : "text-[var(--text-muted)]"
                        )} />
                        <input
                            id="global-search-seller"
                            type="text"
                            value={searchValue}
                            onChange={(e) => setSearchValue(e.target.value)}
                            placeholder="Search shipments, orders..."
                            onFocus={() => setSearchFocused(true)}
                            onBlur={() => setSearchFocused(false)}
                            className="flex-1 bg-transparent border-none outline-none text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                        />
                        <kbd className={cn(
                            "hidden lg:flex h-5 items-center justify-center px-1.5 text-[10px] font-medium text-[var(--text-muted)] bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded transition-opacity duration-150",
                            searchFocused ? "opacity-100" : "opacity-60"
                        )}>⌘K</kbd>
                    </div>
                </div>
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-2">
                {/* Quick Actions */}
                <div className="hidden lg:flex items-center gap-2">
                    {/* Wallet */}
                    <Tooltip content="Manage Wallet" side="bottom">
                        <button
                            onClick={() => window.location.href = '/seller/financials'}
                            className={cn(
                                "h-9 px-3 rounded-lg flex items-center gap-2 transition-colors duration-150",
                                "bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)]",
                                "border border-[var(--border-subtle)] hover:border-[var(--border-default)]"
                            )}
                        >
                            <Wallet className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
                            <div className="flex flex-col items-start leading-none">
                                <span className="text-[9px] uppercase font-semibold text-[var(--text-muted)] tracking-wide">Balance</span>
                                <span className="text-xs font-semibold text-[var(--text-primary)] tabular-nums">{formatCurrency(currentUser.walletBalance)}</span>
                            </div>
                        </button>
                    </Tooltip>

                    {/* Create Order */}
                    <Tooltip content="Create New Order" side="bottom">
                        <button
                            onClick={() => window.location.href = '/seller/orders/create'}
                            className="h-9 px-3 rounded-lg text-xs font-semibold text-white bg-[var(--primary-blue)] hover:bg-[var(--primary-blue-deep)] transition-colors duration-150 flex items-center gap-1.5"
                        >
                            <Plus className="h-3.5 w-3.5" />
                            <span className="hidden xl:inline">New Order</span>
                        </button>
                    </Tooltip>

                    {/* Track */}
                    <Tooltip content="Track Order" side="bottom">
                        <button
                            onClick={() => window.location.href = '/seller/tracking'}
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

