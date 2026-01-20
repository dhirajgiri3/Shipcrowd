/**
 * UrgentActionsBar - Priority 1 in information hierarchy
 * Psychology: Loss aversion - highlight what needs immediate attention
 * 
 * Shows critical actions that require immediate seller attention:
 * - Pending pickups
 * - Low wallet balance
 * - Failed orders requiring action
 * - RTO alerts
 */

'use client';

import { AlertCircle, Package, Wallet, TrendingDown } from 'lucide-react';
import { useIsMobile } from '../../../hooks/ux';
import { motion } from 'framer-motion';

interface UrgentAction {
    id: string;
    type: 'pickup' | 'wallet' | 'rto' | 'failed';
    title: string;
    description: string;
    count?: number;
    ctaLabel: string;
    ctaUrl: string;
    severity: 'high' | 'medium';
}

interface UrgentActionsBarProps {
    actions: UrgentAction[];
}

const iconMap = {
    pickup: Package,
    wallet: Wallet,
    rto: TrendingDown,
    failed: AlertCircle
};

const severityColors = {
    high: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
    medium: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
};

const iconColors = {
    high: 'text-red-600 dark:text-red-400',
    medium: 'text-yellow-600 dark:text-yellow-400'
};

export function UrgentActionsBar({ actions }: UrgentActionsBarProps) {
    const isMobile = useIsMobile();

    if (actions.length === 0) return null;

    return (
        <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    Needs Attention
                </h2>
                {actions.length > 0 && (
                    <span className="px-2 py-1 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full">
                        {actions.length} {actions.length === 1 ? 'item' : 'items'}
                    </span>
                )}
            </div>

            {/* Actions Grid */}
            <div className={`grid gap-3 ${isMobile ? 'grid-cols-1' : 'grid-cols-2 lg:grid-cols-4'}`}>
                {actions.map((action, index) => {
                    const Icon = iconMap[action.type];

                    return (
                        <motion.a
                            key={action.id}
                            href={action.ctaUrl}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className={`
                block p-4 rounded-lg border-2 transition-all hover:shadow-md
                ${severityColors[action.severity]}
                hover:scale-[1.02] active:scale-[0.98]
              `}
                        >
                            <div className="flex items-start gap-3">
                                {/* Icon */}
                                <div className="flex-shrink-0">
                                    <Icon className={`w-6 h-6 ${iconColors[action.severity]}`} />
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                            {action.title}
                                        </h3>
                                        {action.count !== undefined && (
                                            <span className={`
                        px-2 py-0.5 text-xs font-bold rounded-full
                        ${action.severity === 'high'
                                                    ? 'bg-red-600 text-white'
                                                    : 'bg-yellow-600 text-white'
                                                }
                      `}>
                                                {action.count}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                                        {action.description}
                                    </p>
                                    <div className={`
                    text-xs font-medium inline-flex items-center gap-1
                    ${action.severity === 'high'
                                            ? 'text-red-700 dark:text-red-400'
                                            : 'text-yellow-700 dark:text-yellow-400'
                                        }
                  `}>
                                        {action.ctaLabel}
                                        <span>→</span>
                                    </div>
                                </div>
                            </div>
                        </motion.a>
                    );
                })}
            </div>
        </div>
    );
}
