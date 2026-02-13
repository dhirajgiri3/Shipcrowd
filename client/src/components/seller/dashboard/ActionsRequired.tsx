"use client";

/**
 * ====================================================================================================
 * COMPONENT DESIGN PHILOSOPHY: Action Center
 * ====================================================================================================
 * 
 * CORE CONCEPT: "Immersive Priority Grid"
 * Moving away from traditional list views, this component treats actionable items as "Premium Cards"
 * that command attention without shouting. The goal is to make "work" feel "gratifying".
 * 
 * 1. VISUAL HIERARCHY & TYPOGRAPHY:
 *    - We use a strict typographic scale to ensure readability and prestige.
 *    - HEADLINES (Action Titles) are `text-sm` but `font-bold` to act as swift navigational anchors.
 *    - NUMBERS (Counts) are large (`text-3xl`), tracking-tight, and partially opaque to serve as 
 *      visual texture rather than just data. They provide immediate scale context.
 * 
 * 2. COLOR THEORY & PSYCHOLOGY:
 *    - Instead of generic "Status Colors", we use "Contextual Gradients".
 *    - NOT just Red/Green/Blue, but Rose, Emerald, and Amber washes.
 *    - Light Mode: Clean `bg-white` with subtle warmth/coolness drawn from the borders.
 *    - Dark Mode: Deep `zinc-900` richness that allows the neon accents to pop.
 *    - KYC (Green): Represents Trust, ID, Verification.
 *    - Orders (Blue): Represents Flux, Movement, Business.
 *    - Wallet (Amber/Orange): Represents Caution, Value, Gold.
 * 
 * 3. SPATIAL DYNAMICS:
 *    - GRID: A robust 4-column grid creates a sense of "Dashboard Command".
 *    - DEPTH: We use `hover:-translate-y-1` combined with shadow bloom to make cards feel physical.
 *    - BUTTONS: Bottom-aligned "Action Anchors" that span the width but feel lightweight.
 * 
 * ====================================================================================================
 */

import { motion } from "framer-motion";
import {
    AlertCircle,
    Package,
    Wallet,
    Shield,
    CheckCircle2,
    AlertTriangle,
    ArrowRight,
    Megaphone,
    Truck,
    Scale
} from "lucide-react";
import { cn } from "@/src/lib/utils";
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
    ndr_pending: AlertTriangle,
    low_wallet: Wallet,
    kyc_pending: Shield,
    weight_dispute: Scale,
};

// Refined Styles - Lighter, Cleaner, Semantic Colors
const colors = {
    rose: { // Critical / NDR
        border: "border-rose-100 dark:border-rose-900/40",
        gradient: "from-rose-500/5 to-rose-500/3",
        icon_bg: "bg-rose-500",
        icon_text: "text-white",
        title: "text-rose-950 dark:text-rose-50",
        btn_text: "text-rose-600 dark:text-rose-400",
        btn_hover_bg: "group-hover:bg-rose-50 dark:group-hover:bg-rose-900/20"
    },
    emerald: { // KYC / Success / Verification
        border: "border-emerald-100 dark:border-emerald-900/40",
        gradient: "from-emerald-500/5 to-emerald-500/3",
        icon_bg: "bg-emerald-500",
        icon_text: "text-white",
        title: "text-emerald-950 dark:text-emerald-50",
        btn_text: "text-emerald-600 dark:text-emerald-400",
        btn_hover_bg: "group-hover:bg-emerald-50 dark:group-hover:bg-emerald-900/20"
    },
    amber: { // Wallet / Warning
        border: "border-amber-100 dark:border-amber-900/40",
        gradient: "from-amber-500/5 to-amber-500/3",
        icon_bg: "bg-amber-500",
        icon_text: "text-white",
        title: "text-amber-950 dark:text-amber-50",
        btn_text: "text-amber-600 dark:text-amber-400",
        btn_hover_bg: "group-hover:bg-amber-50 dark:group-hover:bg-amber-900/20"
    },
    blue: { // Orders / Neutral
        border: "border-blue-100 dark:border-blue-900/40",
        gradient: "from-blue-500/5 to-blue-500/3",
        icon_bg: "bg-blue-600",
        icon_text: "text-white",
        title: "text-blue-950 dark:text-blue-50",
        btn_text: "text-blue-600 dark:text-blue-400",
        btn_hover_bg: "group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20"
    },
    violet: { // Disputes / Legal
        border: "border-violet-100 dark:border-violet-900/40",
        gradient: "from-violet-500/5 to-violet-500/3",
        icon_bg: "bg-violet-600",
        icon_text: "text-white",
        title: "text-violet-950 dark:text-violet-50",
        btn_text: "text-violet-600 dark:text-violet-400",
        btn_hover_bg: "group-hover:bg-violet-50 dark:group-hover:bg-violet-900/20"
    }
};

const typeToColorMap: Record<string, keyof typeof colors> = {
    'orders_ready': 'blue',
    'ndr_pending': 'rose',
    'low_wallet': 'emerald',
    'kyc_pending': 'violet', // Specific Request: Green for KYC
    'weight_dispute': 'violet',
};

const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
};

export function ActionsRequired({ actions, isLoading }: ActionsRequiredProps) {
    if (isLoading) return <ActionsSkeleton />;
    if (!actions?.length) return <AllGoodState />;

    return (
        <section className="space-y-6">
            <div className="flex items-center gap-3 px-1">
                <div className="p-2 rounded-xl bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border-subtle)] shadow-sm">
                    <Megaphone className="w-5 h-5" strokeWidth={2} />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-[var(--text-primary)] tracking-tight">
                        Action Center
                    </h2>
                    <p className="text-xs text-[var(--text-secondary)] font-medium">
                        {actions.length} items require your attention
                    </p>
                </div>
            </div>

            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5"
            >
                {actions.map((action) => {
                    const Icon = iconMap[action.type] || AlertCircle;
                    const colorKey = typeToColorMap[action.type] || 'blue';
                    const theme = colors[colorKey];

                    return (
                        <motion.div
                            key={action.id}
                            variants={cardVariants}
                            whileHover={{ y: -4 }}
                            className={cn(
                                "group relative flex flex-col justify-between overflow-hidden rounded-3xl border bg-[var(--bg-primary)] transition-all duration-300",
                                theme.border,
                                "hover:shadow-lg"
                            )}
                        >
                            {/* Ambient Gradient */}
                            <div className={cn("absolute inset-0 bg-gradient-to-br opacity-100", theme.gradient)} />

                            {/* Decorative Top Line */}
                            <div className={cn("absolute top-0 inset-x-0 h-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300", theme.icon_bg)} />

                            {/* Content */}
                            <div className="relative p-5">
                                <div className="flex justify-between items-start mb-4">
                                    <div className={cn(
                                        "h-12 w-12 rounded-2xl flex items-center justify-center shadow-md transform group-hover:scale-105 transition-all duration-300",
                                        theme.icon_bg,
                                        theme.icon_text
                                    )}>
                                        <Icon className="w-6 h-6" strokeWidth={2} />
                                    </div>
                                    {action.count !== undefined && action.count > 0 && (
                                        <div className="flex flex-col items-end">
                                            <span className={cn("text-3xl font-extrabold tracking-tight opacity-90", theme.title)}>
                                                {action.count}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-1.5 mb-4">
                                    <h3 className={cn("text-xs font-bold tracking-tight uppercase", theme.title)}>
                                        {action.title}
                                    </h3>
                                    <p className="text-[13px] leading-5 text-[var(--text-secondary)] font-medium line-clamp-2">
                                        {action.description}
                                    </p>
                                </div>
                            </div>

                            {/* Footer / Action Area */}
                            <div className="relative mt-auto px-5 pb-5 w-full">
                                <Link href={action.actionUrl} className="block w-full">
                                    <button className={cn(
                                        "w-full flex items-center justify-between py-2 px-4 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all duration-200 border border-transparent",
                                        theme.btn_text,
                                        theme.btn_hover_bg,
                                        "hover:pl-5 hover:pr-3"
                                    )}>
                                        <span>{action.actionLabel}</span>
                                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" strokeWidth={2.5} />
                                    </button>
                                </Link>
                            </div>
                        </motion.div>
                    );
                })}
            </motion.div>
        </section>
    );
}

function AllGoodState() {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-3xl border border-dashed border-[var(--border-subtle)] bg-[var(--bg-secondary)]/10 p-12 text-center"
        >
            <div className="mx-auto mb-6 h-20 w-20 rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] flex items-center justify-center shadow-sm">
                <CheckCircle2 className="w-10 h-10 text-[var(--success)]" strokeWidth={1.5} />
            </div>
            <h3 className="text-xl font-bold text-[var(--text-primary)]">All Caught Up!</h3>
            <p className="text-sm text-[var(--text-secondary)] mt-2 max-w-sm mx-auto">
                Excellent work! Your dashboard is clear of any pending actions.
            </p>
        </motion.div>
    );
}

function ActionsSkeleton() {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3 px-1 opacity-50">
                <div className="h-8 w-8 rounded-lg bg-[var(--bg-secondary)] animate-pulse" />
                <div className="h-4 w-32 bg-[var(--bg-secondary)] animate-pulse" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-64 rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] animate-pulse" />
                ))}
            </div>
        </div>
    );
}

export default ActionsRequired;
