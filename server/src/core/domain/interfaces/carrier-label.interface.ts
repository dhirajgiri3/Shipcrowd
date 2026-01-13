/**
 * Carrier Label Adapter Interface
 * Defines a unified interface for label generation across different carriers
 * 
 * Carriers implement this interface to provide label generation in various formats
 */

export interface ICarrierLabelAdapter {
    /**
     * Generate label for a shipment
     * @param shipment - Shipment data
     * @returns Label response with format and data
     */
    generateLabel(shipment: any): Promise<LabelResponse>;

    /**
     * Get supported label formats for this carrier
     * @returns Array of supported formats
     */
    getFormats(): ('pdf' | 'zpl' | 'url')[];

    /**
     * Get carrier name
     */
    getCarrierName(): string;
}

export interface LabelResponse {
    format: 'pdf' | 'zpl' | 'url';
    data: Buffer | string;  // Buffer for PDF, string for ZPL/URL
    awb: string;
    metadata?: {
        generatedAt: Date;
        carrier: string;
        size?: string;  // e.g., "4x6"
    };
}

export interface LabelGenerationOptions {
    format?: 'pdf' | 'zpl';
    size?: '4x6' | '4x8';  // Thermal label sizes
    includeBarcode?: boolean;
    includeQRCode?: boolean;
}
