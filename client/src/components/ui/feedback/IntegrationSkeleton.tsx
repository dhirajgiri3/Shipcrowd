/**
 * Integration Skeleton Loader
 * 
 * Skeleton loading state for integration setup modals
 */

import React from 'react';
import { Skeleton } from '../data/Skeleton';

export interface IntegrationSkeletonProps {
    type?: 'shopify' | 'woocommerce' | 'amazon' | 'flipkart';
}

export const IntegrationSkeleton: React.FC<IntegrationSkeletonProps> = ({ type = 'shopify' }) => {
    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header Skeleton */}
            <div className="flex items-center gap-6 pb-6 border-b border-[var(--border-subtle)]">
                <Skeleton className="w-20 h-20 rounded-2xl" />
                <div className="flex-1 space-y-2">
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="h-4 w-48" />
                </div>
            </div>

            {/* Info Box Skeleton */}
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-4">
                <Skeleton className="h-4 w-32 mb-3" />
                <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                </div>
            </div>

            {/* Form Fields Skeleton */}
            <div className="space-y-4">
                <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full rounded-lg" />
                    <Skeleton className="h-3 w-48" />
                </div>

                {type === 'woocommerce' && (
                    <>
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-28" />
                            <Skeleton className="h-10 w-full rounded-lg" />
                        </div>
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-10 w-full rounded-lg" />
                        </div>
                    </>
                )}
            </div>

            {/* Alert Skeleton */}
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-4">
                <Skeleton className="h-4 w-full" />
            </div>

            {/* Button Skeleton */}
            <Skeleton className="h-10 w-full rounded-lg" />
        </div>
    );
};

/**
 * Connection Status Skeleton
 */
export const ConnectionStatusSkeleton: React.FC = () => {
    return (
        <div className="space-y-4 animate-in fade-in duration-300">
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-4">
                <div className="flex items-center gap-3">
                    <Skeleton className="w-4 h-4 rounded-full" />
                    <Skeleton className="h-4 flex-1" />
                    <Skeleton className="h-5 w-20 rounded-full" />
                </div>
            </div>

            <div className="space-y-3">
                <Skeleton className="h-4 w-32" />
                <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full rounded-lg" />
                </div>
            </div>
        </div>
    );
};

/**
 * Store Detail Page Skeleton
 * Compact skeleton for integration store detail pages (header + stats + activity)
 */
export const IntegrationStoreSkeleton: React.FC = () => {
    return (
        <div className="space-y-8 animate-in fade-in duration-300 max-w-7xl mx-auto p-4 sm:p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-[var(--border-subtle)]">
                <div className="flex items-start gap-5">
                    <Skeleton className="w-20 h-20 rounded-2xl shrink-0" />
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-8 w-48" />
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                    </div>
                </div>
                <div className="flex gap-3">
                    <Skeleton className="h-11 w-24 rounded-lg" />
                    <Skeleton className="h-11 w-28 rounded-lg" />
                </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-36 rounded-xl" />
                ))}
            </div>
            <div className="rounded-xl border border-[var(--border-subtle)] overflow-hidden">
                <div className="p-5 border-b border-[var(--border-subtle)] flex justify-between">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-8 w-32 rounded-lg" />
                </div>
                <div className="p-6 space-y-4">
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-16 w-full rounded-lg" />
                    ))}
                </div>
            </div>
        </div>
    );
};

/**
 * Settings Section Skeleton
 */
export const SettingsSkeleton: React.FC = () => {
    return (
        <div className="space-y-4 animate-in fade-in duration-300">
            <Skeleton className="h-4 w-40" />

            <div className="space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-10 w-full rounded-lg" />
            </div>

            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-4">
                <div className="flex items-center justify-between">
                    <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="h-3 w-56" />
                    </div>
                    <Skeleton className="w-11 h-6 rounded-full" />
                </div>
            </div>

            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-4">
                <div className="flex items-center justify-between">
                    <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-36" />
                        <Skeleton className="h-3 w-48" />
                    </div>
                    <Skeleton className="w-11 h-6 rounded-full" />
                </div>
            </div>
        </div>
    );
};
