"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import Papa from "papaparse";
import { motion, AnimatePresence } from "framer-motion";
import {
    Upload,
    FileText,
    Check,
    X,
    Download,
    AlertCircle,
    Loader2,
    FileSpreadsheet
} from "lucide-react";
import { Button } from '@/src/components/ui/core/Button';
import { Badge } from '@/src/components/ui/core/Badge';
import { useToast } from '@/src/components/ui/feedback/Toast';
import { cn } from "@/src/lib/utils";
import { orderApi } from '@/src/core/api/clients/orders/orderApi';
import { useBulkOrderImport } from '@/src/core/api/hooks/orders/useBulkOrderImport';

interface CSVUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface ParsedRow {
    row: number;
    data: any;
    errors: string[];
    isValid: boolean;
}

export function CSVUploadModal({ isOpen, onClose }: CSVUploadModalProps) {
    const { addToast } = useToast();
    const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
    const [uploading, setUploading] = useState(false);

    const validateRow = (row: any, rowIndex: number): ParsedRow => {
        const errors: string[] = [];

        // Required fields validation
        if (!row.customer_name || row.customer_name.trim() === '') {
            errors.push('Customer name is required');
        }
        if (!row.phone || !/^\d{10}$/.test(row.phone)) {
            errors.push('Valid 10-digit phone required');
        }
        if (!row.address) {
            errors.push('Address is required');
        }
        if (!row.city) {
            errors.push('City is required');
        }
        if (!row.pincode || !/^\d{6}$/.test(row.pincode)) {
            errors.push('Valid 6-digit pincode required');
        }
        if (!row.product || row.product.trim() === '') {
            errors.push('Product name is required');
        }
        if (!row.weight || parseFloat(row.weight) <= 0) {
            errors.push('Valid weight required');
        }
        if (!row.price || parseFloat(row.price) <= 0) {
            errors.push('Valid price required');
        }
        if (!['cod', 'prepaid'].includes(row.payment_mode?.toLowerCase())) {
            errors.push('Payment mode must be "cod" or "prepaid"');
        }

        return {
            row: rowIndex + 2, // +2 because Excel starts at 1 and has header row
            data: row,
            errors,
            isValid: errors.length === 0,
        };
    };

    const onDrop = useCallback((acceptedFiles: File[]) => {
        const file = acceptedFiles[0];
        if (!file) return;

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const validated = results.data.map((row, index) => validateRow(row, index));
                setParsedData(validated);

                const validCount = validated.filter(r => r.isValid).length;
                const errorCount = validated.filter(r => !r.isValid).length;

                if (validCount > 0) {
                    addToast(`Parsed ${validCount} valid rows, ${errorCount} errors`, 'success');
                } else {
                    addToast('No valid rows found. Please check your CSV', 'error');
                }
            },
            error: (error) => {
                addToast(`CSV parsing error: ${error.message}`, 'error');
            },
        });
    }, [addToast]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'text/csv': ['.csv'],
            'application/vnd.ms-excel': ['.csv'],
        },
        maxFiles: 1,
    });

    const importMutation = useBulkOrderImport({
        onSuccess: (result) => {
            if (result.success) {
                const imported = result.data.imported || 0;
                const failed = result.data.failed || 0;

                addToast(`Successfully created ${imported} orders`, 'success');
                if (failed > 0) {
                    addToast(`${failed} rows failed to import`, 'warning');
                }
                setParsedData([]);
                onClose();
            } else {
                addToast('Bulk upload failed (API returned failure)', 'error');
            }
            setUploading(false);
        },
        onError: (error) => {
            // Toast handled by hook
            setUploading(false);
        }
    });

    const handleUpload = async () => {
        const validRows = parsedData.filter((r) => r.isValid);

        if (validRows.length === 0) {
            addToast('No valid rows to upload', 'error');
            return;
        }

        setUploading(true);
        try {
            // Convert CSV rows to File object for multipart/form-data
            const csvContent = [
                'customer_name,phone,email,address,address_line2,city,state,pincode,product,sku,quantity,weight,price,payment_mode',
                ...validRows.map(r =>
                    [
                        r.data.customer_name,
                        r.data.phone,
                        r.data.email || '',
                        r.data.address,
                        r.data.address_line2 || '',
                        r.data.city,
                        r.data.state || '',
                        r.data.pincode,
                        r.data.product,
                        r.data.sku || '',
                        r.data.quantity || '1',
                        r.data.weight,
                        r.data.price,
                        r.data.payment_mode,
                    ].join(',')
                ),
            ].join('\n');

            const csvFile = new File([csvContent], 'bulk-orders.csv', { type: 'text/csv' });

            // Use mutation hook
            importMutation.mutate(csvFile);

        } catch (error: any) {
            const errorMessage = error?.response?.data?.message || error?.message || 'Bulk upload failed';
            addToast(errorMessage, 'error');
            setUploading(false);
        }
    };

    const downloadTemplate = () => {
        const template = `customer_name,phone,email,address,address_line2,city,state,pincode,product,sku,quantity,weight,price,payment_mode
Rahul Sharma,9876543210,rahul@email.com,123 MG Road,,Mumbai,Maharashtra,400001,Cotton T-Shirt,TS-001,1,0.3,499,prepaid
Priya Singh,9123456789,priya@email.com,456 Connaught Place,,Delhi,Delhi,110001,Jeans,JN-002,2,0.8,1299,cod
Amit Kumar,9988776655,amit@email.com,789 Electronic City,,Bangalore,Karnataka,560100,Wireless Earbuds,WE-003,1,0.2,2499,prepaid`;

        const blob = new Blob([template], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'Shipcrowd-bulk-order-template.csv';
        a.click();
        URL.revokeObjectURL(url);

        addToast('Template downloaded', 'success');
    };

    const validCount = parsedData.filter((r) => r.isValid).length;
    const errorCount = parsedData.filter((r) => !r.isValid).length;

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                        onClick={onClose}
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: "spring", duration: 0.3 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    >
                        <div
                            className="bg-[var(--bg-primary)] rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-[var(--border-default)] flex flex-col"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="bg-[var(--bg-primary)] border-b border-[var(--border-subtle)] p-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[var(--primary-blue)] to-[var(--primary-blue-light)] flex items-center justify-center shadow-lg shadow-blue-500/20">
                                            <FileSpreadsheet className="h-5 w-5 text-white" />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-bold text-[var(--text-primary)]">
                                                CSV Bulk Upload
                                            </h2>
                                            <p className="text-sm text-[var(--text-secondary)]">
                                                Upload multiple orders at once
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={onClose}
                                        className="h-8 w-8 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] flex items-center justify-center transition-colors"
                                    >
                                        <X className="h-4 w-4 text-[var(--text-muted)]" />
                                    </button>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                {/* Template Download */}
                                <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/50">
                                    <div className="flex items-start gap-3">
                                        <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                                        <div className="flex-1">
                                            <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                                                Download CSV Template
                                            </h4>
                                            <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                                                Use our template to ensure proper formatting. All fields are required except email, address_line2, state, and sku.
                                            </p>
                                            <Button variant="outline" size="sm" onClick={downloadTemplate}>
                                                <Download className="h-4 w-4 mr-2" />
                                                Download Template
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                {/* Dropzone or Preview */}
                                {parsedData.length === 0 ? (
                                    <div
                                        {...getRootProps()}
                                        className={cn(
                                            "p-12 border-2 border-dashed rounded-2xl transition-all cursor-pointer",
                                            isDragActive
                                                ? "border-[var(--primary-blue)] bg-[var(--primary-blue-soft)]/10 scale-[1.02]"
                                                : "border-[var(--border-default)] hover:border-[var(--primary-blue)] hover:bg-[var(--bg-hover)]"
                                        )}
                                    >
                                        <input {...getInputProps()} />
                                        <div className="text-center">
                                            <Upload className="h-12 w-12 mx-auto mb-4 text-[var(--text-muted)]" />
                                            <p className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                                                {isDragActive ? 'Drop your CSV file here' : 'Drag & drop CSV file'}
                                            </p>
                                            <p className="text-sm text-[var(--text-secondary)]">
                                                or click to browse
                                            </p>
                                            <p className="text-xs text-[var(--text-muted)] mt-2">
                                                Supports CSV files with proper headers
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        {/* Summary */}
                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="p-4 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)]">
                                                <p className="text-sm text-[var(--text-secondary)] mb-1">Total Rows</p>
                                                <p className="text-3xl font-bold text-[var(--text-primary)]">{parsedData.length}</p>
                                            </div>
                                            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl border border-emerald-200 dark:border-emerald-800/50">
                                                <p className="text-sm text-emerald-700 dark:text-emerald-300 mb-1">Valid</p>
                                                <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{validCount}</p>
                                            </div>
                                            <div className="p-4 bg-rose-50 dark:bg-rose-950/20 rounded-xl border border-rose-200 dark:border-rose-800/50">
                                                <p className="text-sm text-rose-700 dark:text-rose-300 mb-1">Errors</p>
                                                <p className="text-3xl font-bold text-rose-600 dark:text-rose-400">{errorCount}</p>
                                            </div>
                                        </div>

                                        {/* Preview Table */}
                                        <div className="border border-[var(--border-default)] rounded-xl overflow-hidden">
                                            <div className="max-h-96 overflow-y-auto">
                                                <table className="w-full text-sm">
                                                    <thead className="bg-[var(--bg-tertiary)] sticky top-0 z-10">
                                                        <tr>
                                                            <th className="px-4 py-3 text-left font-semibold text-[var(--text-secondary)]">Row</th>
                                                            <th className="px-4 py-3 text-left font-semibold text-[var(--text-secondary)]">Customer</th>
                                                            <th className="px-4 py-3 text-left font-semibold text-[var(--text-secondary)]">Product</th>
                                                            <th className="px-4 py-3 text-left font-semibold text-[var(--text-secondary)]">Location</th>
                                                            <th className="px-4 py-3 text-left font-semibold text-[var(--text-secondary)]">Status</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {parsedData.map((row, index) => (
                                                            <tr
                                                                key={index}
                                                                className={cn(
                                                                    "border-t border-[var(--border-subtle)] transition-colors",
                                                                    row.isValid
                                                                        ? "bg-emerald-50/30 dark:bg-emerald-950/10 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20"
                                                                        : "bg-rose-50/30 dark:bg-rose-950/10 hover:bg-rose-50/50 dark:hover:bg-rose-950/20"
                                                                )}
                                                            >
                                                                <td className="px-4 py-3 font-medium text-[var(--text-muted)]">{row.row}</td>
                                                                <td className="px-4 py-3">
                                                                    <div>
                                                                        <p className="font-medium text-[var(--text-primary)]">{row.data.customer_name}</p>
                                                                        <p className="text-xs text-[var(--text-muted)]">{row.data.phone}</p>
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-3 text-[var(--text-secondary)]">{row.data.product}</td>
                                                                <td className="px-4 py-3 text-[var(--text-secondary)]">{row.data.city}</td>
                                                                <td className="px-4 py-3">
                                                                    {row.isValid ? (
                                                                        <Badge className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                                                                            <Check className="h-3 w-3 mr-1" />
                                                                            Valid
                                                                        </Badge>
                                                                    ) : (
                                                                        <div className="space-y-1">
                                                                            <Badge className="bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300">
                                                                                <X className="h-3 w-3 mr-1" />
                                                                                {row.errors.length} {row.errors.length === 1 ? 'error' : 'errors'}
                                                                            </Badge>
                                                                            <div className="flex items-start gap-1 text-xs text-rose-600 dark:text-rose-400">
                                                                                <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
                                                                                <span className="line-clamp-2">{row.errors[0]}</span>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex gap-3">
                                            <Button
                                                variant="outline"
                                                onClick={() => setParsedData([])}
                                                disabled={uploading}
                                            >
                                                Choose Different File
                                            </Button>
                                            <Button
                                                variant="primary"
                                                onClick={handleUpload}
                                                disabled={validCount === 0 || uploading}
                                                className="flex-1 shadow-lg shadow-blue-500/20"
                                            >
                                                {uploading ? (
                                                    <>
                                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                        Uploading...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Upload className="h-4 w-4 mr-2" />
                                                        Upload {validCount} Valid {validCount === 1 ? 'Order' : 'Orders'}
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

export default CSVUploadModal;
