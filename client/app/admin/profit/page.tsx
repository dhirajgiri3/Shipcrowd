"use client";

import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import {
    IndianRupee,
    Upload,
    Download,
    FileSpreadsheet,
    Calendar,
    TrendingUp,
    TrendingDown,
    CheckCircle,
    AlertTriangle,
    Clock,
    Filter,
    Search,
    RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency } from '@/lib/utils';

// Mock profit data
const mockProfitData = [
    {
        id: 'PRF-001',
        date: '2024-12-11',
        sellerId: 'SEL-001',
        sellerName: 'TechGadgets Inc.',
        shipments: 45,
        shippingCost: 12500,
        charged: 15200,
        profit: 2700,
        margin: 17.7,
    },
    {
        id: 'PRF-002',
        date: '2024-12-11',
        sellerId: 'SEL-002',
        sellerName: 'Fashion Hub',
        shipments: 32,
        shippingCost: 8900,
        charged: 10800,
        profit: 1900,
        margin: 17.6,
    },
    {
        id: 'PRF-003',
        date: '2024-12-10',
        sellerId: 'SEL-001',
        sellerName: 'TechGadgets Inc.',
        shipments: 52,
        shippingCost: 14200,
        charged: 17500,
        profit: 3300,
        margin: 18.9,
    },
    {
        id: 'PRF-004',
        date: '2024-12-10',
        sellerId: 'SEL-003',
        sellerName: 'HomeDecor Plus',
        shipments: 28,
        shippingCost: 7600,
        charged: 8200,
        profit: 600,
        margin: 7.3,
    },
    {
        id: 'PRF-005',
        date: '2024-12-09',
        sellerId: 'SEL-002',
        sellerName: 'Fashion Hub',
        shipments: 38,
        shippingCost: 10200,
        charged: 11800,
        profit: 1600,
        margin: 13.6,
    },
];

const mockImportHistory = [
    { id: 'IMP-001', date: '2024-12-10', filename: 'profit_dec_week1.xlsx', records: 156, status: 'success' },
    { id: 'IMP-002', date: '2024-12-05', filename: 'profit_nov_week4.xlsx', records: 142, status: 'success' },
    { id: 'IMP-003', date: '2024-11-28', filename: 'profit_nov_week3.xlsx', records: 128, status: 'partial', errors: 3 },
];

export default function ProfitManagementPage() {
    const [activeTab, setActiveTab] = useState<'overview' | 'import' | 'export'>('overview');
    const [searchQuery, setSearchQuery] = useState('');
    const [dateFrom, setDateFrom] = useState('2024-12-01');
    const [dateTo, setDateTo] = useState('2024-12-11');
    const [isDragging, setIsDragging] = useState(false);
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { addToast } = useToast();

    const filteredData = mockProfitData.filter(item =>
        item.sellerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.sellerId.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const totalProfit = filteredData.reduce((sum, p) => sum + p.profit, 0);
    const totalShipments = filteredData.reduce((sum, p) => sum + p.shipments, 0);
    const totalCharged = filteredData.reduce((sum, p) => sum + p.charged, 0);
    const avgMargin = filteredData.length > 0 ? (filteredData.reduce((sum, p) => sum + p.margin, 0) / filteredData.length).toFixed(1) : 0;

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
        if (uploadedFile) {
            addToast('Importing profit data...', 'info');
            setTimeout(() => {
                addToast('Profit data imported successfully!', 'success');
                setUploadedFile(null);
            }, 1500);
        }
    };

    const handleExport = (format: 'csv' | 'xlsx') => {
        addToast(`Exporting profit report as ${format.toUpperCase()}...`, 'info');
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <IndianRupee className="h-6 w-6 text-[#2525FF]" />
                        Profit Management
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">
                        Import, export, and analyze profit data
                    </p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-gray-200">
                {(['overview', 'import', 'export'] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={cn(
                            "px-4 py-3 text-sm font-medium border-b-2 transition-all capitalize",
                            activeTab === tab
                                ? "border-[#2525FF] text-[#2525FF]"
                                : "border-transparent text-gray-500 hover:text-gray-700"
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
                                        <p className="text-sm text-gray-500">Total Profit</p>
                                        <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalProfit)}</p>
                                    </div>
                                    <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                                        <TrendingUp className="h-5 w-5 text-emerald-600" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-gray-500">Total Charged</p>
                                        <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalCharged)}</p>
                                    </div>
                                    <div className="h-10 w-10 rounded-lg bg-[#2525FF]/10 flex items-center justify-center">
                                        <IndianRupee className="h-5 w-5 text-[#2525FF]" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-gray-500">Shipments</p>
                                        <p className="text-2xl font-bold text-gray-900">{totalShipments}</p>
                                    </div>
                                    <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                                        <FileSpreadsheet className="h-5 w-5 text-purple-600" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-gray-500">Avg Margin</p>
                                        <p className="text-2xl font-bold text-gray-900">{avgMargin}%</p>
                                    </div>
                                    <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                                        <TrendingUp className="h-5 w-5 text-amber-600" />
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
                            <span className="self-center text-gray-400">to</span>
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
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50 border-b border-gray-100">
                                        <tr>
                                            <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase">Date</th>
                                            <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase">Seller</th>
                                            <th className="text-right p-4 text-xs font-medium text-gray-500 uppercase">Shipments</th>
                                            <th className="text-right p-4 text-xs font-medium text-gray-500 uppercase">Cost</th>
                                            <th className="text-right p-4 text-xs font-medium text-gray-500 uppercase">Charged</th>
                                            <th className="text-right p-4 text-xs font-medium text-gray-500 uppercase">Profit</th>
                                            <th className="text-right p-4 text-xs font-medium text-gray-500 uppercase">Margin</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {filteredData.map((row) => (
                                            <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="p-4 text-sm text-gray-900">{row.date}</td>
                                                <td className="p-4">
                                                    <p className="text-sm font-medium text-gray-900">{row.sellerName}</p>
                                                    <code className="text-xs text-gray-400">{row.sellerId}</code>
                                                </td>
                                                <td className="p-4 text-right text-sm text-gray-900">{row.shipments}</td>
                                                <td className="p-4 text-right text-sm text-gray-500">{formatCurrency(row.shippingCost)}</td>
                                                <td className="p-4 text-right text-sm text-gray-900">{formatCurrency(row.charged)}</td>
                                                <td className="p-4 text-right text-sm font-semibold text-emerald-600">{formatCurrency(row.profit)}</td>
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
                                <Upload className="h-5 w-5 text-[#2525FF]" />
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
                                        ? "border-[#2525FF] bg-[#2525FF]/5"
                                        : uploadedFile
                                            ? "border-emerald-300 bg-emerald-50"
                                            : "border-gray-200 hover:border-gray-300"
                                )}
                            >
                                {uploadedFile ? (
                                    <>
                                        <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
                                        <p className="font-medium text-gray-900">{uploadedFile.name}</p>
                                        <p className="text-sm text-gray-500 mt-1">Ready to import</p>
                                    </>
                                ) : (
                                    <>
                                        <FileSpreadsheet className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                                        <p className="font-medium text-gray-900">Drop file here or click to upload</p>
                                        <p className="text-sm text-gray-500 mt-1">Supports CSV and XLSX</p>
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
                            <Button className="w-full" disabled={!uploadedFile} onClick={handleImport}>
                                <Upload className="h-4 w-4 mr-2" />
                                Import Data
                            </Button>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Import History</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {mockImportHistory.map((item) => (
                                    <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                        <div>
                                            <p className="font-medium text-gray-900">{item.filename}</p>
                                            <p className="text-xs text-gray-500">{item.date} • {item.records} records</p>
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
                            <Download className="h-5 w-5 text-[#2525FF]" />
                            Export Profit Report
                        </CardTitle>
                        <CardDescription>Download profit data in your preferred format</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Date Range</label>
                                <div className="flex gap-2">
                                    <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                                    <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Seller (Optional)</label>
                                <select className="flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900">
                                    <option value="">All Sellers</option>
                                    <option value="SEL-001">TechGadgets Inc.</option>
                                    <option value="SEL-002">Fashion Hub</option>
                                    <option value="SEL-003">HomeDecor Plus</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <Button variant="outline" className="flex-1" onClick={() => handleExport('csv')}>
                                <Download className="h-4 w-4 mr-2" />
                                Export as CSV
                            </Button>
                            <Button className="flex-1" onClick={() => handleExport('xlsx')}>
                                <Download className="h-4 w-4 mr-2" />
                                Export as Excel
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
