/**
 * UrgentActionsBar - Priority 1 in information hierarchy
 * Psychology: Loss aversion - highlight what needs immediate attention
 */

'use client';

import { useRouter } from 'next/navigation';
import { AlertCircle, Package, Wallet, TrendingDown, XCircle, ArrowRightCircle } from 'lucide-react';
import { useIsMobile } from '../../../hooks/ux';
import { motion } from 'framer-motion';
import { SwipeableCard } from '@/src/components/patterns/SwipeableCard';
import { useState } from 'react';

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

export function UrgentActionsBar({ actions }: UrgentActionsBarProps) {
    const isMobile = useIsMobile();
    const router = useRouter();
    const [dismissedIds, setDismissedIds] = useState<string[]>([]);

    if (actions.length === 0) return null;

    const visibleActions = actions.filter(action => !dismissedIds.includes(action.id));

    if (visibleActions.length === 0) return null;

    const handleDismiss = (id: string) => {
        setDismissedIds(prev => [...prev, id]);
        // toast.success('Action dismissed');
    };

    const handleAction = (url: string) => {
        router.push(url);
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between px-1">
                <h2 className="text-[var(--text-title-md)] font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <div className="relative flex h-5 w-5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--error)] opacity-20"></span>
                        <AlertCircle className="relative inline-flex h-5 w-5 text-[var(--error)]" />
                    </div>
                    Needs Attention
                </h2>
                {visibleActions.length > 0 && (
                    <span className="px-3 py-1 text-xs font-bold bg-[var(--error-bg)] text-[var(--error)] rounded-full border border-[var(--error-border)]">
                        {visibleActions.length} {visibleActions.length === 1 ? 'Action' : 'Actions'}
                    </span>
                )}
            </div>

            {/* Actions Grid/List */}
            <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2 lg:grid-cols-4'}`}>
                {visibleActions.map((action, index) => {
                    const Icon = iconMap[action.type];
                    // high -> error, medium -> warning
                    const isHigh = action.severity === 'high';

                    // define theme variables dynamically based on severity
                    const bgVar = isHigh ? 'var(--error-bg)' : 'var(--warning-bg)';
                    const borderVar = isHigh ? 'var(--error-border)' : 'var(--warning-border)'; // Using border var if available, else standard fallback
                    const textVar = isHigh ? 'var(--error)' : 'var(--warning)';
                    const badgeBgVar = isHigh ? 'var(--error)' : 'var(--warning)';

                    // Since CSS variables for border opacity might not exist explicitly in all cases, we use class utilities that reference variables
                    // But we want to be strict. Let's use standard border colors with opacity utility.

                    const CardContent = (
                        <div className={`
                            relative h-full p-5 rounded-[var(--radius-xl)] border transition-all duration-[var(--duration-base)]
                            bg-[color:var(--bg-primary)] 
                            hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5
                            group
                        `}
                            style={{
                                borderColor: `var(${isHigh ? '--error' : '--warning'})`, // Fallback or strict
                                backgroundColor: isHigh ? 'var(--error-bg)' : 'var(--warning-bg)'
                            }}
                        >
                            <div className="flex items-start gap-4">
                                {/* Icon Wrapper */}
                                <div
                                    className="flex-shrink-0 p-2.5 rounded-[var(--radius-lg)] bg-[var(--bg-primary)] border"
                                    style={{ borderColor: `rgba(${isHigh ? '239, 68, 68' : '234, 179, 8'}, 0.2)` }} // Fallback for pure css var manipulation
                                >
                                    <Icon
                                        className="w-5 h-5"
                                        style={{ color: `var(${isHigh ? '--error' : '--warning'})` }}
                                    />
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <h3 className="text-sm font-bold text-[var(--text-primary)] truncate">
                                            {action.title}
                                        </h3>
                                        {action.count !== undefined && (
                                            <span
                                                className="px-1.5 py-0.5 text-[10px] font-bold rounded-full text-white leading-none"
                                                style={{ backgroundColor: `var(${isHigh ? '--error' : '--warning'})` }}
                                            >
                                                {action.count}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-[var(--text-secondary)] mb-3 line-clamp-2 leading-relaxed">
                                        {action.description}
                                    </p>
                                    <div
                                        className="text-xs font-bold inline-flex items-center gap-1.5 transition-colors group-hover:underline decoration-2 underline-offset-2"
                                        style={{ color: `var(${isHigh ? '--error' : '--warning'})` }}
                                    >
                                        {action.ctaLabel}
                                        <ArrowRightCircle className="w-4 h-4" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    );

                    if (isMobile) {
                        return (
                            <SwipeableCard
                                key={action.id}
                                onSwipeLeft={() => handleDismiss(action.id)}
                                onSwipeRight={() => handleAction(action.ctaUrl)}
                                leftAction={{ icon: <XCircle className="w-6 h-6" />, label: 'Dismiss', color: 'red' }}
                                rightAction={{ icon: <ArrowRightCircle className="w-6 h-6" />, label: 'Open', color: 'blue' }}
                            >
                                {CardContent}
                            </SwipeableCard>
                        );
                    }

                    return (
                        <motion.button
                            key={action.id}
                            onClick={() => handleAction(action.ctaUrl)}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="block w-full text-left h-full"
                        >
                            {CardContent}
                        </motion.button>
                    );
                })}
            </div>
        </div>
    );
}
