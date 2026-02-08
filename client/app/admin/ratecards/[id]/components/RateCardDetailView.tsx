"use client";

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/components/ui/core/Card';
import { Button } from '@/src/components/ui/core/Button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/src/components/ui/core/Tabs';
import { Badge } from '@/src/components/ui/core/Badge';
import { PageHeader } from '@/src/components/ui/layout/PageHeader';
import { StatusBadge } from '@/src/components/ui/data/StatusBadge';
import { Loader } from '@/src/components/ui/feedback/Loader';
import { StatsCard } from '@/src/components/ui/dashboard/StatsCard';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/src/components/ui/feedback/Dialog';
import { useToast } from '@/src/components/ui/feedback/Toast';
import {
    ArrowLeft,
    BarChart3,
    Copy,
    Edit2,
    Power,
    PowerOff,
    Truck,
    Clock,
    History,
    Users,
    Package,
    IndianRupee,
    TrendingUp
} from 'lucide-react';
import { useAdminRateCard, useCloneAdminRateCard, useUpdateAdminRateCard } from '@/src/core/api/hooks/admin/useAdminRateCards';
import { useAdminRateCardAnalytics, useAdminRateCardHistory } from '@/src/core/api/hooks/admin/useAdminRateCardAnalytics';
import { useRateCardAssignments } from '@/src/core/api/hooks/admin/useRateCardManagement';
import { formatCurrency, cn } from '@/src/lib/utils';

interface RateCardDetailViewProps {
    rateCardId: string;
    initialTab?: 'details' | 'analytics' | 'history' | 'assignments';
}

export function RateCardDetailView({ rateCardId, initialTab = 'details' }: RateCardDetailViewProps) {
    const router = useRouter();
    const { addToast } = useToast();
    const { data: rateCard, isLoading } = useAdminRateCard(rateCardId);

    // Dialog state
    const [cloneTarget, setCloneTarget] = useState<{ id: string; name: string } | null>(null);

    const usageDateRange = useMemo(() => {
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - 30);
        return { startDate: start, endDate: end };
    }, []);

    const { data: stats } = useAdminRateCardAnalytics({
        rateCardId,
        startDate: usageDateRange.startDate,
        endDate: usageDateRange.endDate
    });
    const defaultAnalytics = {
        totalShipments: 0,
        totalRevenue: 0,
        averageCost: 0,
        zoneDistribution: {},
        topCarriers: [],
        topCustomers: []
    };

    const analytics = stats || defaultAnalytics;

    const { data: historyData } = useAdminRateCardHistory({ rateCardId, page: 1, limit: 20 });
    const { data: assignmentsData } = useRateCardAssignments();
    const { mutate: cloneCard, isPending: isCloning } = useCloneAdminRateCard();
    const { mutate: updateCard, isPending: isUpdating } = useUpdateAdminRateCard();

    const assignments = useMemo(() => {
        const items = assignmentsData?.assignments || [];
        return items.filter((assignment) => assignment.rateCardId === rateCardId && assignment.isActive);
    }, [assignmentsData, rateCardId]);

    const handleClone = () => {
        if (rateCard) {
            setCloneTarget({ id: rateCardId, name: rateCard.name });
        }
    };

    if (isLoading || !rateCard) {
        return <Loader centered size="lg" message="Loading rate card..." />;
    }

    const company = typeof rateCard.companyId === 'string' ? null : rateCard.companyId;
    const zonePricing = rateCard.zonePricing || {};
    const hasZonePricing = Object.keys(zonePricing).length > 0;
    const isActive = rateCard.status === 'active';
    const zonePricingRows = ['A', 'B', 'C', 'D', 'E'].map((zone) => {
        const key = `zone${zone}` as keyof typeof zonePricing;
        const zoneData = (zonePricing as any)?.[key];
        return {
            key: zone,
            baseWeight: zoneData?.baseWeight ?? 0,
            basePrice: zoneData?.basePrice ?? 0,
            additionalPricePerKg: zoneData?.additionalPricePerKg ?? 0
        };
    });

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20 max-w-[1600px] mx-auto">
            {/* Header Section */}
            <PageHeader
                title={
                    <div className="flex items-center gap-3">
                        {rateCard.name}
                        <StatusBadge domain="ratecard" status={rateCard.status} showIcon />
                    </div>
                }
                breadcrumbs={[
                    { label: 'Rate Cards', href: '/admin/ratecards' },
                    { label: rateCard.name, active: true }
                ]}
                subtitle={
                    <>
                        <span className="flex items-center gap-1.5 bg-[var(--bg-secondary)] px-2 py-0.5 rounded-md border border-[var(--border-subtle)]">
                            <Clock className="h-3.5 w-3.5" />
                            Created {new Date(rateCard.createdAt).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1.5 bg-[var(--bg-secondary)] px-2 py-0.5 rounded-md border border-[var(--border-subtle)]">
                            <History className="h-3.5 w-3.5" />
                            Version {rateCard.versionNumber || rateCard.version || '1.0'}
                        </span>
                        <span className="flex items-center gap-1.5 bg-[var(--bg-secondary)] px-2 py-0.5 rounded-md border border-[var(--border-subtle)]">
                            <Users className="h-3.5 w-3.5" />
                            {company ? company.name : 'Global'}
                        </span>
                    </>
                }
                actions={
                    <>
                        <div className="flex items-center gap-2">
                            <Link href={`/admin/ratecards/${rateCardId}/edit`}>
                                <Button variant="outline" className="shadow-sm">
                                    <Edit2 className="h-4 w-4 mr-2" />
                                    Edit
                                </Button>
                            </Link>
                            <Button
                                variant="outline"
                                onClick={handleClone}
                                disabled={isCloning}
                                className="shadow-sm"
                            >
                                <Copy className="h-4 w-4 mr-2" />
                                {isCloning ? 'Cloning...' : 'Clone'}
                            </Button>
                            <Button
                                variant={isActive ? "outline" : "primary"}
                                onClick={() => updateCard({ id: rateCardId, data: { status: isActive ? 'inactive' : 'active' } })}
                                disabled={isUpdating}
                                className={cn(
                                    "shadow-sm",
                                    isActive ? "text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 border-red-200" : "bg-green-600 hover:bg-green-700 text-white"
                                )}
                            >
                                {isActive ? (
                                    <><PowerOff className="h-4 w-4 mr-2" /> Deactivate</>
                                ) : (
                                    <><Power className="h-4 w-4 mr-2" /> Activate</>
                                )}
                            </Button>
                            <Link href={`/admin/ratecards/${rateCardId}/analytics`}>
                                <Button variant="secondary" className="bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)]">
                                    <BarChart3 className="h-4 w-4 mr-2" />
                                    Analytics
                                </Button>
                            </Link>
                        </div>
                    </>
                }
            />

            {/* Main Content Tabs */}
            <Tabs defaultValue={initialTab} className="w-full">
                <div className="border-b border-[var(--border-default)] mb-6">
                    <TabsList className="bg-transparent h-12 p-0 space-x-6">
                        <TabsTrigger
                            value="details"
                            className="h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-[var(--primary-blue)] data-[state=active]:bg-transparent px-0 font-medium"
                        >
                            Configuration
                        </TabsTrigger>
                        <TabsTrigger
                            value="analytics"
                            className="h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-[var(--primary-blue)] data-[state=active]:bg-transparent px-0 font-medium"
                        >
                            Usage Stats
                        </TabsTrigger>
                        <TabsTrigger
                            value="history"
                            className="h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-[var(--primary-blue)] data-[state=active]:bg-transparent px-0 font-medium"
                        >
                            Version History
                        </TabsTrigger>
                        <TabsTrigger
                            value="assignments"
                            className="h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-[var(--primary-blue)] data-[state=active]:bg-transparent px-0 font-medium"
                        >
                            Assignments {assignments.length > 0 && <Badge variant="secondary" className="ml-2 h-5 px-1.5">{assignments.length}</Badge>}
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="details" className="mt-0">
                    <div className="grid gap-6 lg:grid-cols-3">
                        {/* Configuration Column */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Basic Info Card */}
                            <Card>
                                <CardHeader className="pb-3 border-b border-[var(--border-subtle)]">
                                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                                        <Truck className="h-4 w-4 text-[var(--primary-blue)]" />
                                        Service Configuration
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-4 grid grid-cols-2 md:grid-cols-4 gap-6">
                                    <div>
                                        <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1">Pricing Type</p>
                                        <p className="font-semibold text-[var(--text-primary)]">Zone Pricing</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1">Zone B Type</p>
                                        <p className="font-semibold text-[var(--text-primary)] capitalize">
                                            {rateCard.zoneBType === 'distance' ? 'Distance' : 'State'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1">Category</p>
                                        <Badge variant="outline" className="font-medium">{rateCard.rateCardCategory || 'General'}</Badge>
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1">Shipment Type</p>
                                        <p className="font-semibold text-[var(--text-primary)] capitalize">{rateCard.shipmentType || 'Forward'}</p>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Zone Pricing Card */}
                            <Card>
                                <CardHeader className="pb-3 border-b border-[var(--border-subtle)]">
                                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                                        <IndianRupee className="h-4 w-4 text-[var(--primary-blue)]" />
                                        Zone Pricing
                                    </CardTitle>
                                    <div className="flex gap-4 text-sm text-[var(--text-muted)]">
                                        <span>
                                            Zone A Base: <span className="font-mono font-medium text-[var(--text-primary)]">₹{zonePricingRows[0]?.basePrice || 0}</span>
                                        </span>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-4">
                                    {hasZonePricing ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                            {zonePricingRows.map((zone) => (
                                                <div key={zone.key} className="bg-[var(--bg-secondary)] rounded-xl p-4 border border-[var(--border-subtle)] flex flex-col gap-2">
                                                    <div className="flex items-center justify-between">
                                                        <div className="h-8 w-8 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center font-bold text-[var(--text-secondary)]">
                                                            {zone.key}
                                                        </div>
                                                        <div className="text-sm text-[var(--text-muted)]">Base {zone.baseWeight}kg</div>
                                                    </div>
                                                    <div className="text-lg font-bold text-[var(--text-primary)]">
                                                        ₹{zone.basePrice}
                                                    </div>
                                                    <div className="text-xs text-[var(--text-muted)]">
                                                        + ₹{zone.additionalPricePerKg}/kg after base weight
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 text-[var(--text-muted)] bg-[var(--bg-secondary)] rounded-lg border border-dashed border-[var(--border-default)]">
                                            No zone pricing configured
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Additional Charges */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <Card>
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-base font-semibold">Overheads & Taxes</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="flex justify-between items-center py-2 border-b border-[var(--border-subtle)] last:border-0">
                                            <span className="text-sm text-[var(--text-secondary)]">GST</span>
                                            <span className="font-mono font-medium">{rateCard.gst || 18}%</span>
                                        </div>
                                        <div className="flex justify-between items-center py-2 border-b border-[var(--border-subtle)] last:border-0">
                                            <span className="text-sm text-[var(--text-secondary)]">Fuel Surcharge</span>
                                            <span className="font-mono font-medium">{rateCard.fuelSurcharge || 0}%</span>
                                        </div>
                                        <div className="flex justify-between items-center py-2 border-b border-[var(--border-subtle)] last:border-0">
                                            <span className="text-sm text-[var(--text-secondary)]">Minimum Fare</span>
                                            <span className="font-mono font-medium">₹{rateCard.minimumFare || 0}</span>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-base font-semibold">Cash on Delivery</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="flex justify-between items-center py-2 border-b border-[var(--border-subtle)] last:border-0">
                                            <span className="text-sm text-[var(--text-secondary)]">COD Percentage</span>
                                            <span className="font-mono font-medium">{rateCard.codPercentage || 0}%</span>
                                        </div>
                                        <div className="flex justify-between items-center py-2 border-b border-[var(--border-subtle)] last:border-0">
                                            <span className="text-sm text-[var(--text-secondary)]">Minimum Charge</span>
                                            <span className="font-mono font-medium">₹{rateCard.codMinimumCharge || 0}</span>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>

                        {/* Usage & Quick Stats */}
                        <div className="space-y-6">
                            <Card className="bg-[var(--bg-primary)] border-[var(--border-default)]">
                                <CardHeader>
                                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                                        <TrendingUp className="h-4 w-4 text-[var(--primary-blue)]" />
                                        Usage Overview (30d)
                                    </CardTitle>
                                    <CardDescription>Performance metrics based on recent shipments.</CardDescription>
                                </CardHeader>
                                <CardContent className="grid gap-4">
                                    <StatsCard
                                        title="Total Shipments"
                                        value={analytics?.totalShipments || 0}
                                        icon={Package}
                                        iconColor="text-blue-500 bg-blue-50 dark:bg-blue-900/20"
                                        delay={0.1}
                                    />
                                    <StatsCard
                                        title="Revenue Generated"
                                        value={formatCurrency(analytics?.totalRevenue || 0)}
                                        icon={IndianRupee}
                                        iconColor="text-green-500 bg-green-50 dark:bg-green-900/20"
                                        delay={0.2}
                                    />
                                    <StatsCard
                                        title="Avg Cost / Shipment"
                                        value={formatCurrency(analytics?.averageCost || 0)}
                                        icon={BarChart3}
                                        iconColor="text-orange-500 bg-orange-50 dark:bg-orange-900/20"
                                        delay={0.3}
                                    />
                                </CardContent>
                            </Card>

                            {/* Tips / Helper Text */}
                            <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 rounded-lg p-4">
                                <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-2">Did you know?</h4>
                                <p className="text-xs text-blue-600 dark:text-blue-400 leading-relaxed">
                                    You can verify the pricing logic by using the calculator in the Edit wizard. Zone pricing uses a base weight and an additional per-kg rate for each zone.
                                </p>
                            </div>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="analytics" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Detailed Analytics</CardTitle>
                            <CardDescription>Deep dive into performance, revenue, and margins.</CardDescription>
                        </CardHeader>
                        <CardContent className="h-64 flex flex-col items-center justify-center text-center">
                            <BarChart3 className="h-12 w-12 text-[var(--text-muted)] mb-4 opacity-50" />
                            <h3 className="text-lg font-medium text-[var(--text-primary)]">Analytics Dashboard</h3>
                            <p className="text-[var(--text-secondary)] max-w-md mx-auto mb-6">
                                View comprehensive charts and trends for this rate card over time.
                            </p>
                            <Link href={`/admin/ratecards/${rateCardId}/analytics`}>
                                <Button size="lg">
                                    View Full Report
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="history" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Version History</CardTitle>
                            <CardDescription>Track all changes made to this rate card configuration.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="relative border-l border-[var(--border-default)] ml-4 space-y-8 py-2">
                                {historyData?.items?.length ? (
                                    historyData.items.map((log: any, idx: number) => (
                                        <div key={log.id} className="relative pl-6">
                                            <div className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-[var(--bg-primary)] bg-[var(--primary-blue)]" />
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                                                <p className="text-sm font-semibold text-[var(--text-primary)] capitalize">{log.action}</p>
                                                <span className="text-xs text-[var(--text-muted)] font-mono">
                                                    {new Date(log.timestamp).toLocaleString()}
                                                </span>
                                            </div>
                                            <p className="text-sm text-[var(--text-secondary)] bg-[var(--bg-secondary)] p-3 rounded-lg border border-[var(--border-subtle)]">
                                                {log.details?.message || log.details?.changes ? (
                                                    <span>{log.details.message || JSON.stringify(log.details.changes)}</span>
                                                ) : (
                                                    'Configuration updated'
                                                )}
                                            </p>
                                            <div className="flex items-center gap-2 mt-2 text-xs text-[var(--text-muted)]">
                                                <div className="h-5 w-5 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center text-[10px] font-bold">
                                                    {log.user?.name?.[0] || 'U'}
                                                </div>
                                                <span>by {log.user?.name || 'Unknown User'}</span>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="pl-6 py-8">
                                        <p className="text-sm text-[var(--text-muted)] italic">
                                            No explicit version history found. Initial creation might not have been logged.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="assignments" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Company Assignments</CardTitle>
                            <CardDescription>
                                {company
                                    ? `This rate card belongs to ${company.name}. Below are additional assignments.`
                                    : 'Companies explicitly assigned to use this rate card.'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {assignments.length > 0 ? (
                                    assignments.map((assignment: any) => (
                                        <div key={assignment.id} className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] flex flex-col gap-3">
                                            <div className="flex justify-between items-start">
                                                <div className="h-10 w-10 rounded-full bg-[var(--primary-blue)]/10 flex items-center justify-center text-[var(--primary-blue)]">
                                                    <Users className="h-5 w-5" />
                                                </div>
                                                <Badge variant="outline" className={assignment.isActive ? "bg-green-50 text-green-700 border-green-200" : ""}>
                                                    {assignment.isActive ? 'Active' : 'Inactive'}
                                                </Badge>
                                            </div>
                                            <div>
                                                <p className="font-semibold text-[var(--text-primary)]">{assignment.sellerName}</p>
                                                <p className="text-xs text-[var(--text-muted)] mt-0.5">Assigned {new Date(assignment.assignedAt).toLocaleDateString()}</p>
                                            </div>
                                            <div className="pt-3 mt-auto border-t border-[var(--border-subtle)] flex justify-between text-xs">
                                                <span className="text-[var(--text-muted)]">Priority</span>
                                                <span className="font-mono font-medium">{assignment.priority}</span>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="col-span-full py-12 flex flex-col items-center justify-center text-center bg-[var(--bg-secondary)] rounded-xl border border-dashed border-[var(--border-default)]">
                                        <Users className="h-10 w-10 text-[var(--text-muted)] opacity-30 mb-3" />
                                        <p className="text-base font-medium text-[var(--text-primary)]">No external assignments</p>
                                        <p className="text-sm text-[var(--text-secondary)] mt-1 max-w-sm">
                                            This rate card is only available to its owner company
                                            {company ? ` (${company.name})` : ''}.
                                        </p>
                                        <Button variant="outline" size="sm" className="mt-4">
                                            Assign Company
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Clone Confirmation Dialog */}
            <Dialog open={!!cloneTarget} onOpenChange={(open) => !open && setCloneTarget(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Clone rate card</DialogTitle>
                        <DialogDescription>
                            {cloneTarget
                                ? `Create a copy of "${cloneTarget.name}"?`
                                : 'Create a copy of this rate card?'}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCloneTarget(null)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={() => {
                                if (!cloneTarget) return;
                                cloneCard(cloneTarget.id, {
                                    onSuccess: (newCard) => {
                                        addToast(`Successfully cloned "${cloneTarget.name}" as "${newCard.name}"`, 'success');
                                        setCloneTarget(null);
                                        // Optional: Redirect to new card or just stay here
                                        router.push(`/admin/ratecards/${newCard._id}`);
                                    },
                                    onError: (err) => {
                                        addToast(`Failed to clone: ${err.message}`, 'error');
                                    }
                                });
                            }}
                            disabled={isCloning}
                        >
                            {isCloning ? 'Cloning...' : 'Clone'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
