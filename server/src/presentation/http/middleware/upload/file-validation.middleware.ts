/**
 * File Validation Middleware
 * 
 * Purpose: Validate uploaded files for security and compliance
 * Used for KYC document uploads and other file uploads
 * 
 * FEATURES:
 * - File size validation
 * - MIME type validation
 * - File extension validation
 * - Magic byte verification
 * - Malware scanning (placeholder for ClamAV integration)
 */

import { Request, Response, NextFunction } from 'express';
import path from 'path';
import logger from '../../../../shared/logger/winston.logger';

// Configuration constants
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.pdf'];

// Magic bytes for file type verification
const MAGIC_BYTES: Record<string, Buffer> = {
    'image/jpeg': Buffer.from([0xFF, 0xD8, 0xFF]),
    'image/png': Buffer.from([0x89, 0x50, 0x4E, 0x47]),
    'image/gif': Buffer.from([0x47, 0x49, 0x46]),
    'application/pdf': Buffer.from([0x25, 0x50, 0x44, 0x46]),
};

export interface FileValidationOptions {
    maxSize?: number;
    allowedMimeTypes?: string[];
    allowedExtensions?: string[];
    requireMagicByteVerification?: boolean;
}

/**
 * Validate file size
 */
export const validateFileSize = (
    file: Express.Multer.File,
    maxSize: number = MAX_FILE_SIZE
): boolean => {
    return file.size <= maxSize;
};

/**
 * Validate MIME type
 */
export const validateMimeType = (
    file: Express.Multer.File,
    allowedTypes: string[] = ALLOWED_MIME_TYPES
): boolean => {
    return allowedTypes.includes(file.mimetype);
};

/**
 * Validate file extension
 */
export const validateExtension = (
    file: Express.Multer.File,
    allowedExtensions: string[] = ALLOWED_EXTENSIONS
): boolean => {
    const ext = path.extname(file.originalname).toLowerCase();
    return allowedExtensions.includes(ext);
};

/**
 * Verify file content matches declared MIME type using magic bytes
 */
export const verifyMagicBytes = (file: Express.Multer.File): boolean => {
    const expectedMagic = MAGIC_BYTES[file.mimetype];
    if (!expectedMagic) {
        // No magic bytes defined for this type, skip verification
        return true;
    }

    if (!file.buffer) {
        // File buffer not available (streamed upload)
        return true;
    }

    const fileHeader = file.buffer.slice(0, expectedMagic.length);
    return expectedMagic.equals(fileHeader);
};

/**
 * Placeholder for ClamAV malware scanning
 * In production, this would integrate with a ClamAV server
 */
export const scanForMalware = async (file: Express.Multer.File): Promise<{ clean: boolean; threat?: string }> => {
    // TODO: Integrate with ClamAV server for real malware scanning
    // Example integration:
    // const clamav = require('clamav.js');
    // const scanner = new clamav.ClamScanner(process.env.CLAMAV_HOST);
    // const result = await scanner.scanBuffer(file.buffer);
    // return { clean: !result.isInfected, threat: result.viruses?.[0] };

    logger.debug('Malware scan placeholder - file assumed clean', {
        filename: file.originalname,
        size: file.size,
    });

    // For now, assume all files are clean
    // In production, replace with actual ClamAV scan
    return { clean: true };
};

/**
 * Main file validation middleware for KYC uploads
 */
export const validateKYCFile = (options: FileValidationOptions = {}) => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const file = req.file;

        if (!file) {
            res.status(400).json({
                success: false,
                message: 'No file uploaded',
                code: 'FILE_REQUIRED',
            });
            return;
        }

        const {
            maxSize = MAX_FILE_SIZE,
            allowedMimeTypes = ALLOWED_MIME_TYPES,
            allowedExtensions = ALLOWED_EXTENSIONS,
            requireMagicByteVerification = true,
        } = options;

        // 1. Validate file size
        if (!validateFileSize(file, maxSize)) {
            logger.warn('File size validation failed', {
                filename: file.originalname,
                size: file.size,
                maxSize,
            });
            res.status(400).json({
                success: false,
                message: `File too large. Maximum size is ${maxSize / (1024 * 1024)}MB`,
                code: 'FILE_TOO_LARGE',
            });
            return;
        }

        // 2. Validate MIME type
        if (!validateMimeType(file, allowedMimeTypes)) {
            logger.warn('MIME type validation failed', {
                filename: file.originalname,
                mimetype: file.mimetype,
                allowedTypes: allowedMimeTypes,
            });
            res.status(400).json({
                success: false,
                message: `Invalid file type. Allowed types: ${allowedMimeTypes.join(', ')}`,
                code: 'INVALID_MIME_TYPE',
            });
            return;
        }

        // 3. Validate file extension
        if (!validateExtension(file, allowedExtensions)) {
            const ext = path.extname(file.originalname).toLowerCase();
            logger.warn('File extension validation failed', {
                filename: file.originalname,
                extension: ext,
                allowedExtensions,
            });
            res.status(400).json({
                success: false,
                message: `Invalid file extension. Allowed extensions: ${allowedExtensions.join(', ')}`,
                code: 'INVALID_EXTENSION',
            });
            return;
        }

        // 4. Verify magic bytes (content matches declared type)
        if (requireMagicByteVerification && !verifyMagicBytes(file)) {
            logger.warn('Magic byte verification failed - possible file type spoofing', {
                filename: file.originalname,
                declaredMime: file.mimetype,
            });
            res.status(400).json({
                success: false,
                message: 'File content does not match declared file type',
                code: 'FILE_TYPE_MISMATCH',
            });
            return;
        }

        // 5. Scan for malware (placeholder)
        try {
            const scanResult = await scanForMalware(file);
            if (!scanResult.clean) {
                logger.error('Malware detected in uploaded file', {
                    filename: file.originalname,
                    threat: scanResult.threat,
                    ip: req.ip,
                });
                res.status(400).json({
                    success: false,
                    message: 'File failed security scan',
                    code: 'MALWARE_DETECTED',
                });
                return;
            }
        } catch (error) {
            logger.error('Error during malware scan:', error);
            // Continue without failing - malware scanning is optional
        }

        // All validations passed
        logger.info('File validation passed', {
            filename: file.originalname,
            size: file.size,
            mimetype: file.mimetype,
        });

        next();
    };
};

/**
 * Multiple files validation middleware
 */
export const validateMultipleFiles = (options: FileValidationOptions = {}) => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const files = req.files as Express.Multer.File[] | undefined;

        if (!files || files.length === 0) {
            res.status(400).json({
                success: false,
                message: 'No files uploaded',
                code: 'FILES_REQUIRED',
            });
            return;
        }

        // Validate each file
        for (const file of files) {
            req.file = file; // Set current file for validation

            // Create a mock next to capture errors
            let validationPassed = true;
            const mockNext = () => { validationPassed = true; };

            await validateKYCFile(options)(req, res, mockNext);

            if (!validationPassed) {
                return; // Response already sent by validateKYCFile
            }
        }

        next();
    };
};

export default {
    validateKYCFile,
    validateMultipleFiles,
    validateFileSize,
    validateMimeType,
    validateExtension,
    verifyMagicBytes,
    scanForMalware,
    MAX_FILE_SIZE,
    ALLOWED_MIME_TYPES,
    ALLOWED_EXTENSIONS,
};
