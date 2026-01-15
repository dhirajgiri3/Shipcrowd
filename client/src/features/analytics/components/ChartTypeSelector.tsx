/**
 * Chart Type Selector Component
 * 
 * Visual radio button selector for choosing chart types in reports.
 * Shows preview icons and compatibility hints.
 */

'use client';

import { BarChart, LineChart, PieChart, AreaChart, ScatterChart } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import type { ChartType } from '@/src/types/api/analytics.types';

interface ChartOption {
    type: ChartType;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    description: string;
    bestFor: string;
}

const chartOptions: ChartOption[] = [
    {
        type: 'line',
        label: 'Line Chart',
        icon: LineChart,
        description: 'Track trends over time',
        bestFor: 'Time series data, trends',
    },
    {
        type: 'bar',
        label: 'Bar Chart',
        icon: BarChart,
        description: 'Compare values across categories',
        bestFor: 'Categorical comparisons',
    },
    {
        type: 'pie',
        label: 'Pie Chart',
        icon: PieChart,
        description: 'Show proportions of a whole',
        bestFor: 'Distribution, percentages',
    },
    {
        type: 'area',
        label: 'Area Chart',
        icon: AreaChart,
        description: 'Emphasize magnitude of change',
        bestFor: 'Cumulative totals, volume',
    },
    {
        type: 'scatter',
        label: 'Scatter Plot',
        icon: ScatterChart,
        description: 'Show correlation between variables',
        bestFor: 'Relationships, outliers',
    },
];

interface ChartTypeSelectorProps {
    selected: ChartType;
    onChange: (type: ChartType) => void;
}

export function ChartTypeSelector({ selected, onChange }: ChartTypeSelectorProps) {
    return (
        <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Chart Type
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {chartOptions.map((option) => {
                    const Icon = option.icon;
                    const isSelected = selected === option.type;

                    return (
                        <label
                            key={option.type}
                            className={cn(
                                'relative flex flex-col p-4 rounded-lg border-2 cursor-pointer transition-all',
                                isSelected
                                    ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-500 ring-2 ring-primary-200 dark:ring-primary-800'
                                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700'
                            )}
                        >
                            <input
                                type="radio"
                                name="chartType"
                                value={option.type}
                                checked={isSelected}
                                onChange={() => onChange(option.type)}
                                className="sr-only"
                            />

                            {/* Icon */}
                            <div className={cn(
                                'w-12 h-12 rounded-lg flex items-center justify-center mb-3',
                                isSelected
                                    ? 'bg-primary-100 dark:bg-primary-900/40'
                                    : 'bg-gray-100 dark:bg-gray-700'
                            )}>
                                <Icon className={cn(
                                    'w-6 h-6',
                                    isSelected
                                        ? 'text-primary-600 dark:text-primary-400'
                                        : 'text-gray-600 dark:text-gray-400'
                                )} />
                            </div>

                            {/* Label */}
                            <div className="space-y-1">
                                <h4 className={cn(
                                    'font-semibold text-sm',
                                    isSelected
                                        ? 'text-primary-900 dark:text-primary-100'
                                        : 'text-gray-900 dark:text-white'
                                )}>
                                    {option.label}
                                </h4>
                                <p className="text-xs text-gray-600 dark:text-gray-400">
                                    {option.description}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-500">
                                    <span className="font-medium">Best for:</span> {option.bestFor}
                                </p>
                            </div>

                            {/* Selected indicator */}
                            {isSelected && (
                                <div className="absolute top-2 right-2 w-5 h-5 bg-primary-600 dark:bg-primary-500 rounded-full flex items-center justify-center">
                                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                            )}
                        </label>
                    );
                })}
            </div>

            {/* Selected chart info */}
            {selected && (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-blue-900 dark:text-blue-100">
                        <span className="font-medium">Selected:</span> {chartOptions.find(o => o.type === selected)?.label}
                    </p>
                </div>
            )}
        </div>
    );
}
