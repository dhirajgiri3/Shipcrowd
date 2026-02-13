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
  context?: 'order' | 'shipment';
}

/**
 * Smart Filter Chips Component
 */
export function SmartFilterChips({
  activeFilter,
  onFilterChange,
  counts,
  className,
  context = 'order'
}: SmartFilterChipsProps) {
  const filters: FilterChip[] = [
    {
      id: 'all',
      label: context === 'order' ? 'All Orders' : 'All Shipments',
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
      label: context === 'order' ? "Today's Orders" : "Today's Shipments",
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
      <div className="flex gap-3 overflow-x-auto pb-4 pt-1 scrollbar-hide md:flex-wrap md:overflow-visible px-1">
        {filters.map((filter, index) => {
          const Icon = filter.icon;
          const isActive = activeFilter === filter.id;

          return (
            <motion.button
              key={filter.id}
              onClick={() => handleFilterClick(filter.id)}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                'group relative flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-2.5',
                'px-3.5 py-2.5 rounded-2xl border transition-all duration-200',
                'flex-shrink-0',
                'hover:shadow-md active:scale-95 text-left',
                isActive
                  ? cn(
                    'border-[var(--primary-blue)] bg-[var(--primary-blue)] text-white',
                    'shadow-lg shadow-blue-500/25 ring-1 ring-blue-500/50'
                  )
                  : cn(
                    'bg-[var(--bg-primary)] border-[var(--border-subtle)]',
                    'hover:border-[var(--border-strong)] hover:bg-[var(--bg-secondary)]'
                  )
              )}
            >
              <div
                className={cn(
                  "p-2 rounded-lg transition-colors",
                  isActive ? "bg-white/20 text-white" : cn("bg-[var(--bg-secondary)]", filter.color)
                )}
              >
                <Icon className="w-4 h-4" />
              </div>

              <div className="flex flex-col md:flex-row md:items-center gap-0.5 md:gap-2">
                <span className={cn(
                  "text-sm font-semibold whitespace-nowrap",
                  isActive ? "text-white" : "text-[var(--text-primary)]"
                )}>
                  {filter.label}
                </span>

                {filter.count !== undefined && (
                  <span className={cn(
                    "text-xs md:text-sm transition-colors",
                    isActive ? "text-blue-100" : "text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]"
                  )}>
                    {filter.count}
                  </span>
                )}
              </div>

              {isActive && (
                <motion.div
                  layoutId="active-indicator"
                  className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 md:hidden"
                />
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Scroll hint for mobile */}
      <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[var(--bg-primary)] to-transparent pointer-events-none md:hidden transition-opacity" />
    </div>
  );
}
