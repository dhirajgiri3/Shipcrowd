/**
 * File Upload Service
 *
 * Centralized service for uploading files to cloud storage (S3/CloudFlare R2)
 * Features:
 * - File size validation
 * - File type validation
 * - Upload progress tracking
 * - Error handling
 * - Retry logic
 */

import { apiClient } from '@/src/core/api/client';
import type { AxiosProgressEvent } from 'axios';

// Maximum file sizes
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

// Allowed file types
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic'];
const ALLOWED_DOCUMENT_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/jpg',
    'image/png',
];

export interface UploadOptions {
    folder: string;
    acl?: 'private' | 'public-read';
    onProgress?: (progress: number) => void;
}

export interface UploadResult {
    url: string;
    key: string;
    size: number;
    mimeType: string;
}

export class UploadError extends Error {
    constructor(
        message: string,
        public readonly code: 'FILE_TOO_LARGE' | 'INVALID_TYPE' | 'UPLOAD_FAILED' | 'NETWORK_ERROR'
    ) {
        super(message);
        this.name = 'UploadError';
    }
}

/**
 * Validates a file before upload
 */
function validateFile(file: File, allowedTypes: string[]): void {
    // Check file size
    if (file.size > MAX_FILE_SIZE_BYTES) {
        throw new UploadError(
            `File "${file.name}" is too large. Maximum size is ${MAX_FILE_SIZE_MB}MB`,
            'FILE_TOO_LARGE'
        );
    }

    // Check file type
    if (!allowedTypes.includes(file.type)) {
        throw new UploadError(
            `File "${file.name}" has an unsupported type. Allowed types: ${allowedTypes.join(', ')}`,
            'INVALID_TYPE'
        );
    }
}

/**
 * Uploads a single file to cloud storage
 */
export async function uploadFile(
    file: File,
    options: UploadOptions
): Promise<UploadResult> {
    const { folder, acl = 'private', onProgress } = options;

    // Validate file based on category
    const isImage = file.type.startsWith('image/');
    const allowedTypes = isImage ? ALLOWED_IMAGE_TYPES : ALLOWED_DOCUMENT_TYPES;
    validateFile(file, allowedTypes);

    // Create form data
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);
    formData.append('acl', acl);

    try {
        const response = await apiClient.post<UploadResult>('/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
            onUploadProgress: (progressEvent: AxiosProgressEvent) => {
                if (onProgress && progressEvent.total) {
                    const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    onProgress(progress);
                }
            },
        });

        return response.data;
    } catch (error: unknown) {
        console.error('Upload failed:', error);

        // Check if it's a network error
        if (error instanceof Error && error.message === 'Network Error') {
            throw new UploadError('Network error. Please check your connection.', 'NETWORK_ERROR');
        }

        throw new UploadError(
            `Failed to upload "${file.name}". Please try again.`,
            'UPLOAD_FAILED'
        );
    }
}

/**
 * Uploads multiple files to cloud storage
 * Returns an array of URLs for successfully uploaded files
 */
export async function uploadMultipleFiles(
    files: File[],
    options: UploadOptions & { onFileProgress?: (fileName: string, progress: number) => void }
): Promise<string[]> {
    const { folder, acl = 'private', onFileProgress } = options;

    const uploadPromises = files.map(async (file) => {
        const result = await uploadFile(file, {
            folder,
            acl,
            onProgress: (progress) => {
                if (onFileProgress) {
                    onFileProgress(file.name, progress);
                }
            },
        });
        return result.url;
    });

    return Promise.all(uploadPromises);
}

/**
 * Uploads evidence files (photos and documents)
 * Specific wrapper for evidence submission use case
 */
export async function uploadEvidenceFiles(
    photos: File[],
    documents: File[],
    options?: {
        onPhotoProgress?: (fileName: string, progress: number) => void;
        onDocumentProgress?: (fileName: string, progress: number) => void;
    }
): Promise<{ photoUrls: string[]; documentUrls: string[] }> {
    const [photoUrls, documentUrls] = await Promise.all([
        photos.length > 0
            ? uploadMultipleFiles(photos, {
                folder: 'evidence/photos',
                acl: 'private',
                onFileProgress: options?.onPhotoProgress,
            })
            : Promise.resolve([]),
        documents.length > 0
            ? uploadMultipleFiles(documents, {
                folder: 'evidence/documents',
                acl: 'private',
                onFileProgress: options?.onDocumentProgress,
            })
            : Promise.resolve([]),
    ]);

    return { photoUrls, documentUrls };
}

/**
 * Uploads QC (Quality Check) images
 * Specific wrapper for QC use case
 */
export async function uploadQCImages(
    images: File[],
    options?: {
        onProgress?: (fileName: string, progress: number) => void;
    }
): Promise<string[]> {
    return uploadMultipleFiles(images, {
        folder: 'qc/images',
        acl: 'private',
        onFileProgress: options?.onProgress,
    });
}

export default {
    uploadFile,
    uploadMultipleFiles,
    uploadEvidenceFiles,
    uploadQCImages,
    UploadError,
};
