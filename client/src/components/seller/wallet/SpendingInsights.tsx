/**
 * SpendingInsights - Business intelligence for sellers
 *
 * Psychology: Control & transparency build trust
 * Show sellers WHERE their money is going + actionable insights
 *
 * Features:
 * - Weekly spend comparison
 * - Top spending categories
 * - Optimization recommendations
 * - Visual spend breakdown
 *
 * Research: People remember visuals 6x better than text
 */

'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  Package,
  Truck,
  CreditCard,
  AlertCircle,
  Lightbulb,
  ArrowRight
} from 'lucide-react';
import { cn, formatCurrency } from '@/src/lib/utils';

export interface SpendCategory {
  name: string;
  amount: number;
  percentage: number;
  icon: typeof Package;
  color: string;
}

interface SpendingInsightsProps {
  thisWeekSpend: number;
  lastWeekSpend: number;
  categories: SpendCategory[];
  avgOrderCost?: number;
  recommendations?: string[];
  className?: string;
}

export function SpendingInsights({
  thisWeekSpend,
  lastWeekSpend,
  categories,
  avgOrderCost = 45,
  recommendations = [],
  className
}: SpendingInsightsProps) {
  // Calculate percentage change
  const percentageChange = useMemo(() => {
    if (lastWeekSpend === 0) return 0;
    return ((thisWeekSpend - lastWeekSpend) / lastWeekSpend) * 100;
  }, [thisWeekSpend, lastWeekSpend]);

  const isIncreased = percentageChange > 0;
  const changeText = isIncreased ? 'more' : 'less';

  // Sort categories by amount (highest first)
  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => b.amount - a.amount),
    [categories]
  );

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header: Week-over-week comparison */}
      <div>
        <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4">
          Spending Insights
        </h3>

        <div className="p-5 rounded-2xl bg-gradient-to-br from-[var(--bg-secondary)] to-[var(--bg-primary)] border border-[var(--border-subtle)]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wide font-medium mb-1">
                This Week
              </p>
              <p className="text-3xl font-black text-[var(--text-primary)]">
                {formatCurrency(thisWeekSpend, 'INR')}
              </p>
            </div>

            <div
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm',
                isIncreased
                  ? 'bg-orange-100 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400'
                  : 'bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400'
              )}
            >
              {isIncreased ? (
                <TrendingUp className="w-5 h-5" />
              ) : (
                <TrendingDown className="w-5 h-5" />
              )}
              <span>{Math.abs(percentageChange).toFixed(1)}% {changeText}</span>
            </div>
          </div>

          <p className="text-xs text-[var(--text-secondary)]">
            vs last week: {formatCurrency(lastWeekSpend, 'INR')}
            {isIncreased && (
              <span className="ml-2 text-orange-600 dark:text-orange-400 font-medium">
                • You spent {formatCurrency(thisWeekSpend - lastWeekSpend, 'INR')} more
              </span>
            )}
          </p>

          {/* Quick Stat */}
          <div className="mt-4 pt-4 border-t border-[var(--border-subtle)]">
            <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
              <Package className="w-4 h-4" />
              <span>
                Average cost per order: <span className="font-bold text-[var(--text-primary)]">{formatCurrency(avgOrderCost, 'INR')}</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Spending Breakdown */}
      <div>
        <h4 className="text-sm font-bold text-[var(--text-primary)] mb-3">
          Where Your Money Went
        </h4>

        <div className="space-y-3">
          {sortedCategories.map((category, index) => (
            <motion.div
              key={category.name}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="relative"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <div
                    className={cn('p-2 rounded-lg', category.color)}
                  >
                    <category.icon className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-medium text-[var(--text-primary)]">
                    {category.name}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-[var(--text-primary)]">
                    {formatCurrency(category.amount, 'INR')}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {category.percentage}%
                  </p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${category.percentage}%` }}
                  transition={{ delay: index * 0.1 + 0.2, duration: 0.8, ease: 'easeOut' }}
                  className="h-full rounded-full"
                  style={{
                    background: `linear-gradient(90deg, ${category.color.includes('blue') ? 'var(--primary-blue)' : category.color.includes('green') ? 'var(--success)' : category.color.includes('orange') ? 'var(--warning)' : 'var(--text-secondary)'} 0%, ${category.color.includes('blue') ? 'var(--primary-blue-deep)' : category.color.includes('green') ? 'var(--success)' : category.color.includes('orange') ? 'var(--warning)' : 'var(--text-secondary)'} 100%)`
                  }}
                />
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div>
          <h4 className="text-sm font-bold text-[var(--text-primary)] mb-3 flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
            Smart Recommendations
          </h4>

          <div className="space-y-2">
            {recommendations.map((rec, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-start gap-3 p-3 rounded-xl bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800"
              >
                <div className="p-1.5 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                  <AlertCircle className="w-4 h-4 text-yellow-700 dark:text-yellow-400" />
                </div>
                <p className="flex-1 text-xs text-yellow-900 dark:text-yellow-200 leading-relaxed">
                  {rec}
                </p>
                <button className="text-yellow-700 dark:text-yellow-400 hover:text-yellow-900 dark:hover:text-yellow-200 transition-colors">
                  <ArrowRight className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Default categories if not provided
export const DEFAULT_SPEND_CATEGORIES: SpendCategory[] = [
  {
    name: 'Shipping Costs',
    amount: 3200,
    percentage: 64,
    icon: Truck,
    color: 'bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400'
  },
  {
    name: 'Packaging',
    amount: 800,
    percentage: 16,
    icon: Package,
    color: 'bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400'
  },
  {
    name: 'Transaction Fees',
    amount: 600,
    percentage: 12,
    icon: CreditCard,
    color: 'bg-orange-100 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400'
  },
  {
    name: 'Other',
    amount: 400,
    percentage: 8,
    icon: AlertCircle,
    color: 'bg-gray-100 dark:bg-gray-950/30 text-gray-700 dark:text-gray-400'
  }
];
