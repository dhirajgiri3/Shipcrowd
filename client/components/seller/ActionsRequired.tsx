"use client";

import { motion } from "framer-motion";
import { AlertCircle, Package, Wallet, Shield, CheckCircle2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/src/shared/components/card";
import { Badge } from "@/src/shared/components/badge";
import { Button } from "@/src/shared/components/button";
import { cn } from "@/src/shared/utils";
import Link from "next/link";

export interface SellerAction {
    id: string;
    type: 'orders_ready' | 'ndr_pending' | 'low_wallet' | 'kyc_pending' | 'weight_dispute';
    priority: 'critical' | 'high' | 'medium';
    title: string;
    description: string;
    count?: number;
    actionLabel: string;
    actionUrl: string;
    dismissable: boolean;
}

interface ActionsRequiredProps {
    actions: SellerAction[];
    isLoading?: boolean;
    onDismiss?: (id: string) => void;
}

const iconMap = {
    orders_ready: Package,
    ndr_pending: AlertCircle,
    low_wallet: Wallet,
    kyc_pending: Shield,
    weight_dispute: Package,
};

const priorityStyles = {
    critical: {
        bg: "bg-rose-50 dark:bg-rose-950/30",
        border: "border-rose-200/80 dark:border-rose-800/50",
        text: "text-rose-700 dark:text-rose-300",
        iconBg: "bg-rose-100 dark:bg-rose-900/50",
        badge: "bg-rose-500 text-white border-rose-600",
    },
    high: {
        bg: "bg-amber-50 dark:bg-amber-950/30",
        border: "border-amber-200/80 dark:border-amber-800/50",
        text: "text-amber-700 dark:text-amber-300",
        iconBg: "bg-amber-100 dark:bg-amber-900/50",
        badge: "bg-amber-500 text-white border-amber-600",
    },
    medium: {
        bg: "bg-blue-50 dark:bg-blue-950/30",
        border: "border-blue-200/80 dark:border-blue-800/50",
        text: "text-blue-700 dark:text-blue-300",
        iconBg: "bg-blue-100 dark:bg-blue-900/50",
        badge: "bg-blue-500 text-white border-blue-600",
    },
};

const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 },
};

export function ActionsRequired({ actions, isLoading, onDismiss }: ActionsRequiredProps) {
    if (isLoading) {
        return <ActionsRequiredSkeleton />;
    }

    // Empty state - All caught up!
    if (!actions || actions.length === 0) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
            >
                <Card className="border-emerald-200/80 dark:border-emerald-800/50 bg-gradient-to-br from-emerald-50 to-emerald-50/50 dark:from-emerald-950/30 dark:to-emerald-950/10 shadow-sm">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center shadow-sm">
                                <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-emerald-900 dark:text-emerald-100">
                                    All caught up! ✨
                                </h3>
                                <p className="text-sm text-emerald-700 dark:text-emerald-300 mt-0.5">
                                    No pending actions. You're doing great!
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            <Card className="border-[var(--border-default)] bg-[var(--bg-primary)] shadow-md overflow-hidden">
                <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-[var(--primary-blue)] to-[var(--primary-blue-light)] flex items-center justify-center shadow-lg shadow-blue-500/20">
                                <AlertCircle className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <CardTitle className="text-xl font-bold text-[var(--text-primary)]">
                                    Actions Required
                                </CardTitle>
                                <p className="text-sm text-[var(--text-secondary)] mt-1">
                                    {actions.length} {actions.length === 1 ? 'item needs' : 'items need'} your attention
                                </p>
                            </div>
                        </div>

                        {/* Priority indicator */}
                        <div className="hidden sm:flex items-center gap-2">
                            {actions.some(a => a.priority === 'critical') && (
                                <span className="px-2 py-1 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 text-xs font-bold uppercase tracking-wide">
                                    Urgent
                                </span>
                            )}
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="space-y-3 pt-0">
                    {actions.map((action, index) => {
                        const Icon = iconMap[action.type] || AlertCircle;
                        const styles = priorityStyles[action.priority];

                        return (
                            <motion.div
                                key={action.id}
                                variants={itemVariants}
                                initial="hidden"
                                animate="visible"
                                transition={{ delay: index * 0.1 }}
                                className={cn(
                                    "p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4",
                                    "transition-all duration-200 hover:shadow-md group",
                                    styles.bg,
                                    styles.border
                                )}
                            >
                                <div className="flex items-start sm:items-center gap-4 flex-1">
                                    <div className={cn(
                                        "h-12 w-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm",
                                        styles.iconBg
                                    )}>
                                        <Icon className={cn("h-6 w-6", styles.text)} />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                            <h4 className={cn("font-semibold text-base", styles.text)}>
                                                {action.title}
                                            </h4>
                                            {action.count && action.count > 0 && (
                                                <Badge className={cn("text-xs font-bold", styles.badge)}>
                                                    {action.count}
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="text-sm text-[var(--text-secondary)] line-clamp-2">
                                            {action.description}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 sm:shrink-0">
                                    <Link href={action.actionUrl} className="flex-1 sm:flex-none">
                                        <Button
                                            variant="primary"
                                            size="sm"
                                            className="w-full sm:w-auto shadow-sm hover:shadow-md transition-shadow"
                                        >
                                            {action.actionLabel}
                                        </Button>
                                    </Link>
                                </div>
                            </motion.div>
                        );
                    })}
                </CardContent>
            </Card>
        </motion.div>
    );
}

function ActionsRequiredSkeleton() {
    return (
        <Card className="border-[var(--border-subtle)] bg-[var(--bg-primary)]">
            <CardHeader>
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-[var(--bg-tertiary)] animate-pulse" />
                    <div className="space-y-2">
                        <div className="h-5 w-40 bg-[var(--bg-tertiary)] rounded animate-pulse" />
                        <div className="h-4 w-28 bg-[var(--bg-tertiary)] rounded animate-pulse" />
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
                {[1, 2, 3].map((i) => (
                    <div
                        key={i}
                        className="h-24 bg-[var(--bg-tertiary)] rounded-2xl animate-pulse"
                        style={{ animationDelay: `${i * 100}ms` }}
                    />
                ))}
            </CardContent>
        </Card>
    );
}

export default ActionsRequired;
