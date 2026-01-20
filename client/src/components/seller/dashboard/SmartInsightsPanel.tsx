/**
 * SmartInsightsPanel - Redesigned for professional, minimal UI
 * Removed: Emojis, sparkles, confidence scores, social proof manipulation
 * Added: Clean accent borders, focused CTAs, actionable recommendations
 */

'use client';

import { TrendingUp, Check, ChevronRight, Target, Shield, Zap, TrendingDown } from 'lucide-react';
import { useIsMobile } from '../../../hooks/ux';
import { motion } from 'framer-motion';
import { SmartInsight } from '../../../lib/mockData/enhanced';

interface SmartInsightsPanelProps {
    insights: SmartInsight[];
    onApply?: (insightId: string) => void;
}

const typeConfig = {
    cost_saving: {
        icon: TrendingDown,
        accentColor: 'var(--success)',
        label: 'Cost Optimization'
    },
    rto_prevention: {
        icon: Shield,
        accentColor: 'var(--error)',
        label: 'Risk Prevention'
    },
    delivery_optimization: {
        icon: Zap,
        accentColor: 'var(--info)',
        label: 'Speed Improvement'
    },
    growth_opportunity: {
        icon: Target,
        accentColor: 'var(--primary-blue)',
        label: 'Growth Opportunity'
    }
};

export function SmartInsightsPanel({ insights, onApply }: SmartInsightsPanelProps) {
    const isMobile = useIsMobile();

    // Show top 3 insights on mobile, all on desktop
    const displayedInsights = isMobile ? insights.slice(0, 3) : insights;

    if (insights.length === 0) return null;

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between px-1">
                <div>
                    <h2 className="text-lg font-bold text-[var(--text-primary)]">
                        Recommendations
                    </h2>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                        Actionable insights to improve your business
                    </p>
                </div>
                {insights.length > 3 && isMobile && (
                    <a
                        href="/seller/insights"
                        className="text-sm font-medium text-[var(--primary-blue)] hover:text-[var(--primary-blue-deep)] flex items-center gap-1 transition-colors"
                    >
                        View All
                        <ChevronRight className="w-4 h-4" />
                    </a>
                )}
            </div>

            {/* Insights */}
            <div className="space-y-3">
                {displayedInsights.map((insight, index) => {
                    const config = typeConfig[insight.type as keyof typeof typeConfig];
                    const Icon = config.icon;

                    return (
                        <motion.div
                            key={insight.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.08, duration: 0.3 }}
                            className="relative bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-subtle)] overflow-hidden shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-all duration-200"
                        >
                            {/* Accent Border */}
                            <div
                                className="absolute left-0 top-0 bottom-0 w-1"
                                style={{ backgroundColor: config.accentColor }}
                            />

                            <div className="p-5 pl-6">
                                {/* Header */}
                                <div className="flex items-start gap-4 mb-4">
                                    <div
                                        className="flex-shrink-0 p-2 rounded-lg"
                                        style={{
                                            backgroundColor: `${config.accentColor}15`,
                                            color: config.accentColor
                                        }}
                                    >
                                        <Icon className="w-5 h-5" />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span
                                                className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md"
                                                style={{
                                                    backgroundColor: `${config.accentColor}15`,
                                                    color: config.accentColor
                                                }}
                                            >
                                                {config.label}
                                            </span>
                                            {insight.priority === 'high' && (
                                                <span className="px-2 py-0.5 text-[10px] font-bold bg-[var(--error-bg)] text-[var(--error)] rounded-md uppercase tracking-wide">
                                                    High Impact
                                                </span>
                                            )}
                                        </div>
                                        <h3 className="font-bold text-[var(--text-primary)] mb-2 leading-tight">
                                            {insight.title}
                                        </h3>
                                        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                                            {insight.description}
                                        </p>
                                    </div>
                                </div>

                                {/* Impact Metric & Action */}
                                <div className="flex items-center justify-between gap-4 pt-4 border-t border-[var(--border-subtle)]">
                                    <div
                                        className="flex items-center gap-2 font-bold text-sm px-3 py-2 rounded-lg"
                                        style={{
                                            backgroundColor: `${config.accentColor}10`,
                                            color: config.accentColor
                                        }}
                                    >
                                        <TrendingUp className="w-4 h-4" />
                                        {insight.impact.formatted}
                                    </div>

                                    {insight.action.type === 'auto_apply' && (
                                        <button
                                            onClick={() => onApply?.(insight.id)}
                                            className="flex items-center gap-2 bg-[var(--primary-blue)] hover:bg-[var(--primary-blue-deep)] text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm shadow-sm"
                                        >
                                            <Check className="w-4 h-4" />
                                            Apply Now
                                        </button>
                                    )}
                                    {insight.action.type === 'manual' && (
                                        <a
                                            href="#"
                                            className="flex items-center gap-2 text-[var(--primary-blue)] hover:text-[var(--primary-blue-deep)] font-medium text-sm transition-colors"
                                        >
                                            {insight.action.label}
                                            <ChevronRight className="w-4 h-4" />
                                        </a>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}
