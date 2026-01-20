/**
 * OrderStatusGrid - Visual overview of order statuses
 * Provides quick access to orders filtered by status
 */

'use client';

import { Package, Truck, CheckCircle, XCircle, AlertCircle, RotateCcw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useIsMobile } from '../../../hooks/ux';

interface OrderStatus {
    id: string;
    status: string;
    label: string;
    count: number;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    bgColor: string;
    ctaLabel: string;
    url: string;
}

interface OrderStatusGridProps {
    statusCounts: {
        pending: number;
        shipped: number;
        delivered: number;
        rto: number;
        failed: number;
        cancelled: number;
    };
}

export function OrderStatusGrid({ statusCounts }: OrderStatusGridProps) {
    const router = useRouter();
    const isMobile = useIsMobile();

    const statuses: OrderStatus[] = [
        {
            id: 'pending',
            status: 'pending',
            label: 'Pending Pickup',
            count: statusCounts.pending,
            icon: Package,
            color: 'var(--warning)',
            bgColor: 'var(--warning-bg)',
            ctaLabel: 'Schedule',
            url: '/seller/orders?status=pending'
        },
        {
            id: 'shipped',
            status: 'shipped',
            label: 'In Transit',
            count: statusCounts.shipped,
            icon: Truck,
            color: 'var(--info)',
            bgColor: 'var(--info-bg)',
            ctaLabel: 'Track',
            url: '/seller/orders?status=shipped'
        },
        {
            id: 'delivered',
            status: 'delivered',
            label: 'Delivered',
            count: statusCounts.delivered,
            icon: CheckCircle,
            color: 'var(--success)',
            bgColor: 'var(--success-bg)',
            ctaLabel: 'View',
            url: '/seller/orders?status=delivered'
        },
        {
            id: 'rto',
            status: 'rto',
            label: 'RTO',
            count: statusCounts.rto,
            icon: RotateCcw,
            color: 'var(--error)',
            bgColor: 'var(--error-bg)',
            ctaLabel: 'Review',
            url: '/seller/orders?status=rto'
        },
        {
            id: 'failed',
            status: 'failed',
            label: 'Failed',
            count: statusCounts.failed,
            icon: XCircle,
            color: 'var(--error)',
            bgColor: 'var(--error-bg)',
            ctaLabel: 'Fix',
            url: '/seller/orders?status=failed'
        },
        {
            id: 'cancelled',
            status: 'cancelled',
            label: 'Cancelled',
            count: statusCounts.cancelled,
            icon: AlertCircle,
            color: 'var(--text-muted)',
            bgColor: 'var(--bg-secondary)',
            ctaLabel: 'View',
            url: '/seller/orders?status=cancelled'
        }
    ];

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between px-1">
                <div>
                    <h2 className="text-lg font-bold text-[var(--text-primary)]">
                        Order Status
                    </h2>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                        Orders by status
                    </p>
                </div>
                <a
                    href="/seller/orders"
                    className="text-sm font-medium text-[var(--primary-blue)] hover:text-[var(--primary-blue-deep)] transition-colors"
                >
                    View All →
                </a>
            </div>

            {/* Status Grid */}
            <div className={`grid gap-4 ${isMobile ? 'grid-cols-2' : 'grid-cols-3'}`}>
                {statuses.map((status, index) => (
                    <motion.button
                        key={status.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05, duration: 0.4 }}
                        onClick={() => router.push(status.url)}
                        className="group relative rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-5 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] hover:border-[var(--border-focus)] transition-all duration-200 text-left"
                    >
                        {/* Icon and Count */}
                        <div className="flex items-start justify-between mb-4">
                            <div
                                className="p-2.5 rounded-xl border"
                                style={{
                                    backgroundColor: status.bgColor,
                                    borderColor: `${status.color}20`,
                                    color: status.color
                                }}
                            >
                                <status.icon className="w-5 h-5" />
                            </div>

                            <span
                                className="text-2xl font-bold tracking-tight"
                                style={{ color: status.color }}
                            >
                                {status.count}
                            </span>
                        </div>

                        {/* Label */}
                        <div className="mb-3">
                            <h3 className="font-bold text-[var(--text-primary)] text-sm tracking-tight">
                                {status.label}
                            </h3>
                        </div>

                        {/* CTA */}
                        <div
                            className="text-[10px] font-bold uppercase tracking-wide transition-opacity opacity-70 group-hover:opacity-100"
                            style={{ color: status.color }}
                        >
                            {status.ctaLabel} →
                        </div>
                    </motion.button>
                ))}
            </div>
        </div>
    );
}
