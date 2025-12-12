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
    Boxes,
    Sparkles,
    PackageX,
    Plug,
    Users,
    CreditCard,
    Receipt,
    Ticket,
    Headphones,
    Scale as ScaleIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

const navItems = [
    { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { label: 'Sellers', href: '/admin/sellers', icon: Users },
    { label: 'KYC Analytics', href: '/admin/kyc', icon: Boxes },
    { label: 'Intelligence', href: '/admin/intelligence', icon: Sparkles },
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

export function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-gray-100 bg-white">
            <div className="flex h-16 items-center px-6 border-b border-gray-100">
                <img src="/logos/Shipcrowd-logo.png" alt="ShipCrowd Logo" className="h-8 w-auto" />
            </div>

            <div className="flex flex-col justify-between h-[calc(100vh-64px)] p-4">
                <nav className="space-y-1">
                    {navItems.map((item) => {
                        // Precise matching for root admin, partial for sub-routes
                        const isActive = item.href === '/admin'
                            ? pathname === '/admin'
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

                <div className="mt-auto pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-3 px-3 py-3 mb-2 rounded-lg bg-gray-50">
                        <div className="h-8 w-8 rounded-full bg-[#2525FF] flex items-center justify-center text-white font-bold text-xs">
                            DG
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <p className="text-sm font-medium text-gray-900 truncate">Dhiraj Giri</p>
                            <p className="text-xs text-gray-500 truncate">Admin</p>
                        </div>
                    </div>
                    <Button variant="ghost" className="w-full justify-start text-rose-600 hover:text-rose-700 hover:bg-rose-50">
                        <LogOut className="h-4 w-4 mr-2" />
                        Sign Out
                    </Button>
                </div>
            </div>
        </aside>
    );
}
