/**
 * Loading state for Admin Dashboard
 * Uses centralized Skeleton and Loader components for consistent loading UX
 */

import { Skeleton, PageHeaderSkeleton, CardSkeleton, ChartSkeleton, Loader } from '@/components/ui';

export default function AdminLoading() {
    return (
        <div className="space-y-8 p-8">
            {/* Header Skeleton */}
            <PageHeaderSkeleton />

            {/* Metrics Grid Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <CardSkeleton />
                <CardSkeleton />
                <CardSkeleton />
                <CardSkeleton />
            </div>

            {/* Chart Skeleton */}
            <div className="bg-[var(--bg-primary)] rounded-lg p-6 border border-[var(--border-subtle)]">
                <Skeleton className="h-6 w-48 mb-6" />
                <ChartSkeleton height={384} />
            </div>

            {/* Loading Indicator */}
            <div className="fixed bottom-8 right-8">
                <div className="bg-[var(--bg-primary)] rounded-full p-4 shadow-lg">
                    <Loader variant="spinner" size="md" />
                </div>
            </div>
        </div>
    );
}
