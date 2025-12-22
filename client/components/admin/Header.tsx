"use client";

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Search, Menu, Truck, Plus, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ProfileDropdown } from '@/components/shared/ProfileDropdown';
import { NotificationsDropdown } from '@/components/shared/NotificationsDropdown';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { CreateShipmentModal } from '@/components/admin/CreateShipmentModal';
import { TrackingModal } from '@/components/admin/TrackingModal';
import { WalletModal } from '@/components/admin/WalletModal';
import { Tooltip } from '@/components/ui/Tooltip';
import { cn } from '@/lib/utils';

// Mock user - will be replaced with actual auth data
const mockUser = {
    name: 'Dhiraj Giri',
    email: 'dhiraj.giri@shipcrowd.in',
    role: 'admin+seller' as const,
    walletBalance: 2450.00
};

export function Header({ onMenuClick }: { onMenuClick?: () => void }) {
    const pathname = usePathname();
    const [isCreateShipmentOpen, setIsCreateShipmentOpen] = useState(false);
    const [isTrackingOpen, setIsTrackingOpen] = useState(false);
    const [isWalletOpen, setIsWalletOpen] = useState(false);
    const [searchFocused, setSearchFocused] = useState(false);
    const [searchValue, setSearchValue] = useState('');

    const getPageTitle = (path: string) => {
        const segment = path.split('/')[2];
        if (!segment) return 'Dashboard';
        const titles: Record<string, string> = {
            'intelligence': 'Intelligence',
            'shipments': 'Shipments',
            'warehouses': 'Warehouses',
            'orders': 'Orders',
            'returns': 'Returns & NDR',
            'couriers': 'Couriers',
            'integrations': 'Integrations',
            'financials': 'Financials',
            'analytics': 'Analytics',
            'settings': 'Settings',
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
                const searchInput = document.getElementById('global-search');
                searchInput?.focus();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Format currency
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount);
    };

    return (
        <>
            {/* Modals */}
            <CreateShipmentModal
                isOpen={isCreateShipmentOpen}
                onClose={() => setIsCreateShipmentOpen(false)}
            />
            <TrackingModal
                isOpen={isTrackingOpen}
                onClose={() => setIsTrackingOpen(false)}
            />
            <WalletModal
                isOpen={isWalletOpen}
                onClose={() => setIsWalletOpen(false)}
            />

            <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between bg-[var(--bg-primary)]/80 backdrop-blur-md border-b border-[var(--border-subtle)] px-6 lg:px-8 transition-all duration-300">
                {/* Left Section - Title */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={onMenuClick}
                        className="lg:hidden h-10 w-10 rounded-xl flex items-center justify-center hover:bg-[var(--bg-hover)] transition-all duration-200"
                    >
                        <Menu className="h-5 w-5 text-[var(--text-secondary)]" />
                    </button>
                    <h1 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">{getPageTitle(pathname)}</h1>
                </div>

                {/* Center - Search (Desktop) - Environment Aware */}
                <div className="hidden md:flex flex-1 max-w-lg mx-12">
                    <div className={cn(
                        "relative w-full transition-all duration-300",
                        searchFocused ? "scale-[1.02] z-50" : "scale-100 z-0"
                    )}>
                        {/* Search Overlay Background (when focused) */}
                        <div className={cn(
                            "absolute inset-0 bg-[var(--bg-secondary)] rounded-2xl transition-all duration-300 shadow-sm border border-[var(--border-subtle)]",
                            searchFocused && "shadow-xl ring-2 ring-[var(--primary-blue)]/20 border-transparent"
                        )} />

                        <div className="relative flex items-center px-4 h-11">
                            <Search className={cn(
                                "h-4 w-4 mr-3 transition-colors duration-200 flex-shrink-0",
                                searchFocused ? "text-[var(--primary-blue)]" : "text-[var(--text-muted)]"
                            )} />
                            <input
                                id="global-search"
                                type="text"
                                value={searchValue}
                                onChange={(e) => setSearchValue(e.target.value)}
                                placeholder="Search everything..."
                                onFocus={() => setSearchFocused(true)}
                                onBlur={() => setSearchFocused(false)}
                                className={cn(
                                    "flex-1 bg-transparent border-none outline-none text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]",
                                    "px-0"
                                )}
                            />
                            <div className={cn(
                                "flex items-center gap-1 transition-opacity duration-200",
                                searchFocused ? "opacity-100" : "opacity-60"
                            )}>
                                <kbd className="hidden lg:flex h-5 items-center justify-center px-1.5 text-[10px] font-bold text-[var(--text-muted)] bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded shadow-sm">⌘K</kbd>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Section - Improved Layout & Wallet */}
                <div className="flex items-center gap-3">
                    {/* Primary Actions Group */}
                    <div className="hidden lg:flex items-center gap-3 mr-2">
                        {/* Wallet - Restored to Prominence */}
                        <Tooltip content="Manage Wallet" side="bottom">
                            <button
                                onClick={() => setIsWalletOpen(true)}
                                className={cn(
                                    "h-10 px-4 rounded-xl flex items-center gap-2.5 transition-all duration-200 group",
                                    "bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)]",
                                    "border border-[var(--border-subtle)] hover:border-[var(--primary-blue)]/30"
                                )}
                            >
                                <div className="p-1 rounded-lg bg-[var(--primary-blue)]/10 text-[var(--primary-blue)] group-hover:scale-110 transition-transform">
                                    <Wallet className="h-3.5 w-3.5" />
                                </div>
                                <div className="flex flex-col items-start leading-none">
                                    <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">Balance</span>
                                    <span className="text-sm font-bold text-[var(--text-primary)] font-mono">{formatCurrency(mockUser.walletBalance)}</span>
                                </div>
                            </button>
                        </Tooltip>

                        {/* Create Shipment */}
                        <Tooltip content="Create New Shipment" side="bottom">
                            <button
                                onClick={() => setIsCreateShipmentOpen(true)}
                                className="h-10 px-4 rounded-xl text-sm font-semibold text-white bg-[var(--primary-blue)] hover:bg-[var(--primary-blue-deep)] shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-2"
                            >
                                <Plus className="h-4 w-4" />
                                <span className="hidden xl:inline">Create</span>
                            </button>
                        </Tooltip>

                        {/* Track - Icon Only */}
                        <Tooltip content="Track Shipment" side="bottom">
                            <button
                                onClick={() => setIsTrackingOpen(true)}
                                className="h-10 w-10 rounded-xl flex items-center justify-center text-[var(--text-secondary)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--primary-blue)] border border-[var(--border-subtle)] transition-all duration-200"
                            >
                                <Truck className="h-4.5 w-4.5" />
                            </button>
                        </Tooltip>
                    </div>

                    <div className="h-8 w-px bg-[var(--border-subtle)] hidden lg:block" />

                    <div className="flex items-center gap-2">
                        <ThemeToggle />
                        <NotificationsDropdown />
                        <ProfileDropdown user={mockUser} onSignOut={handleSignOut} />
                    </div>
                </div>
            </header>
        </>
    );
}
