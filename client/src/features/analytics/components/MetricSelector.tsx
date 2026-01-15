/**
 * Metric Selector Component
 * 
 * Multi-select metric picker with categories for custom report builder.
 * Features search, select all/none functionality, and beautiful UI.
 */

'use client';

import { useState } from 'react';
import { Check, Search, X } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { AVAILABLE_METRICS, type AnalyticsMetric, type MetricCategory } from '@/src/types/api/analytics.types';

interface MetricSelectorProps {
    selected: string[];
    onChange: (metrics: string[]) => void;
    maxSelection?: number;
}

const categoryLabels: Record<MetricCategory, string> = {
    volume: 'Volume Metrics',
    performance: 'Performance Metrics',
    financial: 'Financial Metrics',
    time: 'Time Metrics',
    quality: 'Quality Metrics',
};

const categoryColors: Record<MetricCategory, string> = {
    volume: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    performance: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    financial: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    time: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    quality: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
};

export function MetricSelector({ selected, onChange, maxSelection }: MetricSelectorProps) {
    const [searchQuery, setSearchQuery] = useState('');

    // Group metrics by category
    const metricsByCategory = AVAILABLE_METRICS.reduce((acc, metric) => {
        if (!acc[metric.category]) {
            acc[metric.category] = [];
        }
        acc[metric.category].push(metric);
        return acc;
    }, {} as Record<MetricCategory, AnalyticsMetric[]>);

    // Filter metrics by search
    const filteredCategories = Object.entries(metricsByCategory).reduce((acc, [category, metrics]) => {
        const filtered = metrics.filter(metric =>
            metric.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            metric.description.toLowerCase().includes(searchQuery.toLowerCase())
        );
        if (filtered.length > 0) {
            acc[category as MetricCategory] = filtered;
        }
        return acc;
    }, {} as Record<MetricCategory, AnalyticsMetric[]>);

    const toggleMetric = (metricId: string) => {
        if (selected.includes(metricId)) {
            onChange(selected.filter(id => id !== metricId));
        } else {
            if (maxSelection && selected.length >= maxSelection) {
                return; // Max selection reached
            }
            onChange([...selected, metricId]);
        }
    };

    const selectAllInCategory = (category: MetricCategory) => {
        const categoryMetrics = metricsByCategory[category].map(m => m.id);
        const newSelected = Array.from(new Set([...selected, ...categoryMetrics]));
        onChange(newSelected.slice(0, maxSelection));
    };

    const deselectAllInCategory = (category: MetricCategory) => {
        const categoryMetrics = metricsByCategory[category].map(m => m.id);
        onChange(selected.filter(id => !categoryMetrics.includes(id)));
    };

    const clearAll = () => {
        onChange([]);
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Select Metrics
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        {selected.length} selected{maxSelection && ` of ${maxSelection} max`}
                    </p>
                </div>
                {selected.length > 0 && (
                    <button
                        onClick={clearAll}
                        className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium"
                    >
                        Clear All
                    </button>
                )}
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search metrics..."
                    className="w-full pl-10 pr-10 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                {searchQuery && (
                    <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Category Sections */}
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                {Object.entries(filteredCategories).map(([category, metrics]) => {
                    const cat = category as MetricCategory;
                    const allSelected = metrics.every(m => selected.includes(m.id));
                    const someSelected = metrics.some(m => selected.includes(m.id)) && !allSelected;

                    return (
                        <div key={category} className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                            {/* Category Header */}
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <span className={cn(
                                        'text-xs px-2 py-1 rounded-full font-medium',
                                        categoryColors[cat]
                                    )}>
                                        {categoryLabels[cat]}
                                    </span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                        {metrics.length} metrics
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => selectAllInCategory(cat)}
                                        className="text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium"
                                    >
                                        Select All
                                    </button>
                                    {someSelected || allSelected ? (
                                        <button
                                            onClick={() => deselectAllInCategory(cat)}
                                            className="text-xs text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 font-medium"
                                        >
                                            Deselect
                                        </button>
                                    ) : null}
                                </div>
                            </div>

                            {/* Metrics List */}
                            <div className="space-y-2">
                                {metrics.map((metric) => {
                                    const isSelected = selected.includes(metric.id);
                                    const isDisabled = !isSelected && !!maxSelection && selected.length >= maxSelection;

                                    return (
                                        <label
                                            key={metric.id}
                                            className={cn(
                                                'flex items-start gap-3 p-3 rounded-lg border-2 transition-all cursor-pointer',
                                                isSelected
                                                    ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-500'
                                                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600',
                                                isDisabled && 'opacity-50 cursor-not-allowed'
                                            )}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => toggleMetric(metric.id)}
                                                disabled={isDisabled}
                                                className="mt-1 w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 disabled:cursor-not-allowed"
                                            />
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-gray-900 dark:text-white">
                                                        {metric.name}
                                                    </span>
                                                    {isSelected && (
                                                        <Check className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                                                    )}
                                                </div>
                                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                                                    {metric.description}
                                                </p>
                                                {metric.unit && (
                                                    <span className="inline-block mt-1 text-xs text-gray-400 dark:text-gray-500">
                                                        Unit: {metric.unit}
                                                    </span>
                                                )}
                                            </div>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Selection Summary */}
            {selected.length > 0 && (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-blue-900 dark:text-blue-100 font-medium">
                        {selected.length} metric{selected.length !== 1 ? 's' : ''} selected
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2">
                        {selected.map(metricId => {
                            const metric = AVAILABLE_METRICS.find(m => m.id === metricId);
                            if (!metric) return null;

                            return (
                                <span
                                    key={metricId}
                                    className="inline-flex items-center gap-1 px-2 py-1 bg-white dark:bg-gray-800 rounded border border-blue-200 dark:border-blue-800 text-xs"
                                >
                                    {metric.name}
                                    <button
                                        onClick={() => toggleMetric(metricId)}
                                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Empty State */}
            {Object.keys(filteredCategories).length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <Search className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No metrics found matching "{searchQuery}"</p>
                </div>
            )}
        </div>
    );
}
