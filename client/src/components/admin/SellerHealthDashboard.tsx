"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
    Activity,
    AlertTriangle,
    TrendingDown,
    TrendingUp,
    Users,
    DollarSign,
    Package,
    Clock,
    Eye,
    MessageSquare,
    CheckCircle2
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from '@/src/components/ui/core/Card';
import { Badge } from '@/src/components/ui/core/Badge';
import { Button } from '@/src/components/ui/core/Button';
import { cn } from "@/src/shared/utils";
import Link from "next/link";

interface SellerHealth {
    id: string;
    companyName: string;
    contactPerson: string;
    healthScore: number;
    status: 'healthy' | 'at-risk' | 'critical';
    metrics: {
        ordersThisMonth: number;
        orderTrend: number;
        revenue: number;
        revenueTrend: number;
        rtoRate: number;
        avgDeliveryTime: number;
        kycStatus: 'verified' | 'pending' | 'rejected';
        walletBalance: number;
    };
    alerts: string[];
    lastOrderDate: string;
}

// Mock seller health data
const mockSellers: SellerHealth[] = [
    {
        id: 'S001',
        companyName: 'Fashion Trends Ltd',
        contactPerson: 'Rahul Sharma',
        healthScore: 45,
        status: 'critical',
        metrics: {
            ordersThisMonth: 12,
            orderTrend: -65,
            revenue: 45000,
            revenueTrend: -58,
            rtoRate: 28,
            avgDeliveryTime: 7.5,
            kycStatus: 'verified',
            walletBalance: 850,
        },
        alerts: ['High RTO rate (28%)', 'Orders down 65%', 'Low wallet balance'],
        lastOrderDate: '2024-12-20',
    },
    {
        id: 'S002',
        companyName: 'TechGear India',
        contactPerson: 'Priya Patel',
        healthScore: 68,
        status: 'at-risk',
        metrics: {
            ordersThisMonth: 145,
            orderTrend: -15,
            revenue: 385000,
            revenueTrend: -12,
            rtoRate: 12,
            avgDeliveryTime: 4.2,
            kycStatus: 'verified',
            walletBalance: 12500,
        },
        alerts: ['Orders declining 15%', 'Revenue trend down'],
        lastOrderDate: '2024-12-24',
    },
    {
        id: 'S003',
        companyName: 'Organic Foods Co',
        contactPerson: 'Amit Kumar',
        healthScore: 92,
        status: 'healthy',
        metrics: {
            ordersThisMonth: 289,
            orderTrend: 24,
            revenue: 542000,
            revenueTrend: 32,
            rtoRate: 3.5,
            avgDeliveryTime: 3.1,
            kycStatus: 'verified',
            walletBalance: 45000,
        },
        alerts: [],
        lastOrderDate: '2024-12-24',
    },
];

const statusConfig = {
    healthy: {
        bg: 'bg-[var(--success-bg)]',
        border: 'border-[var(--success-border)]',
        text: 'text-[var(--success)]',
        badge: 'bg-[var(--success)] text-white',
    },
    'at-risk': {
        bg: 'bg-[var(--warning-bg)]',
        border: 'border-[var(--warning-border)]',
        text: 'text-[var(--warning)]',
        badge: 'bg-[var(--warning)] text-white',
    },
    critical: {
        bg: 'bg-[var(--error-bg)]',
        border: 'border-[var(--error-border)]',
        text: 'text-[var(--error)]',
        badge: 'bg-[var(--error)] text-white',
    },
};

export function SellerHealthDashboard() {
    const [filter, setFilter] = useState<'all' | 'healthy' | 'at-risk' | 'critical'>('all');

    const filteredSellers = mockSellers.filter(
        seller => filter === 'all' || seller.status === filter
    );

    const criticalCount = mockSellers.filter(s => s.status === 'critical').length;
    const atRiskCount = mockSellers.filter(s => s.status === 'at-risk').length;
    const healthyCount = mockSellers.filter(s => s.status === 'healthy').length;
    const avgHealthScore = Math.round(mockSellers.reduce((sum, s) => sum + s.healthScore, 0) / mockSellers.length);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-3">
                        <Activity className="h-7 w-7 text-[var(--primary-blue)]" />
                        Seller Health Monitor
                    </h2>
                    <p className="text-sm text-[var(--text-secondary)] mt-1">
                        Track seller performance and identify at-risk accounts
                    </p>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="border-[var(--border-default)]">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-[var(--text-secondary)]">Avg Health Score</p>
                                <p className="text-3xl font-bold text-[var(--text-primary)] mt-1">{avgHealthScore}</p>
                            </div>
                            <Activity className="h-10 w-10 text-blue-500 opacity-20" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/50 dark:bg-emerald-950/20">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-emerald-700 dark:text-emerald-300">Healthy</p>
                                <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{healthyCount}</p>
                            </div>
                            <CheckCircle2 className="h-10 w-10 text-emerald-500 opacity-20" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-950/20">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-amber-700 dark:text-amber-300">At Risk</p>
                                <p className="text-3xl font-bold text-amber-600 dark:text-amber-400 mt-1">{atRiskCount}</p>
                            </div>
                            <AlertTriangle className="h-10 w-10 text-amber-500 opacity-20" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-rose-200 dark:border-rose-800/50 bg-rose-50/50 dark:bg-rose-950/20">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-rose-700 dark:text-rose-300">Critical</p>
                                <p className="text-3xl font-bold text-rose-600 dark:text-rose-400 mt-1">{criticalCount}</p>
                            </div>
                            <Activity className="h-10 w-10 text-rose-500 opacity-20" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <div className="flex gap-2">
                {(['all', 'critical', 'at-risk', 'healthy'] as const).map((f) => (
                    <Button
                        key={f}
                        variant={filter === f ? 'primary' : 'outline'}
                        size="sm"
                        onClick={() => setFilter(f)}
                    >
                        {f === 'all' ? 'All Sellers' : f === 'at-risk' ? 'At Risk' : f.charAt(0).toUpperCase() + f.slice(1)}
                    </Button>
                ))}
            </div>

            {/* Seller Cards */}
            <div className="space-y-4">
                {filteredSellers.map((seller, index) => {
                    const config = statusConfig[seller.status];

                    return (
                        <motion.div
                            key={seller.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                        >
                            <Card className={cn("border overflow-hidden", config.border, config.bg)}>
                                <CardContent className="p-6">
                                    <div className="flex flex-col lg:flex-row gap-6">
                                        {/* Left: Company Info */}
                                        <div className="flex-1 space-y-4">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <h3 className="font-bold text-lg text-[var(--text-primary)] mb-1">
                                                        {seller.companyName}
                                                    </h3>
                                                    <p className="text-sm text-[var(--text-secondary)]">
                                                        {seller.contactPerson} • {seller.id}
                                                    </p>
                                                </div>
                                                <Badge className={config.badge}>
                                                    {seller.status.toUpperCase()}
                                                </Badge>
                                            </div>

                                            {/* Health Score */}
                                            <div>
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-sm font-medium text-[var(--text-secondary)]">Health Score</span>
                                                    <span className={cn("text-lg font-bold", config.text)}>{seller.healthScore}/100</span>
                                                </div>
                                                <div className="h-2 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                                                    <div
                                                        className={cn(
                                                            "h-full transition-all duration-500",
                                                            seller.status === 'healthy' ? "bg-emerald-500" :
                                                                seller.status === 'at-risk' ? "bg-amber-500" : "bg-rose-500"
                                                        )}
                                                        style={{ width: `${seller.healthScore}%` }}
                                                    />
                                                </div>
                                            </div>

                                            {/* Metrics Grid */}
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                <div className="p-3 bg-[var(--bg-primary)] rounded-lg border border-[var(--border-subtle)]">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <Package className="h-4 w-4 text-[var(--text-muted)]" />
                                                        <span className="text-xs text-[var(--text-muted)]">Orders</span>
                                                    </div>
                                                    <p className="font-bold text-[var(--text-primary)]">{seller.metrics.ordersThisMonth}</p>
                                                    <div className={cn(
                                                        "flex items-center gap-1 text-xs",
                                                        seller.metrics.orderTrend > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                                                    )}>
                                                        {seller.metrics.orderTrend > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                                        {Math.abs(seller.metrics.orderTrend)}%
                                                    </div>
                                                </div>

                                                <div className="p-3 bg-[var(--bg-primary)] rounded-lg border border-[var(--border-subtle)]">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <DollarSign className="h-4 w-4 text-[var(--text-muted)]" />
                                                        <span className="text-xs text-[var(--text-muted)]">Revenue</span>
                                                    </div>
                                                    <p className="font-bold text-[var(--text-primary)]">₹{(seller.metrics.revenue / 1000).toFixed(0)}K</p>
                                                    <div className={cn(
                                                        "flex items-center gap-1 text-xs",
                                                        seller.metrics.revenueTrend > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                                                    )}>
                                                        {seller.metrics.revenueTrend > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                                        {Math.abs(seller.metrics.revenueTrend)}%
                                                    </div>
                                                </div>

                                                <div className="p-3 bg-[var(--bg-primary)] rounded-lg border border-[var(--border-subtle)]">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <Activity className="h-4 w-4 text-[var(--text-muted)]" />
                                                        <span className="text-xs text-[var(--text-muted)]">RTO Rate</span>
                                                    </div>
                                                    <p className={cn(
                                                        "font-bold",
                                                        seller.metrics.rtoRate > 15 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
                                                    )}>
                                                        {seller.metrics.rtoRate}%
                                                    </p>
                                                </div>

                                                <div className="p-3 bg-[var(--bg-primary)] rounded-lg border border-[var(--border-subtle)]">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <Clock className="h-4 w-4 text-[var(--text-muted)]" />
                                                        <span className="text-xs text-[var(--text-muted)]">Avg Delivery</span>
                                                    </div>
                                                    <p className="font-bold text-[var(--text-primary)]">{seller.metrics.avgDeliveryTime}d</p>
                                                </div>
                                            </div>

                                            {/* Alerts */}
                                            {seller.alerts.length > 0 && (
                                                <div className="space-y-2">
                                                    {seller.alerts.map((alert, i) => (
                                                        <div key={i} className="flex items-start gap-2 p-2 bg-[var(--bg-primary)] rounded-lg border border-[var(--border-subtle)]">
                                                            <AlertTriangle className={cn("h-4 w-4 mt-0.5 shrink-0", config.text)} />
                                                            <span className="text-sm text-[var(--text-secondary)]">{alert}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Right: Actions */}
                                        <div className="flex flex-col gap-2 lg:w-48">
                                            <Link href={`/admin/sellers/${seller.id}`} className="w-full">
                                                <Button variant="outline" size="sm" className="w-full">
                                                    <Eye className="h-4 w-4 mr-2" />
                                                    View Details
                                                </Button>
                                            </Link>
                                            <Button variant="outline" size="sm">
                                                <MessageSquare className="h-4 w-4 mr-2" />
                                                Contact
                                            </Button>
                                            {seller.status !== 'healthy' && (
                                                <Button variant="primary" size="sm">
                                                    Take Action
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}

export default SellerHealthDashboard;
