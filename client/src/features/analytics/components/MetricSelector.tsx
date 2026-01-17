/**
 * MetricSelector Component
 * 
 * complex multi-select component for choosing analytics metrics.
 * Grouped by category (Volume, Performance, Financial).
 */

'use client';

import { Badge, Button, Input } from '@/src/components/ui';
import { cn } from '@/src/lib/utils';
import { MetricCategory, MetricConfig } from '@/src/types/analytics.types';
import { Check, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';

// Available metrics configuration
export const AVAILABLE_METRICS: MetricConfig[] = [
    // Volume Metrics
    { id: 'total_shipments', label: 'Total Shipments', description: 'Total number of shipments created', category: 'volume', format: 'number' },
    { id: 'delivered_shipments', label: 'Delivered', description: 'Number of successfully delivered shipments', category: 'volume', format: 'number' },
    { id: 'rto_shipments', label: 'RTO Count', description: 'Number of shipments returned to origin', category: 'volume', format: 'number' },

    // Performance Metrics
    { id: 'delivery_success_rate', label: 'Delivery Success Rate', description: 'Percentage of delivered vs total', category: 'performance', format: 'percent' },
    { id: 'rto_rate', label: 'RTO %', description: 'Percentage of RTO vs total', category: 'performance', format: 'percent' },
    { id: 'sla_breach_rate', label: 'SLA Breach %', description: 'Shipments delivered after EDD', category: 'performance', format: 'percent' },
    { id: 'avg_delivery_time', label: 'Avg Delivery Time', description: 'Average days to deliver', category: 'time', format: 'time' },

    // Financial Metrics
    { id: 'total_revenue', label: 'Total Revenue', description: 'Total value of shipped goods', category: 'financial', format: 'currency' },
    { id: 'shipping_spend', label: 'Shipping Cost', description: 'Total amount spent on shipping', category: 'financial', format: 'currency' },
    { id: 'avg_cost_per_order', label: 'Avg Cost/Order', description: 'Average shipping cost per order', category: 'financial', format: 'currency' },
    { id: 'cod_remitted', label: 'COD Remitted', description: 'Total COD amount settled', category: 'financial', format: 'currency' },
];

interface MetricSelectorProps {
    selectedMetrics: string[];
    onChange: (metrics: string[]) => void;
    maxSelection?: number;
}

export function MetricSelector({
    selectedMetrics,
    onChange,
    maxSelection = 5
}: MetricSelectorProps) {
    const [search, setSearch] = useState('');
    const [activeCategory, setActiveCategory] = useState<MetricCategory | 'all'>('all');

    const filteredMetrics = useMemo(() => {
        return AVAILABLE_METRICS.filter(metric => {
            const matchesSearch = metric.label.toLowerCase().includes(search.toLowerCase()) ||
                metric.description.toLowerCase().includes(search.toLowerCase());
            const matchesCategory = activeCategory === 'all' || metric.category === activeCategory;
            return matchesSearch && matchesCategory;
        });
    }, [search, activeCategory]);

    const toggleMetric = (id: string) => {
        if (selectedMetrics.includes(id)) {
            onChange(selectedMetrics.filter(m => m !== id));
        } else {
            if (selectedMetrics.length >= maxSelection) return;
            onChange([...selectedMetrics, id]);
        }
    };

    const categories: { id: MetricCategory | 'all'; label: string }[] = [
        { id: 'all', label: 'All' },
        { id: 'volume', label: 'Volume' },
        { id: 'performance', label: 'Performance' },
        { id: 'financial', label: 'Financial' },
        { id: 'time', label: 'Time' },
    ];

    return (
        <div className="bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-xl overflow-hidden">
            {/* Header / Search */}
            <div className="p-4 border-b border-[var(--border-subtle)] space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="font-medium text-[var(--text-primary)]">
                        Select Metrics ({selectedMetrics.length}/{maxSelection})
                    </h3>
                    {selectedMetrics.length > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onChange([])}
                            className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] h-auto py-0"
                        >
                            Clear all
                        </Button>
                    )}
                </div>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                    <Input
                        placeholder="Search metrics..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                    />
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    {categories.map(cat => (
                        <Button
                            key={cat.id}
                            variant={activeCategory === cat.id ? 'secondary' : 'ghost'}
                            size="sm"
                            onClick={() => setActiveCategory(cat.id)}
                            className="whitespace-nowrap rounded-full px-4 text-xs"
                        >
                            {cat.label}
                        </Button>
                    ))}
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto">
                {filteredMetrics.map(metric => {
                    const isSelected = selectedMetrics.includes(metric.id);
                    const isDisabled = !isSelected && selectedMetrics.length >= maxSelection;

                    return (
                        <div
                            key={metric.id}
                            onClick={() => !isDisabled && toggleMetric(metric.id)}
                            className={cn(
                                "flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer select-none",
                                isSelected
                                    ? "bg-[var(--bg-secondary)] border-[var(--primary-blue)] shadow-sm"
                                    : "bg-[var(--bg-primary)] border-[var(--border-subtle)] hover:border-[var(--border-default)]",
                                isDisabled && "opacity-50 cursor-not-allowed"
                            )}
                        >
                            <div className={cn(
                                "mt-0.5 w-4 h-4 rounded border flex items-center justify-center transition-colors",
                                isSelected
                                    ? "bg-[var(--primary-blue)] border-[var(--primary-blue)] text-white"
                                    : "border-[var(--border-default)]"
                            )}>
                                {isSelected && <Check className="w-3 h-3" />}
                            </div>
                            <div>
                                <div className="font-medium text-sm text-[var(--text-primary)]">
                                    {metric.label}
                                </div>
                                <div className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-1">
                                    {metric.description}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Selected Tags */}
            {selectedMetrics.length > 0 && (
                <div className="p-3 bg-[var(--bg-secondary)] border-t border-[var(--border-subtle)] flex flex-wrap gap-2">
                    {selectedMetrics.map(id => {
                        const metric = AVAILABLE_METRICS.find(m => m.id === id);
                        return (
                            <Badge
                                key={id}
                                className="pl-2 pr-1 py-1 gap-1 text-[var(--text-primary)] bg-[var(--bg-elevated)] border-[var(--border-subtle)]"
                            >
                                {metric?.label}
                                <div
                                    role="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        toggleMetric(id);
                                    }}
                                    className="hover:bg-[var(--bg-primary)] rounded-full p-0.5"
                                >
                                    <X className="w-3 h-3" />
                                </div>
                            </Badge>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
