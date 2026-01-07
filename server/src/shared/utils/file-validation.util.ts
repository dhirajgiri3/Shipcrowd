/**
 * File Validation Utility for KYC Document Uploads
 * Enforces file size limits, MIME type restrictions, and security checks
 */

export const ALLOWED_MIME_TYPES = {
    documents: [
        'application/pdf',
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
    ],
    images: [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
    ],
};

export const MAX_FILE_SIZE = {
    documents: 5 * 1024 * 1024, // 5MB
    images: 2 * 1024 * 1024, // 2MB
};

export interface FileValidationResult {
    valid: boolean;
    error?: string;
    details?: {
        size: number;
        mimeType: string;
        extension: string;
    };
}

/**
 * ✅ FEATURE 16: Validate uploaded file for KYC documents
 * 
 * Security checks:
 * - File size limits (5MB for documents, 2MB for images)
 * - MIME type whitelist
 * - File extension validation
 * - Null byte detection (path traversal prevention)
 * - Filename sanitization
 */
export const validateKYCFile = (
    file: Express.Multer.File,
    fileType: 'document' | 'image' = 'document'
): FileValidationResult => {
    // Check if file exists
    if (!file) {
        return { valid: false, error: 'No file provided' };
    }

    // Determine max size based on file type
    const maxSize = fileType === 'image' ? MAX_FILE_SIZE.images : MAX_FILE_SIZE.documents;

    // Check file size
    if (file.size > maxSize) {
        const maxSizeMB = maxSize / 1024 / 1024;
        return {
            valid: false,
            error: `File size exceeds maximum of ${maxSizeMB}MB`,
        };
    }

    // Check if file is empty
    if (file.size === 0) {
        return {
            valid: false,
            error: 'File is empty',
        };
    }

    // Determine allowed MIME types based on file type
    const allowedMimeTypes = fileType === 'image'
        ? ALLOWED_MIME_TYPES.images
        : ALLOWED_MIME_TYPES.documents;

    // Check MIME type
    if (!allowedMimeTypes.includes(file.mimetype)) {
        return {
            valid: false,
            error: `Invalid file type. Allowed types: ${fileType === 'image' ? 'JPEG, PNG, WebP' : 'PDF, JPEG, PNG, WebP'}`,
        };
    }

    // Check file extension (double-check against MIME type spoofing)
    const ext = file.originalname.split('.').pop()?.toLowerCase();
    const validExtensions = fileType === 'image'
        ? ['jpg', 'jpeg', 'png', 'webp']
        : ['pdf', 'jpg', 'jpeg', 'png', 'webp'];

    if (!ext || !validExtensions.includes(ext)) {
        return {
            valid: false,
            error: 'Invalid file extension',
        };
    }

    // Security: Check for null bytes in filename (path traversal attempt)
    if (file.originalname.includes('\0')) {
        return {
            valid: false,
            error: 'Invalid filename - security violation detected',
        };
    }

    // Security: Check for path traversal patterns
    if (file.originalname.includes('..') || file.originalname.includes('/') || file.originalname.includes('\\')) {
        return {
            valid: false,
            error: 'Invalid filename - path traversal detected',
        };
    }

    // Security: Validate filename length
    if (file.originalname.length > 255) {
        return {
            valid: false,
            error: 'Filename too long (max 255 characters)',
        };
    }

    // All checks passed
    return {
        valid: true,
        details: {
            size: file.size,
            mimeType: file.mimetype,
            extension: ext,
        },
    };
};

/**
 * Sanitize filename for safe storage
 * Removes special characters and spaces
 */
export const sanitizeFilename = (filename: string): string => {
    // Get extension
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    const nameWithoutExt = filename.substring(0, filename.lastIndexOf('.')) || filename;

    // Remove special characters, keep only alphanumeric, hyphens, and underscores
    const sanitized = nameWithoutExt
        .replace(/[^a-zA-Z0-9-_]/g, '_')
        .replace(/_{2,}/g, '_')
        .replace(/^_|_$/g, '')
        .substring(0, 200); // Limit length

    return ext ? `${sanitized}.${ext}` : sanitized;
};

/**
 * Generate unique filename with timestamp
 */
export const generateUniqueFilename = (
    originalFilename: string,
    prefix?: string
): string => {
    const ext = originalFilename.split('.').pop()?.toLowerCase() || '';
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);

    const prefixPart = prefix ? `${prefix}_` : '';
    return `${prefixPart}${timestamp}_${random}.${ext}`;
};

export default {
    validateKYCFile,
    sanitizeFilename,
    generateUniqueFilename,
    ALLOWED_MIME_TYPES,
    MAX_FILE_SIZE,
};
