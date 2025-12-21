"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Package,
    ShoppingCart,
    Building2,
    Truck,
    Wallet,
    BarChart3,
    Settings,
    LogOut,
    PackageX,
    Calculator,
    Search,
    HelpCircle,
    Plug,
    PackageCheck,
    Shield,
    FileText,
    Scale as ScaleIcon,
    Banknote,
    ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

const navItems = [
    { label: 'Dashboard', href: '/seller', icon: LayoutDashboard },
    { label: 'Orders', href: '/seller/orders', icon: ShoppingCart },
    { label: 'Shipments', href: '/seller/shipments', icon: Package },
    { label: 'Shipping Labels', href: '/seller/label', icon: FileText },
    { label: 'Warehouses', href: '/seller/warehouses', icon: Building2 },
    { label: 'Track & Trace', href: '/seller/tracking', icon: Search },
    { label: 'NDR Management', href: '/seller/ndr', icon: PackageX },
    { label: 'Weight Discrepancy', href: '/seller/weight', icon: ScaleIcon },
    { label: 'COD Remittance', href: '/seller/cod', icon: Banknote },
    { label: 'Rate Calculator', href: '/seller/rates', icon: Calculator },
    { label: 'Wallet & Billing', href: '/seller/financials', icon: Wallet },
    { label: 'Integrations', href: '/seller/integrations', icon: Plug },
    { label: 'KYC Verification', href: '/seller/kyc', icon: Shield },
    { label: 'Settings', href: '/seller/settings', icon: Settings },
];

const bottomNavItems = [
    { label: 'Help & Support', href: '/seller/support', icon: HelpCircle },
];

// Mock user - will be replaced with actual auth data
const mockUser = {
    name: 'Dhiraj Giri',
    email: 'dhiraj.giri@shipcrowd.in',
    companyName: 'ShipCrowd',
    role: 'admin+seller' as const
};

export function Sidebar() {
    const pathname = usePathname();

    // Get user initials
    const initials = mockUser.name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    // Group navigation items
    const coreItems = navItems.slice(0, 3); // Dashboard, Orders, Shipments
    const operationsItems = navItems.slice(3, 9); // Labels, Warehouses, Track, NDR, Weight, COD
    const toolsItems = navItems.slice(9, 12); // Rate Calculator, Wallet, Integrations
    const accountItems = navItems.slice(12); // KYC, Settings

    const renderNavItems = (items: typeof navItems) => (
        <>
            {items.map((item) => {
                // Precise matching for root seller, partial for sub-routes
                const isActive = item.href === '/seller'
                    ? pathname === '/seller'
                    : pathname.startsWith(item.href);

                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                            "relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group overflow-hidden",
                            isActive
                                ? "text-white"
                                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                        )}
                    >
                        {/* Active state background with gradient */}
                        {isActive && (
                            <>
                                <div className="absolute inset-0 bg-gradient-to-r from-[var(--primary-blue)] to-[var(--primary-blue-light)] opacity-100" />
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--primary-blue-light)]" />
                            </>
                        )}

                        <item.icon className={cn(
                            "relative z-10 h-5 w-5 transition-all duration-200",
                            isActive ? "text-white" : "text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]"
                        )} />
                        <span className="relative z-10">{item.label}</span>

                        {/* Arrow indicator on hover */}
                        <ChevronRight className={cn(
                            "relative z-10 ml-auto h-4 w-4 opacity-0 -translate-x-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0",
                            isActive ? "text-white" : "text-[var(--text-muted)]"
                        )} />
                    </Link>
                );
            })}
        </>
    );

    return (
        <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-[var(--bg-primary)] border-r border-[var(--border-subtle)] flex flex-col">
            {/* Logo */}
            <div className="flex h-16 items-center px-6">
                <img
                    src="/logos/Shipcrowd-logo.png"
                    alt="ShipCrowd Logo"
                    className="h-8 w-auto transition-opacity duration-200 hover:opacity-80"
                />
            </div>

            {/* Navigation */}
            <div className="flex-1 overflow-y-auto p-4 scrollbar-premium">
                <nav className="space-y-1">
                    {/* Core Section */}
                    <div className="mb-4">
                        <div className="px-3 mb-2">
                            <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Core</span>
                        </div>
                        {renderNavItems(coreItems)}
                    </div>

                    {/* Operations Section */}
                    <div className="mb-4">
                        <div className="px-3 mb-2">
                            <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Operations</span>
                        </div>
                        {renderNavItems(operationsItems)}
                    </div>

                    {/* Tools Section */}
                    <div className="mb-4">
                        <div className="px-3 mb-2">
                            <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Tools</span>
                        </div>
                        {renderNavItems(toolsItems)}
                    </div>

                    {/* Account Section */}
                    <div className="mb-4">
                        <div className="px-3 mb-2">
                            <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Account</span>
                        </div>
                        {renderNavItems(accountItems)}
                    </div>
                </nav>

                {/* Secondary Navigation */}
                <div className="mt-6 pt-6">
                    <div className="divider-soft mb-4" />
                    <div className="px-3 mb-2">
                        <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Support</span>
                    </div>
                    <nav className="space-y-1">
                        {bottomNavItems.map((item) => {
                            const isActive = pathname.startsWith(item.href);
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group overflow-hidden",
                                        isActive
                                            ? "text-white"
                                            : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                                    )}
                                >
                                    {isActive && (
                                        <>
                                            <div className="absolute inset-0 bg-gradient-to-r from-[var(--primary-blue)] to-[var(--primary-blue-light)] opacity-100" />
                                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--primary-blue-light)]" />
                                        </>
                                    )}
                                    <item.icon className={cn(
                                        "relative z-10 h-5 w-5 transition-all duration-200",
                                        isActive ? "text-white" : "text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]"
                                    )} />
                                    <span className="relative z-10">{item.label}</span>
                                    <ChevronRight className={cn(
                                        "relative z-10 ml-auto h-4 w-4 opacity-0 -translate-x-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0",
                                        isActive ? "text-white" : "text-[var(--text-muted)]"
                                    )} />
                                </Link>
                            );
                        })}
                    </nav>
                </div>
            </div>

            {/* User Profile & Footer */}
            <div className="p-4">
                <div className="divider-soft mb-4" />

                {/* Company Badge */}
                <div className="mb-3 px-3 py-2 rounded-xl bg-[var(--primary-blue-soft)] shadow-sm">
                    <p className="text-xs font-semibold text-[var(--primary-blue)]">{mockUser.companyName}</p>
                    <p className="text-[10px] text-[var(--text-muted)]">Pro Plan • Active</p>
                </div>

                {/* User Info */}
                <div className="flex items-center gap-3 px-3 py-3 mb-2 rounded-xl bg-[var(--bg-secondary)] shadow-sm hover:shadow-md transition-all duration-200">
                    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-[var(--primary-blue)] to-[var(--primary-blue-deep)] flex items-center justify-center text-white font-bold text-sm shadow-md">
                        {initials}
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{mockUser.name}</p>
                        <p className="text-xs text-[var(--text-muted)] truncate">Seller</p>
                    </div>
                </div>

                {/* Sign Out */}
                <button className="w-full flex items-center justify-start gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all duration-200 group">
                    <LogOut className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
                    <span>Sign Out</span>
                </button>
            </div>
        </aside>
    );
}
