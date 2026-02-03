"use client";
export const dynamic = "force-dynamic";

import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/components/ui/core/Card';
import { Button } from '@/src/components/ui/core/Button';
import { Input } from '@/src/components/ui/core/Input';
import { Badge } from '@/src/components/ui/core/Badge';
import {
    IndianRupee,
    Upload,
    Download,
    FileSpreadsheet,
    TrendingUp,
    CheckCircle,
    Search,
    Loader2
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useToast } from '@/src/components/ui/feedback/Toast';
import { formatCurrency } from '@/src/lib/utils';
import {
    useProfitData,
    useImportProfitData,
    useImportHistory,
    useExportProfitData
} from '@/src/core/api/hooks/admin/useAdminProfit';
import { useDebouncedValue } from '@/src/hooks/data';

export function ProfitClient() {
    const [activeTab, setActiveTab] = useState<'overview' | 'import' | 'export'>('overview');

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const debouncedSearch = useDebouncedValue(searchQuery, 500);

    // File Upload
    const [isDragging, setIsDragging] = useState(false);
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { addToast } = useToast();

    // API Hooks
    const { data: profitResponse, isLoading: isLoadingProfit } = useProfitData({
        search: debouncedSearch,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined
    });

    const { data: importHistory } = useImportHistory();

    const { mutate: importData, isPending: isImporting } = useImportProfitData();
    const { mutate: exportData, isPending: isExporting } = useExportProfitData();

    // Derived Data
    const profitData = profitResponse?.data || [];
    const stats = profitResponse?.stats || {
        totalProfit: 0,
        totalCharged: 0,
        totalShipments: 0,
        avgMargin: 0
    };

    // Handlers
    const handleFileUpload = (file: File) => {
        setUploadedFile(file);
        addToast(`File "${file.name}" ready to import`, 'success');
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.csv'))) {
            handleFileUpload(file);
        } else {
            addToast('Please upload a CSV or Excel file', 'warning');
        }
    };

    const handleImport = () => {
        if (!uploadedFile) return;

        importData(uploadedFile, {
            onSuccess: () => {
                addToast('Profit data imported successfully!', 'success');
                setUploadedFile(null);
            },
            onError: () => {
                addToast('Failed to import data', 'error');
            }
        });
    };

    const handleExport = (format: 'csv' | 'xlsx') => {
        exportData({
            search: debouncedSearch,
            dateFrom: dateFrom || undefined,
            dateTo: dateTo || undefined,
            format
        }, {
            onSuccess: (blob) => {
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', `profit_report_${new Date().toISOString()}.${format}`);
                document.body.appendChild(link);
                link.click();
                link.remove();
                addToast(`Profit report downloaded as ${format.toUpperCase()}`, 'success');
            },
            onError: () => {
                addToast('Failed to export report', 'error');
            }
        });
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2 text-[var(--text-primary)]">
                        <IndianRupee className="h-6 w-6 text-[var(--primary-blue)]" />
                        Profit Management
                    </h1>
                    <p className="text-sm mt-1 text-[var(--text-secondary)]">
                        Import, export, and analyze profit data
                    </p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-[var(--border-subtle)]">
                {(['overview', 'import', 'export'] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={cn(
                            "px-4 py-3 text-sm font-medium border-b-2 transition-all capitalize",
                            activeTab === tab
                                ? "border-[var(--primary-blue)] text-[var(--primary-blue)]"
                                : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                        )}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && (
                <>
                    {/* Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Card>
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-[var(--text-secondary)]">Total Profit</p>
                                        <p className="text-2xl font-bold text-[var(--success)]">{formatCurrency(stats.totalProfit)}</p>
                                    </div>
                                    <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-[var(--success-bg)]">
                                        <TrendingUp className="h-5 w-5 text-[var(--success)]" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-[var(--text-secondary)]">Total Charged</p>
                                        <p className="text-2xl font-bold text-[var(--text-primary)]">{formatCurrency(stats.totalCharged)}</p>
                                    </div>
                                    <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-[var(--primary-blue-soft)]">
                                        <IndianRupee className="h-5 w-5 text-[var(--primary-blue)]" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-[var(--text-secondary)]">Shipments</p>
                                        <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.totalShipments}</p>
                                    </div>
                                    <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-[var(--info-bg)]">
                                        <FileSpreadsheet className="h-5 w-5 text-[var(--info)]" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-[var(--text-secondary)]">Avg Margin</p>
                                        <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.avgMargin}%</p>
                                    </div>
                                    <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-[var(--warning-bg)]">
                                        <TrendingUp className="h-5 w-5 text-[var(--warning)]" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Filters */}
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1">
                            <Input
                                placeholder="Search by seller..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                icon={<Search className="h-4 w-4" />}
                            />
                        </div>
                        <div className="flex gap-2">
                            <Input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                className="w-40"
                            />
                            <span className="self-center text-[var(--text-muted)]">to</span>
                            <Input
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                className="w-40"
                            />
                        </div>
                    </div>

                    {/* Data Table */}
                    <Card>
                        <CardContent className="p-0">
                            {isLoadingProfit ? (
                                <div className="flex items-center justify-center p-8">
                                    <Loader2 className="w-8 h-8 animate-spin text-[var(--primary-blue)]" />
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-[var(--bg-secondary)] border-b border-[var(--border-subtle)]">
                                            <tr>
                                                <th className="text-left p-4 text-xs font-medium text-[var(--text-muted)] uppercase">Date</th>
                                                <th className="text-left p-4 text-xs font-medium text-[var(--text-muted)] uppercase">Seller</th>
                                                <th className="text-right p-4 text-xs font-medium text-[var(--text-muted)] uppercase">Shipments</th>
                                                <th className="text-right p-4 text-xs font-medium text-[var(--text-muted)] uppercase">Cost</th>
                                                <th className="text-right p-4 text-xs font-medium text-[var(--text-muted)] uppercase">Charged</th>
                                                <th className="text-right p-4 text-xs font-medium text-[var(--text-muted)] uppercase">Profit</th>
                                                <th className="text-right p-4 text-xs font-medium text-[var(--text-muted)] uppercase">Margin</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[var(--border-subtle)]">
                                            {profitData.length === 0 ? (
                                                <tr>
                                                    <td colSpan={7} className="p-8 text-center text-[var(--text-muted)]">
                                                        No profit records found
                                                    </td>
                                                </tr>
                                            ) : profitData.map((row) => (
                                                <tr key={row.id} className="hover:bg-[var(--bg-secondary)] transition-colors">
                                                    <td className="p-4 text-sm text-[var(--text-primary)]">
                                                        {new Date(row.date).toLocaleDateString()}
                                                    </td>
                                                    <td className="p-4">
                                                        <p className="text-sm font-medium text-[var(--text-primary)]">{row.sellerName}</p>
                                                        <code className="text-xs text-[var(--text-muted)]">{row.sellerId}</code>
                                                    </td>
                                                    <td className="p-4 text-right text-sm text-[var(--text-primary)]">{row.shipments}</td>
                                                    <td className="p-4 text-right text-sm text-[var(--text-secondary)]">{formatCurrency(row.shippingCost)}</td>
                                                    <td className="p-4 text-right text-sm text-[var(--text-primary)]">{formatCurrency(row.charged)}</td>
                                                    <td className="p-4 text-right text-sm font-semibold text-[var(--success)]">{formatCurrency(row.profit)}</td>
                                                    <td className="p-4 text-right">
                                                        <Badge variant={row.margin >= 15 ? 'success' : row.margin >= 10 ? 'warning' : 'neutral'}>
                                                            {row.margin}%
                                                        </Badge>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </>
            )}

            {/* Import Tab */}
            {activeTab === 'import' && (
                <div className="grid gap-6 lg:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Upload className="h-5 w-5 text-[var(--primary-blue)]" />
                                Import Profit Data
                            </CardTitle>
                            <CardDescription>Upload CSV or Excel file with profit records</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div
                                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                onDragLeave={() => setIsDragging(false)}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                                className={cn(
                                    "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all",
                                    isDragging
                                        ? "border-[var(--primary-blue)] bg-[var(--primary-blue-soft)]"
                                        : uploadedFile
                                            ? "border-[var(--success)] bg-[var(--success-bg)]"
                                            : "border-[var(--border-subtle)] bg-transparent"
                                )}
                            >
                                {uploadedFile ? (
                                    <>
                                        <CheckCircle className="h-12 w-12 mx-auto mb-3 text-[var(--success)]" />
                                        <p className="font-medium text-[var(--text-primary)]">{uploadedFile.name}</p>
                                        <p className="text-sm mt-1 text-[var(--text-secondary)]">Ready to import</p>
                                    </>
                                ) : (
                                    <>
                                        <FileSpreadsheet className="h-12 w-12 mx-auto mb-3 text-[var(--text-muted)]" />
                                        <p className="font-medium text-[var(--text-primary)]">Drop file here or click to upload</p>
                                        <p className="text-sm mt-1 text-[var(--text-secondary)]">Supports CSV and XLSX</p>
                                    </>
                                )}
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".csv,.xlsx"
                                className="hidden"
                                onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                            />
                            <Button className="w-full" disabled={!uploadedFile || isImporting} onClick={handleImport}>
                                {isImporting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                <Upload className="h-4 w-4 mr-2" />
                                {isImporting ? 'Importing...' : 'Import Data'}
                            </Button>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Import History</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {importHistory?.map((item) => (
                                    <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-secondary)]">
                                        <div>
                                            <p className="font-medium text-[var(--text-primary)]">{item.filename}</p>
                                            <p className="text-xs text-[var(--text-secondary)]">
                                                {new Date(item.date).toLocaleDateString()} • {item.records} records
                                            </p>
                                        </div>
                                        <Badge variant={item.status === 'success' ? 'success' : 'warning'}>
                                            {item.status === 'success' ? 'Success' : `${item.errors} errors`}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Export Tab */}
            {activeTab === 'export' && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Download className="h-5 w-5 text-[var(--primary-blue)]" />
                            Export Profit Report
                        </CardTitle>
                        <CardDescription>Download profit data in your preferred format</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-[var(--text-secondary)]">Date Range</label>
                                <div className="flex gap-2">
                                    <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                                    <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-[var(--text-secondary)]">Search</label>
                                <Input
                                    placeholder="Seller Name or ID"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => handleExport('csv')}
                                disabled={isExporting}
                            >
                                {isExporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                                Export as CSV
                            </Button>
                            <Button
                                className="flex-1"
                                onClick={() => handleExport('xlsx')}
                                disabled={isExporting}
                            >
                                {isExporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                                Export as Excel
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
