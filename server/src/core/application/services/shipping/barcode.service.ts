import bwipjs from 'bwip-js';
import logger from '../../../../shared/logger/winston.logger';

/**
 * Barcode Service
 * Generates barcodes in various formats using bwip-js
 * 
 * Supported formats:
 * - Code 128 (for AWB numbers)
 * - QR Code (for tracking links)
 */

class BarcodeService {
    /**
     * Generate Code 128 barcode (standard for shipping labels)
     * @param text - Text to encode (AWB number)
     * @param options - Barcode options
     * @returns PNG buffer
     */
    async generateCode128(
        text: string,
        options: {
            height?: number;
            width?: number;
            includeText?: boolean;
        } = {}
    ): Promise<Buffer> {
        try {
            const {
                height = 50,
                width = 2,
                includeText = true,
            } = options;

            const buffer = await bwipjs.toBuffer({
                bcid: 'code128',           // Barcode type
                text: text,                 // Text to encode
                scale: width,               // Bar width multiplier
                height: height,             // Bar height in millimeters
                includetext: includeText,   // Show text below barcode
                textxalign: 'center',       // Center text
            });

            return buffer;
        } catch (error: any) {
            logger.error(`Error generating Code 128 barcode for ${text}:`, error);
            throw new Error(`Barcode generation failed: ${error.message}`);
        }
    }

    /**
     * Generate QR Code
     * @param data - Data to encode (tracking URL)
     * @param size - QR code size in pixels
     * @returns PNG buffer
     */
    async generateQRCode(
        data: string,
        size: number = 150
    ): Promise<Buffer> {
        try {
            const buffer = await bwipjs.toBuffer({
                bcid: 'qrcode',             // QR code
                text: data,                 // Data to encode
                scale: Math.floor(size / 100), // Scale factor
                height: size,               // Height
                width: size,                // Width
            });

            return buffer;
        } catch (error: any) {
            logger.error(`Error generating QR code for ${data}:`, error);
            throw new Error(`QR code generation failed: ${error.message}`);
        }
    }

    /**
     * Generate barcode as base64 string (for embedding in HTML/PDF)
     * @param text - Text to encode
     * @param type - Barcode type
     * @returns Base64 encoded PNG
     */
    async generateBase64(
        text: string,
        type: 'code128' | 'qrcode' = 'code128'
    ): Promise<string> {
        try {
            const buffer = type === 'code128'
                ? await this.generateCode128(text)
                : await this.generateQRCode(text);

            return `data:image/png;base64,${buffer.toString('base64')}`;
        } catch (error: any) {
            logger.error(`Error generating base64 barcode:`, error);
            throw error;
        }
    }
}

export default new BarcodeService();
