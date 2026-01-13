/**
 * Storage Service Interface
 * Defines the contract for file storage operations
 * Follows Clean Architecture to allow easy switching between Local Disk, S3, Azure, etc.
 */

export interface IStorageService {
    /**
     * Upload a file buffer to storage
     * @param buffer - File content
     * @param path - Destination path (e.g., 'invoices/2026/INV-001.pdf')
     * @param mimeType - MIME type of the file
     * @returns Publicly accessible URL or relative path
     */
    uploadFile(buffer: Buffer, path: string, mimeType: string): Promise<string>;

    /**
     * Delete a file from storage
     * @param path - Path of file to delete
     */
    deleteFile(path: string): Promise<void>;

    /**
     * Get a signed/public URL for the file
     * @param path - Stored file path
     */
    getFileUrl(path: string): Promise<string>;

    /**
     * Check if file exists
     */
    exists(path: string): Promise<boolean>;
}
