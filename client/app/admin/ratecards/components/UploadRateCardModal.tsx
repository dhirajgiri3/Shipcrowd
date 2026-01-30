"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import {
    Upload,
    FileSpreadsheet,
    X,
    Check,
    Loader2,
    Settings2,
    Lock,
    Zap
} from "lucide-react";
import { Button } from '@/src/components/ui/core/Button';
import { Input } from '@/src/components/ui/core/Input';
import { useToast } from '@/src/components/ui/feedback/Toast';
import { cn } from "@/src/lib/utils";
import axios from 'axios';

interface UploadRateCardModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

export function UploadRateCardModal({ isOpen, onClose, onSuccess }: UploadRateCardModalProps) {
    const { addToast } = useToast();
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);

    // V2 Fields
    const [version, setVersion] = useState('v1');
    const [fuelSurcharge, setFuelSurcharge] = useState<string>('0');
    const [minCall, setMinCall] = useState<string>('0');
    const [isLocked, setIsLocked] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);

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

        // Append Metadata
        const metadata = {
            version,
            fuelSurcharge: Number(fuelSurcharge),
            minimumCall: Number(minCall),
            isLocked,
            fuelSurchargeBase: 'freight' // Default for now
        };
        formData.append('metadata', JSON.stringify(metadata));

        try {
            await axios.post('/api/v1/ratecards/import', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            addToast('Rate cards imported successfully', 'success');
            setFile(null);
            onSuccess?.();
            onClose();
        } catch (error: any) {
            const msg = error.response?.data?.message || 'Failed to import rate cards';
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
                                                Import Rate Cards
                                            </h2>
                                            <p className="text-sm text-[var(--text-secondary)]">
                                                Upload CSV or Excel file
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
                                            {isDragActive ? 'Drop file here' : 'Drag & drop CSV file'}
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

                                {/* Advanced Settings Toggle */}
                                <div>
                                    <button
                                        onClick={() => setShowAdvanced(!showAdvanced)}
                                        className="flex items-center gap-2 text-sm text-[var(--primary-blue)] font-medium hover:underline"
                                    >
                                        <Settings2 className="h-4 w-4" />
                                        {showAdvanced ? 'Hide Advanced Options' : 'Show Advanced Options (Fuel, MinCall)'}
                                    </button>
                                </div>

                                <AnimatePresence>
                                    {showAdvanced && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="space-y-4 p-4 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)]">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="text-xs font-medium text-[var(--text-secondary)] mb-1 block">
                                                            Version Tag
                                                        </label>
                                                        <Input
                                                            type="text"
                                                            value={version}
                                                            onChange={(e) => setVersion(e.target.value)}
                                                            placeholder="e.g. v2"
                                                            size="sm"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-medium text-[var(--text-secondary)] mb-1 block">
                                                            Min Call Charge (₹)
                                                        </label>
                                                        <Input
                                                            type="number"
                                                            min="0"
                                                            value={minCall}
                                                            onChange={(e) => setMinCall(e.target.value)}
                                                            size="sm"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="text-xs font-medium text-[var(--text-secondary)] mb-1 block">
                                                            Fuel Surcharge (%)
                                                        </label>
                                                        <Input
                                                            type="number"
                                                            min="0"
                                                            max="100"
                                                            value={fuelSurcharge}
                                                            onChange={(e) => setFuelSurcharge(e.target.value)}
                                                            icon={<Zap className="h-4 w-4 text-orange-500" />}
                                                            size="sm"
                                                        />
                                                    </div>
                                                    <div className="flex items-center pt-6">
                                                        <label className="flex items-center gap-2 cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                checked={isLocked}
                                                                onChange={(e) => setIsLocked(e.target.checked)}
                                                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                            />
                                                            <span className="text-sm font-medium text-[var(--text-primary)] flex items-center gap-1">
                                                                <Lock className="h-3 w-3" /> Lock Rate Card
                                                            </span>
                                                        </label>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

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
                                                Importing...
                                            </>
                                        ) : (
                                            <>
                                                <Check className="h-4 w-4 mr-2" />
                                                Import Rate Cards
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
