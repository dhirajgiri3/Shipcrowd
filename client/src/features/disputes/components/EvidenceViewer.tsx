/**
 * Evidence Viewer Component
 * 
 * Displays photos and documents from disputes with:
 * - Image gallery with lightbox
 * - Document list with download links
 * - Metadata display (timestamp, uploader)
 */

'use client';

import React, { useState } from 'react';

interface Evidence {
    photos?: string[];
    documents?: string[];
    notes?: string;
    submittedAt?: string;
    submittedBy?: string;
}

interface EvidenceViewerProps {
    evidence: Evidence;
    title?: string;
}

export function EvidenceViewer({ evidence, title = 'Evidence' }: EvidenceViewerProps) {
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);

    const openLightbox = (index: number) => {
        setSelectedPhotoIndex(index);
        setLightboxOpen(true);
    };

    const closeLightbox = () => {
        setLightboxOpen(false);
    };

    const nextPhoto = () => {
        if (evidence.photos && selectedPhotoIndex < evidence.photos.length - 1) {
            setSelectedPhotoIndex(selectedPhotoIndex + 1);
        }
    };

    const prevPhoto = () => {
        if (selectedPhotoIndex > 0) {
            setSelectedPhotoIndex(selectedPhotoIndex - 1);
        }
    };

    const hasEvidence = (evidence.photos && evidence.photos.length > 0) ||
        (evidence.documents && evidence.documents.length > 0) ||
        evidence.notes;

    if (!hasEvidence) {
        return (
            <div className="text-center py-8">
                <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-sm text-gray-500 dark:text-gray-400">No evidence submitted</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Photos */}
            {evidence.photos && evidence.photos.length > 0 && (
                <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        Photos ({evidence.photos.length})
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                        {evidence.photos.map((photo, idx) => (
                            <button
                                key={idx}
                                onClick={() => openLightbox(idx)}
                                className="relative rounded-lg overflow-hidden group cursor-pointer"
                            >
                                <img
                                    src={photo}
                                    alt={`Evidence ${idx + 1}`}
                                    className="w-full h-40 object-cover transition-transform group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center">
                                    <svg className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                                    </svg>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Documents */}
            {evidence.documents && evidence.documents.length > 0 && (
                <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        Documents ({evidence.documents.length})
                    </h3>
                    <div className="space-y-2">
                        {evidence.documents.map((doc, idx) => (
                            <a
                                key={idx}
                                href={doc}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                            >
                                <svg className="w-8 h-8 text-blue-600 dark:text-blue-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
                                </svg>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                        Document {idx + 1}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        Click to view
                                    </p>
                                </div>
                                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                            </a>
                        ))}
                    </div>
                </div>
            )}

            {/* Notes */}
            {evidence.notes && (
                <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Notes
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg italic">
                        "{evidence.notes}"
                    </p>
                </div>
            )}

            {/* Lightbox */}
            {lightboxOpen && evidence.photos && (
                <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center">
                    <button
                        onClick={closeLightbox}
                        className="absolute top-4 right-4 text-white hover:text-gray-300"
                    >
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>

                    {selectedPhotoIndex > 0 && (
                        <button
                            onClick={prevPhoto}
                            className="absolute left-4 text-white hover:text-gray-300"
                        >
                            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                    )}

                    <div className="max-w-5xl max-h-[90vh] p-4">
                        <img
                            src={evidence.photos[selectedPhotoIndex]}
                            alt={`Evidence ${selectedPhotoIndex + 1}`}
                            className="max-w-full max-h-full object-contain"
                        />
                        <p className="text-white text-center mt-4">
                            {selectedPhotoIndex + 1} / {evidence.photos.length}
                        </p>
                    </div>

                    {selectedPhotoIndex < evidence.photos.length - 1 && (
                        <button
                            onClick={nextPhoto}
                            className="absolute right-4 text-white hover:text-gray-300"
                        >
                            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
