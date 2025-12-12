"use client";

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Search, Menu, Truck, Plus, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ProfileDropdown } from '@/components/shared/ProfileDropdown';
import { NotificationsDropdown } from '@/components/shared/NotificationsDropdown';
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
        <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between bg-white px-4 lg:px-6 border-b border-gray-100">
            {/* Left Section */}
            <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" className="lg:hidden h-9 w-9" onClick={onMenuClick}>
                    <Menu className="h-5 w-5 text-gray-600" />
                </Button>
                <h1 className="text-lg font-semibold text-gray-900">{getPageTitle(pathname)}</h1>
            </div>

            {/* Center - Search (Desktop) */}
            <div className="hidden md:flex flex-1 max-w-md mx-8">
                <div className={cn(
                    "relative w-full transition-all duration-200",
                    searchFocused && "scale-[1.01]"
                )}>
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    <input
                        id="global-search-seller"
                        type="text"
                        value={searchValue}
                        onChange={(e) => setSearchValue(e.target.value)}
                        placeholder="Search shipments, orders, customers..."
                        onFocus={() => setSearchFocused(true)}
                        onBlur={() => setSearchFocused(false)}
                        className={cn(
                            "w-full h-9 pl-9 pr-16 text-sm rounded-lg transition-all duration-200",
                            "bg-gray-50 text-gray-900 placeholder:text-gray-400",
                            "border border-gray-200 outline-none",
                            searchFocused && "bg-white border-gray-300 shadow-sm"
                        )}
                    />
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 hidden lg:flex items-center gap-0.5 pointer-events-none">
                        <kbd className="px-1.5 py-0.5 text-[10px] font-medium text-gray-400 bg-gray-100 rounded border border-gray-200">⌘K</kbd>
                    </div>
                </div>
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-1">
                {/* Quick Actions */}
                <div className="hidden lg:flex items-center gap-1">
                    <Tooltip content="Create new shipment">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.location.href = '/seller/shipments'}
                            className="h-9 px-3 text-gray-600 hover:text-[#2525FF] hover:bg-[#2525FF]/5"
                        >
                            <Plus className="h-4 w-4 mr-1.5" />
                            <span className="text-sm">Create</span>
                        </Button>
                    </Tooltip>

                    <Tooltip content="Track shipment">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.location.href = '/seller/tracking'}
                            className="h-9 px-3 text-gray-600 hover:text-[#2525FF] hover:bg-[#2525FF]/5"
                        >
                            <Truck className="h-4 w-4 mr-1.5" />
                            <span className="text-sm">Track</span>
                        </Button>
                    </Tooltip>

                    <Tooltip content="Manage wallet">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.location.href = '/seller/financials'}
                            className="h-9 px-3 text-gray-600 hover:text-[#2525FF] hover:bg-[#2525FF]/5"
                        >
                            <Wallet className="h-4 w-4 mr-1.5" />
                            <span className="text-sm">Wallet</span>
                        </Button>
                    </Tooltip>
                </div>

                {/* Divider */}
                <div className="hidden lg:block h-5 w-px bg-gray-200 mx-2" />

                {/* Notifications */}
                <NotificationsDropdown />

                {/* Profile */}
                <ProfileDropdown user={mockUser} onSignOut={handleSignOut} />
            </div>
        </header>
    );
}
