/**
 * ReportBuilder Component
 * 
 * Interactive tool for building custom analytics reports.
 * Allows selecting chart type, metrics, and date range.
 */

'use client';

import {
    Button,
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    Loader
} from '@/src/components/ui';
import { ChartTypeSelector } from './ChartTypeSelector';
import { DateRangeFilter } from './DateRangeFilter';
import { MetricSelector, AVAILABLE_METRICS } from './MetricSelector';
import { useCustomReport, useAnalyticsParams } from '@/src/hooks';
import { ChartType, ReportConfig } from '@/src/types/analytics.types';
import { Download, Play } from 'lucide-react';
import { useState } from 'react';
import {
    ResponsiveContainer,
    LineChart,
    Line,
    BarChart,
    Bar,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    PieChart,
    Pie,
    Cell
} from 'recharts';

export function ReportBuilder() {
    const { timeRange, setTimeRange, dateRange } = useAnalyticsParams();
    const [chartType, setChartType] = useState<ChartType>('line');
    const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['total_shipments', 'delivered_shipments']);

    // Configuration state for the query
    const [activeConfig, setActiveConfig] = useState<ReportConfig | null>(null);

    const { data, isLoading } = useCustomReport(activeConfig);

    const handleGenerate = () => {
        setActiveConfig({
            metrics: selectedMetrics,
            dimensions: ['date'],
            filters: {},
            chartType,
            dateRange
        });
    };

    const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

    const renderChart = () => {
        if (!data) return (
            <div className="h-[400px] flex items-center justify-center text-[var(--text-muted)] bg-[var(--bg-secondary)] rounded-xl border border-dashed border-[var(--border-default)]">
                Select metrics and click Generate Report
            </div>
        );

        if (isLoading) return (
            <div className="h-[400px] flex items-center justify-center bg-[var(--bg-secondary)] rounded-xl">
                <Loader variant="spinner" size="lg" />
            </div>
        );

        const CommonProps = {
            data,
            margin: { top: 10, right: 30, left: 0, bottom: 0 }
        };

        const renderMetrics = () => selectedMetrics.map((mid, index) => {
            const metric = AVAILABLE_METRICS.find(m => m.id === mid);
            return {
                key: mid,
                color: COLORS[index % COLORS.length],
                name: metric?.label || mid
            };
        });

        const metricsConfig = renderMetrics();

        switch (chartType) {
            case 'bar':
                return (
                    <ResponsiveContainer width="100%" height={400}>
                        <BarChart {...CommonProps}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip
                                contentStyle={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
                            />
                            <Legend />
                            {metricsConfig.map(m => (
                                <Bar key={m.key} dataKey={m.key} name={m.name} fill={m.color} />
                            ))}
                        </BarChart>
                    </ResponsiveContainer>
                );
            case 'area':
                return (
                    <ResponsiveContainer width="100%" height={400}>
                        <AreaChart {...CommonProps}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip
                                contentStyle={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
                            />
                            <Legend />
                            {metricsConfig.map(m => (
                                <Area key={m.key} type="monotone" dataKey={m.key} name={m.name} stroke={m.color} fill={m.color} fillOpacity={0.3} />
                            ))}
                        </AreaChart>
                    </ResponsiveContainer>
                );
            case 'pie':
                // Pie chart usually visualizes one metric distribution or multiple metrics at a snapshot
                // For simplicity, we'll visualize the first selected metric's distribution over time (or mock categories)
                return (
                    <ResponsiveContainer width="100%" height={400}>
                        <PieChart>
                            <Pie
                                data={data}
                                dataKey={metricsConfig[0].key}
                                nameKey="date"
                                cx="50%"
                                cy="50%"
                                outerRadius={150}
                                label
                            >
                                {data.map((_, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                );
            default: // line
                return (
                    <ResponsiveContainer width="100%" height={400}>
                        <LineChart {...CommonProps}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip
                                contentStyle={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
                            />
                            <Legend />
                            {metricsConfig.map(m => (
                                <Line key={m.key} type="monotone" dataKey={m.key} name={m.name} stroke={m.color} strokeWidth={2} dot={false} />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                );
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Report Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex flex-col md:flex-row gap-6">
                        <div className="flex-1 space-y-4">
                            <div>
                                <label className="text-sm font-medium text-[var(--text-secondary)] mb-2 block">
                                    Visualization
                                </label>
                                <ChartTypeSelector value={chartType} onChange={setChartType} />
                            </div>

                            <div>
                                <label className="text-sm font-medium text-[var(--text-secondary)] mb-2 block">
                                    Date Range
                                </label>
                                <DateRangeFilter value={timeRange} onChange={setTimeRange} />
                            </div>
                        </div>

                        <div className="flex-1">
                            <label className="text-sm font-medium text-[var(--text-secondary)] mb-2 block">
                                Metrics
                            </label>
                            <MetricSelector selectedMetrics={selectedMetrics} onChange={setSelectedMetrics} />
                        </div>
                    </div>

                    <div className="flex justify-end pt-4 border-t border-[var(--border-subtle)]">
                        <Button onClick={handleGenerate} disabled={selectedMetrics.length === 0 || isLoading}>
                            {isLoading ? (
                                <>Generating...</>
                            ) : (
                                <>
                                    <Play className="w-4 h-4 mr-2" />
                                    Generate Report
                                </>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card className="min-h-[500px]">
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Report Preview</CardTitle>
                    {data && (
                        <Button variant="outline" size="sm">
                            <Download className="w-4 h-4 mr-2" />
                            Export
                        </Button>
                    )}
                </CardHeader>
                <CardContent>
                    {renderChart()}
                </CardContent>
            </Card>
        </div>
    );
}
