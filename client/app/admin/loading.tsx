import { Loader2 } from 'lucide-react';

/**
 * Loading state for Admin dashboard
 * 
 * Displayed while page is loading (Server Component rendering)
 * Uses skeleton UI pattern for better perceived performance
 */
export default function AdminLoading() {
    return (
        <div className="min-h-screen bg-[var(--bg-secondary)] p-8">
            {/* Header skeleton */}
            <div className="mb-8 flex items-center justify-between">
                <div className="h-8 w-64 bg-[var(--bg-tertiary)] rounded animate-pulse" />
                <div className="h-10 w-32 bg-[var(--bg-tertiary)] rounded animate-pulse" />
            </div>

            {/* Metrics grid skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-40 bg-[var(--bg-primary)] rounded-lg p-6 space-y-4">
                        <div className="h-4 w-24 bg-[var(--bg-tertiary)] rounded animate-pulse" />
                        <div className="h-8 w-32 bg-[var(--bg-tertiary)] rounded animate-pulse" />
                        <div className="h-3 w-16 bg-[var(--bg-tertiary)] rounded animate-pulse" />
                    </div>
                ))}
            </div>

            {/* Chart skeleton */}
            <div className="bg-[var(--bg-primary)] rounded-lg p-6 mb-8">
                <div className="h-6 w-48 bg-[var(--bg-tertiary)] rounded animate-pulse mb-6" />
                <div className="h-96 bg-[var(--bg-tertiary)] rounded animate-pulse" />
            </div>

            {/* Loading spinner */}
            <div className="fixed bottom-8 right-8">
                <div className="bg-[var(--bg-primary)] rounded-full p-4 shadow-lg">
                    <Loader2 className="h-6 w-6 text-[var(--primary-blue)] animate-spin" />
                </div>
            </div>
        </div>
    );
}
