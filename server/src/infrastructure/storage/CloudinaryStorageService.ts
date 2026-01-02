/**
 * Cloudinary Storage Service
 * 
 * Handles file uploads to Cloudinary for export files.
 */

import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import logger from '../../../shared/logger/winston.logger.js';

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

export interface UploadResult {
    publicId: string;
    url: string;
    secureUrl: string;
    format: string;
    bytes: number;
}

export default class CloudinaryStorageService {
    private static folder = process.env.CLOUDINARY_FOLDER_EXPORTS || 'shipcrowd/exports';

    /**
     * Upload buffer to Cloudinary
     */
    static async uploadFile(
        buffer: Buffer,
        filename: string,
        format: 'csv' | 'xlsx' | 'pdf'
    ): Promise<UploadResult> {
        try {
            const resourceType = format === 'pdf' ? 'image' : 'raw';

            return new Promise((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    {
                        folder: this.folder,
                        public_id: filename.replace(/\.[^/.]+$/, ''),
                        resource_type: resourceType,
                        format: format,
                        type: 'private'
                    },
                    (error, result) => {
                        if (error) {
                            logger.error('Cloudinary upload error:', error);
                            reject(error);
                        } else if (result) {
                            resolve({
                                publicId: result.public_id,
                                url: result.url,
                                secureUrl: result.secure_url,
                                format: result.format,
                                bytes: result.bytes
                            });
                        } else {
                            reject(new Error('Upload failed with no result'));
                        }
                    }
                );

                uploadStream.end(buffer);
            });
        } catch (error) {
            logger.error('Error uploading to Cloudinary:', error);
            throw error;
        }
    }

    /**
     * Generate signed URL for private file download
     */
    static getSignedUrl(publicId: string, expiresInSeconds = 3600): string {
        try {
            return cloudinary.url(publicId, {
                sign_url: true,
                type: 'private',
                resource_type: 'raw',
                expires_at: Math.floor(Date.now() / 1000) + expiresInSeconds
            });
        } catch (error) {
            logger.error('Error generating signed URL:', error);
            throw error;
        }
    }

    /**
     * Delete file from Cloudinary
     */
    static async deleteFile(publicId: string): Promise<void> {
        try {
            await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
            logger.info(`Deleted file from Cloudinary: ${publicId}`);
        } catch (error) {
            logger.error('Error deleting from Cloudinary:', error);
            throw error;
        }
    }

    /**
     * Check if Cloudinary is configured
     */
    static isConfigured(): boolean {
        return !!(
            process.env.CLOUDINARY_CLOUD_NAME &&
            process.env.CLOUDINARY_API_KEY &&
            process.env.CLOUDINARY_API_SECRET
        );
    }
}
