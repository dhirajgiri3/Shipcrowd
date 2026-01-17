/**
 * Loading state for Seller Orders Page
 * Uses centralized Skeleton components for consistent loading UX
 */

import { Skeleton, PageHeaderSkeleton, CardSkeleton, TableSkeleton } from '@/src/components/ui';

export default function OrdersLoading() {
    return (
        <div className="space-y-8">
            {/* Header Skeleton */}
            <PageHeaderSkeleton />

            {/* Metrics Cards Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <CardSkeleton />
                <CardSkeleton />
                <CardSkeleton />
            </div>

            {/* Filters Skeleton */}
            <div className="flex flex-col sm:flex-row justify-between gap-4">
                <Skeleton className="h-11 w-full sm:w-96" />
                <div className="flex items-center gap-3">
                    <Skeleton className="h-11 w-72" />
                    <Skeleton className="h-11 w-40" />
                </div>
            </div>

            {/* Table Skeleton */}
            <TableSkeleton rows={8} />
        </div>
    );
}
