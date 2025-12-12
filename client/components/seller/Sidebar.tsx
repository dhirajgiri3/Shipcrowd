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
    Banknote
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

    return (
        <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-gray-100 bg-white flex flex-col">
            {/* Logo */}
            <div className="flex h-16 items-center px-6 border-b border-gray-100">
                <img src="/logos/Shipcrowd-logo.png" alt="ShipCrowd Logo" className="h-8 w-auto" />
            </div>

            {/* Navigation */}
            <div className="flex-1 overflow-y-auto p-4">
                <nav className="space-y-1">
                    {navItems.map((item) => {
                        // Precise matching for root seller, partial for sub-routes
                        const isActive = item.href === '/seller'
                            ? pathname === '/seller'
                            : pathname.startsWith(item.href);

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group",
                                    isActive
                                        ? "bg-[#2525FF] text-white shadow-[0_4px_12px_rgba(37,37,255,0.2)]"
                                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                )}
                            >
                                <item.icon className={cn(
                                    "h-5 w-5 transition-colors",
                                    isActive ? "text-white" : "text-gray-400 group-hover:text-gray-600"
                                )} />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                {/* Secondary Navigation */}
                <div className="mt-6 pt-6 border-t border-gray-100">
                    <p className="px-3 mb-2 text-xs font-medium text-gray-400 uppercase tracking-wider">Support</p>
                    <nav className="space-y-1">
                        {bottomNavItems.map((item) => {
                            const isActive = pathname.startsWith(item.href);
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group",
                                        isActive
                                            ? "bg-[#2525FF] text-white shadow-[0_4px_12px_rgba(37,37,255,0.2)]"
                                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                    )}
                                >
                                    <item.icon className={cn(
                                        "h-5 w-5 transition-colors",
                                        isActive ? "text-white" : "text-gray-400 group-hover:text-gray-600"
                                    )} />
                                    {item.label}
                                </Link>
                            );
                        })}
                    </nav>
                </div>
            </div>

            {/* User Profile & Footer */}
            <div className="p-4 border-t border-gray-100">
                {/* Company Badge */}
                <div className="mb-3 px-3 py-2 rounded-lg bg-[#2525FF]/5 border border-[#2525FF]/10">
                    <p className="text-xs font-medium text-[#2525FF]">{mockUser.companyName}</p>
                    <p className="text-[10px] text-gray-600">Pro Plan • Active</p>
                </div>

                {/* User Info */}
                <div className="flex items-center gap-3 px-3 py-3 rounded-lg bg-gray-50">
                    <div className="h-9 w-9 rounded-full bg-[#2525FF] flex items-center justify-center text-white text-xs font-semibold">
                        {initials}
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <p className="text-sm font-medium text-gray-900 truncate">{mockUser.name}</p>
                        <p className="text-xs text-gray-500 truncate">Seller</p>
                    </div>
                </div>

                {/* Sign Out */}
                <Button
                    variant="ghost"
                    className="w-full justify-start text-rose-600 hover:text-rose-700 hover:bg-rose-50 mt-2"
                >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                </Button>
            </div>
        </aside>
    );
}
