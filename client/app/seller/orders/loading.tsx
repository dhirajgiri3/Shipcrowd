/**
 * Loading state for Seller Orders Page
 * Shows skeleton UI while data is being fetched
 */

export default function OrdersLoading() {
    return (
        <div className="min-h-screen space-y-8 pb-20">
            {/* Header Skeleton */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="h-9 w-32 bg-[var(--bg-secondary)] rounded-lg animate-pulse" />
                    <div className="h-4 w-64 bg-[var(--bg-secondary)] rounded mt-2 animate-pulse" />
                </div>
                <div className="flex items-center gap-3">
                    <div className="h-10 w-40 bg-[var(--bg-secondary)] rounded-xl animate-pulse" />
                    <div className="h-10 w-10 bg-[var(--bg-secondary)] rounded-xl animate-pulse" />
                    <div className="h-10 w-32 bg-[var(--bg-secondary)] rounded-xl animate-pulse" />
                </div>
            </div>

            {/* Metrics Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="p-6 rounded-[var(--radius-xl)] bg-[var(--bg-primary)] border border-[var(--border-subtle)] animate-pulse">
                        <div className="h-4 w-24 bg-[var(--bg-secondary)] rounded mb-4" />
                        <div className="h-8 w-32 bg-[var(--bg-secondary)] rounded mb-4" />
                        <div className="h-12 w-full bg-[var(--bg-secondary)] rounded" />
                    </div>
                ))}
            </div>

            {/* Table Skeleton */}
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between gap-4">
                    <div className="h-11 w-96 bg-[var(--bg-secondary)] rounded-xl animate-pulse" />
                    <div className="flex items-center gap-3">
                        <div className="h-11 w-72 bg-[var(--bg-secondary)] rounded-xl animate-pulse" />
                        <div className="h-11 w-40 bg-[var(--bg-secondary)] rounded-xl animate-pulse" />
                    </div>
                </div>

                <div className="bg-[var(--bg-primary)] rounded-[var(--radius-xl)] border border-[var(--border-subtle)] p-6">
                    <div className="space-y-4">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className="flex items-center gap-6 py-2">
                                <div className="h-6 bg-[var(--bg-secondary)] rounded-md w-24 animate-pulse" />
                                <div className="h-6 bg-[var(--bg-secondary)] rounded-md w-32 animate-pulse" />
                                <div className="h-6 bg-[var(--bg-secondary)] rounded-md w-48 flex-1 animate-pulse" />
                                <div className="h-6 bg-[var(--bg-secondary)] rounded-md w-24 animate-pulse" />
                                <div className="h-6 bg-[var(--bg-secondary)] rounded-md w-20 animate-pulse" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
