"use client";
export const dynamic = "force-dynamic";

import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/components/ui/core/Card';
import { Button } from '@/src/components/ui/core/Button';
import { Badge } from '@/src/components/ui/core/Badge';
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
import { cn } from '@/src/lib/utils';
import { useToast } from '@/src/components/ui/feedback/Toast';
import Link from 'next/link';
import { orderApi } from '@/src/core/api/clients/orders/orderApi';
import { useBulkOrderImport } from '@/src/core/api/hooks/orders/useBulkOrderImport';

interface UploadedOrder {
    id: number;
    orderId?: string;
    customer: string;
    phone: string;
    city: string;
    status: 'valid' | 'error';
    error?: string;
}

export function BulkClient() {
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadComplete, setUploadComplete] = useState(false);
    const [orders, setOrders] = useState<UploadedOrder[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { addToast } = useToast();

    const downloadTemplate = () => {
        const link = document.createElement('a');
        link.href = '/samples/shipcrowd_bulk_orders_template.csv';
        link.download = 'shipcrowd_bulk_orders_template.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        addToast('Template downloaded', 'success');
    };

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

    const importMutation = useBulkOrderImport({
        onSuccess: (result) => {
            if (result.success) {
                setUploadComplete(true);

                // Transform API response to UI format
                const uploadedOrders: UploadedOrder[] = [
                    // Add successfully created orders
                    ...result.data.created.map((order, idx) => ({
                        id: idx + 1,
                        orderId: order.orderNumber,
                        customer: `Order ${order.orderNumber}`,
                        phone: '',
                        city: '',
                        status: 'valid' as const,
                    })),
                    // Add failed orders
                    ...result.data.errors.map((error, idx) => ({
                        id: result.data.created.length + idx + 1,
                        customer: `Row ${error.row}`,
                        phone: '',
                        city: '',
                        status: 'error' as const,
                        error: error.error,
                    })),
                ];

                setOrders(uploadedOrders);
                addToast(`File uploaded successfully! ${result.data.imported} orders imported.`, 'success');

                if (result.data.failed > 0) {
                    addToast(`${result.data.failed} rows failed to import`, 'warning');
                }
            } else {
                addToast('Bulk upload failed', 'error');
            }
            setIsUploading(false);
        },
        onError: (error) => {
            // Toast handled by hook
            setIsUploading(false);
        }
    });

    const handleUpload = async () => {
        if (!file) return;

        setIsUploading(true);
        try {
            importMutation.mutate(file);
        } catch (error: any) {
            // Should be caught by mutation onError usually, but just in case
            const errorMessage = error?.response?.data?.message || error?.message || 'Failed to upload file';
            addToast(errorMessage, 'error');
            setIsUploading(false);
        }
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
        <div className="space-y-6 animate-in fade-in duration-500 pb-20">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                        <Upload className="h-6 w-6 text-[var(--primary-blue)]" />
                        Bulk Order Upload
                    </h1>
                    <p className="text-[var(--text-muted)] text-sm mt-1">
                        Upload multiple orders at once using CSV or Excel
                    </p>
                </div>
                <div className="flex gap-2">
                    <Link href="/seller/orders/create">
                        <Button variant="outline" className="bg-[var(--bg-primary)] border-[var(--border-subtle)] text-[var(--text-secondary)]">
                            Single Order
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Upload Section */}
            <Card className="bg-[var(--bg-primary)] border-[var(--border-subtle)]">
                <CardHeader>
                    <CardTitle className="text-lg text-[var(--text-primary)]">Upload File</CardTitle>
                    <CardDescription className="text-[var(--text-secondary)]">Upload a CSV or Excel file with order details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Dropzone */}
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className={cn(
                            "border-2 border-dashed rounded-[var(--radius-xl)] p-8 text-center cursor-pointer transition-all",
                            file
                                ? "border-[var(--success)]/50 bg-[var(--success-bg)]"
                                : "border-[var(--border-subtle)] hover:border-[var(--primary-blue)]/50 hover:bg-[var(--bg-secondary)]"
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
                                <div className="h-12 w-12 rounded-lg bg-[var(--success)]/10 flex items-center justify-center">
                                    <FileSpreadsheet className="h-6 w-6 text-[var(--success)]" />
                                </div>
                                <div className="text-left">
                                    <p className="font-semibold text-[var(--text-primary)]">{file.name}</p>
                                    <p className="text-sm text-[var(--text-muted)]">{(file.size / 1024).toFixed(1)} KB</p>
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
                                    className="hover:bg-transparent hover:text-[var(--error)] text-[var(--text-muted)]"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ) : (
                            <>
                                <Upload className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-4" />
                                <p className="font-semibold text-[var(--text-primary)]">Drop your file here or click to browse</p>
                                <p className="text-sm text-[var(--text-muted)] mt-1">Supports CSV, XLSX, XLS (Max 5MB)</p>
                            </>
                        )}
                    </div>

                    {/* Template Download */}
                    <div className="flex items-center justify-between p-4 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)]">
                        <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-[var(--primary-blue)]" />
                            <div>
                                <p className="font-medium text-[var(--text-primary)]">Download Template</p>
                                <p className="text-sm text-[var(--text-muted)]">Use our template for error-free uploads</p>
                            </div>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={downloadTemplate}
                            className="bg-[var(--bg-primary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border-[var(--border-subtle)]"
                        >
                            <Download className="h-4 w-4 mr-2" />
                            Download
                        </Button>
                    </div>

                    {/* Upload Button */}
                    {file && !uploadComplete && (
                        <Button className="w-full bg-[var(--primary-blue)] hover:bg-[var(--primary-blue-deep)] text-white shadow-brand" onClick={handleUpload} isLoading={isUploading}>
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
                        <Card className="bg-[var(--bg-primary)] border-[var(--border-subtle)]">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-[var(--text-muted)]">Total Orders</p>
                                        <p className="text-2xl font-bold text-[var(--text-primary)]">{orders.length}</p>
                                    </div>
                                    <div className="h-10 w-10 rounded-lg bg-[var(--primary-blue-soft)] flex items-center justify-center">
                                        <Package className="h-5 w-5 text-[var(--primary-blue)]" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-[var(--bg-primary)] border-[var(--border-subtle)]">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-[var(--text-muted)]">Valid</p>
                                        <p className="text-2xl font-bold text-[var(--success)]">{validCount}</p>
                                    </div>
                                    <div className="h-10 w-10 rounded-lg bg-[var(--success-bg)] flex items-center justify-center">
                                        <CheckCircle className="h-5 w-5 text-[var(--success)]" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-[var(--bg-primary)] border-[var(--border-subtle)]">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-[var(--text-muted)]">Errors</p>
                                        <p className="text-2xl font-bold text-[var(--error)]">{errorCount}</p>
                                    </div>
                                    <div className="h-10 w-10 rounded-lg bg-[var(--error-bg)] flex items-center justify-center">
                                        <XCircle className="h-5 w-5 text-[var(--error)]" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Error Warning */}
                    {errorCount > 0 && (
                        <div className="bg-[var(--warning-bg)] border border-[var(--warning)]/30 rounded-xl p-4 flex items-start gap-3">
                            <AlertTriangle className="h-5 w-5 text-[var(--warning)] flex-shrink-0 mt-0.5" />
                            <div>
                                <h3 className="font-medium text-[var(--warning)]">{errorCount} order(s) have errors</h3>
                                <p className="text-sm text-[var(--text-secondary)] mt-1">
                                    Orders with errors will be skipped. Fix them in your file and re-upload, or remove them below.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Orders Table */}
                    <Card className="bg-[var(--bg-primary)] border-[var(--border-subtle)] overflow-hidden">
                        <CardHeader className="flex flex-row items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)]/30">
                            <div>
                                <CardTitle className="text-lg text-[var(--text-primary)]">Uploaded Orders</CardTitle>
                                <CardDescription className="text-[var(--text-secondary)]">Review and confirm orders before creation</CardDescription>
                            </div>
                            {validCount > 0 && (
                                <Button onClick={handleCreateOrders} className="bg-[var(--primary-blue)] hover:bg-[var(--primary-blue-deep)] text-white">
                                    Create {validCount} Orders
                                    <ArrowRight className="h-4 w-4 ml-2" />
                                </Button>
                            )}
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-[var(--bg-secondary)] border-b border-[var(--border-subtle)]">
                                        <tr>
                                            <th className="text-left p-4 text-xs font-medium text-[var(--text-secondary)] uppercase">Status</th>
                                            <th className="text-left p-4 text-xs font-medium text-[var(--text-secondary)] uppercase">Order ID</th>
                                            <th className="text-left p-4 text-xs font-medium text-[var(--text-secondary)] uppercase">Customer</th>
                                            <th className="text-left p-4 text-xs font-medium text-[var(--text-secondary)] uppercase">Phone</th>
                                            <th className="text-left p-4 text-xs font-medium text-[var(--text-secondary)] uppercase">City</th>
                                            <th className="text-right p-4 text-xs font-medium text-[var(--text-secondary)] uppercase">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--border-subtle)]">
                                        {orders.map((order) => (
                                            <tr
                                                key={order.id}
                                                className={cn(
                                                    "transition-colors",
                                                    order.status === 'error' ? "bg-[var(--error-bg)]/30" : "hover:bg-[var(--bg-secondary)]"
                                                )}
                                            >
                                                <td className="p-4">
                                                    {order.status === 'valid' ? (
                                                        <div className="flex items-center gap-1">
                                                            <CheckCircle className="h-4 w-4 text-[var(--success)]" />
                                                            <span className="text-xs font-medium text-[var(--success)]">Valid</span>
                                                        </div>
                                                    ) : (
                                                        <div>
                                                            <div className="flex items-center gap-1">
                                                                <XCircle className="h-4 w-4 text-[var(--error)]" />
                                                                <span className="text-xs font-medium text-[var(--error)]">Error</span>
                                                            </div>
                                                            {order.error && (
                                                                <p className="text-xs text-[var(--error)] mt-1">{order.error}</p>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="p-4">
                                                    <code className="font-mono text-sm font-medium text-[var(--text-primary)]">{order.orderId}</code>
                                                </td>
                                                <td className="p-4">
                                                    <p className="text-sm font-medium text-[var(--text-primary)]">{order.customer || '-'}</p>
                                                </td>
                                                <td className="p-4">
                                                    <p className="text-sm text-[var(--text-secondary)]">{order.phone}</p>
                                                </td>
                                                <td className="p-4">
                                                    <p className="text-sm text-[var(--text-secondary)]">{order.city}</p>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex justify-end gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => removeOrder(order.id)}
                                                            className="hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--error)]"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
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
