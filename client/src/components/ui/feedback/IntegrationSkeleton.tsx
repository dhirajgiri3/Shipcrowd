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
