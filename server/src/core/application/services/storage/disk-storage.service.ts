/**
 * Disk Storage Service
 * Implementation of IStorageService for local file system storage
 * Optimized for VPS self-hosting
 */

import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { IStorageService } from './storage.interface';
import logger from '../../../../shared/logger/winston.logger';
import { AppError } from '../../../../shared/errors/app.error';
import { ErrorCode } from '../../../../shared/errors/errorCodes';

const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);
const access = promisify(fs.access);
const mkdir = promisify(fs.mkdir);
const readFile = promisify(fs.readFile);

export class DiskStorageService implements IStorageService {
    private readonly uploadDir: string;
    private readonly baseUrl: string;

    constructor() {
        // Base directory for uploads (should be outside src in production)
        this.uploadDir = path.join(process.cwd(), 'uploads');

        // Base URL for accessing files (served via Nginx/Express static)
        this.baseUrl = process.env.APP_URL || 'http://localhost:3000';

        this.ensureUploadDirExists();
    }

    private async ensureUploadDirExists() {
        try {
            if (!fs.existsSync(this.uploadDir)) {
                await mkdir(this.uploadDir, { recursive: true });
            }
        } catch (error) {
            logger.error('Failed to create upload directory:', error);
        }
    }

    async uploadFile(buffer: Buffer, filePath: string, mimeType: string): Promise<string> {
        try {
            // Create full system path
            const fullPath = path.join(this.uploadDir, filePath);
            const dir = path.dirname(fullPath);

            // Ensure directory exists
            if (!fs.existsSync(dir)) {
                await mkdir(dir, { recursive: true });
            }

            // Write file
            await writeFile(fullPath, buffer);
            logger.info(`File saved locally: ${fullPath}`);

            // Return relative path (to be stored in DB)
            return filePath;
        } catch (error: any) {
            logger.error('Disk upload failed:', error);
            throw new AppError('File upload failed', ErrorCode.SYS_INTERNAL_ERROR);
        }
    }

    async deleteFile(filePath: string): Promise<void> {
        try {
            const fullPath = path.join(this.uploadDir, filePath);
            if (fs.existsSync(fullPath)) {
                await unlink(fullPath);
                logger.info(`File deleted locally: ${fullPath}`);
            }
        } catch (error: any) {
            logger.error('Disk delete failed:', error);
            // Don't throw for deletion errors, just log
        }
    }

    async getFileUrl(filePath: string): Promise<string> {
        // Return full URL to access the file
        // Assumes 'uploads' endpoint or Nginx is configured to serve static files
        return `${this.baseUrl}/uploads/${filePath}`;
    }

    async exists(filePath: string): Promise<boolean> {
        try {
            const fullPath = path.join(this.uploadDir, filePath);
            await access(fullPath, fs.constants.F_OK);
            return true;
        } catch {
            return false;
        }
    }

    async downloadFile(filePath: string): Promise<Buffer> {
        try {
            const fullPath = path.join(this.uploadDir, filePath);
            return await readFile(fullPath);
        } catch (error: any) {
            logger.error('Disk download failed:', error);
            throw new AppError('File download failed', ErrorCode.SYS_INTERNAL_ERROR);
        }
    }

    /**
     * Get absolute path for file (useful for email attachments)
     */
    getAbsolutePath(filePath: string): string {
        return path.join(this.uploadDir, filePath);
    }
}

export default new DiskStorageService();
