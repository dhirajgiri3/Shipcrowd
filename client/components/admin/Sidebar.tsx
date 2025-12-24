"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
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
    Boxes,
    Sparkles,
    PackageX,
    Plug,
    Users,
    CreditCard,
    Receipt,
    Ticket,
    Headphones,
    Scale as ScaleIcon,
    ChevronRight,
    Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/src/features/auth';

const navItems = [
    { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { label: 'Sellers', href: '/admin/sellers', icon: Users },
    { label: 'KYC Analytics', href: '/admin/kyc', icon: Boxes },
    { label: 'Intelligence', href: '/admin/intelligence', icon: Zap },
    { label: 'Orders', href: '/admin/orders', icon: ShoppingCart },
    { label: 'Shipments', href: '/admin/shipments', icon: Package },
    { label: 'Warehouses', href: '/admin/warehouses', icon: Building2 },
    { label: 'Returns & NDR', href: '/admin/returns', icon: PackageX },
    { label: 'Weight Discrepancy', href: '/admin/weight', icon: ScaleIcon },
    { label: 'Courier Partners', href: '/admin/couriers', icon: Truck },
    { label: 'Rate Cards', href: '/admin/ratecards', icon: CreditCard },
    { label: 'Financials', href: '/admin/financials', icon: Wallet },
    { label: 'Billing', href: '/admin/billing', icon: Receipt },
    { label: 'Profit', href: '/admin/profit', icon: BarChart3 },
    { label: 'Sales Team', href: '/admin/sales', icon: Users },
    { label: 'Coupons', href: '/admin/coupons', icon: Ticket },
    { label: 'Support Tickets', href: '/admin/support', icon: Headphones },
    { label: 'Integrations', href: '/admin/integrations', icon: Plug },
    { label: 'Settings', href: '/admin/settings', icon: Settings },
];

export function Sidebar({ isOpen, onClose }: { isOpen?: boolean; onClose?: () => void }) {
    const pathname = usePathname();
    const router = useRouter();
    const { user, logout } = useAuth();

    // Get user initials for avatar
    const userInitials = user?.name
        ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
        : 'AD';

    const handleSignOut = async () => {
        await logout();
        router.push('/login');
    };

    // Group navigation items
    const coreItems = navItems.slice(0, 4); // Dashboard, Sellers, KYC, Intelligence
    const operationsItems = navItems.slice(4, 9); // Orders, Shipments, Warehouses, Returns, Weight
    const financeItems = navItems.slice(9, 16); // Courier, Rate Cards, Financials, Billing, Profit, Sales, Coupons
    const systemItems = navItems.slice(16); // Support, Integrations, Settings

    const renderNavItems = (items: typeof navItems, showDivider = false) => (
        <>
            {items.map((item) => {
                // Precise matching for root admin, partial for sub-routes
                const isActive = item.href === '/admin'
                    ? pathname === '/admin'
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
            {showDivider && <div className="divider-soft my-3" />}
        </>
    );

    return (
        <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-[var(--bg-primary)] border-r border-[var(--border-subtle)]">
            {/* Logo section */}
            <div className="flex h-16 items-center px-6">
                <img
                    src="/logos/Shipcrowd-logo.png"
                    alt="ShipCrowd Logo"
                    className="h-8 w-auto transition-opacity duration-200 hover:opacity-80"
                />
            </div>

            {/* Navigation */}
            <div className="flex flex-col justify-between h-[calc(100vh-64px)] p-4 overflow-y-auto scrollbar-premium">
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

                    {/* Finance Section */}
                    <div className="mb-4">
                        <div className="px-3 mb-2">
                            <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Finance</span>
                        </div>
                        {renderNavItems(financeItems)}
                    </div>

                    {/* System Section */}
                    <div className="mb-4">
                        <div className="px-3 mb-2">
                            <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">System</span>
                        </div>
                        {renderNavItems(systemItems)}
                    </div>
                </nav>

                {/* User profile section */}
                <div className="mt-auto pt-4">
                    <div className="divider-soft mb-4" />

                    <div className="flex items-center gap-3 px-3 py-3 mb-2 rounded-xl bg-[var(--bg-secondary)] shadow-sm hover:shadow-md transition-all duration-200">
                        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-[var(--primary-blue)] to-[var(--primary-blue-deep)] flex items-center justify-center text-white font-bold text-sm shadow-md">
                            {userInitials}
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{user?.name || 'Admin'}</p>
                            <p className="text-xs text-[var(--text-muted)] truncate capitalize">{user?.role || 'admin'}</p>
                        </div>
                    </div>

                    <button
                        onClick={handleSignOut}
                        className="w-full flex items-center justify-start gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all duration-200 group"
                    >
                        <LogOut className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
                        <span>Sign Out</span>
                    </button>
                </div>
            </div>
        </aside>
    );
}
