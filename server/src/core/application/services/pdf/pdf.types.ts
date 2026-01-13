/**
 * PDF Type Definitions
 * Shared interfaces and types for PDF generation across all document types
 */

/**
 * Party details for invoice/manifest PDFs
 */
export interface PDFPartyDetails {
    name: string;
    gstin?: string;
    pan?: string;
    address: {
        line1: string;
        line2?: string;
        city: string;
        state: string;
        stateCode: string;
        pincode: string;
    };
    contact?: {
        email?: string;
        phone?: string;
    };
}

/**
 * Table column configuration
 */
export interface PDFTableColumn {
    header: string;
    key: string;
    width: number; // Percentage of table width
    align?: 'left' | 'center' | 'right';
    format?: 'currency' | 'number' | 'date' | 'text';
}

/**
 * Brand configuration for PDF styling
 */
export interface PDFBrandConfig {
    primaryColor: string;
    secondaryColor: string;
    borderColor: string;
    logoPath: string;
    companyName: string;
}

/**
 * Tax summary for GST invoices
 */
export interface PDFTaxSummary {
    subtotal: number;
    cgst: number;
    sgst: number;
    igst: number;
    grandTotal: number;
    isInterstate: boolean;
}

/**
 * PDF page options
 */
export interface PDFPageOptions {
    size: 'A4' | 'A6';
    layout: 'portrait' | 'landscape';
    margins?: {
        top: number;
        bottom: number;
        left: number;
        right: number;
    };
}

/**
 * QR Code options
 */
export interface PDFQRCodeOptions {
    data: string;
    x: number;
    y: number;
    size: number;
}
