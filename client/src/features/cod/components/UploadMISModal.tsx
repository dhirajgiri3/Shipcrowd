"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import {
    Upload,
    FileSpreadsheet,
    X,
    Check,
    AlertCircle,
    Loader2,
    Download
} from "lucide-react";
import { Button } from '@/src/components/ui/core/Button';
import { useToast } from '@/src/components/ui/feedback/Toast';
import { cn } from "@/src/lib/utils";
import axios from 'axios';

interface UploadMISModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function UploadMISModal({ isOpen, onClose }: UploadMISModalProps) {
    const { addToast } = useToast();
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [provider, setProvider] = useState<'velocity' | 'generic'>('velocity');

    const downloadTemplate = () => {
        const link = document.createElement('a');
        link.href = '/samples/shipcrowd_cod_mis_template.csv';
        link.download = 'shipcrowd_cod_mis_template.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            setFile(acceptedFiles[0]);
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'text/csv': ['.csv'],
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
            'application/vnd.ms-excel': ['.xls']
        },
        maxFiles: 1,
    });

    const handleUpload = async () => {
        if (!file) {
            addToast('Please select a file', 'error');
            return;
        }

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('provider', provider);

        try {
            // TODO: Replace with proper API client call
            await axios.post('/api/v1/finance/cod-remittance/upload-mis', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            addToast('MIS uploaded successfully. Reconciliation started.', 'success');
            setFile(null);
            onClose();
        } catch (error: any) {
            const msg = error.response?.data?.message || 'Failed to upload MIS';
            addToast(msg, 'error');
        } finally {
            setUploading(false);
        }
    };

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
                            className="bg-[var(--bg-primary)] rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-[var(--border-default)] flex flex-col"
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
                                                Upload MIS
                                            </h2>
                                            <p className="text-sm text-[var(--text-secondary)]">
                                                Reconcile COD payments
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
                            <div className="p-6 space-y-6">
                                {/* Provider Selection */}
                                <div>
                                    <label className="text-sm font-medium text-[var(--text-secondary)] mb-2 block">
                                        Remittance Provider
                                    </label>
                                    <select
                                        value={provider}
                                        onChange={(e) => setProvider(e.target.value as any)}
                                        className="w-full px-4 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-blue)]"
                                    >
                                        <option value="velocity">Velocity / Courier</option>
                                        <option value="generic">Generic (Excel/CSV)</option>
                                    </select>
                                </div>

                                {/* Dropzone */}
                                {!file ? (
                                    <div
                                        {...getRootProps()}
                                        className={cn(
                                            "p-8 border-2 border-dashed rounded-2xl transition-all cursor-pointer text-center",
                                            isDragActive
                                                ? "border-[var(--primary-blue)] bg-[var(--primary-blue-soft)]/10 scale-[1.02]"
                                                : "border-[var(--border-default)] hover:border-[var(--primary-blue)] hover:bg-[var(--bg-hover)]"
                                        )}
                                    >
                                        <input {...getInputProps()} />
                                        <Upload className="h-10 w-10 mx-auto mb-3 text-[var(--text-muted)]" />
                                        <p className="font-medium text-[var(--text-primary)]">
                                            {isDragActive ? 'Drop file here' : 'Drag & drop MIS file'}
                                        </p>
                                        <p className="text-xs text-[var(--text-secondary)] mt-1">
                                            Supports CSV, XLS, XLSX
                                        </p>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between p-4 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)]">
                                        <div className="flex items-center gap-3">
                                            <FileSpreadsheet className="h-8 w-8 text-green-600" />
                                            <div>
                                                <p className="text-sm font-medium text-[var(--text-primary)] line-clamp-1">
                                                    {file.name}
                                                </p>
                                                <p className="text-xs text-[var(--text-secondary)]">
                                                    {(file.size / 1024).toFixed(1)} KB
                                                </p>
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setFile(null)}
                                            disabled={uploading}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                )}

                                <div className="bg-[var(--bg-tertiary)] rounded-xl border border-[var(--border-subtle)] p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-medium text-[var(--text-primary)]">Need a template?</p>
                                        <p className="text-xs text-[var(--text-muted)]">
                                            Use the generic MIS CSV format (awb, amount, remittance_date, utr).
                                        </p>
                                    </div>
                                    <Button variant="outline" size="sm" onClick={downloadTemplate}>
                                        <Download className="h-4 w-4 mr-2" />
                                        Download Template
                                    </Button>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-3">
                                    <Button
                                        variant="outline"
                                        onClick={onClose}
                                        disabled={uploading}
                                        className="flex-1"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        variant="primary"
                                        onClick={handleUpload}
                                        disabled={!file || uploading}
                                        className="flex-1"
                                    >
                                        {uploading ? (
                                            <>
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                Uploading...
                                            </>
                                        ) : (
                                            <>
                                                <Check className="h-4 w-4 mr-2" />
                                                Upload MIS
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
