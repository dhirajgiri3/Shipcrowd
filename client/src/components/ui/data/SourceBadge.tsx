/**
 * SourceBadge - Order/shipment source indicator
 *
 * Dark-theme aware badge for Shopify, WooCommerce, Amazon, Flipkart, Manual, API.
 * Uses platform brand colors with opacity for light/dark mode readability.
 */

'use client';

import { Store } from 'lucide-react';
import { cn } from '@/src/lib/utils';

export type OrderSource = 'shopify' | 'woocommerce' | 'amazon' | 'flipkart' | 'manual' | 'api';

const SOURCE_CONFIG: Record<
  string,
  { label: string; color: string; bgLight: string; bgDark: string }
> = {
  shopify: {
    label: 'Shopify',
    color: '#95BF47',
    bgLight: 'bg-[#95BF47]/15',
    bgDark: 'dark:bg-[#95BF47]/25',
  },
  woocommerce: {
    label: 'WooCommerce',
    color: '#96588A',
    bgLight: 'bg-[#96588A]/15',
    bgDark: 'dark:bg-[#96588A]/25',
  },
  amazon: {
    label: 'Amazon',
    color: '#FF9900',
    bgLight: 'bg-[#FF9900]/15',
    bgDark: 'dark:bg-[#FF9900]/25',
  },
  flipkart: {
    label: 'Flipkart',
    color: '#2874F0',
    bgLight: 'bg-[#2874F0]/15',
    bgDark: 'dark:bg-[#2874F0]/25',
  },
  api: {
    label: 'API',
    color: '#10B981',
    bgLight: 'bg-[#10B981]/15',
    bgDark: 'dark:bg-[#10B981]/25',
  },
  manual: {
    label: 'Manual',
    color: 'inherit',
    bgLight: 'bg-[var(--bg-secondary)]',
    bgDark: 'dark:bg-[var(--bg-secondary)]',
  },
};

export interface SourceBadgeProps {
  source?: string | null;
  size?: 'sm' | 'md';
  className?: string;
}

export function SourceBadge({ source, size = 'sm', className }: SourceBadgeProps) {
  const normalized = (source || 'manual').toLowerCase();
  const config = SOURCE_CONFIG[normalized] || SOURCE_CONFIG.manual;
  const isManual = config === SOURCE_CONFIG.manual;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-md font-medium',
        config.bgLight,
        config.bgDark,
        isManual
          ? 'text-[var(--text-secondary)]'
          : '',
        size === 'sm' && 'px-2.5 py-1.5 text-xs',
        size === 'md' && 'px-3 py-2 text-sm',
        className
      )}
      style={!isManual ? { color: config.color } : undefined}
    >
      <Store className={size === 'sm' ? 'w-3.5 h-3.5 shrink-0' : 'w-4 h-4 shrink-0'} />
      {config.label}
    </span>
  );
}
