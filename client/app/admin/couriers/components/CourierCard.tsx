import React from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardFooter, CardHeader } from '@/src/components/ui/core/Card';
import { Button } from '@/src/components/ui/core/Button';
import { Badge } from '@/src/components/ui/core/Badge';
import { StatusBadge } from '@/src/components/ui/data/StatusBadge';
import { cn } from '@/src/lib/utils';
import { getCourierLogoPath } from '@/src/lib/courier-logos';
import {
    Truck,
    IndianRupee,
    Settings,
    ShieldCheck,
    MapPin,
    BarChart3,
    Timer,
    Package
} from 'lucide-react';
import type { CourierListItem } from '@/src/core/api/hooks/admin/couriers/useCouriers';

interface CourierCardProps {
    courier: CourierListItem;
}

export function CourierCard({ courier }: CourierCardProps) {
    const router = useRouter();
    const logoPath = getCourierLogoPath(courier.code, courier.name);

    const formatNumber = (num?: number) => {
        if (!num && num !== 0) return '-';
        return new Intl.NumberFormat('en-IN', { maximumSignificantDigits: 3 }).format(num);
    };

    const formatCurrency = (amount?: number) => {
        if (!amount && amount !== 0) return '-';
        if (amount >= 100000) return `${(amount / 100000).toFixed(1)}L`;
        if (amount >= 1000) return `${(amount / 1000).toFixed(1)}k`;
        return amount.toString();
    };

    const getSuccessColor = (rate: number | undefined) => {
        if (!rate) return "text-[var(--text-muted)]";
        if (rate >= 90) return "text-[var(--success)]";
        if (rate >= 70) return "text-[var(--warning)]";
        return "text-[var(--error)]";
    };

    return (
        <Card
            hover
            className="group flex flex-col h-full overflow-hidden bg-[var(--bg-primary)] border-[var(--border-default)] transition-all duration-300 hover:border-[var(--primary-blue-200)] hover:shadow-lg hover:shadow-[var(--primary-blue-50)]/30"
        >
            {/* Header Section: Identity */}
            <CardHeader className="p-6 pb-4">
                <div className="flex justify-between items-start">
                    <div className="flex gap-5 items-center w-full">
                        <div className="relative h-16 w-16 rounded-2xl bg-[var(--bg-secondary)] flex items-center justify-center border border-[var(--border-subtle)] shrink-0 group-hover:scale-105 transition-transform duration-300">
                            {logoPath ? (
                                <img src={logoPath} alt={courier.name} className="h-10 w-10 object-contain" />
                            ) : (
                                <span className="text-xl font-bold text-[var(--text-secondary)]">{courier.name.slice(0, 2).toUpperCase()}</span>
                            )}
                            {courier.apiIntegrated && (
                                <div className="absolute -bottom-1.5 -right-1.5 bg-[var(--bg-primary)] rounded-full p-1 border border-[var(--border-subtle)] shadow-sm text-[var(--success)]" title="API Integrated">
                                    <ShieldCheck className="w-4 h-4 fill-[var(--success-bg)]" />
                                </div>
                            )}
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                                <h3 className="font-bold text-lg text-[var(--text-primary)] leading-tight group-hover:text-[var(--primary-blue)] transition-colors truncate">
                                    {courier.name}
                                </h3>
                                <StatusBadge
                                    domain="courier"
                                    status={courier.status}
                                    size="sm"
                                    className="px-2.5 py-0.5"
                                />
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="outline" className="font-mono text-[11px] font-medium text-[var(--text-secondary)] bg-[var(--bg-secondary)] border-transparent px-2 py-0.5 uppercase tracking-wide">
                                    {courier.code}
                                </Badge>

                                {courier.zones && courier.zones.length > 0 && (
                                    <div className="flex items-center gap-1 text-xs font-medium text-[var(--text-tertiary)] px-1">
                                        <MapPin className="w-3.5 h-3.5" />
                                        <span>{courier.zones.length} Zones</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-6 pt-0 space-y-6 flex-grow">
                {/* Performance Block: Grouped Metrics */}
                <div className="bg-[var(--bg-secondary)] rounded-xl p-4 border border-[var(--border-subtle)]/50 grid grid-cols-3 gap-4 relative overflow-hidden">
                    {/* Subtle decorative background shine */}
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-[var(--bg-tertiary)] to-transparent opacity-50 -mr-8 -mt-8 rounded-full pointer-events-none" />

                    <div className="flex flex-col gap-1">
                        <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-semibold">
                            <Package className="w-3.5 h-3.5 opacity-70" />
                            Volume
                        </span>
                        <span className="text-lg font-bold text-[var(--text-primary)] tracking-tight">
                            {formatNumber(courier.totalShipments)}
                        </span>
                    </div>

                    <div className="flex flex-col gap-1 border-l border-[var(--border-subtle)] pl-4">
                        <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-semibold">
                            <Timer className="w-3.5 h-3.5 opacity-70" />
                            Speed
                        </span>
                        <span className="text-lg font-bold text-[var(--text-primary)] tracking-tight">
                            {courier.avgDeliveryTime || '-'}
                        </span>
                    </div>

                    <div className="flex flex-col gap-1 border-l border-[var(--border-subtle)] pl-4">
                        <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-semibold">
                            <BarChart3 className="w-3.5 h-3.5 opacity-70" />
                            Success
                        </span>
                        <span className={cn(
                            "text-lg font-bold tracking-tight",
                            getSuccessColor(courier.successRate)
                        )}>
                            {courier.successRate ? `${courier.successRate}%` : '-'}
                        </span>
                    </div>
                </div>

                {/* Secondary Info & Capabilities */}
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1">
                            <span className="text-[11px] text-[var(--text-muted)] font-medium">Max Weight</span>
                            <span className="text-sm font-semibold text-[var(--text-primary)]">
                                {courier.weightLimit ? `${courier.weightLimit} kg` : 'Unlimited'}
                            </span>
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-[11px] text-[var(--text-muted)] font-medium">COD Limit</span>
                            <span className="text-sm font-semibold text-[var(--text-primary)]">
                                ₹{formatCurrency(courier.codLimit)}
                            </span>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {courier.codEnabled && (
                            <Badge variant="neutral" className="gap-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/30 border-blue-200 dark:border-blue-900/50 px-2.5 py-1 transition-colors">
                                <IndianRupee className="w-3.5 h-3.5" /> COD
                            </Badge>
                        )}
                        {courier.trackingEnabled && (
                            <Badge variant="neutral" className="gap-1.5 bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-900/20 dark:text-purple-300 dark:hover:bg-purple-900/30 border-purple-200 dark:border-purple-900/50 px-2.5 py-1 transition-colors">
                                <MapPin className="w-3.5 h-3.5" /> Tracking
                            </Badge>
                        )}
                        {courier.pickupEnabled && (
                            <Badge variant="neutral" className="gap-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-300 dark:hover:bg-emerald-900/30 border-emerald-200 dark:border-emerald-900/50 px-2.5 py-1 transition-colors">
                                <Truck className="w-3.5 h-3.5" /> Pickup
                            </Badge>
                        )}
                        {!courier.codEnabled && !courier.trackingEnabled && !courier.pickupEnabled && (
                            <span className="text-xs text-[var(--text-muted)] italic">No features enabled</span>
                        )}
                    </div>
                </div>
            </CardContent>

            <CardFooter className="p-6 pt-0 mt-auto">
                <Button
                    variant="outline"
                    className="w-full justify-center h-10 text-sm font-medium bg-[var(--bg-primary)] border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--primary-blue)] hover:border-[var(--primary-blue)] hover:bg-[var(--primary-blue-soft)] transition-all duration-200 group-hover:border-[var(--border-strong)]"
                    onClick={() => router.push(`/admin/couriers/${courier.id}`)}
                >
                    <Settings className="w-4 h-4 mr-2" />
                    Configure Partner
                </Button>
            </CardFooter>
        </Card>
    );
}
