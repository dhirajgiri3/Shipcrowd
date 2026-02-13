"use client";

import { motion } from "framer-motion";
import {
    Lightbulb,
    TrendingUp,
    DollarSign,
    AlertTriangle,
    Truck,
    ArrowRight,
} from "lucide-react";
import { cn } from "@/src/lib/utils";
import Link from "next/link";

interface Insight {
    id: string;
    type: 'cost_saving' | 'delivery_optimization' | 'trend_alert' | 'action_recommended';
    title: string;
    description: string;
    impact?: string;
    actionLabel?: string;
    actionUrl?: string;
}

// Mock insights data - will be replaced with real AI-powered insights
const mockInsights: Insight[] = [
    {
        id: '1',
        type: 'cost_saving',
        title: 'Switch 12 orders to Delhivery',
        description: 'Based on delivery zones, switching to Delhivery for Zone B orders could reduce shipping costs.',
        impact: 'Save ₹2,400/week',
        actionLabel: 'View Details',
        actionUrl: '/seller/orders?optimize=true',
    },
    {
        id: '2',
        type: 'delivery_optimization',
        title: 'Zone ABC has 20% delay rate',
        description: 'Consider using Xpressbees for Mumbai North orders to improve delivery times.',
        actionLabel: 'Adjust Routes',
        actionUrl: '/seller/settings/shipping',
    },
    {
        id: '3',
        type: 'trend_alert',
        title: 'Peak orders detected this week',
        description: 'Order volume is 35% higher than last week. Consider enabling Express Delivery option.',
        actionLabel: 'Enable Now',
        actionUrl: '/seller/settings/shipping',
    },
];

const insightIcons = {
    cost_saving: DollarSign,
    delivery_optimization: Truck,
    trend_alert: TrendingUp,
    action_recommended: AlertTriangle,
};

const insightStyles = {
    cost_saving: {
        iconColor: 'text-[var(--success)]',
        iconBg: 'bg-[var(--success)]/10',
        badgeColor: 'text-[var(--success)]',
        badgeBg: 'bg-[var(--success)]/10',
        accentColor: 'text-[var(--success)]',
    },
    delivery_optimization: {
        iconColor: 'text-[var(--info)]',
        iconBg: 'bg-[var(--info)]/10',
        badgeColor: 'text-[var(--info)]',
        badgeBg: 'bg-[var(--info)]/10',
        accentColor: 'text-[var(--info)]',
    },
    trend_alert: {
        iconColor: 'text-[var(--warning)]',
        iconBg: 'bg-[var(--warning)]/10',
        badgeColor: 'text-[var(--warning)]',
        badgeBg: 'bg-[var(--warning)]/10',
        accentColor: 'text-[var(--warning)]',
    },
    action_recommended: {
        iconColor: 'text-[var(--primary-blue)]',
        iconBg: 'bg-[var(--primary-blue)]/10',
        badgeColor: 'text-[var(--primary-blue)]',
        badgeBg: 'bg-[var(--primary-blue)]/10',
        accentColor: 'text-[var(--primary-blue)]',
    },
};

export function SmartInsights() {
    const insights = mockInsights; // Will be replaced with real data from useSmartInsights hook

    if (insights.length === 0) {
        return null;
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
        >
            <div className="space-y-6">
                {/* Header Section */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-[var(--primary-blue-soft)]">
                            <Lightbulb className="h-5 w-5 text-[var(--primary-blue)]" />
                        </div>
                        <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                            Optimization Tips
                        </h3>
                    </div>
                    <Link
                        href="/seller/insights"
                        className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--primary-blue)] transition-colors flex items-center gap-1 group"
                    >
                        View All
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                </div>

                {/* Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
                    {insights.map((insight, index) => {
                        const Icon = insightIcons[insight.type];
                        const styles = insightStyles[insight.type];

                        return (
                            <motion.div
                                key={insight.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className="group"
                            >
                                <div className="relative flex flex-col h-full rounded-xl p-6 border border-[var(--border-subtle)] bg-[var(--bg-primary)] dark:border-[var(--border-default)] dark:bg-[var(--bg-secondary)] shadow-sm dark:shadow-none transition-all duration-300 hover:-translate-y-1 hover:shadow-lg dark:hover:border-[var(--border-strong)]">

                                    {/* Icon & Impact Badge */}
                                    <div className="flex items-start justify-between mb-4">
                                        <div className={cn("p-3 rounded-xl transition-transform group-hover:scale-110", styles.iconBg)}>
                                            <Icon className={cn("h-5 w-5", styles.iconColor)} />
                                        </div>
                                        {insight.impact && (
                                            <span className={cn(
                                                "px-3 py-1.5 text-xs font-semibold rounded-lg",
                                                styles.badgeBg,
                                                styles.badgeColor
                                            )}>
                                                {insight.impact}
                                            </span>
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 space-y-2">
                                        <h4 className="font-semibold text-base text-[var(--text-primary)] line-clamp-2 leading-snug">
                                            {insight.title}
                                        </h4>

                                        <p className="text-sm text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
                                            {insight.description}
                                        </p>
                                    </div>

                                    {/* Action Link */}
                                    {insight.actionUrl && (
                                        <Link
                                            href={insight.actionUrl}
                                            className="mt-6 pt-4 border-t border-[var(--border-subtle)] dark:border-[var(--border-default)] block"
                                        >
                                            <div className={cn(
                                                "flex items-center justify-between text-sm font-semibold transition-all",
                                                styles.accentColor
                                            )}>
                                                <span>{insight.actionLabel || 'View Details'}</span>
                                                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                                            </div>
                                        </Link>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </motion.div>
    );
}

export default SmartInsights;
