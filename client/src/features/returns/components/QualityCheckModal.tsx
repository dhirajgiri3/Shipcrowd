/**
 * Quality Check Modal
 * 
 * Perform QC on returned items:
 * - Item-by-item inspection
 * - Condition assessment
 * - Image upload with preview
 * - Restocking decisions
 */

'use client';

import React, { useState } from 'react';
import { usePerformQC } from '@/src/core/api/hooks';
import type { PerformQCPayload, ReturnItem } from '@/src/types/api/returns.types';
import { toast } from 'sonner';
import { handleApiError } from '@/src/lib/error-handler';
import { uploadQCImages, UploadError } from '@/src/lib/upload';

interface QCModalProps {
    returnId: string;
    items: ReturnItem[];
    isOpen: boolean;
    onClose: () => void;
}

const CONDITION_OPTIONS = [
    { value: 'new', label: 'New', color: 'bg-green-600' },
    { value: 'used', label: 'Used', color: 'bg-blue-600' },
    { value: 'damaged', label: 'Damaged', color: 'bg-orange-600' },
    { value: 'defective', label: 'Defective', color: 'bg-red-600' },
];

export function QualityCheckModal({ returnId, items, isOpen, onClose }: QCModalProps) {
    const [qcItems, setQCItems] = useState(
        items.map(item => ({
            productId: item.productId,
            productName: item.productName,
            expectedQuantity: item.returnQuantity,
            receivedQuantity: item.returnQuantity,
            condition: 'new' as const,
            notes: '',
            images: [] as string[],
            passed: true,
        }))
    );
    // Track File objects separately from URLs
    const [itemImages, setItemImages] = useState<Record<string, File[]>>({});
    const [overallNotes, setOverallNotes] = useState('');
    const [restockable, setRestockable] = useState(true);
    const [isUploading, setIsUploading] = useState(false);

    const performQC = usePerformQC();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        if (!overallNotes.trim()) {
            toast.error('Overall notes are required');
            return;
        }

        setIsUploading(true);

        try {
            // Upload all images for all items
            const updatedQCItems = await Promise.all(
                qcItems.map(async (item, index) => {
                    const files = itemImages[item.productId] || [];
                    if (files.length === 0) {
                        return item;
                    }

                    // Upload images for this item
                    const uploadedUrls = await uploadQCImages(files, {
                        onProgress: (fileName, progress) => {
                            console.log(`Uploading ${fileName} for ${item.productName}: ${progress}%`);
                        },
                    });

                    return {
                        ...item,
                        images: uploadedUrls,
                    };
                })
            );

            const payload: PerformQCPayload = {
                items: updatedQCItems,
                overallNotes,
                restockable,
            };

            await performQC.mutateAsync({ returnId, payload });
            toast.success('Quality check completed successfully!', {
                description: 'All items inspected and documented',
            });
            onClose();
            // Reset form
            setOverallNotes('');
            setRestockable(true);
            setItemImages({});
        } catch (error) {
            if (error instanceof UploadError) {
                toast.error(error.message, {
                    description: 'Please check your files and try again',
                });
                return;
            }
            handleApiError(error, 'Failed to complete quality check');
        } finally {
            setIsUploading(false);
        }
    };

    const updateItem = (index: number, updates: Partial<typeof qcItems[0]>) => {
        setQCItems(prev => prev.map((item, i) => i === index ? { ...item, ...updates } : item));
    };

    const handleImageSelect = (productId: string, files: FileList | null) => {
        if (!files || files.length === 0) return;

        const newFiles = Array.from(files);
        const MAX_FILES = 5;
        const currentCount = (itemImages[productId] || []).length;

        if (currentCount + newFiles.length > MAX_FILES) {
            toast.error(`Maximum ${MAX_FILES} images per item`, {
                description: `You can only upload ${MAX_FILES - currentCount} more image(s)`,
            });
            return;
        }

        setItemImages(prev => ({
            ...prev,
            [productId]: [...(prev[productId] || []), ...newFiles],
        }));
    };

    const removeImage = (productId: string, index: number) => {
        setItemImages(prev => ({
            ...prev,
            [productId]: (prev[productId] || []).filter((_, i) => i !== index),
        }));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                            Quality Check
                        </h2>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="p-6 space-y-6">
                        {/* Items Inspection */}
                        {qcItems.map((item, index) => (
                            <div key={item.productId} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <h3 className="font-medium text-gray-900 dark:text-white">{item.productName}</h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Product ID: {item.productId}</p>
                                    </div>
                                    <label className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={item.passed}
                                            onChange={(e) => updateItem(index, { passed: e.target.checked })}
                                            className="rounded border-gray-300"
                                        />
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">QC Pass</span>
                                    </label>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    {/* Quantity */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Expected Quantity
                                        </label>
                                        <input
                                            type="number"
                                            value={item.expectedQuantity}
                                            readOnly
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Received Quantity
                                        </label>
                                        <input
                                            type="number"
                                            value={item.receivedQuantity}
                                            onChange={(e) => updateItem(index, { receivedQuantity: parseInt(e.target.value) || 0 })}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                                            min={0}
                                            max={item.expectedQuantity}
                                        />
                                    </div>
                                </div>

                                {/* Condition */}
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Condition
                                    </label>
                                    <div className="grid grid-cols-4 gap-2">
                                        {CONDITION_OPTIONS.map(opt => (
                                            <button
                                                key={opt.value}
                                                type="button"
                                                onClick={() => updateItem(index, { condition: opt.value as any })}
                                                className={`px-3 py-2 rounded-lg text-white text-sm font-medium ${item.condition === opt.value ? opt.color : 'bg-gray-300 dark:bg-gray-600'
                                                    }`}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Notes */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Inspection Notes
                                    </label>
                                    <textarea
                                        value={item.notes}
                                        onChange={(e) => updateItem(index, { notes: e.target.value })}
                                        rows={2}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg resize-none"
                                        placeholder="Add any observations or issues found..."
                                    />
                                </div>

                                {/* QC Images */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        QC Photos (Optional, max 5)
                                    </label>
                                    <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 hover:border-primary-500 transition-colors">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            multiple
                                            onChange={(e) => handleImageSelect(item.productId, e.target.files)}
                                            className="hidden"
                                            id={`qc-image-${item.productId}`}
                                            disabled={isUploading || performQC.isPending}
                                        />
                                        <label htmlFor={`qc-image-${item.productId}`} className="cursor-pointer block text-center">
                                            <svg className="mx-auto h-8 w-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                                Click to upload condition photos
                                            </p>
                                            <p className="text-xs text-gray-500 mt-1">
                                                PNG, JPG up to 10MB each
                                            </p>
                                        </label>
                                    </div>

                                    {/* Image Previews */}
                                    {itemImages[item.productId]?.length > 0 && (
                                        <div className="mt-3 grid grid-cols-5 gap-2">
                                            {itemImages[item.productId].map((file, imgIdx) => (
                                                <div key={imgIdx} className="relative group">
                                                    <img
                                                        src={URL.createObjectURL(file)}
                                                        alt={`QC ${imgIdx + 1}`}
                                                        className="w-full h-20 object-cover rounded-lg border border-gray-200"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => removeImage(item.productId, imgIdx)}
                                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                                        disabled={isUploading || performQC.isPending}
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                        </svg>
                                                    </button>
                                                    <div className="absolute bottom-1 left-1 right-1 bg-black/50 text-white text-xs p-1 rounded truncate">
                                                        {file.name}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}

                        {/* Overall Assessment */}
                        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Overall Assessment</h3>

                            <div className="mb-4">
                                <label className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={restockable}
                                        onChange={(e) => setRestockable(e.target.checked)}
                                        className="rounded border-gray-300"
                                    />
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Items can be restocked for resale
                                    </span>
                                </label>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Overall Notes
                                </label>
                                <textarea
                                    value={overallNotes}
                                    onChange={(e) => setOverallNotes(e.target.value)}
                                    rows={4}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg resize-none"
                                    placeholder="Add general notes about the return inspection..."
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={performQC.isPending || isUploading}
                            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
                        >
                            {(performQC.isPending || isUploading) ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    {isUploading ? 'Uploading Images...' : 'Processing...'}
                                </>
                            ) : (
                                'Complete QC'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
