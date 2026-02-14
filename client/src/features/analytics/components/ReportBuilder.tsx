'use client';

import { Button, Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui';
import { PageHeader } from '@/src/components/ui/layout/PageHeader';
import { ChartSkeleton } from '@/src/components/ui/data/Skeleton';
import { ChartTypeSelector } from './ChartTypeSelector';
import { DateRangeFilter } from './DateRangeFilter';
import { MetricSelector, AVAILABLE_METRICS } from './MetricSelector';
import { useAnalyticsParams } from '@/src/hooks';
import {
    useDeleteReport,
    useExportReport,
    useGenerateReport,
    useSaveReport,
    useSavedReports,
} from '@/src/core/api/hooks/analytics/useAnalytics';
import type { ReportConfiguration } from '@/src/types/api/analytics';
import { ClientChartType as ChartType } from '@/src/types/analytics/client-analytics.types';
import { FileOutput, Play, Save, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
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
    Cell,
} from 'recharts';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export function ReportBuilder() {
    const { timeRange, setTimeRange, apiFilters } = useAnalyticsParams();
    const [chartType, setChartType] = useState<ChartType>('line');
    const [selectedMetrics, setSelectedMetrics] = useState<string[]>([
        'total_shipments',
        'delivered_shipments',
        'delivery_success_rate',
        'avg_delivery_time',
        'rto_shipments',
    ]);
    const [reportName, setReportName] = useState('Shipment Performance Report');

    const generateReport = useGenerateReport();
    const saveReport = useSaveReport();
    const exportReport = useExportReport();
    const deleteReport = useDeleteReport();
    const { data: savedReports = [] } = useSavedReports();

    const reportConfig = useMemo<ReportConfiguration>(() => ({
        name: reportName,
        description: 'Generated from seller analytics report builder.',
        metrics: selectedMetrics,
        dimensions: ['date'],
        filters: apiFilters,
        chartType,
        groupBy: 'date',
    }), [reportName, selectedMetrics, apiFilters, chartType]);

    const chartData = useMemo(() => {
        const points = generateReport.data?.data || [];
        return points.map((point) => {
            const row: Record<string, string | number> = { label: point.label };
            selectedMetrics.forEach((metric) => {
                const sourceValue = point.metadata?.[metric];
                row[metric] = typeof sourceValue === 'number' ? sourceValue : point.value;
            });
            return row;
        });
    }, [generateReport.data, selectedMetrics]);

    const handleGenerate = () => {
        generateReport.mutate(reportConfig);
    };

    const handleSave = () => {
        saveReport.mutate(reportConfig);
    };

    const handleExport = () => {
        exportReport.mutate({
            format: 'csv',
            config: reportConfig,
            includeCharts: false,
        });
    };

    const renderChart = () => {
        if (!generateReport.data) {
            return (
                <div className="h-[400px] flex items-center justify-center text-[var(--text-muted)] bg-[var(--bg-secondary)] rounded-xl border border-dashed border-[var(--border-default)]">
                    Select metrics and click Generate Report
                </div>
            );
        }

        if (generateReport.isPending) {
            return <ChartSkeleton height={400} />;
        }

        const commonProps = {
            data: chartData,
            margin: { top: 10, right: 30, left: 0, bottom: 0 },
        };

        const metricsConfig = selectedMetrics.map((metricId, index) => {
            const metric = AVAILABLE_METRICS.find((item) => item.id === metricId);
            return {
                key: metricId,
                color: COLORS[index % COLORS.length],
                name: metric?.label || metricId,
            };
        });

        switch (chartType) {
            case 'bar':
                return (
                    <ResponsiveContainer width="100%" height={400}>
                        <BarChart {...commonProps}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                            <XAxis dataKey="label" />
                            <YAxis />
                            <Tooltip contentStyle={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }} />
                            <Legend />
                            {metricsConfig.map((metric) => (
                                <Bar key={metric.key} dataKey={metric.key} name={metric.name} fill={metric.color} />
                            ))}
                        </BarChart>
                    </ResponsiveContainer>
                );
            case 'area':
                return (
                    <ResponsiveContainer width="100%" height={400}>
                        <AreaChart {...commonProps}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                            <XAxis dataKey="label" />
                            <YAxis />
                            <Tooltip contentStyle={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }} />
                            <Legend />
                            {metricsConfig.map((metric) => (
                                <Area key={metric.key} type="monotone" dataKey={metric.key} name={metric.name} stroke={metric.color} fill={metric.color} fillOpacity={0.3} />
                            ))}
                        </AreaChart>
                    </ResponsiveContainer>
                );
            case 'pie':
                return (
                    <ResponsiveContainer width="100%" height={400}>
                        <PieChart>
                            <Pie data={chartData} dataKey={metricsConfig[0]?.key} nameKey="label" cx="50%" cy="50%" outerRadius={150} label>
                                {chartData.map((_, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                );
            default:
                return (
                    <ResponsiveContainer width="100%" height={400}>
                        <LineChart {...commonProps}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                            <XAxis dataKey="label" />
                            <YAxis />
                            <Tooltip contentStyle={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }} />
                            <Legend />
                            {metricsConfig.map((metric) => (
                                <Line key={metric.key} type="monotone" dataKey={metric.key} name={metric.name} stroke={metric.color} strokeWidth={2} dot={false} />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                );
        }
    };

    return (
        <div className="min-h-screen space-y-8 pb-20 animate-fade-in">
            <PageHeader
                title="Custom Reports"
                description="Build and export custom analytics reports based on your specific needs."
                breadcrumbs={[
                    { label: 'Analytics', href: '/seller/analytics' },
                    { label: 'Custom Reports', active: true },
                ]}
                backUrl="/seller/analytics"
                actions={<DateRangeFilter value={timeRange} onChange={setTimeRange} />}
            />

            <Card>
                <CardHeader>
                    <CardTitle>Report Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-[var(--text-secondary)] mb-2 block">Report Name</label>
                                <input
                                    value={reportName}
                                    onChange={(event) => setReportName(event.target.value)}
                                    className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3 py-2 text-sm"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-[var(--text-secondary)] mb-2 block">Visualization</label>
                                <ChartTypeSelector value={chartType} onChange={setChartType} />
                            </div>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-[var(--text-secondary)] mb-2 block">Metrics</label>
                            <MetricSelector selectedMetrics={selectedMetrics} onChange={setSelectedMetrics} />
                        </div>
                    </div>

                    <div className="flex flex-wrap justify-end gap-2 pt-4 border-t border-[var(--border-subtle)]">
                        <Button variant="outline" onClick={handleSave} disabled={selectedMetrics.length === 0 || saveReport.isPending}>
                            <Save className="w-4 h-4 mr-2" />
                            Save
                        </Button>
                        <Button onClick={handleGenerate} disabled={selectedMetrics.length === 0 || generateReport.isPending}>
                            <Play className="w-4 h-4 mr-2" />
                            {generateReport.isPending ? 'Generating...' : 'Generate Report'}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card className="min-h-[500px]">
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Report Preview</CardTitle>
                    {generateReport.data && (
                        <Button variant="outline" size="sm" onClick={handleExport} disabled={exportReport.isPending}>
                            <FileOutput className="w-4 h-4 mr-2" />
                            {exportReport.isPending ? 'Exporting...' : 'Export CSV'}
                        </Button>
                    )}
                </CardHeader>
                <CardContent>{renderChart()}</CardContent>
            </Card>

            {savedReports.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Saved Reports</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {savedReports.slice(0, 8).map((report) => (
                                <div key={report.reportId} className="flex items-center justify-between rounded-lg border border-[var(--border-subtle)] p-3">
                                    <div>
                                        <p className="text-sm font-medium text-[var(--text-primary)]">{report.name}</p>
                                        <p className="text-xs text-[var(--text-muted)]">{new Date(report.createdAt).toLocaleString()}</p>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => deleteReport.mutate(report.reportId)}
                                        disabled={deleteReport.isPending}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
