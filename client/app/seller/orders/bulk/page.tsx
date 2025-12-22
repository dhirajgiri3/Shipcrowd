"use client";
export const dynamic = "force-dynamic";

import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/shared/components/card';
import { Button } from '@/src/shared/components/button';
import { Badge } from '@/src/shared/components/badge';
import {
    Upload,
    FileSpreadsheet,
    Download,
    CheckCircle,
    XCircle,
    AlertTriangle,
    ArrowRight,
    Trash2,
    Eye,
    Package,
    FileText
} from 'lucide-react';
import { cn } from '@/src/shared/utils';
import { useToast } from '@/src/shared/components/Toast';
import Link from 'next/link';

// Mock uploaded orders
const mockUploadedOrders = [
    { id: 1, orderId: 'ORD-001', customer: 'Rahul Sharma', phone: '9876543210', city: 'Delhi', status: 'valid' },
    { id: 2, orderId: 'ORD-002', customer: 'Priya Singh', phone: '8765432109', city: 'Mumbai', status: 'valid' },
    { id: 3, orderId: 'ORD-003', customer: 'Amit Kumar', phone: '765432', city: 'Bangalore', status: 'error', error: 'Invalid phone number' },
    { id: 4, orderId: 'ORD-004', customer: 'Sneha Patel', phone: '6543210987', city: 'Ahmedabad', status: 'valid' },
    { id: 5, orderId: 'ORD-005', customer: '', phone: '5432109876', city: 'Chennai', status: 'error', error: 'Customer name required' },
];

export default function BulkUploadPage() {
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadComplete, setUploadComplete] = useState(false);
    const [orders, setOrders] = useState<typeof mockUploadedOrders>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { addToast } = useToast();

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            if (!selectedFile.name.match(/\.(csv|xlsx|xls)$/)) {
                addToast('Please upload a CSV or Excel file', 'warning');
                return;
            }
            setFile(selectedFile);
            setUploadComplete(false);
            setOrders([]);
        }
    };

    const handleUpload = () => {
        if (!file) return;

        setIsUploading(true);
        // Simulate upload
        setTimeout(() => {
            setIsUploading(false);
            setUploadComplete(true);
            setOrders(mockUploadedOrders);
            addToast('File uploaded successfully! Review the orders below.', 'success');
        }, 1500);
    };

    const handleCreateOrders = () => {
        const validOrders = orders.filter(o => o.status === 'valid');
        addToast(`${validOrders.length} orders created successfully!`, 'success');
    };

    const removeOrder = (id: number) => {
        setOrders(orders.filter(o => o.id !== id));
    };

    const validCount = orders.filter(o => o.status === 'valid').length;
    const errorCount = orders.filter(o => o.status === 'error').length;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Upload className="h-6 w-6 text-[#2525FF]" />
                        Bulk Order Upload
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">
                        Upload multiple orders at once using CSV or Excel
                    </p>
                </div>
                <div className="flex gap-2">
                    <Link href="/seller/orders/create">
                        <Button variant="outline">
                            Single Order
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Upload Section */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Upload File</CardTitle>
                    <CardDescription>Upload a CSV or Excel file with order details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Dropzone */}
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className={cn(
                            "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all",
                            file
                                ? "border-emerald-300 bg-emerald-50/50"
                                : "border-gray-200 hover:border-[#2525FF]/50 hover:bg-[#2525FF]/5"
                        )}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".csv,.xlsx,.xls"
                            className="hidden"
                            onChange={handleFileSelect}
                        />

                        {file ? (
                            <div className="flex items-center justify-center gap-4">
                                <div className="h-12 w-12 rounded-lg bg-emerald-100 flex items-center justify-center">
                                    <FileSpreadsheet className="h-6 w-6 text-emerald-600" />
                                </div>
                                <div className="text-left">
                                    <p className="font-semibold text-gray-900">{file.name}</p>
                                    <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setFile(null);
                                        setOrders([]);
                                        setUploadComplete(false);
                                    }}
                                >
                                    <Trash2 className="h-4 w-4 text-gray-400" />
                                </Button>
                            </div>
                        ) : (
                            <>
                                <Upload className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                                <p className="font-semibold text-gray-900">Drop your file here or click to browse</p>
                                <p className="text-sm text-gray-500 mt-1">Supports CSV, XLSX, XLS (Max 5MB)</p>
                            </>
                        )}
                    </div>

                    {/* Template Download */}
                    <div className="flex items-center justify-between p-4 bg-[var(--bg-secondary)] rounded-xl">
                        <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-[#2525FF]" />
                            <div>
                                <p className="font-medium text-gray-900">Download Template</p>
                                <p className="text-sm text-gray-500">Use our template for error-free uploads</p>
                            </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => addToast('Template downloaded!', 'success')}>
                            <Download className="h-4 w-4 mr-2" />
                            Download
                        </Button>
                    </div>

                    {/* Upload Button */}
                    {file && !uploadComplete && (
                        <Button className="w-full" onClick={handleUpload} isLoading={isUploading}>
                            <Upload className="h-4 w-4 mr-2" />
                            {isUploading ? 'Processing...' : 'Upload & Validate'}
                        </Button>
                    )}
                </CardContent>
            </Card>

            {/* Validation Results */}
            {uploadComplete && orders.length > 0 && (
                <>
                    {/* Summary Stats */}
                    <div className="grid grid-cols-3 gap-4">
                        <Card>
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-gray-500">Total Orders</p>
                                        <p className="text-2xl font-bold text-gray-900">{orders.length}</p>
                                    </div>
                                    <div className="h-10 w-10 rounded-lg bg-[#2525FF]/10 flex items-center justify-center">
                                        <Package className="h-5 w-5 text-[#2525FF]" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-gray-500">Valid</p>
                                        <p className="text-2xl font-bold text-emerald-600">{validCount}</p>
                                    </div>
                                    <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                                        <CheckCircle className="h-5 w-5 text-emerald-600" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-gray-500">Errors</p>
                                        <p className="text-2xl font-bold text-rose-600">{errorCount}</p>
                                    </div>
                                    <div className="h-10 w-10 rounded-lg bg-rose-100 flex items-center justify-center">
                                        <XCircle className="h-5 w-5 text-rose-600" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Error Warning */}
                    {errorCount > 0 && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                            <div>
                                <h3 className="font-medium text-amber-800">{errorCount} order(s) have errors</h3>
                                <p className="text-sm text-amber-700 mt-1">
                                    Orders with errors will be skipped. Fix them in your file and re-upload, or remove them below.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Orders Table */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-lg">Uploaded Orders</CardTitle>
                                <CardDescription>Review and confirm orders before creation</CardDescription>
                            </div>
                            {validCount > 0 && (
                                <Button onClick={handleCreateOrders}>
                                    Create {validCount} Orders
                                    <ArrowRight className="h-4 w-4 ml-2" />
                                </Button>
                            )}
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-[var(--bg-secondary)] border-b border-gray-100">
                                        <tr>
                                            <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase">Status</th>
                                            <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase">Order ID</th>
                                            <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase">Customer</th>
                                            <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase">Phone</th>
                                            <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase">City</th>
                                            <th className="text-right p-4 text-xs font-medium text-gray-500 uppercase">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {orders.map((order) => (
                                            <tr
                                                key={order.id}
                                                className={cn(
                                                    "transition-colors",
                                                    order.status === 'error' ? "bg-rose-50/50" : "hover:bg-[var(--bg-hover)]"
                                                )}
                                            >
                                                <td className="p-4">
                                                    {order.status === 'valid' ? (
                                                        <div className="flex items-center gap-1">
                                                            <CheckCircle className="h-4 w-4 text-emerald-500" />
                                                            <span className="text-xs font-medium text-emerald-600">Valid</span>
                                                        </div>
                                                    ) : (
                                                        <div>
                                                            <div className="flex items-center gap-1">
                                                                <XCircle className="h-4 w-4 text-rose-500" />
                                                                <span className="text-xs font-medium text-rose-600">Error</span>
                                                            </div>
                                                            {order.error && (
                                                                <p className="text-xs text-rose-500 mt-1">{order.error}</p>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="p-4">
                                                    <code className="font-mono text-sm font-medium text-gray-900">{order.orderId}</code>
                                                </td>
                                                <td className="p-4">
                                                    <p className="text-sm font-medium text-gray-900">{order.customer || '-'}</p>
                                                </td>
                                                <td className="p-4">
                                                    <p className="text-sm text-gray-600">{order.phone}</p>
                                                </td>
                                                <td className="p-4">
                                                    <p className="text-sm text-gray-600">{order.city}</p>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex justify-end gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => removeOrder(order.id)}
                                                        >
                                                            <Trash2 className="h-4 w-4 text-gray-400" />
                                                        </Button>
                                                    </div>
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
        </div>
    );
}
