/**
 * SmartInsightsPanel - Simplified AI-powered recommendations
 * 
 * Streamlined version: Simple card grid, no carousel, no tracking
 */

'use client';

import { TrendingDown, Shield, Package, Zap, Target, Info } from 'lucide-react';
import { motion } from 'framer-motion';
// ✅ FIXED: Using real API type definition instead of mock data
import type { SmartInsight } from '@/src/core/api/hooks/analytics/useSmartInsights';

interface SmartInsightsPanelProps {
    insights: SmartInsight[];
    onApply?: (insightId: string) => void;
}

const typeConfig: Record<SmartInsight['type'], { icon: any; accentColor: string; label: string }> = {
    cost_saving: {
        icon: TrendingDown,
        accentColor: 'var(--success)',
        label: 'Cost Optimization'
    },
    rto_prevention: {
        icon: Shield,
        accentColor: 'var(--error)',
        label: 'RTO Prevention'
    },
    efficiency: {
        icon: Package,
        accentColor: 'var(--warning)',
        label: 'Efficiency'
    },
    speed: {
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
    if (!insights || insights.length === 0) {
        return null;
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3 px-1">
                <div className="p-2 rounded-lg bg-gradient-to-br from-[var(--primary-blue)]/20 to-[var(--primary-blue)]/10">
                    <Info className="w-5 h-5 text-[var(--primary-blue)]" />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-[var(--text-primary)]">
                        Smart Insights
                    </h2>
                    <p className="text-xs text-[var(--text-secondary)]">
                        AI-powered recommendations to improve your business
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {insights.map((insight, index) => {
                    const config = typeConfig[insight.type as keyof typeof typeConfig];
                    const Icon = config.icon;

                    return (
                        <motion.div
                            key={insight.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] hover:border-[var(--border-default)] transition-colors"
                        >
                            <div className="flex items-start gap-3 mb-3">
                                <div
                                    className="p-2 rounded-lg"
                                    style={{ backgroundColor: `${config.accentColor}20` }}
                                >
                                    <Icon className="w-4 h-4" style={{ color: config.accentColor }} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">
                                        {insight.title}
                                    </h3>
                                    <p className="text-xs text-[var(--text-secondary)]">
                                        {insight.description}
                                    </p>
                                </div>
                            </div>

                            {insight.impact && (
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="text-xs text-[var(--text-secondary)]">Impact:</span>
                                    <span
                                        className="text-xs font-medium"
                                        style={{ color: config.accentColor }}
                                    >
                                        {typeof insight.impact === 'string' ? insight.impact : insight.impact.formatted}
                                    </span>
                                </div>
                            )}

                            {onApply && (
                                <button
                                    onClick={() => onApply(insight.id)}
                                    className="w-full px-3 py-2 text-xs font-medium rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)] transition-colors"
                                >
                                    {insight.action?.label || 'Apply Recommendation'}
                                </button>
                            )}
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}
