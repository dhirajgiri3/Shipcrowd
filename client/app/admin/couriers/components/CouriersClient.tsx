"use client";
export const dynamic = "force-dynamic";

import { Card, CardContent } from '@/src/components/ui/core/Card';
import { Button } from '@/src/components/ui/core/Button';
import { PageHeader } from '@/src/components/ui/layout/PageHeader';
import { SearchInput } from '@/src/components/ui/form/SearchInput';
import { PillTabs } from '@/src/components/ui/core/PillTabs';
import { useToast } from '@/src/components/ui/feedback/Toast';
import {
    Truck,
    RotateCw,
    AlertCircle,
    PackageSearch,
} from 'lucide-react';
import { useCouriersPage } from '@/src/core/api/hooks/admin/couriers/useCouriers';
import { EmptyState } from '@/src/components/ui/feedback/EmptyState';
import { Skeleton } from '@/src/components/ui/data/Skeleton';
import { useRouter } from 'next/navigation';
import { CourierCard } from './CourierCard';

// Skeleton loader for courier cards
function CourierCardSkeleton() {
    return (
        <Card className="border-[var(--border-default)] h-full">
            <CardContent className="p-5 h-full flex flex-col">
                <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-4">
                        <Skeleton className="h-14 w-14 rounded-xl" />
                        <div>
                            <Skeleton className="h-6 w-32 mb-2" />
                            <Skeleton className="h-4 w-20" />
                        </div>
                    </div>
                    <Skeleton className="h-6 w-16 rounded-full" />
                </div>

                <div className="grid grid-cols-3 gap-2 mb-6">
                    <Skeleton className="h-16 rounded-lg" />
                    <Skeleton className="h-16 rounded-lg" />
                    <Skeleton className="h-16 rounded-lg" />
                </div>

                <div className="space-y-4 mb-6">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                </div>

                <Skeleton className="h-10 w-full mt-auto" />
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
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
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
            <div className="space-y-8 animate-in fade-in duration-500 max-w-[1600px] mx-auto p-6">
                {/* Header Skeleton */}
                <div className="flex flex-col gap-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <Skeleton className="h-8 w-64 mb-2" />
                            <Skeleton className="h-4 w-80" />
                        </div>
                        <div className="flex gap-3">
                            <Skeleton className="h-10 w-32" />
                            <Skeleton className="h-10 w-32" />
                            <Skeleton className="h-10 w-32" />
                        </div>
                    </div>
                </div>

                {/* Filters Skeleton */}
                <div className="flex flex-col lg:flex-row gap-4 justify-between items-center bg-[var(--bg-primary)] p-1 rounded-lg">
                    <Skeleton className="h-12 w-full lg:w-96 rounded-lg" />
                    <div className="flex gap-2">
                        <Skeleton className="h-10 w-64 rounded-lg" />
                    </div>
                </div>

                {/* Courier Cards Skeleton */}
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <CourierCardSkeleton key={i} />
                    ))}
                </div>
            </div>
        );
    }

    const STATUS_TABS = [
        { key: 'all', label: 'All Partners' },
        { key: 'active', label: 'Active' },
        { key: 'inactive', label: 'Inactive' },
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-300 max-w-[1600px] mx-auto p-2 sm:p-6 mb-20">
            <PageHeader
                title="Courier Partners"
                description="Manage and configure your integrated shipping partners"
                showBack={true}
                backUrl="/admin"
                breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Couriers', active: true }]}
                actions={
                    <div className="flex flex-wrap gap-3">
                        <Button variant="outline" onClick={() => router.push('/admin/couriers/services')}>
                            <PackageSearch className="h-4 w-4 mr-2" />
                            Services
                        </Button>
                        <Button variant="outline" onClick={() => router.push('/admin/rate-cards')}>
                            Rate Cards
                        </Button>
                        <Button variant="primary" className="shadow-md shadow-blue-500/20" onClick={() => {
                            addToast('Syncing carriers...', 'info');
                            refetch();
                        }}>
                            <RotateCw className="h-4 w-4 mr-2" />
                            Sync Partners
                        </Button>
                    </div>
                }
            />

            {/* Sticky Filters Bar */}
            <div className="sticky top-0 z-20 bg-[var(--bg-primary)]/80 backdrop-blur-md pb-4 pt-2 -mt-2 border-b border-[var(--border-subtle)]/50 lg:border-none lg:static lg:bg-transparent lg:p-0">
                <div className="flex flex-col lg:flex-row gap-4 justify-between items-center bg-[var(--bg-primary)] lg:p-4 lg:rounded-xl lg:border lg:border-[var(--border-subtle)] lg:shadow-sm">
                    <SearchInput
                        placeholder="Search by name, code, or service..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        widthClass="flex-1 w-full lg:w-96 text-lg"
                        className="bg-[var(--bg-secondary)] border-transparent focus:bg-[var(--bg-primary)] focus:border-[var(--primary-blue)] transition-all h-11"
                    />
                    <div className="w-full lg:w-auto overflow-x-auto pb-1 lg:pb-0 scrollbar-hide">
                        <PillTabs
                            tabs={STATUS_TABS}
                            activeTab={selectedStatus}
                            onTabChange={(key) => setSelectedStatus(key as 'all' | 'active' | 'inactive')}
                            className="bg-[var(--bg-secondary)] p-1.5 rounded-lg border border-[var(--border-subtle)]"
                        />
                    </div>
                </div>
            </div>

            {/* Couriers Grid */}
            {filteredCouriers.length === 0 ? (
                <div className="py-12 flex justify-center">
                    <EmptyState
                        icon={<Truck className="w-16 h-16 text-[var(--text-muted)] opacity-50" />}
                        title="No couriers found"
                        description="Try adjusting your search filters or sync partners to update the list."
                        action={{
                            label: "Clear Filters",
                            onClick: () => {
                                setSearchQuery('');
                                setSelectedStatus('all');
                            },
                            variant: 'outline'
                        }}
                    />
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
                    {filteredCouriers.map((courier) => (
                        <CourierCard key={courier.id} courier={courier} />
                    ))}
                </div>
            )}
        </div>
    );
}

