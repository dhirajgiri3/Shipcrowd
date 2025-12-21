"use client";

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Search, Menu, Truck, Plus, Wallet } from 'lucide-react';
import { ProfileDropdown } from '@/components/shared/ProfileDropdown';
import { NotificationsDropdown } from '@/components/shared/NotificationsDropdown';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { Tooltip } from '@/components/ui/Tooltip';
import { cn } from '@/lib/utils';

// Mock user - will be replaced with actual auth data
const mockUser = {
    name: 'Dhiraj Giri',
    email: 'dhiraj.giri@shipcrowd.in',
    role: 'admin+seller' as const
};

export function Header({ onMenuClick }: { onMenuClick?: () => void }) {
    const pathname = usePathname();
    const [searchFocused, setSearchFocused] = useState(false);
    const [searchValue, setSearchValue] = useState('');

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

    const handleSignOut = () => {
        console.log('Sign out');
    };

    // Command+K or Ctrl+K to focus search
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

    return (
        <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between bg-[var(--bg-primary)] border-b border-[var(--border-subtle)] px-4 lg:px-6">
            {/* Left Section */}
            <div className="flex items-center gap-3">
                <button
                    onClick={onMenuClick}
                    className="lg:hidden h-9 w-9 rounded-lg flex items-center justify-center hover:bg-[var(--bg-hover)] transition-all duration-200 focus-ring-brand"
                >
                    <Menu className="h-5 w-5 text-[var(--text-secondary)]" />
                </button>
                <h1 className="text-lg font-semibold text-[var(--text-primary)]">{getPageTitle(pathname)}</h1>
            </div>

            {/* Center - Search (Desktop) */}
            <div className="hidden md:flex flex-1 max-w-md mx-8">
                <div className={cn(
                    "relative w-full transition-all duration-200"
                )}>
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)] pointer-events-none" />
                    <input
                        id="global-search-seller"
                        type="text"
                        value={searchValue}
                        onChange={(e) => setSearchValue(e.target.value)}
                        placeholder="Search shipments, orders, customers..."
                        onFocus={() => setSearchFocused(true)}
                        onBlur={() => setSearchFocused(false)}
                        className={cn(
                            "w-full h-9 pl-9 pr-16 text-sm rounded-xl transition-all duration-200",
                            "bg-[var(--bg-secondary)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]",
                            "outline-none",
                            searchFocused && "bg-[var(--bg-tertiary)] shadow-[0_0_0_3px_rgba(37,37,255,0.1)] dark:shadow-[0_0_0_3px_rgba(107,107,255,0.2)]"
                        )}
                    />
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 hidden lg:flex items-center gap-0.5 pointer-events-none">
                        <kbd className="px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-muted)] bg-[var(--bg-tertiary)] rounded">⌘K</kbd>
                    </div>
                </div>
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-2">
                {/* Quick Actions */}
                <div className="hidden lg:flex items-center gap-1">
                    <Tooltip content="Create new shipment">
                        <button
                            onClick={() => window.location.href = '/seller/shipments'}
                            className="h-9 px-3 rounded-xl text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--primary-blue)] hover:bg-[var(--primary-blue-soft)] transition-all duration-200 flex items-center gap-1.5 focus-ring-brand"
                        >
                            <Plus className="h-4 w-4" />
                            <span>Create</span>
                        </button>
                    </Tooltip>

                    <Tooltip content="Track shipment">
                        <button
                            onClick={() => window.location.href = '/seller/tracking'}
                            className="h-9 px-3 rounded-xl text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--primary-blue)] hover:bg-[var(--primary-blue-soft)] transition-all duration-200 flex items-center gap-1.5 focus-ring-brand"
                        >
                            <Truck className="h-4 w-4" />
                            <span>Track</span>
                        </button>
                    </Tooltip>

                    <Tooltip content="Manage wallet">
                        <button
                            onClick={() => window.location.href = '/seller/financials'}
                            className="h-9 px-3 rounded-xl text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--primary-blue)] hover:bg-[var(--primary-blue-soft)] transition-all duration-200 flex items-center gap-1.5 focus-ring-brand"
                        >
                            <Wallet className="h-4 w-4" />
                            <span>Wallet</span>
                        </button>
                    </Tooltip>
                </div>

                {/* Divider */}
                <div className="hidden lg:block h-5 w-px bg-[var(--border-default)] mx-1" />

                {/* Theme Toggle */}
                <ThemeToggle />

                {/* Notifications */}
                <NotificationsDropdown />

                {/* Profile */}
                <ProfileDropdown user={mockUser} onSignOut={handleSignOut} />
            </div>
        </header>
    );
}
