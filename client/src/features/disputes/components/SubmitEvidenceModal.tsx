/**
 * Submit Evidence Modal
 * 
 * Modal for sellers to submit evidence for weight disputes:
 * - Photo upload (multiple) with real S3/CloudFlare uploads
 * - Document upload (invoices, receipts)
 * - Notes/explanation textarea
 * - File preview with remove functionality
 * - Upload progress tracking
 * - Toast notifications for feedback
 */

'use client';

import React, { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useSubmitEvidence } from '@/src/core/api/hooks';
import { uploadEvidenceFiles, UploadError } from '@/src/lib/upload';
import { handleApiError } from '@/src/lib/error-handler';

interface SubmitEvidenceModalProps {
    isOpen: boolean;
    onClose: () => void;
    disputeId: string;
}

export function SubmitEvidenceModal({ isOpen, onClose, disputeId }: SubmitEvidenceModalProps) {
    const [photos, setPhotos] = useState<File[]>([]);
    const [documents, setDocuments] = useState<File[]>([]);
    const [notes, setNotes] = useState('');
    const [isUploading, setIsUploading] = useState(false);

    const submitEvidence = useSubmitEvidence();

    if (!isOpen) return null;

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            // Append new photos instead of replacing
            setPhotos(prev => [...prev, ...Array.from(e.target.files!)]);
            // Reset input so same file can be selected again
            e.target.value = '';
        }
    };

    const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            // Append new documents instead of replacing
            setDocuments(prev => [...prev, ...Array.from(e.target.files!)]);
            // Reset input so same file can be selected again
            e.target.value = '';
        }
    };

    const removePhoto = (index: number) => {
        setPhotos(prev => prev.filter((_, i) => i !== index));
    };

    const removeDocument = (index: number) => {
        setDocuments(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        // Validation with toast
        if (photos.length === 0 && documents.length === 0 && !notes.trim()) {
            toast.error('Please provide at least one form of evidence', {
                description: 'Upload photos, documents, or add a written explanation',
            });
            return;
        }

        setIsUploading(true);

        try {
            // Upload files to S3/CloudFlare R2
            const { photoUrls, documentUrls } = await uploadEvidenceFiles(
                photos,
                documents,
                {
                    onPhotoProgress: (fileName, progress) => {
                        console.log(`Uploading ${fileName}: ${progress}%`);
                    },
                    onDocumentProgress: (fileName, progress) => {
                        console.log(`Uploading ${fileName}: ${progress}%`);
                    },
                }
            );

            // Submit evidence with real URLs
            await submitEvidence.mutateAsync({
                disputeId,
                evidence: {
                    photos: photoUrls,
                    documents: documentUrls,
                    notes: notes.trim(),
                },
            });

            // Success notification
            toast.success('Evidence submitted successfully!', {
                description: 'Your dispute evidence is now under review',
            });

            // Reset and close
            setPhotos([]);
            setDocuments([]);
            setNotes('');
            onClose();
        } catch (error) {
            console.error('Failed to submit evidence:', error);

            // Handle upload-specific errors
            if (error instanceof UploadError) {
                toast.error(error.message, {
                    description: error.code === 'FILE_TOO_LARGE'
                        ? 'Please reduce file size and try again'
                        : error.code === 'INVALID_TYPE'
                            ? 'Please upload a supported file format'
                            : 'Please check your connection and try again',
                });
                return;
            }

            // Handle API errors
            handleApiError(error, 'Failed to submit evidence');
        } finally {
            setIsUploading(false);
        }
    };

    const handleClose = () => {
        if (!isUploading) {
            setPhotos([]);
            setDocuments([]);
            setNotes('');
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
                {/* Backdrop */}
                <div
                    className="fixed inset-0 bg-black/50 transition-opacity"
                    onClick={handleClose}
                />

                {/* Modal */}
                <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full p-6">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                            Submit Evidence
                        </h2>
                        <button
                            onClick={handleClose}
                            disabled={isUploading}
                            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 disabled:opacity-50"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Info Alert */}
                    <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                        <div className="flex gap-3">
                            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div className="text-sm text-blue-700 dark:text-blue-300">
                                <p className="font-medium mb-1">Evidence Guidelines</p>
                                <ul className="list-disc list-inside space-y-1 text-blue-600 dark:text-blue-400">
                                    <li>Clear photos of package with weight scale</li>
                                    <li>Original shipping invoice or courier receipt</li>
                                    <li>Package dimensions if applicable</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {/* Photo Upload */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Photos
                            </label>
                            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-primary-500 dark:hover:border-primary-400 transition-colors">
                                <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={handlePhotoChange}
                                    className="hidden"
                                    id="photo-upload"
                                    disabled={isUploading}
                                />
                                <label htmlFor="photo-upload" className="cursor-pointer">
                                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                                        Click to upload photos
                                    </p>
                                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
                                        PNG, JPG up to 10MB each
                                    </p>
                                </label>
                            </div>
                            {photos.length > 0 && (
                                <div className="mt-3 space-y-2">
                                    {photos.map((file, idx) => (
                                        <div key={idx} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 p-2 rounded">
                                            <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                                            </svg>
                                            <span className="flex-1 truncate">{file.name}</span>
                                            <span className="text-xs text-gray-500">
                                                {(file.size / 1024 / 1024).toFixed(2)} MB
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Document Upload */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Documents (Invoices, Receipts)
                            </label>
                            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-primary-500 dark:hover:border-primary-400 transition-colors">
                                <input
                                    type="file"
                                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                    multiple
                                    onChange={handleDocumentChange}
                                    className="hidden"
                                    id="document-upload"
                                    disabled={isUploading}
                                />
                                <label htmlFor="document-upload" className="cursor-pointer">
                                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                    </svg>
                                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                                        Click to upload documents
                                    </p>
                                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
                                        PDF, DOC, JPG up to 10MB each
                                    </p>
                                </label>
                            </div>
                            {documents.length > 0 && (
                                <div className="mt-3 space-y-2">
                                    {documents.map((file, idx) => (
                                        <div key={idx} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 p-2 rounded">
                                            <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                                            </svg>
                                            <span className="flex-1 truncate">{file.name}</span>
                                            <span className="text-xs text-gray-500">
                                                {(file.size / 1024 / 1024).toFixed(2)} MB
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Notes */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Additional Notes
                            </label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={4}
                                placeholder="Explain the discrepancy... (e.g., package dimensions, actual weight at shipment)"
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                disabled={isUploading}
                            />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-6 flex gap-3">
                        <button
                            onClick={handleClose}
                            disabled={isUploading}
                            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={isUploading || (photos.length === 0 && documents.length === 0 && !notes)}
                            className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                        >
                            {isUploading ? (
                                <>
                                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Uploading...
                                </>
                            ) : (
                                'Submit Evidence'
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
