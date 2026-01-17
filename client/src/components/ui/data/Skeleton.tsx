import { cn } from '@/src/lib/utils';

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

// Full page loading skeleton (default dashboard layout)
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

// ============================================
// STANDARD PAGE LOADING LAYOUTS
// ============================================

export type PageLoadingLayout =
    | 'dashboard'      // Header + 4 stat cards + table
    | 'table'          // Header + filters + table
    | 'detail'         // Header + detail sections
    | 'form'           // Header + form skeleton
    | 'analytics'      // Header + charts + table
    | 'cards';         // Header + card grid

interface StandardPageLoadingProps {
    layout?: PageLoadingLayout;
    showHeader?: boolean;
    showFilters?: boolean;
    cardCount?: number;
    tableRows?: number;
    className?: string;
}

// Filters skeleton for table pages
function FiltersSkeleton() {
    return (
        <div className="flex items-center gap-4 mb-6">
            <Skeleton className="h-10 w-64 rounded-[--radius-lg]" />
            <Skeleton className="h-10 w-32 rounded-[--radius-lg]" />
            <Skeleton className="h-10 w-32 rounded-[--radius-lg]" />
            <div className="flex-1" />
            <Skeleton className="h-10 w-24 rounded-[--radius-lg]" />
        </div>
    );
}

// Form fields skeleton
function FormSkeleton() {
    return (
        <div className="bg-[--card-background] border border-[--color-gray-200] rounded-[--radius-xl] p-6 space-y-6">
            {/* Form section 1 */}
            <div className="space-y-4">
                <Skeleton className="h-5 w-32 mb-4" />
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-10 w-full rounded-[--radius-lg]" />
                    </div>
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-10 w-full rounded-[--radius-lg]" />
                    </div>
                </div>
            </div>
            {/* Form section 2 */}
            <div className="space-y-4">
                <Skeleton className="h-5 w-40 mb-4" />
                <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-10 w-full rounded-[--radius-lg]" />
                    </div>
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-10 w-full rounded-[--radius-lg]" />
                    </div>
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-18" />
                        <Skeleton className="h-10 w-full rounded-[--radius-lg]" />
                    </div>
                </div>
            </div>
            {/* Form actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-[--color-gray-100]">
                <Skeleton className="h-10 w-24 rounded-[--radius-lg]" />
                <Skeleton className="h-10 w-32 rounded-[--radius-lg]" />
            </div>
        </div>
    );
}

// Detail page skeleton
function DetailSkeleton() {
    return (
        <div className="space-y-6">
            {/* Info cards row */}
            <div className="grid grid-cols-3 gap-4">
                <CardSkeleton />
                <CardSkeleton />
                <CardSkeleton />
            </div>
            {/* Detail sections */}
            <div className="grid grid-cols-2 gap-6">
                <div className="bg-[--card-background] border border-[--color-gray-200] rounded-[--radius-xl] p-6 space-y-4">
                    <Skeleton className="h-6 w-40 mb-4" />
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="flex justify-between">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-4 w-32" />
                        </div>
                    ))}
                </div>
                <div className="bg-[--card-background] border border-[--color-gray-200] rounded-[--radius-xl] p-6 space-y-4">
                    <Skeleton className="h-6 w-36 mb-4" />
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="flex justify-between">
                            <Skeleton className="h-4 w-28" />
                            <Skeleton className="h-4 w-24" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// Analytics page skeleton
function AnalyticsSkeleton() {
    return (
        <div className="space-y-6">
            {/* Stat cards */}
            <div className="grid grid-cols-4 gap-4">
                <CardSkeleton />
                <CardSkeleton />
                <CardSkeleton />
                <CardSkeleton />
            </div>
            {/* Charts */}
            <div className="grid grid-cols-2 gap-6">
                <div className="bg-[--card-background] border border-[--color-gray-200] rounded-[--radius-xl] p-6">
                    <Skeleton className="h-6 w-40 mb-4" />
                    <ChartSkeleton height={250} />
                </div>
                <div className="bg-[--card-background] border border-[--color-gray-200] rounded-[--radius-xl] p-6">
                    <Skeleton className="h-6 w-36 mb-4" />
                    <ChartSkeleton height={250} />
                </div>
            </div>
            {/* Table */}
            <TableSkeleton rows={5} />
        </div>
    );
}

// Cards grid skeleton
function CardsGridSkeleton({ count = 6 }: { count?: number }) {
    return (
        <div className="grid grid-cols-3 gap-6">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="bg-[--card-background] border border-[--color-gray-200] rounded-[--radius-xl] p-6">
                    <div className="flex items-center gap-4 mb-4">
                        <Skeleton className="h-12 w-12 rounded-[--radius-lg]" />
                        <div className="flex-1">
                            <Skeleton className="h-5 w-32 mb-2" />
                            <Skeleton className="h-4 w-24" />
                        </div>
                        <Skeleton className="h-6 w-16 rounded-[--radius-full]" />
                    </div>
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-3/4" />
                </div>
            ))}
        </div>
    );
}

/**
 * StandardPageLoading
 * 
 * Reusable page loading skeleton with different layout presets.
 * Use in loading.tsx files for consistent loading states.
 * 
 * @example
 * // In loading.tsx
 * export default function Loading() {
 *   return <StandardPageLoading layout="table" />;
 * }
 */
export function StandardPageLoading({
    layout = 'dashboard',
    showHeader = true,
    showFilters = false,
    cardCount = 4,
    tableRows = 5,
    className,
}: StandardPageLoadingProps) {
    return (
        <div className={cn('space-y-6 animate-fade-in', className)}>
            {showHeader && <PageHeaderSkeleton />}

            {layout === 'dashboard' && (
                <>
                    <div className={cn('grid gap-4', `grid-cols-${Math.min(cardCount, 4)}`)}>
                        {Array.from({ length: cardCount }).map((_, i) => (
                            <CardSkeleton key={i} />
                        ))}
                    </div>
                    <TableSkeleton rows={tableRows} />
                </>
            )}

            {layout === 'table' && (
                <>
                    {showFilters && <FiltersSkeleton />}
                    <TableSkeleton rows={tableRows} />
                </>
            )}

            {layout === 'detail' && <DetailSkeleton />}

            {layout === 'form' && <FormSkeleton />}

            {layout === 'analytics' && <AnalyticsSkeleton />}

            {layout === 'cards' && <CardsGridSkeleton count={cardCount} />}
        </div>
    );
}
