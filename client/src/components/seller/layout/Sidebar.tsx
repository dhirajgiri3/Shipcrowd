"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
    LayoutDashboard,
    Package,
    Truck,
    ShoppingCart,
    Building2,
    Wallet,
    Settings,
    LogOut,
    PackageX,
    Calculator,
    HelpCircle,
    Plug,
    Shield,
    FileText,
    Scale as ScaleIcon,
    Banknote,
    ChevronRight,
    ChevronDown,
    MapPin,
    RotateCcw,
    AlertTriangle,
    BarChart3,
    Trophy,
    Timer,
    FileBarChart,
    ClipboardList,
    CornerUpLeft,
    Wrench,
    CheckSquare,
    MessageSquare,
    Landmark,
    TrendingUp,
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useAuth, useLogoutRedirect } from '@/src/features/auth';
import { useSellerActions } from '@/src/core/api/hooks/seller/useSellerActions';

export interface SellerNavItem {
    label: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    badgeKey?: 'orders_ready' | 'ndr_pending' | 'weight_dispute';
}

export interface SellerNavSection {
    id: string;
    title: string;
    items: SellerNavItem[];
    defaultOpen?: boolean;
}

/** Priority-based nav structure: Core (daily) → Fulfillment → Financial → Insights → Tools & Setup */
export const sellerNavSections: SellerNavSection[] = [
    {
        id: 'core',
        title: 'Core',
        defaultOpen: true,
        items: [
            { label: 'Dashboard', href: '/seller', icon: LayoutDashboard },
            { label: 'Orders', href: '/seller/orders', icon: ShoppingCart, badgeKey: 'orders_ready' },
            { label: 'Ship Now', href: '/seller/ship-now', icon: Truck, badgeKey: 'orders_ready' },
            { label: 'Shipments', href: '/seller/shipments', icon: Package },
            { label: 'Track & Trace', href: '/seller/tracking', icon: MapPin },
        ],
    },
    {
        id: 'fulfillment',
        title: 'Fulfillment',
        defaultOpen: true,
        items: [
            { label: 'Manifests', href: '/seller/manifests', icon: ClipboardList },
            { label: 'Shipping Labels', href: '/seller/label', icon: FileText },
            { label: 'NDR Management', href: '/seller/ndr', icon: PackageX, badgeKey: 'ndr_pending' },
            { label: 'Returns (RTO)', href: '/seller/rto', icon: RotateCcw },
            { label: 'Customer Returns', href: '/seller/returns', icon: CornerUpLeft },
        ],
    },
    {
        id: 'financial',
        title: 'Financial',
        defaultOpen: false,
        items: [
            { label: 'Wallet & Billing', href: '/seller/wallet', icon: Wallet },
            { label: 'COD Overview', href: '/seller/cod', icon: Banknote },
            { label: 'Bank Accounts', href: '/seller/bank-accounts', icon: Landmark },
            { label: 'Discrepancies', href: '/seller/cod/discrepancies', icon: AlertTriangle },
        ],
    },
    {
        id: 'insights',
        title: 'Insights',
        defaultOpen: false,
        items: [
            { label: 'Analytics Overview', href: '/seller/analytics', icon: TrendingUp },
            { label: 'Cost Analysis', href: '/seller/analytics/costs', icon: BarChart3 },
            { label: 'Courier Comparison', href: '/seller/analytics/comparison', icon: Trophy },
            { label: 'SLA Dashboard', href: '/seller/analytics/sla', icon: Timer },
            { label: 'Custom Reports', href: '/seller/analytics/reports', icon: FileBarChart },
        ],
    },
    {
        id: 'tools-setup',
        title: 'Tools & Setup',
        defaultOpen: false,
        items: [
            { label: 'Pincode Checker', href: '/seller/tools/pincode-checker', icon: MapPin },
            { label: 'Address Validation', href: '/seller/tools/bulk-address-validation', icon: CheckSquare },
            { label: 'Warehouses', href: '/seller/warehouses', icon: Building2 },
            { label: 'Rate Calculator', href: '/seller/rates', icon: Calculator },
            { label: 'Weight Discrepancy', href: '/seller/weight', icon: ScaleIcon, badgeKey: 'weight_dispute' },
            { label: 'Notification Rules', href: '/seller/communication/rules', icon: Wrench },
            { label: 'Templates', href: '/seller/communication/templates', icon: MessageSquare },
        ],
    },
];

export const sellerAccountItems: SellerNavItem[] = [
    { label: 'Integrations', href: '/seller/integrations', icon: Plug },
    { label: 'KYC Verification', href: '/seller/kyc', icon: Shield },
    { label: 'Settings', href: '/seller/settings', icon: Settings },
];

export const sellerSupportItems: SellerNavItem[] = [
    { label: 'Help & Support', href: '/seller/support', icon: HelpCircle },
];

export const Sidebar = React.memo(SidebarComponent);

function SidebarComponent({ onNavigate }: { onNavigate?: () => void }) {
    const pathname = usePathname();
    const { user } = useAuth();
    const { handleLogout } = useLogoutRedirect();
    const { data: actions } = useSellerActions();

    const DEFAULT_EXPANDED: Record<string, boolean> = {
        core: true,
        fulfillment: true,
        financial: false,
        insights: false,
        'tools-setup': false,
    };

    const migrateLegacySections = (parsed: Record<string, boolean>): Record<string, boolean> => {
        const OLD_TO_NEW: Record<string, string> = {
            shipping: 'core',
            operations: 'fulfillment',
            financial: 'financial',
            analytics: 'insights',
            tools: 'tools-setup',
            communication: 'tools-setup',
        };
        const migrated: Record<string, boolean> = { ...DEFAULT_EXPANDED };
        for (const [oldId, newId] of Object.entries(OLD_TO_NEW)) {
            if (oldId in parsed) {
                migrated[newId] = parsed[oldId];
            }
        }
        return migrated;
    };

    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('seller-sidebar-sections');
            if (saved) {
                try {
                    const parsed = JSON.parse(saved) as Record<string, boolean>;
                    const hasNewIds = sellerNavSections.some((s) => s.id in parsed);
                    return hasNewIds ? { ...DEFAULT_EXPANDED, ...parsed } : migrateLegacySections(parsed);
                } catch {
                    return DEFAULT_EXPANDED;
                }
            }
        }
        return DEFAULT_EXPANDED;
    });

    const allNavItems = useMemo(
        () => [...sellerNavSections.flatMap((section) => section.items), ...sellerAccountItems, ...sellerSupportItems],
        []
    );

    const activeHref = useMemo(() => {
        if (pathname === '/seller') return '/seller';

        const matches = allNavItems
            .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
            .sort((a, b) => b.href.length - a.href.length);

        return matches[0]?.href;
    }, [allNavItems, pathname]);

    useEffect(() => {
        localStorage.setItem('seller-sidebar-sections', JSON.stringify(expandedSections));
    }, [expandedSections]);

    useEffect(() => {
        const activeSection = sellerNavSections.find((section) => section.items.some((item) => item.href === activeHref));
        if (!activeSection) return;

        setExpandedSections((prev) => {
            if (prev[activeSection.id]) return prev;
            return { ...prev, [activeSection.id]: true };
        });
    }, [activeHref]);

    const getBadgeCount = (badgeKey?: 'orders_ready' | 'ndr_pending' | 'weight_dispute'): number => {
        if (!badgeKey || !actions?.items) return 0;
        const action = actions.items.find((a) => a.type === badgeKey);
        return action?.count || 0;
    };

    const initials = user?.name
        ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
        : 'SL';

    const handleSignOut = async () => {
        await handleLogout();
    };

    const toggleSection = (sectionId: string) => {
        setExpandedSections((prev) => ({
            ...prev,
            [sectionId]: !prev[sectionId],
        }));
    };

    const prefersReducedMotion = useReducedMotion();
    const navContainerRef = useRef<HTMLDivElement>(null);

    const handleNavKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            const focusable = navContainerRef.current?.querySelectorAll<HTMLAnchorElement>(
                'a[href]'
            );
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

    const renderNavItem = (item: SellerNavItem, showBadge = true) => {
        const isActive = item.href === activeHref;
        const badgeCount = showBadge ? getBadgeCount(item.badgeKey) : 0;

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

                {badgeCount > 0 && (
                    <span
                        className={cn(
                            'relative z-10 px-1.5 py-0.5 text-[10px] font-bold rounded-full min-w-[18px] text-center',
                            isActive
                                ? 'bg-[var(--primary-blue)] text-white'
                                : 'bg-[var(--error)] text-white'
                        )}
                    >
                        {badgeCount}
                    </span>
                )}

                {!badgeCount && (
                    <ChevronRight
                        className={cn(
                            'relative z-10 h-4 w-4 opacity-0 -translate-x-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0',
                            isActive ? 'text-[var(--primary-blue)]' : 'text-[var(--text-muted)]'
                        )}
                    />
                )}
            </Link>
        );
    };

    return (
        <aside className="fixed left-0 top-0 z-[var(--z-sidebar-desktop)] h-screen w-64 bg-[var(--bg-primary)] border-r border-[var(--border-subtle)] flex flex-col" aria-label="Seller navigation sidebar">
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
                <nav className="space-y-2" aria-label="Seller sections">
                    {sellerNavSections.map((section) => {
                        const isExpanded = expandedSections[section.id] ?? section.defaultOpen;
                        const sectionBadgeCount = section.items.reduce(
                            (sum, item) => sum + getBadgeCount(item.badgeKey),
                            0
                        );
                        const sectionTitleId = `seller-nav-title-${section.id}`;

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
                                    aria-controls={`seller-nav-${section.id}`}
                                >
                                    <span className="flex items-center gap-2">
                                        {section.title}
                                        {!isExpanded && sectionBadgeCount > 0 && (
                                            <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-[var(--error)] text-white min-w-[18px] text-center">
                                                {sectionBadgeCount}
                                            </span>
                                        )}
                                    </span>
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
                                            id={`seller-nav-${section.id}`}
                                            initial={prefersReducedMotion ? undefined : { height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={prefersReducedMotion ? undefined : { height: 0, opacity: 0 }}
                                            transition={{ duration: prefersReducedMotion ? 0 : 0.2, ease: 'easeInOut' }}
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

                    <section className="pt-4 mt-4 border-t border-[var(--border-subtle)]" aria-labelledby="seller-nav-account">
                        <div className="px-3 mb-2">
                            <span id="seller-nav-account" className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Account</span>
                        </div>
                        <div className="space-y-1">
                            {sellerAccountItems.map((item) => renderNavItem(item, false))}
                        </div>
                    </section>
                </nav>

                <section className="mt-6 pt-6" aria-labelledby="seller-nav-support">
                    <div className="divider-soft mb-4" />
                    <div className="px-3 mb-2">
                        <span id="seller-nav-support" className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Support</span>
                    </div>
                    <nav className="space-y-1">
                        {sellerSupportItems.map((item) => renderNavItem(item, false))}
                    </nav>
                </section>
            </div>

            <div className="p-4 mt-auto">
                <div className="h-px bg-[var(--border-subtle)] mb-4" />

                <div className="flex items-center gap-3 px-2 py-2 mb-2 rounded-lg hover:bg-[var(--bg-secondary)] transition-all duration-200 cursor-pointer">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[var(--bg-tertiary)] to-[var(--bg-secondary)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-primary)] font-bold text-xs">
                        {initials}
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <p className="text-sm font-medium text-[var(--text-primary)] truncate">{user?.name || 'Seller'}</p>
                        <p className="text-xs text-[var(--text-muted)] truncate capitalize">{user?.role || 'seller'}</p>
                    </div>
                    <Settings className="w-4 h-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors" />
                </div>

                <button
                    onClick={handleSignOut}
                    className="w-full flex items-center justify-start gap-2 px-2 py-2 rounded-lg text-xs font-medium text-[var(--text-muted)] hover:text-[var(--error)] hover:bg-[var(--error-bg)] transition-all duration-200 group"
                >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Sign Out</span>
                </button>
            </div>
        </aside>
    );
}

export default Sidebar;
