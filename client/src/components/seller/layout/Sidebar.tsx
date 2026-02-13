"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard,
    Package,
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
    Activity,
    AlertTriangle,
    Zap,
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
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useAuth, useLogoutRedirect } from '@/src/features/auth';
import { useSellerActions } from '@/src/core/api/hooks/seller/useSellerActions';
import { Badge } from '@/src/components/ui/core/Badge';

export interface SellerNavItem {
    label: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    badgeKey?: 'orders_ready' | 'ndr_pending';
}

export interface SellerNavSection {
    id: string;
    title: string;
    items: SellerNavItem[];
    defaultOpen?: boolean;
}

export const sellerNavSections: SellerNavSection[] = [
    {
        id: 'shipping',
        title: 'Shipping',
        defaultOpen: true,
        items: [
            { label: 'Dashboard', href: '/seller', icon: LayoutDashboard },
            { label: 'Orders', href: '/seller/orders', icon: ShoppingCart, badgeKey: 'orders_ready' },
            { label: 'Shipments', href: '/seller/shipments', icon: Package },
            { label: 'Manifests', href: '/seller/manifests', icon: ClipboardList },
            { label: 'Shipping Labels', href: '/seller/label', icon: FileText },
            { label: 'Track & Trace', href: '/seller/tracking', icon: MapPin },
        ],
    },
    {
        id: 'operations',
        title: 'Operations',
        defaultOpen: false,
        items: [
            { label: 'NDR Management', href: '/seller/ndr', icon: PackageX, badgeKey: 'ndr_pending' },
            { label: 'Returns (RTO)', href: '/seller/rto', icon: RotateCcw },
            { label: 'Customer Returns', href: '/seller/returns', icon: CornerUpLeft },
            { label: 'Warehouses', href: '/seller/warehouses', icon: Building2 },
            { label: 'Weight Discrepancy', href: '/seller/weight', icon: ScaleIcon },
            { label: 'Rate Calculator', href: '/seller/rates', icon: Calculator },
        ],
    },
    {
        id: 'financial',
        title: 'Financial',
        defaultOpen: false,
        items: [
            { label: 'Wallet & Billing', href: '/seller/wallet', icon: Wallet },
            { label: 'Bank Accounts', href: '/seller/bank-accounts', icon: Landmark },
            { label: 'COD Overview', href: '/seller/cod', icon: Banknote },
            { label: 'COD Health', href: '/seller/cod/health', icon: Activity },
            { label: 'Discrepancies', href: '/seller/cod/discrepancies', icon: AlertTriangle },
            { label: 'Early COD', href: '/seller/cod/early-program', icon: Zap },
        ],
    },
    {
        id: 'analytics',
        title: 'Analytics',
        defaultOpen: false,
        items: [
            { label: 'Cost Analysis', href: '/seller/analytics/costs', icon: BarChart3 },
            { label: 'Courier Comparison', href: '/seller/analytics/comparison', icon: Trophy },
            { label: 'SLA Dashboard', href: '/seller/analytics/sla', icon: Timer },
            { label: 'Custom Reports', href: '/seller/analytics/reports', icon: FileBarChart },
        ],
    },
    {
        id: 'tools',
        title: 'Tools',
        defaultOpen: false,
        items: [
            { label: 'Pincode Checker', href: '/seller/tools/pincode-checker', icon: MapPin },
            { label: 'Address Validation', href: '/seller/tools/bulk-address-validation', icon: CheckSquare },
        ],
    },
    {
        id: 'communication',
        title: 'Communication',
        defaultOpen: false,
        items: [
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

    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('seller-sidebar-sections');
            if (saved) {
                try {
                    return JSON.parse(saved);
                } catch {
                    return { shipping: true, operations: false, financial: false, analytics: false, tools: false, communication: false };
                }
            }
        }
        return { shipping: true, operations: false, financial: false, analytics: false, tools: false, communication: false };
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

    const getBadgeCount = (badgeKey?: 'orders_ready' | 'ndr_pending'): number => {
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

    const renderNavItem = (item: SellerNavItem, showBadge = true) => {
        const isActive = item.href === activeHref;
        const badgeCount = showBadge ? getBadgeCount(item.badgeKey) : 0;

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

            <div className="flex-1 overflow-y-auto p-4 scrollbar-premium">
                <nav className="space-y-2" aria-label="Seller sections">
                    {sellerNavSections.map((section) => {
                        const isExpanded = expandedSections[section.id] ?? section.defaultOpen;
                        const sectionBadgeCount = section.items.reduce(
                            (sum, item) => sum + getBadgeCount(item.badgeKey),
                            0
                        );

                        return (
                            <div key={section.id} className="mb-2">
                                <button
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
                                        transition={{ duration: 0.2 }}
                                    >
                                        <ChevronDown className="h-3.5 w-3.5" />
                                    </motion.div>
                                </button>

                                <AnimatePresence initial={false}>
                                    {isExpanded && (
                                        <motion.div
                                            id={`seller-nav-${section.id}`}
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.2, ease: 'easeInOut' }}
                                            className="overflow-hidden"
                                        >
                                            <div className="space-y-1 mt-1">
                                                {section.items.map((item) => renderNavItem(item))}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        );
                    })}

                    <div className="pt-4 mt-4 border-t border-[var(--border-subtle)]">
                        <div className="px-3 mb-2">
                            <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Account</span>
                        </div>
                        <div className="space-y-1">
                            {sellerAccountItems.map((item) => renderNavItem(item, false))}
                        </div>
                    </div>
                </nav>

                <div className="mt-6 pt-6">
                    <div className="divider-soft mb-4" />
                    <div className="px-3 mb-2">
                        <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Support</span>
                    </div>
                    <nav className="space-y-1">
                        {sellerSupportItems.map((item) => renderNavItem(item, false))}
                    </nav>
                </div>
            </div>

            <div className="p-4 mt-auto">
                <div className="h-px bg-[var(--border-subtle)] mb-4" />

                <div className="mb-3">
                    <div className="relative overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-gradient-to-br from-[var(--bg-secondary)] to-[var(--bg-tertiary)] p-3 shadow-sm group cursor-pointer hover:border-[var(--primary-blue)]/30 transition-all duration-300">
                        <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-[var(--primary-blue)]/5 blur-2xl group-hover:bg-[var(--primary-blue)]/10 transition-colors duration-500" />

                        <div className="relative flex items-center justify-between">
                            <div className="space-y-0.5">
                                <p className="text-xs font-bold text-[var(--text-primary)] tracking-wide">Shipcrowd Pro</p>
                                <p className="text-[10px] font-medium text-[var(--text-muted)]">Premium Active</p>
                            </div>
                            <Badge variant="success" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[9px] px-1.5 py-0">
                                PRO
                            </Badge>
                        </div>
                    </div>
                </div>

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
