"use client";
export const dynamic = "force-dynamic";

import { useState } from 'react';
import { Card, CardContent } from '@/src/components/ui/core/Card';
import { Button } from '@/src/components/ui/core/Button';
import { Input } from '@/src/components/ui/core/Input';
import { Badge } from '@/src/components/ui/core/Badge';
import { Loader } from '@/src/components/ui/feedback/Loader';
import {
    Search,
    TrendingUp,
    Store,
    AlertTriangle,
    CheckCircle2,
    BarChart3,
    ArrowUpRight,
    ArrowDownRight,
    Minus,
    ExternalLink,
    RefreshCw,
    Filter,
    AlertCircle
} from 'lucide-react';
import { cn, formatCurrency } from '@/src/lib/utils';
import { useSellerHealth, useRefreshHealthMetrics } from '@/src/core/api/hooks/admin/useSellerHealth';
import { SellerHealth, HealthFilters } from '@/src/core/api/clients/analytics/sellerHealthApi';
import { useToast } from '@/src/components/ui/feedback/Toast';

export function SellersClient() {
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<HealthFilters['status'] | 'all'>('all');

    // Query hook
    const {
        data: healthData,
        isLoading,
        isError,
        error,
        refetch
    } = useSellerHealth({
        status: statusFilter !== 'all' ? statusFilter : undefined,
    }); // Note: Search is handled client-side combined with API filter if API supports it. 
    // sellerHealthApi seems to support status, metric, sortBy. Not explicit search text.
    // We will filter by text client-side.

    const { mutate: refreshMetrics, isPending: isRefreshing } = useRefreshHealthMetrics();
    const { addToast } = useToast();

    // Derived client-side filtering for search
    const filteredSellers = healthData?.sellers.filter(seller =>
        seller.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        seller.email.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

    const summary = healthData?.summary || {
        total: 0,
        byStatus: { excellent: 0, good: 0, warning: 0, critical: 0 },
        avgHealthScore: 0
    };

    const handleRefresh = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        refreshMetrics(id);
    };

    if (isLoading) {
        return <Loader fullScreen message="Loading seller health dashboard..." />;
    }

    if (isError) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center">
                <AlertCircle className="h-12 w-12 text-[var(--error)] mb-4" />
                <h3 className="text-lg font-medium text-[var(--text-primary)]">Failed to load seller health</h3>
                <p className="text-[var(--text-muted)] mt-2 mb-6">{error?.message || "Something went wrong"}</p>
                <Button onClick={() => refetch()} variant="outline">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                        <Store className="h-6 w-6 text-[var(--primary-blue)]" />
                        Seller Management
                    </h1>
                    <p className="text-[var(--text-muted)] text-sm mt-1">
                        Monitor seller health, performance, and risk metrics
                    </p>
                </div>
                <Button variant="outline" onClick={() => refetch()}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh All
                </Button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <SummaryCard
                    title="Total Sellers"
                    value={summary.total}
                    icon={Store}
                    color="primary"
                />
                <SummaryCard
                    title="Healthy Sellers"
                    value={(summary.byStatus.excellent || 0) + (summary.byStatus.good || 0)}
                    icon={CheckCircle2}
                    color="success"
                />
                <SummaryCard
                    title="Critical Risk"
                    value={summary.byStatus.critical || 0}
                    icon={AlertTriangle}
                    color="error"
                />
                <SummaryCard
                    title="Avg Health Score"
                    value={summary.avgHealthScore ? `${Math.round(summary.avgHealthScore)}%` : '-'}
                    icon={BarChart3}
                    color="warning" // using warning/info color for score
                />
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
                    <Input
                        placeholder="Search sellers by name or email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
                    <FilterButton
                        label="All"
                        active={statusFilter === 'all'}
                        onClick={() => setStatusFilter('all')}
                    />
                    <FilterButton
                        label="Excellent"
                        active={statusFilter === 'excellent'}
                        onClick={() => setStatusFilter('excellent')}
                        color="success"
                    />
                    <FilterButton
                        label="Warning"
                        active={statusFilter === 'warning'}
                        onClick={() => setStatusFilter('warning')}
                        color="warning"
                    />
                    <FilterButton
                        label="Critical"
                        active={statusFilter === 'critical'}
                        onClick={() => setStatusFilter('critical')}
                        color="error"
                    />
                </div>
            </div>

            {/* Sellers Grid */}
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filteredSellers.map((seller) => (
                    <SellerCard
                        key={seller.sellerId}
                        seller={seller}
                        onRefresh={(e) => handleRefresh(seller.sellerId, e)}
                    />
                ))}
            </div>

            {/* Empty State */}
            {filteredSellers.length === 0 && (
                <Card>
                    <CardContent className="py-12 text-center">
                        <Store className="h-12 w-12 text-[var(--text-disabled)] mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-[var(--text-primary)]">No sellers found</h3>
                        <p className="text-[var(--text-muted)] mt-1">
                            {statusFilter !== 'all' ? `No sellers with ${statusFilter} status` : "Try adjusting your search"}
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

// --- Components ---

function SummaryCard({ title, value, icon: Icon, color }: {
    title: string;
    value: number | string;
    icon: any;
    color: 'primary' | 'success' | 'warning' | 'error'
}) {
    const colorStyles = {
        primary: { text: 'text-[var(--primary-blue)]', bg: 'bg-[var(--primary-blue-soft)]' },
        success: { text: 'text-[var(--success)]', bg: 'bg-[var(--success-bg)]' },
        warning: { text: 'text-[var(--warning)]', bg: 'bg-[var(--warning-bg)]' },
        error: { text: 'text-[var(--error)]', bg: 'bg-[var(--error-bg)]' },
    };

    const style = colorStyles[color];

    return (
        <Card>
            <CardContent className="p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-[var(--text-muted)]">{title}</p>
                        <p className={cn("text-2xl font-bold", style.text)}>{value}</p>
                    </div>
                    <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", style.bg)}>
                        <Icon className={cn("h-5 w-5", style.text)} />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function FilterButton({ label, active, onClick, color }: {
    label: string,
    active: boolean,
    onClick: () => void,
    color?: string
}) {
    return (
        <Button
            variant={active ? "primary" : "outline"}
            size="sm"
            onClick={onClick}
            className={cn(
                "whitespace-nowrap",
                !active && "text-[var(--text-secondary)]",
                active && color === 'success' && "bg-[var(--success)] hover:bg-[var(--success)]/90",
                active && color === 'warning' && "bg-[var(--warning)] hover:bg-[var(--warning)]/90 text-white",
                active && color === 'error' && "bg-[var(--error)] hover:bg-[var(--error)]/90"
            )}
        >
            {label}
        </Button>
    );
}

function SellerCard({ seller, onRefresh }: { seller: SellerHealth, onRefresh: (e: React.MouseEvent) => void }) {
    const getScoreColor = (score: number) => {
        if (score >= 80) return 'text-[var(--success)]';
        if (score >= 50) return 'text-[var(--warning)]';
        return 'text-[var(--error)]';
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'excellent': return 'success';
            case 'good': return 'success'; // or neutral?
            case 'warning': return 'warning';
            case 'critical': return 'error';
            default: return 'neutral';
        }
    };

    // Helper for trend icons
    const TrendIcon = ({ trend }: { trend: 'up' | 'down' | 'stable' | 'improving' | 'declining' }) => {
        if (trend === 'up' || trend === 'improving') return <ArrowUpRight className="h-3 w-3 text-[var(--success)]" />;
        if (trend === 'down' || trend === 'declining') return <ArrowDownRight className="h-3 w-3 text-[var(--error)]" />;
        return <Minus className="h-3 w-3 text-[var(--text-muted)]" />;
    };

    return (
        <Card className="hover:shadow-md transition-shadow group cursor-pointer relative overflow-hidden">
            {/* Health Bar Indicator */}
            <div className={cn(
                "absolute top-0 left-0 w-1 h-full",
                seller.healthScore >= 80 ? "bg-[var(--success)]" :
                    seller.healthScore >= 50 ? "bg-[var(--warning)]" : "bg-[var(--error)]"
            )} />

            <CardContent className="p-5 pl-7">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="font-semibold text-lg text-[var(--text-primary)] line-clamp-1">{seller.companyName}</h3>
                        <p className="text-sm text-[var(--text-muted)]">{seller.email}</p>
                    </div>
                    <Badge variant={getStatusColor(seller.status) as any} className="capitalize">
                        {seller.status}
                    </Badge>
                </div>

                {/* Score Big Display */}
                <div className="flex items-end gap-2 mb-6">
                    <div className={cn("text-4xl font-bold font-mono tracking-tight", getScoreColor(seller.healthScore))}>
                        {seller.healthScore}
                    </div>
                    <div className="text-sm text-[var(--text-muted)] mb-1.5 font-medium">/ 100 Health Score</div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-sm">
                    <div className="space-y-1">
                        <div className="flex items-center gap-1 text-[var(--text-muted)]">
                            Orders
                            <TrendIcon trend={seller.trends.orders} />
                        </div>
                        <p className="font-semibold">{seller.metrics.orderVolume}</p>
                    </div>
                    <div className="space-y-1">
                        <div className="flex items-center gap-1 text-[var(--text-muted)]">
                            Revenue
                            <TrendIcon trend={seller.trends.revenue} />
                        </div>
                        <p className="font-semibold">{formatCurrency(seller.metrics.revenue)}</p>
                    </div>
                    <div className="space-y-1">
                        <div className="text-[var(--text-muted)]">RTO Rate</div>
                        <p className={cn("font-semibold", seller.metrics.rtoRate > 30 ? "text-[var(--error)]" : "text-[var(--text-primary)]")}>
                            {seller.metrics.rtoRate}%
                        </p>
                    </div>
                    <div className="space-y-1">
                        <div className="text-[var(--text-muted)]">NDR Rate</div>
                        <p className="font-semibold">{seller.metrics.ndrRate}%</p>
                    </div>
                </div>

                {/* Actions Overlay / Footer */}
                <div className="mt-4 pt-4 border-t border-[var(--border-subtle)] flex justify-between items-center bg-opacity-0 group-hover:bg-opacity-100 transition-all">
                    <span className="text-xs text-[var(--text-muted)]">
                        Updated {new Date(seller.lastUpdated).toLocaleDateString()}
                    </span>
                    <div className="flex gap-2">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onRefresh}>
                            <RefreshCw className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
