"use client";

import { motion } from "framer-motion";
import {
    Lightbulb,
    TrendingUp,
    DollarSign,
    AlertTriangle,
    Truck,
    ArrowRight,
    Sparkles,
    CheckCircle2
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from '@/src/components/ui/core/Card';
import { Button } from '@/src/components/ui/core/Button';
import { cn } from "@/src/shared/utils";
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
        bg: 'bg-[var(--success-bg)] hover:brightness-95 dark:hover:brightness-110 transition-all',
        border: 'border-[var(--success-border)]',
        iconBg: 'bg-[var(--success-bg)]',
        iconColor: 'text-[var(--success)]',
        impactBg: 'bg-[var(--success-bg)] text-[var(--success)] border border-[var(--success-border)]',
        accentColor: 'text-[var(--success)]',
    },
    delivery_optimization: {
        bg: 'bg-[var(--info-bg)] hover:brightness-95 dark:hover:brightness-110 transition-all',
        border: 'border-[var(--info-border)]',
        iconBg: 'bg-[var(--info-bg)]',
        iconColor: 'text-[var(--info)]',
        impactBg: 'bg-[var(--info-bg)] text-[var(--info)] border border-[var(--info-border)]',
        accentColor: 'text-[var(--info)]',
    },
    trend_alert: {
        bg: 'bg-[var(--warning-bg)] hover:brightness-95 dark:hover:brightness-110 transition-all',
        border: 'border-[var(--warning-border)]',
        iconBg: 'bg-[var(--warning-bg)]',
        iconColor: 'text-[var(--warning)]',
        impactBg: 'bg-[var(--warning-bg)] text-[var(--warning)] border border-[var(--warning-border)]',
        accentColor: 'text-[var(--warning)]',
    },
    action_recommended: {
        // Violet/Purple variables might not be fully defined in globals, checking...
        // If not, we map to --primary-blue or custom
        // Looking at globals.css, we have success, warning, error, info. No violet.
        // I will use --primary-blue-soft for now or distinct hardcoded vars if needed, but user wants vars.
        // Let's use --primary-blue-soft (which is violet/blue-ish) or create a custom style using brand vars.
        bg: 'bg-[var(--primary-blue-soft)] hover:brightness-95 dark:hover:brightness-110 transition-all',
        border: 'border-[var(--primary-blue-subtle)]',
        iconBg: 'bg-[var(--primary-blue-soft)]',
        iconColor: 'text-[var(--primary-blue)]',
        impactBg: 'bg-[var(--primary-blue-soft)] text-[var(--primary-blue)] border border-[var(--primary-blue-subtle)]',
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
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="font-bold text-[var(--text-primary)] flex items-center gap-2">
                        <Lightbulb className="h-5 w-5 text-[var(--text-secondary)]" />
                        Optimization Tips
                    </h3>
                    <Link
                        href="/seller/insights"
                        className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                    >
                        View All
                    </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {insights.map((insight, index) => {
                        const Icon = insightIcons[insight.type];
                        const styles = insightStyles[insight.type];

                        return (
                            <motion.div
                                key={insight.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className={cn(
                                    "flex flex-col h-full rounded-2xl p-5 border transition-all duration-200 hover:scale-[1.01]",
                                    styles.bg,
                                    styles.border
                                )}
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className={cn("p-2.5 rounded-xl", styles.iconBg)}>
                                        <Icon className={cn("h-5 w-5", styles.iconColor)} />
                                    </div>
                                    {insight.impact && (
                                        <span className={cn(
                                            "px-2.5 py-1 text-[10px] font-bold rounded-lg border",
                                            styles.impactBg
                                        )}>
                                            {insight.impact}
                                        </span>
                                    )}
                                </div>

                                <h4 className="font-bold text-[var(--text-primary)] mb-2 line-clamp-2">
                                    {insight.title}
                                </h4>

                                <p className="text-sm text-[var(--text-secondary)] mb-4 flex-1 line-clamp-3 leading-relaxed">
                                    {insight.description}
                                </p>

                                {insight.actionUrl && (
                                    <Link href={insight.actionUrl} className="mt-auto pt-4 border-t border-[var(--border-subtle)]/50">
                                        <div className={cn(
                                            "flex items-center justify-between text-sm font-semibold transition-colors group",
                                            styles.accentColor
                                        )}>
                                            {insight.actionLabel || 'View Details'}
                                            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                                        </div>
                                    </Link>
                                )}
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </motion.div>
    );
}

export default SmartInsights;
