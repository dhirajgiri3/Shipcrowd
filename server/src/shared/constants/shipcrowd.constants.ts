/**
 * ShipCrowd Business Constants
 * Centralized configuration for company details, GST information, and invoice settings
 */

/**
 * ShipCrowd Company Details
 * Used across all invoices, PDFs, and official documents
 */
export const SHIPCROWD = {
    LEGAL_NAME: 'ShipCrowd Logistics Private Limited',
    GSTIN: process.env.SHIPCROWD_GSTIN || '06FKCPS6109D3Z7',
    PAN: process.env.SHIPCROWD_PAN || 'FKCPS6109D',

    ADDRESS: {
        line1: 'Industrial Area Phase 1',
        line2: '',
        city: 'Gurugram',
        state: 'Haryana',
        stateCode: '06',
        pincode: '122015',
        country: 'India',
    },

    CONTACT: {
        email: 'invoices@shipcrowd.com',
        phone: '+91-1800-XXX-XXXX',
        website: 'www.shipcrowd.com',
        supportEmail: 'support@shipcrowd.com',
    },

    // GST Configuration
    SAC_CODE: '996812', // Service Accounting Code for Courier Services
    GST_RATE: 0.18, // 18% GST (9% CGST + 9% SGST or 18% IGST)

    // Invoice Configuration
    INVOICE_PREFIX: 'INV',
    CREDIT_NOTE_PREFIX: 'CN',
    MANIFEST_PREFIX: 'MAN',
} as const;

/**
 * Invoice Terms and Conditions
 * Standard terms displayed on all invoices
 */
export const INVOICE_TERMS = [
    'Computer-generated invoice - signature not required',
    'Payment due within 7 days of invoice date',
    'For disputes: Gurugram jurisdiction under GST Act',
    'Subject to Haryana jurisdiction',
    'Interest @ 18% p.a. will be charged on delayed payments',
] as const;

/**
 * GST State Codes Mapping
 * Complete list of Indian states and UTs with GST state codes
 */
export const GST_STATE_CODES: Record<string, string> = {
    '01': 'Jammu and Kashmir',
    '02': 'Himachal Pradesh',
    '03': 'Punjab',
    '04': 'Chandigarh',
    '05': 'Uttarakhand',
    '06': 'Haryana',
    '07': 'Delhi',
    '08': 'Rajasthan',
    '09': 'Uttar Pradesh',
    '10': 'Bihar',
    '11': 'Sikkim',
    '12': 'Arunachal Pradesh',
    '13': 'Nagaland',
    '14': 'Manipur',
    '15': 'Mizoram',
    '16': 'Tripura',
    '17': 'Meghalaya',
    '18': 'Assam',
    '19': 'West Bengal',
    '20': 'Jharkhand',
    '21': 'Odisha',
    '22': 'Chhattisgarh',
    '23': 'Madhya Pradesh',
    '24': 'Gujarat',
    '25': 'Daman and Diu',
    '26': 'Dadra and Nagar Haveli',
    '27': 'Maharashtra',
    '28': 'Andhra Pradesh (Old)',
    '29': 'Karnataka',
    '30': 'Goa',
    '31': 'Lakshadweep',
    '32': 'Kerala',
    '33': 'Tamil Nadu',
    '34': 'Puducherry',
    '35': 'Andaman and Nicobar Islands',
    '36': 'Telangana',
    '37': 'Andhra Pradesh',
    '38': 'Ladakh',
    '97': 'Other Territory',
} as const;

/**
 * PDF Brand Colors (from globals.css)
 * Used for consistent branding across all PDF documents
 */
export const PDF_BRAND_COLORS = {
    // Light Mode
    PRIMARY_BLUE: '#2525FF',
    PRIMARY_BLUE_DEEP: '#1a1aff',
    PRIMARY_BLUE_LIGHT: '#4d4dff',

    // Dark Mode (for reference)
    PRIMARY_PURPLE: '#7B61FF',

    // Text Colors
    TEXT_PRIMARY: '#1a2332',
    TEXT_SECONDARY: '#6b7280',
    TEXT_MUTED: '#9ca3af',

    // Borders and Backgrounds
    BORDER_DEFAULT: '#d8dce6',
    BORDER_STRONG: '#9ca3af',
    BG_LIGHT: '#f9fafb',
    BG_WHITE: '#ffffff',
} as const;

/**
 * IRN Configuration
 * Settings for GSTN e-Invoice integration
 */
export const IRN_CONFIG = {
    THRESHOLD_AMOUNT: parseInt(process.env.IRN_THRESHOLD_AMOUNT || '50000'), // ₹50,000
    API_TIMEOUT_MS: 30000, // 30 seconds
    MAX_RETRY_ATTEMPTS: 3,
    RETRY_DELAY_MS: 2000, // 2 seconds
} as const;
