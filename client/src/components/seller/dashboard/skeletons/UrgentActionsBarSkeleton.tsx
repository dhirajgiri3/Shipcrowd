/**
 * UrgentActionsBar Skeleton Loading Component
 *
 * Matches the layout of UrgentActionsBar for fast loading states.
 * Responsive design for mobile and desktop.
 */

'use client';

import { Skeleton } from '@/src/components/ui/data/Skeleton';
import { useIsMobile } from '@/src/hooks/ux';
import { motion } from 'framer-motion';

export function UrgentActionsBarSkeleton() {
  const isMobile = useIsMobile();

  // Mobile: 1 column
  const gridClass = isMobile ? 'grid-cols-1' : 'grid-cols-2 lg:grid-cols-4';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <Skeleton className="h-5 w-32" delay={0} />
        <Skeleton className="h-6 w-24" delay={0} />
      </div>

      {/* Actions Grid/List */}
      <div className={`grid gap-4 ${gridClass}`}>
        {[0, 1, 2, 3].map((index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="p-5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] space-y-3"
          >
            {/* Icon */}
            <div className="flex items-start gap-3">
              <Skeleton className="h-10 w-10 rounded-lg flex-shrink-0" delay={100 + index * 50} />
              <div className="flex-1 space-y-2">
                {/* Title with badge */}
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-24" delay={100 + index * 50} />
                  <Skeleton className="h-4 w-6 rounded-full" delay={100 + index * 50} />
                </div>

                {/* Description */}
                <Skeleton className="h-3 w-full" delay={150 + index * 50} />
                <Skeleton className="h-3 w-3/4" delay={150 + index * 50} />

                {/* CTA */}
                <Skeleton className="h-3 w-16" delay={200 + index * 50} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
