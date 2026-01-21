/**
 * SmartInsightsPanel - AI-powered actionable recommendations
 *
 * Psychology: Business partner mindset - proactive problem solving
 * UX: Rich visualizations with impact bars, confidence indicators, and visual hierarchy
 *
 * Features:
 * - Visual impact bars showing projected savings/improvements
 * - Confidence indicators with progress visualization
 * - One-click actions with clear CTAs
 * - Priority-based visual hierarchy
 * - Social proof for trust building
 * - Responsive carousel on mobile, grid on desktop
 *
 * Research: Miller's Law (3-5 insights max), Decision Fatigue (one action per insight)
 */

'use client';

import { useState } from 'react';
import { TrendingUp, Check, ChevronRight, Target, Shield, Zap, TrendingDown, ChevronLeft, Users } from 'lucide-react';
import { useIsMobile } from '../../../hooks/ux';
import { motion, AnimatePresence } from 'framer-motion';
import { SmartInsight } from '../../../lib/mockData/enhanced';
import { trackEvent, EVENTS } from '../../../lib/analytics';

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
    const [currentIndex, setCurrentIndex] = useState(0);
    const [appliedInsights, setAppliedInsights] = useState<Set<string>>(new Set());

    // Mobile: Carousel with one insight at a time
    // Desktop: Show all insights in grid (max 3)
    const displayedInsights = isMobile ? [insights[currentIndex]] : insights.slice(0, 3);

    const handlePrevious = () => {
        setCurrentIndex((prev) => (prev === 0 ? insights.length - 1 : prev - 1));
        trackEvent(EVENTS.SMART_INSIGHTS_CAROUSEL_PREVIOUS, { index: currentIndex });
    };

    const handleNext = () => {
        setCurrentIndex((prev) => (prev === insights.length - 1 ? 0 : prev + 1));
        trackEvent(EVENTS.SMART_INSIGHTS_CAROUSEL_NEXT, { index: currentIndex });
    };

    const handleApply = (insightId: string) => {
        trackEvent(EVENTS.SMART_INSIGHT_APPLIED, {
            insightId,
            insightType: insights.find(i => i.id === insightId)?.type
        });
        setAppliedInsights(prev => new Set(prev).add(insightId));
        onApply?.(insightId);

        // Reset after 2 seconds
        setTimeout(() => {
            setAppliedInsights(prev => {
                const next = new Set(prev);
                next.delete(insightId);
                return next;
            });
        }, 2000);
    };

    if (insights.length === 0) return null;

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between px-1">
                <div>
                    <h2 className="text-lg font-bold text-[var(--text-primary)]">
                        Smart Recommendations
                    </h2>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                        AI-powered insights to optimize your business
                    </p>
                </div>

                {/* Mobile carousel controls */}
                {isMobile && insights.length > 1 && (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handlePrevious}
                            className="p-1.5 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
                            aria-label="Previous insight"
                        >
                            <ChevronLeft className="w-4 h-4 text-[var(--text-secondary)]" />
                        </button>
                        <span className="text-xs text-[var(--text-secondary)] font-medium">
                            {currentIndex + 1}/{insights.length}
                        </span>
                        <button
                            onClick={handleNext}
                            className="p-1.5 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
                            aria-label="Next insight"
                        >
                            <ChevronRight className="w-4 h-4 text-[var(--text-secondary)]" />
                        </button>
                    </div>
                )}

                {/* Desktop: View all link */}
                {!isMobile && insights.length > 3 && (
                    <a
                        href="/seller/insights"
                        className="text-sm font-medium text-[var(--primary-blue)] hover:text-[var(--primary-blue-deep)] flex items-center gap-1 transition-colors"
                    >
                        View All
                        <ChevronRight className="w-4 h-4" />
                    </a>
                )}
            </div>

            {/* Insights Grid/Carousel */}
            <div className={isMobile ? 'relative min-h-[280px]' : 'grid gap-4 md:grid-cols-2 xl:grid-cols-3'}>
                <AnimatePresence mode="wait">
                    {displayedInsights.map((insight, index) => {
                        const config = typeConfig[insight.type as keyof typeof typeConfig];
                        const Icon = config.icon;
                        const isApplied = appliedInsights.has(insight.id);
                        const confidencePercent = Math.round(insight.confidence * 100);

                        return (
                            <motion.div
                                key={insight.id}
                                initial={{ opacity: 0, x: isMobile ? 20 : 0, y: isMobile ? 0 : 20 }}
                                animate={{ opacity: 1, x: 0, y: 0 }}
                                exit={{ opacity: 0, x: isMobile ? -20 : 0, y: isMobile ? 0 : -20 }}
                                transition={{
                                    delay: isMobile ? 0 : index * 0.08,
                                    duration: 0.3
                                }}
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

                                    {/* Impact Visualization */}
                                    <div className="space-y-3 mb-4">
                                        {/* Impact metric with visual bar */}
                                        <div className="space-y-1.5">
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="text-[var(--text-secondary)] font-medium">
                                                    Projected Impact
                                                </span>
                                                <span
                                                    className="font-bold"
                                                    style={{ color: config.accentColor }}
                                                >
                                                    {insight.impact.formatted}
                                                </span>
                                            </div>
                                            {/* Visual progress bar */}
                                            <div className="h-1.5 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                                                <motion.div
                                                    className="h-full rounded-full"
                                                    style={{ backgroundColor: config.accentColor }}
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${confidencePercent}%` }}
                                                    transition={{ delay: 0.2, duration: 0.8, ease: 'easeOut' }}
                                                />
                                            </div>
                                            <div className="flex items-center justify-between text-[10px]">
                                                <span className="text-[var(--text-tertiary)]">
                                                    Confidence: {confidencePercent}%
                                                </span>
                                                {insight.projectedImpact?.additionalCost && (
                                                    <span className="text-orange-600 dark:text-orange-400">
                                                        Cost: ₹{insight.projectedImpact.additionalCost.toLocaleString()}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Social proof */}
                                        <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-tertiary)]">
                                            <Users className="w-3 h-3" />
                                            <span>{insight.socialProof}</span>
                                        </div>
                                    </div>

                                    {/* Action Footer */}
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
                                            <AnimatePresence mode="wait">
                                                {!isApplied ? (
                                                    <motion.button
                                                        key="apply"
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                        exit={{ opacity: 0 }}
                                                        onClick={() => handleApply(insight.id)}
                                                        className="flex items-center gap-2 bg-[var(--primary-blue)] hover:bg-[var(--primary-blue-deep)] text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm shadow-sm"
                                                    >
                                                        <Check className="w-4 h-4" />
                                                        Apply Now
                                                    </motion.button>
                                                ) : (
                                                    <motion.div
                                                        key="applied"
                                                        initial={{ scale: 0.9, opacity: 0 }}
                                                        animate={{ scale: 1, opacity: 1 }}
                                                        exit={{ scale: 0.9, opacity: 0 }}
                                                        className="flex items-center gap-2 text-green-600 dark:text-green-400 font-medium text-sm"
                                                    >
                                                        <Check className="w-4 h-4" />
                                                        Applied!
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
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
                                        {insight.action.type === 'enable_feature' && (
                                            <button
                                                onClick={() => handleApply(insight.id)}
                                                className="flex items-center gap-2 bg-[var(--primary-blue)] hover:bg-[var(--primary-blue-deep)] text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm shadow-sm"
                                            >
                                                {insight.action.label}
                                            </button>
                                        )}
                                    </div>

                                    {/* Cost impact warning */}
                                    {insight.action.costImpact && (
                                        <p className="text-[10px] text-orange-600 dark:text-orange-400 mt-2 text-center">
                                            {insight.action.costImpact}
                                        </p>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>

            {/* Mobile dot indicators */}
            {isMobile && insights.length > 1 && (
                <div className="flex justify-center gap-1.5 pt-2">
                    {insights.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => setCurrentIndex(index)}
                            className={`h-1.5 rounded-full transition-all ${
                                index === currentIndex
                                    ? 'w-6 bg-[var(--primary-blue)]'
                                    : 'w-1.5 bg-[var(--border-subtle)]'
                            }`}
                            aria-label={`Go to insight ${index + 1}`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
