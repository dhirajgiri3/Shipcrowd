/**
 * SmartInsightsPanel - Priority 3 in information hierarchy
 * Psychology: Business partner mindset - proactive recommendations
 * 
 * Shows AI-powered actionable insights with:
 * - Clear impact projection
 * - Social proof
 * - One-click actions
 * - Confidence scores
 */

'use client';

import { Sparkles, TrendingUp, Check, ChevronRight } from 'lucide-react';
import { useIsMobile } from '../../../hooks/ux';
import { motion } from 'framer-motion';
import { SmartInsight } from '../../../lib/mockData/enhanced';

interface SmartInsightsPanelProps {
    insights: SmartInsight[];
    onApply?: (insightId: string) => void;
}

const typeIcons = {
    cost_saving: '💰',
    rto_prevention: '🛡️',
    delivery_optimization: '⚡',
    growth_opportunity: '📈'
};

const typeColors = {
    cost_saving: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    rto_prevention: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
    delivery_optimization: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',
    growth_opportunity: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
};

export function SmartInsightsPanel({ insights, onApply }: SmartInsightsPanelProps) {
    const isMobile = useIsMobile();

    // Show top 3 insights on mobile, all on desktop
    const displayedInsights = isMobile ? insights.slice(0, 3) : insights;

    return (
        <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-blue-500" />
                    Smart Recommendations
                </h2>
                {insights.length > 3 && isMobile && (
                    <a
                        href="/seller/insights"
                        className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                    >
                        View All
                        <ChevronRight className="w-4 h-4" />
                    </a>
                )}
            </div>

            {/* Insights */}
            <div className="space-y-3">
                {displayedInsights.map((insight, index) => (
                    <motion.div
                        key={insight.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={`
              rounded-lg border-2 p-4 
              ${typeColors[insight.type as keyof typeof typeColors]}
            `}
                    >
                        {/* Header */}
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex items-start gap-3 flex-1">
                                <div className="text-2xl">
                                    {typeIcons[insight.type as keyof typeof typeIcons]}
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                                        {insight.title}
                                    </h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        {insight.description}
                                    </p>
                                </div>
                            </div>
                            {insight.priority === 'high' && (
                                <span className="px-2 py-1 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full ml-2">
                                    High Priority
                                </span>
                            )}
                        </div>

                        {/* Impact & Social Proof */}
                        <div className="flex items-center gap-4 mb-3 text-sm">
                            <div className="flex items-center gap-1 font-semibold text-green-700 dark:text-green-400">
                                <TrendingUp className="w-4 h-4" />
                                {insight.impact.formatted}
                            </div>
                            <div className="text-gray-600 dark:text-gray-400">
                                {insight.socialProof}
                            </div>
                        </div>

                        {/* Confidence Score */}
                        <div className="mb-3">
                            <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                                <span>Confidence</span>
                                <span>{Math.round(insight.confidence * 100)}%</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${insight.confidence * 100}%` }}
                                    transition={{ delay: index * 0.1 + 0.3, duration: 0.5 }}
                                    className="bg-blue-600 dark:bg-blue-400 h-1.5 rounded-full"
                                />
                            </div>
                        </div>

                        {/* Action Button */}
                        {insight.action.type === 'auto_apply' && (
                            <button
                                onClick={() => onApply?.(insight.id)}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                                <Check className="w-4 h-4" />
                                {insight.action.label}
                            </button>
                        )}
                        {insight.action.type === 'manual' && (
                            <a
                                href="#"
                                className="w-full bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 font-medium py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                                {insight.action.label}
                                <ChevronRight className="w-4 h-4" />
                            </a>
                        )}
                    </motion.div>
                ))}
            </div>

            {/* Empty State */}
            {insights.length === 0 && (
                <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700">
                    <Sparkles className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 dark:text-gray-400">
                        No recommendations right now. Check back later!
                    </p>
                </div>
            )}
        </div>
    );
}
