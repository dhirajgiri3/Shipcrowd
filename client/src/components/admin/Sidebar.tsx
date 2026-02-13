"use client";

import React, { useMemo } from 'react';
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
    Boxes,
    PackageX,
    Users,
    CreditCard,
    Receipt,
    Ticket,
    Headphones,
    Scale as ScaleIcon,
    ChevronRight,
    UserCog,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useAuth, useLogoutRedirect } from '@/src/features/auth';

type NavSection = 'core' | 'operations' | 'finance' | 'system';
export type AdminNavItem = {
    label: string;
    href: string;
    icon: LucideIcon;
    section: NavSection;
    superAdminOnly?: boolean;
};

export const adminNavItems: AdminNavItem[] = [
    { label: 'Dashboard', href: '/admin', icon: LayoutDashboard, section: 'core' },
    { label: 'Sellers', href: '/admin/sellers', icon: Users, section: 'core' },
    { label: 'KYC Analytics', href: '/admin/kyc', icon: Boxes, section: 'core' },

    { label: 'Orders', href: '/admin/orders', icon: ShoppingCart, section: 'operations' },
    { label: 'Shipments', href: '/admin/shipments', icon: Package, section: 'operations' },
    { label: 'Warehouses', href: '/admin/warehouses', icon: Building2, section: 'operations' },
    { label: 'Returns & NDR', href: '/admin/returns', icon: PackageX, section: 'operations' },
    { label: 'Weight Discrepancy', href: '/admin/weight', icon: ScaleIcon, section: 'operations' },
    { label: 'Courier Partners', href: '/admin/couriers', icon: Truck, section: 'operations' },
    { label: 'Courier Services', href: '/admin/couriers/services', icon: Settings, section: 'operations' },
    { label: 'Rate Cards', href: '/admin/rate-cards', icon: CreditCard, section: 'operations' },
    { label: 'Courier Policies', href: '/admin/courier-policies', icon: UserCog, section: 'operations' },

    { label: 'Pricing Studio', href: '/admin/pricing-studio', icon: CreditCard, section: 'finance' },
    { label: 'Financials', href: '/admin/financials', icon: Wallet, section: 'finance' },
    { label: 'Billing', href: '/admin/billing', icon: Receipt, section: 'finance' },
    { label: 'Profit', href: '/admin/profit', icon: BarChart3, section: 'finance' },
    { label: 'Sales Team', href: '/admin/sales', icon: Users, section: 'finance' },
    { label: 'Coupons', href: '/admin/coupons', icon: Ticket, section: 'finance' },

    { label: 'User Management', href: '/admin/users', icon: UserCog, section: 'system', superAdminOnly: true },
    { label: 'Support Tickets', href: '/admin/support', icon: Headphones, section: 'system' },
    { label: 'Settings', href: '/admin/settings', icon: Settings, section: 'system' },
];

export const Sidebar = React.memo(SidebarComponent);

function SidebarComponent({ onNavigate }: { onNavigate?: () => void }) {
    const pathname = usePathname();
    const { user } = useAuth();
    const { handleLogout } = useLogoutRedirect();

    const userInitials = user?.name
        ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
        : 'AD';

    const isSuperAdmin = user?.role === 'super_admin';
    const filteredNavItems = useMemo(
        () => adminNavItems.filter((item) => !item.superAdminOnly || isSuperAdmin),
        [isSuperAdmin]
    );

    const activeHref = useMemo(() => {
        if (pathname === '/admin') return '/admin';

        const matches = filteredNavItems
            .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
            .sort((a, b) => b.href.length - a.href.length);

        return matches[0]?.href;
    }, [filteredNavItems, pathname]);

    const handleSignOut = async () => {
        await handleLogout();
    };

    const groupedItems: Record<NavSection, AdminNavItem[]> = {
        core: filteredNavItems.filter((item) => item.section === 'core'),
        operations: filteredNavItems.filter((item) => item.section === 'operations'),
        finance: filteredNavItems.filter((item) => item.section === 'finance'),
        system: filteredNavItems.filter((item) => item.section === 'system'),
    };

    const renderNavItems = (items: AdminNavItem[]) => (
        <>
            {items.map((item) => {
                const isActive = item.href === activeHref;

                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        onClick={onNavigate}
                        className={cn(
                            'relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group overflow-hidden',
                            isActive
                                ? 'bg-[var(--primary-blue-soft)]/50 text-[var(--primary-blue)]'
                                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                        )}
                    >
                        {isActive && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-[var(--primary-blue)]" />
                        )}

                        <item.icon
                            className={cn(
                                'relative z-10 h-5 w-5 transition-all duration-200',
                                isActive ? 'text-[var(--primary-blue)]' : 'text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]'
                            )}
                        />
                        <span className="relative z-10">{item.label}</span>

                        <ChevronRight
                            className={cn(
                                'relative z-10 ml-auto h-4 w-4 opacity-0 -translate-x-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0',
                                isActive ? 'text-[var(--primary-blue)]' : 'text-[var(--text-muted)]'
                            )}
                        />
                    </Link>
                );
            })}
        </>
    );

    return (
        <aside className="fixed left-0 top-0 z-[var(--z-sidebar-desktop)] h-screen w-64 bg-[var(--bg-primary)] border-r border-[var(--border-subtle)]" aria-label="Admin navigation sidebar">
            <div className="flex h-16 items-center px-6">
                <img
                    src="https://res.cloudinary.com/divbobkmd/image/upload/v1769869575/Shipcrowd-logo_utcmu0.png"
                    alt="Shipcrowd Logo"
                    className="h-8 w-auto transition-opacity duration-200 hover:opacity-80 rounded-full"
                />
            </div>

            <div className="flex flex-col justify-between h-[calc(100vh-64px)] p-4 overflow-y-auto scrollbar-premium">
                <nav className="space-y-1" aria-label="Admin sections">
                    <div className="mb-4">
                        <div className="px-3 mb-2">
                            <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Core</span>
                        </div>
                        {renderNavItems(groupedItems.core)}
                    </div>

                    <div className="mb-4">
                        <div className="px-3 mb-2">
                            <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Operations</span>
                        </div>
                        {renderNavItems(groupedItems.operations)}
                    </div>

                    <div className="mb-4">
                        <div className="px-3 mb-2">
                            <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Finance</span>
                        </div>
                        {renderNavItems(groupedItems.finance)}
                    </div>

                    <div className="mb-4">
                        <div className="px-3 mb-2">
                            <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">System</span>
                        </div>
                        {renderNavItems(groupedItems.system)}
                    </div>
                </nav>

                <div className="mt-auto pt-4">
                    <div className="divider-soft mb-4" />

                    <div className="flex items-center gap-3 px-2 py-2 mb-2 rounded-lg hover:bg-[var(--bg-secondary)] transition-all duration-200 cursor-pointer">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[var(--bg-tertiary)] to-[var(--bg-secondary)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-primary)] font-bold text-xs">
                            {userInitials}
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <p className="text-sm font-medium text-[var(--text-primary)] truncate">{user?.name || 'Admin'}</p>
                            <p className="text-xs text-[var(--text-muted)] truncate capitalize">{user?.role || 'admin'}</p>
                        </div>
                    </div>

                    <button
                        onClick={handleSignOut}
                        className="w-full flex items-center justify-start gap-2 px-2 py-2 rounded-lg text-xs font-medium text-[var(--text-muted)] hover:text-rose-600 hover:bg-rose-500/5 transition-all duration-200 group"
                    >
                        <LogOut className="h-3.5 w-3.5" />
                        <span>Sign Out</span>
                    </button>
                </div>
            </div>
        </aside>
    );
}
