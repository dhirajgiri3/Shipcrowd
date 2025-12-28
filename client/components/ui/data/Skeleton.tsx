import { cn } from '@/lib/utils';

/**
 * Skeleton Loading Components
 * 
 * Use for loading states to prevent layout shift (CLS).
 * Uses design system tokens for consistent styling.
 * Improved with shimmer animation from globals.css.
 */

interface SkeletonProps {
    className?: string;
    /** Use shimmer animation instead of pulse */
    shimmer?: boolean;
    /** Delay animation start (useful for stagger effects) */
    delay?: number;
}

// Base skeleton with shimmer/pulse animation
export function Skeleton({ className, shimmer = true, delay = 0 }: SkeletonProps) {
    return (
        <div
            className={cn(
                'rounded-[var(--radius-lg)]',
                shimmer ? 'skeleton' : 'animate-pulse bg-[var(--bg-tertiary)]',
                className
            )}
            style={delay > 0 ? { animationDelay: `${delay}ms` } : undefined}
        />
    );
}

// Skeleton for metric/stat cards
export function CardSkeleton() {
    return (
        <div className="bg-[--card-background] border border-[--color-gray-200] rounded-[--radius-xl] p-5">
            <div className="flex items-center justify-between mb-4">
                <Skeleton className="h-10 w-10 rounded-[--radius-lg]" />
                <Skeleton className="h-6 w-16 rounded-[--radius-full]" />
            </div>
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-8 w-32" />
        </div>
    );
}

// Skeleton for data tables
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
    return (
        <div className="bg-[--card-background] border border-[--color-gray-200] rounded-[--radius-xl] overflow-hidden">
            {/* Header */}
            <div className="bg-[--color-gray-50] border-b border-[--color-gray-100] p-4">
                <div className="flex gap-4">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-28" />
                </div>
            </div>
            {/* Rows */}
            <div className="divide-y divide-[--color-gray-100]">
                {Array.from({ length: rows }).map((_, i) => (
                    <div key={i} className="p-4 flex gap-4 items-center">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-6 w-16 rounded-[--radius-full]" />
                    </div>
                ))}
            </div>
        </div>
    );
}

// Skeleton for charts
export function ChartSkeleton({ height = 200 }: { height?: number }) {
    return (
        <div
            className="animate-pulse bg-[--color-gray-100] rounded-[--radius-lg] flex items-end justify-around p-4 gap-2"
            style={{ height }}
        >
            {/* Fake bar chart */}
            {[40, 65, 45, 80, 55, 70, 50].map((h, i) => (
                <div
                    key={i}
                    className="bg-[--color-gray-200] rounded-t w-8"
                    style={{ height: `${h}%` }}
                />
            ))}
        </div>
    );
}

// Skeleton for sidebar navigation
export function NavSkeleton() {
    return (
        <div className="space-y-2 p-4">
            {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-2">
                    <Skeleton className="h-5 w-5 rounded-[--radius-md]" />
                    <Skeleton className="h-4 w-24" />
                </div>
            ))}
        </div>
    );
}

// Skeleton for page header
export function PageHeaderSkeleton() {
    return (
        <div className="flex items-center justify-between mb-6">
            <div>
                <Skeleton className="h-8 w-48 mb-2" />
                <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="h-10 w-32 rounded-[--radius-lg]" />
        </div>
    );
}

// Full page loading skeleton
export function PageSkeleton() {
    return (
        <div className="space-y-6 animate-fade-in">
            <PageHeaderSkeleton />
            <div className="grid gap-4 grid-cols-4">
                <CardSkeleton />
                <CardSkeleton />
                <CardSkeleton />
                <CardSkeleton />
            </div>
            <TableSkeleton />
        </div>
    );
}
