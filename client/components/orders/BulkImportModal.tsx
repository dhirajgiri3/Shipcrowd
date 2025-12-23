import { useState, useRef } from 'react';
import { Modal } from '@/src/shared/components/Modal';
import { Button } from '@/src/shared/components/button';
import { useToast } from '@/src/shared/components/Toast';
import { apiClient } from '@/src/core/api/client';
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2, Download, X } from 'lucide-react';

interface BulkImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

interface ImportResult {
    created: Array<{ orderNumber: string; id: string }>;
    errors: Array<{ row: number; error: string }>;
}

export function BulkImportModal({ isOpen, onClose, onSuccess }: BulkImportModalProps) {
    const { addToast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [result, setResult] = useState<ImportResult | null>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (!file.name.endsWith('.csv')) {
                addToast('Please select a CSV file', 'error');
                return;
            }
            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                addToast('File size must be less than 5MB', 'error');
                return;
            }
            setSelectedFile(file);
            setResult(null);
        }
    };

    const handleUpload = async () => {
        if (!selectedFile) return;

        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', selectedFile);

        try {
            const response = await apiClient.post('/orders/bulk', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            setResult({
                created: response.data.created || [],
                errors: response.data.errors || [],
            });

            if (response.data.created?.length > 0) {
                addToast(`Successfully imported ${response.data.created.length} orders!`, 'success');
                onSuccess();
            }
        } catch (error: any) {
            addToast(error.response?.data?.message || 'Import failed', 'error');
        } finally {
            setIsUploading(false);
        }
    };

    const handleClose = () => {
        setSelectedFile(null);
        setResult(null);
        onClose();
    };

    const downloadTemplate = () => {
        const template = `customer_name,customer_email,customer_phone,address_line1,address_line2,city,state,postal_code,country,product_name,sku,quantity,price,weight,payment_method
John Doe,john@example.com,9876543210,123 Main St,Apt 4B,Mumbai,Maharashtra,400001,India,T-Shirt,TSH-001,2,499,0.5,prepaid
Jane Smith,,9876543211,456 Park Ave,,Delhi,Delhi,110001,India,Shoes,SHO-001,1,1999,1.0,cod`;

        const blob = new Blob([template], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'orders_template.csv';
        a.click();
        window.URL.revokeObjectURL(url);
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Bulk Import Orders">
            <div className="space-y-6">
                {!result ? (
                    <>
                        {/* Template Download */}
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex items-start gap-3">
                                <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-blue-900">Download CSV Template</p>
                                    <p className="text-xs text-blue-700 mt-1">
                                        Use our template to ensure your data is formatted correctly
                                    </p>
                                </div>
                                <Button variant="outline" size="sm" onClick={downloadTemplate}>
                                    <Download className="h-4 w-4 mr-1.5" />
                                    Template
                                </Button>
                            </div>
                        </div>

                        {/* File Upload */}
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-primary)] mb-3">
                                Upload CSV File
                            </label>
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-[var(--border-subtle)] rounded-lg p-8 text-center cursor-pointer hover:border-[var(--primary-blue)] transition-colors"
                            >
                                <Upload className="h-10 w-10 mx-auto text-[var(--text-muted)] mb-3" />
                                {selectedFile ? (
                                    <div>
                                        <p className="text-sm font-medium text-[var(--text-primary)]">
                                            {selectedFile.name}
                                        </p>
                                        <p className="text-xs text-[var(--text-muted)] mt-1">
                                            {(selectedFile.size / 1024).toFixed(2)} KB
                                        </p>
                                    </div>
                                ) : (
                                    <div>
                                        <p className="text-sm font-medium text-[var(--text-primary)]">
                                            Click to upload or drag and drop
                                        </p>
                                        <p className="text-xs text-[var(--text-muted)] mt-1">
                                            CSV file up to 5MB
                                        </p>
                                    </div>
                                )}
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".csv"
                                onChange={handleFileSelect}
                                className="hidden"
                            />
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-subtle)]">
                            <Button variant="outline" onClick={handleClose}>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleUpload}
                                disabled={!selectedFile}
                                isLoading={isUploading}
                            >
                                {isUploading ? 'Importing...' : 'Import Orders'}
                            </Button>
                        </div>
                    </>
                ) : (
                    <>
                        {/* Results Summary */}
                        <div className="space-y-4">
                            {result.created.length > 0 && (
                                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                                    <div className="flex items-start gap-3">
                                        <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                                        <div>
                                            <p className="text-sm font-medium text-green-900">
                                                {result.created.length} orders imported successfully
                                            </p>
                                            <div className="mt-2 max-h-32 overflow-y-auto space-y-1">
                                                {result.created.slice(0, 5).map((order) => (
                                                    <p key={order.id} className="text-xs text-green-700 font-mono">
                                                        {order.orderNumber}
                                                    </p>
                                                ))}
                                                {result.created.length > 5 && (
                                                    <p className="text-xs text-green-700">
                                                        +{result.created.length - 5} more...
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {result.errors.length > 0 && (
                                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                                    <div className="flex items-start gap-3">
                                        <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-red-900">
                                                {result.errors.length} rows failed to import
                                            </p>
                                            <div className="mt-2 max-h-48 overflow-y-auto space-y-2">
                                                {result.errors.map((error, idx) => (
                                                    <div key={idx} className="text-xs">
                                                        <span className="font-medium text-red-800">Row {error.row}:</span>{' '}
                                                        <span className="text-red-700">{error.error}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Close Button */}
                        <div className="flex justify-end pt-4 border-t border-[var(--border-subtle)]">
                            <Button onClick={handleClose}>Done</Button>
                        </div>
                    </>
                )}
            </div>
        </Modal>
    );
}
