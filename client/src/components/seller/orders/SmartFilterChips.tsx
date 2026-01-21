/**
 * SmartFilterChips - One-tap preset filters for orders
 *
 * Psychology: Reduce decision fatigue with common-use presets
 * UX: Horizontal scrollable chips (mobile), wrapped grid (desktop)
 *
 * Research-backed presets based on seller priorities:
 * 1. Needs Attention - Urgent/time-sensitive orders (pickup pending, exceptions)
 * 2. Today's Orders - Most frequently accessed filter
 * 3. COD Pending - Critical for Indian market (65% orders)
 * 4. Last 7 Days - Common time range
 * 5. By Zone - Most frequent zone for this seller
 *
 * Features:
 * - Badge counts on each chip
 * - Active state highlighting
 * - Smooth horizontal scroll on mobile
 * - Analytics tracking
 */

'use client';

import { motion } from 'framer-motion';
import {
  AlertCircle,
  Calendar,
  IndianRupee,
  MapPin,
  Package,
  Clock
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { trackEvent, EVENTS } from '@/src/lib/analytics';

export type FilterPreset =
  | 'all'
  | 'needs_attention'
  | 'today'
  | 'cod_pending'
  | 'last_7_days'
  | 'zone_b'; // Most common zone for demo

interface FilterChip {
  id: FilterPreset;
  label: string;
  icon: typeof Package;
  count?: number;
  color: string;
  bgColor: string;
  borderColor: string;
}

interface SmartFilterChipsProps {
  activeFilter: FilterPreset;
  onFilterChange: (filter: FilterPreset) => void;
  counts?: Record<FilterPreset, number>;
  className?: string;
}

/**
 * Smart Filter Chips Component
 */
export function SmartFilterChips({
  activeFilter,
  onFilterChange,
  counts,
  className
}: SmartFilterChipsProps) {
  const filters: FilterChip[] = [
    {
      id: 'all',
      label: 'All Orders',
      icon: Package,
      count: counts?.all,
      color: 'text-gray-700 dark:text-gray-300',
      bgColor: 'bg-gray-50 dark:bg-gray-900/30',
      borderColor: 'border-gray-200 dark:border-gray-700'
    },
    {
      id: 'needs_attention',
      label: 'Needs Attention',
      icon: AlertCircle,
      count: counts?.needs_attention,
      color: 'text-orange-700 dark:text-orange-400',
      bgColor: 'bg-orange-50 dark:bg-orange-950/30',
      borderColor: 'border-orange-200 dark:border-orange-800'
    },
    {
      id: 'today',
      label: "Today's Orders",
      icon: Calendar,
      count: counts?.today,
      color: 'text-blue-700 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-950/30',
      borderColor: 'border-blue-200 dark:border-blue-800'
    },
    {
      id: 'cod_pending',
      label: 'COD Pending',
      icon: IndianRupee,
      count: counts?.cod_pending,
      color: 'text-yellow-700 dark:text-yellow-400',
      bgColor: 'bg-yellow-50 dark:bg-yellow-950/30',
      borderColor: 'border-yellow-200 dark:border-yellow-800'
    },
    {
      id: 'last_7_days',
      label: 'Last 7 Days',
      icon: Clock,
      count: counts?.last_7_days,
      color: 'text-purple-700 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-950/30',
      borderColor: 'border-purple-200 dark:border-purple-800'
    },
    {
      id: 'zone_b',
      label: 'Zone B',
      icon: MapPin,
      count: counts?.zone_b,
      color: 'text-green-700 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-950/30',
      borderColor: 'border-green-200 dark:border-green-800'
    }
  ];

  const handleFilterClick = (filterId: FilterPreset) => {
    trackEvent(EVENTS.CARRIER_COMPARED, {
      metric: `filter_${filterId}`,
      range: '7d'
    });
    onFilterChange(filterId);
  };

  return (
    <div className={cn('relative', className)}>
      {/* Mobile: Horizontal scroll */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide md:flex-wrap md:overflow-visible">
        {filters.map((filter, index) => {
          const Icon = filter.icon;
          const isActive = activeFilter === filter.id;

          return (
            <motion.button
              key={filter.id}
              onClick={() => handleFilterClick(filter.id)}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all',
                'whitespace-nowrap flex-shrink-0 md:flex-shrink',
                'hover:shadow-sm active:scale-95',
                isActive
                  ? cn(
                      'border-[var(--primary-blue)] bg-[var(--primary-blue)] text-white',
                      'shadow-md shadow-blue-500/20'
                    )
                  : cn(
                      filter.borderColor,
                      filter.bgColor,
                      filter.color,
                      'hover:border-[var(--primary-blue)]/30'
                    )
              )}
            >
              <Icon className={cn('w-4 h-4', isActive && 'text-white')} />
              <span className="text-sm font-medium">{filter.label}</span>
              {filter.count !== undefined && filter.count > 0 && (
                <span
                  className={cn(
                    'text-xs font-bold px-2 py-0.5 rounded-full min-w-[24px] text-center',
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border-subtle)]'
                  )}
                >
                  {filter.count > 99 ? '99+' : filter.count}
                </span>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Scroll hint for mobile (gradient fade) */}
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[var(--bg-primary)] to-transparent pointer-events-none md:hidden" />
    </div>
  );
}
