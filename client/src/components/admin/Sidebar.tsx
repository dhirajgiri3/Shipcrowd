"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
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
    ChevronDown,
    UserCog,
    TrendingUp,
    Sparkles,
    Percent,
    MapPin,
    Shield,
    Activity,
    RotateCcw,
    Plug,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useAuth, useLogoutRedirect } from '@/src/features/auth';
import { RoleAvatar } from '@/src/components/shared/RoleAvatar';

export type AdminNavItem = {
    label: string;
    href: string;
    icon: LucideIcon;
    superAdminOnly?: boolean;
};

export interface AdminNavSection {
    id: string;
    title: string;
    items: AdminNavItem[];
    defaultOpen?: boolean;
}

/** Priority-based nav structure: Core (daily) → Operations → Financial → Insights → System */
export const adminNavSections: AdminNavSection[] = [
    {
        id: 'core',
        title: 'Core',
        defaultOpen: true,
        items: [
            { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
            { label: 'Orders', href: '/admin/orders', icon: ShoppingCart },
            { label: 'Shipments', href: '/admin/shipments', icon: Package },
            { label: 'Sellers', href: '/admin/sellers', icon: Users },
            { label: 'Support Tickets', href: '/admin/support', icon: Headphones },
        ],
    },
    {
        id: 'operations',
        title: 'Operations',
        defaultOpen: true,
        items: [
            { label: 'Returns', href: '/admin/returns', icon: RotateCcw },
            { label: 'NDR', href: '/admin/ndr', icon: PackageX },
            { label: 'Warehouses', href: '/admin/warehouses', icon: Building2 },
            { label: 'Weight Discrepancy', href: '/admin/weight', icon: ScaleIcon },
            { label: 'Weight Disputes', href: '/admin/disputes/weight', icon: ScaleIcon },
            { label: 'Courier Partners', href: '/admin/couriers', icon: Truck },
            { label: 'Courier Services', href: '/admin/couriers/services', icon: Settings },
            { label: 'Rate Cards', href: '/admin/rate-cards', icon: CreditCard },
            { label: 'Courier Policies', href: '/admin/courier-policies', icon: UserCog },
            { label: 'Integrations', href: '/admin/integrations', icon: Plug },
        ],
    },
    {
        id: 'financial',
        title: 'Financial',
        defaultOpen: false,
        items: [
            { label: 'Pricing Studio', href: '/admin/pricing-studio', icon: CreditCard },
            { label: 'Financials', href: '/admin/financials', icon: Wallet },
            { label: 'Billing', href: '/admin/billing', icon: Receipt },
            { label: 'Profit', href: '/admin/profit', icon: BarChart3 },
            { label: 'Commission', href: '/admin/commission', icon: Percent },
            { label: 'Coupons', href: '/admin/coupons', icon: Ticket },
            { label: 'Sales Team', href: '/admin/sales', icon: Users },
        ],
    },
    {
        id: 'insights',
        title: 'Insights',
        defaultOpen: false,
        items: [
            { label: 'Analytics', href: '/admin/analytics', icon: TrendingUp },
            { label: 'Intelligence', href: '/admin/intelligence', icon: Sparkles },
            { label: 'Companies', href: '/admin/companies', icon: Building2 },
            { label: 'KYC Analytics', href: '/admin/kyc', icon: Boxes },
        ],
    },
    {
        id: 'system',
        title: 'System',
        defaultOpen: false,
        items: [
            { label: 'Zones', href: '/admin/zones', icon: MapPin },
            { label: 'User Management', href: '/admin/users', icon: UserCog, superAdminOnly: true },
            { label: 'Settings', href: '/admin/settings', icon: Settings },
            { label: 'Security', href: '/admin/security/fraud', icon: Shield },
            { label: 'System Health', href: '/admin/system-health', icon: Activity },
        ],
    },
];

/** Flattened list for Header search - backward compatible */
export const adminNavItems: AdminNavItem[] = adminNavSections.flatMap((s) => s.items);

export const Sidebar = React.memo(SidebarComponent);

function SidebarComponent({ onNavigate }: { onNavigate?: () => void }) {
    const pathname = usePathname();
    const { user } = useAuth();
    const { handleLogout } = useLogoutRedirect();
    const isSuperAdmin = user?.role === 'super_admin';
    const prefersReducedMotion = useReducedMotion();
    const navContainerRef = useRef<HTMLDivElement>(null);

    const DEFAULT_EXPANDED: Record<string, boolean> = {
        core: true,
        operations: true,
        financial: false,
        insights: false,
        system: false,
    };

    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('admin-sidebar-sections');
            if (saved) {
                try {
                    const parsed = JSON.parse(saved) as Record<string, boolean>;
                    const hasNewIds = adminNavSections.some((s) => s.id in parsed);
                    return hasNewIds ? { ...DEFAULT_EXPANDED, ...parsed } : DEFAULT_EXPANDED;
                } catch {
                    return DEFAULT_EXPANDED;
                }
            }
        }
        return DEFAULT_EXPANDED;
    });

    const filteredSections = useMemo(
        () =>
            adminNavSections.map((section) => ({
                ...section,
                items: section.items.filter((item) => !item.superAdminOnly || isSuperAdmin),
            })),
        [isSuperAdmin]
    );

    const allNavItems = useMemo(
        () => filteredSections.flatMap((section) => section.items),
        [filteredSections]
    );

    const activeHref = useMemo(() => {
        if (pathname === '/admin') return '/admin';

        const matches = allNavItems
            .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
            .sort((a, b) => b.href.length - a.href.length);

        return matches[0]?.href;
    }, [allNavItems, pathname]);

    useEffect(() => {
        localStorage.setItem('admin-sidebar-sections', JSON.stringify(expandedSections));
    }, [expandedSections]);

    useEffect(() => {
        const activeSection = filteredSections.find((section) =>
            section.items.some((item) => item.href === activeHref)
        );
        if (!activeSection) return;

        setExpandedSections((prev) => {
            if (prev[activeSection.id]) return prev;
            return { ...prev, [activeSection.id]: true };
        });
    }, [activeHref, filteredSections]);

    const handleSignOut = async () => {
        await handleLogout();
    };

    const toggleSection = (sectionId: string) => {
        setExpandedSections((prev) => ({
            ...prev,
            [sectionId]: !prev[sectionId],
        }));
    };

    const handleNavKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            const focusable = navContainerRef.current?.querySelectorAll<HTMLAnchorElement>('a[href]');
            if (!focusable?.length) return;

            const list = Array.from(focusable);
            const current = document.activeElement as HTMLAnchorElement | null;
            const idx = current ? list.indexOf(current) : -1;

            if (e.key === 'ArrowDown' && idx < list.length - 1) {
                e.preventDefault();
                list[idx + 1]?.focus();
            } else if (e.key === 'ArrowUp' && idx > 0) {
                e.preventDefault();
                list[idx - 1]?.focus();
            } else if (e.key === 'Home') {
                e.preventDefault();
                list[0]?.focus();
            } else if (e.key === 'End') {
                e.preventDefault();
                list[list.length - 1]?.focus();
            }
        },
        []
    );

    const renderNavItem = (item: AdminNavItem) => {
        const isActive = item.href === activeHref;

        return (
            <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={isActive ? 'page' : undefined}
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
                <span className="relative z-10 flex-1">{item.label}</span>

                <ChevronRight
                    className={cn(
                        'relative z-10 h-4 w-4 opacity-0 -translate-x-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0',
                        isActive ? 'text-[var(--primary-blue)]' : 'text-[var(--text-muted)]'
                    )}
                />
            </Link>
        );
    };

    return (
        <aside
            className="fixed left-0 top-0 z-[var(--z-sidebar-desktop)] h-screen w-64 bg-[var(--bg-primary)] border-r border-[var(--border-subtle)] flex flex-col"
            aria-label="Admin navigation sidebar"
        >
            <div className="flex h-16 items-center px-6">
                <img
                    src="https://res.cloudinary.com/divbobkmd/image/upload/v1769869575/Shipcrowd-logo_utcmu0.png"
                    alt="Shipcrowd Logo"
                    className="h-8 w-auto transition-opacity duration-200 hover:opacity-80 rounded-full"
                />
            </div>

            <div
                ref={navContainerRef}
                className="flex-1 overflow-y-auto p-4 scrollbar-premium"
                onKeyDown={handleNavKeyDown}
            >
                <nav className="space-y-2" aria-label="Admin sections">
                    {filteredSections.map((section) => {
                        const isExpanded = expandedSections[section.id] ?? section.defaultOpen;
                        const sectionTitleId = `admin-nav-title-${section.id}`;

                        return (
                            <section
                                key={section.id}
                                className="mb-2"
                                aria-labelledby={sectionTitleId}
                            >
                                <button
                                    id={sectionTitleId}
                                    onClick={() => toggleSection(section.id)}
                                    className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider hover:text-[var(--text-secondary)] transition-colors rounded-lg hover:bg-[var(--bg-hover)]"
                                    aria-expanded={isExpanded}
                                    aria-controls={`admin-nav-${section.id}`}
                                >
                                    <span>{section.title}</span>
                                    <motion.div
                                        animate={{ rotate: isExpanded ? 180 : 0 }}
                                        transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
                                    >
                                        <ChevronDown className="h-3.5 w-3.5" />
                                    </motion.div>
                                </button>

                                <AnimatePresence initial={false}>
                                    {isExpanded && (
                                        <motion.div
                                            id={`admin-nav-${section.id}`}
                                            initial={prefersReducedMotion ? undefined : { height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={prefersReducedMotion ? undefined : { height: 0, opacity: 0 }}
                                            transition={{
                                                duration: prefersReducedMotion ? 0 : 0.2,
                                                ease: 'easeInOut',
                                            }}
                                            className="overflow-hidden"
                                        >
                                            <div className="space-y-1 mt-1">
                                                {section.items.map((item) => renderNavItem(item))}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </section>
                        );
                    })}
                </nav>
            </div>

            <div className="p-4 mt-auto">
                <div className="h-px bg-[var(--border-subtle)] mb-4" />

                <div className="flex items-center gap-3 px-2 py-2 mb-2 rounded-lg hover:bg-[var(--bg-secondary)] transition-all duration-200 cursor-pointer">
                    <RoleAvatar role={user?.role || 'admin'} name={user?.name || 'Admin'} size="sm" />
                    <div className="flex-1 overflow-hidden">
                        <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                            {user?.name || 'Admin'}
                        </p>
                        <p className="text-xs text-[var(--text-muted)] truncate capitalize">
                            {user?.role || 'admin'}
                        </p>
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
        </aside>
    );
}
