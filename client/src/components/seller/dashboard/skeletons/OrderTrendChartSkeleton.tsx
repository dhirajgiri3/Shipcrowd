/**
 * OrderTrendChart Skeleton Loading Component
 *
 * Matches the layout of OrderTrendChart for fast loading states.
 * Creates a chart-like skeleton with proper dimensions.
 */

'use client';

import { Skeleton } from '@/src/components/ui/data/Skeleton';
import { motion } from 'framer-motion';

export function OrderTrendChartSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl p-4 md:p-8 shadow-md bg-[var(--bg-primary)] border border-[var(--border-subtle)]"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Skeleton className="h-6 w-48" delay={0} />
          </div>
          <Skeleton className="h-4 w-32" delay={0} />
        </div>

        {/* Trend Indicator */}
        <div className="flex items-center justify-between md:justify-start gap-4">
          <div className="text-left md:text-right">
            <Skeleton className="h-3 w-20 mb-2" delay={100} />
            <Skeleton className="h-6 w-12" delay={100} />
          </div>
          <Skeleton className="h-8 w-20 rounded-lg" delay={100} />
        </div>
      </div>

      {/* Chart Area Skeleton */}
      <div className="relative w-full mb-6">
        <div className="bg-[var(--bg-secondary)] rounded-lg p-6 space-y-3">
          {/* Grid lines effect */}
          <div className="space-y-3">
            <Skeleton className="h-1 w-full" delay={200} shimmer={false} />
            <Skeleton className="h-1 w-full" delay={200} shimmer={false} />
            <Skeleton className="h-1 w-full" delay={200} shimmer={false} />
            <Skeleton className="h-1 w-full" delay={200} shimmer={false} />
          </div>
          {/* Chart bars/area effect */}
          <div className="h-48 bg-gradient-to-b from-[var(--border-subtle)] to-transparent rounded opacity-30" />
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 md:gap-6 text-xs">
        {/* Festival marker */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-3 w-3 rounded-full" delay={300} />
          <Skeleton className="h-3 w-20" delay={300} />
        </div>

        {/* Weekend marker */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-3 w-3" delay={350} />
          <Skeleton className="h-3 w-20" delay={350} />
        </div>

        {/* Filter info */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-3 w-3" delay={400} />
          <Skeleton className="h-3 w-32" delay={400} />
        </div>
      </div>
    </motion.div>
  );
}
