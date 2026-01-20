/**
 * QuickActionsGrid - Actionable shortcuts for common tasks
 * Replaces Smart Insights with real, useful actions
 */

'use client';

import { Package, Truck, Wallet, FileText, Settings, BarChart3, Upload, Download } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useIsMobile } from '../../../hooks/ux';

interface QuickAction {
    id: string;
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    description: string;
    url: string;
    badge?: string | number;
    color: string;
}

interface QuickActionsGridProps {
    walletBalance?: number;
    pendingPickups?: number;
}

export function QuickActionsGrid({ walletBalance = 0, pendingPickups = 0 }: QuickActionsGridProps) {
    const router = useRouter();
    const isMobile = useIsMobile();

    const actions: QuickAction[] = [
        {
            id: 'create-order',
            icon: Package,
            title: 'Create Order',
            description: 'Single or bulk upload',
            url: '/seller/orders/create',
            color: 'var(--primary-blue)'
        },
        {
            id: 'schedule-pickup',
            icon: Truck,
            title: 'Schedule Pickup',
            description: pendingPickups > 0 ? `${pendingPickups} pending` : 'No pending pickups',
            url: '/seller/pickups',
            badge: pendingPickups > 0 ? pendingPickups : undefined,
            color: 'var(--warning)'
        },
        {
            id: 'recharge-wallet',
            icon: Wallet,
            title: 'Recharge Wallet',
            description: `Balance: ₹${walletBalance.toLocaleString()}`,
            url: '/seller/wallet/recharge',
            color: 'var(--success)'
        },
        {
            id: 'bulk-upload',
            icon: Upload,
            title: 'Bulk Upload',
            description: 'Import orders via CSV',
            url: '/seller/orders/bulk',
            color: 'var(--info)'
        },
        {
            id: 'download-reports',
            icon: Download,
            title: 'Download Reports',
            description: 'Export your data',
            url: '/seller/reports',
            color: 'var(--text-secondary)'
        },
        {
            id: 'courier-settings',
            icon: Settings,
            title: 'Courier Settings',
            description: 'Manage preferences',
            url: '/seller/settings/couriers',
            color: 'var(--text-secondary)'
        },
        {
            id: 'full-analytics',
            icon: BarChart3,
            title: 'Full Analytics',
            description: 'Detailed insights',
            url: '/seller/analytics',
            color: 'var(--primary-blue)'
        },
        {
            id: 'view-orders',
            icon: FileText,
            title: 'All Orders',
            description: 'Complete order list',
            url: '/seller/orders',
            color: 'var(--text-secondary)'
        }
    ];

    // Show 6 on mobile, all on desktop
    const displayedActions = isMobile ? actions.slice(0, 6) : actions;

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between px-1">
                <div>
                    <h2 className="text-lg font-bold text-[var(--text-primary)]">
                        Quick Actions
                    </h2>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                        Common tasks and shortcuts
                    </p>
                </div>
            </div>

            {/* Actions Grid */}
            <div className={`grid gap-4 ${isMobile ? 'grid-cols-2' : 'grid-cols-4'}`}>
                {displayedActions.map((action, index) => (
                    <motion.button
                        key={action.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05, duration: 0.4 }}
                        onClick={() => router.push(action.url)}
                        className="group relative rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-5 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] hover:border-[var(--border-focus)] transition-all duration-200 text-left"
                    >
                        {/* Badge */}
                        {action.badge && (
                            <span className="absolute -top-1.5 -right-1.5 px-2 py-0.5 text-xs font-bold bg-[var(--error)] text-white rounded-full shadow-sm z-10">
                                {action.badge}
                            </span>
                        )}

                        {/* Icon */}
                        <div className="mb-4">
                            <div
                                className="inline-flex p-2.5 rounded-xl border transition-transform group-hover:scale-105"
                                style={{
                                    backgroundColor: `${action.color}15`,
                                    borderColor: `${action.color}20`,
                                    color: action.color
                                }}
                            >
                                <action.icon className="w-5 h-5" />
                            </div>
                        </div>

                        {/* Content */}
                        <div>
                            <h3 className="font-bold text-[var(--text-primary)] text-sm mb-1 tracking-tight">
                                {action.title}
                            </h3>
                            <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wide line-clamp-1">
                                {action.description}
                            </p>
                        </div>
                    </motion.button>
                ))}
            </div>
        </div>
    );
}
