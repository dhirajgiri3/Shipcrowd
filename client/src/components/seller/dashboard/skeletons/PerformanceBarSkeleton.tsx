/**
 * PerformanceBar Skeleton Loading Component
 *
 * Matches the layout of PerformanceBar for fast loading states.
 * Uses responsive design to match mobile and desktop layouts.
 */

'use client';

import { Skeleton } from '@/src/components/ui/data/Skeleton';
import { useIsMobile } from '@/src/hooks/ux';
import { motion } from 'framer-motion';

export function PerformanceBarSkeleton() {
  const isMobile = useIsMobile();

  // Mobile Layout
  if (isMobile) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-3"
      >
        {/* Data Freshness Indicator */}
        <div className="flex justify-end">
          <Skeleton className="h-3 w-20" delay={0} />
        </div>

        {/* Revenue & Profit Cards */}
        <div className="grid grid-cols-2 gap-3">
          {/* Revenue Skeleton */}
          <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] space-y-2">
            <Skeleton className="h-3 w-16" delay={100} />
            <Skeleton className="h-6 w-20" delay={100} />
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-12" delay={100} />
              <Skeleton className="h-3 w-8" delay={100} />
            </div>
          </div>

          {/* Profit Skeleton */}
          <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] space-y-2">
            <Skeleton className="h-3 w-16" delay={150} />
            <Skeleton className="h-6 w-20" delay={150} />
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-12" delay={150} />
              <Skeleton className="h-3 w-8" delay={150} />
            </div>
          </div>
        </div>

        {/* Orders & Wallet Cards */}
        <div className="grid grid-cols-2 gap-3">
          {/* Orders Skeleton */}
          <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] space-y-2">
            <Skeleton className="h-3 w-16" delay={200} />
            <Skeleton className="h-6 w-20" delay={200} />
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-12" delay={200} />
              <Skeleton className="h-3 w-8" delay={200} />
            </div>
          </div>

          {/* Wallet Skeleton */}
          <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] space-y-2">
            <Skeleton className="h-3 w-16" delay={250} />
            <Skeleton className="h-6 w-20" delay={250} />
            <Skeleton className="h-4 w-12" delay={250} />
          </div>
        </div>

        {/* Streak Skeleton */}
        <div className="p-4 rounded-xl bg-[var(--warning-bg)]/20 border border-[var(--warning)]/30 space-y-2">
          <Skeleton className="h-3 w-24" delay={300} />
          <Skeleton className="h-6 w-16" delay={300} />
        </div>
      </motion.div>
    );
  }

  // Desktop Layout
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl p-8 shadow-md bg-[var(--bg-primary)] border border-[var(--border-subtle)]"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-4 w-48" delay={0} />
        <Skeleton className="h-3 w-24" delay={0} />
      </div>

      <div className="flex items-start justify-between gap-8">
        {/* Left: KPI Skeletons */}
        <div className="flex items-start gap-10 flex-1">
          {/* Revenue */}
          <div className="flex-1">
            <Skeleton className="h-4 w-20 mb-3" delay={100} />
            <Skeleton className="h-10 w-32 mb-4" delay={100} />
            <div className="flex items-center gap-3">
              <Skeleton className="h-6 w-20" delay={100} />
              <Skeleton className="h-4 w-24" delay={100} />
            </div>
          </div>

          {/* Divider */}
          <div className="h-20 w-px bg-[var(--border-default)]" />

          {/* Profit */}
          <div className="flex-1">
            <Skeleton className="h-4 w-20 mb-3" delay={150} />
            <Skeleton className="h-10 w-32 mb-4" delay={150} />
            <div className="flex items-center gap-3">
              <Skeleton className="h-6 w-20" delay={150} />
              <Skeleton className="h-4 w-24" delay={150} />
            </div>
          </div>

          {/* Divider */}
          <div className="h-20 w-px bg-[var(--border-default)]" />

          {/* Orders */}
          <div className="flex-1">
            <Skeleton className="h-4 w-20 mb-3" delay={200} />
            <Skeleton className="h-10 w-32 mb-4" delay={200} />
            <div className="flex items-center gap-3">
              <Skeleton className="h-6 w-20" delay={200} />
              <Skeleton className="h-4 w-24" delay={200} />
            </div>
          </div>

          {/* Divider + Streak */}
          <div className="h-20 w-px bg-[var(--border-default)]" />
          <div>
            <Skeleton className="h-4 w-20 mb-3" delay={250} />
            <Skeleton className="h-10 w-16 mb-4" delay={250} />
            <Skeleton className="h-4 w-20" delay={250} />
          </div>
        </div>

        {/* Right: Wallet */}
        <div className="flex items-center gap-4 px-6 py-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] min-w-[180px]">
          <Skeleton className="h-6 w-6 rounded-full flex-shrink-0" delay={300} />
          <div className="flex-1">
            <Skeleton className="h-3 w-24 mb-2" delay={300} />
            <Skeleton className="h-6 w-32" delay={300} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
