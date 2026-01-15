/**
 * Custom Report Builder Page
 * 
 * Comprehensive custom report builder with metric selection,
 * chart type selection, filters, and real-time preview.
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MetricSelector } from '@/src/features/analytics/components/MetricSelector';
import { ChartTypeSelector } from '@/src/features/analytics/components/ChartTypeSelector';
import { useGenerateReport, useSaveReport, useExportReport } from '@/src/core/api/hooks/useAnalytics';
import { Download, Save, Play, Calendar, Filter } from 'lucide-react';
import { handleApiError } from '@/src/lib/error-handler';
import type {
    ReportConfiguration,
    ChartType,
    DimensionType,
    TimeRange,
    DateRangeFilter,
} from '@/src/types/api/analytics.types';

const timeRangeOptions: { value: TimeRange; label: string }[] = [
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: '7days', label: 'Last 7 Days' },
    { value: '30days', label: 'Last 30 Days' },
    { value: '90days', label: 'Last 90 Days' },
    { value: 'custom', label: 'Custom  Range' },
];

const dimensionOptions: { value: DimensionType; label: string }[] = [
    { value: 'date', label: 'Date' },
    { value: 'courier', label: 'Courier' },
    { value: 'zone', label: 'Zone' },
    { value: 'status', label: 'Status' },
    { value: 'payment_method', label: 'Payment Method' },
    { value: 'product_category', label: 'Product Category' },
];

export default function CustomReportBuilderPage() {
    const router = useRouter();

    // Report Configuration State
    const [reportName, setReportName] = useState('');
    const [reportDescription, setReportDescription] = useState('');
    const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);
    const [chartType, setChartType] = useState<ChartType>('line');
    const [timeRange, setTimeRange] = useState<TimeRange>('30days');
    const [customDateRange, setCustomDateRange] = useState<DateRangeFilter>({
        startDate: '',
        endDate: '',
    });
    const [selectedDimensions, setSelectedDimensions] = useState<DimensionType[]>(['date']);
    const [groupBy, setGroupBy] = useState<DimensionType>('date');

    // API Mutations
    const { mutate: generateReport, isPending: isGenerating, data: reportData } = useGenerateReport();
    const { mutate: saveReport, isPending: isSaving } = useSaveReport();
    const { mutate: exportReport, isPending: isExporting } = useExportReport();

    const buildReportConfig = (): ReportConfiguration => ({
        name: reportName || 'Untitled Report',
        description: reportDescription,
        metrics: selectedMetrics,
        dimensions: selectedDimensions,
        chartType,
        groupBy,
        filters: {
            dateRange: timeRange,
            customDateRange: timeRange === 'custom' ? customDateRange : undefined,
        },
    });

    const handleGenerate = () => {
        if (selectedMetrics.length === 0) {
            handleApiError(new Error('Select at least one metric'));
            return;
        }

        const config = buildReportConfig();
        generateReport(config);
    };

    const handleSave = () => {
        if (!reportName.trim()) {
            handleApiError(new Error('Enter a report name'));
            return;
        }

        const config = buildReportConfig();
        saveReport(config);
    };

    const handleExport = (format: 'csv' | 'excel' | 'pdf') => {
        const config = buildReportConfig();
        exportReport({ config, format });
    };

    const toggleDimension = (dim: DimensionType) => {
        setSelectedDimensions(prev =>
            prev.includes(dim)
                ? prev.filter(d => d !== dim)
                : [...prev, dim]
        );
    };

    const canGenerate = selectedMetrics.length > 0;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                        Custom Report Builder
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Create custom analytics reports with your desired metrics and visualizations
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Configuration Panel */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Report Details */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                                Report Details
                            </h2>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Report Name
                                    </label>
                                    <input
                                        type="text"
                                        value={reportName}
                                        onChange={(e) => setReportName(e.target.value)}
                                        placeholder="e.g., Monthly Performance Report"
                                        className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Description (Optional)
                                    </label>
                                    <textarea
                                        value={reportDescription}
                                        onChange={(e) => setReportDescription(e.target.value)}
                                        placeholder="Describe what this report shows..."
                                        rows={2}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Metric Selection */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                            <MetricSelector
                                selected={selectedMetrics}
                                onChange={setSelectedMetrics}
                                maxSelection={10}
                            />
                        </div>

                        {/* Chart Type Selection */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                            <ChartTypeSelector
                                selected={chartType}
                                onChange={setChartType}
                            />
                        </div>

                        {/* Dimensions */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                Dimensions
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                {dimensionOptions.map((dim) => {
                                    const isSelected = selectedDimensions.includes(dim.value);

                                    return (
                                        <label
                                            key={dim.value}
                                            className={`flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-colors ${isSelected
                                                    ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-500'
                                                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-primary-300'
                                                }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => toggleDimension(dim.value)}
                                                className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                            />
                                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                                                {dim.label}
                                            </span>
                                        </label>
                                    );
                                })}
                            </div>

                            <div className="mt-4">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Group By
                                </label>
                                <select
                                    value={groupBy}
                                    onChange={(e) => setGroupBy(e.target.value as DimensionType)}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                >
                                    {selectedDimensions.map(dim => {
                                        const option = dimensionOptions.find(o => o.value === dim);
                                        return (
                                            <option key={dim} value={dim}>
                                                {option?.label}
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>
                        </div>

                        {/* Date Range */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                Date Range
                            </h3>

                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
                                {timeRangeOptions.map((option) => (
                                    <label
                                        key={option.value}
                                        className={`p-3 rounded-lg border-2 cursor-pointer text-center transition-colors ${timeRange === option.value
                                                ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-500'
                                                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-primary-300'
                                            }`}
                                    >
                                        <input
                                            type="radio"
                                            name="timeRange"
                                            value={option.value}
                                            checked={timeRange === option.value}
                                            onChange={(e) => setTimeRange(e.target.value as TimeRange)}
                                            className="sr-only"
                                        />
                                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                                            {option.label}
                                        </span>
                                    </label>
                                ))}
                            </div>

                            {timeRange === 'custom' && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                                            Start Date
                                        </label>
                                        <input
                                            type="date"
                                            value={customDateRange.startDate}
                                            onChange={(e) => setCustomDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                                            className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                                            End Date
                                        </label>
                                        <input
                                            type="date"
                                            value={customDateRange.endDate}
                                            onChange={(e) => setCustomDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                                            className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Actions Panel */}
                    <div className="space-y-6">
                        {/* Quick Actions */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 sticky top-6">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                                Actions
                            </h3>

                            <div className="space-y-3">
                                <button
                                    onClick={handleGenerate}
                                    disabled={!canGenerate || isGenerating}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isGenerating ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Generating...
                                        </>
                                    ) : (
                                        <>
                                            <Play className="w-4 h-4" />
                                            Generate Report
                                        </>
                                    )}
                                </button>

                                <button
                                    onClick={handleSave}
                                    disabled={!canGenerate || isSaving}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                                >
                                    {isSaving ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4" />
                                            Save Report
                                        </>
                                    )}
                                </button>

                                <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                        Export As:
                                    </p>
                                    <div className="space-y-2">
                                        <button
                                            onClick={() => handleExport('csv')}
                                            disabled={!reportData || isExporting}
                                            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors disabled:opacity-50"
                                        >
                                            <Download className="w-4 h-4" />
                                            CSV
                                        </button>
                                        <button
                                            onClick={() => handleExport('excel')}
                                            disabled={!reportData || isExporting}
                                            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors disabled:opacity-50"
                                        >
                                            <Download className="w-4 h-4" />
                                            Excel
                                        </button>
                                        <button
                                            onClick={() => handleExport('pdf')}
                                            disabled={!reportData || isExporting}
                                            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors disabled:opacity-50"
                                        >
                                            <Download className="w-4 h-4" />
                                            PDF
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Report Preview Placeholder */}
                        {reportData && (
                            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                                    Report Preview
                                </h3>
                                <div className="aspect-video bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                                    <p className="text-gray-500 dark:text-gray-400">
                                        Chart visualization would appear here
                                    </p>
                                </div>
                                <div className="mt-4 grid grid-cols-3 gap-4">
                                    <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                            {reportData.summary.total.toLocaleString()}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
                                    </div>
                                    <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                            {reportData.summary.average.toLocaleString()}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Average</p>
                                    </div>
                                    <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                            {reportData.data.length}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Data Points</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
