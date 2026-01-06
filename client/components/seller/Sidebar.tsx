"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard,
    Package,
    ShoppingCart,
    Building2,
    Truck,
    Wallet,
    Settings,
    LogOut,
    PackageX,
    Calculator,
    Search,
    HelpCircle,
    Plug,
    Shield,
    FileText,
    Scale as ScaleIcon,
    Banknote,
    ChevronRight,
    ChevronDown,
    MapPin
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/src/features/auth';
import { useSellerActions } from '@/src/core/api/hooks/useSellerActions';
import { Badge } from '@/components/ui/core/Badge';

// Define navigation structure with sections
interface NavItem {
    label: string;
    href: string;
    icon: any;
    badgeKey?: 'orders_ready' | 'ndr_pending';
}

interface NavSection {
    id: string;
    title: string;
    items: NavItem[];
    defaultOpen?: boolean;
}

const navSections: NavSection[] = [
    {
        id: 'shipping',
        title: 'Shipping',
        defaultOpen: true,
        items: [
            { label: 'Dashboard', href: '/seller', icon: LayoutDashboard },
            { label: 'Orders', href: '/seller/orders', icon: ShoppingCart, badgeKey: 'orders_ready' },
            { label: 'Shipments', href: '/seller/shipments', icon: Package },
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
            { label: 'Wallet & Billing', href: '/seller/financials', icon: Wallet },
            { label: 'COD Remittance', href: '/seller/cod', icon: Banknote },
        ],
    },
];

const accountItems: NavItem[] = [
    { label: 'Integrations', href: '/seller/integrations', icon: Plug },
    { label: 'KYC Verification', href: '/seller/kyc', icon: Shield },
    { label: 'Settings', href: '/seller/settings', icon: Settings },
];

const supportItems = [
    { label: 'Help & Support', href: '/seller/support', icon: HelpCircle },
];

export function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const { user, logout } = useAuth();
    const { data: actions } = useSellerActions();

    // Load expanded state from localStorage
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('seller-sidebar-sections');
            if (saved) {
                try {
                    return JSON.parse(saved);
                } catch {
                    return { shipping: true, operations: false, financial: false };
                }
            }
        }
        return { shipping: true, operations: false, financial: false };
    });

    // Persist to localStorage
    useEffect(() => {
        localStorage.setItem('seller-sidebar-sections', JSON.stringify(expandedSections));
    }, [expandedSections]);

    // Get badge counts from actions
    const getBadgeCount = (badgeKey?: 'orders_ready' | 'ndr_pending'): number => {
        if (!badgeKey || !actions?.items) return 0;
        const action = actions.items.find(a => a.type === badgeKey);
        return action?.count || 0;
    };

    // Get user initials
    const initials = user?.name
        ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
        : 'SL';

    const handleSignOut = async () => {
        await logout();
        router.push('/login');
    };

    const toggleSection = (sectionId: string) => {
        setExpandedSections(prev => ({
            ...prev,
            [sectionId]: !prev[sectionId],
        }));
    };

    const renderNavItem = (item: NavItem, showBadge = true) => {
        const isActive = item.href === '/seller'
            ? pathname === '/seller'
            : pathname.startsWith(item.href);
        const badgeCount = showBadge ? getBadgeCount(item.badgeKey) : 0;

        return (
            <Link
                key={item.href}
                href={item.href}
                className={cn(
                    "relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group overflow-hidden",
                    isActive
                        ? "bg-[var(--primary-blue-soft)]/50 text-[var(--primary-blue)]"
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                )}
            >
                {/* Active state indicator - subtle sidebar line */}
                {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-[var(--primary-blue)]" />
                )}

                <item.icon className={cn(
                    "relative z-10 h-5 w-5 transition-all duration-200",
                    isActive ? "text-[var(--primary-blue)]" : "text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]"
                )} />
                <span className="relative z-10 flex-1">{item.label}</span>

                {/* Badge for actionable items */}
                {badgeCount > 0 && (
                    <span className={cn(
                        "relative z-10 px-1.5 py-0.5 text-[10px] font-bold rounded-full min-w-[18px] text-center",
                        isActive
                            ? "bg-[var(--primary-blue)] text-white"
                            : "bg-[var(--error)] text-white"
                    )}>
                        {badgeCount}
                    </span>
                )}

                {/* Arrow indicator on hover */}
                {!badgeCount && (
                    <ChevronRight className={cn(
                        "relative z-10 h-4 w-4 opacity-0 -translate-x-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0",
                        isActive ? "text-[var(--primary-blue)]" : "text-[var(--text-muted)]"
                    )} />
                )}
            </Link>
        );
    };

    return (
        <aside className="fixed left-0 top-0 z-[var(--z-sidebar-desktop)] h-screen w-64 bg-[var(--bg-primary)] border-r border-[var(--border-subtle)] flex flex-col">
            {/* Logo */}
            <div className="flex h-16 items-center px-6">
                <img
                    src="https://res.cloudinary.com/divbobkmd/image/upload/v1767468077/Helix_logo_yopeh9.png"
                    alt="ShipCrowd Logo"
                    className="h-8 w-auto transition-opacity duration-200 hover:opacity-80 rounded-full"
                />
            </div>

            {/* Navigation */}
            <div className="flex-1 overflow-y-auto p-4 scrollbar-premium">
                <nav className="space-y-2">
                    {/* Collapsible Sections */}
                    {navSections.map((section) => {
                        const isExpanded = expandedSections[section.id] ?? section.defaultOpen;
                        const sectionBadgeCount = section.items.reduce(
                            (sum, item) => sum + getBadgeCount(item.badgeKey),
                            0
                        );

                        return (
                            <div key={section.id} className="mb-2">
                                {/* Section Header - Clickable */}
                                <button
                                    onClick={() => toggleSection(section.id)}
                                    className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider hover:text-[var(--text-secondary)] transition-colors rounded-lg hover:bg-[var(--bg-hover)]"
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

                                {/* Section Items */}
                                <AnimatePresence initial={false}>
                                    {isExpanded && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.2, ease: "easeInOut" }}
                                            className="overflow-hidden"
                                        >
                                            <div className="space-y-1 mt-1">
                                                {section.items.map(item => renderNavItem(item))}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        );
                    })}

                    {/* Account Section - Always Visible */}
                    <div className="pt-4 mt-4 border-t border-[var(--border-subtle)]">
                        <div className="px-3 mb-2">
                            <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Account</span>
                        </div>
                        <div className="space-y-1">
                            {accountItems.map(item => renderNavItem(item, false))}
                        </div>
                    </div>
                </nav>

                {/* Support Section */}
                <div className="mt-6 pt-6">
                    <div className="divider-soft mb-4" />
                    <div className="px-3 mb-2">
                        <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Support</span>
                    </div>
                    <nav className="space-y-1">
                        {supportItems.map(item => renderNavItem(item, false))}
                    </nav>
                </div>
            </div>

            {/* User Profile & Footer */}
            <div className="p-4 mt-auto">
                <div className="h-px bg-[var(--border-subtle)] mb-4" />

                {/* Company Badge - Clean & Premium */}
                <div className="mb-3">
                    <div className="relative overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-gradient-to-br from-[var(--bg-secondary)] to-[var(--bg-tertiary)] p-3 shadow-sm group cursor-pointer hover:border-[var(--primary-blue)]/30 transition-all duration-300">
                        {/* Glow Effect */}
                        <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-[var(--primary-blue)]/5 blur-2xl group-hover:bg-[var(--primary-blue)]/10 transition-colors duration-500" />

                        <div className="relative flex items-center justify-between">
                            <div className="space-y-0.5">
                                <p className="text-xs font-bold text-[var(--text-primary)] tracking-wide">ShipCrowd Pro</p>
                                <p className="text-[10px] font-medium text-[var(--text-muted)]">Premium Active</p>
                            </div>
                            <Badge variant="success" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[9px] px-1.5 py-0">
                                PRO
                            </Badge>
                        </div>
                    </div>
                </div>

                {/* User Info - Minimalist */}
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

                {/* Sign Out */}
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
