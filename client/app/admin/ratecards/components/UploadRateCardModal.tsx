"use client";

import { useState, useCallback, useEffect } from "react";
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
    Zap,
    Download
} from "lucide-react";
import { Button } from '@/src/components/ui/core/Button';
import { Input } from '@/src/components/ui/core/Input';
import { useToast } from '@/src/components/ui/feedback/Toast';
import { Modal } from '@/src/components/ui/feedback/Modal';
import { cn } from "@/src/lib/utils";
import { apiClient } from '@/src/core/api/http';

interface UploadRateCardModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    companyId?: string;
    companies?: Array<{ _id: string; name: string }>;
}

export function UploadRateCardModal({ isOpen, onClose, onSuccess, companyId, companies = [] }: UploadRateCardModalProps) {
    const { addToast } = useToast();
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [selectedCompanyId, setSelectedCompanyId] = useState<string>(companyId || companies[0]?._id || '');

    // V2 Fields
    const [version, setVersion] = useState('v2');
    const [fuelSurcharge, setFuelSurcharge] = useState<string>('0');
    const [isLocked, setIsLocked] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);

    useEffect(() => {
        if (companyId) {
            setSelectedCompanyId(companyId);
            return;
        }
        if (!selectedCompanyId && companies.length > 0) {
            setSelectedCompanyId(companies[0]._id);
        }
    }, [companyId, companies, selectedCompanyId]);

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
        if (!selectedCompanyId) {
            addToast('Please select a company before importing rate cards', 'error');
            return;
        }

        if (!file) {
            addToast('Please select a file', 'error');
            return;
        }

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('companyId', selectedCompanyId);

        // Append Metadata
        const metadata = {
            version,
            fuelSurcharge: Number(fuelSurcharge),
            isLocked,
            fuelSurchargeBase: 'freight' // Default for now
        };
        formData.append('metadata', JSON.stringify(metadata));

        try {
            await apiClient.post('/admin/ratecards/import', formData, {
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

    const downloadSample = (url: string, filename: string) => {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Import Rate Cards"
            size="md"
        >
            <div className="space-y-6">
                {/* Company Selection */}
                {companies.length > 0 && (
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                            Company
                        </label>
                        <select
                            value={selectedCompanyId}
                            onChange={(e) => setSelectedCompanyId(e.target.value)}
                            className="w-full h-10 px-3 rounded-lg bg-[var(--bg-tertiary)] text-sm text-[var(--text-primary)] border border-[var(--border-default)] focus:border-[var(--primary-blue)] focus:ring-1 focus:ring-[var(--primary-blue)]/20 transition-all"
                        >
                            {companies.map((company) => (
                                <option key={company._id} value={company._id}>
                                    {company.name}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

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

                {/* Sample Templates */}
                <div className="bg-[var(--bg-tertiary)] p-4 rounded-xl border border-[var(--border-subtle)] flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                        <p className="text-sm font-medium text-[var(--text-primary)]">Need a CSV template?</p>
                        <p className="text-xs text-[var(--text-muted)]">
                            Download the exact import format. Zone Pricing uses zones A–E with BaseWeight in kg.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => downloadSample('/samples/shipcrowd_ratecard_zone_pricing_template.csv', 'shipcrowd_ratecard_zone_pricing_template.csv')}
                        >
                            <Download className="h-4 w-4 mr-2" />
                            Zone Pricing CSV
                        </Button>
                    </div>
                </div>

                {/* Advanced Settings Toggle */}
                <div>
                    <button
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className="flex items-center gap-2 text-sm text-[var(--primary-blue)] font-medium hover:underline"
                    >
                        <Settings2 className="h-4 w-4" />
                        {showAdvanced ? 'Hide Advanced Options' : 'Show Advanced Options (Fuel, Version, Lock)'}
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
                                <div className="grid grid-cols-1 gap-4">
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
                        disabled={!file || uploading || !selectedCompanyId}
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
        </Modal>
    );
}
