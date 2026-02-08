"use client";

import { useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/components/ui/core/Card';
import { Button } from '@/src/components/ui/core/Button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/src/components/ui/core/Tabs';
import { StatusBadge } from '@/src/components/ui/data/StatusBadge';
import { Loader } from '@/src/components/ui/feedback/Loader';
import {
    ArrowLeft,
    BarChart3,
    Copy,
    Edit2,
    PowerOff,
    Truck
} from 'lucide-react';
import { useAdminRateCard, useCloneAdminRateCard, useUpdateAdminRateCard } from '@/src/core/api/hooks/admin/useAdminRateCards';
import { useAdminRateCardAnalytics, useAdminRateCardHistory } from '@/src/core/api/hooks/admin/useAdminRateCardAnalytics';
import { useRateCardAssignments } from '@/src/core/api/hooks/admin/useRateCardManagement';
import { formatCurrency } from '@/src/lib/utils';

interface RateCardDetailViewProps {
    rateCardId: string;
    initialTab?: 'details' | 'analytics' | 'history' | 'assignments';
}

export function RateCardDetailView({ rateCardId, initialTab = 'details' }: RateCardDetailViewProps) {
    const router = useRouter();
    const { data: rateCard, isLoading } = useAdminRateCard(rateCardId);
    const { data: analytics } = useAdminRateCardAnalytics({ rateCardId });
    const { data: historyData } = useAdminRateCardHistory({ rateCardId, page: 1, limit: 20 });
    const { data: assignmentsData } = useRateCardAssignments();
    const { mutate: cloneCard } = useCloneAdminRateCard();
    const { mutate: updateCard } = useUpdateAdminRateCard();

    const assignments = useMemo(() => {
        const items = (assignmentsData as any)?.assignments || [];
        return items.filter((assignment: any) => assignment.rateCardId === rateCardId && assignment.isActive);
    }, [assignmentsData, rateCardId]);

    if (isLoading || !rateCard) {
        return <Loader centered size="lg" message="Loading rate card..." />;
    }

    const baseRates = rateCard.baseRates || [];

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" onClick={() => router.back()}>
                        <ArrowLeft className="h-4 w-4 mr-2" /> Back
                    </Button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                                <Truck className="h-6 w-6 text-[var(--primary-blue)]" />
                                {rateCard.name}
                            </h2>
                            <StatusBadge domain="ratecard" status={rateCard.status} showIcon />
                        </div>
                        <p className="text-[var(--text-muted)] text-sm mt-1">
                            Created: {new Date(rateCard.createdAt).toLocaleDateString()} • Version {rateCard.versionNumber || rateCard.version || '—'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Link href={`/admin/ratecards/${rateCardId}/edit`}>
                        <Button variant="outline">
                            <Edit2 className="h-4 w-4 mr-2" /> Edit
                        </Button>
                    </Link>
                    <Button
                        variant="outline"
                        onClick={() => cloneCard(rateCardId)}
                    >
                        <Copy className="h-4 w-4 mr-2" /> Clone
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => updateCard({ id: rateCardId, data: { status: 'inactive' } })}
                    >
                        <PowerOff className="h-4 w-4 mr-2" /> Deactivate
                    </Button>
                    <Link href={`/admin/ratecards/${rateCardId}/analytics`}>
                        <Button>
                            <BarChart3 className="h-4 w-4 mr-2" /> Analytics
                        </Button>
                    </Link>
                </div>
            </div>

            <Tabs defaultValue={initialTab} className="w-full">
                <TabsList>
                    <TabsTrigger value="details">Details</TabsTrigger>
                    <TabsTrigger value="analytics">Analytics</TabsTrigger>
                    <TabsTrigger value="history">Version History</TabsTrigger>
                    <TabsTrigger value="assignments">Assignments</TabsTrigger>
                </TabsList>

                <TabsContent value="details">
                    <div className="grid gap-6 lg:grid-cols-3">
                        <Card className="lg:col-span-2">
                            <CardHeader>
                                <CardTitle>Rate Card Details</CardTitle>
                                <CardDescription>Overview of configuration and base rates.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs text-[var(--text-muted)]">Courier</p>
                                        <p className="text-sm font-medium text-[var(--text-primary)]">{baseRates?.[0]?.carrier || '—'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-[var(--text-muted)]">Service</p>
                                        <p className="text-sm font-medium text-[var(--text-primary)]">{baseRates?.[0]?.serviceType || '—'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-[var(--text-muted)]">Category</p>
                                        <p className="text-sm font-medium text-[var(--text-primary)]">{rateCard.rateCardCategory || '—'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-[var(--text-muted)]">Shipment Type</p>
                                        <p className="text-sm font-medium text-[var(--text-primary)]">{rateCard.shipmentType || '—'}</p>
                                    </div>
                                </div>

                                <div>
                                    <p className="text-xs text-[var(--text-muted)] mb-2">Base Rates (First Slab)</p>
                                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                                        {['A', 'B', 'C', 'D', 'E'].map((zone) => (
                                            <div key={zone} className="bg-[var(--bg-secondary)] rounded-lg p-3 text-center">
                                                <p className="text-xs text-[var(--text-muted)]">Zone {zone}</p>
                                                <p className="text-sm font-semibold">₹{rateCard.zoneMultipliers?.[`zone${zone}`]
                                                    ? Math.round((baseRates?.[0]?.basePrice || 0) * rateCard.zoneMultipliers[`zone${zone}`])
                                                    : '—'}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs text-[var(--text-muted)]">COD</p>
                                        <p className="text-sm font-medium text-[var(--text-primary)]">{rateCard.codPercentage || 0}% (min ₹{rateCard.codMinimumCharge || 0})</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-[var(--text-muted)]">Minimum Fare</p>
                                        <p className="text-sm font-medium text-[var(--text-primary)]">₹{rateCard.minimumFare || rateCard.minimumCall || 0}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Usage (30d)</CardTitle>
                                <CardDescription>Recent activity overview.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div>
                                    <p className="text-xs text-[var(--text-muted)]">Total Shipments</p>
                                    <p className="text-xl font-bold text-[var(--text-primary)]">{analytics?.totalShipments || 0}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-[var(--text-muted)]">Revenue</p>
                                    <p className="text-xl font-bold text-[var(--text-primary)]">{formatCurrency(analytics?.totalRevenue || 0)}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-[var(--text-muted)]">Avg Cost</p>
                                    <p className="text-xl font-bold text-[var(--text-primary)]">{formatCurrency(analytics?.averageCost || 0)}</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="analytics">
                    <Card>
                        <CardHeader>
                            <CardTitle>Analytics</CardTitle>
                            <CardDescription>Open detailed analytics view.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Link href={`/admin/ratecards/${rateCardId}/analytics`}>
                                <Button>
                                    <BarChart3 className="h-4 w-4 mr-2" /> View Analytics Dashboard
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="history">
                    <Card>
                        <CardHeader>
                            <CardTitle>Version History</CardTitle>
                            <CardDescription>Recent changes to this rate card.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {historyData?.items?.length ? (
                                    historyData.items.map((log: any) => (
                                        <div key={log.id} className="p-3 rounded-lg bg-[var(--bg-secondary)]">
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm font-medium text-[var(--text-primary)]">{log.action}</p>
                                                <p className="text-xs text-[var(--text-muted)]">{new Date(log.timestamp).toLocaleString()}</p>
                                            </div>
                                            <p className="text-xs text-[var(--text-secondary)]">{log.details?.message || 'Change recorded'}</p>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-[var(--text-muted)]">No history available.</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="assignments">
                    <Card>
                        <CardHeader>
                            <CardTitle>Assignments</CardTitle>
                            <CardDescription>Companies currently assigned to this rate card.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {assignments.length ? (
                                    assignments.map((assignment: any) => (
                                        <div key={assignment.id} className="p-3 rounded-lg bg-[var(--bg-secondary)] flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-[var(--text-primary)]">{assignment.sellerName}</p>
                                                <p className="text-xs text-[var(--text-muted)]">Priority {assignment.priority}</p>
                                            </div>
                                            <p className="text-xs text-[var(--text-muted)]">Assigned {new Date(assignment.assignedAt).toLocaleDateString()}</p>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-[var(--text-muted)]">No active assignments.</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
