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
import { Card, CardHeader, CardTitle, CardContent } from "@/src/shared/components/card";
import { Button } from "@/src/shared/components/button";
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
        bg: 'bg-emerald-50 dark:bg-emerald-950/30',
        border: 'border-emerald-200/80 dark:border-emerald-800/50',
        iconBg: 'bg-emerald-100 dark:bg-emerald-900/50',
        iconColor: 'text-emerald-600 dark:text-emerald-400',
        impactBg: 'bg-emerald-500',
    },
    delivery_optimization: {
        bg: 'bg-blue-50 dark:bg-blue-950/30',
        border: 'border-blue-200/80 dark:border-blue-800/50',
        iconBg: 'bg-blue-100 dark:bg-blue-900/50',
        iconColor: 'text-blue-600 dark:text-blue-400',
        impactBg: 'bg-blue-500',
    },
    trend_alert: {
        bg: 'bg-amber-50 dark:bg-amber-950/30',
        border: 'border-amber-200/80 dark:border-amber-800/50',
        iconBg: 'bg-amber-100 dark:bg-amber-900/50',
        iconColor: 'text-amber-600 dark:text-amber-400',
        impactBg: 'bg-amber-500',
    },
    action_recommended: {
        bg: 'bg-violet-50 dark:bg-violet-950/30',
        border: 'border-violet-200/80 dark:border-violet-800/50',
        iconBg: 'bg-violet-100 dark:bg-violet-900/50',
        iconColor: 'text-violet-600 dark:text-violet-400',
        impactBg: 'bg-violet-500',
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
            <Card className="border-[var(--border-default)] bg-[var(--bg-primary)] overflow-hidden">
                <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                                <Sparkles className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <CardTitle className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                                    Smart Insights
                                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 uppercase">
                                        AI Powered
                                    </span>
                                </CardTitle>
                                <p className="text-sm text-[var(--text-secondary)] mt-1">
                                    Personalized recommendations to optimize your shipping
                                </p>
                            </div>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="space-y-3">
                    {insights.map((insight, index) => {
                        const Icon = insightIcons[insight.type];
                        const styles = insightStyles[insight.type];

                        return (
                            <motion.div
                                key={insight.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className={cn(
                                    "p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center gap-4 transition-all duration-200 hover:shadow-md group",
                                    styles.bg,
                                    styles.border
                                )}
                            >
                                <div className="flex items-start gap-4 flex-1">
                                    <div className={cn(
                                        "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
                                        styles.iconBg
                                    )}>
                                        <Icon className={cn("h-5 w-5", styles.iconColor)} />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                            <h4 className="font-semibold text-[var(--text-primary)]">
                                                {insight.title}
                                            </h4>
                                            {insight.impact && (
                                                <span className={cn(
                                                    "px-2 py-0.5 text-[10px] font-bold rounded-full text-white",
                                                    styles.impactBg
                                                )}>
                                                    {insight.impact}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-[var(--text-secondary)] line-clamp-2">
                                            {insight.description}
                                        </p>
                                    </div>
                                </div>

                                {insight.actionUrl && insight.actionLabel && (
                                    <Link href={insight.actionUrl} className="sm:shrink-0">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="w-full sm:w-auto group-hover:border-[var(--primary-blue)] group-hover:text-[var(--primary-blue)] transition-colors"
                                        >
                                            {insight.actionLabel}
                                            <ArrowRight className="h-3.5 w-3.5 ml-1 transition-transform group-hover:translate-x-0.5" />
                                        </Button>
                                    </Link>
                                )}
                            </motion.div>
                        );
                    })}

                    {/* View All Link */}
                    <div className="pt-2 text-center">
                        <Link
                            href="/seller/insights"
                            className="inline-flex items-center gap-1 text-sm font-medium text-[var(--primary-blue)] hover:opacity-80 transition-opacity"
                        >
                            View all insights
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}

export default SmartInsights;
