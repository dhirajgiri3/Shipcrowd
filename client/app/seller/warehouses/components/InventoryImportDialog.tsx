import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/src/components/ui/feedback/Dialog';
import { Button } from '@/src/components/ui/core/Button';
import { Upload, FileText, AlertCircle, CheckCircle2, Download } from 'lucide-react';
import { useImportInventory } from '@/src/core/api/hooks/logistics/useInventory';
import { cn } from '@/src/lib/utils';

interface InventoryImportDialogProps {
    warehouseId: string;
    isOpen: boolean;
    onClose: () => void;
}

export function InventoryImportDialog({ warehouseId, isOpen, onClose }: InventoryImportDialogProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const { mutate: importInventory, isPending, isSuccess, error, reset } = useImportInventory();
    const [stats, setStats] = useState<{ success: number; failed: number; errors?: any[] } | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
            reset();
            setStats(null);
        }
    };

    const handleUpload = () => {
        if (!selectedFile) return;

        importInventory(
            { warehouseId, file: selectedFile },
            {
                onSuccess: (data) => {
                    setStats({ success: data.success, failed: data.failed, errors: data.errors });
                    setSelectedFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                }
            }
        );
    };

    const downloadTemplate = () => {
        const headers = ['sku', 'quantity', 'productName', 'location', 'barcode', 'reorderPoint'];
        const sampleRow = ['TEST-SKU-001', '100', 'Test Product Name', 'A-01-01', '123456789', '10'];
        const csvContent = [headers.join(','), sampleRow.join(',')].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'inventory_import_template.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    };

    const handleClose = () => {
        setSelectedFile(null);
        setStats(null);
        reset();
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Import Inventory</DialogTitle>
                    <DialogDescription>
                        Upload a CSV file to bulk import or update inventory items.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Template Download */}
                    <div className="bg-[var(--bg-tertiary)] p-4 rounded-lg flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-[var(--text-primary)]">Need a template?</p>
                            <p className="text-xs text-[var(--text-muted)]">Download our CSV template to get started.</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={downloadTemplate}>
                            <Download className="w-4 h-4 mr-2" />
                            Download
                        </Button>
                    </div>

                    {/* File Upload Area */}
                    {!isSuccess ? (
                        <div
                            className={cn(
                                "border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer hover:border-[var(--primary-blue)]/50 hover:bg-[var(--primary-blue)]/5",
                                selectedFile ? "border-[var(--primary-blue)] bg-[var(--primary-blue)]/5" : "border-[var(--border-default)]"
                            )}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input
                                type="file"
                                accept=".csv"
                                className="hidden"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                            />

                            {selectedFile ? (
                                <div className="space-y-2">
                                    <div className="w-12 h-12 bg-[var(--primary-blue)]/10 text-[var(--primary-blue)] rounded-full flex items-center justify-center mx-auto">
                                        <FileText className="w-6 h-6" />
                                    </div>
                                    <p className="font-medium text-[var(--text-primary)]">{selectedFile.name}</p>
                                    <p className="text-xs text-[var(--text-muted)]">{(selectedFile.size / 1024).toFixed(2)} KB</p>
                                    <p className="text-xs text-[var(--primary-blue)] font-medium pt-2">Click to change file</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <div className="w-12 h-12 bg-[var(--bg-tertiary)] text-[var(--text-muted)] rounded-full flex items-center justify-center mx-auto">
                                        <Upload className="w-6 h-6" />
                                    </div>
                                    <p className="font-medium text-[var(--text-primary)]">Click to upload CSV</p>
                                    <p className="text-xs text-[var(--text-muted)]">or drag and drop file here</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="bg-[var(--success-bg)] border border-[var(--success)]/20 rounded-xl p-6 text-center space-y-3">
                            <div className="w-12 h-12 bg-[var(--success)]/10 text-[var(--success)] rounded-full flex items-center justify-center mx-auto">
                                <CheckCircle2 className="w-6 h-6" />
                            </div>
                            <h3 className="font-semibold text-[var(--text-primary)]">Import Completed</h3>
                            <div className="flex items-center justify-center gap-6 text-sm">
                                <span className="text-[var(--success)] font-medium">{stats?.success} Success</span>
                                <span className="text-[var(--error)] font-medium">{stats?.failed} Failed</span>
                            </div>

                            {stats?.errors && stats.errors.length > 0 && (
                                <div className="mt-2 bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-lg p-3 text-left max-h-40 overflow-y-auto">
                                    <p className="text-xs font-semibold text-[var(--text-primary)] mb-2 sticky top-0 bg-[var(--bg-primary)]">Failed Items:</p>
                                    <ul className="space-y-1 text-xs text-[var(--error)]">
                                        {stats.errors.map((err, idx) => (
                                            <li key={idx}>
                                                Row {err.row}: <span className="font-medium text-[var(--text-secondary)]">{err.sku}</span> - {err.error}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            <Button variant="outline" size="sm" onClick={() => {
                                setStats(null);
                                setSelectedFile(null);
                                reset();
                            }}>
                                Upload Another
                            </Button>
                        </div>
                    )}

                    {error && (
                        <div className="bg-[var(--warning-bg)] text-[var(--warning)] p-3 rounded-lg text-sm flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                            <p>{error.message || "Failed to import inventory. Please try again."}</p>
                        </div>
                    )}
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="ghost" onClick={handleClose}>
                        {isSuccess ? 'Close' : 'Cancel'}
                    </Button>
                    {!isSuccess && (
                        <Button
                            variant="primary"
                            onClick={handleUpload}
                            disabled={!selectedFile || isPending}
                            className="bg-[var(--primary-blue)] hover:bg-[var(--primary-blue-deep)] text-white"
                        >
                            {isPending ? 'Importing...' : 'Import Inventory'}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
