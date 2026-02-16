"use client";
export const dynamic = "force-dynamic";

import { Card, CardContent } from '@/src/components/ui/core/Card';
import { Button } from '@/src/components/ui/core/Button';
import { PageHeader } from '@/src/components/ui/layout/PageHeader';
import { SearchInput } from '@/src/components/ui/form/SearchInput';
import { PillTabs } from '@/src/components/ui/core/PillTabs';
import { Badge } from '@/src/components/ui/core/Badge';
import { StatusBadge } from '@/src/components/ui/data/StatusBadge';
import { useToast } from '@/src/components/ui/feedback/Toast';
import {
    Truck,
    RotateCw,
    AlertCircle,
} from 'lucide-react';
import { useCouriersPage } from '@/src/core/api/hooks/admin/couriers/useCouriers';
import { Loader } from '@/src/components/ui/feedback/Loader';
import { EmptyState } from '@/src/components/ui/feedback/EmptyState';
import { Skeleton } from '@/src/components/ui/data/Skeleton';
import { cn } from '@/src/lib/utils';
import { getCourierLogoPath } from '@/src/lib/courier-logos';
import { useRouter } from 'next/navigation';

// Skeleton loader for courier cards
function CourierCardSkeleton() {
    return (
        <Card className="border-[var(--border-default)]">
            <CardContent className="p-5">
                <div className="space-y-4">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                            <Skeleton className="h-12 w-12 rounded-lg" />
                            <div>
                                <Skeleton className="h-5 w-32 mb-2" />
                                <Skeleton className="h-3 w-16" />
                            </div>
                        </div>
                        <Skeleton className="h-6 w-16 rounded-full" />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-[var(--bg-secondary)] p-3 rounded-lg border border-[var(--border-subtle)]">
                            <Skeleton className="h-3 w-16 mb-2" />
                            <Skeleton className="h-4 w-20" />
                        </div>
                        <div className="bg-[var(--bg-secondary)] p-3 rounded-lg border border-[var(--border-subtle)]">
                            <Skeleton className="h-3 w-16 mb-2" />
                            <div className="space-y-1.5">
                                <Skeleton className="h-3 w-12" />
                                <Skeleton className="h-3 w-16" />
                            </div>
                        </div>
                    </div>

                    <div className="pt-3 border-t border-[var(--border-subtle)] grid grid-cols-2 gap-4">
                        <div>
                            <Skeleton className="h-3 w-20 mb-1" />
                            <Skeleton className="h-4 w-16" />
                        </div>
                        <div>
                            <Skeleton className="h-3 w-20 mb-1" />
                            <Skeleton className="h-4 w-20" />
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

export function CouriersClient() {
    const { addToast } = useToast();
    const router = useRouter();

    const {
        searchQuery,
        setSearchQuery,
        selectedStatus,
        setSelectedStatus,
        filteredCouriers,
        isLoading,
        isError,
        error,
        refetch
    } = useCouriersPage();

    // Handle error
    if (isError) {
        // We can check if error has a 'message' property or custom structure
        // Assuming ApiError structure or generic Error
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';

        return (
            <div className="flex flex-col items-center justify-center h-96 text-center">
                <EmptyState
                    icon={<AlertCircle className="w-12 h-12" />}
                    title="Failed to load carriers"
                    description={errorMessage}
                    action={{
                        label: 'Retry connection',
                        onClick: () => refetch(),
                        variant: 'outline'
                    }}
                />
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="space-y-6 animate-in fade-in duration-500">
                {/* Header Skeleton */}
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <Skeleton className="h-8 w-64 mb-2" />
                            <Skeleton className="h-4 w-80" />
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Skeleton className="h-10 w-48" />
                            <Skeleton className="h-10 w-40" />
                            <Skeleton className="h-10 w-32" />
                        </div>
                    </div>
                </div>

                {/* Filters Skeleton */}
                <Card>
                    <CardContent className="p-4">
                        <div className="flex flex-col lg:flex-row gap-4 justify-between items-center">
                            <Skeleton className="h-10 w-full lg:w-80" />
                            <div className="flex gap-2">
                                <Skeleton className="h-10 w-20" />
                                <Skeleton className="h-10 w-20" />
                                <Skeleton className="h-10 w-24" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Courier Cards Skeleton */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <CourierCardSkeleton key={i} />
                    ))}
                </div>
            </div>
        );
    }

    const STATUS_TABS = [
        { key: 'all', label: 'All' },
        { key: 'active', label: 'Active' },
        { key: 'inactive', label: 'Inactive' },
    ];

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <PageHeader
                title="Courier Partners"
                description="Manage your shipping partners and configurations"
                showBack={true}
                backUrl="/admin"
                breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Couriers', active: true }]}
                actions={
                    <>
                        <Button variant="outline" onClick={() => router.push('/admin/couriers/services')}>
                            Manage Courier Services
                        </Button>
                        <Button variant="outline" onClick={() => router.push('/admin/rate-cards')}>
                            Manage Rate Cards
                        </Button>
                        <Button variant="outline" onClick={() => {
                            addToast('Syncing carriers...', 'info');
                            refetch();
                        }}>
                            <RotateCw className="h-4 w-4 mr-2" />
                            Sync Partners
                        </Button>
                    </>
                }
            />

            {/* Filters */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex flex-col lg:flex-row gap-4 justify-between items-center">
                        <SearchInput
                            placeholder="Search couriers..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            widthClass="flex-1 w-full lg:w-auto"
                        />
                        <PillTabs
                            tabs={STATUS_TABS}
                            activeTab={selectedStatus}
                            onTabChange={(key) => setSelectedStatus(key as 'all' | 'active' | 'inactive')}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Couriers Grid */}
            {filteredCouriers.length === 0 ? (
                <EmptyState
                    icon={<Truck className="w-12 h-12" />}
                    title="No couriers found"
                    description="Try adjusting your search criteria"
                />
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredCouriers.map((courier) => {
                        const logoPath = getCourierLogoPath(courier.code, courier.name);
                        return (
                        <Card
                            key={courier.id}
                            className="transition-all group cursor-pointer border-[var(--border-default)] hover:border-[var(--border-strong)]"
                            onClick={() => router.push(`/admin/couriers/${courier.id}`)}
                        >
                            <CardContent className="p-5">
                                <div className="space-y-4">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="h-12 w-12 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center font-bold text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                                                {logoPath ? (
                                                    <img src={logoPath} alt={courier.name} className="h-8 w-8 object-contain" />
                                                ) : (
                                                    courier.name.slice(0, 2).toUpperCase()
                                                )}
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-[var(--text-primary)] group-hover:text-[var(--primary-blue)] transition-colors">{courier.name}</h3>
                                                <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">{courier.code}</p>
                                            </div>
                                        </div>
                                        <StatusBadge
                                            domain="courier"
                                            status={courier.status}
                                            size="sm"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                        <div className="bg-[var(--bg-secondary)] p-3 rounded-lg border border-[var(--border-subtle)]">
                                            <p className="text-xs text-[var(--text-muted)] mb-1 uppercase font-semibold">Services</p>
                                            <div className="flex flex-wrap gap-1">
                                                {courier.services.map((s, idx) => (
                                                    <Badge key={idx} variant="outline" className="text-[10px] px-1.5 py-0.5 h-auto font-normal bg-[var(--bg-primary)]">{s}</Badge>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="bg-[var(--bg-secondary)] p-3 rounded-lg border border-[var(--border-subtle)]">
                                            <p className="text-xs text-[var(--text-muted)] mb-1 uppercase font-semibold">Features</p>
                                            <div className="flex flex-col gap-1.5 text-xs mt-1">
                                                <span className={cn("flex items-center gap-1.5", courier.codEnabled ? "text-[var(--success)]" : "text-[var(--text-muted)]")}>
                                                    <div className={cn("h-1.5 w-1.5 rounded-full", courier.codEnabled ? "bg-[var(--success)]" : "bg-[var(--text-muted)]")} />
                                                    COD
                                                </span>
                                                <span className={cn("flex items-center gap-1.5", courier.trackingEnabled ? "text-[var(--info)]" : "text-[var(--text-muted)]")}>
                                                    <div className={cn("h-1.5 w-1.5 rounded-full", courier.trackingEnabled ? "bg-[var(--info)]" : "bg-[var(--text-muted)]")} />
                                                    Tracking
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-3 border-t border-[var(--border-subtle)] grid grid-cols-2 gap-4 text-xs">
                                        <div>
                                            <p className="text-[var(--text-muted)] mb-0.5">Max Weight</p>
                                            <p className="font-medium text-[var(--text-primary)]">{courier.weightLimit || '-'} kg</p>
                                        </div>
                                        <div>
                                            <p className="text-[var(--text-muted)] mb-0.5">COD Limit</p>
                                            <p className="font-medium text-[var(--text-primary)]">₹{courier.codLimit ? courier.codLimit.toLocaleString() : '-'}</p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
